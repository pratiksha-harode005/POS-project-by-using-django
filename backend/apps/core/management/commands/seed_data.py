import datetime
from django.core.management.base import BaseCommand
from apps.users.models import User, Department
from apps.request_management.models import PurchaseRequest, RejectionReason, ApprovalStep
from apps.vendor_management.models import VendorCategory, Vendor
from apps.budget_management.models import BudgetLimit, BudgetAllocation
from apps.rfq_management.models import RFQ, Quotation
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.invoice_management.models import Invoice, ThreeWayMatch
from apps.payment_management.models import Payment


class Command(BaseCommand):
    help = 'Seeds initial data for Procurement OS development and testing.'

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("Starting data seeding..."))

        # 1. Departments
        dept_it, _ = Department.objects.get_or_create(name='IT & Infrastructure', code='IT')
        dept_fin, _ = Department.objects.get_or_create(name='Finance & Accounts', code='FIN')
        dept_ops, _ = Department.objects.get_or_create(name='Operations', code='OPS')

        # 2. Rejection / Recommendation Reasons
        rejection_reasons = [
            "Budget not available",
            "Demand not justified",
            "Duplicate request",
            "Insufficient details provided",
            "Not aligned with department priorities",
        ]
        for r in rejection_reasons:
            RejectionReason.objects.get_or_create(text=r, reason_type='REJECT')

        escalation_reasons = [
            "Exceeds my approval budget",
            "High-value / strategic purchase",
            "Requires additional financial review",
            "Cross-department budget impact",
            "Needs policy exception",
        ]
        for r in escalation_reasons:
            RejectionReason.objects.get_or_create(text=r, reason_type='RECOMMEND')

        # 3. Users
        def create_user(username, email, role, dept=None, vendor_code=None):
            u, created = User.objects.get_or_create(
                username=username,
                defaults={
                    'email': email,
                    'role': role,
                    'department': dept,
                    'vendor_id_code': vendor_code,
                    'first_name': username.replace('_', ' ').title(),
                    'last_name': 'User',
                    'work_location': 'Pune HQ',
                    'job_title': f"{role.title()} Specialist"
                }
            )
            if created:
                u.set_password('password123')
                u.save()
            return u

        admin_u = create_user('admin', 'admin@procurementos.com', 'ADMIN', dept_it)
        tl_u = create_user('teamlead', 'tl@procurementos.com', 'TEAM_LEAD', dept_it)
        mgr_u = create_user('manager', 'mgr@procurementos.com', 'MANAGER', dept_it)
        fin_u = create_user('finance', 'fin@procurementos.com', 'FINANCE', dept_fin)

        # 4. Vendor Categories & Vendors
        cat_hw, _ = VendorCategory.objects.get_or_create(name='IT Hardware', description='Laptops, Servers & Networking')
        cat_saas, _ = VendorCategory.objects.get_or_create(name='SaaS & Cloud', description='Software Licenses & Cloud')

        v_user1 = create_user('vendor_dell', 'contact@dell.com', 'VENDOR', vendor_code='VND-HW-001')
        v1, _ = Vendor.objects.get_or_create(
            unique_vendor_id='VND-HW-001',
            defaults={
                'name': 'Dell Technologies',
                'category': cat_hw,
                'contact_person': 'Michael Scott',
                'email': 'contact@dell.com',
                'phone': '+91 98765 00001',
                'address': 'Dell Campus, Whitefield, Bengaluru',
                'user': v_user1,
                'risk_rating': 'Low',
                'performance_score': 95.50
            }
        )

        v_user2 = create_user('vendor_aws', 'billing@aws.com', 'VENDOR', vendor_code='VND-SW-001')
        v2, _ = Vendor.objects.get_or_create(
            unique_vendor_id='VND-SW-001',
            defaults={
                'name': 'Amazon Web Services',
                'category': cat_saas,
                'contact_person': 'Andy Bernard',
                'email': 'billing@aws.com',
                'phone': '+91 98765 00002',
                'address': 'AWS Tower, BKC, Mumbai',
                'user': v_user2,
                'risk_rating': 'Low',
                'performance_score': 98.00
            }
        )

        # 5. Budget Limits & Allocations
        BudgetLimit.objects.get_or_create(role='MANAGER', department=dept_it, defaults={'max_amount': 50000.00})
        BudgetLimit.objects.get_or_create(role='FINANCE', department=dept_it, defaults={'max_amount': 250000.00})
        BudgetLimit.objects.get_or_create(role='ADMIN', department=None, defaults={'max_amount': 1000000.00})

        BudgetAllocation.objects.get_or_create(
            department=dept_it,
            fiscal_year='2026',
            defaults={'total_allocated': 500000.00, 'committed_amount': 120000.00, 'spent_amount': 85000.00}
        )

        # 6. Sample Purchase Requests
        req1, _ = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-001',
            defaults={
                'title': 'High Performance Laptops for Engineering Team',
                'category': 'IT Hardware',
                'subcategory': 'Laptops',
                'description': '10 MacBook Pro 16-inch M3 Max laptops for senior developers.',
                'quantity': 10,
                'required_by': datetime.date.today() + datetime.timedelta(days=14),
                'department': dept_it,
                'delivery_location': 'Pune HQ, 4th Floor',
                'priority': 'High',
                'preferred_vendor': 'Dell Technologies',
                'justification': 'Upgrading dev machines for new AI deployment project.',
                'status': 'In Procurement',
                'current_stage': 6,
                'created_by': tl_u,
                'total_estimated_cost': 35000.00
            }
        )

        req2, _ = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-002',
            defaults={
                'title': 'Cloud Infrastructure Yearly Renewal',
                'category': 'SaaS & Cloud',
                'subcategory': 'AWS Credits',
                'description': 'Annual cloud hosting reservation for production clusters.',
                'quantity': 1,
                'required_by': datetime.date.today() + datetime.timedelta(days=30),
                'department': dept_it,
                'priority': 'Urgent',
                'preferred_vendor': 'Amazon Web Services',
                'justification': 'Production environment hosting budget requirement.',
                'status': 'Pending',
                'current_stage': 1,
                'created_by': tl_u,
                'total_estimated_cost': 60000.00
            }
        )

        self.stdout.write(self.style.SUCCESS("Data seeding completed successfully!"))
