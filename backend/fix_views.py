import re
content = open('apps/rfq_management/views.py', encoding='utf-8').read()
new_content = content.replace(
    'v, _ = Vendor.objects.get_or_create(name=vname)',
    '''from apps.vendor_management.models import VendorCategory
                    default_cat = VendorCategory.objects.first()
                    v, _ = Vendor.objects.get_or_create(
                        name=vname,
                        defaults={
                            'category': default_cat,
                            'unique_vendor_id': f"V-TEMP-{vname.replace(' ', '')[:6].upper()}-{hash(vname) % 1000}"
                        }
                    )'''
)
open('apps/rfq_management/views.py', 'w', encoding='utf-8').write(new_content)
