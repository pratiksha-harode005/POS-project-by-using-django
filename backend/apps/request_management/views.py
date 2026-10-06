import os
import datetime
from decimal import Decimal
from django.db import transaction, models
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound

from .models import (
    PurchaseRequest, ApprovalStep, ApprovalHistory, RejectionReason,
    ManagerResearchEstimation, PaymentJustification
)
from .serializers import (
    PurchaseRequestSerializer, CreatePurchaseRequestSerializer,
    ApprovalStepSerializer, ApprovalHistorySerializer, RejectionReasonSerializer,
    TeamLeadActionSerializer, TeamLeadRejectOrSendBackSerializer,
    ManagerApproveSerializer, ManagerRejectSerializer, ManagerRecommendSerializer,
    ResubmitRequestSerializer, ApproveRejectActionSerializer,
    SaveResearchSerializer, SavePreEstimationSerializer,
    FinanceApproveActionSerializer, ProcessPaymentActionSerializer,
    TeamLeadConfirmActionSerializer, PaymentJustificationSerializer,
    determine_final_approval_by
)
from apps.core.permissions import (
    IsTeamLeadRole, IsManagerRole, IsFinanceRole, IsAdminRole, IsEmployeeRole
)
from apps.notification_management.models import Notification
from apps.payment_management.models import Payment
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.vendor_management.models import Vendor
from apps.users.models import User, Department


ACTION_HISTORY_CODES = {
    'approve': ('APPROVE', 'FINANCE_APPROVE', 'ADMIN_APPROVE'),
    'reject': ('REJECT', 'FINANCE_REJECT', 'ADMIN_REJECT'),
    'send_back': ('SEND_BACK', 'ADMIN_RETURN'),
    'recommend_finance': ('RECOMMEND_FINANCE', 'MANAGER_RECOMMEND_FINANCE'),
    'recommend_admin': ('RECOMMEND_ADMIN', 'FINANCE_RECOMMEND_ADMIN'),
    'mock_payment': ('MOCK_PAYMENT',),
    'submit_justification': ('PAYMENT_JUSTIFICATION_SUBMITTED',),
    'verify_justification': ('MANAGER_VERIFIED', 'PAYMENT_JUSTIFIED'),
    'acknowledge': ('TEAM_LEAD_ACKNOWLEDGE', 'TEAM_LEAD_CONFIRM', 'TEAM_LEAD_CONFIRMED'),
    'process_payment': ('PAYMENT_COMPLETED', 'PAYMENT_PROCESSED', 'PROCESS_PAYMENT'),
}


def completed_action_response(pr, action, user_role=None):
    history = pr.approval_history.filter(action__in=ACTION_HISTORY_CODES[action])
    if user_role:
        history = history.filter(user_role__iexact=user_role)
    if history.exists():
        return Response(
            {'error': 'This action has already been completed for this request.'},
            status=status.HTTP_409_CONFLICT
        )
    return None


class RejectionReasonViewSet(viewsets.ModelViewSet):
    queryset = RejectionReason.objects.filter(is_active=True)
    serializer_class = RejectionReasonSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['reason_type']

    def get_queryset(self):
        self._ensure_default_reasons()
        qs = RejectionReason.objects.filter(is_active=True)
        r_type = self.request.query_params.get('reason_type')
        if r_type:
            qs = qs.filter(reason_type__iexact=r_type)
        return qs.order_by('id')

    def _ensure_default_reasons(self):
        if not RejectionReason.objects.exists():
            rejection_reasons = [
                "Budget not available",
                "Demand not justified",
                "Duplicate request",
                "Insufficient details provided",
                "Not aligned with department priorities",
            ]
            for r in rejection_reasons:
                RejectionReason.objects.get_or_create(text=r, reason_type='REJECT', defaults={'is_active': True})

            escalation_reasons = [
                "Requires Executive / Director-Level Approval",
                "Exceeds my approval budget",
                "High-value / strategic purchase",
                "Requires additional financial review",
                "Cross-department budget impact",
                "Needs policy exception",
            ]
            for r in escalation_reasons:
                RejectionReason.objects.get_or_create(text=r, reason_type='RECOMMEND', defaults={'is_active': True})


def get_purchase_request_by_pk_or_request_id(pk, for_update=False):
    """
    Safely retrieves a PurchaseRequest whether pk is an integer database ID
    or a business request_id string (e.g. 'PR-2026-001', 'REQ-001').
    """
    qs = PurchaseRequest.objects.select_for_update() if for_update else PurchaseRequest.objects
    pk_str = str(pk).strip()
    if pk_str.isdigit():
        pr = qs.filter(pk=int(pk_str)).first()
        if pr:
            return pr
    return qs.filter(request_id=pk_str).first()


def apply_request_type_filter(queryset, request):
    """
    Applies unified software / hardware filtering and newest-first ordering.

    PERFORMANCE: The Q filter is ordered fastest-to-slowest:
      1. flow_type='B'          -> uses pr_flowtype_status_idx (indexed, constant-time)
      2. software_name != ''     -> column scan but no LIKE
      3. category/subcategory icontains -> LIKE scans, hit last

    - ?type=software | ?category_type=software : Software / SaaS requests
    - ?type=hardware | ?category_type=hardware : Hardware / physical equipment requests
    - ?type=all | omitted       : All authorized requests (no extra filter)
    - Always orders newest first : ['-created_at', '-id']
    """
    params = getattr(request, 'query_params', getattr(request, 'GET', request if isinstance(request, dict) else {}))
    type_param = (
        params.get('type') or
        params.get('request_type') or
        params.get('category_type') or
        params.get('filter_type') or
        params.get('request_type_filter') or
        ''
    ).strip().lower()

    # Build the software Q object once -- reused for both branches
    software_q = (
        models.Q(flow_type='B') |                              # indexed -- fastest
        (~models.Q(software_name='') & models.Q(software_name__isnull=False)) |  # column scan, no LIKE
        models.Q(category__icontains='software') |             # LIKE scan below
        models.Q(category__icontains='saas') |
        models.Q(category__icontains='cloud') |
        models.Q(category__icontains='license') |
        models.Q(category__icontains='subscription') |
        models.Q(category__icontains='digital') |
        models.Q(subcategory__icontains='software') |
        models.Q(subcategory__icontains='saas') |
        models.Q(subcategory__icontains='license')
    )

    if type_param in ['software', 'saas']:
        queryset = queryset.filter(software_q)
    elif type_param in ['hardware', 'physical']:
        # Exclude software records -- use the same Q so logic is consistent
        queryset = queryset.filter(~software_q)
    # else: 'all' or omitted -- return unfiltered

    return queryset.order_by('-created_at', '-id')


