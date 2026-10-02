import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.rfq_management.models import RFQ, Quotation
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.payment_management.models import Payment
from apps.invoice_management.models import Invoice
from apps.request_management.models import PurchaseRequest, ApprovalStep
from django.db.models import Q

target_ids = [23, 8, 18, 20, 21, 9, 10, 12]

print("=== DEEP DEPENDENCY & LIFECYCLE AUDIT FOR THE 8 CANDIDATE RECORDS ===\n")

for pk in target_ids:
    q = Quotation.objects.filter(id=pk).first()
    if not q:
        print(f"PK {pk}: Not found")
        continue
    
    rfq = q.rfq
    pr = rfq.purchase_request if rfq else None
    vendor = q.vendor
    
    # Check directly linked Purchase Orders to this Quotation
    direct_pos = list(PurchaseOrder.objects.filter(quotation=q))
    pr_pos = list(PurchaseOrder.objects.filter(purchase_request=pr)) if pr else []
    
    # Check related Invoices
    all_pos = list(set(direct_pos + pr_pos))
    invoices = list(Invoice.objects.filter(purchase_order__in=all_pos))
    
    # Check related Payments
    payments_pr = list(Payment.objects.filter(purchase_request=pr)) if pr else []
    payments_inv = list(Payment.objects.filter(invoice__in=invoices)) if invoices else []
    all_payments = list(set(payments_pr + payments_inv))
    
    # Check Approval Steps on the PR
    steps = list(ApprovalStep.objects.filter(request=pr)) if pr else []
    
    print("-" * 80)
    print(f"RECORD: {q.quotation_id} (PK: {q.id})")
    print(f"  Created At: {q.created_at}")
    print(f"  Vendor: {vendor.name} ({vendor.unique_vendor_id}) | Price: Rs. {q.price:,.2f} | Status: {q.status}")
    print(f"  RFQ: {rfq.rfq_id} (PK: {rfq.id}) | Title: '{rfq.title}' | RFQ Status: {rfq.status}")
    print(f"  Purchase Request: {pr.request_id if pr else None} (PK: {pr.id if pr else None}) | Title: '{pr.title if pr else None}' | Stage: {pr.current_stage if pr else None}")
    print(f"  PR Approval Steps Count: {len(steps)}")
    print(f"  Direct POs referencing this exact Quotation: {[p.po_id for p in direct_pos]}")
    print(f"  POs referencing this PR: {[p.po_id for p in pr_pos]}")
    print(f"  Related Invoices: {[inv.invoice_number for inv in invoices]}")
    print(f"  Related Payments: {[p.payment_id for p in all_payments]}")
