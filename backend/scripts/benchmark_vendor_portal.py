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

vendors = [
    ('VND-HW-001', 'Dell'),
    ('VND-HW-002', 'HP'),
]

endpoints = [
    ('/api/rfq/?vendor={v_id}&page_size=50', 'RFQs'),
    ('/api/rfq/quotations/?vendor={v_id}', 'Quotations'),
    ('/api/procurement/purchase-orders/?vendor={v_id}', 'Purchase Orders'),
    ('/api/invoices/?vendor={v_id}', 'Invoices'),
    ('/api/procurement/goods-receipts/?vendor={v_id}', 'Goods Receipts'),
    ('/api/payments/?vendor={v_id}', 'Payments'),
]

print("=" * 80)
print("VENDOR PORTAL PERFORMANCE & ISOLATION BENCHMARK RESULTS")
print("=" * 80)

for v_id, v_name in vendors:
    print(f"\n>>> VENDOR: {v_name} ({v_id})")
    print(f"{'Endpoint':<20} | {'Status':<6} | {'Total Time':<12} | {'DB Time':<10} | {'Queries':<8} | {'Payload':<10} | {'Items'}")
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
        payload_size_kb = len(resp.content) / 1024.0
        data = resp.json()
        item_count = len(data.get('results', data)) if isinstance(data, dict) and 'results' in data else (len(data) if isinstance(data, list) else 0)
        print(f"{label:<20} | {resp.status_code:<6} | {total_time_ms:>9.2f} ms | {db_time_ms:>7.2f} ms | {len(queries):>7} | {payload_size_kb:>7.1f} KB | {item_count} items")

print("\n" + "=" * 80)
