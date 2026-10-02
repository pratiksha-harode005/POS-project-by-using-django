import os
import sys
import django
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient
from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder
from apps.rfq_management.models import RFQ
from apps.request_management.serializers import PurchaseRequestSerializer
from django.db.models import Prefetch

print("--- Testing Optimized PurchaseRequest Queryset ---")
reset_queries()
t0 = time.time()

qs = PurchaseRequest.objects.select_related(
    'created_by',
    'created_by__department',
    'department'
).prefetch_related(
    Prefetch(
        'approval_steps',
        queryset=ApprovalStep.objects.select_related('actor', 'actor__department', 'reason')
    ),
    Prefetch(
        'purchase_orders',
        queryset=PurchaseOrder.objects.select_related('vendor').prefetch_related('goods_receipts')
    ),
    'rfqs'
).all().order_by('-created_at')[:20]

data = PurchaseRequestSerializer(list(qs), many=True).data
t1 = time.time()
print(f"Elapsed: {(t1-t0)*1000:.2f}ms, Query count: {len(connection.queries)}")
for i, q in enumerate(connection.queries):
    print(f"[{i+1}] ({float(q['time'])*1000:.1f}ms): {q['sql'][:120]}")
