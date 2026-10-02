import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.payment_management.models import Payment
from apps.invoice_management.models import Invoice

print(f"Total PurchaseRequests in DB: {PurchaseRequest.objects.count()}")

all_reqs = list(PurchaseRequest.objects.all().order_by('-created_at'))
for i, r in enumerate(all_reqs):
    # Print safe string (avoid unicode encode errors on windows console)
    safe_title = r.title.encode('ascii', 'replace').decode('ascii')
    print(f"[{i+1}] ID: {r.request_id} | Title: {safe_title} | Status: {r.status} | Stage: {r.current_stage}")
