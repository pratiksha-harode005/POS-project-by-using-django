from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Invoice, ThreeWayMatch
from .serializers import InvoiceSerializer, ThreeWayMatchSerializer


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vendor', 'purchase_order']
    search_fields = ['invoice_id', 'invoice_number']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return Invoice.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return Invoice.objects.all()
        return Invoice.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'VENDOR' and hasattr(user, 'vendor_profile') and user.vendor_profile:
            invoice = serializer.save(vendor=user.vendor_profile)
        else:
            invoice = serializer.save()

        # Advance PurchaseRequest stage to 8 (Invoice)
        pr = invoice.purchase_order.purchase_request
        pr.current_stage = 8
        pr.save()


class ThreeWayMatchViewSet(viewsets.ModelViewSet):
    serializer_class = ThreeWayMatchSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['is_matched', 'purchase_order']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            return ThreeWayMatch.objects.all() # Vendor cannot access 3-way matching view
        return ThreeWayMatch.objects.all().order_by('-created_at')

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def verify_match(self, request):
        po_id = request.data.get('purchase_order_id')
        receipt_id = request.data.get('goods_receipt_id')
        invoice_id = request.data.get('invoice_id')

        try:
            inv = Invoice.objects.get(id=invoice_id)
            is_matched = (inv.amount == inv.purchase_order.total_amount)
            
            match_obj, created = ThreeWayMatch.objects.update_or_create(
                invoice=inv,
                defaults={
                    'purchase_order_id': po_id,
                    'goods_receipt_id': receipt_id,
                    'po_amount': inv.purchase_order.total_amount,
                    'invoice_amount': inv.amount,
                    'is_matched': is_matched,
                    'verified_by': request.user,
                    'variance_reason': '' if is_matched else 'Amount mismatch between PO and Invoice'
                }
            )

            inv.status = 'Matched' if is_matched else 'Exception'
            inv.save()

            return Response(ThreeWayMatchSerializer(match_obj).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
