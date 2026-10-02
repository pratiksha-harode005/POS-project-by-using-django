import os
import sys
import django
from decimal import Decimal

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.users.models import User
from apps.vendor_management.models import Vendor, VendorCategory

MASTER_VENDORS = [
    # IT Hardware
    {'id': 'VND-HW-001', 'name': 'Dell Technologies Inc.', 'category': 'IT Hardware', 'score': 95.50, 'risk': 'Low', 'contact': 'Michael Dell', 'email': 'contact@dell.com', 'phone': '+1 800-456-3355'},
    {'id': 'VND-HW-002', 'name': 'HP Enterprise', 'category': 'IT Hardware', 'score': 92.00, 'risk': 'Low', 'contact': 'Meg Whitman', 'email': 'contact@hpe.com', 'phone': '+1 800-752-0900'},
    {'id': 'VND-HW-003', 'name': 'Lenovo Group', 'category': 'IT Hardware', 'score': 89.50, 'risk': 'Low', 'contact': 'Yuanqing Yang', 'email': 'contact@lenovo.com', 'phone': '+1 800-426-7378'},
    {'id': 'VND-HW-004', 'name': 'Apple Enterprise', 'category': 'IT Hardware', 'score': 97.20, 'risk': 'Low', 'contact': 'Tim Cook', 'email': 'enterprise@apple.com', 'phone': '+1 800-692-7753'},

    # Software & SaaS
    {'id': 'VND-SW-001', 'name': 'Microsoft Corporation', 'category': 'Software & SaaS', 'score': 98.00, 'risk': 'Low', 'contact': 'Satya Nadella', 'email': 'saas@microsoft.com', 'phone': '+1 800-642-7676'},
    {'id': 'VND-SW-002', 'name': 'Adobe Systems', 'category': 'Software & SaaS', 'score': 94.00, 'risk': 'Low', 'contact': 'Shantanu Narayen', 'email': 'enterprise@adobe.com', 'phone': '+1 800-833-6687'},
    {'id': 'VND-SW-003', 'name': 'Salesforce Inc.', 'category': 'Software & SaaS', 'score': 96.50, 'risk': 'Low', 'contact': 'Marc Benioff', 'email': 'sales@salesforce.com', 'phone': '+1 800-667-6389'},
    {'id': 'VND-SW-004', 'name': 'Figma Inc.', 'category': 'Software & SaaS', 'score': 93.00, 'risk': 'Low', 'contact': 'Dylan Field', 'email': 'enterprise@figma.com', 'phone': '+1 800-555-3446'},

    # Cloud & Infrastructure
    {'id': 'VND-CLD-001', 'name': 'Amazon Web Services Inc.', 'category': 'Cloud & Infrastructure', 'score': 99.00, 'risk': 'Low', 'contact': 'Andy Jassy', 'email': 'aws-support@amazon.com', 'phone': '+1 800-282-1770'},
    {'id': 'VND-CLD-002', 'name': 'Microsoft Azure', 'category': 'Cloud & Infrastructure', 'score': 97.80, 'risk': 'Low', 'contact': 'Azure Sales', 'email': 'azure@microsoft.com', 'phone': '+1 800-642-7676'},
    {'id': 'VND-CLD-003', 'name': 'Google Cloud Platform', 'category': 'Cloud & Infrastructure', 'score': 96.20, 'risk': 'Low', 'contact': 'GCP Enterprise', 'email': 'gcp@google.com', 'phone': '+1 800-358-8228'},

    # Cybersecurity
    {'id': 'VND-SEC-001', 'name': 'Palo Alto Networks', 'category': 'Cybersecurity', 'score': 94.50, 'risk': 'Low', 'contact': 'Nikesh Arora', 'email': 'sec@paloaltonetworks.com', 'phone': '+1 800-732-8246'},
    {'id': 'VND-SEC-002', 'name': 'CrowdStrike', 'category': 'Cybersecurity', 'score': 96.00, 'risk': 'Low', 'contact': 'George Kurtz', 'email': 'sales@crowdstrike.com', 'phone': '+1 800-276-9378'},

    # IT Services
    {'id': 'VND-IT-001', 'name': 'Accenture', 'category': 'IT Services', 'score': 91.00, 'risk': 'Low', 'contact': 'Julie Sweet', 'email': 'services@accenture.com', 'phone': '+1 800-541-2244'},
    {'id': 'VND-IT-002', 'name': 'Infosys', 'category': 'IT Services', 'score': 93.50, 'risk': 'Low', 'contact': 'Salil Parekh', 'email': 'enterprise@infosys.com', 'phone': '+1 800-300-0100'},

    # Office Accessories
    {'id': 'VND-FUR-001', 'name': 'Herman Miller Inc.', 'category': 'Office Accessories', 'score': 94.00, 'risk': 'Low', 'contact': 'Andi Owen', 'email': 'sales@hermanmiller.com', 'phone': '+1 800-646-4400'},
    {'id': 'VND-FUR-002', 'name': 'Steelcase', 'category': 'Office Accessories', 'score': 90.50, 'risk': 'Low', 'contact': 'Sara Armbruster', 'email': 'info@steelcase.com', 'phone': '+1 800-333-9939'},

    # Office Technology
    {'id': 'VND-OFF-001', 'name': 'Samsung Display Systems', 'category': 'Office Technology', 'score': 92.50, 'risk': 'Low', 'contact': 'JH Han', 'email': 'display@samsung.com', 'phone': '+1 800-726-7864'},
    {'id': 'VND-OFF-002', 'name': 'Canon Inc.', 'category': 'Office Technology', 'score': 89.00, 'risk': 'Low', 'contact': 'Fujio Mitarai', 'email': 'office@canon.com', 'phone': '+1 800-652-2666'},

    # Networking & Telecom
    {'id': 'VND-NET-001', 'name': 'Cisco Systems', 'category': 'Networking & Telecom', 'score': 96.80, 'risk': 'Low', 'contact': 'Chuck Robbins', 'email': 'telecom@cisco.com', 'phone': '+1 800-553-6387'},

    # Training & Certifications
    {'id': 'VND-TRN-001', 'name': 'Coursera for Business', 'category': 'Training & Certifications', 'score': 93.80, 'risk': 'Low', 'contact': 'Jeff Maggioncalda', 'email': 'b2b@coursera.org', 'phone': '+1 800-555-0192'},

    # Print & Consumables
    {'id': 'VND-PRN-001', 'name': 'HP Inc. Print', 'category': 'Print & Consumables', 'score': 91.20, 'risk': 'Low', 'contact': 'Enrique Lores', 'email': 'print@hp.com', 'phone': '+1 800-474-6836'}
]

