import os
import sys
import time

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
import django
django.setup()

from django.test import Client
from django.db import connection, reset_queries
from django.test.utils import CaptureQueriesContext
from apps.users.models import User

def profile_call(client, url, method="GET", data=None, token=None):
    headers = {}
    if token:
        headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"

    reset_queries()
    t0 = time.perf_counter()
    with CaptureQueriesContext(connection) as ctx:
        t_before_req = time.perf_counter()
        if method == "GET":
            response = client.get(url, **headers)
        elif method == "POST":
            response = client.post(url, data=data, content_type="application/json", **headers)
        t_after_req = time.perf_counter()
    t1 = time.perf_counter()

    total_api_ms = (t1 - t0) * 1000
    db_queries = len(ctx.captured_queries)
    db_time_ms = sum(float(q.get('time', 0)) for q in ctx.captured_queries) * 1000
    django_processing_ms = max(0.0, total_api_ms - db_time_ms)
    payload_bytes = len(response.content) if hasattr(response, 'content') else 0
    status_code = response.status_code

    # Slowest query
    slowest_q = None
    max_q_time = 0.0
    for q in ctx.captured_queries:
        q_time = float(q.get('time', 0)) * 1000
        if q_time > max_q_time:
            max_q_time = q_time
            slowest_q = q.get('sql', '')[:120]

    return {
        "url": url,
        "status": status_code,
        "total_api_ms": round(total_api_ms, 2),
        "db_time_ms": round(db_time_ms, 2),
        "django_processing_ms": round(django_processing_ms, 2),
        "db_queries": db_queries,
        "slowest_q_ms": round(max_q_time, 2),
        "slowest_q_sql": slowest_q,
        "payload_bytes": payload_bytes,
        "queries": ctx.captured_queries
    }

def run_teamlead_profile():
    client = Client()
    print("=" * 80)
    print("TEAM LEAD END-TO-END PERFORMANCE PROFILING")
    print("=" * 80)

    # 1. Login
    login_res = profile_call(client, "/api/auth/login/", method="POST", data={"username": "teamlead", "password": "password123"})
    token = None
    if login_res["status"] == 200:
        import json
        data = json.loads(login_res["queries"] and client.post('/api/auth/login/', data={"username": "teamlead", "password": "password123"}, content_type="application/json").content or b"{}")
        token = data.get("access")

    print(f"1. Login API: Status={login_res['status']} | Total API={login_res['total_api_ms']}ms | DB Time={login_res['db_time_ms']}ms | Django Proc={login_res['django_processing_ms']}ms | Queries={login_res['db_queries']}")

    # 2. Team Lead Flow Endpoints
    flow_endpoints = [
        ("Dashboard (Requests)", "/api/requests/?page_size=1000"),
        ("Dashboard (Payments)", "/api/payments/"),
        ("Dashboard (Notifications)", "/api/notifications/?page_size=100"),
        ("Requests List", "/api/requests/"),
        ("RFQs List", "/api/rfq/?page_size=1000"),
        ("POs List", "/api/procurement/purchase-orders/"),
        ("Notifications List", "/api/notifications/"),
        ("Request History Detail", "/api/requests/?page_size=1000"),
    ]

    results = []
    for label, ep in flow_endpoints:
        res = profile_call(client, ep, token=token)
        results.append((label, ep, res))
        print(f"\n--- {label} ({ep}) ---")
        print(f"    Status: {res['status']} | Total: {res['total_api_ms']}ms | DB Time: {res['db_time_ms']}ms | Django: {res['django_processing_ms']}ms | Queries: {res['db_queries']} | Size: {res['payload_bytes']}B")
        print(f"    Slowest Query ({res['slowest_q_ms']}ms): {res['slowest_q_sql']}")
        if res['db_queries'] > 0:
            for i, q in enumerate(res['queries']):
                print(f"      Q{i+1} ({float(q['time'])*1000:.1f}ms): {q['sql'][:100]}...")

    print("\n" + "=" * 80)
    print("TEAM LEAD MEASUREMENT SUMMARY")
    print("=" * 80)
    print(f"{'Step / Page':<25} | {'API Total (ms)':<15} | {'DB Time (ms)':<12} | {'Django (ms)':<12} | {'Queries':<8} | {'Payload (KB)':<12}")
    print("-" * 90)
    print(f"{'Login':<25} | {login_res['total_api_ms']:<15.1f} | {login_res['db_time_ms']:<12.1f} | {login_res['django_processing_ms']:<12.1f} | {login_res['db_queries']:<8} | {login_res['payload_bytes']/1024:<12.1f}")
    for label, ep, res in results:
        print(f"{label:<25} | {res['total_api_ms']:<15.1f} | {res['db_time_ms']:<12.1f} | {res['django_processing_ms']:<12.1f} | {res['db_queries']:<8} | {res['payload_bytes']/1024:<12.1f}")

if __name__ == "__main__":
    run_teamlead_profile()
