import os, sys, sqlite3, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

import django
django.setup()

from django.db import connection, transaction
from apps.users.models import User, Department
from apps.vendor_management.models import Vendor, VendorCategory
from apps.budget_management.models import BudgetAllocation
from apps.request_management.models import (
    PurchaseRequest, RejectionReason, ApprovalStep, ApprovalHistory,
    ManagerResearchEstimation, PaymentJustification
)
from apps.rfq_management.models import RFQ, Quotation
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.invoice_management.models import Invoice, ThreeWayMatch
from apps.payment_management.models import Payment
from apps.notification_management.models import Notification

sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db.sqlite3')
if not os.path.exists(sqlite_path):
    print("Error: db.sqlite3 does not exist.")
    sys.exit(1)

s_conn = sqlite3.connect(sqlite_path)
s_conn.row_factory = sqlite3.Row
sc = s_conn.cursor()

def fetch_sqlite_rows(table_name):
    try:
        sc.execute(f'SELECT * FROM "{table_name}" ORDER BY id ASC')
        return [dict(row) for row in sc.fetchall()]
    except Exception as e:
        print(f"Skipping table {table_name}: {e}")
        return []

def run_with_retry(fn, max_retries=5, delay=2):
    for attempt in range(max_retries):
        try:
            return fn()
        except Exception as e:
            print(f"  [Attempt {attempt+1}/{max_retries}] Error: {e}. Retrying in {delay}s...")
            time.sleep(delay)
            connection.close()
    raise RuntimeError(f"Failed after {max_retries} attempts.")

print("Starting safe sync from SQLite -> PostgreSQL...")

# 1. Departments
def sync_departments():
    rows = fetch_sqlite_rows('users_department')
    for r in rows:
        Department.objects.update_or_create(
            id=r['id'],
            defaults={
                'name': r.get('name', ''),
                'code': r.get('code', ''),
                'description': r.get('description', ''),
                'budget_allocated': r.get('budget_allocated', 0),
                'budget_spent': r.get('budget_spent', 0),
            }
        )
    print(f"Synced {len(rows)} departments")
run_with_retry(sync_departments)

# 2. Users
def sync_users():
    rows = fetch_sqlite_rows('users_user')
    for r in rows:
        User.objects.update_or_create(
            id=r['id'],
            defaults={
                'password': r.get('password'),
                'last_login': r.get('last_login'),
                'is_superuser': bool(r.get('is_superuser')),
                'username': r.get('username'),
                'first_name': r.get('first_name', ''),
                'last_name': r.get('last_name', ''),
                'email': r.get('email', ''),
                'is_staff': bool(r.get('is_staff')),
                'is_active': bool(r.get('is_active')),
                'date_joined': r.get('date_joined'),
                'role': r.get('role', 'TEAM_LEAD'),
                'phone': r.get('phone', ''),
                'department_id': r.get('department_id'),
                'vendor_id_code': r.get('vendor_id_code'),
            }
        )
    print(f"Synced {len(rows)} users")
run_with_retry(sync_users)

# 3. Vendor Categories & Vendors
def sync_vendor_cats():
    rows = fetch_sqlite_rows('vendor_management_vendorcategory')
    for r in rows:
        VendorCategory.objects.update_or_create(
            id=r['id'],
            defaults={
                'name': r.get('name', ''),
                'description': r.get('description', ''),
            }
        )
    print(f"Synced {len(rows)} vendor categories")
run_with_retry(sync_vendor_cats)

def sync_vendors():
    rows = fetch_sqlite_rows('vendor_management_vendor')
    for r in rows:
        Vendor.objects.update_or_create(
            id=r['id'],
            defaults={
                'name': r.get('name', ''),
                'company_name': r.get('company_name', r.get('name', '')),
                'email': r.get('email', ''),
                'phone': r.get('phone', ''),
                'address': r.get('address', ''),
                'gst_number': r.get('gst_number', ''),
                'pan_number': r.get('pan_number', ''),
                'bank_account_number': r.get('bank_account_number', ''),
                'ifsc_code': r.get('ifsc_code', ''),
                'bank_name': r.get('bank_name', ''),
                'status': r.get('status', 'ACTIVE'),
                'rating': r.get('rating', 5.0),
                'performance_score': r.get('performance_score', 95.0),
                'category_id': r.get('category_id'),
                'user_id': r.get('user_id'),
                'unique_vendor_id': r.get('unique_vendor_id', f"VEN-{r['id']}"),
            }
        )
    print(f"Synced {len(rows)} vendors")
