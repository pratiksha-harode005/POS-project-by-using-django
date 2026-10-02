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
from apps.rfq_management.serializers import QuotationSerializer
from apps.core.utils import resolve_vendor_helper
from django.db.models import Q, Prefetch

v_obj = resolve_vendor_helper('VND-HW-001')

print("--- Testing Unified Prefetched Quotation queryset ---")
reset_queries()
t0 = time.time()

pr_po_prefetch = Prefetch(
    'rfq__purchase_request__purchase_orders',
    queryset=PurchaseOrder.objects.prefetch_related('goods_receipts', 'invoices')
)

qs = Quotation.objects.filter(
    Q(vendor=v_obj) | Q(vendor__unique_vendor_id__iexact='VND-HW-001')
).select_related(
    'vendor',
    'vendor__category',
    'vendor__user',
    'vendor__user__department',
    'rfq',
    'rfq__purchase_request',
    'rfq__purchase_request__department',
    'rfq__purchase_request__created_by'
).prefetch_related(
    pr_po_prefetch
).order_by('-created_at')[:20]

data = QuotationSerializer(list(qs), many=True).data
t1 = time.time()
print(f"Elapsed: {(t1-t0)*1000:.2f}ms, Query count: {len(connection.queries)}")
for i, q in enumerate(connection.queries):
    print(f"[{i+1}] ({float(q['time'])*1000:.1f}ms): {q['sql'][:120]}")
