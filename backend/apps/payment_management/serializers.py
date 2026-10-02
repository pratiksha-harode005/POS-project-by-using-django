from rest_framework import serializers
from .models import Payment
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
                clean_ref = str(ref_num).strip()
                if len(clean_ref) != 12 or not clean_ref.isalnum():
                    raise serializers.ValidationError({
                        'reference_number': 'UTR / Bank Reference Number must be exactly 12 alphanumeric characters.'
                    })
        return data


