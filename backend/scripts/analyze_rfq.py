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

def analyze(url, label):
    reset_queries()
    t0 = time.time()
    resp = client.get(url)
    t1 = time.time()
    queries = connection.queries
    print(f"==================================================")
    print(f"{label}")
    print(f"Status: {resp.status_code}, Elapsed: {(t1-t0)*1000:.2f}ms, Query count: {len(queries)}")
    for i, q in enumerate(queries):
        print(f"[{i+1}] ({float(q['time'])*1000:.1f}ms): {q['sql']}")
    print(f"==================================================\n")

analyze('/api/rfq/?vendor=VND-HW-001', 'RFQ list (vendor=VND-HW-001)')
