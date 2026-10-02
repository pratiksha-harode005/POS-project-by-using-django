import os
import sys
import django
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient
from apps.users.models import User

client = APIClient()

endpoints_to_audit = [
    # 1. Team Lead / Requester Endpoints
    ('/api/requests/', 'Purchase Requests (All)'),
    ('/api/requests/?my_requests=true', 'My Requests (Requester)'),
    ('/api/requests/?status=Pending', 'Pending Requests'),
    
    # 2. RFQ & Quotations
    ('/api/rfq/', 'RFQs (All)'),
    ('/api/rfq/?vendor=VND-HW-001', 'RFQs (Dell)'),
    ('/api/rfq/quotations/', 'Quotations (All)'),
    ('/api/rfq/quotations/?vendor=VND-HW-001', 'Quotations (Dell)'),
    
    # 3. Procurement (POs & Goods Receipts)
    ('/api/procurement/purchase-orders/', 'Purchase Orders (All)'),
    ('/api/procurement/purchase-orders/?vendor=VND-HW-001', 'Purchase Orders (Dell)'),
    ('/api/procurement/goods-receipts/', 'Goods Receipts (All)'),
    ('/api/procurement/goods-receipts/?vendor=VND-HW-001', 'Goods Receipts (Dell)'),
    
    # 4. Invoices & Payments
    ('/api/invoices/', 'Invoices (All)'),
    ('/api/invoices/?vendor=VND-HW-001', 'Invoices (Dell)'),
    ('/api/payments/', 'Payments (All)'),
    ('/api/payments/?vendor=VND-HW-001', 'Payments (Dell)'),
    
    # 5. Budget & Vendors & Notifications
    ('/api/budget/allocations/', 'Budget Allocations'),
    ('/api/vendors/', 'Vendors List'),
    ('/api/notifications/', 'Notifications'),
]

print("=" * 95)
print(f"{'Endpoint / Flow':<38} | {'Status':<6} | {'API Time (ms)':<14} | {'DB Time (ms)':<12} | {'Queries':<7} | {'Size (KB)'}")
print("=" * 95)

for url, label in endpoints_to_audit:
    reset_queries()
    t0 = time.time()
    resp = client.get(url)
    t1 = time.time()
    total_time_ms = (t1 - t0) * 1000
    queries = connection.queries
    db_time_ms = sum(float(q.get('time', 0)) for q in queries) * 1000
    size_kb = len(resp.content) / 1024.0
    print(f"{label:<38} | {resp.status_code:<6} | {total_time_ms:>12.2f} ms | {db_time_ms:>10.2f} ms | {len(queries):>7} | {size_kb:>7.1f} KB")

print("=" * 95)
