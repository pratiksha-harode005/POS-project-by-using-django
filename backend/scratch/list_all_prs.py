import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.request_management.models import PurchaseRequest
from apps.payment_management.models import Payment
from apps.procurement.models import PurchaseOrder
from apps.invoice_management.models import Invoice

print("=== ALL 128 REQUESTS IN DB ===")
for r in PurchaseRequest.objects.all().order_by('created_at'):
    safe_title = r.title.encode('ascii', 'replace').decode('ascii')
    print(f"ID:{r.request_id} | Created:{r.created_at.strftime('%Y-%m-%d %H:%M')} | St:{r.status} | Stg:{r.current_stage} | Title:{safe_title}")
