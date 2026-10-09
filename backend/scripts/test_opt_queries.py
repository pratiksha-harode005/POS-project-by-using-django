import os, sys, django, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")
django.setup()

from django.db import connection, reset_queries
from django.db.models import Prefetch
from apps.request_management.models import PurchaseRequest, ApprovalStep, ApprovalHistory, PaymentJustification, ManagerResearchEstimation
from apps.request_management.serializers import PurchaseRequestSerializer
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.procurement.serializers import PurchaseOrderSerializer
from apps.rfq_management.models import RFQ, Quotation
from apps.invoice_management.models import Invoice
from apps.payment_management.models import Payment

print("--- Testing Optimized PurchaseRequest Queries ---")
reset_queries()
t0 = time.time()

opt_qs = PurchaseRequest.objects.select_related(
    'created_by', 'created_by__department',
    'department',
    'assigned_team_lead', 'assigned_team_lead__department',
    'assigned_manager', 'assigned_manager__department',
    'payment_justification', 'payment_justification__submitted_by', 'payment_justification__submitted_by__department',
    'payment_justification__verified_by', 'payment_justification__verified_by__department',
    'research_estimation', 'research_estimation__researched_by', 'research_estimation__researched_by__department',
    'original_request', 'original_request__department',
    'original_request__payment_justification',
    'parent_request'
).prefetch_related(
    'approval_steps__actor__department',
    'approval_steps__reason',
    'approval_history__performed_by__department',
    'payments',
    Prefetch('rfqs', queryset=RFQ.objects.prefetch_related('quotations', 'invited_vendors')),
    Prefetch('purchase_orders', queryset=PurchaseOrder.objects.select_related('vendor').prefetch_related('goods_receipts', 'invoices')),
    Prefetch('all_descendants', queryset=PurchaseRequest.objects.only('id', 'request_id', 'status', 'renewal_sequence', 'request_operation', 'original_request_id'))
).exclude(status="DRAFT").exclude(current_stage=0)

data = PurchaseRequestSerializer(opt_qs, many=True).data
t1 = time.time()
print(f"Total queries with full prefetch: {len(connection.queries)} in {(t1-t0)*1000:.1f}ms")
tables = {}
for q in connection.queries:
    sql = q["sql"]
    if 'FROM "' in sql:
        tbl = sql.split('FROM "')[1].split('"')[0]
    else:
        tbl = 'other'
    tables[tbl] = tables.get(tbl, 0) + 1
for i, q in enumerate(connection.queries):
    if 'users_user' in q['sql'] or 'purchaserequest' in q['sql']:
        print(f"Query {i+1}: {q['sql']}")