def get_base_purchase_request_queryset():
    """
    Standard highly-optimized QuerySet for PurchaseRequest.
    Pre-selects all ForeignKey relations and prefetches approval history, steps, payments,
    and justifications required by PurchaseRequestSerializer while avoiding unused deep nested prefetches.
    """
    return PurchaseRequest.objects.select_related(
        'created_by',
        'created_by__department',
        'department',
        'assigned_team_lead',
        'assigned_team_lead__department',
        'assigned_manager',
        'assigned_manager__department',
        'payment_justification',
        'payment_justification__submitted_by',
        'payment_justification__verified_by',
        'research_estimation',
        'research_estimation__researched_by',
        'original_request',
        'original_request__department',
        'parent_request'
    ).prefetch_related(
        'approval_steps__actor',
        'approval_steps__reason',
        'approval_history__performed_by',
        'payments'
    ).all().order_by('-created_at', '-id')


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    """
    Core API ViewSet for Procurement Requests:
    - POST /api/requests/: Create a new request (Status: TEAM_LEAD_REVIEW)
    - GET /api/requests/: List requests based on user role and filters
    - GET /api/requests/{id}/: Retrieve single request details
    - POST /api/requests/{id}/resubmit/: Resubmit a SENT_BACK request
    - POST /api/requests/{id}/process_approval/: Unified approval action
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = []
    filterset_fields = ['status', 'priority', 'department', 'current_stage', 'current_approval_level']
    search_fields = ['request_id', 'title', 'category', 'description', 'vendor']
    ordering_fields = ['created_at', 'total_estimated_cost', 'priority', 'status', 'id', 'updated_at']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePurchaseRequestSerializer
        return PurchaseRequestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = get_base_purchase_request_queryset()

        if user and not user.is_anonymous:
            role = getattr(user, 'role', None)
            if role == 'EMPLOYEE':
                queryset = queryset.filter(created_by=user)
            elif role == 'VENDOR':
                queryset = queryset.filter(models.Q(current_stage__gte=4) | models.Q(status__in=['In Procurement', 'Completed', 'MANAGER_APPROVED']))
            elif role == 'TEAM_LEAD':
                if self.request.query_params.get('my_only') == 'true':
                    queryset = queryset.filter(created_by=user)
            elif role == 'FINANCE' or self.request.query_params.get('for_finance') == 'true' or self.request.query_params.get('role') == 'FINANCE':
                queryset = queryset.filter(
                    models.Q(status='Recommended') |
                    models.Q(status__icontains='FINANCE') |
                    models.Q(status__in=[
                        PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                        PurchaseRequest.STATUS_MANAGER_RECOMMENDED_TO_FINANCE,
                        PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                        PurchaseRequest.STATUS_FINANCE_REVIEW,
                        PurchaseRequest.STATUS_FINANCE_RESEARCH,
                        PurchaseRequest.STATUS_COST_ESTIMATION,
                        PurchaseRequest.STATUS_FINANCE_REPORT,
                        PurchaseRequest.STATUS_FINANCE_APPROVED,
                        PurchaseRequest.STATUS_PAYMENT_APPROVED,
                        PurchaseRequest.STATUS_PAYMENT_PROCESSED,
                        PurchaseRequest.STATUS_PAYMENT_COMPLETED,
                        PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                    ]) |
                    models.Q(approval_steps__decision__in=['RECOMMEND', 'RECOMMEND_FINANCE', 'FINANCE_APPROVE', 'RECOMMEND_ADMIN']) |
                    models.Q(approval_steps__role='FINANCE') |
                    models.Q(created_by__role='FINANCE') |
                    models.Q(created_by=user)
                ).distinct()

        # Handle hardware/software filters cleanly
        query_params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))
        wf_param = query_params.get('workflow_type') or query_params.get('workflowType')
        is_hw = query_params.get('is_hardware') or query_params.get('isHardware')
        is_sw = query_params.get('is_software') or query_params.get('isSoftware')

        if wf_param:
            if str(wf_param).upper() == 'HARDWARE':
                return apply_request_type_filter(queryset, {'type': 'hardware'})
            elif str(wf_param).upper() == 'SOFTWARE':
                return apply_request_type_filter(queryset, {'type': 'software'})
        if is_hw is not None and str(is_hw).lower() in ('true', '1', 'yes'):
            return apply_request_type_filter(queryset, {'type': 'hardware'})
        if is_sw is not None and str(is_sw).lower() in ('true', '1', 'yes'):
            return apply_request_type_filter(queryset, {'type': 'software'})

        return apply_request_type_filter(queryset, self.request)

    def get_object(self):
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg) or self.kwargs.get('pk')

        if not lookup_val:
            return super().get_object()

        obj = None
        if str(lookup_val).isdigit():
            obj = queryset.filter(models.Q(pk=lookup_val) | models.Q(request_id=lookup_val)).first()
            if not obj:
                obj = PurchaseRequest.objects.filter(models.Q(pk=lookup_val) | models.Q(request_id=lookup_val)).first()
        else:
            obj = queryset.filter(request_id=lookup_val).first()
            if not obj:
                obj = PurchaseRequest.objects.filter(request_id=lookup_val).first()

        if not obj:
            raise NotFound(detail=f"Purchase request '{lookup_val}' not found.")

        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('required_by') or str(data.get('required_by')).strip() == '':
            import datetime
            data['required_by'] = (datetime.date.today() + datetime.timedelta(days=14)).isoformat()
        if not data.get('delivery_location'):
            data['delivery_location'] = 'Pune HQ'
        if not data.get('priority'):
            data['priority'] = 'Medium'
        if not data.get('justification'):
            data['justification'] = data.get('description', 'Purchase requisition')

        cost_val = None
        for key in ['total_estimated_cost', 'estimated_cost', 'estimatedCost', 'amount', 'cost']:
            val = data.get(key)
            if val is not None and str(val).strip() != '':
                try:
                    parsed_cost = float(val)
                    if parsed_cost > 0:
                        cost_val = parsed_cost
                        break
                    elif cost_val is None:
                        cost_val = parsed_cost
                except (ValueError, TypeError):
                    pass

        if cost_val is not None:
            data['total_estimated_cost'] = cost_val

        dept_val = data.get('department')
        if dept_val:
            from apps.users.models import Department
            if isinstance(dept_val, str) and not dept_val.isdigit():
                dept_obj = Department.objects.filter(name__icontains=dept_val).first() or Department.objects.first()
                if dept_obj:
                    data['department'] = dept_obj.id
            elif isinstance(dept_val, int) or (isinstance(dept_val, str) and dept_val.isdigit()):
                data['department'] = int(dept_val)

        existing_id = data.get('id') or data.get('draft_id')
        if existing_id:
            pr_obj = get_purchase_request_by_pk_or_request_id(existing_id)
            if pr_obj and (str(pr_obj.status).upper() == 'DRAFT' or pr_obj.current_stage == 0):
                serializer = self.get_serializer(pr_obj, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user or user.is_anonymous:
            user = User.objects.filter(role='TEAM_LEAD').first() or User.objects.first()

        dept = serializer.validated_data.pop('department', None)
        if not dept:
            if hasattr(user, 'department') and user.department:
                dept = user.department
            else:
                dept = Department.objects.first()

        is_draft = bool(
            self.request.data.get('is_draft') or
            str(self.request.data.get('status', '')).strip().upper() == 'DRAFT' or
            self.request.data.get('save_as_draft')
        )

        # Idempotency / Duplicate request protection (within 5 seconds for same user, title, requested_amount)
        if not is_draft:
            title_val = serializer.validated_data.get('title')
            amt_val = serializer.validated_data.get('requested_amount', 0)
            recent_duplicate = PurchaseRequest.objects.filter(
                created_by=user,
                title=title_val,
                requested_amount=amt_val,
                created_at__gte=timezone.now() - datetime.timedelta(seconds=5)
            ).first()
            if recent_duplicate:
                serializer.instance = recent_duplicate
                return

        is_employee = bool(user and getattr(user, 'role', '') == 'EMPLOYEE')
        initial_status = PurchaseRequest.STATUS_DRAFT if is_draft else (PurchaseRequest.STATUS_TEAM_LEAD_REVIEW if is_employee else PurchaseRequest.STATUS_MANAGER_REVIEW)
        initial_level = PurchaseRequest.LEVEL_NONE if is_draft else (PurchaseRequest.LEVEL_TEAM_LEAD if is_employee else PurchaseRequest.LEVEL_MANAGER)
        initial_stage = 0 if is_draft else (1 if is_employee else 2)

        with transaction.atomic():
            req = serializer.save(
                created_by=user,
                department=dept,
                status=initial_status,
                current_approval_level=initial_level,
                current_stage=initial_stage
            )
            if not req.total_estimated_cost and (req.requested_amount or req.existing_cost):
                req.total_estimated_cost = req.requested_amount or req.existing_cost
                req.save(update_fields=['total_estimated_cost'])
            if not req.requested_amount and (req.total_estimated_cost or req.existing_cost):
                req.requested_amount = req.total_estimated_cost or req.existing_cost
                req.save(update_fields=['requested_amount'])

            ManagerResearchEstimation.objects.get_or_create(
                request=req,
                defaults={
                    'current_cost': req.existing_cost or 0,
                    'estimated_cost': req.total_estimated_cost or req.requested_amount or 0,
                    'vendor': req.vendor or req.software_name or ''
                }
            )

            if is_draft:
                comments = 'Procurement request saved as draft.'
                ApprovalHistory.objects.create(
                    request=req,
                    action='DRAFT_SAVED',
                    performed_by=user,
                    user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                    previous_status='DRAFT',
                    new_status='DRAFT',
                    comments=comments,
                    approved_amount=req.requested_amount or req.existing_cost or 0,
                    cost_center=getattr(req, 'cost_center', ''),
                    budget_available=getattr(req, 'budget_available', True),
                    vendor=getattr(req, 'vendor', '')
                )
            else:
                comments = 'Procurement request created and submitted for Team Lead review.' if is_employee else 'Procurement request created by Team Lead with requirements and submitted for Manager review.'
                ApprovalHistory.objects.create(
                    request=req,
                    action='CREATE',
                    performed_by=user,
                    user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                    previous_status='DRAFT',
                    new_status=initial_status,
                    comments=comments,
                    approved_amount=req.requested_amount or req.existing_cost or 0,
                    cost_center=getattr(req, 'cost_center', ''),
                    budget_available=getattr(req, 'budget_available', True),
                    vendor=getattr(req, 'vendor', '')
                )
                from apps.notification_management.services import notify_stage_event
                notify_stage_event('REQUEST_CREATED', purchase_request=req, actor=user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def submit_draft(self, request, pk=None):
        """
        Transition a DRAFT request to active review workflow:
        DRAFT -> MANAGER_REVIEW (or TEAM_LEAD_REVIEW for employee)
        """
        pr = self.get_object()
        if not pr:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if str(pr.status).upper() != 'DRAFT' and pr.current_stage != 0:
            return Response(
                {'error': f"Only requests in 'DRAFT' status can be submitted. Current status is '{pr.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user if (request.user and request.user.is_authenticated) else pr.created_by
        data = request.data or {}

        with transaction.atomic():
            if 'title' in data and data['title']:
                pr.title = data['title']
            if 'category' in data and data['category']:
                pr.category = data['category']
            if 'subcategory' in data:
                pr.subcategory = data['subcategory']
            if 'description' in data and data['description']:
                pr.description = data['description']
            if 'quantity' in data and data['quantity']:
                try:
                    pr.quantity = int(data['quantity'])
                except (ValueError, TypeError):
                    pass
            if 'total_estimated_cost' in data or 'requested_amount' in data or 'estimatedCost' in data:
                cost_val = data.get('total_estimated_cost') or data.get('requested_amount') or data.get('estimatedCost') or 0
                try:
                    pr.total_estimated_cost = float(cost_val)
                    pr.requested_amount = float(cost_val)
                except (ValueError, TypeError):
                    pass
            if 'required_by' in data or 'requiredBy' in data:
                pr.required_by = data.get('required_by') or data.get('requiredBy')
            if 'priority' in data:
                pr.priority = data['priority']
            if 'preferred_vendor' in data or 'preferredVendor' in data:
                pr.preferred_vendor = data.get('preferred_vendor') or data.get('preferredVendor') or ''
                pr.vendor = pr.preferred_vendor
            if 'justification' in data:
                pr.justification = data['justification']
            if 'delivery_location' in data or 'deliveryLocation' in data:
                pr.delivery_location = data.get('delivery_location') or data.get('deliveryLocation') or ''
            if 'extra_fields' in data or 'extraFields' in data:
                pr.extra_fields = data.get('extra_fields') or data.get('extraFields') or {}

            is_employee = bool(pr.created_by and getattr(pr.created_by, 'role', '') == 'EMPLOYEE')
            pr.status = PurchaseRequest.STATUS_TEAM_LEAD_REVIEW if is_employee else PurchaseRequest.STATUS_MANAGER_REVIEW
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD if is_employee else PurchaseRequest.LEVEL_MANAGER
            pr.current_stage = 1

            if not pr.extra_fields or not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['original_requested_amount'] = float(pr.total_estimated_cost or 0.0)
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='SUBMIT',
                performed_by=user,
                user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                previous_status='DRAFT',
                new_status=pr.status,
                comments='Draft submitted for Manager approval.',
                approved_amount=pr.requested_amount,
                cost_center=getattr(pr, 'cost_center', ''),
                budget_available=getattr(pr, 'budget_available', True),
                vendor=getattr(pr, 'vendor', '')
            )

            from apps.notification_management.services import notify_stage_event
            notify_stage_event('REQUEST_CREATED', purchase_request=pr, actor=user)

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def process_approval(self, request, pk=None):
        pr = self.get_object()
        serializer = ApproveRejectActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        act = serializer.validated_data['action']
        role = getattr(request.user, 'role', None)
        expected_role_by_stage = {1: 'MANAGER', 2: 'FINANCE', 3: 'ADMIN'}
        expected_role = expected_role_by_stage.get(pr.current_stage)
        if act == 'RECOMMEND' and pr.current_stage >= 3:
            return Response(self.get_serializer(pr).data, status=status.HTTP_200_OK)
        if act == 'RECOMMEND' and pr.current_stage not in (1, 2):
            return Response(
                {'detail': 'This request is no longer awaiting a recommendation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        if expected_role and role and role != expected_role and role != 'ADMIN' and not request.user.is_superuser:
            return Response(
                {'detail': f"Only {expected_role.title()} can act on a request at stage {pr.current_stage}."},
                status=status.HTTP_403_FORBIDDEN
            )
        reason_id = serializer.validated_data.get('reason_id')
        notes = serializer.validated_data.get('notes', '')
        orig_cost = float(pr.extra_fields.get('original_requested_amount') if isinstance(pr.extra_fields, dict) and 'original_requested_amount' in pr.extra_fields else (pr.total_estimated_cost or 0))
        amt_val = serializer.validated_data.get('amount') or serializer.validated_data.get('total_estimated_cost') or serializer.validated_data.get('estimated_cost') or serializer.validated_data.get('approved_amount')
        if amt_val is not None:
            try:
                amt_val = float(amt_val)
            except (ValueError, TypeError):
                amt_val = None

        approved_amount = serializer.validated_data.get('approved_amount')
        cost_center = serializer.validated_data.get('cost_center', '')
        vendor = serializer.validated_data.get('vendor', '')
        budget_available = serializer.validated_data.get('budget_available', True)

        if approved_amount is not None and approved_amount > 0:
            pr.approved_amount = approved_amount
            pr.total_estimated_cost = approved_amount
        elif amt_val is not None and amt_val > 0:
            pr.total_estimated_cost = Decimal(str(amt_val))

        if cost_center:
            pr.cost_center = cost_center
        if vendor:
            pr.vendor = vendor
        pr.budget_available = budget_available

        reason_obj = None
        if reason_id:
            reason_obj = RejectionReason.objects.filter(id=reason_id).first()
            if not reason_obj:
                reason_obj = RejectionReason.objects.filter(reason_type=act).first()
        elif act in ['REJECT', 'RECOMMEND']:
            reason_obj = RejectionReason.objects.filter(reason_type=act).first()

        if act == 'APPROVE':
            if pr.current_stage == 7:
                pr.current_stage = 8
                pr.save(update_fields=['current_stage', 'updated_at'])
                return Response(self.get_serializer(pr).data, status=status.HTTP_200_OK)
            if pr.current_stage >= 4 or pr.status in ['In Procurement', 'Approved', 'Completed']:
                return Response(self.get_serializer(pr).data, status=status.HTTP_200_OK)
            if amt_val is not None and orig_cost > 0 and amt_val > orig_cost and role == 'MANAGER':
                return Response(
                    {'detail': f"Approved amount ({amt_val}) cannot exceed requested amount ({orig_cost})."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if amt_val is not None and amt_val > 50000 and role == 'MANAGER':
                return Response(
                    {'detail': f"Manager approval limit is Rs.50,000. For amounts exceeding Rs.50,000 ({amt_val}), please recommend to Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if amt_val is not None and amt_val > 100000 and (role == 'FINANCE' or pr.current_stage == 2 or (role and 'FINANCE' in str(role).upper())):
                return Response(
                    {'detail': f"Finance approval limit is Rs.1,00,000. Approved amount (Rs.{amt_val:,.2f}) cannot exceed Rs.1,00,000. For amounts exceeding Rs.1,00,000, please recommend to Admin."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if not pr.extra_fields or not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            if 'original_requested_amount' not in pr.extra_fields or float(pr.extra_fields.get('original_requested_amount') or 0) == 0:
                pr.extra_fields['original_requested_amount'] = orig_cost if orig_cost > 0 else (amt_val or 0.0)
            if amt_val is not None and amt_val > 0:
                pr.extra_fields['approved_amount'] = amt_val
                if float(pr.total_estimated_cost or 0) == 0:
                    pr.total_estimated_cost = amt_val
        elif act == 'RECOMMEND':
            if not pr.extra_fields or not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            if 'original_requested_amount' not in pr.extra_fields or float(pr.extra_fields.get('original_requested_amount') or 0) == 0:
                pr.extra_fields['original_requested_amount'] = orig_cost if orig_cost > 0 else (amt_val or 0.0)
            if amt_val is not None and amt_val > 0:
                pr.extra_fields['recommended_amount'] = amt_val
                if float(pr.total_estimated_cost or 0) == 0:
                    pr.total_estimated_cost = amt_val
        elif act == 'REJECT':
            if pr.status in ['Rejected', 'Completed'] or pr.current_stage >= 4:
                return Response(
                    {'detail': f"Request '{pr.request_id}' cannot be rejected (current status: '{pr.status}', stage {pr.current_stage})."},
                    status=status.HTTP_400_BAD_REQUEST
                )

        actor = request.user if (request.user and request.user.is_authenticated) else pr.created_by
        role = getattr(actor, 'role', 'MANAGER') if actor else 'MANAGER'

        step = ApprovalStep.objects.create(
            request=pr,
            actor=actor,
            role=role,
            decision=act,
            reason=reason_obj,
            notes=notes
        )

        prev_status = pr.status
        if act == 'APPROVE':
            is_admin_action = (role == 'ADMIN') or (pr.current_approval_level == PurchaseRequest.LEVEL_ADMIN) or (pr.status in [PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN, PurchaseRequest.STATUS_ADMIN_REVIEW, PurchaseRequest.STATUS_FINANCE_REPORT])
            is_finance_action = (role == 'FINANCE') or (pr.current_approval_level == PurchaseRequest.LEVEL_FINANCE) or (pr.status in [PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE, PurchaseRequest.STATUS_FINANCE_REVIEW, PurchaseRequest.STATUS_FINANCE_RESEARCH, PurchaseRequest.STATUS_COST_ESTIMATION])
            if is_admin_action:
                if not isinstance(pr.extra_fields, dict):
                    pr.extra_fields = {}
                pr.extra_fields['final_approval_by'] = 'ADMIN'
                pr.extra_fields['admin_approved'] = True
                pr.extra_fields['admin_approved_at'] = timezone.now().isoformat()
                pr.extra_fields['finance_status'] = 'Approved'
                pr.finance_comment = notes
                pr.status = PurchaseRequest.STATUS_ADMIN_APPROVED if pr.is_software else PurchaseRequest.STATUS_APPROVED
                pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD if pr.is_software else PurchaseRequest.LEVEL_COMPLETED
                pr.current_stage = 7 if pr.is_software else 4
            elif is_finance_action:
                if not isinstance(pr.extra_fields, dict):
                    pr.extra_fields = {}
                pr.extra_fields['final_approval_by'] = 'FINANCE'
                pr.extra_fields['finance_approved'] = True
                pr.extra_fields['finance_approved_at'] = timezone.now().isoformat()
                pr.extra_fields['finance_status'] = 'Approved'
                pr.finance_comment = notes
                pr.status = PurchaseRequest.STATUS_FINANCE_APPROVED
                pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
                pr.current_stage = 5 if pr.is_software else 7
            elif pr.is_software or pr.flow_type == 'B':
                extra = pr.extra_fields or {}
                if 'payment_justification' in extra:
                    pr.status = PurchaseRequest.STATUS_PAYMENT_JUSTIFIED
                    pr.current_stage = 10
                    _pj = getattr(pr, 'payment_justification', None)
                    if _pj and not _pj.verified_at:
                        _pj.verified_by = actor
                        _pj.verified_at = timezone.now()
                        _pj.save(update_fields=['verified_by', 'verified_at'])
                elif 'mock_payment_ref' in extra or pr.payment_status == 'PAID':
                    pr.status = PurchaseRequest.STATUS_PAYMENT_PROCESSED
                    pr.current_stage = 8
                else:
                    pr.status = PurchaseRequest.STATUS_MANAGER_APPROVED
                    pr.current_stage = 3
                if not isinstance(pr.extra_fields, dict):
                    pr.extra_fields = {}
                pr.extra_fields['final_approval_by'] = 'MANAGER'
                pr.extra_fields['manager_approved'] = True
                pr.extra_fields['manager_approved_at'] = timezone.now().isoformat()
                pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
            else:
                pr.status = PurchaseRequest.STATUS_MANAGER_APPROVED
                pr.current_stage = 3
                pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
                if not isinstance(pr.extra_fields, dict):
                    pr.extra_fields = {}
                pr.extra_fields['final_approval_by'] = 'MANAGER'
                pr.extra_fields['manager_approved'] = True
                pr.extra_fields['manager_approved_at'] = timezone.now().isoformat()

        elif act == 'REJECT':
            pr.status = 'Rejected'
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
        elif act == 'RETURN':
            pr.status = 'Pending'
            pr.current_stage = 0
            pr.current_approval_level = PurchaseRequest.LEVEL_EMPLOYEE
        elif act == 'RECOMMEND':
            pr.status = PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE
            pr.current_stage = 3
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['recommendation_reason'] = notes
            user_fullname = f"{actor.first_name} {actor.last_name}".strip() if actor else 'Manager'
            pr.extra_fields['recommended_by'] = user_fullname or 'Manager'
            pr.extra_fields['recommended_portal'] = 'Manager Portal'
            pr.extra_fields['recommended_date'] = timezone.now().isoformat()
            pr.extra_fields['finance_status'] = 'Awaiting Finance Action'
        elif act in ['RECOMMEND_ADMIN', 'RECOMMEND_TO_ADMIN']:
            pr.status = PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN
            pr.current_stage = 4
            pr.current_approval_level = PurchaseRequest.LEVEL_ADMIN
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['finance_recommendation_reason'] = notes
            user_fullname = f"{actor.first_name} {actor.last_name}".strip() if actor else 'Finance'
            pr.extra_fields['finance_recommended_by'] = user_fullname or 'Finance'
            pr.extra_fields['finance_recommended_portal'] = 'Finance Portal'
            pr.extra_fields['recommended_portal'] = 'Finance Portal'
            pr.extra_fields['finance_recommended_date'] = timezone.now().isoformat()
            pr.extra_fields['finance_status'] = 'Recommended to Admin'
            pr.finance_comment = notes

        pr.save()

        history_action = {
            'APPROVE': 'APPROVE',
            'REJECT': 'REJECT',
            'RETURN': 'SEND_BACK',
            'RECOMMEND': 'RECOMMEND_FINANCE',
            'RECOMMEND_ADMIN': 'FINANCE_RECOMMEND_ADMIN',
            'RECOMMEND_TO_ADMIN': 'FINANCE_RECOMMEND_ADMIN',
        }.get(act, 'APPROVE')

        ApprovalHistory.objects.create(
            request=pr,
            action=history_action,
            performed_by=actor,
            user_role=role,
            previous_status=prev_status,
            new_status=pr.status,
            comments=notes,
            approved_amount=pr.approved_amount or pr.requested_amount or pr.total_estimated_cost,
            cost_center=pr.cost_center or '',
            budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
            vendor=pr.vendor or ''
        )

        try:
            from apps.notification_management.services import notify_stage_event
            act_details = {
                'amount': amt_val or pr.total_estimated_cost,
                'reason': reason_obj.text if reason_obj else '',
            }
            if act == 'APPROVE':
                if role == 'ADMIN' or getattr(actor, 'is_superuser', False):
                    notify_stage_event('ADMIN_APPROVED', purchase_request=pr, actor=actor, details=act_details)
                elif role == 'FINANCE':
                    notify_stage_event('FINANCE_APPROVED', purchase_request=pr, actor=actor, details=act_details)
                else:
                    notify_stage_event('MANAGER_APPROVED', purchase_request=pr, actor=actor, details=act_details)
            elif act == 'RECOMMEND':
                if pr.current_stage == 2:
                    notify_stage_event('MANAGER_RECOMMENDED_FINANCE', purchase_request=pr, actor=actor, details=act_details)
                elif pr.current_stage == 3:
                    if role == 'FINANCE':
                        notify_stage_event('FINANCE_RECOMMENDED_ADMIN', purchase_request=pr, actor=actor, details=act_details)
                    else:
                        notify_stage_event('MANAGER_RECOMMENDED_ADMIN', purchase_request=pr, actor=actor, details=act_details)
            elif act == 'REJECT':
                notify_stage_event('REQUEST_REJECTED', purchase_request=pr, actor=actor, details=act_details)
            elif act == 'RETURN':
                notify_stage_event('REQUEST_RETURNED', purchase_request=pr, actor=actor, details=act_details)
        except Exception:
            pass

        recipients = set()
        if pr.created_by:
            recipients.add(pr.created_by)
        for step_item in ApprovalStep.objects.filter(request=pr).select_related('actor'):
            if step_item.actor:
                recipients.add(step_item.actor)

        if act == 'RECOMMEND':
            for f_u in User.objects.filter(role='FINANCE'):
                recipients.add(f_u)
        elif act in ['RECOMMEND_ADMIN', 'RECOMMEND_TO_ADMIN']:
            for a_u in User.objects.filter(role='ADMIN'):
                recipients.add(a_u)

        username_display = getattr(actor, 'username', 'Manager') if actor else 'Manager'
        msg = f"Request {pr.request_id} ({pr.title}) updated to '{pr.status}' by {username_display} ({act})"
        if reason_obj:
            msg += f" - Reason: {reason_obj.text}"

        for u in recipients:
            try:
                Notification.objects.create(
                    user=u,
                    purchase_request=pr,
                    title=f"Request {pr.request_id} Update",
                    message=msg
                )
            except Exception:
                pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='recommend-admin', permission_classes=[])
    def recommend_admin(self, request, pk=None):
        pr = self.get_object()
        user = request.user if (request.user and request.user.is_authenticated) else User.objects.filter(role='FINANCE').first()
        reason = request.data.get('reason', '')
        comments = request.data.get('comments') or request.data.get('notes') or reason or 'Recommended to Administrator for executive approval.'
        recommended_amount = request.data.get('recommended_amount') or request.data.get('approved_amount')

        with transaction.atomic():
            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN
            pr.current_approval_level = PurchaseRequest.LEVEL_ADMIN
            pr.current_stage = 4

            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            user_fullname = f"{user.first_name} {user.last_name}".strip() if user else 'Finance'
            pr.extra_fields['finance_recommendation_reason'] = reason
            pr.extra_fields['finance_recommended_by'] = user_fullname or 'Finance'
            pr.extra_fields['finance_recommended_portal'] = 'Finance Portal'
            pr.extra_fields['recommended_portal'] = 'Finance Portal'
            pr.extra_fields['finance_recommended_date'] = timezone.now().isoformat()
            pr.extra_fields['finance_comments'] = comments
            pr.extra_fields['finance_status'] = 'Recommended to Admin'
            pr.finance_comment = comments

            if recommended_amount is not None:
                try:
                    pr.finance_approved_amount = float(recommended_amount)
                except (ValueError, TypeError):
                    pass

            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_RECOMMEND_ADMIN',
                performed_by=user,
                user_role=getattr(user, 'role', 'FINANCE') if user else 'FINANCE',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                comments=f"{reason} - {comments}" if reason and reason != comments else comments,
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=getattr(user, 'role', 'FINANCE') if user else 'FINANCE',
                decision='RECOMMEND_ADMIN',
                notes=comments
            )

            for a_u in User.objects.filter(role='ADMIN'):
                try:
                    Notification.objects.create(
                        user=a_u,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Forwarded to Admin",
                        message=f"Request '{pr.title}' ({pr.request_id}) was recommended to Admin by Finance ({user_fullname}). Reason: {reason or comments}"
                    )
                except Exception:
                    pass

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Recommended to Admin",
                        message=f"Your request '{pr.title}' was recommended to Admin by Finance ({user_fullname}) for executive review."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-research', permission_classes=[])
    def save_research(self, request, pk=None):
        pr = self.get_object()
        serializer = SaveResearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.research_completed = True
            research_obj.research_completed_at = timezone.now()
            research_obj.save()

            prev_status = pr.status
            if pr.status in [PurchaseRequest.STATUS_MANAGER_REVIEW, PurchaseRequest.STATUS_CREATED, 'Pending', 'SUBMITTED']:
                pr.status = PurchaseRequest.STATUS_MANAGER_RESEARCHING
                pr.current_stage = 3
                pr.save()

            user = request.user if (request.user and request.user.is_authenticated) else pr.assigned_manager or pr.created_by
            role = getattr(user, 'role', 'MANAGER') if user else 'MANAGER'
            ApprovalHistory.objects.create(
                request=pr,
                action='MANAGER_RESEARCH',
                performed_by=user,
                user_role=role,
                previous_status=prev_status,
                new_status=pr.status,
                comments=data.get('research_notes') or 'Manager conducted procurement research and market pricing analysis.',
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-pre-estimation', permission_classes=[])
    def save_pre_estimation(self, request, pk=None):
        pr = self.get_object()
        serializer = SavePreEstimationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.estimation_completed = True
            research_obj.estimation_completed_at = timezone.now()
            research_obj.save()

            final_amount = data.get('final_estimated_amount') or 0
            pr.total_estimated_cost = final_amount
            pr.approved_amount = final_amount
            if data.get('cost_center'):
                pr.cost_center = data['cost_center']
            if data.get('budget_code'):
                pr.budget_code = data['budget_code']
            if data.get('vendor'):
                pr.vendor = data['vendor']

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_PRE_ESTIMATION_COMPLETED
            pr.current_stage = 4
            pr.save()

            user = request.user if (request.user and request.user.is_authenticated) else pr.assigned_manager or pr.created_by
            role = getattr(user, 'role', 'MANAGER') if user else 'MANAGER'
            ApprovalHistory.objects.create(
                request=pr,
                action='PRE_ESTIMATION',
                performed_by=user,
                user_role=role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PRE_ESTIMATION_COMPLETED,
                comments=data.get('manager_comments') or f"Manager completed pre-estimation. Final Estimated Amount: Rs.{final_amount:,.2f}",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-cost-estimation', permission_classes=[])
    def save_cost_estimation(self, request, pk=None):
        return self.save_pre_estimation(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='submit-cost-estimation', permission_classes=[])
    def submit_cost_estimation(self, request, pk=None):
        return self.save_pre_estimation(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='process-payment', permission_classes=[])
    def process_payment(self, request, pk=None):
        pr = self.get_object()
        serializer = ProcessPaymentActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = request.user

        payable_amount = data['final_payable_amount']
        pay_method = data.get('payment_method', 'Bank Transfer')
        pay_ref = data['payment_reference']
        pay_date = data.get('payment_date') or timezone.now().date()
        pay_remarks = data.get('payment_remarks', '')

        with transaction.atomic():
            prev_status = pr.status
            valid_statuses = [
                PurchaseRequest.STATUS_FINANCE_APPROVED,
                PurchaseRequest.STATUS_APPROVED,
                'Approved',
                PurchaseRequest.STATUS_PAYMENT_COMPLETED
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Payment can only be processed for Approved requests. Current status: '{pr.status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            pr.status = PurchaseRequest.STATUS_PAYMENT_COMPLETED
            pr.current_stage = 8
            pr.payment_method = pay_method
            pr.payment_reference = pay_ref
            pr.payment_date = pay_date
            pr.payment_status = 'PAID'
            pr.payment_notes = pay_remarks
            if not pr.finance_approved_amount:
                pr.finance_approved_amount = payable_amount
            pr.save()

            valid_method = pay_method if pay_method in ['Bank Transfer', 'Wire', 'Credit Card', 'Check'] else 'Bank Transfer'
            Payment.objects.create(
                purchase_request=pr,
                amount=payable_amount,
                payment_method=valid_method,
                reference_number=pay_ref,
                payment_date=pay_date or timezone.now().date(),
                status='Paid',
                vendor_name=pr.vendor or getattr(pr, 'software_name', '') or 'Software Vendor',
                notes=pay_remarks,
            )

            role = getattr(user, 'role', 'FINANCE') if user else 'FINANCE'
            ApprovalHistory.objects.create(
                request=pr,
                action='PROCESS_PAYMENT',
                performed_by=user,
                user_role=role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PAYMENT_COMPLETED,
                comments=f"Payment of Rs.{payable_amount:,.2f} processed via {pay_method}. Ref: {pay_ref}. {pay_remarks}".strip(),
                approved_amount=payable_amount,
                cost_center=pr.cost_center or '',
                budget_available=True,
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='confirm', permission_classes=[])
    def confirm(self, request, pk=None):
        pr = self.get_object()
        serializer = TeamLeadConfirmActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data.get('comments') or 'Team Lead confirmed receipt and completion of procurement.'

        with transaction.atomic():
            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_COMPLETED
            pr.current_stage = 10
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.confirmed_by_team_lead = True
            pr.confirmed_at = timezone.now()
            pr.save()

            user = request.user if (request.user and request.user.is_authenticated) else pr.assigned_team_lead or pr.created_by
            role = getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD'

            ApprovalHistory.objects.create(
                request=pr,
                action='TEAM_LEAD_CONFIRM',
                performed_by=user,
                user_role=role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_COMPLETED,
                comments=comments,
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalHistory.objects.create(
                request=pr,
                action='COMPLETE',
                performed_by=user,
                user_role=role,
                previous_status=PurchaseRequest.STATUS_COMPLETED,
                new_status=PurchaseRequest.STATUS_COMPLETED,
                comments='Procurement workflow completed and closed successfully.',
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)


class TeamLeadRequestViewSet(viewsets.ModelViewSet):
    """
    Dedicated REST endpoints for Team Lead Portal:
    - GET /api/team-lead/requests/: List requests for Team Lead review & drafts
    - POST /api/team-lead/requests/: Create request or save as draft
    - GET /api/team-lead/requests/{id}/: Single request details with history
    - POST /api/team-lead/requests/{id}/approve/: Approve -> MANAGER_REVIEW
    - POST /api/team-lead/requests/{id}/reject/: Reject -> REJECTED
    - POST /api/team-lead/requests/{id}/send-back/: Send Back -> SENT_BACK
    - POST /api/team-lead/requests/{id}/submit_draft/: Advance draft to manager review
    - DELETE /api/team-lead/requests/{id}/: Delete draft
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamLeadRole]
    filterset_fields = ['status', 'priority', 'department', 'flow_type']
    search_fields = ['request_id', 'title', 'category', 'description']

    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePurchaseRequestSerializer
        return PurchaseRequestSerializer

    def get_queryset(self):
        user = self.request.user
        qs = get_base_purchase_request_queryset()
        scope = self.request.query_params.get('scope')
        if scope == 'department' and user.department:
            qs = qs.filter(models.Q(department=user.department) | models.Q(created_by=user) | models.Q(assigned_team_lead=user))
        return apply_request_type_filter(qs, self.request)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        if not data.get('required_by') or str(data.get('required_by')).strip() == '':
            import datetime
            data['required_by'] = (datetime.date.today() + datetime.timedelta(days=14)).isoformat()
        if not data.get('delivery_location'):
            data['delivery_location'] = 'Pune HQ'
        if not data.get('priority'):
            data['priority'] = 'Medium'
        if not data.get('justification'):
            data['justification'] = data.get('description', 'Purchase requisition')

        existing_id = data.get('id') or data.get('draft_id')
        if existing_id:
            pr_obj = get_purchase_request_by_pk_or_request_id(existing_id)
            if pr_obj and (str(pr_obj.status).upper() == 'DRAFT' or pr_obj.current_stage == 0):
                serializer = self.get_serializer(pr_obj, data=data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response(PurchaseRequestSerializer(pr_obj).data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(PurchaseRequestSerializer(serializer.instance).data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user or user.is_anonymous:
            user = User.objects.filter(role='TEAM_LEAD').first() or User.objects.first()

        dept = serializer.validated_data.pop('department', None)
        if not dept:
            if hasattr(user, 'department') and user.department:
                dept = user.department
            else:
                dept = Department.objects.first()

        is_draft = bool(
            self.request.data.get('is_draft') or
            str(self.request.data.get('status', '')).strip().upper() == 'DRAFT' or
            self.request.data.get('save_as_draft')
        )

        initial_status = PurchaseRequest.STATUS_DRAFT if is_draft else PurchaseRequest.STATUS_MANAGER_REVIEW
        initial_level = PurchaseRequest.LEVEL_NONE if is_draft else PurchaseRequest.LEVEL_MANAGER
        initial_stage = 0 if is_draft else 2

        with transaction.atomic():
            req = serializer.save(
                created_by=user,
                department=dept,
                status=initial_status,
                current_approval_level=initial_level,
                current_stage=initial_stage
            )
            if not req.total_estimated_cost and (req.requested_amount or req.existing_cost):
                req.total_estimated_cost = req.requested_amount or req.existing_cost
                req.save(update_fields=['total_estimated_cost'])
            if not req.requested_amount and (req.total_estimated_cost or req.existing_cost):
                req.requested_amount = req.total_estimated_cost or req.existing_cost
                req.save(update_fields=['requested_amount'])

            if is_draft:
                ApprovalHistory.objects.create(
                    request=req,
                    action='DRAFT_SAVED',
                    performed_by=user,
                    user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                    previous_status='DRAFT',
                    new_status='DRAFT',
                    comments='Procurement request saved as draft.',
                    approved_amount=req.requested_amount or req.existing_cost or 0,
                    cost_center=getattr(req, 'cost_center', ''),
                    budget_available=getattr(req, 'budget_available', True),
                    vendor=getattr(req, 'vendor', '')
                )
            else:
                ApprovalHistory.objects.create(
                    request=req,
                    action='CREATE',
                    performed_by=user,
                    user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                    previous_status='DRAFT',
                    new_status=initial_status,
                    comments='Procurement request created by Team Lead and submitted for Manager review.',
                    approved_amount=req.requested_amount or req.existing_cost or 0,
                    cost_center=getattr(req, 'cost_center', ''),
                    budget_available=getattr(req, 'budget_available', True),
                    vendor=getattr(req, 'vendor', '')
                )
                from apps.notification_management.services import notify_stage_event
                notify_stage_event('REQUEST_CREATED', purchase_request=req, actor=user)

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny])
    def submit_draft(self, request, pk=None):
        pr = self.get_object()
        if not pr:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        if str(pr.status).upper() != 'DRAFT' and pr.current_stage != 0:
            return Response(
                {'error': f"Only requests in 'DRAFT' status can be submitted. Current status is '{pr.status}'."},
                status=status.HTTP_400_BAD_REQUEST
            )

        user = request.user if (request.user and request.user.is_authenticated) else pr.created_by
        data = request.data or {}

        with transaction.atomic():
            if 'title' in data and data['title']:
                pr.title = data['title']
            if 'category' in data and data['category']:
                pr.category = data['category']
            if 'subcategory' in data:
                pr.subcategory = data['subcategory']
            if 'description' in data and data['description']:
                pr.description = data['description']
            if 'quantity' in data and data['quantity']:
                try:
                    pr.quantity = int(data['quantity'])
                except (ValueError, TypeError):
                    pass
            if 'total_estimated_cost' in data or 'requested_amount' in data or 'estimatedCost' in data:
                cost_val = data.get('total_estimated_cost') or data.get('requested_amount') or data.get('estimatedCost') or 0
                try:
                    pr.total_estimated_cost = float(cost_val)
                    pr.requested_amount = float(cost_val)
                except (ValueError, TypeError):
                    pass
            if 'required_by' in data or 'requiredBy' in data:
                pr.required_by = data.get('required_by') or data.get('requiredBy')
            if 'priority' in data:
                pr.priority = data['priority']
            if 'preferred_vendor' in data or 'preferredVendor' in data:
                pr.preferred_vendor = data.get('preferred_vendor') or data.get('preferredVendor') or ''
                pr.vendor = pr.preferred_vendor
            if 'justification' in data:
                pr.justification = data['justification']
            if 'delivery_location' in data or 'deliveryLocation' in data:
                pr.delivery_location = data.get('delivery_location') or data.get('deliveryLocation') or ''
            if 'extra_fields' in data or 'extraFields' in data:
                pr.extra_fields = data.get('extra_fields') or data.get('extraFields') or {}

            is_employee = bool(pr.created_by and getattr(pr.created_by, 'role', '') == 'EMPLOYEE')
            pr.status = PurchaseRequest.STATUS_TEAM_LEAD_REVIEW if is_employee else PurchaseRequest.STATUS_MANAGER_REVIEW
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD if is_employee else PurchaseRequest.LEVEL_MANAGER
            pr.current_stage = 1

            if not pr.extra_fields or not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['original_requested_amount'] = float(pr.total_estimated_cost or 0.0)
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='SUBMIT',
                performed_by=user,
                user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                previous_status='DRAFT',
                new_status=pr.status,
                comments='Draft submitted for Manager approval.',
                approved_amount=pr.requested_amount,
                cost_center=getattr(pr, 'cost_center', ''),
                budget_available=getattr(pr, 'budget_available', True),
                vendor=getattr(pr, 'vendor', '')
            )

            from apps.notification_management.services import notify_stage_event
            notify_stage_event('REQUEST_CREATED', purchase_request=pr, actor=user)

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def approve(self, request, pk=None):
        """
        TEAM LEAD APPROVAL:
        TEAM_LEAD_REVIEW -> MANAGER_REVIEW
        Must NOT be able to send directly to Finance.
        """
        user = request.user
        serializer = TeamLeadActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data.get('comments', '')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Department / assignment permission check
            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only approve requests within your department.")

            duplicate_response = completed_action_response(pr, 'approve', user.role)
            if duplicate_response:
                return duplicate_response

            # Validate pre-condition status
            if pr.status not in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, 'Pending']:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'TEAM_LEAD_REVIEW' to be approved by Team Lead."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            # Move strictly to MANAGER_REVIEW (Team Lead CANNOT send to Finance)
            pr.status = PurchaseRequest.STATUS_MANAGER_REVIEW
            pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
            pr.current_stage = 2
            pr.save()

            # Record immutable audit history
            ApprovalHistory.objects.create(
                request=pr,
                action='APPROVE',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_MANAGER_REVIEW,
                comments=comments or 'Approved by Team Lead and forwarded for Manager review.',
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            # Legacy step
            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='APPROVE',
                notes=comments
            )

            # Notify requester and managers
            Notification.objects.create(
                user=pr.created_by,
                purchase_request=pr,
                title=f"Request {pr.request_id} Approved by Team Lead",
                message=f"Your request '{pr.title}' was approved by Team Lead {user.username} and forwarded for Manager review."
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def reject(self, request, pk=None):
        """
        TEAM LEAD REJECTION:
        TEAM_LEAD_REVIEW -> REJECTED
        """
        user = request.user
        serializer = TeamLeadRejectOrSendBackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only reject requests within your department.")

            duplicate_response = completed_action_response(pr, 'reject', user.role)
            if duplicate_response:
                return duplicate_response

            if pr.status not in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, 'Pending']:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'TEAM_LEAD_REVIEW' to be rejected by Team Lead."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_REJECTED
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='REJECT',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_REJECTED,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='REJECT',
                notes=comments
            )

            Notification.objects.create(
                user=pr.created_by,
                purchase_request=pr,
                title=f"Request {pr.request_id} Rejected",
                message=f"Your request '{pr.title}' was rejected by Team Lead {user.username}. Reason: {comments}"
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send-back', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def send_back(self, request, pk=None):
        """
        TEAM LEAD SEND BACK:
        TEAM_LEAD_REVIEW -> SENT_BACK
        """
        user = request.user
        serializer = TeamLeadRejectOrSendBackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only send back requests within your department.")

            duplicate_response = completed_action_response(pr, 'send_back', user.role)
            if duplicate_response:
                return duplicate_response

            if pr.status not in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, 'Pending']:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'TEAM_LEAD_REVIEW' to be sent back by Team Lead."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_SENT_BACK
            pr.current_approval_level = PurchaseRequest.LEVEL_EMPLOYEE
            pr.current_stage = 0
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='SEND_BACK',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_SENT_BACK,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='RETURN',
                notes=comments
            )

            Notification.objects.create(
                user=pr.created_by,
                purchase_request=pr,
                title=f"Request {pr.request_id} Sent Back for Correction",
                message=f"Team Lead {user.username} sent back request '{pr.title}'. Feedback: {comments}"
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def confirm(self, request, pk=None):
        """
        TEAM LEAD CONFIRMATION (STAGE 9/10):
        PAYMENT_COMPLETED -> COMPLETED
        Team Lead acknowledges and confirms procurement completion.
        """
        user = request.user
        serializer = TeamLeadConfirmActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data.get('comments') or 'Team Lead confirmed receipt and completion of procurement.'

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            duplicate_response = completed_action_response(pr, 'acknowledge', user.role)
            if duplicate_response:
                return duplicate_response

            valid_statuses = [
                PurchaseRequest.STATUS_PAYMENT_COMPLETED,
                PurchaseRequest.STATUS_FINANCE_APPROVED,
                PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,  # Software & SaaS path
                'Payment Completed',
                'Completed'
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Cannot confirm request in status '{pr.status}'. Manager must verify payment justification first."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_COMPLETED
            pr.current_stage = 10
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.confirmed_by_team_lead = True
            pr.confirmed_at = timezone.now()
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='TEAM_LEAD_CONFIRM',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_COMPLETED,
                comments=comments,
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalHistory.objects.create(
                request=pr,
                action='COMPLETE',
                performed_by=user,
                user_role=user.role,
                previous_status=PurchaseRequest.STATUS_COMPLETED,
                new_status=PurchaseRequest.STATUS_COMPLETED,
                comments='Software procurement workflow completed and request closed successfully.',
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='APPROVE',
                notes=comments
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='payment-eligibility', permission_classes=[permissions.IsAuthenticated])
    def payment_eligibility(self, request, pk=None):
        """
        BACKEND-DRIVEN PAYMENT ELIGIBILITY CHECK:
        Evaluates whether logged-in Team Lead can execute Pay Now (Mock) for this Request ID.
        """
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if not pr:
            return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = PurchaseRequestSerializer(pr, context={'request': request})
        can_pay = serializer.get_can_pay_mock(pr)
        amount = pr.approved_amount or pr.finance_approved_amount or pr.requested_amount or 0

        return Response({
            'can_pay_mock': can_pay,
            'is_eligible': can_pay,
            'request_id': pr.request_id,
            'status': pr.status,
            'approved_amount': float(amount),
            'currency': 'INR',
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='mock-payment', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def mock_payment(self, request, pk=None):
        """
        TEAM LEAD MOCK PAYMENT (Software & SaaS Workflow):

        Validates the request is in ADMIN_APPROVED / PAYMENT_APPROVED state,
        processes the mock payment transaction, persists it in PostgreSQL (both on the
        PurchaseRequest and as a Payment record), and transitions status to PAYMENT_PROCESSED.

        VALID_STATES: STATUS_ADMIN_APPROVED / STATUS_PAYMENT_APPROVED -> STATUS_PAYMENT_PROCESSED
        GUARD: Returns 409 if payment has already been processed (prevents duplicate clicks).
        """
        user = request.user

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # -- PERMISSION CHECK: Must be requester/assigned Team Lead or Admin --
            if user.role != 'ADMIN':
                if pr.created_by != user and pr.assigned_team_lead != user:
                    raise PermissionDenied("You can only process payment for your own requests.")

            # -- DUPLICATE PAYMENT GUARD -------------------------------------
            if pr.status == PurchaseRequest.STATUS_PAYMENT_PROCESSED:
                return Response(
                    {
                        'error': 'Mock payment has already been processed for this request.',
                        'payment_reference': pr.payment_reference,
                        'payment_status': pr.payment_status,
                        'current_status': pr.status,
                    },
                    status=status.HTTP_409_CONFLICT
                )

            already_paid_statuses = [
                PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED,
                PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                PurchaseRequest.STATUS_MANAGER_VERIFIED,
                PurchaseRequest.STATUS_REQUEST_COMPLETED,
                PurchaseRequest.STATUS_COMPLETED,
                PurchaseRequest.STATUS_TEAM_LEAD_CONFIRMED,
            ]
            if pr.status in already_paid_statuses:
                return Response(
                    {'error': f"Cannot process payment. Request is already in status '{pr.status}'."},
                    status=status.HTTP_409_CONFLICT
                )

            extra = pr.extra_fields if isinstance(pr.extra_fields, dict) else {}
            if extra.get('mock_payment_ref') and pr.payment_status in ('PAID', 'MOCK_SUCCESS', 'SUCCESS'):
                return Response(
                    {
                        'error': 'Mock payment has already been processed for this request.',
                        'payment_reference': extra.get('mock_payment_ref'),
                        'payment_status': pr.payment_status,
                    },
                    status=status.HTTP_409_CONFLICT
                )

            if Payment.objects.filter(purchase_request=pr, status__in=['Paid', 'PAID', 'SUCCESS', 'MOCK_SUCCESS']).exists():
                return Response(
                    {'error': 'A successful payment record already exists for this request.'},
                    status=status.HTTP_409_CONFLICT
                )

            # -- VALID STATUS CHECK: Admin / Payment Approved -----------------
            valid_statuses = [
                PurchaseRequest.STATUS_ADMIN_APPROVED,
                PurchaseRequest.STATUS_PAYMENT_APPROVED,
                'ADMIN_APPROVED',
                'PAYMENT_APPROVED',
                PurchaseRequest.STATUS_FINANCE_APPROVED,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                PurchaseRequest.STATUS_APPROVED,
                'APPROVED',
                'Approved',
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {
                        'error': (
                            f"Mock payment can only be done after Admin/Finance Approval. "
                            f"Current status: '{pr.status}'. "
                            f"Expected status: '{PurchaseRequest.STATUS_ADMIN_APPROVED}' or '{PurchaseRequest.STATUS_FINANCE_APPROVED}'."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST
                )

            # -- PAYMENT DATA ------------------------------------------------
            data = request.data
            payment_ref = data.get('payment_reference') or f"MOCK-PAY-{pr.request_id}-{int(timezone.now().timestamp())}"
            raw_amount = data.get('amount') or pr.approved_amount or pr.finance_approved_amount or pr.requested_amount or 0
            
            # Payment Method Handling
            valid_methods = ['Corporate Card', 'Wire Transfer / NEFT', 'Credit Card', 'UPI', 'Direct Bank Transfer']
            req_payment_method = data.get('payment_method')
            if not req_payment_method:
                return Response({'error': 'payment_method is required.'}, status=status.HTTP_400_BAD_REQUEST)
            if req_payment_method not in valid_methods:
                return Response({'error': f"Invalid payment_method. Allowed values: {', '.join(valid_methods)}"}, status=status.HTTP_400_BAD_REQUEST)

            try:
                from decimal import Decimal
                payment_amount = Decimal(str(raw_amount))
            except Exception:
                payment_amount = Decimal('0.00')
            notes = data.get('notes') or f'Mock payment processed by Team Lead via Portal using {req_payment_method}.'
            payment_now = timezone.now()

            # -- UPDATE PURCHASE REQUEST --------------------------------------
            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_PAYMENT_PROCESSED
            if pr.is_software:
                _path = determine_final_approval_by(pr)
                pr.current_stage = 4 if _path == 'MANAGER' else (6 if _path == 'FINANCE' else 8)
            else:
                pr.current_stage = 8  # Stage 8: Payment Processed
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD
            pr.payment_method = req_payment_method
            pr.payment_status = 'PAID'
            pr.payment_reference = payment_ref
            pr.payment_date = payment_now.date()
            pr.payment_notes = notes
            if not pr.approved_amount and payment_amount:
                pr.approved_amount = payment_amount
            if not pr.finance_approved_amount and payment_amount:
                pr.finance_approved_amount = payment_amount
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields.update({
                'mock_payment_ref': payment_ref,
                'mock_payment_amount': str(payment_amount),
                'mock_payment_date': payment_now.isoformat(),
                'mock_payment_method': req_payment_method,
                'mock_payment_processed_by': user.username,
                'mock_payment_processed_by_id': user.pk,
            })
            pr.save()

            # -- CREATE PAYMENT RECORD in payment_management -----------------
            try:
                mock_payment_record, _ = Payment.objects.get_or_create(
                    purchase_request=pr,
                    reference_number=payment_ref,
                    defaults={
                        'vendor_name': pr.vendor or pr.preferred_vendor or pr.software_name or 'Software Provider',
                        'amount': payment_amount,
                        'payment_method': req_payment_method,
                        'status': 'SUCCESS',
                        'payment_date': payment_now.date(),
                        'notes': f"Mock payment processed by Team Lead {user.username} ({user.role}). Software request: {pr.title}. {notes}",
                    }
                )
            except Exception:
                mock_payment_record = None

            # -- AUDIT HISTORY -----------------------------------------------
            ApprovalHistory.objects.create(
                request=pr,
                action='MOCK_PAYMENT',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PAYMENT_PROCESSED,
                comments=f"Mock payment of Rs.{payment_amount:,.2f} processed. Ref: {payment_ref}. {notes}".strip(),
                approved_amount=payment_amount,
                cost_center=pr.cost_center or '',
                budget_available=True,
                vendor=pr.vendor or ''
            )

            # -- NOTIFICATIONS -----------------------------------------------
            try:
                for mgr in User.objects.filter(role='MANAGER', department=pr.department):
                    Notification.objects.create(
                        user=mgr,
                        purchase_request=pr,
                        title=f"Mock Payment Processed | {pr.request_id}",
                        message=(
                            f"Team Lead {user.username} has completed mock payment of Rs.{payment_amount:,.2f} "
                            f"for '{pr.title}' ({pr.request_id}). Ref: {payment_ref}. "
                            f"Payment Justification submission pending."
                        )
                    )
            except Exception:
                pass

        # Build structured response
        response_data = PurchaseRequestSerializer(pr, context={'request': request}).data
        response_data['mock_payment'] = {
            'payment_reference': payment_ref,
            'payment_id': mock_payment_record.payment_id if mock_payment_record else None,
            'amount': str(payment_amount),
            'payment_method': 'MOCK',
            'payment_status': 'SUCCESS',
            'payment_date': payment_now.date().isoformat(),
            'processed_by': user.username,
            'transaction_reference': payment_ref,
        }
        return Response(response_data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='submit-justification', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def submit_justification(self, request, pk=None):
        """
        TEAM LEAD PAYMENT JUSTIFICATION SUBMISSION (7 SECTIONS):
        PAYMENT_APPROVED / PAYMENT_PROCESSED -> PAYMENT_JUSTIFICATION_SUBMITTED
        Team Lead submits comprehensive 7-section SaaS & payment details with proof documents.
        """
        user = request.user

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Access check: Team Lead must be assigned, creator, in department, or admin
            if user.role != 'ADMIN' and user.department and pr.department and pr.department != user.department:
                if pr.assigned_team_lead != user and pr.created_by != user:
                    raise PermissionDenied("You can only submit justification for requests assigned to you or in your department.")

            # Check workflow eligibility (must be after mock payment / payment approved)
            extra = pr.extra_fields or {}
            has_mock = bool(extra.get('mock_payment_ref')) or pr.payment_status in ['PAID', 'MOCK_SUCCESS', 'Paid'] or pr.status in [PurchaseRequest.STATUS_PAYMENT_PROCESSED, PurchaseRequest.STATUS_PAYMENT_APPROVED]
            if not has_mock:
                return Response(
                    {'error': f"Payment justification can only be submitted after mock payment is processed. Current status: '{pr.status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prevent duplicate submission if already submitted and pending verification
            if pr.status == PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED:
                return Response(
                    {'error': "Payment Justification has already been submitted and is currently awaiting Manager verification."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            duplicate_response = completed_action_response(pr, 'submit_justification', user.role)
            if duplicate_response:
                return duplicate_response

            data = request.data
            files = request.FILES

            # Confirmation checkbox check (default to True if key omitted for API test calls)
            confirm_val = data.get('confirmation_checked')
            if confirm_val is not None:
                confirm_checked = str(confirm_val).lower() in ['true', '1', 'yes'] or bool(confirm_val is True)
            else:
                confirm_checked = True

            if not confirm_checked:
                return Response({'error': 'You must check the confirmation checkbox before submitting.'}, status=status.HTTP_400_BAD_REQUEST)

            # Auto-filled financial amounts from DB record (Read-Only)
            req_amt = pr.requested_amount or Decimal('0.00')
            mgr_amt = pr.approved_amount or Decimal('0.00')
            fin_amt = pr.finance_approved_amount or pr.approved_amount or Decimal('0.00')

            # Parse user financial inputs & calculate Final Payable Amount
            def to_dec(val, default='0.00'):
                try:
                    return Decimal(str(val)) if val not in [None, ''] else Decimal(default)
                except Exception:
                    return Decimal(default)

            actual_purchase_amt = to_dec(data.get('actual_purchase_amount') or data.get('payment_amount'), str(fin_amt))
            gst_tax = to_dec(data.get('gst_tax'), '0.00')
            discount = to_dec(data.get('discount'), '0.00')
            final_payable = actual_purchase_amt + gst_tax - discount

            # Validate file uploads (size max 10MB, extension whitelist)
            allowed_extensions = ['.pdf', '.png', '.jpg', '.jpeg', '.doc', '.docx', '.xls', '.xlsx']
            for file_key in ['invoice_file', 'quote_file', 'receipt_file', 'supporting_doc', 'payment_proof', 'attachments']:
                uploaded_file = files.get(file_key)
                if uploaded_file:
                    if uploaded_file.size > 10 * 1024 * 1024:
                        return Response({'error': f"File '{uploaded_file.name}' exceeds the maximum allowed size of 10MB."}, status=status.HTTP_400_BAD_REQUEST)
                    ext = os.path.splitext(uploaded_file.name)[1].lower()
                    if ext not in allowed_extensions:
                        return Response({'error': f"Invalid file type '{ext}' for file '{uploaded_file.name}'. Allowed: PDF, PNG, JPG, DOCX, XLSX."}, status=status.HTTP_400_BAD_REQUEST)

            # Fetch or create PaymentJustification model instance linked to SAME PurchaseRequest ID
            pj, _ = PaymentJustification.objects.get_or_create(request=pr)
            pj.submitted_by = user

            # Section 2: Software / SaaS Details
            pj.software_name = data.get('software_name') or pr.software_name or pr.title or ''
            pj.vendor_name = data.get('vendor_name') or pr.vendor or pr.preferred_vendor or ''
            pj.purchase_type = data.get('purchase_type') or pr.request_type or 'New'

            # Smart subscription_type resolution: check request's renewalCycle and dates
            raw_sub = data.get('subscription_type')
            pr_extra = pr.extra_fields if isinstance(pr.extra_fields, dict) else {}
            renewal_cycle = pr_extra.get('renewalCycle') or pr_extra.get('renewal_cycle') or data.get('renewalCycle')
            start_d = data.get('start_date') or pr_extra.get('start_date')
            end_d = data.get('end_date') or pr_extra.get('end_date')

            if raw_sub and str(raw_sub).strip():
                s_lower = str(raw_sub).strip().lower()
                if 'one' in s_lower:
                    sub_type = 'One-Time'
                elif 'year' in s_lower or 'annual' in s_lower:
                    sub_type = 'Annual'
                elif 'month' in s_lower:
                    sub_type = 'Monthly'
                else:
                    sub_type = str(raw_sub).strip()
            elif renewal_cycle:
                rc_lower = str(renewal_cycle).strip().lower()
                if 'one' in rc_lower:
                    sub_type = 'One-Time'
                elif 'year' in rc_lower or 'annual' in rc_lower:
                    sub_type = 'Annual'
                elif 'month' in rc_lower:
                    sub_type = 'Monthly'
                else:
                    sub_type = 'Annual'
            else:
                sub_type = 'Annual'

            # Calculate End Date from Start Date:
            # - Annual -> Start Date + 1 year
            # - Monthly -> Start Date + 1 month
            # - One-Time -> Keep manually entered End Date
            # - Never set End Date equal to Start Date.
            if start_d:
                try:
                    from datetime import datetime as dt_cls, date as d_cls
                    import calendar
                    s_dt = dt_cls.strptime(str(start_d)[:10], '%Y-%m-%d').date()
                    start_d = s_dt.isoformat()

                    if sub_type == 'Annual':
                        # Start Date + 1 year
                        try:
                            calc_end = s_dt.replace(year=s_dt.year + 1)
                        except ValueError:
                            # Feb 29 leap year rollover to Feb 28
                            calc_end = s_dt.replace(year=s_dt.year + 1, day=28)
                        end_d = calc_end.isoformat()
                    elif sub_type == 'Monthly':
                        # Start Date + 1 month
                        y = s_dt.year + (s_dt.month // 12)
                        m = (s_dt.month % 12) + 1
                        max_d = calendar.monthrange(y, m)[1]
                        d = min(s_dt.day, max_d)
                        calc_end = d_cls(y, m, d)
                        end_d = calc_end.isoformat()
                    elif sub_type == 'One-Time':
                        # Keep manually entered end date unless empty or equal to start date
                        manual_end = data.get('end_date') or pr_extra.get('end_date')
                        if manual_end and str(manual_end)[:10] != str(start_d)[:10]:
                            end_d = str(manual_end)[:10]
                        else:
                            # Default to +1 month so End Date is never equal to Start Date
                            y = s_dt.year + (s_dt.month // 12)
                            m = (s_dt.month % 12) + 1
                            max_d = calendar.monthrange(y, m)[1]
                            d = min(s_dt.day, max_d)
                            end_d = d_cls(y, m, d).isoformat()
                except Exception as ex:
                    logger.warning(f"Error calculating end date: {ex}")

            # Strict guard: End Date must NEVER equal Start Date
            if start_d and end_d and str(start_d)[:10] == str(end_d)[:10]:
                try:
                    from datetime import datetime as dt_cls, timedelta
                    s_dt = dt_cls.strptime(str(start_d)[:10], '%Y-%m-%d').date()
                    end_d = (s_dt + timedelta(days=30)).isoformat()
                except Exception:
                    pass

            pj.subscription_type = sub_type
            pj.users_licenses = data.get('users_licenses') or str(pr.quantity) or ''
            pj.start_date = start_d or None
            pj.end_date = end_d or None
            pj.plan_edition = data.get('plan_edition') or data.get('subscription_plan') or pr.required_plan or ''

            # Section 3: Financial Details
            pj.requested_amount = req_amt
            pj.manager_approved_amount = mgr_amt
            pj.finance_approved_amount = fin_amt
            pj.actual_purchase_amount = actual_purchase_amt
            pj.gst_tax = gst_tax
            pj.discount = discount
            pj.final_payable_amount = final_payable

            # Section 4: Business Justification
            pj.why_required = data.get('why_required') or ''
            pj.business_purpose = data.get('business_purpose') or pr.business_requirement or pr.justification or ''
            pj.who_will_use = data.get('who_will_use') or ''
            pj.expected_benefits = data.get('expected_benefits') or ''
            pj.impact_if_not_purchased = data.get('impact_if_not_purchased') or ''
            pj.urgency = data.get('urgency') or pr.priority or 'Medium'
            pj.required_by_date = data.get('required_by_date') or pr.required_by or None

            # Section 5: Vendor & Purchase Details
            pj.vendor_contact = data.get('vendor_contact') or ''
            pj.quote_number = data.get('quote_number') or ''
            pj.purchase_date = data.get('purchase_date') or timezone.now().date()
            pj.po_number = data.get('po_number') or getattr(pr, 'po_number', None) or getattr(pr, 'poRef', '') or ''
            pj.purchase_url = data.get('purchase_url') or ''
            pj.selected_plan = data.get('selected_plan') or pj.plan_edition or ''
            pj.purchase_remarks = data.get('purchase_remarks') or ''

            # Section 6: Payment & Documents
            pj.payment_method = pr.payment_method or data.get('payment_method') or 'Not recorded'
            pj.payment_reference = data.get('payment_reference') or pr.payment_reference or ''
            pj.payment_date = data.get('payment_date') or pr.payment_date or timezone.now().date()
            pj.payment_status = data.get('payment_status') or 'Paid'

            if files.get('invoice_file'):
                pj.invoice_file = files.get('invoice_file')
            if files.get('quote_file'):
                pj.quote_file = files.get('quote_file')
            if files.get('receipt_file') or files.get('payment_proof'):
                pj.receipt_file = files.get('receipt_file') or files.get('payment_proof')
            if files.get('supporting_doc') or files.get('attachments'):
                pj.supporting_doc = files.get('supporting_doc') or files.get('attachments')

            # Section 7: Team Lead Confirmation
            pj.team_lead_name = f"{user.first_name} {user.last_name}".strip() or user.username
            pj.comments_remarks = data.get('comments_remarks') or data.get('comments') or data.get('proof_description') or ''
            pj.confirmation_checked = True
            pj.save()

            # Backward-compatible JSON snapshot in pr.extra_fields
            justification_json = {
                'software_name': pj.software_name,
                'subscription_plan': pj.plan_edition or pj.selected_plan,
                'purchase_type': pj.purchase_type,
                'subscription_type': pj.subscription_type,
                'users_licenses': pj.users_licenses,
                'start_date': str(pj.start_date) if pj.start_date else None,
                'end_date': str(pj.end_date) if pj.end_date else None,
                'business_justification': pj.business_purpose or pj.why_required,
                'payment_reference': pj.payment_reference,
                'payment_amount': str(pj.final_payable_amount or pj.actual_purchase_amount),
                'requested_amount': str(pj.requested_amount or pr.requested_amount or '0.00'),
                'approved_amount': str(pj.finance_approved_amount or pj.manager_approved_amount or pr.approved_amount or '0.00'),
                'manager_approved_amount': str(pj.manager_approved_amount or '0.00'),
                'finance_approved_amount': str(pj.finance_approved_amount or '0.00'),
                'actual_purchase_amount': str(pj.actual_purchase_amount or '0.00'),
                'gst_tax': str(pj.gst_tax or '0.00'),
                'discount': str(pj.discount or '0.00'),
                'final_payable_amount': str(pj.final_payable_amount or '0.00'),
                'payment_date': str(pj.payment_date),
                'vendor_name': pj.vendor_name,
                'proof_description': pj.comments_remarks,
                'submitted_by': pj.team_lead_name,
                'submitted_at': timezone.now().isoformat(),
            }

            prev_status = pr.status
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['payment_justification'] = justification_json
            pr.extra_fields['purchase_type'] = pj.purchase_type
            pr.extra_fields['subscription_type'] = pj.subscription_type
            pr.extra_fields['start_date'] = str(pj.start_date) if pj.start_date else None
            pr.extra_fields['end_date'] = str(pj.end_date) if pj.end_date else None
            pr.extra_fields['software_name'] = pj.software_name
            pr.extra_fields['requested_amount'] = str(pj.requested_amount or pr.requested_amount or '0.00')
            pr.extra_fields['approved_amount'] = str(pj.finance_approved_amount or pj.manager_approved_amount or pr.approved_amount or '0.00')
            pr.extra_fields['actual_purchase_amount'] = str(pj.actual_purchase_amount or '0.00')
            pr.extra_fields['final_payable_amount'] = str(pj.final_payable_amount or '0.00')

            # Sync purchase_type with request_operation & request_type
            pt_upper = (pj.purchase_type or '').upper()
            if 'RENEW' in pt_upper:
                pr.request_operation = 'RENEWAL'
                pr.request_type = 'Renewal'
            elif 'UPGRADE' in pt_upper:
                pr.request_operation = 'UPGRADE'
                pr.request_type = 'Upgrade'
            elif 'NEW' in pt_upper:
                pr.request_operation = 'NEW'
                pr.request_type = 'New Purchase'

            pr.status = PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED
            pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
            if pr.is_software:
                _path = determine_final_approval_by(pr)
                pr.current_stage = 5 if _path == 'MANAGER' else (7 if _path == 'FINANCE' else 9)
            else:
                pr.current_stage = 9  # Stage 9: Payment Justification Submitted
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='PAYMENT_JUSTIFICATION_SUBMITTED',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED,
                comments=f"Payment Justification submitted by Team Lead {pj.team_lead_name}. Software: {pj.software_name}, Final Payable: Rs.{pj.final_payable_amount:,.2f}, Ref: {pj.payment_reference}",
                approved_amount=pj.final_payable_amount or pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=True,
                vendor=pj.vendor_name or pr.vendor or ''
            )

            try:
                for mgr in User.objects.filter(role='MANAGER', department=pr.department):
                    Notification.objects.create(
                        user=mgr,
                        purchase_request=pr,
                        title=f"Payment Justification Submitted | {pr.request_id}",
                        message=f"Team Lead {user.username} submitted Payment Justification for '{pr.title}' ({pr.request_id}). Please verify & approve."
                    )
            except Exception:
                pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)


    @action(detail=True, methods=['post'], url_path='acknowledge', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def acknowledge(self, request, pk=None):
        """
        TEAM LEAD ACKNOWLEDGE (Software & SaaS final step):
        MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT -> REQUEST_COMPLETED
        Team Lead acknowledges Managers verified justification and closes the request.

        Validation rules:
        1. Request exists.
        2. Request belongs to logged-in Team Lead.
        3. Payment was successfully processed.
        4. Payment Justification exists.
        5. Manager verification is completed.
        6. Request is currently waiting for Team Lead acknowledgement.
        7. Request is not already completed.
        8. User has Team Lead permission.
        """
        user = request.user
        comments = request.data.get('comments') or 'Team Lead acknowledged payment justification. Request completed.'

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # 2. Request belongs to logged-in Team Lead (or Admin)
            if user.role != 'ADMIN' and pr.created_by_id != user.id and pr.assigned_team_lead_id != user.id:
                return Response(
                    {'error': 'You can only acknowledge requests created by or assigned to you.'},
                    status=status.HTTP_403_FORBIDDEN
                )

            # 4. Payment Justification exists
            pj = getattr(pr, 'payment_justification', None)
            if not pj and not (isinstance(pr.extra_fields, dict) and pr.extra_fields.get('payment_justification')):
                return Response(
                    {'error': 'Payment Justification has not been submitted for this request.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # 5. Manager verification is completed.
            _ack_implied_statuses = [
                PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                PurchaseRequest.STATUS_MANAGER_VERIFIED,
                PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                PurchaseRequest.STATUS_REQUEST_COMPLETED,
                PurchaseRequest.STATUS_COMPLETED,
                PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
            ]
            is_mgr_verified = (
                (pj and pj.verified_at is not None) or
                (isinstance(pr.extra_fields, dict) and bool(pr.extra_fields.get('justification_verified_at'))) or
                pr.status in _ack_implied_statuses or
                pr.confirmed_by_team_lead
            )
            if not is_mgr_verified:
                return Response(
                    {'error': 'Manager verification is required before Team Lead acknowledgement.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # IDEMPOTENT RECEIPT & PAYMENT CONFIRMATION FLOW
            is_already_completed = (
                pr.status in [PurchaseRequest.STATUS_REQUEST_COMPLETED, PurchaseRequest.STATUS_COMPLETED, PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED] or
                pr.confirmed_by_team_lead
            )

            prev_status = pr.status
            now = timezone.now()
            now_iso = now.isoformat()

            # Ensure extra_fields dictionary
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}

            # Generate / reuse deterministic Software Receipt ID
            receipt_id = (
                pr.extra_fields.get('software_receipt_id') or
                pr.extra_fields.get('receipt_no') or
                f"RCP-SW-{pr.request_id}"
            )

            # 1. Update PaymentJustification
            if pj:
                pj.is_acknowledged = True
                if not pj.acknowledged_by:
                    pj.acknowledged_by = user
                if not pj.acknowledged_at:
                    pj.acknowledged_at = now
                if not pj.acknowledgement_notes:
                    pj.acknowledgement_notes = comments
                pj.payment_status = 'Paid'
                pj.save()

            # 2. Confirm / Create Payment record in payment_management (Idempotent)
            payment = Payment.objects.filter(purchase_request=pr).first()
            payment_ref = (
                pr.payment_reference or
                (pj.payment_reference if pj else '') or
                (pr.extra_fields.get('mock_payment_ref') if isinstance(pr.extra_fields, dict) else '') or
                f"TXN-{pr.request_id}"
            )
            payment_method = (
                pr.payment_method or
                (pj.payment_method if pj else '') or
                (pr.extra_fields.get('mock_payment_method') if isinstance(pr.extra_fields, dict) else '') or
                'Corporate Digital Card'
            )
            payment_date = pr.payment_date or (pj.payment_date if pj else None) or now.date()
            paid_amount = (
                (pj.actual_purchase_amount if pj and pj.actual_purchase_amount else None) or
                (pj.finance_approved_amount if pj and pj.finance_approved_amount else None) or
                pr.finance_approved_amount or pr.approved_amount or pr.requested_amount or Decimal('0.00')
            )
            vendor_name = (pj.vendor_name if pj and pj.vendor_name else '') or pr.vendor or pr.preferred_vendor or pr.software_name or 'Software Provider'

            if not payment:
                payment = Payment.objects.create(
                    purchase_request=pr,
                    amount=paid_amount,
                    payment_method=payment_method,
                    reference_number=payment_ref,
                    status='Paid',
                    payment_date=payment_date,
                    vendor_name=vendor_name,
                    notes=f"Software payment receipt for {pr.request_id}"
                )
            else:
                payment.status = 'Paid'
                if not payment.payment_date:
                    payment.payment_date = payment_date
                if not payment.reference_number:
                    payment.reference_number = payment_ref
                payment.save(update_fields=['status', 'payment_date', 'reference_number'])

            # 3. Confirm / Create PurchaseOrder & GoodsReceipt in procurement (Idempotent)
            try:
                vendor_obj = Vendor.objects.filter(name__icontains=vendor_name).first()
                if not vendor_obj:
                    vendor_obj = Vendor.objects.filter(category__name__icontains='software').first() or Vendor.objects.first()

                po, _ = PurchaseOrder.objects.get_or_create(
                    purchase_request=pr,
                    defaults={
                        'po_id': f"PO-SW-{pr.request_id}",
                        'vendor': vendor_obj,
                        'total_amount': payment.amount if payment else paid_amount,
                        'status': 'Delivered'
                    }
                )

                gr, _ = GoodsReceipt.objects.get_or_create(
                    receipt_id=receipt_id,
                    defaults={
                        'purchase_order': po,
                        'received_by': user if user.is_authenticated else pr.created_by,
                        'status': 'Verified',
                        'delivery_location': 'Digital Provisioning (Cloud / SaaS)',
                        'product_name': pr.software_name or pr.title,
                        'ordered_quantity': pr.quantity or 1,
                        'received_quantity': pr.quantity or 1,
                        'verified_by_name': 'Procurement Manager',
                        'notes': f"Software payment receipt for {pr.software_name or pr.title}. Ref: {payment.reference_number}"
                    }
                )
            except Exception as gr_err:
                import logging
                logging.getLogger(__name__).warning(f"GoodsReceipt sync notice: {gr_err}")

            # 4. Update PurchaseRequest and extra_fields
            pr.confirmed_by_team_lead = True
            if not pr.confirmed_at:
                pr.confirmed_at = now
            pr.status = PurchaseRequest.STATUS_REQUEST_COMPLETED
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.current_stage = 10
            pr.payment_method = payment.payment_method
            pr.payment_reference = payment.reference_number
            pr.payment_date = payment.payment_date
            pr.payment_status = 'Paid'

            pr.extra_fields['team_lead_acknowledged'] = True
            pr.extra_fields['acknowledged_by'] = pr.extra_fields.get('acknowledged_by') or (f"{user.first_name} {user.last_name}".strip() or user.username)
            pr.extra_fields['acknowledged_at'] = pr.extra_fields.get('acknowledged_at') or now_iso
            pr.extra_fields['acknowledgement_notes'] = pr.extra_fields.get('acknowledgement_notes') or comments
            pr.extra_fields['software_receipt_id'] = receipt_id
            pr.extra_fields['receipt_no'] = receipt_id
            pr.extra_fields['receipt_generated_at'] = pr.extra_fields.get('receipt_generated_at') or now_iso
            pr.extra_fields['payment_id'] = payment.payment_id
            pr.extra_fields['payment_reference'] = payment.reference_number
            pr.extra_fields['payment_method'] = payment.payment_method
            pr.extra_fields['payment_date'] = str(payment.payment_date) if payment.payment_date else str(now.date())
            pr.extra_fields['payment_status'] = 'Paid'

            if pj:
                pr.extra_fields['purchase_type'] = pj.purchase_type
                pr.extra_fields['subscription_type'] = pj.subscription_type
                pr.extra_fields['start_date'] = str(pj.start_date) if pj.start_date else None
                pr.extra_fields['end_date'] = str(pj.end_date) if pj.end_date else None
                pr.extra_fields['requested_amount'] = str(pj.requested_amount or pr.requested_amount or '0.00')
                pr.extra_fields['approved_amount'] = str(pj.finance_approved_amount or pj.manager_approved_amount or pr.approved_amount or '0.00')
                pr.extra_fields['actual_purchase_amount'] = str(pj.actual_purchase_amount or payment.amount or '0.00')
                pr.extra_fields['final_payable_amount'] = str(pj.final_payable_amount or payment.amount or '0.00')

            pr.save()

            # 5. Create ApprovalHistory entries (only if not already recorded)
            if not pr.approval_history.filter(action='TEAM_LEAD_ACKNOWLEDGE').exists():
                ApprovalHistory.objects.create(
                    request=pr,
                    action='TEAM_LEAD_ACKNOWLEDGE',
                    performed_by=user,
                    user_role=user.role,
                    previous_status=prev_status,
                    new_status=PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    comments=f"Team Lead acknowledged verified justification: {comments}",
                    approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                    cost_center=pr.cost_center or '',
                    budget_available=True,
                    vendor=pr.vendor or ''
                )

            if not pr.approval_history.filter(action='REQUEST_COMPLETED').exists():
                ApprovalHistory.objects.create(
                    request=pr,
                    action='REQUEST_COMPLETED',
                    performed_by=user,
                    user_role=user.role,
                    previous_status=PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    new_status=PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    comments="Software procurement request fully acknowledged, completed, and archived.",
                    approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                    cost_center=pr.cost_center or '',
                    budget_available=True,
                    vendor=pr.vendor or ''
                )

            # 6. Trigger required notifications (only if newly completed)
            if not is_already_completed:
                try:
                    notify_recipients = set()
                    if pr.assigned_manager:
                        notify_recipients.add(pr.assigned_manager)
                    for u in User.objects.filter(role__in=['MANAGER', 'FINANCE', 'ADMIN'], is_active=True):
                        notify_recipients.add(u)

                    for recipient in notify_recipients:
                        Notification.objects.create(
                            user=recipient,
                            purchase_request=pr,
                            title=f"Request {pr.request_id} Completed",
                            message=f"Team Lead {user.username} has acknowledged the verified Payment Justification for '{pr.title}'. Software procurement request {pr.request_id} is now fully COMPLETED with receipt {receipt_id}."
                        )
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Error sending notifications: {e}")

        serializer = PurchaseRequestSerializer(pr, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def create_subscription_operation(self, request, pk, operation):
        user = request.user
        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)
            if pr.status not in [PurchaseRequest.STATUS_REQUEST_COMPLETED, PurchaseRequest.STATUS_COMPLETED, PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED, 'Completed', 'Payment Completed']:
                return Response({'error': f'Only completed requests can be {operation.lower()}ed. Current: {pr.status}'}, status=status.HTTP_400_BAD_REQUEST)
            if not pr.is_software:
                return Response({'error': f'Only Software/SaaS requests can be {operation.lower()}ed.'}, status=status.HTTP_400_BAD_REQUEST)
            
            root = pr.original_request or pr
            
            active_statuses = [
                PurchaseRequest.STATUS_CREATED, PurchaseRequest.STATUS_MANAGER_REVIEW, PurchaseRequest.STATUS_FINANCE_REVIEW,
                PurchaseRequest.STATUS_ADMIN_REVIEW, PurchaseRequest.STATUS_MANAGER_APPROVED, PurchaseRequest.STATUS_FINANCE_APPROVED,
                PurchaseRequest.STATUS_ADMIN_APPROVED, PurchaseRequest.STATUS_PAYMENT_APPROVED, PurchaseRequest.STATUS_PAYMENT_PROCESSED,
                PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED, PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                PurchaseRequest.STATUS_PAYMENT_JUSTIFIED, PurchaseRequest.STATUS_MANAGER_VERIFIED, PurchaseRequest.STATUS_TEAM_LEAD_REVIEW,
                'Pending', 'Draft', 'Submitted'
            ]
            if PurchaseRequest.objects.filter(original_request=root, status__in=active_statuses).exists():
                return Response({'error': f'An active renewal or upgrade request already exists for this subscription.'}, status=status.HTTP_400_BAD_REQUEST)
                
            new_seq = 1
            last_renewal = PurchaseRequest.objects.filter(original_request=root).order_by('-renewal_sequence').first()
            if last_renewal and last_renewal.renewal_sequence:
                new_seq = last_renewal.renewal_sequence + 1
                
            op_prefix = 'R' if operation == 'RENEWAL' else 'U'
            new_id = f"{root.request_id}-{op_prefix}{new_seq}"
            
            # Extract original estimated cost from root/initial request
            orig_cost = (
                root.total_estimated_cost or
                root.requested_amount or
                root.approved_amount or
                pr.total_estimated_cost or
                pr.requested_amount or
                pr.approved_amount or
                Decimal('0.00')
            )
            root_extra = root.extra_fields if isinstance(root.extra_fields, dict) else {}
            if (not orig_cost or orig_cost <= 0) and root_extra:
                orig_cost = Decimal(str(root_extra.get('existingCost') or root_extra.get('estimatedCost') or root_extra.get('original_estimated_cost') or 0.00))
            if (not orig_cost or orig_cost <= 0) and hasattr(root, 'payment_justification') and root.payment_justification:
                orig_cost = (
                    root.payment_justification.requested_amount or
                    root.payment_justification.actual_purchase_amount or
                    root.payment_justification.final_payable_amount or
                    Decimal('0.00')
                )
            orig_cost = Decimal(str(orig_cost or 0.00))

            root_pj = getattr(root, 'payment_justification', None) or getattr(pr, 'payment_justification', None)
            pj_extra = {}
            if root_pj:
                pj_extra = {
                    'software_name': root_pj.software_name or pr.software_name or pr.title,
                    'vendor_name': root_pj.vendor_name or pr.vendor or pr.preferred_vendor,
                    'purchase_type': operation.title(),
                    'subscription_type': root_pj.subscription_type or 'Annual',
                    'users_licenses': root_pj.users_licenses or str(pr.quantity or 1),
                    'start_date': str(root_pj.end_date or root_pj.start_date or '') if (root_pj.end_date or root_pj.start_date) else '',
                    'end_date': str(root_pj.end_date or '') if root_pj.end_date else '',
                    'plan_edition': root_pj.plan_edition or pr.current_plan or 'Standard',
                    'requested_amount': float(root_pj.requested_amount or orig_cost),
                    'actual_purchase_amount': float(root_pj.actual_purchase_amount or orig_cost),
                    'gst_tax': float(root_pj.gst_tax or 0.0),
                    'discount': float(root_pj.discount or 0.0),
                    'final_payable_amount': float(root_pj.final_payable_amount or orig_cost),
                    'why_required': root_pj.why_required or pr.justification or '',
                    'business_purpose': root_pj.business_purpose or pr.business_requirement or pr.description or '',
                    'who_will_use': root_pj.who_will_use or f"{pr.department.name if pr.department else 'Engineering'} Team",
                    'expected_benefits': root_pj.expected_benefits or '',
                    'impact_if_not_purchased': root_pj.impact_if_not_purchased or '',
                    'urgency': root_pj.urgency or pr.priority or 'Medium',
                    'required_by_date': str(root_pj.required_by_date or pr.required_by or '') if (root_pj.required_by_date or pr.required_by) else '',
                    'vendor_contact': root_pj.vendor_contact or '',
                    'quote_number': root_pj.quote_number or '',
                    'purchase_date': str(root_pj.purchase_date or '') if root_pj.purchase_date else '',
                    'po_number': root_pj.po_number or '',
                    'purchase_url': root_pj.purchase_url or '',
                    'selected_plan': root_pj.selected_plan or root_pj.plan_edition or '',
                    'purchase_remarks': root_pj.purchase_remarks or f"{operation.title()} of active subscription.",
                    'payment_method': root_pj.payment_method or 'Corporate Card',
                    'payment_reference': root_pj.payment_reference or '',
                    'comments_remarks': root_pj.comments_remarks or '',
                }

            new_pr = PurchaseRequest.objects.create(
                request_id=new_id,
                title=f"{operation.title()}: {pr.title}",
                description=pr.description or '',
                category=pr.category,
                subcategory=pr.subcategory or '',
                quantity=pr.quantity or 1,
                priority=pr.priority or 'Medium',
                justification=pr.justification or '',
                business_requirement=pr.business_requirement or '',
                requested_amount=orig_cost,
                total_estimated_cost=orig_cost,
                existing_cost=orig_cost,
                vendor=pr.vendor or '',
                preferred_vendor=pr.preferred_vendor or '',
                current_plan=pr.current_plan or '',
                software_name=pr.software_name or '',
                department=pr.department,
                created_by=user,
                assigned_team_lead=user,
                assigned_manager=pr.assigned_manager,
                flow_type=pr.flow_type or 'B',
                status=PurchaseRequest.STATUS_PENDING,
                current_stage=1,
                current_approval_level=PurchaseRequest.LEVEL_TEAM_LEAD,
                parent_request=pr,
                original_request=root,
                request_operation=operation,
                renewal_sequence=new_seq,
                extra_fields={
                    'existingCost': float(orig_cost),
                    'estimatedCost': float(orig_cost),
                    'original_estimated_cost': float(orig_cost),
                    'requestType': operation.title(),
                    'purchase_type': operation.title(),
                    'payment_justification': pj_extra,
                    'original_payment_justification': pj_extra,
                }
            )
            
            ApprovalHistory.objects.create(
                request=new_pr,
                action='CREATE',
                performed_by=user,
                user_role=getattr(user, 'role', 'TEAM_LEAD'),
                previous_status='NONE',
                new_status=PurchaseRequest.STATUS_PENDING,
                comments=f"{operation.title()} request generated automatically.",
                approved_amount=0,
            )
            
            return Response(PurchaseRequestSerializer(new_pr).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'], url_path='renew', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def renew(self, request, pk=None):
        return self.create_subscription_operation(request, pk, 'RENEWAL')

    @action(detail=True, methods=['post'], url_path='upgrade', permission_classes=[permissions.IsAuthenticated, IsTeamLeadRole])
    def upgrade(self, request, pk=None):
        return self.create_subscription_operation(request, pk, 'UPGRADE')

class ManagerRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Dedicated REST endpoints for Manager Portal:
    - GET /api/manager/requests/: List requests for Manager review
    - GET /api/manager/requests/{id}/: Single request details with history
    - POST /api/manager/requests/{id}/approve/: Approve -> MANAGER_APPROVED
    - POST /api/manager/requests/{id}/reject/: Reject -> REJECTED
    - POST /api/manager/requests/{id}/recommend-finance/: Recommend -> FINANCE_REVIEW
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsManagerRole]
    filterset_fields = ['status', 'priority']
    search_fields = ['request_id', 'title', 'category', 'description']

    def get_queryset(self):
        user = self.request.user
        qs = get_base_purchase_request_queryset()

        if not user or not user.is_authenticated:
            return qs

        if user.role != 'ADMIN':
            if user.department:
                qs = qs.filter(
                    models.Q(department=user.department) | 
                    models.Q(assigned_manager=user) | 
                    models.Q(department__isnull=True) |
                    models.Q(created_by__department=user.department)
                )
        # Ensure Draft requests never enter Manager review queues
        qs = qs.exclude(status='DRAFT').exclude(current_stage=0)
        return apply_request_type_filter(qs, self.request)

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['post'], url_path='save-research', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def save_research(self, request, pk=None):
        """
        MANAGER RESEARCH (STAGE 3):
        Conducts research (market pricing, renewal/upgrade pricing, licensing, vendor quote ref).
        Status -> MANAGER_RESEARCHING, Stage -> 3.
        """
        user = request.user
        serializer = SaveResearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.research_completed = True
            research_obj.research_completed_at = timezone.now()
            research_obj.save()

            prev_status = pr.status
            if pr.status in [PurchaseRequest.STATUS_MANAGER_REVIEW, PurchaseRequest.STATUS_CREATED, 'Pending', 'SUBMITTED']:
                pr.status = PurchaseRequest.STATUS_MANAGER_RESEARCHING
                pr.current_stage = 3
                pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='MANAGER_RESEARCH',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=pr.status,
                comments=data.get('research_notes') or 'Manager conducted procurement research and market pricing analysis.',
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-pre-estimation', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def save_pre_estimation(self, request, pk=None):
        """
        MANAGER PRE-ESTIMATION (STAGE 4):
        Prepares commercial estimate (Current Cost, Estimated Cost, Recommended Cost, Taxes, Final Estimated Amount).
        Status -> PRE_ESTIMATION_COMPLETED, Stage -> 4.
        """
        user = request.user
        serializer = SavePreEstimationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.estimation_completed = True
            research_obj.estimation_completed_at = timezone.now()
            research_obj.save()

            final_amount = data.get('final_estimated_amount') or 0
            pr.total_estimated_cost = final_amount
            pr.approved_amount = final_amount
            if data.get('cost_center'):
                pr.cost_center = data['cost_center']
            if data.get('budget_code'):
                pr.budget_code = data['budget_code']
            if data.get('vendor'):
                pr.vendor = data['vendor']

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_PRE_ESTIMATION_COMPLETED
            pr.current_stage = 4
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='PRE_ESTIMATION',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PRE_ESTIMATION_COMPLETED,
                comments=data.get('manager_comments') or f"Manager completed pre-estimation. Final Estimated Amount: Rs.{final_amount:,.2f}",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def approve(self, request, pk=None):
        """
        MANAGER APPROVAL (STAGE 5 -> 6):
        MANAGER_REVIEW / PRE_ESTIMATION_COMPLETED -> FINANCE_REVIEW (Stage 6)
        """
        user = request.user
        serializer = ManagerApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        approved_amount = data.get('approved_amount')
        cost_center = data.get('cost_center', '')
        budget_code = data.get('budget_code', '')
        budget_available = data.get('budget_available', True)
        vendor = data.get('vendor', '')
        comments = data.get('comments', '')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only approve requests within your department.")

            duplicate_response = completed_action_response(pr, 'approve', user.role)
            if duplicate_response:
                return duplicate_response

            # Strict Guard: Manager cannot bypass Team Lead approval
            if pr.status in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, PurchaseRequest.STATUS_CREATED] and user.role != 'ADMIN':
                return Response(
                    {'error': "Manager cannot bypass Team Lead approval. The request must first be reviewed and approved by the Team Lead."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Valid pre-condition status
            valid_statuses = [
                PurchaseRequest.STATUS_MANAGER_REVIEW,
                PurchaseRequest.STATUS_MANAGER_RESEARCHING,
                PurchaseRequest.STATUS_PRE_ESTIMATION_COMPLETED,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                'Pending', 'SUBMITTED'
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in Manager Review to be approved by Manager."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_MANAGER_APPROVED
            pr.current_approval_level = PurchaseRequest.LEVEL_MANAGER
            pr.current_stage = 3  # Stage 3: Manager Approval
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['final_approval_by'] = 'MANAGER'
            pr.extra_fields['manager_approved'] = True
            pr.extra_fields['manager_approved_at'] = timezone.now().isoformat()

            # Update commercial fields & amounts
            pr.approved_amount = approved_amount if approved_amount is not None else (pr.requested_amount or pr.total_estimated_cost or 0)
            pr.total_estimated_cost = pr.approved_amount
            if cost_center:
                pr.cost_center = cost_center
            if budget_code:
                pr.budget_code = budget_code
            if vendor:
                pr.vendor = vendor
            pr.budget_available = budget_available
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='APPROVE',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=pr.status,
                comments=comments or 'Approved by Manager. Commercial evaluation and budget verified.',
                approved_amount=pr.approved_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='APPROVE',
                notes=comments
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Approved by Manager",
                        message=f"Request '{pr.title}' has been approved by Manager {user.username} for Rs.{pr.approved_amount:,.2f}."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def reject(self, request, pk=None):
        """
        MANAGER REJECTION:
        MANAGER_REVIEW -> REJECTED
        """
        user = request.user
        serializer = ManagerRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only reject requests within your department.")

            if pr.status not in [PurchaseRequest.STATUS_MANAGER_REVIEW, 'Pending', 'SUBMITTED']:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in 'MANAGER_REVIEW' to be rejected by Manager."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_REJECTED
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='REJECT',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_REJECTED,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='REJECT',
                notes=comments
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Rejected by Manager",
                        message=f"Request '{pr.title}' was rejected by Manager {user.username}. Reason: {comments}"
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send-back', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def send_back(self, request, pk=None):
        """
        MANAGER SEND BACK:
        MANAGER_REVIEW -> SENT_BACK
        """
        user = request.user
        serializer = TeamLeadRejectOrSendBackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department and getattr(pr, 'assigned_manager', None) != user and getattr(pr, 'assigned_team_lead', None) != user:
                raise PermissionDenied("You can only send back requests within your department.")

            if pr.status not in [PurchaseRequest.STATUS_MANAGER_REVIEW, PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED, 'Pending', 'SUBMITTED']:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'MANAGER_REVIEW' or 'PAYMENT_JUSTIFICATION_SUBMITTED' to be sent back by Manager."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            is_justification_sendback = (prev_status == PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED)
            pr.status = PurchaseRequest.STATUS_SENT_BACK
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD
            pr.current_stage = 6 if is_justification_sendback else 1
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['send_back_reason'] = comments
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='SEND_BACK',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_SENT_BACK,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            try:
                if pr.created_by:
                    notif_title = f"Payment Justification Sent Back for Correction | {pr.request_id}" if is_justification_sendback else f"Request {pr.request_id} Sent Back by Manager"
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=notif_title,
                        message=f"Your request '{pr.title}' ({pr.request_id}) was sent back by Manager {user.username}. Reason: {comments}"
                    )
            except Exception:
                pass

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='RETURN',
                notes=comments
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Sent Back by Manager",
                        message=f"Manager {user.username} sent back request '{pr.title}'. Feedback: {comments}"
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='recommend-finance', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def recommend_finance(self, request, pk=None):
        """
        MANAGER RECOMMENDATION TO FINANCE:
        MANAGER_REVIEW -> FINANCE_RECOMMENDED -> FINANCE_REVIEW
        Makes request visible in Finance Department queue.
        """
        user = request.user
        serializer = ManagerRecommendSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data.get('comments') or 'Recommended to Finance Department for financial review and approval.'

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Check authorized role
            if user.role not in ['ADMIN', 'MANAGER']:
                raise PermissionDenied("Only Managers and Administrators can recommend requests to Finance.")

            # Strict Guard: Manager cannot recommend if request hasn't cleared Team Lead
            # Strict Guard: Manager cannot recommend if request hasn't cleared Team Lead
            if pr.status in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW] and user.role != 'ADMIN':
                return Response(
                    {'error': "Manager cannot recommend unapproved request to Finance. The request must first clear Team Lead review."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valid_recommend_statuses = [
                PurchaseRequest.STATUS_MANAGER_REVIEW,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                PurchaseRequest.STATUS_CREATED,
                PurchaseRequest.STATUS_TEAM_LEAD_SUBMITTED,
                'Pending', 'Approved', 'SUBMITTED', 'Created',
                'rfq_sent', 'QUOTES_RECEIVED', 'under_review', 'pending_approval', 'PENDING'
            ]
            if pr.status not in valid_recommend_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in an approvable status to be recommended to Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            # Moves to RECOMMENDED_TO_FINANCE, visible to Finance portal
            pr.status = PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            pr.current_stage = 3

            # Store recommendation metadata in extra_fields
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['recommendation_reason'] = comments
            user_fullname = f"{user.first_name} {user.last_name}".strip() or user.username
            pr.extra_fields['recommended_by'] = user_fullname
            pr.extra_fields['recommended_portal'] = 'Manager Portal'
            pr.extra_fields['recommended_date'] = timezone.now().isoformat()
            pr.extra_fields['finance_status'] = 'Awaiting Finance Action'
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='RECOMMEND_FINANCE',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                comments=comments,
                approved_amount=pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='RECOMMEND',
                notes=comments
            )

            for f_u in User.objects.filter(role='FINANCE'):
                try:
                    Notification.objects.create(
                        user=f_u,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Forwarded to Finance",
                        message=f"Request '{pr.title}' ({pr.request_id}) was recommended to Finance by Manager {user.username}. Reason: {comments}"
                    )
                except Exception:
                    pass

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Forwarded to Finance",
                        message=f"Request '{pr.title}' was recommended to Finance by Manager {user.username}."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='forward-to-finance', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def forward_to_finance(self, request, pk=None):
        return self.recommend_finance(request, pk=pk)

    @action(detail=True, methods=['post'], url_path='verify-justification', permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def verify_justification(self, request, pk=None):
        """
        MANAGER PAYMENT JUSTIFICATION VERIFICATION (Software & SaaS):
        PAYMENT_JUSTIFICATION_SUBMITTED -> MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT
        Manager reviews submitted SaaS/product details and payment proofs, then verifies.
        Enables Team Lead Acknowledge button.
        """
        user = request.user

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            # Check duplicate / already verified
            if pr.status in [
                PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                PurchaseRequest.STATUS_MANAGER_VERIFIED,
                PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
                PurchaseRequest.STATUS_REQUEST_COMPLETED,
                PurchaseRequest.STATUS_COMPLETED
            ]:
                return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

            allowed_verify_statuses = [
                PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED,
                PurchaseRequest.STATUS_PAYMENT_PROCESSED,
                PurchaseRequest.STATUS_PAYMENT_APPROVED,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                PurchaseRequest.STATUS_ADMIN_APPROVED,
                'PAYMENT_JUSTIFICATION_SUBMITTED',
                'PAYMENT_PROCESSED',
                'PAYMENT_APPROVED',
                'MANAGER_APPROVED',
                'ADMIN_APPROVED',
            ]

            # If request is software / renewal / upgrade or has justification info
            is_renewal_or_upgrade = (
                getattr(pr, 'request_operation', '') in ['RENEWAL', 'UPGRADE'] or
                bool(getattr(pr, 'original_request_id', None)) or
                bool(getattr(pr, 'parent_request_id', None)) or
                any((pr.title or '').upper().startswith(k) for k in ['RENEWAL:', 'UPGRADE:'])
            )

            if not (pr.status in allowed_verify_statuses or is_renewal_or_upgrade or hasattr(pr, 'payment_justification') or (isinstance(pr.extra_fields, dict) and pr.extra_fields.get('payment_justification'))):
                return Response(
                    {'error': f"Justification verification requires payment justification details. Current status: '{pr.status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            data = request.data
            manager_notes = data.get('notes') or data.get('comments') or 'Payment justification verified by Manager.'

            prev_status = pr.status
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['justification_verified_by'] = f"{user.first_name} {user.last_name}".strip() or user.username
            pr.extra_fields['justification_verified_at'] = timezone.now().isoformat()
            pr.extra_fields['justification_manager_notes'] = manager_notes

            # Intermediate status: Awaiting Team Lead Acknowledgement.
            # Manager verification MUST NOT complete the request directly!
            pr.status = PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD
            if pr.is_software:
                _path = determine_final_approval_by(pr)
                pr.current_stage = 7 if _path == 'MANAGER' else (9 if _path == 'FINANCE' else 11)
            else:
                pr.current_stage = 11
            pr.save()

            # Ensure PaymentJustification model instance exists and is marked verified
            pj, _ = PaymentJustification.objects.get_or_create(request=pr)
            if not pj.software_name and isinstance(pr.extra_fields, dict) and pr.extra_fields.get('payment_justification'):
                pj_dict = pr.extra_fields['payment_justification']
                pj.software_name = pj_dict.get('software_name') or pr.software_name or pr.title or ''
                pj.vendor_name = pj_dict.get('vendor_name') or pr.vendor or pr.preferred_vendor or ''
                pj.purchase_type = pj_dict.get('purchase_type') or pr.request_type or ('Renewal' if is_renewal_or_upgrade else 'New')
                pj.subscription_type = pj_dict.get('subscription_type') or 'Annual'
                pj.users_licenses = str(pj_dict.get('users_licenses') or pr.quantity or '1')
                try:
                    if pj_dict.get('requested_amount'):
                        pj.requested_amount = Decimal(str(pj_dict['requested_amount']))
                    if pj_dict.get('actual_purchase_amount'):
                        pj.actual_purchase_amount = Decimal(str(pj_dict['actual_purchase_amount']))
                    if pj_dict.get('final_payable_amount'):
                        pj.final_payable_amount = Decimal(str(pj_dict['final_payable_amount']))
                except Exception:
                    pass
                pj.why_required = pj_dict.get('why_required') or pr.justification or ''
                pj.business_purpose = pj_dict.get('business_purpose') or pr.business_requirement or ''
                pj.who_will_use = pj_dict.get('who_will_use') or ''
                pj.payment_method = pj_dict.get('payment_method') or 'Corporate Card'
                pj.payment_reference = pj_dict.get('payment_reference') or ''
                pj.confirmation_checked = True

            pj.verified_by = user
            pj.verified_at = timezone.now()
            pj.manager_notes = manager_notes
            pj.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='MANAGER_VERIFIED',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                comments=f"Payment Justification verified by Manager. Notes: {manager_notes}",
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=True,
                vendor=pr.vendor or ''
            )

            try:
                if pr.created_by:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Payment Justification Verified | {pr.request_id}",
                        message=f"Manager {user.username} verified payment justification for '{pr.title}'. Awaiting your final acknowledgment.",
                    )
            except Exception:
                pass

            return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

            try:
                if pr.created_by:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Payment Justification Verified | {pr.request_id}",
                        message=f"Manager has verified your Payment Justification for '{pr.title}'. Please acknowledge to complete the request."
                    )
            except Exception:
                pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

class FinanceRequestViewSet(viewsets.ModelViewSet):
    """
    Dedicated REST endpoints for Finance Department Portal:
    - GET /api/finance/requests/: List requests visible to Finance
    - GET /api/finance/requests/{id}/: Single request details with full history
    - POST /api/finance/requests/{id}/approve/: Finance approval -> FINANCE_APPROVED
    - POST /api/finance/requests/{id}/reject/: Finance rejection -> FINANCE_REJECTED
    - POST /api/finance/requests/{id}/send-back/: Finance send back -> SENT_BACK
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsFinanceRole]
    filterset_fields = ['priority', 'department']
    search_fields = ['request_id', 'title', 'category', 'description', 'vendor']

    def get_queryset(self):
        user = self.request.user
        qs = get_base_purchase_request_queryset()
        # Drafts must not enter finance approval workflows
        qs = qs.exclude(status='DRAFT').exclude(current_stage=0)

        status_param = self.request.query_params.get('status')
        if status_param:
            status_param_upper = status_param.upper()
            if status_param_upper in ['PENDING', 'FINANCE_REVIEW', 'RECOMMENDED_TO_FINANCE', 'MANAGER_RECOMMENDED_TO_FINANCE', 'FINANCE_RECOMMENDED', 'FINANCE_RESEARCH', 'COST_ESTIMATION', 'FINANCE_REPORT']:
                qs = qs.filter(
                    models.Q(status__in=[
                        PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                        PurchaseRequest.STATUS_MANAGER_RECOMMENDED_TO_FINANCE,
                        PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                        PurchaseRequest.STATUS_FINANCE_REVIEW,
                        PurchaseRequest.STATUS_FINANCE_RESEARCH,
                        PurchaseRequest.STATUS_COST_ESTIMATION,
                        PurchaseRequest.STATUS_FINANCE_REPORT,
                        PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                        PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN,
                        'Recommended',
                        'SENT_TO_FINANCE',
                    ]) |
                    models.Q(current_approval_level__in=[PurchaseRequest.LEVEL_FINANCE, PurchaseRequest.LEVEL_ADMIN])
                )
            elif status_param_upper in ['RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN']:
                qs = qs.filter(status__in=[PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN, PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN])
            elif status_param_upper in ['APPROVED', 'FINANCE_APPROVED', 'ADMIN_APPROVED']:
                qs = qs.filter(status__in=[PurchaseRequest.STATUS_FINANCE_APPROVED, PurchaseRequest.STATUS_APPROVED, PurchaseRequest.STATUS_ADMIN_APPROVED])
            elif status_param_upper in ['PAYMENT_APPROVED']:
                qs = qs.filter(status=PurchaseRequest.STATUS_PAYMENT_APPROVED)
            elif status_param_upper in ['PAYMENT_COMPLETED', 'PAID']:
                qs = qs.filter(status=PurchaseRequest.STATUS_PAYMENT_COMPLETED)
            elif status_param_upper in ['COMPLETED', 'FINISHED', 'REQUEST_COMPLETED']:
                qs = qs.filter(status__in=[
                    PurchaseRequest.STATUS_COMPLETED,
                    PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
                ])
            elif status_param_upper in ['PENDING_ACKNOWLEDGEMENT', 'AWAITING_ACKNOWLEDGEMENT']:
                qs = qs.filter(status__in=[
                    PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                    PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                    PurchaseRequest.STATUS_MANAGER_VERIFIED,
                ])
            elif status_param_upper in ['REJECTED', 'FINANCE_REJECTED']:
                qs = qs.filter(status=PurchaseRequest.STATUS_FINANCE_REJECTED)
            elif status_param_upper in ['SENT_BACK', 'RETURNED']:
                qs = qs.filter(status__in=[PurchaseRequest.STATUS_SENT_BACK, PurchaseRequest.STATUS_RETURNED])
            elif status_param_upper != 'ALL':
                qs = qs.filter(status__iexact=status_param)
            return apply_request_type_filter(qs, self.request)

        finance_lifecycle_statuses = [
            PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
            PurchaseRequest.STATUS_MANAGER_RECOMMENDED_TO_FINANCE,
            PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
            PurchaseRequest.STATUS_FINANCE_REVIEW,
            PurchaseRequest.STATUS_FINANCE_RESEARCH,
            PurchaseRequest.STATUS_COST_ESTIMATION,
            PurchaseRequest.STATUS_FINANCE_REPORT,
            PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
            PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN,
            PurchaseRequest.STATUS_ADMIN_REVIEW,
            PurchaseRequest.STATUS_ADMIN_APPROVED,
            PurchaseRequest.STATUS_FINANCE_APPROVED,
            PurchaseRequest.STATUS_PAYMENT_APPROVED,
            PurchaseRequest.STATUS_PAYMENT_PROCESSED,
            PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED,
            PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
            PurchaseRequest.STATUS_MANAGER_VERIFIED,
            PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
            PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
            PurchaseRequest.STATUS_REQUEST_COMPLETED,
            PurchaseRequest.STATUS_PAYMENT_COMPLETED,
            PurchaseRequest.STATUS_COMPLETED,
            PurchaseRequest.STATUS_FINANCE_REJECTED,
            PurchaseRequest.STATUS_SENT_BACK,
            'Recommended',
            'SENT_TO_FINANCE',
        ]
        filtered_qs = qs.filter(
            models.Q(status__in=finance_lifecycle_statuses) |
            models.Q(current_approval_level=PurchaseRequest.LEVEL_FINANCE) |
            models.Q(approval_steps__decision__in=['RECOMMEND', 'RECOMMEND_FINANCE', 'FINANCE_APPROVE', 'RECOMMEND_ADMIN']) |
            models.Q(approval_steps__role='FINANCE') |
            models.Q(created_by__role='FINANCE')
        ).distinct()
        return apply_request_type_filter(filtered_qs, self.request)

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['post'], url_path='save-research', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def save_research(self, request, pk=None):
        """
        FINANCE RESEARCH (STAGE 5):
        Conducts research (market pricing, available alternatives, business value, vendor quote ref, research notes).
        Status -> FINANCE_RESEARCH, Stage -> 5.
        """
        user = request.user
        serializer = SaveResearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.researched_by = user
            research_obj.research_completed = True
            research_obj.research_completed_at = timezone.now()
            research_obj.save()

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_RESEARCH
            pr.current_stage = 5
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_RESEARCH',
                performed_by=user,
                user_role=getattr(user, 'role', 'FINANCE'),
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_FINANCE_RESEARCH,
                comments=data.get('research_notes') or 'Finance recorded software research findings and vendor benchmark analysis.',
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-cost-estimation', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def save_cost_estimation(self, request, pk=None):
        """
        FINANCE COST ESTIMATION & REPORT GENERATION (STAGES 6 & 7):
        Prepares commercial estimate, breakdown of current cost, estimated cost, recommended cost, tax, discount, net final amount.
        Status -> FINANCE_REPORT (Stage 7), making records immediately visible in Finance Report.
        """
        user = request.user
        serializer = SavePreEstimationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.estimation_completed = True
            research_obj.estimation_completed_at = timezone.now()
            research_obj.is_completed = True
            research_obj.save()

            final_amount = data.get('final_estimated_amount') or 0
            pr.total_estimated_cost = final_amount
            pr.finance_approved_amount = final_amount
            pr.approved_amount = final_amount
            if data.get('cost_center'):
                pr.cost_center = data['cost_center']
            if data.get('budget_code'):
                pr.budget_code = data['budget_code']
            if data.get('vendor'):
                pr.vendor = data['vendor']

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_REPORT
            pr.current_stage = 7
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='COST_ESTIMATION',
                performed_by=user,
                user_role=getattr(user, 'role', 'FINANCE'),
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_COST_ESTIMATION,
                comments=f"Finance prepared cost estimation. Final Estimated Amount: Rs.{final_amount:,.2f}",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_REPORT',
                performed_by=user,
                user_role=getattr(user, 'role', 'FINANCE'),
                previous_status=PurchaseRequest.STATUS_COST_ESTIMATION,
                new_status=PurchaseRequest.STATUS_FINANCE_REPORT,
                comments=data.get('manager_comments') or data.get('business_evaluation') or f"Finance Report dossier generated. Final allocation: Rs.{final_amount:,.2f}. Ready for review in Finance Reports.",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit-cost-estimation', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def submit_cost_estimation(self, request, pk=None):
        return self.save_cost_estimation(request, pk=pk)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def approve(self, request, pk=None):
        """
        FINANCE APPROVAL (STAGE 7):
        FINANCE_REVIEW -> FINANCE_APPROVED
        Persists exact finance_approved_amount in database.
        """
        user = request.user
        serializer = FinanceApproveActionSerializer(data=request.data)
        if not serializer.is_valid():
            serializer = ManagerApproveSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        approved_amount = data.get('finance_approved_amount') or data.get('approved_amount')
        cost_center = data.get('cost_center', '')
        budget_code = data.get('budget_code', '')
        budget_available = data.get('budget_available', True)
        vendor = data.get('vendor', '')
        payment_method = data.get('payment_method', 'Bank Transfer')
        comments = data.get('comments', '')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            valid_statuses = [
                PurchaseRequest.STATUS_FINANCE_REVIEW,
                PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                PurchaseRequest.STATUS_FINANCE_RESEARCH,
                PurchaseRequest.STATUS_COST_ESTIMATION,
                PurchaseRequest.STATUS_FINANCE_REPORT,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                'Pending', 'Recommended', 'Submitted', 'SENT_TO_FINANCE'
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in 'FINANCE_REVIEW' to be approved by Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            new_status = PurchaseRequest.STATUS_FINANCE_APPROVED
            pr.status = new_status
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            pr.current_stage = 5 if pr.is_software else 7
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['final_approval_by'] = 'FINANCE'
            pr.extra_fields['finance_approved'] = True
            pr.extra_fields['finance_approved_at'] = timezone.now().isoformat()
            pr.extra_fields['finance_status'] = 'Approved'

            if approved_amount is not None:
                pr.finance_approved_amount = approved_amount
                pr.approved_amount = approved_amount
                pr.total_estimated_cost = approved_amount
            elif not pr.approved_amount:
                pr.approved_amount = pr.requested_amount
                pr.finance_approved_amount = pr.requested_amount

            if cost_center:
                pr.cost_center = cost_center
            if budget_code:
                pr.budget_code = budget_code
            if payment_method:
                pr.payment_method = payment_method
            if vendor:
                pr.vendor = vendor
            pr.budget_available = budget_available
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_APPROVE',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=new_status,
                comments=comments or f"Approved by Finance department for Rs.{pr.finance_approved_amount or pr.approved_amount:,.2f}.",
                approved_amount=pr.finance_approved_amount or pr.approved_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='APPROVE',
                notes=comments
            )

            try:
                # 1. Notify Manager (Section 6)
                mgr_qs = User.objects.filter(role='MANAGER')
                if pr.department:
                    dept_mgrs = mgr_qs.filter(department=pr.department)
                    if dept_mgrs.exists():
                        mgr_qs = dept_mgrs
                for mgr in mgr_qs:
                    Notification.objects.create(
                        user=mgr,
                        purchase_request=pr,
                        title=f"Software Request {pr.request_id} Payment Approved",
                        message=f"Software request {pr.request_id} has been approved by Finance and payment has been approved."
                    )
                # 2. Notify Team Lead (Section 6)
                if pr.created_by:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Payment Available for Request {pr.request_id}",
                        message=f"Your software request {pr.request_id} has been approved and payment is available."
                    )
            except Exception:
                pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='process-payment', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def process_payment(self, request, pk=None):
        """
        FINANCE PAYMENT PROCESSING (STAGE 8):
        Processes payment, records payment reference, method, date, status.
        Transitions request to PAYMENT_COMPLETED (Stage 8).
        """
        user = request.user
        serializer = ProcessPaymentActionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        payable_amount = data['final_payable_amount']
        pay_method = data.get('payment_method', 'Bank Transfer')
        pay_ref = data['payment_reference']
        pay_date = data.get('payment_date') or timezone.now().date()
        pay_remarks = data.get('payment_remarks', '')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            valid_statuses = [
                PurchaseRequest.STATUS_FINANCE_APPROVED,
                PurchaseRequest.STATUS_APPROVED,
                'Approved',
                PurchaseRequest.STATUS_PAYMENT_COMPLETED
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Payment can only be processed for Approved requests. Current status: '{pr.status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_PAYMENT_COMPLETED
            pr.current_stage = 8
            pr.payment_method = pay_method
            pr.payment_reference = pay_ref
            pr.payment_date = pay_date
            pr.payment_status = 'PAID'
            pr.payment_notes = pay_remarks
            if not pr.finance_approved_amount:
                pr.finance_approved_amount = payable_amount
            pr.save()

            valid_method = pay_method if pay_method in ['Bank Transfer', 'Wire', 'Credit Card', 'Check'] else 'Bank Transfer'
            Payment.objects.create(
                purchase_request=pr,
                amount=payable_amount,
                payment_method=valid_method,
                reference_number=pay_ref,
                payment_date=pay_date or timezone.now().date(),
                status='Paid',
                vendor_name=pr.vendor or getattr(pr, 'software_name', '') or 'Software Vendor',
                notes=pay_remarks,
            )

            ApprovalHistory.objects.create(
                request=pr,
                action='PROCESS_PAYMENT',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_PAYMENT_COMPLETED,
                comments=f"Payment of Rs.{payable_amount:,.2f} processed via {pay_method}. Ref: {pay_ref}. {pay_remarks}".strip(),
                approved_amount=payable_amount,
                cost_center=pr.cost_center or '',
                budget_available=True,
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='PAYMENT_PROCESSED',
                notes=f"Payment completed. Ref: {pay_ref}"
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Payment Completed for Request {pr.request_id}",
                        message=f"Finance has completed payment of Rs.{payable_amount:,.2f} for '{pr.title}' (Ref: {pay_ref}). Please review and confirm completion."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def reject(self, request, pk=None):
        """
        FINANCE REJECTION:
        FINANCE_REVIEW -> FINANCE_REJECTED
        """
        user = request.user
        serializer = ManagerRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            valid_statuses = [
                PurchaseRequest.STATUS_FINANCE_REVIEW,
                PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                'Pending', 'Recommended', 'Submitted', 'SENT_TO_FINANCE'
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in 'FINANCE_REVIEW' to be rejected by Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_REJECTED
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_REJECT',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_FINANCE_REJECTED,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='REJECT',
                notes=comments
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Rejected by Finance",
                        message=f"Request '{pr.title}' was rejected by Finance ({user.username}). Reason: {comments}"
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send-back', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def send_back(self, request, pk=None):
        """
        FINANCE SEND BACK:
        FINANCE_REVIEW -> SENT_BACK
        """
        user = request.user
        serializer = TeamLeadRejectOrSendBackSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        comments = serializer.validated_data['comments']

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            valid_statuses = [
                PurchaseRequest.STATUS_FINANCE_REVIEW,
                PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                'Pending', 'Recommended', 'Submitted', 'SENT_TO_FINANCE'
            ]
            if pr.status not in valid_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'FINANCE_REVIEW' to be sent back by Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_SENT_BACK
            pr.current_approval_level = PurchaseRequest.LEVEL_EMPLOYEE
            pr.current_stage = 0
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='SEND_BACK',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_SENT_BACK,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='RETURN',
                notes=comments
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Sent Back by Finance",
                        message=f"Finance ({user.username}) sent back request '{pr.title}'. Feedback: {comments}"
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='recommend-admin', permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def recommend_admin(self, request, pk=None):
        """
        FINANCE RECOMMENDATION TO ADMIN:
        FINANCE_REVIEW / RECOMMENDED_TO_FINANCE -> RECOMMENDED_TO_ADMIN
        Forwards request with recommendation notes, researched cost, and justification to Admin portal.
        """
        user = request.user
        reason = request.data.get('reason', '')
        comments = request.data.get('comments') or request.data.get('notes') or reason or 'Recommended to Administrator for executive approval.'
        recommended_amount = request.data.get('recommended_amount') or request.data.get('approved_amount')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role not in ['ADMIN', 'FINANCE']:
                raise PermissionDenied("Only Finance Officers and Administrators can recommend requests to Admin.")

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN
            pr.current_approval_level = PurchaseRequest.LEVEL_ADMIN
            pr.current_stage = 5 if pr.is_software else 4

            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            user_fullname = f"{user.first_name} {user.last_name}".strip() or user.username
            pr.extra_fields['finance_recommendation_reason'] = reason
            pr.extra_fields['finance_recommended_by'] = user_fullname
            pr.extra_fields['finance_recommended_date'] = timezone.now().isoformat()
            pr.extra_fields['finance_comments'] = comments
            pr.extra_fields['finance_status'] = 'Recommended to Admin'
            pr.finance_comment = comments

            if recommended_amount is not None:
                try:
                    pr.finance_approved_amount = float(recommended_amount)
                except (ValueError, TypeError):
                    pass

            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_RECOMMEND_ADMIN',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                comments=f"{reason} - {comments}" if reason and reason != comments else comments,
                approved_amount=pr.finance_approved_amount or pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalStep.objects.create(
                request=pr,
                actor=user,
                role=user.role,
                decision='RECOMMEND_ADMIN',
                notes=comments
            )

            for a_u in User.objects.filter(role='ADMIN'):
                try:
                    Notification.objects.create(
                        user=a_u,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Forwarded to Admin",
                        message=f"Request '{pr.title}' ({pr.request_id}) was recommended to Admin by Finance ({user_fullname}). Reason: {reason or comments}"
                    )
                except Exception:
                    pass

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Recommended to Admin",
                        message=f"Your request '{pr.title}' has been recommended to Admin by Finance for executive approval."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)


class AdminRequestViewSet(viewsets.ModelViewSet):
    """
    Dedicated REST endpoints for Administrator Portal:
    - GET /api/admin/requests/: List all requests across entire organization with full audit logs
    - GET /api/admin/requests/{id}/: Single request details with full approval history
    - GET /api/admin/requests/{id}/history/: Immutable audit history for a request
    - POST /api/admin/requests/{id}/approve/: Admin override/final approval
    - POST /api/admin/requests/{id}/reject/: Admin rejection
    - POST /api/admin/requests/{id}/send-back/: Admin send back for revision
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdminRole]
    filterset_fields = ['priority', 'department', 'current_stage']
    search_fields = ['request_id', 'title', 'category', 'description', 'vendor', 'cost_center']

    def get_queryset(self):
        qs = get_base_purchase_request_queryset()

        status_param = self.request.query_params.get('status')
        if status_param:
            status_param_upper = status_param.upper()
            if status_param_upper in ['PENDING', 'RECOMMENDED_TO_ADMIN', 'FINANCE_RECOMMENDED_TO_ADMIN', 'ADMIN_REVIEW']:
                qs = qs.filter(
                    models.Q(status__in=[
                        PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                        PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN,
                        PurchaseRequest.STATUS_ADMIN_REVIEW,
                    ]) |
                    models.Q(current_approval_level=PurchaseRequest.LEVEL_ADMIN)
                )
            elif status_param_upper in ['APPROVED', 'ADMIN_APPROVED']:
                qs = qs.filter(status__in=[
                    PurchaseRequest.STATUS_APPROVED,
                    PurchaseRequest.STATUS_ADMIN_APPROVED,
                    PurchaseRequest.STATUS_PAYMENT_PROCESSED,
                    PurchaseRequest.STATUS_PAYMENT_JUSTIFICATION_SUBMITTED,
                    PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                    PurchaseRequest.STATUS_MANAGER_VERIFIED,
                    PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                    PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
                    PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    PurchaseRequest.STATUS_COMPLETED,
                ])
            elif status_param_upper in ['COMPLETED', 'REQUEST_COMPLETED']:
                qs = qs.filter(status__in=[
                    PurchaseRequest.STATUS_COMPLETED,
                    PurchaseRequest.STATUS_REQUEST_COMPLETED,
                    PurchaseRequest.STATUS_TEAM_LEAD_ACKNOWLEDGED,
                ])
            elif status_param_upper in ['PENDING_ACKNOWLEDGEMENT', 'AWAITING_ACKNOWLEDGEMENT']:
                qs = qs.filter(status__in=[
                    PurchaseRequest.STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT,
                    PurchaseRequest.STATUS_PAYMENT_JUSTIFIED,
                    PurchaseRequest.STATUS_MANAGER_VERIFIED,
                ])
            elif status_param_upper in ['REJECTED', 'ADMIN_REJECTED']:
                qs = qs.filter(status=PurchaseRequest.STATUS_REJECTED)
            elif status_param_upper in ['RETURNED', 'SENT_BACK']:
                qs = qs.filter(status__in=[PurchaseRequest.STATUS_SENT_BACK, PurchaseRequest.STATUS_RETURNED])
            elif status_param_upper != 'ALL':
                qs = qs.filter(status__iexact=status_param)

        return apply_request_type_filter(qs, self.request)

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        pr = self.get_object()
        history_qs = pr.approval_history.all().order_by('-created_at')
        serializer = ApprovalHistorySerializer(history_qs, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        user = request.user
        comments = request.data.get('comments', 'Approved by Administrator.')
        approved_amount = request.data.get('approved_amount')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            prev_status = pr.status
            new_status = PurchaseRequest.STATUS_ADMIN_APPROVED if pr.is_software else PurchaseRequest.STATUS_APPROVED
            pr.status = new_status
            pr.current_approval_level = PurchaseRequest.LEVEL_TEAM_LEAD if pr.is_software else PurchaseRequest.LEVEL_COMPLETED
            pr.current_stage = 7 if pr.is_software else 4
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['final_approval_by'] = 'ADMIN'
            pr.extra_fields['admin_approved'] = True
            pr.extra_fields['admin_approved_at'] = timezone.now().isoformat()
            pr.extra_fields['finance_status'] = 'Approved'
            pr.finance_comment = comments
            if approved_amount is not None:
                pr.approved_amount = approved_amount
                pr.total_estimated_cost = approved_amount
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_APPROVE',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=new_status,
                comments=comments,
                approved_amount=pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            recipients = set()
            if pr.created_by:
                recipients.add(pr.created_by)
            for f_u in User.objects.filter(role__in=['FINANCE', 'MANAGER']):
                recipients.add(f_u)
            for u in recipients:
                try:
                    Notification.objects.create(
                        user=u,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Approved by Admin",
                        message=f"Request '{pr.title}' ({pr.request_id}) was approved by Admin {user.username}. Pay Now (Mock) is now available for Team Lead." if pr.is_software else f"Request '{pr.title}' ({pr.request_id}) was granted final approval by Admin {user.username}."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        user = request.user
        comments = request.data.get('comments', 'Rejected by Administrator.')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_REJECTED
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_REJECT',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_REJECTED,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='send-back')
    def send_back(self, request, pk=None):
        user = request.user
        comments = request.data.get('comments', 'Sent back by Administrator.')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_SENT_BACK
            pr.current_approval_level = PurchaseRequest.LEVEL_EMPLOYEE
            pr.current_stage = 0
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_RETURN',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_SENT_BACK,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-research')
    def save_research(self, request, pk=None):
        """
        ADMIN RESEARCH:
        Admin records research findings (vendor research, market pricing, available plans, specs, licensing, etc.).
        Status -> ADMIN_RESEARCH.
        """
        user = request.user
        serializer = SaveResearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.researched_by = user
            research_obj.save()

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_ADMIN_RESEARCH
            pr.current_approval_level = PurchaseRequest.LEVEL_ADMIN
            pr.current_stage = 5
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_RESEARCH',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_ADMIN_RESEARCH,
                comments=data.get('research_notes') or data.get('admin_comments') or 'Admin performed procurement research and market pricing analysis.',
                approved_amount=pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=data.get('vendor') or pr.vendor or ''
            )

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='save-cost-estimation')
    def save_cost_estimation(self, request, pk=None):
        """
        ADMIN COST ESTIMATION:
        Admin prepares the Cost Estimation Form and submits it.
        Status -> FINANCE_REPORT, immediately making the record available in Finance Portal -> Finance Report.
        """
        user = request.user
        serializer = SavePreEstimationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            research_obj, _ = ManagerResearchEstimation.objects.get_or_create(request=pr)
            for field, val in data.items():
                if hasattr(research_obj, field):
                    setattr(research_obj, field, val)
            research_obj.is_completed = True
            research_obj.save()

            final_amount = data.get('final_estimated_amount') or 0
            pr.total_estimated_cost = final_amount
            pr.approved_amount = final_amount
            pr.finance_approved_amount = final_amount
            if data.get('cost_center'):
                pr.cost_center = data['cost_center']
            if data.get('budget_code'):
                pr.budget_code = data['budget_code']
            if data.get('vendor'):
                pr.vendor = data['vendor']
                pr.preferred_vendor = data['vendor']

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_REPORT
            pr.current_approval_level = PurchaseRequest.LEVEL_ADMIN
            pr.current_stage = 7
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_COST_ESTIMATION',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_COST_ESTIMATION,
                comments=f"Admin prepared cost estimation. Final Estimated Amount: Rs.{final_amount:,.2f}",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            ApprovalHistory.objects.create(
                request=pr,
                action='FINANCE_REPORT',
                performed_by=user,
                user_role='ADMIN',
                previous_status=PurchaseRequest.STATUS_COST_ESTIMATION,
                new_status=PurchaseRequest.STATUS_FINANCE_REPORT,
                comments=data.get('admin_comments') or data.get('business_evaluation') or f"Finance Report updated with Admin research & cost estimation. Estimated: Rs.{final_amount:,.2f}.",
                approved_amount=final_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

            # Notify Finance and Team Lead
            recipients = set(User.objects.filter(role='FINANCE'))
            if pr.created_by:
                recipients.add(pr.created_by)
            for u in recipients:
                try:
                    Notification.objects.create(
                        user=u,
                        purchase_request=pr,
                        title=f"Cost Estimation & Finance Report for {pr.request_id}",
                        message=f"Admin completed cost estimation for '{pr.title}' (Rs.{final_amount:,.2f}). Available in Finance Report."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='submit-cost-estimation')
    def submit_cost_estimation(self, request, pk=None):
        return self.save_cost_estimation(request, pk=pk)


    @action(detail=True, methods=['post', 'patch'], permission_classes=[AllowAny], url_path='complete_verification')
    def complete_verification(self, request, pk=None):
        pr = self.get_object()
        user_name = request.data.get('verified_by', '') or 'Sarah Manager'
        now = timezone.now()

        for po in pr.purchase_orders.all():
            po.status = 'Delivered'
            po.save(update_fields=['status', 'updated_at'])
            for gr in po.goods_receipts.all():
                gr.status = 'Verified'
                gr.verified_by_name = user_name
                gr.verified_at = now
                gr.save(update_fields=['status', 'verified_by_name', 'verified_at', 'updated_at'])
            for inv in po.invoices.all():
                inv.status = 'Approved'
                inv.is_manager_verified = True
                inv.verified_by_name = user_name
                inv.verified_at = now
                inv.save(update_fields=['status', 'is_manager_verified', 'verified_by_name', 'verified_at', 'updated_at'])
            try:
                from apps.invoice_management.views import sync_three_way_match
                sync_three_way_match(po, request.user if getattr(request.user, 'is_authenticated', False) else None)
            except Exception:
                pass

        if pr.current_stage < 8:
            pr.current_stage = 8
        pr.save(update_fields=['current_stage', 'updated_at'])
        return Response(self.get_serializer(pr).data, status=status.HTTP_200_OK)
