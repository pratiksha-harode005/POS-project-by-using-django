import datetime
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
            return qs.filter(purchase_request__created_by=user).order_by('-created_at')
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # 1. Resolve PurchaseRequest
        pr_obj = None
        pr_val = data.get('purchase_request') or data.get('request') or data.get('requestId')
        if pr_val:
            val_str = str(pr_val).strip()
            if val_str.isdigit():
                pr_obj = PurchaseRequest.objects.filter(id=int(val_str)).first()
            if not pr_obj:
                clean_val = val_str.replace('REQ-', '').replace('RFQ-', '').replace('PO-', '').replace('TCK-', '').replace('TKT-', '').strip()
                pr_obj = PurchaseRequest.objects.filter(
                    Q(request_id__iexact=val_str) |
                    Q(request_id__icontains=clean_val) |
                    Q(rfqs__rfq_id__iexact=val_str) |
                    Q(purchase_orders__po_id__iexact=val_str) |
                    Q(purchase_orders__invoices__invoice_id__iexact=val_str)
                ).first()

        # 2. Resolve PurchaseOrder
        po_obj = None
        po_val = data.get('purchase_order') or data.get('poNumber') or data.get('po_id')
        if po_val:
            val_str = str(po_val).strip()
            if val_str.isdigit():
                po_obj = PurchaseOrder.objects.filter(id=int(val_str)).first()
            if not po_obj:
                clean_po = val_str.replace('PO-', '').strip()
                po_obj = PurchaseOrder.objects.filter(
                    Q(po_id__iexact=val_str) |
                    Q(po_id__icontains=clean_po)
                ).first()

        if not pr_obj and po_obj and po_obj.purchase_request:
            pr_obj = po_obj.purchase_request
        elif pr_obj and not po_obj:
            po_obj = pr_obj.purchase_orders.first()

        # 3. Resolve Vendor
        vendor_obj = None
        v_val = data.get('vendor') or data.get('vendorId')
        if v_val:
            val_str = str(v_val).strip()
            if val_str.isdigit():
                vendor_obj = Vendor.objects.filter(id=int(val_str)).first()
            if not vendor_obj:
                vendor_obj = Vendor.objects.filter(
                    Q(unique_vendor_id__iexact=val_str) |
                    Q(name__iexact=val_str) |
                    Q(name__icontains=val_str) |
                    Q(unique_vendor_id__icontains=val_str)
                ).first()

        if not vendor_obj:
            if po_obj and po_obj.vendor:
                vendor_obj = po_obj.vendor
            elif pr_obj and hasattr(pr_obj, 'rfqs'):
                rfq = pr_obj.rfqs.first()
                if rfq:
                    selected_q = rfq.quotations.filter(status='Selected').first()
                    if selected_q and selected_q.vendor:
                        vendor_obj = selected_q.vendor

        if not vendor_obj:
            vendor_obj = Vendor.objects.first()

        # 4. Resolve Invoice
        inv_obj = None
        inv_val = data.get('invoice') or data.get('invoiceId')
        if inv_val:
            val_str = str(inv_val).strip()
            if val_str.isdigit():
                inv_obj = Invoice.objects.filter(id=int(val_str)).first()
            if not inv_obj:
                clean_inv = val_str.replace('INV-', '').strip()
                inv_obj = Invoice.objects.filter(
                    Q(invoice_id__iexact=val_str) |
                    Q(invoice_id__icontains=clean_inv) |
                    Q(invoice_number__iexact=val_str)
                ).first()

        if not inv_obj and po_obj:
            inv_obj = po_obj.invoices.first()

        if not inv_obj and pr_obj:
            inv_obj = Invoice.objects.filter(purchase_order__purchase_request=pr_obj).first()

        # If still no Invoice exists, create one linked to the PO/PR
        if not inv_obj:
            if not po_obj and pr_obj:
                po_obj = PurchaseOrder.objects.create(
                    purchase_request=pr_obj,
                    vendor=vendor_obj,
                    total_amount=data.get('amount') or pr_obj.total_estimated_cost or 1000.00,
                    status='Delivered'
                )
            if po_obj:
                amt = data.get('amount') or po_obj.total_amount or 1000.00
                inv_obj = Invoice.objects.create(
                    purchase_order=po_obj,
                    vendor=vendor_obj or po_obj.vendor,
                    invoice_number=f"INV-{po_obj.po_id.replace('PO-', '')}",
                    amount=amt,
                    tax_amount=float(amt) * 0.18,
                    status='Paid',
                    invoice_date=datetime.date.today(),
                    due_date=datetime.date.today()
                )

        if not pr_obj and inv_obj and inv_obj.purchase_order and inv_obj.purchase_order.purchase_request:
            pr_obj = inv_obj.purchase_order.purchase_request

        if not pr_obj or not inv_obj or not vendor_obj:
            return Response({'error': 'Could not resolve purchase request, invoice, or vendor for payment'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if payment for this invoice or request already exists
        existing_payment = Payment.objects.filter(
            Q(invoice=inv_obj) | Q(purchase_request=pr_obj)
        ).first()

        status_val = data.get('status', 'Paid')
        payment_date_val = data.get('payment_date') or data.get('paymentDate') or data.get('date') or datetime.date.today()
        
        pay_method = data.get('payment_method') or data.get('paymentMethod')
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

        # Validate 12-character UTR / Bank Reference for bank transfer methods
        is_bank_method = any(k in str(pay_method).lower() for k in ['bank', 'neft', 'rtgs', 'imps', 'transfer', 'online'])
        if is_bank_method:
            raw_ref = (
                data.get('reference_number') or
                data.get('referenceNumber') or
                data.get('transactionRef') or
                data.get('transaction_ref') or
                data.get('utrRef') or
                data.get('utr_ref') or
                data.get('utr')
            )
            if not raw_ref or len(str(raw_ref).strip()) != 12 or not str(raw_ref).strip().isalnum():
                return Response(
                    {'error': 'UTR / Bank Reference Number must be exactly 12 alphanumeric characters.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            ref_num = str(raw_ref).strip().upper()
        else:
            ref_num = (
                data.get('reference_number') or
                data.get('referenceNumber') or
                data.get('transactionRef') or
                data.get('transaction_ref') or
                data.get('utrRef') or
                data.get('utr_ref') or
                data.get('utr') or
                f"REF{int(datetime.datetime.now().timestamp()*1000)}"
            )
        notes_val = data.get('notes') or data.get('comment') or f"Payment disbursed via {pay_method}. Ref: {ref_num}"

        if existing_payment:
            existing_payment.status = status_val
            existing_payment.payment_date = payment_date_val
            existing_payment.reference_number = ref_num
            if vendor_obj and not existing_payment.vendor:
                existing_payment.vendor = vendor_obj
            if pr_obj and not existing_payment.purchase_request:
                existing_payment.purchase_request = pr_obj
            if inv_obj and not existing_payment.invoice:
                existing_payment.invoice = inv_obj
            existing_payment.payment_method = pay_method
            if 'amount' in data and data['amount']:
                existing_payment.amount = data['amount']
            existing_payment.notes = notes_val
            existing_payment.save()
            payment = existing_payment
        else:
            payment = Payment.objects.create(
                invoice=inv_obj,
                purchase_request=pr_obj,
                vendor=vendor_obj,
                amount=data.get('amount') or inv_obj.amount or 1000.00,
                payment_method=pay_method,
                reference_number=ref_num,
                status=status_val,
                payment_date=payment_date_val,
                notes=notes_val
            )

        if payment.status == 'Paid':
            self._complete_stage(payment)

        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)

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
                if len(str(raw_ref).strip()) != 12 or not str(raw_ref).strip().isalnum():
                    return Response(
                        {'error': 'UTR / Bank Reference Number must be exactly 12 alphanumeric characters.'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                ref_num = str(raw_ref).strip().upper()
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
            pr.current_stage = 9 # Payment
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
                message=f"Payment of ₹{payment.amount:,.2f} has been disbursed for Invoice {inv.invoice_number if inv else ''} (PO: {inv.purchase_order.po_id if inv and inv.purchase_order else ''})."
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