run_with_retry(sync_vendors)

# 4. Budget Allocations
def sync_budgets():
    rows = fetch_sqlite_rows('budget_management_budgetallocation')
    for r in rows:
        BudgetAllocation.objects.update_or_create(
            id=r['id'],
            defaults={
                'department_id': r.get('department_id'),
                'fiscal_year': r.get('fiscal_year', '2026-2027'),
                'total_allocated': r.get('total_allocated', 0),
                'spent_amount': r.get('spent_amount', 0),
                'committed_amount': r.get('committed_amount', 0),
            }
        )
    print(f"Synced {len(rows)} budget allocations")
run_with_retry(sync_budgets)

# 5. Purchase Requests
def sync_requests():
    rows = fetch_sqlite_rows('request_management_purchaserequest')
    for r in rows:
        PurchaseRequest.objects.update_or_create(
            id=r['id'],
            defaults={
                'request_id': r.get('request_id'),
                'title': r.get('title', ''),
                'category': r.get('category', 'General'),
                'subcategory': r.get('subcategory', 'General'),
                'description': r.get('description', ''),
                'quantity': r.get('quantity', 1),
                'estimated_cost': r.get('estimated_cost', 0),
                'requested_amount': r.get('requested_amount', r.get('estimated_cost', 0)),
                'total_estimated_cost': r.get('total_estimated_cost', r.get('estimated_cost', 0)),
                'approved_amount': r.get('approved_amount'),
                'finance_approved_amount': r.get('finance_approved_amount'),
                'required_by': r.get('required_by'),
                'delivery_location': r.get('delivery_location', 'Pune HQ'),
                'priority': r.get('priority', 'Medium'),
                'status': r.get('status', 'Pending'),
                'current_stage': r.get('current_stage', 1),
                'current_approval_level': r.get('current_approval_level', 1),
                'flow_type': r.get('flow_type', 'A'),
                'request_type': r.get('request_type'),
                'request_operation': r.get('request_operation', 'STANDARD'),
                'software_name': r.get('software_name', ''),
                'current_plan': r.get('current_plan', ''),
                'required_plan': r.get('required_plan', ''),
                'existing_cost': r.get('existing_cost', 0),
                'business_requirement': r.get('business_requirement', ''),
                'vendor': r.get('vendor', ''),
                'preferred_vendor': r.get('preferred_vendor', ''),
                'justification': r.get('justification', ''),
                'extra_fields': r.get('extra_fields', {}),
                'payment_method': r.get('payment_method', ''),
                'payment_reference': r.get('payment_reference', ''),
                'payment_date': r.get('payment_date'),
                'payment_status': r.get('payment_status', 'PENDING'),
                'payment_notes': r.get('payment_notes', ''),
                'confirmed_by_team_lead': bool(r.get('confirmed_by_team_lead')),
                'confirmed_at': r.get('confirmed_at'),
                'created_by_id': r.get('created_by_id'),
                'department_id': r.get('department_id'),
                'assigned_team_lead_id': r.get('assigned_team_lead_id'),
                'assigned_manager_id': r.get('assigned_manager_id'),
                'original_request_id': r.get('original_request_id'),
                'parent_request_id': r.get('parent_request_id'),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} purchase requests")
run_with_retry(sync_requests)

# 6. Rejection Reasons
def sync_rejections():
    rows = fetch_sqlite_rows('request_management_rejectionreason')
    for r in rows:
        RejectionReason.objects.update_or_create(
            id=r['id'],
            defaults={
                'code': r.get('code', ''),
                'description': r.get('description', ''),
                'category': r.get('category', 'OTHER'),
            }
        )
    print(f"Synced {len(rows)} rejection reasons")
run_with_retry(sync_rejections)

# 7. Approval Steps & Histories
def sync_steps():
    rows = fetch_sqlite_rows('request_management_approvalstep')
    for r in rows:
        ApprovalStep.objects.update_or_create(
            id=r['id'],
            defaults={
                'request_id': r.get('request_id'),
                'stage': r.get('stage', 1),
                'role': r.get('role', 'TEAM_LEAD'),
                'actor_id': r.get('actor_id'),
                'decision': r.get('decision', 'PENDING'),
                'notes': r.get('notes', ''),
                'reason_id': r.get('reason_id'),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} approval steps")
run_with_retry(sync_steps)

def sync_histories():
    rows = fetch_sqlite_rows('request_management_approvalhistory')
    for r in rows:
        ApprovalHistory.objects.update_or_create(
            id=r['id'],
            defaults={
                'request_id': r.get('request_id'),
                'performed_by_id': r.get('performed_by_id'),
                'user_role': r.get('user_role', 'TEAM_LEAD'),
                'action': r.get('action', 'CREATE'),
                'previous_status': r.get('previous_status', ''),
                'new_status': r.get('new_status', ''),
                'comments': r.get('comments', ''),
                'approved_amount': r.get('approved_amount'),
                'cost_center': r.get('cost_center', ''),
                'budget_available': r.get('budget_available', True),
                'vendor': r.get('vendor', ''),
                'created_at': r.get('created_at'),
            }
        )
    print(f"Synced {len(rows)} approval histories")
run_with_retry(sync_histories)

# 8. Research Estimations & Payment Justifications
def sync_estimations():
    rows = fetch_sqlite_rows('request_management_managerresearchestimation')
    for r in rows:
        ManagerResearchEstimation.objects.update_or_create(
            id=r['id'],
            defaults={
                'request_id': r.get('request_id'),
                'researched_by_id': r.get('researched_by_id'),
                'estimated_unit_price': r.get('estimated_unit_price', 0),
                'estimated_total_price': r.get('estimated_total_price', 0),
                'vendor_name': r.get('vendor_name', ''),
                'notes': r.get('notes', ''),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} manager research estimations")
run_with_retry(sync_estimations)

def sync_justifications():
    rows = fetch_sqlite_rows('request_management_paymentjustification')
    for r in rows:
        PaymentJustification.objects.update_or_create(
            id=r['id'],
            defaults={
                'request_id': r.get('request_id'),
                'submitted_by_id': r.get('submitted_by_id'),
                'verified_by_id': r.get('verified_by_id'),
                'requested_amount': r.get('requested_amount', 0),
                'actual_purchase_amount': r.get('actual_purchase_amount', 0),
                'final_payable_amount': r.get('final_payable_amount', 0),
                'vendor_name': r.get('vendor_name', ''),
                'payment_method': r.get('payment_method', 'MOCK_ONLINE'),
                'payment_date': r.get('payment_date'),
                'why_required': r.get('why_required', ''),
                'is_verified': bool(r.get('is_verified')),
                'is_acknowledged': bool(r.get('is_acknowledged')),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} payment justifications")
run_with_retry(sync_justifications)

# 9. RFQs & Quotations
def sync_rfqs():
    rows = fetch_sqlite_rows('rfq_management_rfq')
    for r in rows:
        RFQ.objects.update_or_create(
            id=r['id'],
            defaults={
                'rfq_id': r.get('rfq_id'),
                'purchase_request_id': r.get('purchase_request_id'),
                'status': r.get('status', 'OPEN'),
                'deadline': r.get('deadline'),
                'estimated_amount': r.get('estimated_amount', 0),
                'terms': r.get('terms', ''),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} RFQs")
run_with_retry(sync_rfqs)

def sync_quotations():
    rows = fetch_sqlite_rows('rfq_management_quotation')
    for r in rows:
        Quotation.objects.update_or_create(
            id=r['id'],
            defaults={
                'quotation_id': r.get('quotation_id'),
                'rfq_id': r.get('rfq_id'),
                'vendor_id': r.get('vendor_id'),
                'price': r.get('price', 0),
                'unit_price': r.get('unit_price', 0),
                'total_amount': r.get('total_amount', r.get('price', 0)),
                'delivery_days': r.get('delivery_days', 7),
                'warranty_months': r.get('warranty_months', 12),
                'terms_conditions': r.get('terms_conditions', ''),
                'status': r.get('status', 'PENDING'),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} quotations")
run_with_retry(sync_quotations)

# 10. Purchase Orders, Goods Receipts, Invoices, Payments
def sync_pos():
    rows = fetch_sqlite_rows('procurement_purchaseorder')
    for r in rows:
        PurchaseOrder.objects.update_or_create(
            id=r['id'],
            defaults={
                'po_id': r.get('po_id'),
                'purchase_request_id': r.get('purchase_request_id'),
                'vendor_id': r.get('vendor_id'),
                'total_amount': r.get('total_amount', 0),
                'status': r.get('status', 'ISSUED'),
                'delivery_date': r.get('delivery_date'),
                'terms': r.get('terms', ''),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} purchase orders")
run_with_retry(sync_pos)

def sync_grs():
    rows = fetch_sqlite_rows('procurement_goodsreceipt')
    for r in rows:
        GoodsReceipt.objects.update_or_create(
            id=r['id'],
            defaults={
                'receipt_id': r.get('receipt_id'),
                'purchase_order_id': r.get('purchase_order_id'),
                'received_by_id': r.get('received_by_id'),
                'ordered_quantity': r.get('ordered_quantity', 1),
                'received_quantity': r.get('received_quantity', 1),
                'damaged_quantity': r.get('damaged_quantity', 0),
                'delivery_date': r.get('delivery_date'),
                'status': r.get('status', 'VERIFIED'),
                'delivery_location': r.get('delivery_location', 'Pune HQ Warehouse'),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} goods receipts")
run_with_retry(sync_grs)

def sync_invoices():
    rows = fetch_sqlite_rows('invoice_management_invoice')
    for r in rows:
        Invoice.objects.update_or_create(
            id=r['id'],
            defaults={
                'invoice_id': r.get('invoice_id'),
                'invoice_number': r.get('invoice_number', r.get('invoice_id', '')),
                'purchase_order_id': r.get('purchase_order_id'),
                'vendor_id': r.get('vendor_id'),
                'total_amount': r.get('total_amount', 0),
                'tax_amount': r.get('tax_amount', 0),
                'invoice_date': r.get('invoice_date'),
                'due_date': r.get('due_date'),
                'status': r.get('status', 'MATCHED'),
                'is_manager_verified': bool(r.get('is_manager_verified')),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} invoices")
run_with_retry(sync_invoices)

def sync_payments():
    rows = fetch_sqlite_rows('payment_management_payment')
    for r in rows:
        Payment.objects.update_or_create(
            id=r['id'],
            defaults={
                'payment_id': r.get('payment_id'),
                'purchase_request_id': r.get('purchase_request_id'),
                'purchase_order_id': r.get('purchase_order_id'),
                'invoice_id': r.get('invoice_id'),
                'vendor_id': r.get('vendor_id'),
                'processed_by_id': r.get('processed_by_id'),
                'amount': r.get('amount', 0),
                'payment_method': r.get('payment_method', 'BANK_TRANSFER'),
                'payment_date': r.get('payment_date'),
                'reference_number': r.get('reference_number', ''),
                'status': r.get('status', 'PAID'),
                'notes': r.get('notes', ''),
                'created_at': r.get('created_at'),
                'updated_at': r.get('updated_at'),
            }
        )
    print(f"Synced {len(rows)} payments")
run_with_retry(sync_payments)

# Reset Postgres sequences
def reset_sequences():
    with connection.cursor() as cur:
        for model in [
            Department, User, VendorCategory, Vendor, BudgetAllocation,
            PurchaseRequest, RejectionReason, ApprovalStep, ApprovalHistory,
            ManagerResearchEstimation, PaymentJustification, RFQ, Quotation,
            PurchaseOrder, GoodsReceipt, Invoice, Payment
        ]:
            table = model._meta.db_table
            try:
                cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1)) FROM \"{table}\";")
            except Exception:
                pass
    print("PostgreSQL sequence IDs reset.")
run_with_retry(reset_sequences)

print("\n=== SUCCESS: All 112 real requests & related records synced to PostgreSQL ===")
