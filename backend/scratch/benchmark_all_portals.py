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

def benchmark_endpoint(client, url, method="GET", data=None, token=None):
    headers = {}
    if token:
        headers["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    
    reset_queries()
    start_time = time.perf_counter()
    with CaptureQueriesContext(connection) as ctx:
        if method == "GET":
            response = client.get(url, **headers)
        elif method == "POST":
            response = client.post(url, data=data, content_type="application/json", **headers)
    end_time = time.perf_counter()
    
    wall_time_ms = (end_time - start_time) * 1000
    db_queries = len(ctx.captured_queries)
    db_time_ms = sum(float(q.get('time', 0)) for q in ctx.captured_queries) * 1000
    payload_size = len(response.content) if hasattr(response, 'content') else 0
    status_code = response.status_code
    
    # Check for duplicate SQL queries (normalized)
    sql_statements = [q['sql'].strip() for q in ctx.captured_queries]
    duplicates = len(sql_statements) - len(set(sql_statements))
    
    return {
        "url": url,
        "status": status_code,
        "wall_time_ms": round(wall_time_ms, 2),
        "db_queries": db_queries,
        "db_time_ms": round(db_time_ms, 2),
        "duplicates": duplicates,
        "payload_size": payload_size,
        "queries": ctx.captured_queries
    }

def get_token(client, username, password):
    res = client.post('/api/auth/login/', data={'username': username, 'password': password}, content_type='application/json')
    if res.status_code == 200:
        return res.json().get('access')
    return None

def run_all_benchmarks():
    client = Client()
    print("=" * 80)
    print("RUNNING FULL MULTI-PORTAL PERFORMANCE BENCHMARK")
    print("=" * 80)
    
    # Check test users
    users = list(User.objects.values('id', 'username', 'email', 'role'))
    print(f"Total users in system: {len(users)}")
    for u in users:
        print(f"  User: {u['username']} | Role: {u['role']} | Email: {u['email']}")
    
    roles_test = [
        ("Vendor (Dell)", "vendor_dell", "password123", [
            "/api/rfq/?vendor=VND-HW-001",
            "/api/rfq/quotations/?vendor=VND-HW-001",
            "/api/procurement/purchase-orders/?vendor=VND-HW-001",
            "/api/invoices/?vendor=VND-HW-001",
            "/api/payments/?vendor=VND-HW-001",
            "/api/notifications/",
        ]),
        ("Team Lead", "teamlead", "password123", [
            "/api/requests/",
            "/api/rfq/",
            "/api/procurement/purchase-orders/",
            "/api/notifications/",
        ]),
        ("Manager", "manager", "password123", [
            "/api/requests/",
            "/api/rfq/",
            "/api/procurement/purchase-orders/",
            "/api/budget/allocations/",
            "/api/notifications/",
        ]),
        ("Finance", "finance", "password123", [
            "/api/invoices/",
            "/api/payments/",
            "/api/budget/allocations/",
            "/api/procurement/purchase-orders/",
            "/api/requests/",
            "/api/notifications/",
        ]),
        ("Admin", "admin", "password123", [
            "/api/users/",
            "/api/vendors/",
            "/api/users/departments/",
            "/api/procurement/contracts/",
            "/api/requests/",
            "/api/procurement/purchase-orders/",
            "/api/notifications/",
        ]),
    ]

    all_results = []
    for role_name, username, password, endpoints in roles_test:
        print(f"\n>>> Benchmarking Role: {role_name} (User: {username})")
        # Measure login
        login_res = benchmark_endpoint(client, "/api/auth/login/", method="POST", data={"username": username, "password": password})
        token = None
        if login_res["status"] == 200:
            import json
            token = get_token(client, username, password)
            print(f"  [LOGIN] Status: {login_res['status']} | Wall: {login_res['wall_time_ms']}ms | DB Queries: {login_res['db_queries']} | DB Time: {login_res['db_time_ms']}ms")
        else:
            print(f"  [LOGIN FAILED] Status: {login_res['status']}")
            
        role_results = {"role": role_name, "login": login_res, "endpoints": []}
        
        for ep in endpoints:
            ep_res = benchmark_endpoint(client, ep, token=token)
            print(f"  {ep:<55} | Status: {ep_res['status']} | Wall: {ep_res['wall_time_ms']:>7.1f}ms | Queries: {ep_res['db_queries']:>2} | DB Time: {ep_res['db_time_ms']:>5.1f}ms | Dups: {ep_res['duplicates']} | Size: {ep_res['payload_size']}B")
            role_results["endpoints"].append(ep_res)
            
            # Print sample SQL if queries > 4 or duplicates > 0
            if ep_res["db_queries"] > 5 or ep_res["duplicates"] > 0:
                print("    --- Query details ---")
                for i, q in enumerate(ep_res["queries"]):
                    print(f"      Q{i+1} ({float(q['time'])*1000:.1f}ms): {q['sql'][:120]}...")

        all_results.append(role_results)

    print("\n" + "=" * 80)
    print("BENCHMARK SUMMARY TABLE")
    print("=" * 80)
    print(f"{'Role':<15} | {'Endpoint':<45} | {'Queries':<7} | {'Wall (ms)':<10} | {'DB (ms)':<8} | {'Dups':<5}")
    print("-" * 95)
    for r in all_results:
        print(f"{r['role']:<15} | {'/api/auth/login/':<45} | {r['login']['db_queries']:<7} | {r['login']['wall_time_ms']:<10.1f} | {r['login']['db_time_ms']:<8.1f} | {r['login']['duplicates']:<5}")
        for ep in r["endpoints"]:
            print(f"{'':<15} | {ep['url']:<45} | {ep['db_queries']:<7} | {ep['wall_time_ms']:<10.1f} | {ep['db_time_ms']:<8.1f} | {ep['duplicates']:<5}")

if __name__ == "__main__":
    run_all_benchmarks()
