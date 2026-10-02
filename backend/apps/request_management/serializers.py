from rest_framework import serializers
from .models import (
    PurchaseRequest, ApprovalStep, ApprovalHistory, RejectionReason,
    ManagerResearchEstimation, PaymentJustification
)
from apps.users.serializers import UserSerializer, DepartmentSerializer


class RejectionReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = RejectionReason
        fields = '__all__'


class ApprovalHistorySerializer(serializers.ModelSerializer):
    performed_by_detail = UserSerializer(source='performed_by', read_only=True)
    timestamp = serializers.DateTimeField(source='created_at', read_only=True)

    class Meta:
        model = ApprovalHistory
        fields = [
            'id', 'action', 'performed_by', 'performed_by_detail',
            'user_role', 'previous_status', 'new_status', 'comments',
            'approved_amount', 'cost_center', 'budget_available', 'vendor',
            'created_at', 'timestamp'
        ]
        read_only_fields = fields


class ApprovalStepSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source='actor', read_only=True)
    reason_detail = RejectionReasonSerializer(source='reason', read_only=True)

    class Meta:
        model = ApprovalStep
        fields = '__all__'


class ManagerResearchEstimationSerializer(serializers.ModelSerializer):
    researched_by_detail = UserSerializer(source='researched_by', read_only=True)

    class Meta:
        model = ManagerResearchEstimation
        fields = '__all__'
        read_only_fields = ['id', 'request', 'created_at', 'updated_at']


class PaymentJustificationSerializer(serializers.ModelSerializer):
    submitted_by_detail = UserSerializer(source='submitted_by', read_only=True)
    verified_by_detail = UserSerializer(source='verified_by', read_only=True)
    invoice_file_url = serializers.SerializerMethodField()
    quote_file_url = serializers.SerializerMethodField()
    receipt_file_url = serializers.SerializerMethodField()
    supporting_doc_url = serializers.SerializerMethodField()

    class Meta:
        model = PaymentJustification
        fields = '__all__'

    def get_invoice_file_url(self, obj):
        return obj.invoice_file.url if obj.invoice_file else None

    def get_quote_file_url(self, obj):
        return obj.quote_file.url if obj.quote_file else None

    def get_receipt_file_url(self, obj):
        return obj.receipt_file.url if obj.receipt_file else None

    def get_supporting_doc_url(self, obj):
        return obj.supporting_doc.url if obj.supporting_doc else None


