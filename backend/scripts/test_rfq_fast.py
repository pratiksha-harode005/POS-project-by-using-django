import os
import sys
import django
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from apps.rfq_management.models import RFQ, Quotation
from apps.procurement.models import PurchaseOrder
from apps.core.utils import resolve_vendor_helper
from django.db.models import Q, Prefetch
from rest_framework import serializers
from apps.users.serializers import UserSerializer, DepartmentSerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.request_management.models import PurchaseRequest

def compute_document_verification(purchase_request, quotation=None):
    if not purchase_request:
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

    if quotation and hasattr(quotation, '_doc_verif_cache'):
        return quotation._doc_verif_cache

    if hasattr(purchase_request, '_rfq_doc_verif_cache'):
        res = purchase_request._rfq_doc_verif_cache
        if quotation:
            quotation._doc_verif_cache = res
        return res
    
    if hasattr(purchase_request, '_prefetched_objects_cache') and 'purchase_orders' in purchase_request._prefetched_objects_cache:
        pos = purchase_request._prefetched_objects_cache['purchase_orders']
    else:
        pos = list(purchase_request.purchase_orders.all()) if hasattr(purchase_request, 'purchase_orders') else []
    
    if not pos:
        res = {
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
        purchase_request._rfq_doc_verif_cache = res
        if quotation:
            quotation._doc_verif_cache = res
        return res

    has_verified_invoice = False
    has_verified_gr = False
    latest_po_id = None
    latest_inv_status = None
    latest_gr_status = None
    total_inv_count = 0
    total_gr_count = 0

    for po in pos:
        latest_po_id = po.po_id
        if hasattr(po, '_prefetched_objects_cache') and 'invoices' in po._prefetched_objects_cache:
            invoices = po._prefetched_objects_cache['invoices']
        else:
            invoices = list(po.invoices.all()) if hasattr(po, 'invoices') else []
        total_inv_count += len(invoices)
        for inv in invoices:
            latest_inv_status = inv.status
            if inv.status in ['Approved', 'Matched', 'Paid', 'Verified']:
                has_verified_invoice = True

        if hasattr(po, '_prefetched_objects_cache') and 'goods_receipts' in po._prefetched_objects_cache:
            receipts = po._prefetched_objects_cache['goods_receipts']
        else:
            receipts = list(po.goods_receipts.all()) if hasattr(po, 'goods_receipts') else []
        total_gr_count += len(receipts)
        for gr in receipts:
            latest_gr_status = gr.status
            if gr.status in ['Verified', 'Confirmed', 'Approved']:
                has_verified_gr = True

    is_delivered = any(po.status in ['Delivered', 'Fulfilled', 'Completed'] for po in pos) or has_verified_gr
    is_both = is_delivered and has_verified_invoice and has_verified_gr

    res = {
        'status': 'Documents Verified' if is_both else 'Verification Pending',
        'is_both_verified': is_both,
        'is_invoice_verified': has_verified_invoice,
        'is_goods_receipt_verified': has_verified_gr if is_delivered else False,
        'is_delivered': is_delivered,
        'po_id': latest_po_id,
        'invoice_status': latest_inv_status,
        'goods_receipt_status': latest_gr_status if is_delivered else 'Pending Delivery',
        'invoice_count': total_inv_count,
        'goods_receipt_count': total_gr_count,
    }
    purchase_request._rfq_doc_verif_cache = res
    if quotation:
        quotation._doc_verif_cache = res
    return res


class FastRFQSerializer(serializers.ModelSerializer):
    purchase_request_detail = serializers.SerializerMethodField()
    invited_vendors_detail = VendorSerializer(source='invited_vendors', many=True, read_only=True)
    quotations = serializers.SerializerMethodField()
    document_verification = serializers.SerializerMethodField()
    document_verification_status = serializers.SerializerMethodField()

    class Meta:
        model = RFQ
        fields = '__all__'
        read_only_fields = ['rfq_id', 'created_at', 'updated_at']

    def get_purchase_request_detail(self, obj):
        pr = obj.purchase_request
        if not pr:
            return None
        cost = float(pr.total_estimated_cost) if pr.total_estimated_cost is not None else 0.0
        return {
            'id': pr.id,
            'request_id': pr.request_id,
            'title': pr.title,
            'category': pr.category,
            'subcategory': pr.subcategory,
            'quantity': pr.quantity,
            'description': pr.description,
            'required_by': str(pr.required_by) if pr.required_by else None,
            'delivery_location': pr.delivery_location,
            'total_estimated_cost': cost,
            'amount': cost,
            'estimated_cost': cost,
            'estimatedCost': cost,
            'status': pr.status,
            'current_stage': pr.current_stage,
            'stage_display': pr.get_current_stage_display(),
            'preferred_vendor': pr.preferred_vendor,
            'created_by_detail': UserSerializer(pr.created_by).data if pr.created_by else None,
            'department_detail': DepartmentSerializer(pr.department).data if pr.department else None,
            'created_at': pr.created_at.isoformat() if pr.created_at else None,
            'updated_at': pr.updated_at.isoformat() if pr.updated_at else None,
        }

    def get_document_verification(self, obj):
        return compute_document_verification(obj.purchase_request)

    def get_document_verification_status(self, obj):
        res = compute_document_verification(obj.purchase_request)
        return res['status']

    def get_quotations(self, obj):
        pr = obj.purchase_request
        doc_verif = compute_document_verification(pr)
        pos = []
        if pr and hasattr(pr, '_prefetched_objects_cache') and 'purchase_orders' in pr._prefetched_objects_cache:
            pos = pr._prefetched_objects_cache['purchase_orders']

        quotes = obj.quotations.all() if hasattr(obj, 'quotations') else []
        results = []
        for q in quotes:
            # Match PO
            po = None
            for p in pos:
                if (p.quotation_id and p.quotation_id == q.id) or (p.vendor_id and p.vendor_id == q.vendor_id):
                    po = p
                    break
            
            po_detail = None
            gr_detail = None
            if po:
                po_detail = {
                    'id': po.id,
                    'po_id': po.po_id,
                    'status': po.status,
                    'total_amount': float(po.total_amount) if po.total_amount is not None else 0.0,
                    'order_date': str(po.order_date) if po.order_date else None,
                    'expected_delivery': str(po.expected_delivery) if po.expected_delivery else None,
                }
                grs = []
                if hasattr(po, '_prefetched_objects_cache') and 'goods_receipts' in po._prefetched_objects_cache:
                    grs = po._prefetched_objects_cache['goods_receipts']
                if grs:
                    gr = grs[0]
                    gr_detail = {
                        'id': gr.id,
                        'receipt_id': gr.receipt_id,
                        'status': gr.status,
                        'delivery_date': str(gr.delivery_date) if gr.delivery_date else None,
                        'received_quantity': gr.received_quantity,
                        'created_at': str(gr.created_at.date()) if gr.created_at else None,
                    }

            base_price = float(q.price) if q.price is not None else 0.0
            gst_pct = float(q.gst_rate) if (q.gst_rate is not None and float(q.gst_rate) > 0) else 18.0
            tax_amt = float(q.tax_amount) if q.tax_amount is not None else round(base_price * (gst_pct / 100.0), 2)
            total_amt = float(q.total_amount) if q.total_amount is not None else round(base_price + tax_amt, 2)
            qty = pr.quantity if (pr and pr.quantity) else 15
            unit_rate = round(base_price / max(qty, 1), 2)
            unit_landed = round(total_amt / max(qty, 1), 2)
            valid_until = str(q.valid_until) if q.valid_until else (str(obj.deadline) if obj.deadline else None)

            q_data = {
                'id': q.id,
                'quotation_id': q.quotation_id,
                'rfq': obj.id,
                'rfq_id': obj.rfq_id,
                'rfq_title': obj.title or (pr.title if pr else 'Procurement RFQ'),
                'request_id': pr.request_id if pr else None,
                'quantity': qty,
                'category': pr.category if pr else 'IT Hardware',
                'subcategory': pr.subcategory if pr else 'Laptops',
                'required_by': str(pr.required_by) if (pr and pr.required_by) else None,
                'total_estimated_cost': float(pr.total_estimated_cost) if (pr and pr.total_estimated_cost) else 0.0,
                'delivery_location': pr.delivery_location if pr else 'HQ',
                'rfq_deadline': str(obj.deadline) if obj.deadline else None,
                'vendor': q.vendor_id,
                'vendor_detail': VendorSerializer(q.vendor).data if q.vendor else None,
                'price': base_price,
                'base_amount': base_price,
                'baseAmount': base_price,
                'gst_rate': gst_pct,
                'gstPercent': gst_pct,
                'tax_amount': tax_amt,
                'taxAmount': tax_amt,
                'gst_amount': tax_amt,
                'gstAmount': tax_amt,
                'total_amount': total_amt,
                'totalAmount': total_amt,
                'unit_price': unit_rate,
                'unitPrice': unit_rate,
                'unit_landed_price': unit_landed,
                'unitLandedPrice': unit_landed,
                'delivery_days': q.delivery_days,
                'warranty_months': q.warranty_months,
                'valid_until': valid_until,
                'validUntil': valid_until,
                'status': q.status,
                'terms_conditions': q.terms_conditions,
                'document_verification': doc_verif,
                'document_verification_status': doc_verif['status'],
                'purchase_order_detail': po_detail,
                'goods_receipt_detail': gr_detail,
                'extra_fields': q.extra_fields,
                'created_at': q.created_at.isoformat() if q.created_at else None,
                'updated_at': q.updated_at.isoformat() if q.updated_at else None,
            }
            extra = q.extra_fields or {}
            if isinstance(extra, dict):
                for k, v in extra.items():
                    q_data[k] = v
                    camel_k = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(k.split('_')))
                    q_data[camel_k] = v
            results.append(q_data)
        return results


