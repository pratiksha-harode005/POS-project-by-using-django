import os
import sys
import django
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from django.db import connection, reset_queries
from rest_framework.test import APIClient

client = APIClient()

def profile_and_explain(url, label):
    print("=" * 80)
    print(f"PROFILING: {label} ({url})")
    print("=" * 80)
    reset_queries()
    t0 = time.time()
    resp = client.get(url)
    t1 = time.time()
    queries = connection.queries
    total_elapsed_ms = (t1 - t0) * 1000
    total_db_ms = sum(float(q.get('time', 0)) for q in queries) * 1000
    
    print(f"Status: {resp.status_code}, Response Size: {len(resp.content)/1024.0:.1f} KB")
    print(f"Total Client Time: {total_elapsed_ms:.2f} ms")
    print(f"Total DB Client Time: {total_db_ms:.2f} ms")
    print(f"Query Count: {len(queries)}\n")
    
    cursor = connection.cursor()
    for i, q in enumerate(queries):
        sql = q['sql']
        client_time_ms = float(q['time']) * 1000
        print(f"--- Query #{i+1} (Client observed: {client_time_ms:.1f} ms) ---")
        print(f"SQL: {sql[:160]}...")
        # Run EXPLAIN ANALYZE
        try:
            cursor.execute(f"EXPLAIN ANALYZE {sql}")
            plan_rows = cursor.fetchall()
            print("PostgreSQL Server Plan & Execution:")
            for p in plan_rows:
                print("  ", p[0])
        except Exception as e:
            print(f"  EXPLAIN failed: {e}")
        print()

profile_and_explain('/api/rfq/?vendor=VND-HW-001&page_size=50', 'RFQ List (Dell)')
profile_and_explain('/api/requests/', 'Purchase Requests List')
