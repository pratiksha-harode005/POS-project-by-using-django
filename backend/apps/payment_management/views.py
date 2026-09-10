from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Payment
from .serializers import PaymentSerializer


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'payment_method', 'vendor']
    search_fields = ['payment_id', 'reference_number']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return Payment.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return Payment.objects.none()
        elif user.role == 'TEAM_LEAD':
            return Payment.objects.filter(purchase_request__created_by=user).order_by('-created_at')
        return Payment.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        payment = serializer.save()
        if payment.status == 'Paid':
            self._complete_stage(payment)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def mark_paid(self, request, pk=None):
        payment = self.get_object()
        payment.status = 'Paid'
        if not payment.payment_date:
            import datetime
            payment.payment_date = datetime.date.today()
        payment.save()

        self._complete_stage(payment)

        return Response(PaymentSerializer(payment).data)

    def _complete_stage(self, payment):
        # Update Invoice & PurchaseRequest to completed state
        inv = payment.invoice
        inv.status = 'Paid'
        inv.save()

        pr = payment.purchase_request
        pr.current_stage = 9 # Payment
        pr.status = 'Completed'
        pr.save()
