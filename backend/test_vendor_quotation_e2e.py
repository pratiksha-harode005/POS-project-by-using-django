import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000/api"

def make_request(url, method="GET", data=None):
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    body = json.dumps(data).encode("utf-8") if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.getcode(), json.loads(resp.read().decode("utf-8"))

print("--- END-TO-END VENDOR QUOTATION VERIFICATION ---")

# 1. Fetch active RFQs
code, rfqs_data = make_request(f"{BASE_URL}/rfq/")
rfqs = rfqs_data.get('results', rfqs_data) if isinstance(rfqs_data, dict) else rfqs_data
print(f"1. Fetched {len(rfqs)} RFQs. Testing with first available RFQ...")

target_rfq = rfqs[0]
rfq_id = target_rfq.get('rfq_id') or target_rfq.get('id')
print(f"Target RFQ: {rfq_id} ({target_rfq.get('title')})")

# 2. Submit test vendor quotation with custom GST rate (e.g. 18.0) and rich extra fields
test_submission = {
    "rfq": rfq_id,
    "vendor": "Dell Technologies Inc.",
    "price": 450000.00,
    "gst_rate": 18.00,
    "delivery_days": 5,
    "warranty_months": 36,
    "valid_until": "2026-11-15",
    "terms_conditions": "Comprehensive SLA and OEM direct support",
    "status": "Submitted",
    "extra_fields": {
        "warranty_type": "On-site 24/7",
        "free_service_count": "4 Services",
        "installation_type": "Free Professional Setup",
        "tech_support_duration": "3 Years Dedicated Account",
        "replacement_policy": "48-Hour DOA Replacement",
        "accessories_included": "Power Cable, Rack Mount Kit"
    }
}

code, quo_resp = make_request(f"{BASE_URL}/rfq/quotations/", method="POST", data=test_submission)
print(f"2. Quotation Submission Status: {code}")
assert code in [200, 201], f"Quotation submission failed: {quo_resp}"
print(f"   Created/Updated Quote ID: {quo_resp.get('quotation_id')} | Base=${quo_resp.get('base_amount')} | GST Rate={quo_resp.get('gst_rate')}% | Tax=${quo_resp.get('tax_amount')} | Total=${quo_resp.get('total_amount')}")

assert float(quo_resp.get('base_amount')) == 450000.00
assert float(quo_resp.get('gst_rate')) == 18.00
assert float(quo_resp.get('tax_amount')) == 81000.00
assert float(quo_resp.get('total_amount')) == 531000.00
assert quo_resp.get('warranty_type') == "On-site 24/7"
assert quo_resp.get('free_service_count') == "4 Services"

print("3. Validating list retrieval from GET /rfq/quotations/...")
code, list_data = make_request(f"{BASE_URL}/rfq/quotations/")
all_quotes = list_data.get('results', list_data) if isinstance(list_data, dict) else list_data
matching = next((q for q in all_quotes if q.get('quotation_id') == quo_resp.get('quotation_id')), None)
assert matching is not None, "Newly submitted quotation not found in database listing!"

print(f"   Verified Quote in DB list: ID={matching.get('quotation_id')} | Vendor={matching.get('vendor_detail', {}).get('name')} | Total={matching.get('total_amount')}")

print("\nSUCCESS: All vendor quotation submission, calculation, database persistence, and API endpoints are 100% verified!")
