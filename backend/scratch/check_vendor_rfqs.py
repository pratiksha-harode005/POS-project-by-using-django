import os
import sys
import django
import json
import urllib.request

sys.path.insert(0, r'c:\Users\Prati\OneDrive\Desktop\RNEW\KSS-PROCUREMENT-OS\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.vendor_management.models import Vendor
from apps.rfq_management.models import RFQ

print("=== ALL RFQS IN DATABASE ===")
for r in RFQ.objects.all():
    invited = [f"{v.id}:{v.unique_vendor_id}:{v.name}" for v in r.invited_vendors.all()]
    print(f"RFQ ID: {r.id}, Code: {r.rfq_id}, Title: {r.title}, Status: {r.status}, Deadline: {r.deadline}, Invited: {invited}")

print("\n=== TEST API WITH VENDOR PARAMS ===")
for vid in ['VND-HW-001', 'VND-HW-002', 'VND-HW-003', 'VND-HW-004']:
    url = f'http://127.0.0.1:8000/api/rfq/?vendor={vid}&page_size=1000'
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read())
        results = data if isinstance(data, list) else data.get('results', [])
        print(f"Vendor {vid}: {len(results)} RFQs returned from API")
        for res in results:
            print(f"  -> RFQ: {res.get('rfq_id')}, Title: {res.get('title')}, Status: {res.get('status')}, Deadline: {res.get('deadline')}")
