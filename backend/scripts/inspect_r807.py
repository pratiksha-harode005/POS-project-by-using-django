import urllib.request, json

req = urllib.request.Request('http://localhost:8000/api/requests/807/')
with urllib.request.urlopen(req) as resp:
    r = json.loads(resp.read().decode('utf-8'))

print("=== RAW REQUEST 807 FROM API ===")
for k, v in r.items():
    if k in ['id', 'request_id', 'title', 'status', 'current_stage', 'category', 'amount', 'total_estimated_cost', 'flow_type', 'current_approval_level', 'assigned_manager', 'created_by_detail', 'approval_history', 'approval_steps']:
        print(f"  {k}: {v}")

print("\nApproval history / steps:")
print("approval_history:", r.get('approval_history'))
print("approval_steps:", r.get('approval_steps'))
