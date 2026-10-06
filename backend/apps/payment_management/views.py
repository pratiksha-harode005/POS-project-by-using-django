import datetime
from django.db import models
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q, Prefetch
from .models import Payment
from .serializers import PaymentSerializer
from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.invoice_management.models import Invoice
from apps.vendor_management.models import Vendor


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status', 'payment_method']
    search_fields = ['payment_id', 'reference_number']

    def get_queryset(self):
        user = self.request.user
        qs = Payment.objects.select_related(
            'vendor',
            'vendor__category',
            'vendor__user',
            'invoice',
            'invoice__vendor',
            'invoice__vendor__category',
            'invoice__purchase_order',
            'invoice__purchase_order__vendor',
            'invoice__purchase_order__vendor__category',
            'invoice__purchase_order__purchase_request',
            'invoice__purchase_order__purchase_request__department',
            'invoice__purchase_order__purchase_request__created_by',
            'invoice__purchase_order__purchase_request__created_by__department',
            'purchase_request',
            'purchase_request__department',
            'purchase_request__created_by',
            'purchase_request__created_by__department',
            'purchase_request__payment_justification',
            'purchase_request__payment_justification__submitted_by',
            'purchase_request__payment_justification__verified_by',
        ).prefetch_related(
            Prefetch(
                'invoice__purchase_order__goods_receipts',
                queryset=GoodsReceipt.objects.select_related('received_by', 'received_by__department')
            ),
            Prefetch(
                'invoice__purchase_order__invoices',
                queryset=Invoice.objects.prefetch_related('payments')
            ),
            Prefetch(
                'purchase_request__approval_steps',
                queryset=ApprovalStep.objects.select_related('actor', 'actor__department', 'reason')
            )
        )

        vendor_param = self.request.query_params.get('vendor') or self.request.query_params.get('vendor_id') or self.request.query_params.get('vendorId')
        if vendor_param:
            from apps.core.utils import resolve_vendor_helper
            v_val = str(vendor_param).strip()
            v_obj = resolve_vendor_helper(v_val)
            if v_obj:
                qs = qs.filter(vendor=v_obj)
            else:
                qs = qs.filter(
                    Q(vendor__unique_vendor_id__iexact=v_val) |
                    Q(vendor__name__iexact=v_val)
                )

        if getattr(user, 'role', None) == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(vendor=user.vendor_profile).order_by('-created_at')
            return qs.order_by('-created_at')
        elif getattr(user, 'role', None) == 'TEAM_LEAD':
            filtered_qs = qs.filter(
                Q(purchase_request__created_by=user) |
                Q(purchase_request__assigned_team_lead=user) |
                Q(purchase_request__created_by__role='TEAM_LEAD')
            ).distinct()
            return filtered_qs.order_by('-created_at')
        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        payment = serializer.save()
        if payment.status == 'Paid':
            self._complete_stage(payment)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def mark_paid(self, request, pk=None):
        payment = self.get_object()
        data = request.data or {}

        pay_method = data.get('payment_method') or data.get('paymentMethod') or payment.payment_method
        if not pay_method or str(pay_method).strip() == '':
            return Response({'error': 'Payment method is required.'}, status=status.HTTP_400_BAD_REQUEST)

        valid_methods = [
            'Online Bank Transfer', 'Online Bank Transfer (NEFT/RTGS/IMPS)', 'NEFT / RTGS Corporate Treasury', 'NEFT/RTGS/IMPS', 'Bank Transfer',
            'UPI',
            'Cash on Hand', 'Cash',
            'Cheque', 'Check',
            'Card', 'Credit Card', 'Debit Card',
            'Wire'
        ]
        if pay_method not in valid_methods and not any(v.lower() == str(pay_method).lower() for v in valid_methods):
            return Response({'error': f"Invalid payment method '{pay_method}'. Allowed methods: Online Bank Transfer, UPI, Cash on Hand, Cheque, Card."}, status=status.HTTP_400_BAD_REQUEST)

        is_bank_method = any(k in str(pay_method).lower() for k in ['bank', 'neft', 'rtgs', 'imps', 'transfer', 'online'])
        raw_ref = (
            data.get('reference_number') or
            data.get('referenceNumber') or
            data.get('transactionRef') or
            data.get('transaction_ref') or
            data.get('utrRef') or
            data.get('utr_ref') or
            data.get('utr')
        )
        if is_bank_method:
            if raw_ref:
                clean_ref = str(raw_ref).strip().upper()
                import re
                utr_regex = re.compile(r'^[A-Z]{4}[0-9]{11}$')
                if not (utr_regex.match(clean_ref) or (10 <= len(clean_ref) <= 22 and clean_ref.isalnum())):
                    return Response(
                        {'error': 'UTR / Bank Reference Number must be 15 characters (4 letters followed by 11 digits, e.g. SBIN01234567890).'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ref_num = clean_ref
            else:
                ref_num = payment.reference_number
        else:
            ref_num = raw_ref or payment.reference_number
        notes = data.get('notes') or data.get('comment') or payment.notes

        payment.payment_method = pay_method
        if ref_num:
            payment.reference_number = ref_num
        if notes:
            payment.notes = notes
        payment.status = 'Paid'
        if not payment.payment_date:
            payment.payment_date = data.get('payment_date') or data.get('paymentDate') or datetime.date.today()
        payment.save()

        self._complete_stage(payment)

        return Response(PaymentSerializer(payment).data)

    def _complete_stage(self, payment):
        # 1. Update Invoice to Paid
        inv = payment.invoice
        if inv:
            inv.status = 'Paid'
            inv.save()
            if inv.purchase_order:
                if inv.purchase_order.status in ['Issued', 'Confirmed']:
                    inv.purchase_order.status = 'Delivered'
                    inv.purchase_order.save()

        # 2. Update PurchaseRequest to Stage 9 (Payment) and Completed
        pr = payment.purchase_request
        if pr:
            pr.current_stage = 9  # Payment
            pr.status = 'Completed'
            pr.save()

            for po in pr.purchase_orders.all():
                if po.status in ['Issued', 'Confirmed']:
                    po.status = 'Delivered'
                    po.save()

            user_actor = self.request.user if hasattr(self, 'request') and self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated else None
            if user_actor:
                ApprovalStep.objects.create(
                    request=pr,
                    actor=user_actor,
                    role=getattr(user_actor, 'role', 'MANAGER') or 'MANAGER',
                    decision='APPROVE',
                    notes=f"Payment settled. UTR: {payment.reference_number}"
                )

        from apps.notification_management.services import notify_stage_event, notify_vendor
        # 1. Notify Vendor
        if payment.vendor:
            notify_vendor(
                vendor=payment.vendor,
                purchase_request=pr,
                title=f"Payment Disbursed (UTR: {payment.reference_number})",
                message=f"Payment of Rs.{payment.amount:,.2f} has been disbursed for Invoice {inv.invoice_number if inv else ''} (PO: {inv.purchase_order.po_id if inv and inv.purchase_order else ''})."
            )

        # 2. Notify Requester (Originating Portal), Manager, Finance, and Admin
        if pr:
            notify_stage_event(
                'PAYMENT_COMPLETED',
                purchase_request=pr,
                actor=self.request.user if hasattr(self, 'request') and self.request and hasattr(self.request, 'user') and self.request.user.is_authenticated else None,
                details={
                    'amount': float(payment.amount or 0),
                    'reference_number': payment.reference_number,
                    'vendor_name': payment.vendor.name if payment.vendor else 'Vendor',
                    'po_id': inv.purchase_order.po_id if inv and inv.purchase_order else 'PO-AUTO'
                }
            )

