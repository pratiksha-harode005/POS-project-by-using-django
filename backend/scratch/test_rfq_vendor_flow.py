import os
import sys
import django
import json
import urllib.request

sys.path.insert(0, r'c:\Users\Prati\OneDrive\Desktop\RNEW\KSS-PROCUREMENT-OS\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.vendor_management.models import Vendor, VendorCategory
from apps.rfq_management.models import RFQ
from apps.request_management.models import PurchaseRequest

print("=== 1. CHECK VENDORS FROM API ===")
req = urllib.request.Request('http://127.0.0.1:8000/api/vendors/?page_size=1000')
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())
    vendors = data if isinstance(data, list) else data.get('results', [])
    print(f"Total vendors fetched: {len(vendors)}")
    
    it_hw_vendors = [v for v in vendors if (v.get('category_detail', {}).get('name') == 'IT Hardware' or v.get('category') == 3 or v.get('category') == 'IT Hardware') and v.get('status') == 'Active']
    print(f"Active IT Hardware vendors count: {len(it_hw_vendors)}")
    for v in it_hw_vendors:
        print(f" - ID: {v.get('id')}, Code: {v.get('unique_vendor_id')}, Name: {v.get('name')}, Status: {v.get('status')}")

assert len(it_hw_vendors) == 4, f"Expected 4 IT Hardware vendors, found {len(it_hw_vendors)}"

print("\n=== 2. CREATE RFQ WITH 4 IT HARDWARE VENDORS ===")
target_pr = PurchaseRequest.objects.filter(category__icontains='Hardware').first() or PurchaseRequest.objects.first()

payload = {
    'title': 'Test RFQ for 4 IT Hardware Vendors',
    'category': 'IT Hardware',
    'subcategory': 'Laptops & Compute',
    'status': 'Open',
    'purchase_request': target_pr.id if target_pr else None,
    'terms': 'Deliver within 14 business days',
    'invited_vendors': [v['unique_vendor_id'] for v in it_hw_vendors]
}

post_data = json.dumps(payload).encode('utf-8')
create_req = urllib.request.Request(
    'http://127.0.0.1:8000/api/rfq/',
    data=post_data,
    headers={'Content-Type': 'application/json'}
)

with urllib.request.urlopen(create_req) as resp:
    created_rfq_data = json.loads(resp.read())
    rfq_id = created_rfq_data['id']
    rfq_code = created_rfq_data['rfq_id']
    print(f"Created RFQ ID: {rfq_id}, Code: {rfq_code}")

print("\n=== 3. VERIFY RFQ & INVITED VENDORS IN DB & API ===")
rfq_obj = RFQ.objects.get(id=rfq_id)
db_invited = list(rfq_obj.invited_vendors.all())
print(f"DB Invited vendors count: {len(db_invited)}")
for v in db_invited:
    print(f" - Vendor in DB: ID {v.id}, Code {v.unique_vendor_id}, Name {v.name}")

assert len(db_invited) == 4, f"Expected 4 invited vendors in DB, got {len(db_invited)}"

get_req = urllib.request.Request(f'http://127.0.0.1:8000/api/rfq/{rfq_id}/')
with urllib.request.urlopen(get_req) as resp:
    api_rfq = json.loads(resp.read())
    api_invited = api_rfq.get('invited_vendors', [])
    print(f"API Invited vendors count: {len(api_invited)}")
    assert len(api_invited) == 4, f"Expected 4 invited vendors in API, got {len(api_invited)}"

print("\n>>> ALL CHECKS PASSED SUCCESSFULLY! <<<")
