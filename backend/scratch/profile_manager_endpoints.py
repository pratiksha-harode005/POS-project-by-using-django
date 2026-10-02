import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
import django
django.setup()

from django.db import connection, reset_queries
from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.request_management.views import PurchaseRequestViewSet
from apps.budget_management.views import BudgetAllocationViewSet
from apps.rfq_management.views import RFQViewSet, QuotationViewSet
from apps.vendor_management.views import VendorViewSet
from apps.procurement.views import PurchaseOrderViewSet, GoodsReceiptViewSet
from apps.invoice_management.views import InvoiceViewSet
from apps.payment_management.views import PaymentViewSet

User = get_user_model()
manager_user = User.objects.filter(role='MANAGER').first() or User.objects.first()
factory = APIRequestFactory()

endpoints = [
    ('GET /api/requests/?page_size=1000', PurchaseRequestViewSet.as_view({'get': 'list'}), '/api/requests/?page_size=1000'),
    ('GET /api/budgets/allocations/', BudgetAllocationViewSet.as_view({'get': 'list'}), '/api/budgets/allocations/'),
    ('GET /api/rfq/?page_size=1000', RFQViewSet.as_view({'get': 'list'}), '/api/rfq/?page_size=1000'),
    ('GET /api/vendors/?page_size=1000', VendorViewSet.as_view({'get': 'list'}), '/api/vendors/?page_size=1000'),
    ('GET /api/procurement/purchase-orders/', PurchaseOrderViewSet.as_view({'get': 'list'}), '/api/procurement/purchase-orders/'),
    ('GET /api/invoices/', InvoiceViewSet.as_view({'get': 'list'}), '/api/invoices/'),
    ('GET /api/payments/', PaymentViewSet.as_view({'get': 'list'}), '/api/payments/'),
    ('GET /api/rfq/quotations/?page_size=1000', QuotationViewSet.as_view({'get': 'list'}), '/api/rfq/quotations/?page_size=1000'),
    ('GET /api/procurement/goods-receipts/?page_size=1000', GoodsReceiptViewSet.as_view({'get': 'list'}), '/api/procurement/goods-receipts/?page_size=1000'),
]

for name, view, url in endpoints:
    reset_queries()
    request = factory.get(url)
    force_authenticate(request, user=manager_user)
    
    start = time.perf_counter()
    response = view(request)
    elapsed_ms = (time.perf_counter() - start) * 1000
    
    q_count = len(connection.queries)
    data = response.data
    data_len = len(data.get('results', data) if isinstance(data, dict) else data)
    print(f"[{response.status_code}] {name:<45} | Time: {elapsed_ms:6.2f}ms | Queries: {q_count:2d} | Items: {data_len:2d}", flush=True)
