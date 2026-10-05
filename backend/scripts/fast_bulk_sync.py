import os, sys, sqlite3, time
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

import django
django.setup()

from django.db import connection

sqlite_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'db.sqlite3')
if not os.path.exists(sqlite_path):
    print("Error: db.sqlite3 not found.")
    sys.exit(1)

s_conn = sqlite3.connect(sqlite_path)
s_conn.row_factory = sqlite3.Row
sc = s_conn.cursor()

tables_in_order = [
    'users_department',
    'users_user',
    'vendor_management_vendorcategory',
    'vendor_management_vendor',
    'budget_management_budgetallocation',
    'budget_management_budgetlimit',
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
    'invoice_management_threewaymatch',
    'payment_management_payment',
    'notification_management_notification'
]

print("=== Starting Fast Bulk Upsert (SQLite -> PostgreSQL) ===")

with connection.cursor() as cur:
    for table in tables_in_order:
        try:
            sc.execute(f'SELECT * FROM "{table}" ORDER BY id ASC')
            sqlite_rows = [dict(row) for row in sc.fetchall()]
        except Exception as e:
            print(f"Skipping {table}: {e}")
            continue

        if not sqlite_rows:
            print(f"Table {table}: 0 rows to sync.")
            continue

        columns = list(sqlite_rows[0].keys())
        col_names = ", ".join([f'"{col}"' for col in columns])
        
        # Build ON CONFLICT DO UPDATE
        update_cols = [f'"{col}" = EXCLUDED."{col}"' for col in columns if col != 'id']
        update_clause = ", ".join(update_cols)
        
        placeholders = ", ".join(["%s"] * len(columns))
        
        # Batch insert in chunks of 50
        batch_size = 50
        for i in range(0, len(sqlite_rows), batch_size):
            batch = sqlite_rows[i:i + batch_size]
            values_list = []
            for row in batch:
                values_list.append(tuple(row[col] for col in columns))
            
            # Format multi-row SQL
            args_str = ", ".join(cur.mogrify(f"({placeholders})", v).decode('utf-8') for v in values_list)
            
            if update_clause:
                sql = f'INSERT INTO "{table}" ({col_names}) VALUES {args_str} ON CONFLICT ("id") DO UPDATE SET {update_clause};'
            else:
                sql = f'INSERT INTO "{table}" ({col_names}) VALUES {args_str} ON CONFLICT ("id") DO NOTHING;'
            
            cur.execute(sql)
        
        # Reset sequence
        try:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), coalesce(max(id), 1)) FROM \"{table}\";")
        except Exception:
            pass
        
        print(f"[OK] Synced table '{table}': {len(sqlite_rows)} rows.")

print("\n=== All tables synced successfully in bulk! ===")
