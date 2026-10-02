import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.payment_management.models import Payment
from apps.invoice_management.models import Invoice

print(f"Total PurchaseRequests: {PurchaseRequest.objects.count()}")
print(f"Total PurchaseOrders: {PurchaseOrder.objects.count()}")
print(f"Total Invoices: {Invoice.objects.count()}")
print(f"Total Payments: {Payment.objects.count()}")

print("\n--- ALL PURCHASE REQUESTS ---")
for r in PurchaseRequest.objects.all().order_by('-created_at'):
    print(f"ID: {r.request_id} | Title: {r.title} | Status: {r.status} | Stage: {r.current_stage} | Created: {r.created_at}")

print("\n--- ALL PAYMENTS ---")
for p in Payment.objects.all().order_by('-created_at'):
    req_id = p.purchase_request.request_id if p.purchase_request else "NO_REQ"
    print(f"Payment ID: {p.payment_id} | Req: {req_id} | Amount: {p.amount} | Status: {p.status} | Notes: {p.notes}")
