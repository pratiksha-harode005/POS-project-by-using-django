import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.request_management.models import PurchaseRequest, ApprovalStep
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.payment_management.models import Payment
from apps.invoice_management.models import Invoice, ThreeWayMatch
from apps.rfq_management.models import RFQ, Quotation
from apps.notification_management.models import Notification

# Identifiers of genuine requests to preserve (today's active requests and clean seeds)
KEEP_IDS = {
    'REQ-D999647A',  # JetBrains IDE Enterprise Renewal Test
    'REQ-D70FC9F1',  # Request for Serversss
    'REQ-90D92AA4',  # Slack Business Plan Subscription
    'REQ-793ED92B',  # Adobe Creative Cloud Subscription
    'REQ-E9DECE52',  # Google Workspace Business License
    'REQ-E37DC5E8',  # Request for Laptoss IT hardware
}

print("=== STARTING DATABASE CLEANUP ===")
all_prs = list(PurchaseRequest.objects.all())
deleted_pr_count = 0

for pr in all_prs:
    if pr.request_id not in KEEP_IDS:
        # Delete related payments
        Payment.objects.filter(purchase_request=pr).delete()
        
        # Delete related invoices, 3-way matches, receipts, POs
        for po in pr.purchase_orders.all():
            Payment.objects.filter(invoice__purchase_order=po).delete()
            ThreeWayMatch.objects.filter(purchase_order=po).delete()
            Invoice.objects.filter(purchase_order=po).delete()
            GoodsReceipt.objects.filter(purchase_order=po).delete()
            po.delete()
        
        # Delete related RFQs & quotations
        for rfq in pr.rfqs.all():
            Quotation.objects.filter(rfq=rfq).delete()
            rfq.delete()
        
        # Delete approval steps
        ApprovalStep.objects.filter(request=pr).delete()
        
        # Delete PR
        pr.delete()
        deleted_pr_count += 1

# Clean up orphaned payments, invoices, POs, RFQs
Payment.objects.filter(purchase_request__isnull=True, invoice__isnull=True).delete()
Invoice.objects.filter(purchase_order__isnull=True).delete()
PurchaseOrder.objects.filter(purchase_request__isnull=True).delete()
RFQ.objects.filter(purchase_request__isnull=True).delete()

print(f"Deleted {deleted_pr_count} old test purchase requests.")
print(f"Remaining PurchaseRequests: {PurchaseRequest.objects.count()}")
print(f"Remaining PurchaseOrders: {PurchaseOrder.objects.count()}")
print(f"Remaining Invoices: {Invoice.objects.count()}")
print(f"Remaining Payments: {Payment.objects.count()}")

print("\n--- REMAINING REQUESTS IN DB ---")
for r in PurchaseRequest.objects.all().order_by('-created_at'):
    safe_title = r.title.encode('ascii', 'replace').decode('ascii')
    print(f"[{r.request_id}] {safe_title} | Status:{r.status} | Stage:{r.current_stage} | Amount:{r.total_estimated_cost}")
