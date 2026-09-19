from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import RFQ, Quotation
from .serializers import RFQSerializer, QuotationSerializer
from apps.request_management.models import PurchaseRequest


class RFQViewSet(viewsets.ModelViewSet):
    serializer_class = RFQSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'purchase_request']
    search_fields = ['rfq_id', 'title']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            # Vendor only sees RFQs where their vendor profile is in invited_vendors
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return RFQ.objects.filter(invited_vendors=user.vendor_profile).distinct().order_by('-created_at')
            return RFQ.objects.none()
        return RFQ.objects.all().order_by('-created_at')


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'rfq', 'vendor']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            # Vendor only sees their own quotations
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return Quotation.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return Quotation.objects.none()
        return Quotation.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'VENDOR' and hasattr(user, 'vendor_profile') and user.vendor_profile:
            quotation = serializer.save(vendor=user.vendor_profile)
        else:
            quotation = serializer.save()

        # Update purchase request stage to 5 (Vendor Quotes Received)
        pr = quotation.rfq.purchase_request
        if pr.current_stage == 4:
            pr.current_stage = 5
            pr.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def select_quotation(self, request, pk=None):
        quotation = self.get_object()
        rfq = quotation.rfq

        # Reject all other quotations for this RFQ, select this one
        Quotation.objects.filter(rfq=rfq).exclude(id=quotation.id).update(status='Rejected')
        quotation.status = 'Selected'
        quotation.save()

        # Advance PurchaseRequest stage to 6 (Product Order)
        pr = rfq.purchase_request
        pr.current_stage = 6
        pr.status = 'In Procurement'
        pr.save()

        return Response({'status': 'Quotation selected successfully.', 'quotation': QuotationSerializer(quotation).data})