def determine_final_approval_by(obj, histories=None):
    """
    Determines which portal provided (or will provide) the final approval for software requests:
    Returns 'MANAGER', 'FINANCE', or 'ADMIN'.

    PERFORMANCE: accepts an optional pre-cached `histories` list to avoid re-querying
    the prefetched approval_history relation multiple times per serializer call.
    """
    extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
    if extra.get('final_approval_by') in ['MANAGER', 'FINANCE', 'ADMIN']:
        # But if it's a renewal/upgrade, manager cannot be final approver
        if extra['final_approval_by'] == 'MANAGER' and obj.request_operation in ['RENEWAL', 'UPGRADE']:
            return 'FINANCE'
        return extra['final_approval_by']

    if obj.request_operation in ['RENEWAL', 'UPGRADE']:
        return 'FINANCE'

    # Use pre-cached histories list if provided, otherwise fetch once.
    # Using list() on the prefetch cache avoids duplicate DB hits.
    if histories is None:
        histories = list(obj.approval_history.all())
    actions = [h.action for h in histories]

    # Did Admin give approval?
    if 'ADMIN_APPROVE' in actions or any(h.action == 'APPROVE' and h.user_role == 'ADMIN' for h in histories):
        return 'ADMIN'

    # Did Finance give approval?
    if any(h.action in ['FINANCE_APPROVE', 'FINANCE_APPROVED'] or (h.action == 'APPROVE' and h.user_role == 'FINANCE') for h in histories):
        if not any(h.action in ['RECOMMEND_ADMIN', 'FINANCE_RECOMMEND_ADMIN'] for h in histories):
            return 'FINANCE'

    # Did Manager give approval?
    if any(h.action in ['MANAGER_APPROVE'] or (h.action == 'APPROVE' and h.user_role == 'MANAGER') for h in histories):
        if not any(h.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND'] for h in histories):
            return 'MANAGER'

    st = (obj.status or '').upper()

    if st in ['ADMIN_APPROVED']:
        return 'ADMIN'
    if st in ['FINANCE_APPROVED']:
        return 'FINANCE'
    if st in ['MANAGER_APPROVED']:
        return 'MANAGER'

    # Pre-approval queues:
    if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN', 'ADMIN_REVIEW', 'ADMIN_RESEARCH'] or any(h.action in ['RECOMMEND_ADMIN', 'FINANCE_RECOMMEND_ADMIN'] for h in histories):
        return 'ADMIN'

    if st in ['RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'FINANCE_RECOMMENDED', 'SENT_TO_FINANCE', 'FINANCE_REVIEW', 'FINANCE_RESEARCH', 'COST_ESTIMATION', 'FINANCE_REPORT'] or any(h.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND'] for h in histories):
        return 'FINANCE'

    # Check post-approval recommendation history:
    if any(h.action in ['RECOMMEND_ADMIN', 'FINANCE_RECOMMEND_ADMIN'] for h in histories):
        return 'ADMIN'
    if any(h.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND'] for h in histories):
        return 'FINANCE'

    return 'MANAGER'


class PurchaseRequestSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    assigned_team_lead_detail = UserSerializer(source='assigned_team_lead', read_only=True)
    assigned_manager_detail = UserSerializer(source='assigned_manager', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    approval_history = ApprovalHistorySerializer(many=True, read_only=True)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    research_estimation = ManagerResearchEstimationSerializer(read_only=True)
    payment_justification_detail = PaymentJustificationSerializer(source='payment_justification', read_only=True)
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recommendation_reason = serializers.SerializerMethodField()
    recommended_by = serializers.SerializerMethodField()
    recommended_date = serializers.SerializerMethodField()
    finance_status = serializers.SerializerMethodField()
    finance_approved_by = serializers.SerializerMethodField()
    finance_comment = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()
    currently_with = serializers.SerializerMethodField()
    can_pay_mock = serializers.SerializerMethodField()
    is_payment_eligible = serializers.SerializerMethodField()
    can_acknowledge = serializers.SerializerMethodField()
    is_awaiting_acknowledgement = serializers.SerializerMethodField()
    final_approval_by = serializers.SerializerMethodField()
    approval_path = serializers.SerializerMethodField()
    renewal_eligibility = serializers.SerializerMethodField()
    recommended_portal = serializers.SerializerMethodField()

    class Meta:
        model = PurchaseRequest
        fields = '__all__'
        read_only_fields = [
            'request_id', 'created_by', 'status', 'current_approval_level',
            'current_stage', 'created_at', 'updated_at'
        ]
        extra_kwargs = {
            'department': {'required': False, 'allow_null': True}
        }

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        # For Renewal/Upgrade requests: guarantee original Estimated Cost is populated from initial request
        is_renewal_or_upgrade = (
            getattr(instance, 'request_operation', '') in ['RENEWAL', 'UPGRADE'] or
            bool(getattr(instance, 'original_request_id', None)) or
            bool(getattr(instance, 'parent_request_id', None)) or
            any((instance.title or '').upper().startswith(k) for k in ['RENEWAL:', 'UPGRADE:'])
        )
        if is_renewal_or_upgrade:
            root = getattr(instance, 'original_request', None) or getattr(instance, 'parent_request', None)
            orig_cost = None
            if root:
                orig_cost = (
                    root.total_estimated_cost or
                    root.requested_amount or
                    root.approved_amount or
                    (root.extra_fields.get('existingCost') if isinstance(root.extra_fields, dict) else None) or
                    (root.extra_fields.get('estimatedCost') if isinstance(root.extra_fields, dict) else None)
                )
                if not orig_cost and hasattr(root, 'payment_justification') and root.payment_justification:
                    orig_cost = (
                        root.payment_justification.requested_amount or
                        root.payment_justification.actual_purchase_amount or
                        root.payment_justification.final_payable_amount
                    )
            if not orig_cost:
                # Check instance extra fields or existing cost
                extra = instance.extra_fields if isinstance(instance.extra_fields, dict) else {}
                orig_cost = extra.get('original_estimated_cost') or extra.get('existingCost') or extra.get('estimatedCost') or instance.existing_cost

            if orig_cost:
                try:
                    num_val = float(orig_cost)
                    if num_val > 0:
                        ret['original_estimated_cost'] = num_val
                        curr_est = float(ret.get('total_estimated_cost') or 0)
                        curr_req = float(ret.get('requested_amount') or 0)
                        if curr_est <= 0:
                            ret['total_estimated_cost'] = num_val
                        if curr_req <= 0:
                            ret['requested_amount'] = num_val
                        if float(ret.get('existing_cost') or 0) <= 0:
                            ret['existing_cost'] = num_val
                        if isinstance(ret.get('extra_fields'), dict):
                            if not ret['extra_fields'].get('existingCost'):
                                ret['extra_fields']['existingCost'] = num_val
                            if not ret['extra_fields'].get('estimatedCost'):
                                ret['extra_fields']['estimatedCost'] = num_val
                            ret['extra_fields']['original_estimated_cost'] = num_val
                except Exception:
                    pass

            # Populate original payment justification from root request
            if root and hasattr(root, 'payment_justification') and root.payment_justification:
                if not hasattr(self, '_root_pj_cache'):
                    self._root_pj_cache = {}
                if root.id not in self._root_pj_cache:
                    self._root_pj_cache[root.id] = PaymentJustificationSerializer(root.payment_justification).data
                orig_pj_data = self._root_pj_cache[root.id]
                ret['original_payment_justification'] = orig_pj_data
                if not ret.get('payment_justification_detail'):
                    ret['payment_justification_detail'] = orig_pj_data
            elif isinstance(ret.get('extra_fields'), dict) and ret['extra_fields'].get('payment_justification'):
                ret['original_payment_justification'] = ret['extra_fields']['payment_justification']
                if not ret.get('payment_justification_detail'):
                    ret['payment_justification_detail'] = ret['extra_fields']['payment_justification']
        return ret

    def _get_cached_histories(self, obj):
        """
        Returns the prefetched approval_history list, caching it on the instance
        to avoid re-evaluating the prefetch cache on every SerializerMethodField call.
        This is the central fix for N+1 serializer queries.
        """
        cache_attr = '_serializer_histories_cache'
        if not hasattr(obj, cache_attr):
            # list() materialises the prefetch cache — subsequent calls hit Python memory, not DB
            setattr(obj, cache_attr, list(obj.approval_history.all()))
        return getattr(obj, cache_attr)

    def _get_cached_payments(self, obj):
        """Returns prefetched payments list, cached on the instance."""
        cache_attr = '_serializer_payments_cache'
        if not hasattr(obj, cache_attr):
            setattr(obj, cache_attr, list(obj.payments.all()))
        return getattr(obj, cache_attr)

    def _get_cached_steps(self, obj):
        """Returns prefetched approval_steps list, cached on the instance.
        Fixes N+1: previously get_recommendation_reason/by/date each called
        obj.approval_steps.all() directly, issuing a fresh DB query per record."""
        cache_attr = '_serializer_steps_cache'
        if not hasattr(obj, cache_attr):
            setattr(obj, cache_attr, list(obj.approval_steps.all()))
        return getattr(obj, cache_attr)

    def get_can_pay_mock(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request and getattr(request.user, 'is_authenticated', False) else None

        if not obj.is_software:
            return False

        valid_statuses = [
            PurchaseRequest.STATUS_ADMIN_APPROVED,
            PurchaseRequest.STATUS_PAYMENT_APPROVED,
            PurchaseRequest.STATUS_MANAGER_APPROVED,
            PurchaseRequest.STATUS_FINANCE_APPROVED,
            'ADMIN_APPROVED',
            'PAYMENT_APPROVED',
            'MANAGER_APPROVED',
            'FINANCE_APPROVED',
            PurchaseRequest.STATUS_APPROVED,
            'Approved',
        ]
        st = (obj.status or '').upper()
        if st not in [s.upper() for s in valid_statuses]:
            return False

        if user and getattr(user, 'role', '') != 'ADMIN':
            if obj.created_by_id != user.id and obj.assigned_team_lead_id != user.id:
                return False

        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        if extra.get('mock_payment_ref') or (obj.payment_status or '').upper() in ['PAID', 'MOCK_SUCCESS', 'SUCCESS']:
            return False

        already_paid_statuses = [
            'PAYMENT_PROCESSED',
            'PAYMENT_JUSTIFICATION_SUBMITTED',
            'PAYMENT_JUSTIFIED',
            'MANAGER_VERIFIED',
            'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT',
            'TEAM_LEAD_ACKNOWLEDGED',
            'REQUEST_COMPLETED',
            'COMPLETED',
            'TEAM_LEAD_CONFIRMED',
        ]
        if st in already_paid_statuses:
            return False

        # Use cached payments to avoid hitting DB again (payments was prefetch_related)
        if any((p.status or '').upper() in ['PAID', 'SUCCESS', 'MOCK_SUCCESS'] for p in self._get_cached_payments(obj)):
            return False

        amt = obj.approved_amount or obj.finance_approved_amount or obj.requested_amount or 0
        if amt <= 0:
            return False

        return True

    def get_is_payment_eligible(self, obj):
        return self.get_can_pay_mock(obj)

    def get_can_acknowledge(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request and getattr(request.user, 'is_authenticated', False) else None

        if not obj.is_software:
            return False

        st = (obj.status or '').upper()
        if st not in [
            'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT',
            'PAYMENT_JUSTIFIED',
            'MANAGER_VERIFIED',
        ]:
            return False

        if st in ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED']:
            return False

        # Request must have verified payment justification
        has_verified_justification = False
        if hasattr(obj, 'payment_justification') and obj.payment_justification and obj.payment_justification.verified_at:
            has_verified_justification = True
        elif isinstance(obj.extra_fields, dict) and obj.extra_fields.get('justification_verified_at'):
            has_verified_justification = True

        if not has_verified_justification:
            return False

        if user and getattr(user, 'role', '') != 'ADMIN':
            if obj.created_by_id != user.id and obj.assigned_team_lead_id != user.id:
                return False

        return True

    def get_is_awaiting_acknowledgement(self, obj):
        return self.get_can_acknowledge(obj)

    def get_currently_with(self, obj):
        st = (obj.status or '').upper()
        if st in ['COMPLETED', 'REQUEST_COMPLETED']:
            return 'Completed & Archived'
        if obj.is_software:
            if st in ['MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'PAYMENT_JUSTIFIED', 'MANAGER_VERIFIED']:
                return 'Team Lead — Final Acknowledgment Required'
            if st == 'PAYMENT_JUSTIFICATION_SUBMITTED':
                return 'Manager — Verifying Justification'
            if st == 'PAYMENT_PROCESSED':
                return 'Team Lead — Awaiting Payment Justification'
            if st in ['ADMIN_APPROVED', 'PAYMENT_APPROVED']:
                return 'Team Lead — Mock Payment Required'
            if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN', 'ADMIN_REVIEW']:
                return 'Admin Review — Executive Approval'
            if st in ['COST_ESTIMATION', 'PRE_ESTIMATION_COMPLETED', 'FINANCE_REPORT']:
                return 'Finance — Reviewing Cost Estimation'
            if st in ['FINANCE_RESEARCH', 'MANAGER_RESEARCHING']:
                return 'Finance Specialist — Research in Progress'
            if st in ['RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'FINANCE_RECOMMENDED', 'RECOMMENDED', 'FINANCE_REVIEW', 'SENT_TO_FINANCE']:
                return 'Finance Review — Recommended by Manager'
            if st in ['ADMIN_APPROVED', 'PAYMENT_APPROVED', 'MANAGER_APPROVED', 'FINANCE_APPROVED', 'APPROVED']:
                return 'Team Lead — Pay Now (Mock) Ready'
            if st in ['MANAGER_REVIEW', 'PENDING', 'TEAM_LEAD_SUBMITTED', 'DRAFT', 'CREATED']:
                return 'Project Manager — Sarah Manager'
            return 'Team Lead / Requester'
        else:
            if st in ['PENDING', 'MANAGER_REVIEW', 'TEAM_LEAD_SUBMITTED', 'DRAFT']:
                return 'Project Manager — Sarah Manager'
            if st in ['APPROVED', 'IN PROCUREMENT', 'IN_PROCUREMENT', 'RFQ_SENT']:
                return 'Sourcing Team (RFQ Sent)'
            if st in ['FINANCE_REVIEW', 'SENT_TO_FINANCE', 'RECOMMENDED_TO_FINANCE']:
                return 'Finance — Mark Finance Officer'
            if st in ['DELIVERED', 'DELIVERY']:
                return 'Accounts & Dock (Invoice & GRN Verification)'
            if st in ['INVOICED', 'INVOICE']:
                return 'Procurement Audit & Raise Ticket Verification'
            if st in ['PAYMENT_COMPLETED']:
                return 'Team Lead — Awaiting Confirmation'
            return 'Procurement Team'

    def get_timeline(self, obj):
        # Use cached histories — avoids re-fetching from DB on every SerializerMethodField call
        histories = sorted(
            self._get_cached_histories(obj),
            key=lambda h: h.created_at.isoformat() if getattr(h, 'created_at', None) else ''
        )

        def find_h(actions):
            if isinstance(actions, str):
                actions = [actions]
            return next((h for h in histories if h.action in actions), None)

        h_create = find_h(['CREATE'])
        h_rec_fin = find_h(['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND'])
        h_mgr_appr = find_h(['APPROVE', 'MANAGER_APPROVE'])
        h_fin_rev = find_h(['FINANCE_REVIEW', 'FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN', 'FINANCE_APPROVE'])
        h_fin_appr = find_h(['FINANCE_APPROVE', 'PAYMENT_APPROVED', 'APPROVE'])
        h_rec_admin = find_h(['FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN'])
        h_admin_rev = find_h(['ADMIN_REVIEW', 'ADMIN_APPROVE'])
        h_admin_appr = find_h(['ADMIN_APPROVE', 'PAYMENT_APPROVED'])
        h_mock_pay = find_h(['MOCK_PAYMENT', 'PAYMENT_PROCESSED', 'PAYMENT', 'PAYMENT_COMPLETED'])
        h_justification = find_h(['PAYMENT_JUSTIFICATION_SUBMITTED', 'SUBMIT_JUSTIFICATION', 'JUSTIFICATION_SUBMITTED'])
        h_verify_just = find_h(['MANAGER_VERIFIED', 'VERIFY_JUSTIFICATION', 'PAYMENT_JUSTIFIED', 'JUSTIFICATION_VERIFIED'])
        h_tl_ack = find_h(['TEAM_LEAD_ACKNOWLEDGE', 'ACKNOWLEDGE', 'TEAM_LEAD_ACKNOWLEDGED'])
        h_complete = find_h(['REQUEST_COMPLETED', 'COMPLETED'])

        st = (obj.status or '').upper()

        cat_lower = (obj.category or '').lower()
        title_lower = (obj.title or '').lower()
        is_software = (
            any(k in cat_lower for k in ['software', 'saas', 'cloud', 'license', 'subscription', 'digital', 'it services', 'cybersecurity']) or
            any(k in title_lower for k in ['software', 'saas', 'cloud', 'license', 'subscription', 'jira', 'slack', 'aws', 'azure']) or
            getattr(obj, 'flow_type', '') == 'B' or
            bool(getattr(obj, 'software_name', ''))
        )

        has_mock_payment = (
            bool(isinstance(obj.extra_fields, dict) and obj.extra_fields.get('mock_payment_ref')) or
            (obj.payment_status or '').upper() in ['PAID', 'MOCK_SUCCESS', 'SUCCESS'] or
            h_mock_pay is not None or
            st in ['PAYMENT_PROCESSED', 'PAYMENT_JUSTIFICATION_SUBMITTED', 'PAYMENT_JUSTIFIED', 'MANAGER_VERIFIED', 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'TEAM_LEAD_ACKNOWLEDGED', 'REQUEST_COMPLETED', 'COMPLETED'] or
            any((p.status or '').upper() in ['PAID', 'SUCCESS', 'MOCK_SUCCESS'] for p in self._get_cached_payments(obj))
        )

        if is_software:
            # Pass cached histories to avoid a 5th DB call per record
            path = determine_final_approval_by(obj, self._get_cached_histories(obj))
            if path == 'MANAGER':
                # PATH A — MANAGER FINAL APPROVAL (8 Stages):
                stages_info = [
                    (1, 'Request Created', 'Team Lead / Requester', h_create),
                    (2, 'Manager Review', 'Project Manager', find_h(['MANAGER_REVIEW', 'REVIEW', 'APPROVE', 'MANAGER_APPROVE']) or h_mgr_appr),
                    (3, 'Manager Approval', 'Project Manager', h_mgr_appr or find_h(['APPROVE', 'MANAGER_APPROVE'])),
                    (4, 'Payment Processed', 'System / Team Lead', h_mock_pay),
                    (5, 'Payment Justification Submitted', 'Team Lead', h_justification),
                    (6, 'Manager Verified', 'Project Manager', h_verify_just),
                    (7, 'Awaiting Team Lead Acknowledgement', 'Team Lead / Requester', h_tl_ack),
                    (8, 'Request Completed', 'Procurement System', h_complete if st in ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'] else None),
                ]
                if st in ['COMPLETED', 'REQUEST_COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED']:
                    completed_stage_threshold = 8
                elif st in ['MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'PAYMENT_JUSTIFIED', 'MANAGER_VERIFIED']:
                    completed_stage_threshold = 6
                elif st == 'PAYMENT_JUSTIFICATION_SUBMITTED':
                    completed_stage_threshold = 4
                elif st == 'PAYMENT_PROCESSED':
                    completed_stage_threshold = 3
                elif st in ['MANAGER_APPROVED', 'PAYMENT_APPROVED', 'APPROVED']:
                    completed_stage_threshold = 2
                elif st in ['MANAGER_REVIEW', 'TEAM_LEAD_SUBMITTED', 'PENDING', 'Pending', 'MANAGER_RESEARCHING', 'PRE_ESTIMATION_COMPLETED']:
                    completed_stage_threshold = 1
                elif st in ['CREATED', 'TEAM_LEAD_REVIEW', 'DRAFT']:
                    completed_stage_threshold = 0
                else:
                    completed_stage_threshold = 1

            elif path == 'FINANCE':
                # PATH B — FINANCE FINAL APPROVAL (10 Stages):
                stages_info = [
                    (1, 'Request Created', 'Team Lead / Requester', h_create),
                    (2, 'Manager Review', 'Project Manager', h_rec_fin or find_h(['MANAGER_REVIEW', 'REVIEW', 'APPROVE'])),
                    (3, 'Recommended to Finance', 'Project Manager', h_rec_fin),
                    (4, 'Finance Review', 'Finance Team', h_fin_rev or h_fin_appr),
                    (5, 'Finance Approved', 'Finance Team', h_fin_appr or find_h(['FINANCE_APPROVE', 'PAYMENT_APPROVED', 'APPROVE'])),
                    (6, 'Payment Processed', 'System / Team Lead', h_mock_pay),
                    (7, 'Payment Justification Submitted', 'Team Lead', h_justification),
                    (8, 'Manager Verified', 'Project Manager', h_verify_just),
                    (9, 'Awaiting Team Lead Acknowledgement', 'Team Lead / Requester', h_tl_ack),
                    (10, 'Request Completed', 'Procurement System', h_complete if st in ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'] else None),
                ]
                if st in ['COMPLETED', 'REQUEST_COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED']:
                    completed_stage_threshold = 10
                elif st in ['MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'PAYMENT_JUSTIFIED', 'MANAGER_VERIFIED']:
                    completed_stage_threshold = 8
                elif st == 'PAYMENT_JUSTIFICATION_SUBMITTED':
                    completed_stage_threshold = 6
                elif st == 'PAYMENT_PROCESSED':
                    completed_stage_threshold = 5
                elif st in ['FINANCE_APPROVED', 'PAYMENT_APPROVED', 'APPROVED']:
                    completed_stage_threshold = 4
                elif st in ['FINANCE_REVIEW', 'FINANCE_RESEARCH', 'COST_ESTIMATION', 'FINANCE_REPORT', 'PRE_ESTIMATION_COMPLETED']:
                    completed_stage_threshold = 3
                elif st in ['RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'FINANCE_RECOMMENDED', 'SENT_TO_FINANCE']:
                    completed_stage_threshold = 2
                elif st in ['MANAGER_REVIEW', 'TEAM_LEAD_SUBMITTED', 'PENDING', 'Pending']:
                    completed_stage_threshold = 1
                elif st in ['CREATED', 'TEAM_LEAD_REVIEW', 'DRAFT']:
                    completed_stage_threshold = 0
                else:
                    completed_stage_threshold = 1

            else:  # ADMIN
                # PATH C — ADMIN FINAL APPROVAL (12 Stages):
                stages_info = [
                    (1, 'Request Created', 'Team Lead / Requester', h_create),
                    (2, 'Manager Review', 'Project Manager', h_rec_fin or find_h(['MANAGER_REVIEW', 'REVIEW', 'APPROVE'])),
                    (3, 'Recommended to Finance', 'Project Manager', h_rec_fin),
                    (4, 'Finance Review', 'Finance Team', h_fin_rev or h_rec_admin),
                    (5, 'Recommended to Admin', 'Finance Team', h_rec_admin),
                    (6, 'Admin Review', 'Executive Administrator', h_admin_rev or h_admin_appr),
                    (7, 'Admin Approved / Final Approval', 'Executive Administrator / Manager', h_admin_appr or find_h(['ADMIN_APPROVE', 'PAYMENT_APPROVED', 'APPROVE'])),
                    (8, 'Payment Processed', 'System / Team Lead', h_mock_pay),
                    (9, 'Payment Justification Submitted', 'Team Lead', h_justification),
                    (10, 'Manager Verified', 'Project Manager', h_verify_just),
                    (11, 'Awaiting Team Lead Acknowledgement', 'Team Lead / Requester', h_tl_ack),
                    (12, 'Request Completed', 'Procurement System', h_complete if st in ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED'] else None),
                ]
                if st in ['COMPLETED', 'REQUEST_COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED']:
                    completed_stage_threshold = 12
                elif st in ['MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'PAYMENT_JUSTIFIED', 'MANAGER_VERIFIED']:
                    completed_stage_threshold = 10
                elif st == 'PAYMENT_JUSTIFICATION_SUBMITTED':
                    completed_stage_threshold = 8
                elif st == 'PAYMENT_PROCESSED':
                    completed_stage_threshold = 7
                elif st in ['ADMIN_APPROVED', 'PAYMENT_APPROVED', 'APPROVED']:
                    completed_stage_threshold = 6
                elif st in ['ADMIN_REVIEW', 'ADMIN_RESEARCH']:
                    completed_stage_threshold = 5
                elif st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
                    completed_stage_threshold = 4
                elif st in ['FINANCE_REVIEW', 'FINANCE_RESEARCH', 'COST_ESTIMATION', 'FINANCE_REPORT', 'PRE_ESTIMATION_COMPLETED']:
                    completed_stage_threshold = 3
                elif st in ['RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'FINANCE_RECOMMENDED', 'SENT_TO_FINANCE']:
                    completed_stage_threshold = 2
                elif st in ['MANAGER_REVIEW', 'TEAM_LEAD_SUBMITTED', 'PENDING', 'Pending']:
                    completed_stage_threshold = 1
                elif st in ['CREATED', 'TEAM_LEAD_REVIEW', 'DRAFT']:
                    completed_stage_threshold = 0
                else:
                    completed_stage_threshold = 1

        else:
            # Hardware stages (10 Stages)
            h_research = find_h(['RESEARCH_SAVED', 'MANAGER_RESEARCH'])
            h_estimation = find_h(['PRE_ESTIMATION_COMPLETED', 'COST_ESTIMATION'])
            h_fin_appr = find_h(['FINANCE_APPROVE'])
            h_payment = find_h(['PAYMENT_COMPLETED'])
            h_tl_conf = find_h(['TEAM_LEAD_CONFIRMED', 'COMPLETED', 'TEAM_LEAD_CONFIRM'])

            stages_info = [
                (1, 'Request Created', 'Team Lead', h_create),
                (2, 'Manager Review', 'Manager', None),
                (3, 'Manager Research', 'Manager', h_research),
                (4, 'Pre-Estimation Completed', 'Manager', h_estimation),
                (5, 'Manager Approved', 'Manager', h_mgr_appr),
                (6, 'Finance Review', 'Finance', None),
                (7, 'Finance Approved', 'Finance', h_fin_appr),
                (8, 'Payment Completed', 'Finance / Accounts', h_payment),
                (9, 'Team Lead Confirmation', 'Team Lead', h_tl_conf),
                (10, 'Request Completed', 'Procurement System', h_tl_conf if st in ['COMPLETED', 'REQUEST_COMPLETED'] else None),
            ]

            completed_stage_threshold = 1
            if st in ['COMPLETED', 'REQUEST_COMPLETED']:
                completed_stage_threshold = 10
            elif st in ['PAYMENT_COMPLETED', 'TEAM_LEAD_CONFIRMED']:
                completed_stage_threshold = 8
            elif st in ['FINANCE_APPROVED']:
                completed_stage_threshold = 7
            elif st in ['FINANCE_REVIEW', 'FINANCE_RECOMMENDED', 'RECOMMENDED_TO_FINANCE']:
                completed_stage_threshold = 5
            elif st in ['MANAGER_APPROVED']:
                completed_stage_threshold = 5
            elif st in ['PRE_ESTIMATION_COMPLETED', 'COST_ESTIMATION']:
                completed_stage_threshold = 4
            elif st in ['MANAGER_RESEARCHING', 'FINANCE_RESEARCH']:
                completed_stage_threshold = 3
            elif st in ['MANAGER_REVIEW', 'TEAM_LEAD_SUBMITTED', 'PENDING']:
                completed_stage_threshold = 1

        timeline_result = []
        for s_num, title, role, hist in stages_info:
            if s_num <= completed_stage_threshold:
                s_state = 'completed'
            elif s_num == completed_stage_threshold + 1:
                if st in ['REJECTED', 'FINANCE_REJECTED']:
                    s_state = 'rejected'
                elif st in ['SENT_BACK', 'RETURNED']:
                    s_state = 'returned'
                else:
                    s_state = 'current'
            else:
                s_state = 'pending'

            actor_name = ''
            timestamp = ''
            comments = ''
            if hist:
                actor_name = f"{hist.performed_by.first_name} {hist.performed_by.last_name}".strip() if hist.performed_by else hist.user_role
                timestamp = hist.created_at.isoformat() if hist.created_at else ''
                comments = hist.comments or ''
            elif s_num == 1 and obj.created_by:
                actor_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
                timestamp = obj.created_at.isoformat() if obj.created_at else ''
            elif title == 'Payment Processed' and has_mock_payment:
                extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
                actor_name = extra.get('mock_payment_processed_by') or (f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() if obj.created_by else 'Team Lead')
                timestamp = extra.get('mock_payment_date') or ''
                comments = f"Mock payment processed. Ref: {extra.get('mock_payment_ref', obj.payment_reference)}"
            elif title == 'Payment Justification Submitted' and hasattr(obj, 'payment_justification') and obj.payment_justification and obj.payment_justification.submitted_at:
                actor_name = obj.payment_justification.team_lead_name or (f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() if obj.created_by else 'Team Lead')
                timestamp = obj.payment_justification.submitted_at.isoformat()
                comments = f"Payment justification submitted for {obj.payment_justification.software_name}."
            elif title == 'Manager Verified' and hasattr(obj, 'payment_justification') and obj.payment_justification and obj.payment_justification.verified_at:
                actor_name = f"{obj.payment_justification.verified_by.first_name} {obj.payment_justification.verified_by.last_name}".strip() if obj.payment_justification.verified_by else 'Project Manager'
                timestamp = obj.payment_justification.verified_at.isoformat()
                comments = obj.payment_justification.manager_notes or 'Payment justification verified by Manager.'
            elif title == 'Awaiting Team Lead Acknowledgement' and s_state == 'current' and is_software:
                actor_name = f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() if obj.created_by else 'Team Lead'
                comments = 'Payment justification verified by Manager. Awaiting Team Lead final acknowledgment.'

            timeline_result.append({
                'stage': s_num,
                'title': title,
                'status': s_state,
                'role': role,
                'actor': actor_name,
                'timestamp': timestamp,
                'comments': comments
            })

        return timeline_result

    def get_final_approval_by(self, obj):
        return determine_final_approval_by(obj, self._get_cached_histories(obj))

    def get_approval_path(self, obj):
        return determine_final_approval_by(obj, self._get_cached_histories(obj))

    def get_recommendation_reason(self, obj):
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        st = (obj.status or '').upper()
        if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
            if extra.get('finance_recommendation_reason'):
                return extra.get('finance_recommendation_reason')
            if extra.get('finance_comments'):
                return extra.get('finance_comments')
            histories = self._get_cached_histories(obj)
            h = next((x for x in histories if x.action in ['FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN']), None)
            if h and h.comments:
                return h.comments
        if extra.get('recommendation_reason'):
            return extra.get('recommendation_reason')
        histories = self._get_cached_histories(obj)
        h = next((x for x in histories if x.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND']), None)
        if h and h.comments:
            return h.comments
        # Use cached steps to avoid N+1
        steps = self._get_cached_steps(obj)
        step = next((x for x in steps if x.decision in ['RECOMMEND', 'RECOMMEND_ADMIN']), None)
        if step:
            return step.notes or (step.reason.text if getattr(step, 'reason', None) else '')
        return ''

    def get_recommended_by(self, obj):
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        st = (obj.status or '').upper()
        if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
            if extra.get('finance_recommended_by'):
                return extra.get('finance_recommended_by')
            histories = self._get_cached_histories(obj)
            h = next((x for x in histories if x.action in ['FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN']), None)
            if h and h.performed_by:
                name = f"{h.performed_by.first_name} {h.performed_by.last_name}".strip()
                return name or h.performed_by.username
        if extra.get('recommended_by'):
            return extra.get('recommended_by')
        histories = self._get_cached_histories(obj)
        h = next((x for x in histories if x.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND']), None)
        if h and h.performed_by:
            name = f"{h.performed_by.first_name} {h.performed_by.last_name}".strip()
            return name or h.performed_by.username
        # Use cached steps to avoid N+1
        steps = self._get_cached_steps(obj)
        step = next((x for x in steps if x.decision in ['RECOMMEND', 'RECOMMEND_ADMIN']), None)
        if step and step.actor:
            name = f"{step.actor.first_name} {step.actor.last_name}".strip()
            return name or step.actor.username
        return ''

    def get_recommended_date(self, obj):
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        st = (obj.status or '').upper()
        if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
            if extra.get('finance_recommended_date'):
                return extra.get('finance_recommended_date')
            histories = self._get_cached_histories(obj)
            h = next((x for x in histories if x.action in ['FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN']), None)
            if h and h.created_at:
                return h.created_at.isoformat()
        if extra.get('recommended_date'):
            return extra.get('recommended_date')
        histories = self._get_cached_histories(obj)
        h = next((x for x in histories if x.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND']), None)
        if h and h.created_at:
            return h.created_at.isoformat()
        # Use cached steps to avoid N+1
        steps = self._get_cached_steps(obj)
        step = next((x for x in steps if x.decision in ['RECOMMEND', 'RECOMMEND_ADMIN']), None)
        if step and step.created_at:
            return step.created_at.isoformat()
        return None

    def get_recommended_portal(self, obj):
        st = (obj.status or '').upper()
        if st in ['APPROVED', 'ADMIN_APPROVED', 'FINANCE_APPROVED', 'COMPLETED', 'REQUEST_COMPLETED', 'PAYMENT_PROCESSED']:
            return None
        if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
            return 'Finance Portal'
        if st in ['RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'RECOMMENDED', 'SENT_TO_FINANCE']:
            return 'Manager Portal'
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        if extra.get('finance_recommended_portal'):
            return extra.get('finance_recommended_portal')
        if extra.get('recommended_portal'):
            return extra.get('recommended_portal')
        histories = self._get_cached_histories(obj)
        if any(h.action in ['FINANCE_RECOMMEND_ADMIN', 'RECOMMEND_ADMIN'] for h in histories):
            return 'Finance Portal'
        if any(h.action in ['RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE', 'RECOMMEND'] for h in histories):
            return 'Manager Portal'
        return None

    def get_finance_status(self, obj):
        st = (obj.status or '').upper()
        if st in [
            'FINANCE_APPROVED', 'APPROVED', 'ADMIN_APPROVED', 'STATUS_ADMIN_APPROVED',
            'PAYMENT_PROCESSED', 'PAYMENT_JUSTIFICATION_SUBMITTED', 'PAYMENT_JUSTIFIED',
            'MANAGER_VERIFIED', 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT',
            'TEAM_LEAD_ACKNOWLEDGED', 'REQUEST_COMPLETED', 'COMPLETED', 'PAYMENT_COMPLETED'
        ]:
            return 'Approved'
        if st in ['FINANCE_REJECTED', 'REJECTED', 'ADMIN_REJECTED']:
            return 'Rejected'
        if st in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
            return 'Recommended to Admin'
        if st in ['RECOMMENDED_TO_FINANCE', 'FINANCE_REVIEW', 'FINANCE_RECOMMENDED', 'RECOMMENDED', 'SENT_TO_FINANCE']:
            return 'Awaiting Finance Action'
        if st in ['SENT_BACK', 'RETURNED']:
            return 'Sent Back'
        return None

    def get_renewal_eligibility(self, obj):
        # Short-circuit early: the vast majority of requests are not software or not completed,
        # so we can avoid extra DB queries on every list serialization.
        if not obj.is_software:
            return {'available': False, 'reason': 'Not a software request'}

        st = (obj.status or '').upper()
        if st not in ['REQUEST_COMPLETED', 'COMPLETED', 'TEAM_LEAD_ACKNOWLEDGED', 'PAYMENT_COMPLETED']:
            return {'available': False, 'reason': 'Request is not completed'}

        # Only for completed software requests do we inspect renewal eligibility
        root = getattr(obj, 'original_request', None) or obj
        root_id = root.id

        if not hasattr(self, '_descendants_cache'):
            self._descendants_cache = {}

        if root_id not in self._descendants_cache:
            if hasattr(root, '_prefetched_objects_cache') and 'all_descendants' in root._prefetched_objects_cache:
                children = list(root.all_descendants.all())
            elif hasattr(obj, '_prefetched_objects_cache') and 'all_descendants' in obj._prefetched_objects_cache and obj.id == root_id:
                children = list(obj.all_descendants.all())
            else:
                children = list(
                    PurchaseRequest.objects.filter(original_request_id=root_id)
                    .only('id', 'request_id', 'status', 'request_operation', 'renewal_sequence')
                    .order_by('renewal_sequence')
                )
            self._descendants_cache[root_id] = children
        else:
            children = self._descendants_cache[root_id]

        active_statuses = {
            'CREATED', 'MANAGER_REVIEW', 'FINANCE_REVIEW', 'ADMIN_REVIEW',
            'MANAGER_APPROVED', 'FINANCE_APPROVED', 'ADMIN_APPROVED',
            'PAYMENT_APPROVED', 'PAYMENT_PROCESSED', 'PAYMENT_JUSTIFICATION_SUBMITTED',
            'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT', 'PAYMENT_JUSTIFIED',
            'MANAGER_VERIFIED', 'TEAM_LEAD_REVIEW', 'PENDING', 'DRAFT', 'SUBMITTED'
        }

        latest_child = children[-1] if children else None
        if latest_child and latest_child.id != obj.id and obj.id == root.id:
            return {'available': False, 'reason': 'Not the latest subscription request'}

        active_child = next((c for c in children if (c.status or '').upper() in active_statuses), None)
        if active_child:
            return {'available': False, 'reason': 'An active renewal/upgrade is already in progress', 'active_request_id': active_child.request_id}

        pj = getattr(obj, 'payment_justification', None)
        if not pj:
            return {'available': True, 'reason': 'No dates found, but allowed'}

        end_date = pj.end_date
        if not end_date:
            return {'available': True, 'reason': 'No end date specified'}

        from django.utils import timezone
        now = timezone.now().date()
        days_until_expiry = (end_date - now).days if end_date else 0

        history = [{'id': root.id, 'request_id': root.request_id, 'operation': 'ORIGINAL', 'status': root.get_status_display()}]
        for c in children:
            history.append({'id': c.id, 'request_id': c.request_id, 'operation': c.request_operation, 'status': c.get_status_display()})

        base_res = {'subscription_end_date': str(end_date) if end_date else None, 'history': history}

        if end_date and days_until_expiry > 0:
            return {
                **base_res,
                'available': False,
                'reason': 'Renewal opens after subscription expiry',
                'renewal_eligible_date': str(end_date)
            }

        return {
            **base_res,
            'available': True,
            'reason': 'Eligible for renewal'
        }

    def get_finance_approved_by(self, obj):
        histories = self._get_cached_histories(obj)
        h = next((x for x in histories if x.action == 'FINANCE_APPROVE'), None)
        if h and h.performed_by:
            name = f"{h.performed_by.first_name} {h.performed_by.last_name}".strip()
            return name or h.performed_by.username
        return ''

    def get_finance_comment(self, obj):
        histories = self._get_cached_histories(obj)
        h = next((x for x in histories if x.action in ['FINANCE_APPROVE', 'FINANCE_REJECT', 'SEND_BACK']), None)
        if h:
            return h.comments
        return ''


class CreatePurchaseRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'request_id', 'status', 'current_approval_level', 'current_stage',
            'title', 'category', 'subcategory', 'description', 'quantity',
            'requested_amount', 'total_estimated_cost', 'department', 'delivery_location', 'priority',
            'required_by', 'vendor', 'preferred_vendor', 'justification', 'attachments',
            'request_type', 'software_name', 'current_plan', 'required_plan',
            'existing_cost', 'business_requirement', 'extra_fields',
            'created_at'
        ]
        read_only_fields = ['id', 'request_id', 'status', 'current_approval_level', 'current_stage', 'created_at']
        extra_kwargs = {
            'department': {'required': False, 'allow_null': True}
        }

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        dept_val = data.get('department')
        if dept_val is not None and not isinstance(dept_val, int):
            if str(dept_val).isdigit():
                data['department'] = int(dept_val)
            else:
                from apps.users.models import Department
                dept_str = str(dept_val).strip()
                dept = (
                    Department.objects.filter(name__iexact=dept_str).first() or
                    Department.objects.filter(name__icontains=dept_str.replace('&', '').strip().split()[0]).first() or
                    Department.objects.first()
                )
                data['department'] = dept.id if dept else None
        return super().to_internal_value(data)

    def validate_requested_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Requested amount cannot be negative.")
        return value


class SaveResearchSerializer(serializers.Serializer):
    market_pricing = serializers.CharField(required=False, allow_blank=True, default='')
    renewal_pricing = serializers.CharField(required=False, allow_blank=True, default='')
    upgrade_pricing = serializers.CharField(required=False, allow_blank=True, default='')
    available_plans = serializers.CharField(required=False, allow_blank=True, default='')
    license_pricing = serializers.CharField(required=False, allow_blank=True, default='')
    hardware_specs = serializers.CharField(required=False, allow_blank=True, default='')
    software_licensing = serializers.CharField(required=False, allow_blank=True, default='')
    vendor_quotation_ref = serializers.CharField(required=False, allow_blank=True, default='')
    subscription_terms = serializers.CharField(required=False, allow_blank=True, default='')
    tax_gst = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    discount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    cost_comparison = serializers.CharField(required=False, allow_blank=True, default='')
    business_value = serializers.CharField(required=False, allow_blank=True, default='')
    available_alternatives = serializers.CharField(required=False, allow_blank=True, default='')
    research_notes = serializers.CharField(required=False, allow_blank=True, default='')
    admin_comments = serializers.CharField(required=False, allow_blank=True, default='')


class SavePreEstimationSerializer(serializers.Serializer):
    current_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    recommended_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    currency = serializers.CharField(required=False, allow_blank=True, default='INR')
    tax_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    discount_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    final_estimated_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    estimated_unit_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, default=0.00)
    quantity_licenses = serializers.CharField(required=False, allow_blank=True, default='')
    cost_center = serializers.CharField(required=False, allow_blank=True, default='')
    budget_code = serializers.CharField(required=False, allow_blank=True, default='')
    vendor = serializers.CharField(required=False, allow_blank=True, default='')
    pricing_source = serializers.CharField(required=False, allow_blank=True, default='')
    quote_reference = serializers.CharField(required=False, allow_blank=True, default='')
    business_evaluation = serializers.CharField(required=False, allow_blank=True, default='')
    manager_comments = serializers.CharField(required=False, allow_blank=True, default='')
    admin_comments = serializers.CharField(required=False, allow_blank=True, default='')
    research_notes = serializers.CharField(required=False, allow_blank=True, default='')
    hardware_specs = serializers.CharField(required=False, allow_blank=True, default='')
    software_licensing = serializers.CharField(required=False, allow_blank=True, default='')
    is_completed = serializers.BooleanField(required=False, default=True)


class FinanceApproveActionSerializer(serializers.Serializer):
    finance_approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    cost_center = serializers.CharField(required=False, allow_blank=True, default='')
    budget_code = serializers.CharField(required=False, allow_blank=True, default='')
    budget_available = serializers.BooleanField(required=False, default=True)
    payment_method = serializers.CharField(required=False, allow_blank=True, default='Bank Transfer')
    comments = serializers.CharField(required=False, allow_blank=True, default='')


class ProcessPaymentActionSerializer(serializers.Serializer):
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    final_payable_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=True)
    payment_method = serializers.CharField(required=False, default='Bank Transfer')
    payment_reference = serializers.CharField(required=True, min_length=3)
    payment_date = serializers.DateField(required=False)
    payment_status = serializers.CharField(required=False, default='Paid')
    payment_remarks = serializers.CharField(required=False, allow_blank=True, default='')


class TeamLeadConfirmActionSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True, default='Confirmed by Team Lead.')


class TeamLeadActionSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True, default='')


class TeamLeadRejectOrSendBackSerializer(serializers.Serializer):
    comments = serializers.CharField(required=True, allow_blank=False, min_length=3)


class ManagerApproveSerializer(serializers.Serializer):
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    cost_center = serializers.CharField(required=False, allow_blank=True, default='')
    budget_code = serializers.CharField(required=False, allow_blank=True, default='')
    budget_available = serializers.BooleanField(required=False, default=True)
    vendor = serializers.CharField(required=False, allow_blank=True, default='')
    comments = serializers.CharField(required=False, allow_blank=True, default='')


class ManagerRejectSerializer(serializers.Serializer):
    comments = serializers.CharField(required=True, allow_blank=False, min_length=3)
    reason_id = serializers.IntegerField(required=False, allow_null=True)


class ManagerRecommendSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True, default='Recommended to Finance Department for financial review and approval.')
    reason_id = serializers.IntegerField(required=False, allow_null=True)


class ResubmitRequestSerializer(serializers.Serializer):
    title = serializers.CharField(required=False)
    description = serializers.CharField(required=False)
    quantity = serializers.IntegerField(required=False, min_value=1)
    requested_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    delivery_location = serializers.CharField(required=False, allow_blank=True)
    justification = serializers.CharField(required=False, allow_blank=True)
    comments = serializers.CharField(required=False, allow_blank=True, default='Request updated and resubmitted for review.')


class ApproveRejectActionSerializer(serializers.Serializer):
    """Legacy action serializer preserved for existing /process_approval/ action calls."""
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'RECOMMEND', 'RECOMMEND_ADMIN', 'RECOMMEND_TO_ADMIN', 'RETURN'])
    reason_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    cost_center = serializers.CharField(required=False, allow_blank=True)
    budget_available = serializers.BooleanField(required=False, default=True)
    vendor = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        action = data.get('action')
        reason_id = data.get('reason_id')
        notes = data.get('notes')
        if action in ['REJECT', 'RECOMMEND'] and not reason_id and not notes:
            raise serializers.ValidationError({"notes": f"Comments or reason required when action is {action}."})
        return data
