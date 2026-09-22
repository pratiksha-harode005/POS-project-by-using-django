import datetime
from django.core.management.base import BaseCommand
from apps.users.models import User, Department
from apps.request_management.models import PurchaseRequest, RejectionReason, ApprovalStep, ApprovalHistory
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

        # 2. Rejection / Recommendation / Send Back Reasons
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

        sendback_reasons = [
            "Please attach vendor quotation",
            "Clarify delivery location and specs",
            "Item quantity needs revision",
        ]
        for r in sendback_reasons:
            RejectionReason.objects.get_or_create(text=r, reason_type='SEND_BACK')

        # 3. Users with all 6 Roles
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
        mgr_u = create_user('manager', 'mgr@procurementos.com', 'MANAGER', dept_it)
        tl_u = create_user('teamlead', 'tl@procurementos.com', 'TEAM_LEAD', dept_it)
        emp_u = create_user('employee', 'emp@procurementos.com', 'EMPLOYEE', dept_it)
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

        # 6. Sample Purchase Requests covering each stage of the workflow
        # Request 1: Newly created Employee request -> TEAM_LEAD_REVIEW
        req1, created1 = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-001',
            defaults={
                'title': 'High Performance Laptops for Engineering Team',
                'category': 'IT Hardware',
                'subcategory': 'Laptops',
                'description': '10 MacBook Pro 16-inch M3 Max laptops for senior developers.',
                'quantity': 10,
                'requested_amount': 35000.00,
                'required_by': datetime.date.today() + datetime.timedelta(days=14),
                'department': dept_it,
                'delivery_location': 'Pune HQ, 4th Floor',
                'priority': 'High',
                'vendor': 'Dell Technologies',
                'preferred_vendor': 'Dell Technologies',
                'justification': 'Upgrading dev machines for new AI deployment project.',
                'status': PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                'current_approval_level': PurchaseRequest.LEVEL_TEAM_LEAD,
                'current_stage': 1,
                'created_by': emp_u,
                'assigned_team_lead': tl_u,
                'assigned_manager': mgr_u,
            }
        )
        if created1:
            ApprovalHistory.objects.create(
                request=req1, action='CREATE', performed_by=emp_u, user_role='EMPLOYEE',
                previous_status='DRAFT', new_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                comments='Request initiated by Employee for team hardware.',
                approved_amount=35000.00, cost_center='CC-IT-2026'
            )

        # Request 2: Approved by TL -> MANAGER_REVIEW
        req2, created2 = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-002',
            defaults={
                'title': 'Cloud Infrastructure Yearly Renewal',
                'category': 'SaaS & Cloud',
                'subcategory': 'AWS Credits',
                'description': 'Annual cloud hosting reservation for production clusters.',
                'quantity': 1,
                'requested_amount': 60000.00,
                'required_by': datetime.date.today() + datetime.timedelta(days=30),
                'department': dept_it,
                'priority': 'Urgent',
                'vendor': 'Amazon Web Services',
                'preferred_vendor': 'Amazon Web Services',
                'justification': 'Production environment hosting budget requirement.',
                'status': PurchaseRequest.STATUS_MANAGER_REVIEW,
                'current_approval_level': PurchaseRequest.LEVEL_MANAGER,
                'current_stage': 2,
                'created_by': emp_u,
                'assigned_team_lead': tl_u,
                'assigned_manager': mgr_u,
            }
        )
        if created2:
            ApprovalHistory.objects.create(
                request=req2, action='CREATE', performed_by=emp_u, user_role='EMPLOYEE',
                previous_status='DRAFT', new_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                comments='Created by Employee.', approved_amount=60000.00
            )
            ApprovalHistory.objects.create(
                request=req2, action='APPROVE', performed_by=tl_u, user_role='TEAM_LEAD',
                previous_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                new_status=PurchaseRequest.STATUS_MANAGER_REVIEW,
                comments='Reviewed specifications and confirmed operational necessity. Approved by Team Lead.',
                approved_amount=60000.00, cost_center='CC-OPS-2026'
            )

        # Request 3: Recommended by Manager -> FINANCE_REVIEW
        req3, created3 = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-003',
            defaults={
                'title': 'Datacenter Server Expansion',
                'category': 'IT Hardware',
                'subcategory': 'Servers',
                'description': 'Rackmount server expansion for high throughput batch processing.',
                'quantity': 4,
                'requested_amount': 120000.00,
                'approved_amount': 120000.00,
                'required_by': datetime.date.today() + datetime.timedelta(days=21),
                'department': dept_it,
                'priority': 'High',
                'vendor': 'Dell Technologies',
                'preferred_vendor': 'Dell Technologies',
                'justification': 'CapEx budget expansion required for Q4 client onboarding.',
                'status': PurchaseRequest.STATUS_FINANCE_REVIEW,
                'current_approval_level': PurchaseRequest.LEVEL_FINANCE,
                'current_stage': 3,
                'created_by': emp_u,
                'assigned_team_lead': tl_u,
                'assigned_manager': mgr_u,
                'cost_center': 'CC-IT-CAPEX-2026'
            }
        )
        if created3:
            ApprovalHistory.objects.create(
                request=req3, action='CREATE', performed_by=emp_u, user_role='EMPLOYEE',
                previous_status='DRAFT', new_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                comments='Initiated by engineer.', approved_amount=120000.00
            )
            ApprovalHistory.objects.create(
                request=req3, action='APPROVE', performed_by=tl_u, user_role='TEAM_LEAD',
                previous_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                new_status=PurchaseRequest.STATUS_MANAGER_REVIEW,
                comments='Approved by Team Lead.', approved_amount=120000.00
            )
            ApprovalHistory.objects.create(
                request=req3, action='RECOMMEND_FINANCE', performed_by=mgr_u, user_role='MANAGER',
                previous_status=PurchaseRequest.STATUS_MANAGER_REVIEW,
                new_status=PurchaseRequest.STATUS_FINANCE_REVIEW,
                comments='Exceeds Manager operational threshold (₹50,000). Recommended to Finance for CapEx verification.',
                approved_amount=120000.00, cost_center='CC-IT-CAPEX-2026'
            )

        # Request 4: Sent Back by Team Lead -> SENT_BACK
        req4, created4 = PurchaseRequest.objects.get_or_create(
            request_id='REQ-DEMO-004',
            defaults={
                'title': 'Ergonomic Standing Desks for Design Team',
                'category': 'IT Hardware',
                'subcategory': 'Furniture',
                'description': '10 automated motorized standing desks.',
                'quantity': 10,
                'requested_amount': 8500.00,
                'required_by': datetime.date.today() + datetime.timedelta(days=10),
                'department': dept_it,
                'priority': 'Medium',
                'justification': 'Health and ergonomics request.',
                'status': PurchaseRequest.STATUS_SENT_BACK,
                'current_approval_level': PurchaseRequest.LEVEL_EMPLOYEE,
                'current_stage': 0,
                'created_by': emp_u,
                'assigned_team_lead': tl_u,
                'assigned_manager': mgr_u,
            }
        )
        if created4:
            ApprovalHistory.objects.create(
                request=req4, action='CREATE', performed_by=emp_u, user_role='EMPLOYEE',
                previous_status='DRAFT', new_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                comments='Created.', approved_amount=8500.00
            )
            ApprovalHistory.objects.create(
                request=req4, action='SEND_BACK', performed_by=tl_u, user_role='TEAM_LEAD',
                previous_status=PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                new_status=PurchaseRequest.STATUS_SENT_BACK,
                comments='Please attach formal quotes from at least two certified vendors before proceeding.',
                approved_amount=8500.00
            )

        self.stdout.write(self.style.SUCCESS("Data seeding completed successfully!"))
