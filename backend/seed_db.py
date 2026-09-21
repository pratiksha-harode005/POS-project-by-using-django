import os
import sys
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
django.setup()

from apps.users.models import User, Department
from apps.vendor_management.models import Vendor, VendorCategory
from apps.request_management.models import PurchaseRequest
from apps.rfq_management.models import RFQ, Quotation
from apps.procurement.models import PurchaseOrder
from apps.invoice_management.models import Invoice
from apps.payment_management.models import Payment
from apps.budget_management.models import BudgetAllocation
from apps.notification_management.models import Notification

def seed():
    print("Starting database seed...")
    
    # 1. Ensure users exist with known passwords
    users_data = [
        ('admin', 'admin@kss.com', 'ADMIN', 'System', 'Administrator'),
        ('manager', 'manager@kss.com', 'MANAGER', 'Procurement', 'Manager'),
        ('teamlead', 'teamlead@kss.com', 'TEAM_LEAD', 'Engineering', 'Lead'),
        ('finance', 'finance@kss.com', 'FINANCE', 'Finance', 'Executive'),
        ('vendor_dell', 'contact@dell.com', 'VENDOR', 'Dell', 'Technologies'),
        ('vendor_aws', 'billing@aws.com', 'VENDOR', 'Amazon', 'AWS'),
    ]
    
    users = {}
    for username, email, role, first_name, last_name in users_data:
        u, created = User.objects.get_or_create(username=username, defaults={
            'email': email,
            'role': role,
            'first_name': first_name,
            'last_name': last_name,
            'is_active': True,
            'is_staff': (role == 'ADMIN')
        })
        u.set_password('password123')
        u.save()
        users[username] = u
        print(f"User '{username}' ({role}) active with password 'password123'.")
        
    # 2. Departments
    depts_data = [
        ('Engineering', 'ENG', 'Engineering Department'),
        ('IT Infrastructure', 'IT', 'IT Department'),
        ('Finance & Ops', 'FIN', 'Finance Department'),
    ]
    dept_objs = {}
    for name, code, desc in depts_data:
        d = Department.objects.filter(code=code).first()
        if not d:
            d = Department.objects.filter(name=name).first()
        if not d:
            d = Department.objects.create(name=name, code=code, description=desc)
        dept_objs[name] = d
    
    # Link teamlead and manager to department
    eng_dept = dept_objs['Engineering']
    users['teamlead'].department = eng_dept
    users['teamlead'].save()
    users['manager'].department = eng_dept
    users['manager'].save()

    # 3. Budget Allocations
    for dname, d_obj in dept_objs.items():
        BudgetAllocation.objects.get_or_create(
            department=d_obj,
            fiscal_year=2026,
            defaults={
                'total_allocated': Decimal('500000.00'),
                'committed_amount': Decimal('75000.00'),
                'spent_amount': Decimal('125000.00')
            }
        )
    print("Budgets ready.")

    # 4. Vendors
    cat_hardware, _ = VendorCategory.objects.get_or_create(name='Hardware & IT', defaults={'description': 'Computers and Servers'})
    cat_cloud, _ = VendorCategory.objects.get_or_create(name='Cloud Services', defaults={'description': 'Hosting and Infrastructure'})
    
    vendor_dell, _ = Vendor.objects.get_or_create(
        unique_vendor_id='V-DELL-001',
        defaults={
            'name': 'Dell Technologies Inc.',
            'category': cat_hardware,
            'email': 'contact@dell.com',
            'phone': '+1-800-BUY-DELL',
            'status': 'APPROVED'
        }
    )
    users['vendor_dell'].vendor_id_code = 'V-DELL-001'
    users['vendor_dell'].save()
    
    vendor_aws, _ = Vendor.objects.get_or_create(
        unique_vendor_id='V-AWS-001',
        defaults={
            'name': 'Amazon Web Services Inc.',
            'category': cat_cloud,
            'email': 'billing@aws.com',
            'phone': '+1-800-AWS-CLOUD',
            'status': 'APPROVED'
        }
    )
    users['vendor_aws'].vendor_id_code = 'V-AWS-001'
    users['vendor_aws'].save()
    print("Vendors ready.")

    # 5. Purchase Requests
    pr1, _ = PurchaseRequest.objects.get_or_create(
        request_id='PR-2026-001',
        defaults={
            'created_by': users['teamlead'],
            'department': dept_objs['Engineering'],
            'title': 'High-Performance Developer Laptops (10x Dell XPS)',
            'description': 'Procurement of 10 Dell XPS 15 laptops for software engineering team.',
            'category': 'Hardware',
            'total_estimated_cost': Decimal('25000.00'),
            'priority': 'HIGH',
            'status': 'APPROVED',
            'quantity': 10,
            'required_by': timezone.now().date() + timedelta(days=14)
        }
    )
    
    pr2, _ = PurchaseRequest.objects.get_or_create(
        request_id='PR-2026-002',
        defaults={
            'created_by': users['teamlead'],
            'department': dept_objs['IT Infrastructure'],
            'title': 'Annual Cloud Infrastructure Hosting (AWS EC2 & S3)',
            'description': 'Reserved instance capacity and S3 storage for main production web servers.',
            'category': 'Cloud Services',
            'total_estimated_cost': Decimal('45000.00'),
            'priority': 'CRITICAL',
            'status': 'APPROVED',
            'quantity': 1,
            'required_by': timezone.now().date() + timedelta(days=30)
        }
    )

    pr3, _ = PurchaseRequest.objects.get_or_create(
        request_id='PR-2026-003',
        defaults={
            'created_by': users['teamlead'],
            'department': dept_objs['Engineering'],
            'title': 'Ergonomic Office Chairs (20x)',
            'description': 'Replacement of worn out chairs in engineering wing.',
            'category': 'Furniture',
            'total_estimated_cost': Decimal('6000.00'),
            'priority': 'MEDIUM',
            'status': 'SUBMITTED',
            'quantity': 20,
            'required_by': timezone.now().date() + timedelta(days=20)
        }
    )
    print("Purchase Requests ready.")

    # 6. RFQs
    rfq1, _ = RFQ.objects.get_or_create(
        rfq_id='RFQ-2026-001',
        defaults={
            'purchase_request': pr1,
            'title': 'Bidding for 10x Developer Laptops',
            'deadline': timezone.now().date() + timedelta(days=14),
            'terms': 'Net 30 payment, 3 years standard manufacturer warranty required.',
            'status': 'OPEN'
        }
    )
    rfq1.invited_vendors.add(vendor_dell)

    rfq2, _ = RFQ.objects.get_or_create(
        rfq_id='RFQ-2026-002',
        defaults={
            'purchase_request': pr2,
            'title': 'Cloud Hosting Enterprise Plan 2026',
            'deadline': timezone.now().date() + timedelta(days=7),
            'terms': 'Quarterly billing, 99.99% uptime SLA.',
            'status': 'OPEN'
        }
    )
    rfq2.invited_vendors.add(vendor_aws)
    print("RFQs ready.")

    # 7. Quotations
    q1, _ = Quotation.objects.get_or_create(
        quotation_id='QT-2026-001',
        defaults={
            'rfq': rfq1,
            'vendor': vendor_dell,
            'price': Decimal('23500.00'),
            'delivery_days': 7,
            'warranty_months': 36,
            'terms_conditions': '3 years Dell ProSupport included with express next-day delivery.',
            'status': 'ACCEPTED'
        }
    )

    q2, _ = Quotation.objects.get_or_create(
        quotation_id='QT-2026-002',
        defaults={
            'rfq': rfq2,
            'vendor': vendor_aws,
            'price': Decimal('42000.00'),
            'delivery_days': 1,
            'warranty_months': 12,
            'terms_conditions': 'AWS Enterprise Support Plan & Reserved Instance Credits.',
            'status': 'SUBMITTED'
        }
    )
    print("Quotations ready.")

    # 8. Purchase Order
    po1, _ = PurchaseOrder.objects.get_or_create(
        po_id='PO-2026-001',
        defaults={
            'purchase_request': pr1,
            'quotation': q1,
            'vendor': vendor_dell,
            'total_amount': Decimal('23500.00'),
            'status': 'APPROVED',
            'order_date': timezone.now().date() - timedelta(days=3),
            'expected_delivery': timezone.now().date() + timedelta(days=4),
            'terms': 'Standard Purchase Order terms for hardware delivery.'
        }
    )
    print("Purchase Orders ready.")

    # 9. Invoice
    inv1, _ = Invoice.objects.get_or_create(
        invoice_id='INV-2026-001',
        defaults={
            'purchase_order': po1,
            'vendor': vendor_dell,
            'invoice_number': 'DELL-INV-990812',
            'amount': Decimal('23500.00'),
            'tax_amount': Decimal('1880.00'),
            'status': 'SUBMITTED',
            'invoice_date': timezone.now().date() - timedelta(days=2),
            'due_date': timezone.now().date() + timedelta(days=28)
        }
    )
    print("Invoices ready.")

    # 10. Payment
    pay1, _ = Payment.objects.get_or_create(
        payment_id='PAY-2026-001',
        defaults={
            'invoice': inv1,
            'purchase_request': pr1,
            'vendor': vendor_dell,
            'amount': Decimal('25380.00'),
            'payment_method': 'BANK_TRANSFER',
            'reference_number': 'WIRE-2026-9817263',
            'status': 'COMPLETED',
            'payment_date': timezone.now().date(),
            'notes': 'Full payment released upon delivery confirmation.'
        }
    )
    print("Payments ready.")

    # 11. Notifications
    Notification.objects.get_or_create(
        user=users['teamlead'],
        title='Purchase Request Approved',
        message='Your request PR-2026-001 for 10x Dell XPS laptops has been approved.',
        defaults={'is_read': False}
    )
    Notification.objects.get_or_create(
        user=users['vendor_dell'],
        title='New RFQ Invitation',
        message='You have been invited to bid on RFQ-2026-001.',
        defaults={'is_read': False}
    )
    print("Notifications ready.")

    print("\nDatabase seeded successfully!")


if __name__ == '__main__':
    seed()
