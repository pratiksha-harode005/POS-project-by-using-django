import os
import django
import time

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient

client = APIClient()

endpoints = [
    ('/api/rfq/?vendor=VND-HW-001', 'RFQ list (vendor=VND-HW-001)'),
    ('/api/rfq/quotations/?vendor=VND-HW-001', 'Quotations (vendor=VND-HW-001)'),
    ('/api/procurement/purchase-orders/?vendor=VND-HW-001', 'POs (vendor=VND-HW-001)'),
    ('/api/invoices/?vendor=VND-HW-001', 'Invoices (vendor=VND-HW-001)'),
    ('/api/procurement/goods-receipts/?vendor=VND-HW-001', 'GRs (vendor=VND-HW-001)')
]

for url, label in endpoints:
    reset_queries()
    t0 = time.time()
    resp = client.get(url)
    t1 = time.time()
    queries = connection.queries
    total_db_time = sum(float(q.get('time', 0)) for q in queries) * 1000
    print(f"=== {label} ===")
    print(f"Status: {resp.status_code}, Elapsed: {(t1-t0)*1000:.2f}ms, DB Time: {total_db_time:.2f}ms, Query count: {len(queries)}")
    for i, q in enumerate(queries):
        sql_summary = q['sql'].replace('"', '')[:140]
        print(f"  [{i+1}] ({float(q['time'])*1000:.1f}ms): {sql_summary}...")
    print("-" * 60)
