import re
from rest_framework import serializers
from .models import Payment
from apps.invoice_management.serializers import InvoiceSerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.rfq_management.serializers import PurchaseRequestSummarySerializer
from apps.request_management.models import PurchaseRequest
from apps.invoice_management.models import Invoice
from apps.vendor_management.models import Vendor
from apps.core.utils import resolve_vendor_helper


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
        if hasattr(data, 'copy'):
            data = data.copy()
        elif isinstance(data, dict):
            data = dict(data)

        # 1. Resolve purchase_request
        req_val = data.get('purchase_request') or data.get('purchaseRequestId') or data.get('requestId')
        if req_val:
            pr_obj = None
            if isinstance(req_val, PurchaseRequest):
                pr_obj = req_val
            else:
                req_str = str(req_val).strip()
                if req_str.isdigit():
                    pr_obj = PurchaseRequest.objects.filter(id=int(req_str)).first()
                if not pr_obj:
                    pr_obj = PurchaseRequest.objects.filter(request_id__iexact=req_str).first()
                if not pr_obj:
                    clean_id = req_str.replace('PRD-', 'REQ-').replace('TCK-', 'REQ-').replace('TKT-', 'REQ-')
                    pr_obj = PurchaseRequest.objects.filter(request_id__iexact=clean_id).first()
                if not pr_obj:
                    base_code = req_str.replace('PRD-', '').replace('TCK-', '').replace('REQ-', '').replace('PO-', '').split('-')[0].strip()
                    if base_code:
                        pr_obj = PurchaseRequest.objects.filter(request_id__icontains=base_code).first()

            if pr_obj:
                data['purchase_request'] = pr_obj.id

        # 2. Resolve invoice
        inv_val = data.get('invoice') or data.get('invoiceId')
        if inv_val:
            inv_obj = None
            if isinstance(inv_val, Invoice):
                inv_obj = inv_val
            else:
                inv_str = str(inv_val).strip()
                if inv_str.isdigit():
                    inv_obj = Invoice.objects.filter(id=int(inv_str)).first()
                if not inv_obj:
                    inv_obj = Invoice.objects.filter(invoice_number__iexact=inv_str).first()
                if not inv_obj:
                    inv_obj = Invoice.objects.filter(invoice_number__icontains=inv_str.replace('INV-', '')).first()

            if inv_obj:
                data['invoice'] = inv_obj.id
                if not data.get('purchase_request') and inv_obj.purchase_order and inv_obj.purchase_order.purchase_request:
                    data['purchase_request'] = inv_obj.purchase_order.purchase_request.id
                if not data.get('vendor') and inv_obj.vendor:
                    data['vendor'] = inv_obj.vendor.id
            else:
                data.pop('invoice', None)

        # 3. Resolve vendor
        v_val = data.get('vendor') or data.get('vendorId') or data.get('vendor_id')
        if v_val:
            v_obj = resolve_vendor_helper(v_val)
            if v_obj:
                data['vendor'] = v_obj.id
                if not data.get('vendor_name'):
                    data['vendor_name'] = v_obj.name
            else:
                data.pop('vendor', None)
                if not data.get('vendor_name'):
                    data['vendor_name'] = str(v_val)

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

        # If payment method is bank transfer / online / NEFT / RTGS / IMPS
        if any(k in pay_method for k in ['bank', 'neft', 'rtgs', 'imps', 'transfer', 'online']):
            if ref_num is not None and str(ref_num).strip():
                clean_ref = str(ref_num).strip().upper()
                utr_regex = re.compile(r'^[A-Z]{4}[0-9]{11}$')
                if not (utr_regex.match(clean_ref) or (10 <= len(clean_ref) <= 22 and clean_ref.isalnum())):
                    raise serializers.ValidationError({
                        'reference_number': 'UTR / Bank Reference Number must be 15 characters (4 letters followed by 11 digits, e.g. SBIN01234567890).'
                    })
        return data


