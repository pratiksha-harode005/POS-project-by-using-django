import os
import sys
import django
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient

client = APIClient()

print("=" * 85)
print("FINAL PERFORMANCE & VENDOR ISOLATION VERIFICATION (Dell vs HP)")
print("=" * 85)

vendors = [
    ('VND-HW-001', 'Dell Technologies'),
    ('VND-HW-002', 'HP Enterprise'),
]

endpoints = [
    ('/api/rfq/?vendor={v_id}&page_size=50', 'RFQs List'),
    ('/api/rfq/quotations/?vendor={v_id}', 'Quotations List'),
    ('/api/procurement/purchase-orders/?vendor={v_id}', 'Purchase Orders'),
    ('/api/invoices/?vendor={v_id}', 'Invoices'),
    ('/api/procurement/goods-receipts/?vendor={v_id}', 'Goods Receipts'),
    ('/api/payments/?vendor={v_id}', 'Payments'),
]

for v_id, v_name in vendors:
    print(f"\n--- Testing Vendor: {v_name} [{v_id}] ---")
    print(f"{'Endpoint':<22} | {'Status':<6} | {'Total Time':<12} | {'DB Time':<10} | {'Queries':<8} | {'Items'}")
    print("-" * 80)
    for url_tmpl, label in endpoints:
        url = url_tmpl.format(v_id=v_id)
        reset_queries()
        t0 = time.time()
        resp = client.get(url)
        t1 = time.time()
        total_time_ms = (t1 - t0) * 1000
        queries = connection.queries
        db_time_ms = sum(float(q.get('time', 0)) for q in queries) * 1000
        data = resp.json()
        item_count = len(data.get('results', data)) if isinstance(data, dict) and 'results' in data else (len(data) if isinstance(data, list) else 0)
        print(f"{label:<22} | {resp.status_code:<6} | {total_time_ms:>9.2f} ms | {db_time_ms:>7.2f} ms | {len(queries):>7} | {item_count} items")

print("\n" + "=" * 85)
