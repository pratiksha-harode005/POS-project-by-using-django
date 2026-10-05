from decimal import Decimal
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.users.models import User, Department
from apps.request_management.models import PurchaseRequest, ApprovalHistory, ApprovalStep
from apps.request_management.serializers import PurchaseRequestSerializer


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

    def _create_renewal_request(self, amount="12000.00"):
        pr = self._create_employee_request(title="Renewal: Acme SaaS", amount=amount)
        pr.category = 'Software & SaaS'
        pr.request_type = 'Renewal'
        pr.request_operation = 'RENEWAL'
        pr.status = PurchaseRequest.STATUS_MANAGER_REVIEW
        pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
        pr.current_stage = 3
        pr.assigned_team_lead = self.team_lead
        pr.save(update_fields=[
            'category', 'request_type', 'request_operation', 'status',
            'current_approval_level', 'current_stage', 'assigned_team_lead'
        ])
        return pr

    def test_request_amount_falls_back_when_estimated_cost_is_zero(self):
        pr = self._create_employee_request(amount='100000.00')
        PurchaseRequest.objects.filter(pk=pr.pk).update(total_estimated_cost=Decimal('0.00'))
        pr.refresh_from_db()

        data = PurchaseRequestSerializer(pr).data

        self.assertEqual(data['amount'], 100000.0)
        self.assertEqual(data['requested_amount'], 100000.0)

    def test_admin_approval_does_not_replace_request_amount_with_zero(self):
        pr = self._create_employee_request(amount='100000.00')
        PurchaseRequest.objects.filter(pk=pr.pk).update(total_estimated_cost=Decimal('0.00'))
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(
            f'/api/admin/requests/{pr.id}/approve/',
            {'approved_amount': 0, 'comments': 'Approved.'},
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        pr.refresh_from_db()
        self.assertEqual(pr.requested_amount, Decimal('100000.00'))
        self.assertEqual(pr.approved_amount, Decimal('100000.00'))
        self.assertEqual(response.data['amount'], 100000.0)

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

    def test_subscription_renewal_can_be_paid_after_manager_approval_or_recommended_to_finance(self):
        pr = self._create_renewal_request()

        self.client.force_authenticate(user=self.finance)
        premature_finance_approval = self.client.post(
            f'/api/finance/requests/{pr.id}/approve/',
            {'approved_amount': '12000.00'},
            format='json'
        )
        self.assertEqual(premature_finance_approval.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.team_lead)
        premature_payment = self.client.post(
            f'/api/team-lead/requests/{pr.id}/mock-payment/',
            {'payment_method': 'Corporate Card'},
            format='json'
        )
        self.assertEqual(premature_payment.status_code, status.HTTP_400_BAD_REQUEST)
        pr.refresh_from_db()
        self.assertEqual(pr.status, PurchaseRequest.STATUS_MANAGER_REVIEW)

        self.client.force_authenticate(user=self.manager)
        manager_approval = self.client.post(
            f'/api/manager/requests/{pr.id}/approve/',
            {'approved_amount': '12000.00', 'comments': 'Renewal approved for Finance review.'},
            format='json'
        )
        self.assertEqual(manager_approval.status_code, status.HTTP_200_OK, manager_approval.data)
        self.assertEqual(manager_approval.data['status'], PurchaseRequest.STATUS_MANAGER_APPROVED)
        self.assertTrue(manager_approval.data['can_pay_mock'])

        manager_recommendation = self.client.post(
            f'/api/manager/requests/{pr.id}/recommend-finance/',
            {'comments': 'Please review this subscription renewal.'},
            format='json'
        )
        self.assertEqual(manager_recommendation.status_code, status.HTTP_200_OK, manager_recommendation.data)
        self.assertEqual(manager_recommendation.data['status'], PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE)
        self.assertFalse(manager_recommendation.data['can_pay_mock'])

        self.client.force_authenticate(user=self.finance)
        finance_approval = self.client.post(
            f'/api/finance/requests/{pr.id}/approve/',
            {'approved_amount': '12000.00', 'comments': 'Renewal approved by Finance.'},
            format='json'
        )
        self.assertEqual(finance_approval.status_code, status.HTTP_200_OK, finance_approval.data)
        self.assertEqual(finance_approval.data['status'], PurchaseRequest.STATUS_FINANCE_APPROVED)
        self.assertTrue(finance_approval.data['can_pay_mock'])

        self.client.force_authenticate(user=self.team_lead)
        mock_payment = self.client.post(
            f'/api/team-lead/requests/{pr.id}/mock-payment/',
            {
                'payment_reference': 'RENEWAL-MOCK-01',
                'amount': '12000.00',
                'payment_method': 'Corporate Card',
            },
            format='json'
        )
        self.assertEqual(mock_payment.status_code, status.HTTP_200_OK, mock_payment.data)
        self.assertEqual(mock_payment.data['status'], PurchaseRequest.STATUS_PAYMENT_PROCESSED)

        justification = self.client.post(
            f'/api/team-lead/requests/{pr.id}/submit-justification/',
            {
                'purchase_type': 'Renewal',
                'actual_purchase_amount': '12000.00',
                'payment_reference': 'RENEWAL-MOCK-01',
                'confirmation_checked': True,
            },
            format='json'
        )
        self.assertEqual(justification.status_code, status.HTTP_200_OK, justification.data)
        self.assertEqual(justification.data['status'], PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED)

        self.client.force_authenticate(user=self.manager)
        verification = self.client.post(
            f'/api/manager/requests/{pr.id}/verify-justification/',
            {'notes': 'Renewal payment justification verified.'},
            format='json'
        )
        self.assertEqual(verification.status_code, status.HTTP_200_OK, verification.data)
        self.assertEqual(
            verification.data['status'],
            PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT
        )

        self.client.force_authenticate(user=self.team_lead)
        acknowledgement = self.client.post(
            f'/api/team-lead/requests/{pr.id}/acknowledge/',
            {'comments': 'Renewal received and acknowledged.'},
            format='json'
        )
        self.assertEqual(acknowledgement.status_code, status.HTTP_200_OK, acknowledgement.data)
        self.assertEqual(acknowledgement.data['status'], PurchaseRequest.STATUS_REQUEST_COMPLETED)
        self.assertEqual(acknowledgement.data['current_stage'], 10)

        timeline = acknowledgement.data['timeline']
        self.assertEqual(
            [step['title'] for step in timeline],
            [
                'Renewal Request', 'Manager Review', 'Recommended to Finance',
                'Finance Review', 'Finance Approved', 'Payment Processed',
                'Payment Justification Submitted', 'Manager Verified',
                'Awaiting Team Lead Acknowledgement', 'Request Completed',
            ]
        )

    def test_legacy_approval_endpoint_preserves_renewal_manager_finance_sequence(self):
        pr = self._create_renewal_request()

        self.client.force_authenticate(user=self.manager)
        manager_approval = self.client.post(
            f'/api/requests/{pr.id}/process_approval/',
            {'action': 'APPROVE', 'notes': 'Manager approval.'},
            format='json'
        )
        self.assertEqual(manager_approval.status_code, status.HTTP_200_OK, manager_approval.data)
        self.assertEqual(manager_approval.data['status'], PurchaseRequest.STATUS_MANAGER_APPROVED)
        self.assertEqual(manager_approval.data['current_stage'], 4)

        self.client.force_authenticate(user=self.finance)
        premature_approval = self.client.post(
            f'/api/requests/{pr.id}/process_approval/',
            {'action': 'APPROVE', 'notes': 'Must not bypass recommendation.'},
            format='json'
        )
        self.assertEqual(premature_approval.status_code, status.HTTP_400_BAD_REQUEST)

        self.client.force_authenticate(user=self.manager)
        recommendation = self.client.post(
            f'/api/requests/{pr.id}/process_approval/',
            {'action': 'RECOMMEND', 'notes': 'Forwarded to Finance.'},
            format='json'
        )
        self.assertEqual(recommendation.status_code, status.HTTP_200_OK, recommendation.data)
        self.assertEqual(recommendation.data['status'], PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE)
        self.assertEqual(recommendation.data['current_stage'], 6)

        self.client.force_authenticate(user=self.finance)
        finance_approval = self.client.post(
            f'/api/requests/{pr.id}/process_approval/',
            {'action': 'APPROVE', 'notes': 'Finance approval.'},
            format='json'
        )
        self.assertEqual(finance_approval.status_code, status.HTTP_200_OK, finance_approval.data)
        self.assertEqual(finance_approval.data['status'], PurchaseRequest.STATUS_FINANCE_APPROVED)
        self.assertEqual(finance_approval.data['current_stage'], 7)

    def test_manager_approved_renewal_and_upgrade_are_payable_by_team_lead(self):
        for operation in ('RENEWAL', 'UPGRADE'):
            with self.subTest(operation=operation):
                pr = self._create_employee_request(
                    title=f'{operation.title()}: Acme SaaS',
                    amount='12000.00'
                )
                pr.category = 'Software & SaaS'
                pr.request_type = operation.title()
                pr.request_operation = operation
                pr.status = PurchaseRequest.STATUS_MANAGER_REVIEW
                pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
                pr.current_stage = 3
                pr.assigned_team_lead = self.team_lead
                pr.save(update_fields=[
                    'category', 'request_type', 'request_operation', 'status',
                    'current_approval_level', 'current_stage', 'assigned_team_lead'
                ])

                self.client.force_authenticate(user=self.manager)
                approval = self.client.post(
                    f'/api/manager/requests/{pr.id}/approve/',
                    {'approved_amount': '12000.00', 'comments': f'{operation.title()} approved.'},
                    format='json'
                )
                self.assertEqual(approval.status_code, status.HTTP_200_OK, approval.data)
                self.assertEqual(approval.data['status'], PurchaseRequest.STATUS_MANAGER_APPROVED)

                self.client.force_authenticate(user=self.team_lead)
                team_lead_request = self.client.get(f'/api/team-lead/requests/{pr.id}/')
                self.assertEqual(team_lead_request.status_code, status.HTTP_200_OK, team_lead_request.data)
                self.assertTrue(team_lead_request.data['can_pay_mock'])

                payment = self.client.post(
                    f'/api/team-lead/requests/{pr.id}/mock-payment/',
                    {
                        'payment_reference': f'{operation}-TEST-01',
                        'amount': '12000.00',
                        'payment_method': 'Corporate Card',
                    },
                    format='json'
                )
                self.assertEqual(payment.status_code, status.HTTP_200_OK, payment.data)
                self.assertEqual(payment.data['status'], PurchaseRequest.STATUS_PAYMENT_PROCESSED)

    def test_finance_admin_recommendation_step_survives_admin_approval(self):
        pr = self._create_employee_request(amount='75000.00')
        pr.category = 'Software & SaaS'
        pr.flow_type = 'B'
        pr.save(update_fields=['category', 'flow_type'])
        self.client.force_authenticate(user=self.finance)
        recommendation = self.client.post(
            f'/api/finance/requests/{pr.id}/recommend-admin/',
            {'reason': 'Exceeds Finance delegated authority.', 'comments': 'Executive review is required.'},
            format='json'
        )
        self.assertEqual(recommendation.status_code, status.HTTP_200_OK, recommendation.data)

        step = ApprovalStep.objects.get(request=pr, role='FINANCE', decision='RECOMMEND')
        self.assertEqual(step.actor, self.finance)
        self.assertIn('Exceeds Finance delegated authority.', step.notes)
        self.assertIn('Executive review is required.', step.notes)
        self.assertIsNotNone(step.created_at)

        self.client.force_authenticate(user=self.admin)
        admin_approval = self.client.post(
            f'/api/admin/requests/{pr.id}/approve/',
            {'comments': 'Approved after executive review.'},
            format='json'
        )
        self.assertEqual(admin_approval.status_code, status.HTTP_200_OK, admin_approval.data)

        self.client.force_authenticate(user=self.finance)
        refreshed_request = self.client.get(f'/api/finance/requests/{pr.id}/')
        self.assertEqual(refreshed_request.status_code, status.HTTP_200_OK, refreshed_request.data)
        persisted_step = next(
            item for item in refreshed_request.data['approval_steps']
            if item['decision'] == 'RECOMMEND' and item['role'] == 'FINANCE'
        )
        self.assertEqual(persisted_step['actor'], self.finance.id)
        self.assertEqual(persisted_step['notes'], step.notes)
        self.assertIn(refreshed_request.data['status'], [PurchaseRequest.STATUS_ADMIN_APPROVED, PurchaseRequest.STATUS_APPROVED])

    def test_finance_admin_recommendation_requires_written_reason(self):
        pr = self._create_employee_request(amount='75000.00')
        self.client.force_authenticate(user=self.finance)
        response = self.client.post(
            f'/api/finance/requests/{pr.id}/recommend-admin/',
            {'reason': ' ', 'comments': ' '},
            format='json'
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST, response.data)
        self.assertFalse(ApprovalStep.objects.filter(request=pr, role='FINANCE', decision='RECOMMEND').exists())
