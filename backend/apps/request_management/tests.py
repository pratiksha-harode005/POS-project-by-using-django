from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User, Department
from apps.request_management.models import PurchaseRequest, ApprovalHistory


class ProcurementApprovalWorkflowTests(APITestCase):
    def setUp(self):
        # 1. Departments
        self.dept_it = Department.objects.create(name='IT Engineering', code='ENG-IT')
        self.dept_other = Department.objects.create(name='Marketing', code='MKT')

        # 2. Users for each role
        self.employee = User.objects.create_user(
            username='emp_john', email='john@example.com', password='password123',
            role='EMPLOYEE', department=self.dept_it
        )
        self.team_lead = User.objects.create_user(
            username='tl_sarah', email='sarah@example.com', password='password123',
            role='TEAM_LEAD', department=self.dept_it
        )
        self.manager = User.objects.create_user(
            username='mgr_robert', email='robert@example.com', password='password123',
            role='MANAGER', department=self.dept_it
        )
        self.finance = User.objects.create_user(
            username='fin_lisa', email='lisa@example.com', password='password123',
            role='FINANCE', department=self.dept_it
        )
        self.admin = User.objects.create_user(
            username='admin_boss', email='admin@example.com', password='password123',
            role='ADMIN', department=self.dept_it
        )

    def _create_employee_request(self, title="10 MacBook Pro M3 Laptops", amount="45000.00"):
        self.client.force_authenticate(user=self.employee)
        payload = {
            'title': title,
            'category': 'IT Hardware',
            'description': 'Hardware upgrade for the engineering sprint team.',
            'quantity': 10,
            'requested_amount': Decimal(amount),
            'department': self.dept_it.id,
            'delivery_location': 'Pune HQ, 4th Floor',
            'priority': 'High',
            'vendor': 'Dell Technologies Enterprise',
            'justification': 'Required for local AI compilation.',
        }
        res = self.client.post('/api/requests/', payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED, res.data)
        pr = PurchaseRequest.objects.get(id=res.data['id'])
        self.assertEqual(pr.status, PurchaseRequest.STATUS_TEAM_LEAD_REVIEW)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_TEAM_LEAD)
        # Verify initial ApprovalHistory
        history = pr.approval_history.filter(action='CREATE')
        self.assertTrue(history.exists())
        self.assertEqual(history.first().performed_by, self.employee)
        return pr

    def test_team_lead_draft_without_department_uses_assigned_department(self):
        self.client.force_authenticate(user=self.team_lead)
        payload = {
            'title': 'Team Lead dashboard data flow check',
            'category': 'IT Hardware',
            'description': 'Request used to verify Team Lead request loading.',
            'quantity': 1,
            'total_estimated_cost': '1200.00',
            'is_draft': True,
            'status': 'DRAFT',
        }

        created = self.client.post('/api/team-lead/requests/', payload, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)

        # Verify the POST persisted a draft with the authenticated Team Lead
        # and their assigned department before checking the list response.
        persisted = PurchaseRequest.objects.get(pk=created.data['id'])
        self.assertEqual(persisted.request_id, created.data['request_id'])
        self.assertEqual(persisted.status, PurchaseRequest.STATUS_DRAFT)
        self.assertEqual(persisted.current_stage, 0)
        self.assertEqual(persisted.created_by, self.team_lead)
        self.assertEqual(persisted.department, self.dept_it)

        listed = self.client.get('/api/team-lead/requests/', {'page_size': 500})
        self.assertEqual(listed.status_code, status.HTTP_200_OK, listed.data)
        results = listed.data.get('results', []) if isinstance(listed.data, dict) else listed.data
        matching = next((item for item in results if item['request_id'] == created.data['request_id']), None)

        self.assertIsNotNone(matching)
        self.assertEqual(matching['id'], created.data['id'])
        self.assertEqual(matching['status'], PurchaseRequest.STATUS_DRAFT)
        self.assertEqual(matching['department_detail']['name'], self.dept_it.name)

    def test_team_lead_draft_enters_manager_queue_only_after_submit(self):
        self.client.force_authenticate(user=self.team_lead)
        created = self.client.post('/api/team-lead/requests/', {
            'title': 'Draft approval transition check',
            'category': 'IT Hardware',
            'description': 'Verify a draft enters the manager queue only after submission.',
            'quantity': 2,
            'total_estimated_cost': '2400.00',
            'is_draft': True,
            'status': 'DRAFT',
        }, format='json')
        self.assertEqual(created.status_code, status.HTTP_201_CREATED, created.data)
        draft = PurchaseRequest.objects.get(pk=created.data['id'])
        self.assertEqual(draft.status, PurchaseRequest.STATUS_DRAFT)
        self.assertEqual(draft.current_stage, 0)

        self.client.force_authenticate(user=self.manager)
        manager_before = self.client.get('/api/manager/requests/', {'page_size': 500})
        self.assertEqual(manager_before.status_code, status.HTTP_200_OK, manager_before.data)
        manager_before_results = manager_before.data.get('results', []) if isinstance(manager_before.data, dict) else manager_before.data
        self.assertFalse(any(item.get('request_id') == draft.request_id for item in manager_before_results))

        self.client.force_authenticate(user=self.team_lead)
        submitted = self.client.post(
            f'/api/team-lead/requests/{draft.id}/submit_draft/',
            {'estimatedCost': 2400, 'justification': 'Ready for approval.'},
            format='json'
        )
        self.assertEqual(submitted.status_code, status.HTTP_200_OK, submitted.data)

        draft.refresh_from_db()
        self.assertEqual(draft.status, PurchaseRequest.STATUS_MANAGER_REVIEW)
        self.assertEqual(draft.current_approval_level, PurchaseRequest.LEVEL_MANAGER)
        self.assertEqual(draft.current_stage, 1)
        self.assertEqual(draft.created_by, self.team_lead)
        self.assertEqual(draft.department, self.dept_it)
        self.assertTrue(draft.approval_history.filter(action='SUBMIT', new_status=PurchaseRequest.STATUS_MANAGER_REVIEW).exists())

        self.client.force_authenticate(user=self.manager)
        manager_after = self.client.get('/api/manager/requests/', {'page_size': 500})
        self.assertEqual(manager_after.status_code, status.HTTP_200_OK, manager_after.data)
        manager_after_results = manager_after.data.get('results', []) if isinstance(manager_after.data, dict) else manager_after.data
        self.assertTrue(any(item.get('request_id') == draft.request_id for item in manager_after_results))

    def test_workflow_1_employee_create_tl_approve_moves_to_manager(self):
        """Workflow: Employee -> Team Lead -> Approve -> Manager Review"""
        pr = self._create_employee_request()

        # Team Lead logs in and approves
        self.client.force_authenticate(user=self.team_lead)
        res = self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', {'comments': 'Specifications verified. Approved.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_MANAGER_REVIEW)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_MANAGER)

        # Verify ApprovalHistory recorded
        history = pr.approval_history.filter(action='APPROVE', performed_by=self.team_lead)
        self.assertTrue(history.exists())
        self.assertEqual(history.first().new_status, PurchaseRequest.STATUS_MANAGER_REVIEW)

    def test_workflow_2_employee_create_tl_reject(self):
        """Workflow: Employee -> Team Lead -> Reject -> Terminal REJECTED"""
        pr = self._create_employee_request()

        self.client.force_authenticate(user=self.team_lead)
        res = self.client.post(f'/api/team-lead/requests/{pr.id}/reject/', {'comments': 'Duplicate request for Q3.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_REJECTED)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_NONE)

        history = pr.approval_history.filter(action='REJECT')
        self.assertTrue(history.exists())
        self.assertEqual(history.first().comments, 'Duplicate request for Q3.')

    def test_workflow_3_employee_create_tl_send_back_and_resubmit(self):
        """Workflow: Employee -> Team Lead -> Send Back -> Employee -> Resubmit -> Team Lead Review"""
        pr = self._create_employee_request()

        # 1. Team Lead sends back with comments
        self.client.force_authenticate(user=self.team_lead)
        res = self.client.post(f'/api/team-lead/requests/{pr.id}/send-back/', {'comments': 'Please attach quote from vendor.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_SENT_BACK)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_EMPLOYEE)

        # 2. Employee updates and resubmits
        self.client.force_authenticate(user=self.employee)
        resubmit_payload = {
            'description': 'Updated with vendor quotation reference #VN-8874.',
            'comments': 'Vendor quote attached and specs revised.'
        }
        res2 = self.client.post(f'/api/requests/{pr.id}/resubmit/', resubmit_payload, format='json')
        self.assertEqual(res2.status_code, status.HTTP_200_OK, res2.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_TEAM_LEAD_REVIEW)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_TEAM_LEAD)

        # Check history shows both SEND_BACK and RESUBMIT
        self.assertTrue(pr.approval_history.filter(action='SEND_BACK').exists())
        self.assertTrue(pr.approval_history.filter(action='RESUBMIT').exists())

    def test_workflow_4_employee_tl_approve_manager_reject(self):
        """Workflow: Employee -> Team Lead Approve -> Manager Reject"""
        pr = self._create_employee_request()

        # TL Approves
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        # Manager Rejects
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(f'/api/manager/requests/{pr.id}/reject/', {'comments': 'Department budget capped for current cycle.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_REJECTED)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_NONE)

    def test_workflow_5_employee_tl_approve_manager_approve(self):
        """Workflow: Employee -> Team Lead Approve -> Manager Approve"""
        pr = self._create_employee_request()

        # TL Approves
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        # Manager Approves with parameters
        self.client.force_authenticate(user=self.manager)
        approval_params = {
            'approved_amount': '45000.00',
            'cost_center': 'CC-IT-2026-Q3',
            'budget_available': True,
            'vendor': 'Dell Technologies Enterprise',
            'comments': 'Verified OPEX budget allocation. Approved for PO generation.'
        }
        res = self.client.post(f'/api/manager/requests/{pr.id}/approve/', approval_params, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_MANAGER_APPROVED)
        self.assertEqual(pr.approved_amount, Decimal('45000.00'))
        self.assertEqual(pr.cost_center, 'CC-IT-2026-Q3')
        self.assertTrue(pr.budget_available)

    def test_workflow_6_employee_tl_approve_manager_recommend_finance(self):
        """Workflow: Employee -> Team Lead Approve -> Manager Recommend to Finance -> Finance Review"""
        pr = self._create_employee_request(amount="150000.00")

        # TL Approves
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        # Manager Recommends to Finance
        self.client.force_authenticate(user=self.manager)
        res = self.client.post(
            f'/api/manager/requests/{pr.id}/recommend-finance/',
            {'comments': 'Exceeds manager operational threshold. Forwarded to Finance.'},
            format='json'
        )
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_FINANCE_REVIEW)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_FINANCE)

        # Finance user checks queue
        self.client.force_authenticate(user=self.finance)
        fin_res = self.client.get('/api/finance/requests/')
        self.assertEqual(fin_res.status_code, status.HTTP_200_OK)
        results = fin_res.data if isinstance(fin_res.data, list) else fin_res.data.get('results', [])
        ids = [item['id'] for item in results]
        self.assertIn(pr.id, ids)

        # Verify recommendation details are returned by the Finance API
        fin_pr = next(item for item in results if item['id'] == pr.id)
        self.assertEqual(fin_pr['request_id'], pr.request_id)
        self.assertEqual(fin_pr['status'], 'FINANCE_REVIEW')
        self.assertEqual(fin_pr['recommendation_reason'], 'Exceeds manager operational threshold. Forwarded to Finance.')
        self.assertTrue(bool(fin_pr['recommended_by']))

    def test_workflow_7_finance_approve(self):
        """Workflow: Manager Recommend -> Finance Approve -> FINANCE_APPROVED"""
        pr = self._create_employee_request(amount="100000.00")
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        self.client.force_authenticate(user=self.manager)
        self.client.post(f'/api/manager/requests/{pr.id}/recommend-finance/', {'comments': 'Budget verified.'}, format='json')

        # Finance Approves
        self.client.force_authenticate(user=self.finance)
        res = self.client.post(f'/api/finance/requests/{pr.id}/approve/', {'comments': 'Fiscal sanction granted.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_FINANCE_APPROVED)
        self.assertEqual(pr.current_stage, 4)
        self.assertTrue(pr.approval_history.filter(action='FINANCE_APPROVE').exists())

    def test_workflow_8_finance_reject(self):
        """Workflow: Manager Recommend -> Finance Reject -> FINANCE_REJECTED"""
        pr = self._create_employee_request(amount="200000.00")
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        self.client.force_authenticate(user=self.manager)
        self.client.post(f'/api/manager/requests/{pr.id}/recommend-finance/', {'comments': 'Forwarded.'}, format='json')

        # Finance Rejects
        self.client.force_authenticate(user=self.finance)
        res = self.client.post(f'/api/finance/requests/{pr.id}/reject/', {'comments': 'Quarterly capex limit exceeded.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_FINANCE_REJECTED)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_NONE)
        self.assertTrue(pr.approval_history.filter(action='FINANCE_REJECT').exists())

    def test_workflow_9_finance_send_back(self):
        """Workflow: Manager Recommend -> Finance Send Back -> SENT_BACK"""
        pr = self._create_employee_request(amount="80000.00")
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')

        self.client.force_authenticate(user=self.manager)
        self.client.post(f'/api/manager/requests/{pr.id}/recommend-finance/', {'comments': 'Forwarded.'}, format='json')

        # Finance Sends Back
        self.client.force_authenticate(user=self.finance)
        res = self.client.post(f'/api/finance/requests/{pr.id}/send-back/', {'comments': 'Missing vendor tax declaration.'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK, res.data)

        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_SENT_BACK)
        self.assertEqual(pr.current_approval_level, PurchaseRequest.LEVEL_EMPLOYEE)
        self.assertEqual(pr.current_stage, 0)

    def test_manager_approve_rejects_duplicate_approval_for_same_request(self):
        """A manager can only approve a request once, even if the same API is called again."""
        pr = self._create_employee_request(amount="120000.00")

        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', {'comments': 'Approved by Team Lead.'}, format='json')

        self.client.force_authenticate(user=self.manager)
        first = self.client.post(
            f'/api/manager/requests/{pr.id}/approve/',
            {'comments': 'Approved by Manager.', 'approved_amount': '120000.00'},
            format='json'
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)

        repeat = self.client.post(
            f'/api/manager/requests/{pr.id}/approve/',
            {'comments': 'Duplicate approval attempt.', 'approved_amount': '120000.00'},
            format='json'
        )
        self.assertEqual(repeat.status_code, status.HTTP_409_CONFLICT, repeat.data)
        self.assertIn('already been completed', str(repeat.data.get('error', '')).lower())

    def test_team_lead_mock_payment_rejects_duplicate_execution(self):
        """Mock payment can be processed only once per request; a second execution must be rejected."""
        pr = self._create_employee_request(amount="95000.00")
        pr.status = PurchaseRequest.STATUS_PAYMENT_APPROVED
        pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD
        pr.current_stage = 5
        pr.request_type = 'New Purchase'
        pr.category = 'Software & SaaS'
        pr.assigned_team_lead = self.team_lead
        pr.save(update_fields=['status', 'current_approval_level', 'current_stage', 'request_type', 'category', 'assigned_team_lead'])

        self.client.force_authenticate(user=self.team_lead)
        first = self.client.post(
            f'/api/team-lead/requests/{pr.id}/mock-payment/',
            {
                'payment_reference': 'MOCK-PAY-001',
                'amount': '95000.00',
                'payment_method': 'UPI',
                'notes': 'Initial mock payment.'
            },
            format='json'
        )
        self.assertEqual(first.status_code, status.HTTP_200_OK, first.data)

        repeat = self.client.post(
            f'/api/team-lead/requests/{pr.id}/mock-payment/',
            {
                'payment_reference': 'MOCK-PAY-002',
                'amount': '95000.00',
                'payment_method': 'UPI',
                'notes': 'Duplicate attempt.'
            },
            format='json'
        )
        self.assertEqual(repeat.status_code, status.HTTP_409_CONFLICT, repeat.data)
        self.assertIn('already been processed', str(repeat.data.get('error', '')).lower())
        self.assertTrue(pr.approval_history.filter(action='SEND_BACK').exists())

    def test_workflow_10_admin_sees_complete_history(self):
        """Workflow: Admin sees complete audit history across all transitions"""
        pr = self._create_employee_request(amount="95000.00")
        self.client.force_authenticate(user=self.team_lead)
        self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', {'comments': 'TL OK'}, format='json')

        self.client.force_authenticate(user=self.manager)
        self.client.post(f'/api/manager/requests/{pr.id}/recommend-finance/', {'comments': 'Manager OK'}, format='json')

        self.client.force_authenticate(user=self.finance)
        self.client.post(f'/api/finance/requests/{pr.id}/approve/', {'comments': 'Finance OK'}, format='json')

        # Admin checks
        self.client.force_authenticate(user=self.admin)
        res = self.client.get(f'/api/requests/{pr.id}/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        history = res.data.get('approval_history', [])
        actions = [h['action'] for h in history]
        self.assertIn('CREATE', actions)
        self.assertIn('APPROVE', actions)
        self.assertIn('RECOMMEND_FINANCE', actions)
        self.assertIn('FINANCE_APPROVE', actions)

    def test_security_guards_and_shortcuts_blocked(self):
        """Security: shortcuts and unauthorized cross-role actions must be rejected"""
        pr = self._create_employee_request()

        # 1. Manager CANNOT approve before Team Lead reviews
        self.client.force_authenticate(user=self.manager)
        mgr_res = self.client.post(f'/api/manager/requests/{pr.id}/approve/', format='json')
        self.assertEqual(mgr_res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('bypass', mgr_res.data['error'].lower())

        # 2. Team Lead CANNOT perform Manager actions (e.g. recommend to finance)
        self.client.force_authenticate(user=self.team_lead)
        tl_mgr_res = self.client.post(f'/api/manager/requests/{pr.id}/recommend-finance/', {'comments': 'Illegal shortcut'}, format='json')
        self.assertEqual(tl_mgr_res.status_code, status.HTTP_403_FORBIDDEN)

        # 3. Employee CANNOT approve or reject
        self.client.force_authenticate(user=self.employee)
        emp_act_res = self.client.post(f'/api/team-lead/requests/{pr.id}/approve/', format='json')
        self.assertEqual(emp_act_res.status_code, status.HTTP_403_FORBIDDEN)
