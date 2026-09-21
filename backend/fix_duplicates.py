import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.vendor_management.models import Vendor
from apps.rfq_management.models import RFQ

# Step 1: For each duplicate, keep the VND-* seeded record and delete old temp records
dup_names = ['Dell Technologies Inc.', 'HP Enterprise', 'Lenovo Group', 'Amazon Web Services Inc.']

for name in dup_names:
    vendors = list(Vendor.objects.filter(name=name).order_by('id'))
    canonical = next((v for v in vendors if v.unique_vendor_id.startswith('VND-')), None)
    old_ones = [v for v in vendors if not v.unique_vendor_id.startswith('VND-')]

    print(f"Name: {name}")
    if canonical:
        print(f"  Canonical: id={canonical.id}, uid={canonical.unique_vendor_id}")
    for old in old_ones:
        print(f"  Removing duplicate: id={old.id}, uid={old.unique_vendor_id}")
        for rfq in RFQ.objects.filter(invited_vendors=old):
            if canonical:
                rfq.invited_vendors.add(canonical)
            rfq.invited_vendors.remove(old)
            print(f"    Re-linked RFQ {rfq.rfq_id}")
        old.delete()
        print(f"  Deleted old id={old.id}")
    print()

print("Done! Final vendor list:")
for v in Vendor.objects.all().order_by('unique_vendor_id'):
    cat = v.category.name if v.category else 'None'
    print(f"  {v.unique_vendor_id}: {v.name} (cat={cat}, status={v.status})")
