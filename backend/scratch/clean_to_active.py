import os, sys, django

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection

# Only keep the user's active current requests
KEEP_IDS = (
    'REQ-D999647A',  # JetBrains IDE Enterprise Renewal Test
    'REQ-D70FC9F1',  # Request for Serversss
)

with connection.cursor() as cursor:
    # Nullify quotation_id on purchase orders to break FK
    cursor.execute("""
        UPDATE procurement_purchaseorder 
        SET quotation_id = NULL 
        WHERE purchase_request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s);
    """, [KEEP_IDS])

    # 1. Clean PO relations
    cursor.execute("""
        DELETE FROM payment_management_payment 
        WHERE purchase_request_id IS NOT NULL AND purchase_request_id NOT IN (
            SELECT id FROM request_management_purchaserequest WHERE request_id IN %s
        );
        DELETE FROM invoice_management_threewaymatch 
        WHERE purchase_order_id IN (
            SELECT id FROM procurement_purchaseorder 
            WHERE purchase_request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s)
        );
        DELETE FROM invoice_management_invoice 
        WHERE purchase_order_id IS NULL OR purchase_order_id NOT IN (
            SELECT id FROM procurement_purchaseorder 
            WHERE purchase_request_id IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s)
        );
        DELETE FROM procurement_goodsreceipt 
        WHERE purchase_order_id IS NULL OR purchase_order_id NOT IN (
            SELECT id FROM procurement_purchaseorder 
            WHERE purchase_request_id IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s)
        );
        DELETE FROM procurement_purchaseorder 
        WHERE purchase_request_id IS NULL OR purchase_request_id NOT IN (
            SELECT id FROM request_management_purchaserequest WHERE request_id IN %s
        );
    """, [KEEP_IDS, KEEP_IDS, KEEP_IDS, KEEP_IDS, KEEP_IDS])

    # 2. Clean RFQ relations
    cursor.execute("""
        DELETE FROM rfq_management_quotation 
        WHERE rfq_id NOT IN (
            SELECT id FROM rfq_management_rfq 
            WHERE purchase_request_id IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s)
        );
        DELETE FROM rfq_management_rfq_invited_vendors 
        WHERE rfq_id NOT IN (
            SELECT id FROM rfq_management_rfq 
            WHERE purchase_request_id IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s)
        );
        DELETE FROM rfq_management_rfq 
        WHERE purchase_request_id IS NULL OR purchase_request_id NOT IN (
            SELECT id FROM request_management_purchaserequest WHERE request_id IN %s
        );
    """, [KEEP_IDS, KEEP_IDS, KEEP_IDS])

    # 3. Clean all request-related tables
    cursor.execute("""
        DELETE FROM notification_management_notification 
        WHERE purchase_request_id IS NOT NULL AND purchase_request_id NOT IN (
            SELECT id FROM request_management_purchaserequest WHERE request_id IN %s
        );
        DELETE FROM request_management_approvalstep 
        WHERE request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s);
        DELETE FROM request_management_approvalhistory 
        WHERE request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s);
        DELETE FROM request_management_managerresearchestimation 
        WHERE request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s);
        DELETE FROM request_management_paymentjustification 
        WHERE request_id NOT IN (SELECT id FROM request_management_purchaserequest WHERE request_id IN %s);
    """, [KEEP_IDS, KEEP_IDS, KEEP_IDS, KEEP_IDS, KEEP_IDS])

    # 4. Break self-referencing FKs in purchaserequest before delete
    cursor.execute("""
        UPDATE request_management_purchaserequest 
        SET original_request_id = NULL, parent_request_id = NULL 
        WHERE request_id NOT IN %s;
    """, [KEEP_IDS])

    # 5. Delete from purchaserequest
    cursor.execute("""
        DELETE FROM request_management_purchaserequest 
        WHERE request_id NOT IN %s;
    """, [KEEP_IDS])

    # 6. Clean orphaned payments
    cursor.execute("""
        DELETE FROM payment_management_payment 
        WHERE purchase_request_id IS NULL AND invoice_id IS NULL;
    """)

print("=== CLEANUP TO ACTIVE REQUESTS COMPLETED ===")

from apps.request_management.models import PurchaseRequest
from apps.payment_management.models import Payment

print(f"Remaining PurchaseRequests: {PurchaseRequest.objects.count()}")
print(f"Remaining Payments: {Payment.objects.count()}")

for r in PurchaseRequest.objects.all().order_by('-created_at'):
    safe_title = r.title.encode('ascii', 'replace').decode('ascii')
    print(f"  -> [{r.request_id}] {safe_title} | Status:{r.status} | Stage:{r.current_stage}")

for p in Payment.objects.all():
    pr = p.purchase_request.request_id if p.purchase_request else 'None'
    print(f"  -> Payment [{p.payment_id}] for Req: {pr} | Amount: {p.amount} | Status: {p.status}")
