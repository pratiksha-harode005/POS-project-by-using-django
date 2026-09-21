from apps.vendor_management.models import VendorCategory, Vendor
print([(c.id, c.name) for c in VendorCategory.objects.all()])
