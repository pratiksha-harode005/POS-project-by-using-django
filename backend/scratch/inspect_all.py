import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.payment_management.models import Payment
from apps.invoice_management.models import Invoice
from apps.rfq_management.models import RFQ, Quotation
from apps.vendor_management.models import Vendor
from apps.users.models import User

print("=== DATABASE COUNTS ===")
print(f"Users: {User.objects.count()}")
print(f"Vendors: {Vendor.objects.count()}")
print(f"PurchaseRequests: {PurchaseRequest.objects.count()}")
print(f"RFQs: {RFQ.objects.count()}")
print(f"Quotations: {Quotation.objects.count()}")
print(f"PurchaseOrders: {PurchaseOrder.objects.count()}")
print(f"GoodsReceipts: {GoodsReceipt.objects.count()}")
print(f"Invoices: {Invoice.objects.count()}")
print(f"Payments: {Payment.objects.count()}")
print(f"ApprovalSteps: {ApprovalStep.objects.count()}")

print("\n=== RECENT REQUISITIONS (Last 20) ===")
for r in PurchaseRequest.objects.all().order_by('-created_at')[:20]:
    creator = r.created_by.username if r.created_by else 'No user'
    safe_title = r.title.encode('ascii', 'replace').decode('ascii')
    print(f"[{r.request_id}] '{safe_title[:40]}' | St:{r.status} | Stg:{r.current_stage} | Amt:{r.total_estimated_cost} | By:{creator} | Date:{r.created_at.strftime('%Y-%m-%d %H:%M')}")
