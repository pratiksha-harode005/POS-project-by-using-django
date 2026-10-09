import os, sys, django, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.db import connection, reset_queries
from apps.request_management.views import get_base_purchase_request_queryset
from apps.request_management.serializers import PurchaseRequestSerializer
from apps.procurement.views import PurchaseOrderViewSet
from apps.procurement.models import PurchaseOrder
from apps.procurement.serializers import PurchaseOrderSerializer
from rest_framework.test import APIRequestFactory, force_authenticate
from apps.users.models import User

mgr = User.objects.filter(role='MANAGER').first()

print("--- 1. PurchaseRequest Queries ---")
qs = get_base_purchase_request_queryset().exclude(status="DRAFT").exclude(current_stage=0)
reset_queries()
t0 = time.time()
data = PurchaseRequestSerializer(qs, many=True).data
t1 = time.time()
print(f"Total queries: {len(connection.queries)} in {(t1-t0)*1000:.1f}ms")
tables = {}
for q in connection.queries:
    sql = q["sql"]
    if 'FROM "' in sql:
        tbl = sql.split('FROM "')[1].split('"')[0]
    else:
        tbl = 'other'
    tables[tbl] = tables.get(tbl, 0) + 1
for k, v in sorted(tables.items(), key=lambda x: -x[1]):
    print(f"  {k:45s}: {v}")

print("\n--- 2. PurchaseOrder Queries ---")
reset_queries()
t0 = time.time()
factory = APIRequestFactory()
req = factory.get('/api/procurement/purchase-orders/', {'page_size': 1000})
force_authenticate(req, user=mgr)
view = PurchaseOrderViewSet.as_view({'get': 'list'})
res = view(req)
t1 = time.time()
print(f"Total PO queries: {len(connection.queries)} in {(t1-t0)*1000:.1f}ms")
tables = {}
for q in connection.queries:
    sql = q["sql"]
    if 'FROM "' in sql:
        tbl = sql.split('FROM "')[1].split('"')[0]
    else:
        tbl = 'other'
    tables[tbl] = tables.get(tbl, 0) + 1
for k, v in sorted(tables.items(), key=lambda x: -x[1]):
    print(f"  {k:45s}: {v}")
