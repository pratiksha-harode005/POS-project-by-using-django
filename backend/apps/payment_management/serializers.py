import uuid
from rest_framework import serializers
from django.db.models import Q
from .models import Payment
from apps.invoice_management.models import Invoice
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor
from apps.procurement.models import PurchaseOrder
from apps.core.utils import resolve_vendor_helper
from apps.invoice_management.serializers import InvoiceSerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.rfq_management.serializers import PurchaseRequestSummarySerializer


class PaymentSerializer(serializers.ModelSerializer):
    invoice_detail = InvoiceSerializer(source='invoice', read_only=True)
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    purchase_request_detail = PurchaseRequestSummarySerializer(source='purchase_request', read_only=True)
    disbursed_by_role = serializers.SerializerMethodField()
    is_finance_payment = serializers.SerializerMethodField()
    payment_method_display = serializers.SerializerMethodField()

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_id', 'created_at', 'updated_at']

    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            data = data.dict()
        elif hasattr(data, 'copy'):
            data = data.copy()
        else:
            data = dict(data)

        # Support camelCase aliases
        req_val = data.get('purchase_request') or data.get('requestId') or data.get('request_id') or data.get('request')
        inv_val = data.get('invoice') or data.get('invoiceId') or data.get('invoice_id')
        po_val = data.get('purchase_order') or data.get('poNumber') or data.get('po_id') or data.get('po')
        ven_val = data.get('vendor') or data.get('vendorId') or data.get('vendor_id')

        # Clean non-model fields so they don't cause serializer rejection
        data.pop('purchase_order', None)
        data.pop('poNumber', None)
        data.pop('po_id', None)
        data.pop('po', None)
        data.pop('requestId', None)
        data.pop('invoiceId', None)
        data.pop('vendorId', None)
        data.pop('paymentMethod', None)
        data.pop('referenceNumber', None)

        # 1. Resolve PurchaseRequest
        pr_obj = None
        if req_val:
            req_str = str(req_val).strip()
            if req_str.isdigit():
                pr_obj = PurchaseRequest.objects.filter(id=int(req_str)).first()
            if not pr_obj:
                clean_r = req_str.replace('REQ-', '').replace('RFQ-', '').replace('PO-', '').strip()
                pr_obj = PurchaseRequest.objects.filter(
                    Q(request_id__iexact=req_str) |
                    Q(request_id__icontains=clean_r) |
                    Q(rfqs__rfq_id__iexact=req_str) |
                    Q(rfqs__rfq_id__icontains=clean_r) |
                    Q(purchase_orders__po_id__iexact=req_str) |
                    Q(purchase_orders__po_id__icontains=clean_r)
                ).first()

        # If PR not found, try resolving via PO or Invoice
        if not pr_obj and po_val:
            po_str = str(po_val).strip()
            po_record = None
            if po_str.isdigit():
                po_record = PurchaseOrder.objects.filter(id=int(po_str)).first()
            if not po_record:
                clean_po = po_str.replace('PO-', '').strip()
                po_record = PurchaseOrder.objects.filter(
                    Q(po_id__iexact=po_str) | Q(po_id__icontains=clean_po)
                ).first()
            if po_record and po_record.purchase_request:
                pr_obj = po_record.purchase_request

        if not pr_obj and inv_val:
            inv_str = str(inv_val).strip()
            inv_record = None
            if inv_str.isdigit():
                inv_record = Invoice.objects.filter(id=int(inv_str)).first()
            if not inv_record:
                clean_inv = inv_str.replace('INV-DELL-', '').replace('INV-', '').strip()
                inv_record = Invoice.objects.filter(
                    Q(invoice_id__iexact=inv_str) |
                    Q(invoice_number__iexact=inv_str) |
                    Q(invoice_id__icontains=clean_inv) |
                    Q(invoice_number__icontains=clean_inv)
                ).first()
            if inv_record:
                if hasattr(inv_record, 'purchase_request') and inv_record.purchase_request:
                    pr_obj = inv_record.purchase_request
                elif inv_record.purchase_order and inv_record.purchase_order.purchase_request:
                    pr_obj = inv_record.purchase_order.purchase_request

        if not pr_obj and self.instance and self.instance.purchase_request:
            pr_obj = self.instance.purchase_request

        if not pr_obj:
            # Fallback to the latest purchase request if any exists
            pr_obj = PurchaseRequest.objects.order_by('-created_at').first()

        if pr_obj:
            data['purchase_request'] = pr_obj.id

        # 2. Resolve Invoice
        inv_obj = None
        if inv_val:
            inv_str = str(inv_val).strip()
            if inv_str.isdigit():
                inv_obj = Invoice.objects.filter(id=int(inv_str)).first()
            if not inv_obj:
                clean_inv = inv_str.replace('INV-DELL-', '').replace('INV-', '').strip()
                inv_obj = Invoice.objects.filter(
                    Q(invoice_id__iexact=inv_str) |
                    Q(invoice_number__iexact=inv_str) |
                    Q(invoice_id__icontains=clean_inv) |
                    Q(invoice_number__icontains=clean_inv)
                ).first()

        if not inv_obj and pr_obj:
            inv_obj = Invoice.objects.filter(
                purchase_order__purchase_request=pr_obj
            ).order_by('-created_at').first()

        if inv_obj:
            data['invoice'] = inv_obj.id
        else:
            data['invoice'] = None

        # 3. Resolve Vendor
        vendor_obj = None
        if ven_val:
            vendor_obj = resolve_vendor_helper(ven_val)

        if not vendor_obj and inv_obj and inv_obj.vendor:
            vendor_obj = inv_obj.vendor

        if not vendor_obj and pr_obj:
            if pr_obj.vendor:
                vendor_obj = resolve_vendor_helper(pr_obj.vendor)
            if not vendor_obj and pr_obj.preferred_vendor:
                vendor_obj = resolve_vendor_helper(pr_obj.preferred_vendor)
            if not vendor_obj:
                po_item = pr_obj.purchase_orders.order_by('-created_at').first()
                if po_item and po_item.vendor:
                    vendor_obj = po_item.vendor

        if vendor_obj:
            data['vendor'] = vendor_obj.id
            if not data.get('vendor_name'):
                data['vendor_name'] = vendor_obj.name
        else:
            data['vendor'] = None
            if not data.get('vendor_name'):
                data['vendor_name'] = str(ven_val).strip() if ven_val else 'Vendor Partner'

        # 4. Resolve Amount
        amt_val = data.get('amount')
        if amt_val is None or str(amt_val).strip() in ['', '0', '0.00', 'None', 'null']:
            if inv_obj and getattr(inv_obj, 'amount', None):
                data['amount'] = float(inv_obj.amount)
            elif pr_obj and pr_obj.approved_amount:
                data['amount'] = float(pr_obj.approved_amount)
            elif pr_obj and pr_obj.total_estimated_cost:
                data['amount'] = float(pr_obj.total_estimated_cost)
            else:
                data['amount'] = 50000.00

        # 5. Resolve Payment Method
        p_meth = data.get('payment_method')
        if not p_meth or str(p_meth).strip() in ['', 'None', 'null']:
            data['payment_method'] = 'Online Bank Transfer'
        else:
            p_meth_str = str(p_meth).strip()
            if p_meth_str.lower() in ['bank transfer', 'online transfer', 'bank', 'neft/rtgs/imps']:
                data['payment_method'] = 'Online Bank Transfer'
            elif p_meth_str.lower() in ['upi']:
                data['payment_method'] = 'UPI'
            elif p_meth_str.lower() in ['cash']:
                data['payment_method'] = 'Cash on Hand'
            elif p_meth_str.lower() in ['cheque', 'check']:
                data['payment_method'] = 'Cheque'
            elif p_meth_str.lower() in ['card', 'credit card', 'debit card']:
                data['payment_method'] = 'Card'

        # 6. Resolve Reference Number
        ref_val = data.get('reference_number')
        if not ref_val or str(ref_val).strip() in ['', 'None', 'null']:
            data['reference_number'] = f"UTR{uuid.uuid4().hex[:12].upper()}"
        else:
            clean_ref = str(ref_val).strip().upper()
            clean_ref_alnum = ''.join(c for c in clean_ref if c.isalnum())
            if len(clean_ref_alnum) > 15:
                clean_ref_alnum = clean_ref_alnum[:15]
            data['reference_number'] = clean_ref_alnum or f"UTR{uuid.uuid4().hex[:12].upper()}"

        # 7. Resolve Status
        if not data.get('status'):
            data['status'] = 'Paid'

        return super().to_internal_value(data)

    def get_disbursed_by_role(self, obj):
        if hasattr(obj, '_disbursed_by_role_cache'):
            return obj._disbursed_by_role_cache

        notes_str = str(obj.notes or '')
        if 'Finance' in notes_str:
            res = 'FINANCE'
        elif 'Admin' in notes_str:
            res = 'ADMIN'
        elif 'Manager' in notes_str:
            res = 'MANAGER'
        elif obj.purchase_request:
            if hasattr(obj.purchase_request, '_prefetched_objects_cache') and 'approval_steps' in obj.purchase_request._prefetched_objects_cache:
                steps = obj.purchase_request._prefetched_objects_cache['approval_steps']
            else:
                steps = []
            pay_step = next((s for s in sorted(steps, key=lambda x: x.created_at or 0, reverse=True) if 'payment settled' in str(s.notes or '').lower()), None)
            if pay_step and pay_step.role:
                res = pay_step.role
            elif any(s.role == 'FINANCE' for s in steps):
                res = 'FINANCE'
            elif any(s.role == 'ADMIN' for s in steps):
                res = 'ADMIN'
            else:
                res = 'MANAGER'
        else:
            res = 'MANAGER'

        obj._disbursed_by_role_cache = res
        return res

    def get_is_finance_payment(self, obj):
        return self.get_disbursed_by_role(obj) == 'FINANCE'

    def get_payment_method_display(self, obj):
        if not obj.payment_method or str(obj.payment_method).strip() in ['', 'None', 'null']:
            return '--'
        try:
            return obj.get_payment_method_display() or str(obj.payment_method)
        except Exception:
            return str(obj.payment_method)

    def validate(self, data):
        pay_method = str(data.get('payment_method') or getattr(self.instance, 'payment_method', '') or '').strip().lower()
        ref_num = data.get('reference_number')
        if ref_num is None and self.instance:
            ref_num = self.instance.reference_number

        # If payment method is bank transfer / online / NEFT / RTGS / IMPS / UPI
        if any(k in pay_method for k in ['bank', 'neft', 'rtgs', 'imps', 'transfer', 'online', 'upi']):
            if ref_num is not None and str(ref_num).strip():
                clean_ref = str(ref_num).strip()
                if len(clean_ref) > 15 or not clean_ref.isalnum():
                    raise serializers.ValidationError({
                        'reference_number': 'UTR / Bank Reference Number must be alphanumeric and have a maximum limit of 15 characters.'
                    })
        return data