v_obj = resolve_vendor_helper('VND-HW-001')

print("--- Testing Fast RFQ Serializer & Queryset ---")
reset_queries()
t0 = time.time()

v_val = 'VND-HW-001'
filter_q = (
    Q(invited_vendors=v_obj) |
    Q(invited_vendors__id=v_obj.id) |
    Q(invited_vendors__unique_vendor_id__iexact=v_obj.unique_vendor_id) |
    Q(invited_vendors__name__iexact=v_obj.name) |
    Q(invited_vendors__unique_vendor_id__icontains=v_val) |
    Q(invited_vendors__name__icontains=v_val)
)
if v_obj.category:
    filter_q |= Q(purchase_request__category__iexact=v_obj.category.name)

qs = RFQ.objects.select_related(
    'purchase_request',
    'purchase_request__created_by',
    'purchase_request__created_by__department',
    'purchase_request__department'
).prefetch_related(
    Prefetch(
        'invited_vendors',
        queryset=v_obj.__class__.objects.select_related('category', 'user', 'user__department')
    ),
    Prefetch(
        'purchase_request__purchase_orders',
        queryset=PurchaseOrder.objects.prefetch_related('invoices', 'goods_receipts')
    ),
    Prefetch(
        'quotations',
        queryset=Quotation.objects.select_related(
            'vendor',
            'vendor__category',
            'vendor__user',
            'vendor__user__department'
        )
    )
).filter(filter_q).distinct().order_by('-created_at')[:20]

data = FastRFQSerializer(list(qs), many=True).data
t1 = time.time()
print(f"Elapsed: {(t1-t0)*1000:.2f}ms, Query count: {len(connection.queries)}")
for i, q in enumerate(connection.queries):
    print(f"[{i+1}] ({float(q['time'])*1000:.1f}ms): {q['sql'][:120]}")
