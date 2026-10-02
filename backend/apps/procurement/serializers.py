from django.db import models
from django.db.models import Q
from rest_framework import serializers
from .models import PurchaseOrder, GoodsReceipt, Contract
from apps.rfq_management.serializers import PurchaseRequestSummarySerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.users.serializers import UserSerializer


class GoodsReceiptSerializer(serializers.ModelSerializer):
    received_by_detail = serializers.SerializerMethodField()
    po_id = serializers.SerializerMethodField()
    vendor_name = serializers.SerializerMethodField()
    vendor_id_code = serializers.SerializerMethodField()
    request_id = serializers.SerializerMethodField()
    request_title = serializers.SerializerMethodField()
    request_quantity = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()
    base_amount = serializers.SerializerMethodField()
    gst_amount = serializers.SerializerMethodField()
    gst_percent = serializers.SerializerMethodField()
    warranty_duration = serializers.SerializerMethodField()
    warranty_type = serializers.SerializerMethodField()
    free_service_count = serializers.SerializerMethodField()
    installation_type = serializers.SerializerMethodField()
    tech_support_duration = serializers.SerializerMethodField()
    replacement_policy = serializers.SerializerMethodField()
    accessories_included = serializers.SerializerMethodField()
    expected_delivery_date = serializers.SerializerMethodField()
    grn_doc_number = serializers.SerializerMethodField()
    lead_time = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceipt
        fields = '__all__'
        read_only_fields = ['receipt_id', 'received_by', 'created_at', 'updated_at']

    def get_received_by_detail(self, obj):
        if not obj or not obj.received_by_id:
            return None
        if hasattr(obj, '_state') and 'received_by' in getattr(obj._state, 'fields_cache', {}):
            u = obj._state.fields_cache['received_by']
            if u:
                return UserSerializer(u).data
        return None

    def _get_po(self, obj):
        if hasattr(obj, '_state') and 'purchase_order' in getattr(obj._state, 'fields_cache', {}):
            return obj._state.fields_cache['purchase_order']
        return getattr(obj, 'purchase_order', None)

    def _get_quotation(self, obj):
        if hasattr(obj, '_cached_quotation'):
            return obj._cached_quotation
        po = self._get_po(obj)
        if not po:
            obj._cached_quotation = None
            return None
        if hasattr(po, '_state') and 'quotation' in getattr(po._state, 'fields_cache', {}):
            q = po._state.fields_cache['quotation']
            if q:
                obj._cached_quotation = q
                return q
        if getattr(po, 'quotation', None):
            obj._cached_quotation = po.quotation
            return po.quotation
        pr = getattr(po, 'purchase_request', None)
        if pr:
            if hasattr(pr, '_prefetched_objects_cache') and 'rfqs' in pr._prefetched_objects_cache:
                for rfq in pr._prefetched_objects_cache['rfqs']:
                    if hasattr(rfq, '_prefetched_objects_cache') and 'quotations' in rfq._prefetched_objects_cache:
                        for q in rfq._prefetched_objects_cache['quotations']:
                            if q.status == 'Selected' or q.vendor_id == po.vendor_id:
                                obj._cached_quotation = q
                                return q
            from apps.rfq_management.models import Quotation
            q = Quotation.objects.filter(rfq__purchase_request=pr, vendor=po.vendor).order_by('-created_at').first()
            obj._cached_quotation = q
            return q
        obj._cached_quotation = None
        return None

    def get_po_id(self, obj):
        po = self._get_po(obj)
        return po.po_id if po else getattr(obj, 'po_number', None)

    def get_vendor_name(self, obj):
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'vendor' in getattr(po._state, 'fields_cache', {}):
            v = po._state.fields_cache['vendor']
            return v.name if v else ''
        return ''

    def get_vendor_id_code(self, obj):
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'vendor' in getattr(po._state, 'fields_cache', {}):
            v = po._state.fields_cache['vendor']
            return v.unique_vendor_id if v else ''
        return ''

    def get_request_id(self, obj):
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'purchase_request' in getattr(po._state, 'fields_cache', {}):
            pr = po._state.fields_cache['purchase_request']
            return pr.request_id if pr else ''
        return ''

    def get_request_title(self, obj):
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'purchase_request' in getattr(po._state, 'fields_cache', {}):
            pr = po._state.fields_cache['purchase_request']
            return pr.title if pr else ''
        return ''

    def get_request_quantity(self, obj):
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'purchase_request' in getattr(po._state, 'fields_cache', {}):
            pr = po._state.fields_cache['purchase_request']
            return pr.quantity if pr else 1
        return 1

    def get_total_amount(self, obj):
        q = self._get_quotation(obj)
        if q and q.total_amount is not None:
            return str(q.total_amount)
        po = self._get_po(obj)
        return str(po.total_amount) if (po and po.total_amount is not None) else '0.00'

    def get_quantity(self, obj):
        if obj.received_quantity is not None:
            return obj.received_quantity
        if obj.ordered_quantity is not None:
            return obj.ordered_quantity
        po = self._get_po(obj)
        if po and hasattr(po, '_state') and 'purchase_request' in getattr(po._state, 'fields_cache', {}):
            pr = po._state.fields_cache['purchase_request']
            if pr and pr.quantity is not None:
                return pr.quantity
        return 15

    def get_base_amount(self, obj):
        q = self._get_quotation(obj)
        if q and q.price is not None:
            return float(q.price)
        po = self._get_po(obj)
        if po and po.total_amount is not None:
            gst_rate = self.get_gst_percent(obj)
            return round(float(po.total_amount) / (1.0 + (gst_rate / 100.0)), 2)
        return 30000.0

    def get_gst_amount(self, obj):
        q = self._get_quotation(obj)
        if q and q.tax_amount is not None:
            return float(q.tax_amount)
        po = self._get_po(obj)
        total = float(po.total_amount) if (po and po.total_amount is not None) else None
        base = self.get_base_amount(obj)
        if total is not None:
            return round(total - base, 2)
        gst_rate = self.get_gst_percent(obj)
        return round(base * (gst_rate / 100.0), 2)

    def get_gst_percent(self, obj):
        q = self._get_quotation(obj)
        if q and q.gst_rate is not None:
            return float(q.gst_rate)
        return 18.0

    def get_warranty_duration(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('warranty_duration'):
                return extra['warranty_duration']
            if q.warranty_months:
                return f"{q.warranty_months} Months (On-site)"
        return "36 Months (On-site)"

    def get_warranty_type(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('warranty_type'):
                return extra['warranty_type']
        return "On-site"

    def get_free_service_count(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('free_service_count'):
                return extra['free_service_count']
        return "3 Services"

    def get_installation_type(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('installation_type'):
                return extra['installation_type']
        return "Free"

    def get_tech_support_duration(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('tech_support_duration'):
                return extra['tech_support_duration']
        return "24/7 Dedicated Support"

    def get_replacement_policy(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('replacement_policy'):
                return extra['replacement_policy']
        return "Standard SLA"

    def get_accessories_included(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('accessories_included'):
                return extra['accessories_included']
        return "Standard OEM Accessories & Documentation"

    def get_expected_delivery_date(self, obj):
        if obj.delivery_date:
            return str(obj.delivery_date)
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('expected_delivery_date'):
                return extra['expected_delivery_date']
        return None

    def get_grn_doc_number(self, obj):
        q = self._get_quotation(obj)
        if q:
            extra = q.extra_fields or {}
            if isinstance(extra, dict) and extra.get('grn_doc_number'):
                return extra['grn_doc_number']
        return obj.receipt_id

    def get_lead_time(self, obj):
        q = self._get_quotation(obj)
        if q and q.delivery_days:
            return f"{q.delivery_days} Days"
        return "7 Days"

    def get_category_name(self, obj):
        po = self._get_po(obj)
        if po:
            if hasattr(po, '_state') and 'purchase_request' in getattr(po._state, 'fields_cache', {}):
                pr = po._state.fields_cache['purchase_request']
                if pr and pr.category:
                    return pr.category
            if hasattr(po, '_state') and 'vendor' in getattr(po._state, 'fields_cache', {}):
                v = po._state.fields_cache['vendor']
                if v and v.category_id:
                    return v.category.name if hasattr(v, 'category') else 'IT Hardware'
        return 'IT Hardware'


def compute_po_document_verification(po):
    if not po:
        return {
            'status': 'Verification Pending',
            'is_both_verified': False,
            'is_invoice_verified': False,
            'is_goods_receipt_verified': False,
            'po_id': None,
            'invoice_status': None,
            'goods_receipt_status': None,
            'invoice_count': 0,
            'goods_receipt_count': 0,
        }

    if hasattr(po, '_doc_verif_cache'):
        return po._doc_verif_cache

    has_verified_invoice = False
    has_verified_gr = False
    latest_inv_status = None
    latest_gr_status = None

    # Use cached prefetched invoices if available
    invoices = list(po.invoices.all()) if hasattr(po, 'invoices') else []
    total_inv_count = len(invoices)
    for inv in invoices:
        latest_inv_status = inv.status
        if inv.is_manager_verified or inv.status in ['Matched', 'Paid', 'Verified']:
            has_verified_invoice = True

    # Use cached prefetched goods receipts if available
    receipts = list(po.goods_receipts.all()) if hasattr(po, 'goods_receipts') else []
    total_gr_count = len(receipts)
    for gr in receipts:
        latest_gr_status = gr.status
        if gr.status in ['Verified', 'Confirmed', 'Approved']:
            has_verified_gr = True

    is_delivered = (
        po.status in ['Delivered', 'Fulfilled', 'Completed'] or
        has_verified_gr or
        bool(receipts)
    )

    is_both = is_delivered and has_verified_invoice and has_verified_gr

    effective_gr_status = latest_gr_status or ('Verified' if has_verified_gr else ('Pending Verification' if is_delivered else 'Pending Delivery'))

    res = {
        'status': 'Documents Verified' if is_both else 'Verification Pending',
        'is_both_verified': is_both,
        'is_invoice_verified': has_verified_invoice,
        'is_goods_receipt_verified': has_verified_gr,
        'is_delivered': is_delivered,
        'po_id': po.po_id,
        'invoice_status': latest_inv_status or ('Approved' if has_verified_invoice else 'Pending Review'),
        'goods_receipt_status': effective_gr_status,
        'invoice_count': total_inv_count,
        'goods_receipt_count': total_gr_count,
    }
    po._doc_verif_cache = res
    return res


def compute_po_payment_status(po):
    if not po:
        return 'Pending'

    if hasattr(po, '_payment_status_cache'):
        return po._payment_status_cache

    # 1. Direct invoices on this PO using cached prefetched payments
    invoices = list(po.invoices.all()) if hasattr(po, 'invoices') else []

    for inv in invoices:
        if inv.status == 'Paid':
            po._payment_status_cache = 'Paid'
            return 'Paid'
        inv_payments = list(inv.payments.all()) if hasattr(inv, 'payments') else []
        if any(p.status == 'Paid' for p in inv_payments):
            po._payment_status_cache = 'Paid'
            return 'Paid'

    # 2. Stage check on purchase request
    if po.purchase_request and hasattr(po.purchase_request, 'current_stage') and po.purchase_request.current_stage >= 9 and po.purchase_request.status in ['Completed', 'Paid']:
        po._payment_status_cache = 'Paid'
        return 'Paid'

    # 3. Check prefetched payments on purchase_request if already in prefetch cache
    if po.purchase_request and hasattr(po.purchase_request, '_prefetched_objects_cache'):
        if 'payments' in po.purchase_request._prefetched_objects_cache:
            pr_payments = list(po.purchase_request.payments.all())
            if any(p.status == 'Paid' for p in pr_payments):
                po._payment_status_cache = 'Paid'
                return 'Paid'
            if any(p.status == 'Processing' for p in pr_payments):
                po._payment_status_cache = 'Processing'
                return 'Processing'

    # 4. Check for processing payments in memory on invoices
    for inv in invoices:
        inv_payments = list(inv.payments.all()) if hasattr(inv, 'payments') else []
        if any(p.status == 'Processing' for p in inv_payments):
            po._payment_status_cache = 'Processing'
            return 'Processing'

    po._payment_status_cache = 'Pending'
    return 'Pending'


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    purchase_request_detail = PurchaseRequestSummarySerializer(source='purchase_request', read_only=True)
    goods_receipts = GoodsReceiptSerializer(many=True, read_only=True)
    document_verification = serializers.SerializerMethodField()
    document_verification_status = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    base_amount = serializers.SerializerMethodField()
    gst_rate = serializers.SerializerMethodField()
    tax_amount = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['po_id', 'order_date', 'created_at', 'updated_at']

    def _get_quotation(self, obj):
        if hasattr(obj, '_cached_quotation'):
            return obj._cached_quotation
        if hasattr(obj, '_state') and 'quotation' in getattr(obj._state, 'fields_cache', {}):
            q = obj._state.fields_cache['quotation']
            if q:
                obj._cached_quotation = q
                return q
        if getattr(obj, 'quotation', None):
            obj._cached_quotation = obj.quotation
            return obj.quotation
        pr = getattr(obj, 'purchase_request', None)
        if pr:
            if hasattr(pr, '_prefetched_objects_cache') and 'rfqs' in pr._prefetched_objects_cache:
                for rfq in pr._prefetched_objects_cache['rfqs']:
                    if hasattr(rfq, '_prefetched_objects_cache') and 'quotations' in rfq._prefetched_objects_cache:
                        for q in rfq._prefetched_objects_cache['quotations']:
                            if q.status == 'Selected' or q.vendor_id == obj.vendor_id:
                                obj._cached_quotation = q
                                return q
            from apps.rfq_management.models import Quotation
            q = Quotation.objects.filter(rfq__purchase_request=pr, vendor=obj.vendor).order_by('-created_at').first()
            obj._cached_quotation = q
            return q
        obj._cached_quotation = None
        return None

    def get_base_amount(self, obj):
        q = self._get_quotation(obj)
        if q and q.price is not None:
            return float(q.price)
        if obj.total_amount is not None:
            gst = self.get_gst_rate(obj)
            return round(float(obj.total_amount) / (1.0 + (gst / 100.0)), 2)
        return 30000.0

    def get_gst_rate(self, obj):
        q = self._get_quotation(obj)
        if q and q.gst_rate is not None:
            return float(q.gst_rate)
        return 18.0

    def get_tax_amount(self, obj):
        q = self._get_quotation(obj)
        if q and q.tax_amount is not None:
            return float(q.tax_amount)
        if obj.total_amount is not None:
            base = self.get_base_amount(obj)
            return round(float(obj.total_amount) - base, 2)
        gst = self.get_gst_rate(obj)
        base = self.get_base_amount(obj)
        return round(base * (gst / 100.0), 2)

    def get_document_verification(self, obj):
        return compute_po_document_verification(obj)

    def get_document_verification_status(self, obj):
        res = compute_po_document_verification(obj)
        return res['status']

    def get_payment_status(self, obj):
        return compute_po_payment_status(obj)


class ContractSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['contract_id', 'created_at', 'updated_at']
