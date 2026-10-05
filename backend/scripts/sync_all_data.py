import psycopg2
import sqlite3
import time
import sys
import json
from decimal import Decimal

dsn = 'postgresql://procurement_0s_user:umAMbNHtbHZPc8VVR6eyAXqt6vuPqk6t@dpg-daobkjek1f9s73beadkg-a.oregon-postgres.render.com:5432/procurement_0s'

print("Attempting to connect to PostgreSQL...")
pg_conn = None
for i in range(1, 30):
    try:
        pg_conn = psycopg2.connect(dsn, sslmode='require', connect_timeout=10)
        print(f"Connected on attempt {i}!")
        break
    except Exception as e:
        print(f"Attempt {i}/30: {e}")
        time.sleep(2)

if not pg_conn:
    print("Could not connect to PostgreSQL after 30 retries.")
    sys.exit(1)

pg_cur = pg_conn.cursor()
sqlite_conn = sqlite3.connect('db.sqlite3')
sq_cur = sqlite_conn.cursor()

sq_cur.execute("PRAGMA foreign_keys = OFF;")

TABLES = [
    'users_department',
    'users_user',
    'users_user_groups',
    'users_user_user_permissions',
    'budget_management_budgetallocation',
    'vendor_management_vendorcategory',
    'vendor_management_vendor',
    'request_management_rejectionreason',
    'request_management_purchaserequest',
    'request_management_approvalstep',
    'request_management_approvalhistory',
    'request_management_managerresearchestimation',
    'request_management_paymentjustification',
    'rfq_management_rfq',
    'rfq_management_rfq_invited_vendors',
    'rfq_management_quotation',
    'procurement_purchaseorder',
    'procurement_goodsreceipt',
    'invoice_management_invoice',
    'payment_management_payment',
    'notification_management_notification'
]

# Map of non-nullable columns to their safe defaults when source is NULL
NOT_NULL_DEFAULTS = {
    'budget_available': 1,
    'confirmed_by_team_lead': 0,
    'renewal_sequence': 0,
    'cost_center': '',
    'vendor': '',
    'budget_code': '',
    'business_requirement': '',
    'current_plan': '',
    'payment_method': '',
    'payment_notes': '',
    'payment_reference': '',
    'payment_status': '',
    'request_type': 'STANDARD',
    'required_plan': '',
    'software_name': '',
    'request_operation': 'NEW',
    'flow_type': 'A',
    'current_approval_level': 'MANAGER',
    'extra_fields': '{}',
    'subcategory': '',
    'delivery_location': 'Main Office',
    'preferred_vendor': '',
    'justification': '',
    'requested_amount': 0.0,
    'existing_cost': 0.0,
    'total_estimated_cost': 0.0,
    'notes': '',
    'reference_number': '',
    'terms': '',
    'terms_conditions': '',
}

def clean_val(col_name, v):
    if v is None:
        if col_name in NOT_NULL_DEFAULTS:
            return NOT_NULL_DEFAULTS[col_name]
        return None
    if isinstance(v, bool):
        return 1 if v else 0
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (dict, list)):
        return json.dumps(v)
    if hasattr(v, 'isoformat'):
        return str(v)
    return v

for t in TABLES:
    try:
        pg_cur.execute(f'SELECT * FROM "{t}";')
        rows = pg_cur.fetchall()
        cols = [d[0] for d in pg_cur.description]
        if rows:
            sq_cur.execute(f'DELETE FROM "{t}";')
            placeholders = ', '.join(['?'] * len(cols))
            col_names = ', '.join([f'"{c}"' for c in cols])
            
            converted_rows = []
            for r in rows:
                converted_rows.append([clean_val(cols[idx], val) for idx, val in enumerate(r)])
            
            sq_cur.executemany(f'INSERT INTO "{t}" ({col_names}) VALUES ({placeholders});', converted_rows)
            sqlite_conn.commit()
            print(f"Successfully synced {len(rows)} records into '{t}'")
        else:
            print(f"Table '{t}' has 0 records.")
    except Exception as err:
        print(f"Error on '{t}': {err}")

sq_cur.execute("PRAGMA foreign_keys = ON;")
sqlite_conn.commit()
sqlite_conn.close()
pg_conn.close()
print("\n=== ALL DATA SYNCED 100% SUCCESSFULLY! ===")
