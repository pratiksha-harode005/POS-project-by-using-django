import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

import django
django.setup()

from apps.rfq_management.models import Quotation, RFQ
from apps.procurement.models import PurchaseOrder, GoodsReceipt, Contract
from apps.invoice_management.models import Invoice, ThreeWayMatch
from apps.payment_management.models import Payment
from apps.notification_management.models import Notification
from apps.request_management.models import PurchaseRequest, ApprovalStep, ApprovalHistory
from apps.budget_management.models import BudgetAllocation
from apps.users.models import User, Department
from apps.vendor_management.models import Vendor

def purge():
    print("=== STARTING CENTRAL POSTGRESQL PURGE ON RENDER ===")
    
    # 1. Procurement & Finance Transactions
    p_cnt, _ = Payment.objects.all().delete()
    print(f"Purged Payment records: {p_cnt}")

    twm_cnt, _ = ThreeWayMatch.objects.all().delete()
    print(f"Purged ThreeWayMatch records: {twm_cnt}")

    inv_cnt, _ = Invoice.objects.all().delete()
    print(f"Purged Invoice records: {inv_cnt}")

    gr_cnt, _ = GoodsReceipt.objects.all().delete()
    print(f"Purged GoodsReceipt records: {gr_cnt}")

    po_cnt, _ = PurchaseOrder.objects.all().delete()
    print(f"Purged PurchaseOrder records: {po_cnt}")

    c_cnt, _ = Contract.objects.all().delete()
    print(f"Purged Contract records: {c_cnt}")

    # 2. RFQ & Quotations
    q_cnt, _ = Quotation.objects.all().delete()
    print(f"Purged Quotation records: {q_cnt}")

    rfq_cnt, _ = RFQ.objects.all().delete()
    print(f"Purged RFQ records: {rfq_cnt}")

    # 3. Approvals and Notifications
    notif_cnt, _ = Notification.objects.all().delete()
    print(f"Purged Notification records: {notif_cnt}")

    ah_cnt, _ = ApprovalHistory.objects.all().delete()
    print(f"Purged ApprovalHistory records: {ah_cnt}")

    as_cnt, _ = ApprovalStep.objects.all().delete()
    print(f"Purged ApprovalStep records: {as_cnt}")

    # 4. Purchase Requests
    pr_cnt, _ = PurchaseRequest.objects.all().delete()
    print(f"Purged PurchaseRequest records: {pr_cnt}")

    # 5. Reset Budget Allocations to clean initial state
    b_updated = BudgetAllocation.objects.all().update(
        spent_amount=0,
        committed_amount=0
    )
    print(f"Reset {b_updated} BudgetAllocation records (spent=0, committed=0).")

    # 6. Verification
    print("\n=== POST-PURGE VERIFICATION ===")
    print(f"Remaining PurchaseRequests: {PurchaseRequest.objects.count()} (Expected: 0)")
    print(f"Remaining ApprovalSteps: {ApprovalStep.objects.count()} (Expected: 0)")
    print(f"Remaining ApprovalHistories: {ApprovalHistory.objects.count()} (Expected: 0)")
    print(f"Remaining RFQs: {RFQ.objects.count()} (Expected: 0)")
    print(f"Remaining Quotations: {Quotation.objects.count()} (Expected: 0)")
    print(f"Remaining Notifications: {Notification.objects.count()} (Expected: 0)")
    print(f"Remaining PurchaseOrders: {PurchaseOrder.objects.count()} (Expected: 0)")
    print(f"Remaining Invoices: {Invoice.objects.count()} (Expected: 0)")
    print(f"Remaining Payments: {Payment.objects.count()} (Expected: 0)")

    print(f"\nPreserved Users: {User.objects.count()} ({[u.username for u in User.objects.all()]})")
    print(f"Preserved Departments: {Department.objects.count()} ({[d.name for d in Department.objects.all()]})")
    print(f"Preserved Vendors: {Vendor.objects.count()}")

    for b in BudgetAllocation.objects.all():
        print(f"Budget [{b.department.name}]: Allocated=INR {b.total_allocated}, Spent=INR {b.spent_amount}, Committed=INR {b.committed_amount}")

    print("\n>>> CENTRAL POSTGRESQL PURGE COMPLETED SUCCESSFULLY! <<<")

if __name__ == '__main__':
    purge()