print("=== SEEDING ALL 22 MASTER VENDORS ===")

# Normalize existing categories
existing_hw = VendorCategory.objects.filter(name='Hardware & IT').first()
if existing_hw:
    existing_hw.name = 'IT Hardware'
    existing_hw.description = 'Computers, Laptops and Servers'
    existing_hw.save()

existing_cld = VendorCategory.objects.filter(name='Cloud Services').first()
if existing_cld:
    existing_cld.name = 'Cloud & Infrastructure'
    existing_cld.description = 'Cloud Hosting, VMs and Storage'
    existing_cld.save()

categories = {}
for item in MASTER_VENDORS:
    cat_name = item['category']
    if cat_name not in categories:
        cat_obj, _ = VendorCategory.objects.get_or_create(
            name=cat_name,
            defaults={'description': f'{cat_name} vendor category'}
        )
        categories[cat_name] = cat_obj

# Create or update each vendor
created_count = 0
updated_count = 0

for item in MASTER_VENDORS:
    cat = categories[item['category']]
    uid = item['id']
    name = item['name']
    
    # Check if exists by unique_vendor_id or name
    v = Vendor.objects.filter(unique_vendor_id=uid).first()
    if not v:
        v = Vendor.objects.filter(name__iexact=name).first()

    if v:
        v.unique_vendor_id = uid
        v.name = name
        v.category = cat
        v.contact_person = item['contact']
        v.email = item['email']
        v.phone = item['phone']
        v.performance_score = Decimal(str(item['score']))
        v.risk_rating = item['risk']
        v.status = 'Active'
        v.save()
        updated_count += 1
    else:
        v = Vendor.objects.create(
            unique_vendor_id=uid,
            name=name,
            category=cat,
            contact_person=item['contact'],
            email=item['email'],
            phone=item['phone'],
            performance_score=Decimal(str(item['score'])),
            risk_rating=item['risk'],
            status='Active'
        )
        created_count += 1

    # Also ensure a User login exists for this vendor
    username = f"vendor_{uid.lower().replace('-', '_')}"
    u = User.objects.filter(vendor_id_code=uid).first()
    if not u:
        u = User.objects.filter(email=item['email']).first()
    if not u:
        u, _ = User.objects.get_or_create(
            username=username,
            defaults={
                'email': item['email'],
                'role': 'VENDOR',
                'first_name': name.split()[0],
                'last_name': 'Vendor',
                'is_active': True,
                'vendor_id_code': uid
            }
        )
        u.set_password('password123')
        u.save()
    else:
        u.vendor_id_code = uid
        u.role = 'VENDOR'
        u.save()

    if not v.user:
        v.user = u
        v.save()

print(f"Created {created_count} new vendors, updated {updated_count} vendors.")
print(f"Total Vendors in DB: {Vendor.objects.count()}")
print(f"Total Vendor Categories in DB: {VendorCategory.objects.count()}")

print("\n--- Vendors by Category ---")
for c in VendorCategory.objects.all():
    v_list = list(c.vendors.values_list('name', flat=True))
    print(f"Category '{c.name}': {len(v_list)} vendors -> {', '.join(v_list)}")
