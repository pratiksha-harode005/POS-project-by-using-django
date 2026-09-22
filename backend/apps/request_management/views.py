from django.db import transaction, models
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound

from .models import PurchaseRequest, ApprovalStep, ApprovalHistory, RejectionReason
from .serializers import (
    PurchaseRequestSerializer, CreatePurchaseRequestSerializer,
    ApprovalStepSerializer, ApprovalHistorySerializer, RejectionReasonSerializer,
    TeamLeadActionSerializer, TeamLeadRejectOrSendBackSerializer,
    ManagerApproveSerializer, ManagerRejectSerializer, ManagerRecommendSerializer,
    ResubmitRequestSerializer, ApproveRejectActionSerializer
)
from apps.core.permissions import (
    IsTeamLeadRole, IsManagerRole, IsFinanceRole, IsAdminRole, IsEmployeeRole
)
from apps.notification_management.models import Notification
from apps.users.models import User, Department


class RejectionReasonViewSet(viewsets.ModelViewSet):
    queryset = RejectionReason.objects.filter(is_active=True)
    serializer_class = RejectionReasonSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['reason_type']


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

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    def get_serializer_class(self):
        if self.action == 'create':
            return CreatePurchaseRequestSerializer
        return PurchaseRequestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = PurchaseRequest.objects.select_related(
            'created_by__department',
            'department',
            'assigned_team_lead__department',
            'assigned_manager__department'
        ).prefetch_related(
            'approval_steps__actor__department',
            'approval_steps__reason',
            'approval_history__performed_by__department'
        ).all().order_by('-created_at')

        if not user or user.is_anonymous:
            return queryset

        role = getattr(user, 'role', None)
        if role == 'EMPLOYEE':
            return queryset.filter(created_by=user)
        elif role == 'TEAM_LEAD':
            return queryset
        elif role == 'MANAGER':
            return queryset
        elif role in ['FINANCE', 'ADMIN']:
            return queryset
        elif role == 'VENDOR':
            return queryset.filter(models.Q(current_stage__gte=4) | models.Q(status__in=['In Procurement', 'Completed', 'MANAGER_APPROVED']))
        return queryset

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

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user or user.is_anonymous:
            user = User.objects.filter(role='TEAM_LEAD').first() or User.objects.first()

        dept = serializer.validated_data.get('department')
        if not dept:
            if hasattr(user, 'department') and user.department:
                dept = user.department
            else:
                dept = Department.objects.first()

        is_employee = bool(user and getattr(user, 'role', '') == 'EMPLOYEE')
        initial_status = PurchaseRequest.STATUS_TEAM_LEAD_REVIEW if is_employee else PurchaseRequest.STATUS_MANAGER_REVIEW
        initial_level = PurchaseRequest.LEVEL_TEAM_LEAD if is_employee else PurchaseRequest.LEVEL_MANAGER
        initial_stage = 1

        with transaction.atomic():
            req = serializer.save(
                created_by=user,
                department=dept,
                status=initial_status,
                current_approval_level=initial_level,
                current_stage=initial_stage
            )
            comments = 'Procurement request created and submitted for Team Lead review.' if is_employee else 'Procurement request created by Team Lead and submitted for Manager review.'
            ApprovalHistory.objects.create(
                request=req,
                action='CREATE',
                performed_by=user,
                user_role=getattr(user, 'role', 'TEAM_LEAD') if user else 'TEAM_LEAD',
                previous_status='DRAFT',
                new_status=initial_status,
                comments=comments,
                approved_amount=req.requested_amount,
                cost_center=getattr(req, 'cost_center', ''),
                budget_available=getattr(req, 'budget_available', True),
                vendor=getattr(req, 'vendor', '')
            )

    @action(detail=True, methods=['post'], permission_classes=[])
    def resubmit(self, request, pk=None):
        """
        Employee or Team Lead modifies and resubmits a SENT_BACK request:
        SENT_BACK -> MANAGER_REVIEW (or TEAM_LEAD_REVIEW for employee)
        """
        user = request.user
        serializer = ResubmitRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            pr = self.get_object()
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user and user.is_authenticated and user.role != 'ADMIN' and pr.created_by and pr.created_by != user:
                raise PermissionDenied("Only the original requester or an Administrator can resubmit this request.")

            if pr.status not in [PurchaseRequest.STATUS_SENT_BACK, PurchaseRequest.STATUS_RETURNED]:
                return Response(
                    {'error': f"Only requests in 'SENT_BACK' status can be resubmitted. Current status is '{pr.status}'."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            data = serializer.validated_data
            if 'title' in data:
                pr.title = data['title']
            if 'description' in data:
                pr.description = data['description']
            if 'quantity' in data:
                pr.quantity = data['quantity']
            if 'requested_amount' in data:
                pr.requested_amount = data['requested_amount']
                pr.total_estimated_cost = data['requested_amount']
            if 'delivery_location' in data:
                pr.delivery_location = data['delivery_location']
            if 'justification' in data:
                pr.justification = data['justification']

            is_employee = bool(pr.created_by and getattr(pr.created_by, 'role', '') == 'EMPLOYEE')
            new_status = PurchaseRequest.STATUS_TEAM_LEAD_REVIEW if is_employee else PurchaseRequest.STATUS_MANAGER_REVIEW
            new_level = PurchaseRequest.LEVEL_TEAM_LEAD if is_employee else PurchaseRequest.LEVEL_MANAGER

            pr.status = new_status
            pr.current_approval_level = new_level
            pr.current_stage = 1
            pr.save()

            actor = user if (user and user.is_authenticated) else pr.created_by
            comments = data.get('comments') or ('Request revised and resubmitted for Team Lead review.' if is_employee else 'Request revised and resubmitted for Manager review.')
            ApprovalHistory.objects.create(
                request=pr,
                action='RESUBMIT',
                performed_by=actor,
                user_role=getattr(actor, 'role', 'TEAM_LEAD') if actor else 'TEAM_LEAD',
                previous_status=prev_status,
                new_status=new_status,
                comments=comments,
                approved_amount=pr.requested_amount,
                cost_center=getattr(pr, 'cost_center', ''),
                budget_available=getattr(pr, 'budget_available', True),
                vendor=getattr(pr, 'vendor', '')
            )

            if pr.created_by:
                try:
                    Notification.objects.create(
                        user=pr.created_by,
                        purchase_request=pr,
                        title=f"Request {pr.request_id} Resubmitted",
                        message=f"Request {pr.request_id} has been resubmitted and is now pending Team Lead review."
                    )
                except Exception:
                    pass

        return Response(PurchaseRequestSerializer(pr).data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], permission_classes=[])
    def process_approval(self, request, pk=None):
        pr = self.get_object()
        serializer = ApproveRejectActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        act = serializer.validated_data['action']
        reason_id = serializer.validated_data.get('reason_id')
        notes = serializer.validated_data.get('notes', '')
        amount = serializer.validated_data.get('amount')
        approved_amount = serializer.validated_data.get('approved_amount')
        cost_center = serializer.validated_data.get('cost_center', '')
        vendor = serializer.validated_data.get('vendor', '')
        budget_available = serializer.validated_data.get('budget_available', True)

        if approved_amount is not None and approved_amount > 0:
            pr.approved_amount = approved_amount
            pr.total_estimated_cost = approved_amount
        elif amount is not None and amount > 0:
            pr.total_estimated_cost = amount

        if cost_center:
            pr.cost_center = cost_center
        if vendor:
            pr.vendor = vendor
        pr.budget_available = budget_available

        reason_obj = None
        if reason_id:
            try:
                reason_obj = RejectionReason.objects.get(id=reason_id)
            except RejectionReason.DoesNotExist:
                return Response({'reason_id': 'Invalid reason ID'}, status=status.HTTP_400_BAD_REQUEST)

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
            pr.status = 'In Procurement'
            if getattr(pr, 'flow_type', 'A') == 'B':
                if pr.current_stage <= 2:
                    pr.current_stage = 4
                else:
                    pr.current_stage = min(pr.current_stage + 1, 6)
                if pr.current_stage >= 6:
                    pr.status = 'Completed'
            else:
                if pr.current_stage <= 2:
                    pr.current_stage = 4
                elif pr.current_stage == 3:
                    pr.current_stage = 5
                else:
                    pr.current_stage = min(pr.current_stage + 1, 9)
                if pr.current_stage >= 9:
                    pr.status = 'Completed'

            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED

        elif act == 'REJECT':
            pr.status = 'Rejected'
            pr.current_approval_level = PurchaseRequest.LEVEL_NONE
        elif act == 'RETURN':
            pr.status = 'Pending'
            pr.current_stage = 0
            pr.current_approval_level = PurchaseRequest.LEVEL_EMPLOYEE
        elif act == 'RECOMMEND':
            pr.status = PurchaseRequest.STATUS_FINANCE_REVIEW
            pr.current_stage = 3
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['recommendation_reason'] = notes
            user_fullname = f"{actor.first_name} {actor.last_name}".strip() if actor else 'Manager'
            pr.extra_fields['recommended_by'] = user_fullname or 'Manager'
            pr.extra_fields['recommended_date'] = timezone.now().isoformat()

        pr.save()

        history_action = {
            'APPROVE': 'APPROVE',
            'REJECT': 'REJECT',
            'RETURN': 'SEND_BACK',
            'RECOMMEND': 'RECOMMEND_FINANCE',
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

        recipients = set()
        if pr.created_by:
            recipients.add(pr.created_by)
        for step_item in ApprovalStep.objects.filter(request=pr).select_related('actor'):
            if step_item.actor:
                recipients.add(step_item.actor)

        if act == 'RECOMMEND':
            if pr.current_stage == 2:
                for f_u in User.objects.filter(role='FINANCE'):
                    recipients.add(f_u)
            elif pr.current_stage == 3:
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


class TeamLeadRequestViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Dedicated REST endpoints for Team Lead Portal:
    - GET /api/team-lead/requests/: List requests for Team Lead review
    - GET /api/team-lead/requests/{id}/: Single request details with history
    - POST /api/team-lead/requests/{id}/approve/: Approve -> MANAGER_REVIEW
    - POST /api/team-lead/requests/{id}/reject/: Reject -> REJECTED
    - POST /api/team-lead/requests/{id}/send-back/: Send Back -> SENT_BACK
    """
    serializer_class = PurchaseRequestSerializer
    permission_classes = [permissions.IsAuthenticated, IsTeamLeadRole]
    filterset_fields = ['status', 'priority']
    search_fields = ['request_id', 'title', 'category', 'description']

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseRequest.objects.all().select_related(
            'created_by__department', 'department', 'assigned_team_lead__department', 'assigned_manager__department'
        ).prefetch_related(
            'approval_steps__actor__department',
            'approval_steps__reason',
            'approval_history__performed_by__department'
        ).order_by('-created_at')

        # Department / assignment scoping
        if user.role != 'ADMIN':
            if user.department:
                qs = qs.filter(models.Q(department=user.department) | models.Q(created_by=user) | models.Q(assigned_team_lead=user))
            else:
                qs = qs.filter(models.Q(created_by=user) | models.Q(assigned_team_lead=user))
        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

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
            if user.role != 'ADMIN' and user.department and pr.department != user.department:
                raise PermissionDenied("You can only approve requests within your department.")

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

            if user.role != 'ADMIN' and user.department and pr.department != user.department:
                raise PermissionDenied("You can only reject requests within your department.")

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

            if user.role != 'ADMIN' and user.department and pr.department != user.department:
                raise PermissionDenied("You can only send back requests within your department.")

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
        qs = PurchaseRequest.objects.all().select_related(
            'created_by__department', 'department', 'assigned_team_lead__department', 'assigned_manager__department'
        ).prefetch_related(
            'approval_steps__actor__department',
            'approval_steps__reason',
            'approval_history__performed_by__department'
        ).order_by('-created_at')

        if not user or not user.is_authenticated:
            return qs

        if user.role != 'ADMIN':
            if user.department:
                qs = qs.filter(models.Q(department=user.department) | models.Q(assigned_manager=user) | models.Q(department__isnull=True))
        return qs

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsManagerRole])
    def approve(self, request, pk=None):
        """
        MANAGER APPROVAL:
        MANAGER_REVIEW -> MANAGER_APPROVED
        Must not be able to bypass Team Lead approval.
        """
        user = request.user
        serializer = ManagerApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        approved_amount = data.get('approved_amount')
        cost_center = data.get('cost_center', '')
        budget_available = data.get('budget_available', True)
        vendor = data.get('vendor', '')
        comments = data.get('comments', '')

        with transaction.atomic():
            pr = get_purchase_request_by_pk_or_request_id(pk, for_update=True)
            if not pr:
                return Response({'error': 'Request not found.'}, status=status.HTTP_404_NOT_FOUND)

            if user.role != 'ADMIN' and user.department and pr.department != user.department:
                raise PermissionDenied("You can only approve requests within your department.")

            # Strict Guard: Manager cannot bypass Team Lead approval
            if pr.status in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, PurchaseRequest.STATUS_CREATED] and user.role != 'ADMIN':
                return Response(
                    {'error': "Manager cannot bypass Team Lead approval. The request must first be reviewed and approved by the Team Lead."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Valid pre-condition status
            if pr.status not in [PurchaseRequest.STATUS_MANAGER_REVIEW, 'Pending', 'SUBMITTED']:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in 'MANAGER_REVIEW' to be approved by Manager."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_REVIEW
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            pr.current_stage = 3

            # Update commercial fields & amounts
            pr.approved_amount = approved_amount if approved_amount is not None else (pr.requested_amount or pr.total_estimated_cost or 0)
            pr.total_estimated_cost = pr.approved_amount
            if cost_center:
                pr.cost_center = cost_center
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
                new_status=PurchaseRequest.STATUS_FINANCE_REVIEW,
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
                        message=f"Request '{pr.title}' has been approved by Manager {user.username} for ₹{pr.approved_amount:,.2f}."
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

            if user.role != 'ADMIN' and user.department and pr.department != user.department:
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

            if user.role != 'ADMIN' and user.department and pr.department != user.department:
                raise PermissionDenied("You can only send back requests within your department.")

            if pr.status not in [PurchaseRequest.STATUS_MANAGER_REVIEW, 'Pending', 'SUBMITTED']:
                return Response(
                    {'error': f"Invalid status transition. Request is currently in '{pr.status}', but must be in 'MANAGER_REVIEW' to be sent back by Manager."},
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
            if pr.status in [PurchaseRequest.STATUS_TEAM_LEAD_REVIEW, PurchaseRequest.STATUS_CREATED] and user.role != 'ADMIN':
                return Response(
                    {'error': "Manager cannot recommend unapproved request to Finance. The request must first clear Team Lead review."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            valid_recommend_statuses = [
                PurchaseRequest.STATUS_MANAGER_REVIEW,
                PurchaseRequest.STATUS_MANAGER_APPROVED,
                'Pending', 'Approved', 'SUBMITTED', 'Created',
                'rfq_sent', 'QUOTES_RECEIVED', 'under_review', 'pending_approval', 'PENDING'
            ]
            if pr.status not in valid_recommend_statuses:
                return Response(
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in an approvable status to be recommended to Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            # Moves to FINANCE_REVIEW, visible to Finance portal
            pr.status = PurchaseRequest.STATUS_FINANCE_REVIEW
            pr.current_approval_level = PurchaseRequest.LEVEL_FINANCE
            pr.current_stage = 3

            # Store recommendation metadata in extra_fields
            if not isinstance(pr.extra_fields, dict):
                pr.extra_fields = {}
            pr.extra_fields['recommendation_reason'] = comments
            user_fullname = f"{user.first_name} {user.last_name}".strip() or user.username
            pr.extra_fields['recommended_by'] = user_fullname
            pr.extra_fields['recommended_date'] = timezone.now().isoformat()
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='RECOMMEND_FINANCE',
                performed_by=user,
                user_role=user.role,
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_FINANCE_REVIEW,
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
    filterset_fields = ['status', 'priority', 'department']
    search_fields = ['request_id', 'title', 'category', 'description', 'vendor']

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseRequest.objects.all().select_related(
            'created_by__department', 'department', 'assigned_team_lead__department', 'assigned_manager__department'
        ).prefetch_related(
            'approval_steps__actor__department',
            'approval_steps__reason',
            'approval_history__performed_by__department'
        ).order_by('-created_at')

        status_param = self.request.query_params.get('status')
        if status_param:
            status_param_upper = status_param.upper()
            if status_param_upper in ['PENDING', 'FINANCE_REVIEW', 'RECOMMENDED_TO_FINANCE']:
                return qs.filter(
                    models.Q(status__in=[
                        PurchaseRequest.STATUS_FINANCE_REVIEW,
                        PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                        'Recommended',
                        'SENT_TO_FINANCE',
                    ]) |
                    models.Q(current_approval_level=PurchaseRequest.LEVEL_FINANCE)
                )
            elif status_param_upper in ['APPROVED', 'FINANCE_APPROVED']:
                return qs.filter(status=PurchaseRequest.STATUS_FINANCE_APPROVED)
            elif status_param_upper in ['REJECTED', 'FINANCE_REJECTED']:
                return qs.filter(status=PurchaseRequest.STATUS_FINANCE_REJECTED)
            elif status_param_upper in ['SENT_BACK', 'RETURNED']:
                return qs.filter(status__in=[PurchaseRequest.STATUS_SENT_BACK, PurchaseRequest.STATUS_RETURNED])
            elif status_param_upper != 'ALL':
                return qs.filter(status__iexact=status_param)

        # Non-admin Finance users only see requests in the Finance lifecycle (pending review, approved, rejected, sent back)
        if user and getattr(user, 'role', None) == 'ADMIN' and self.request.query_params.get('all') == 'true':
            return qs

        finance_lifecycle_statuses = [
            PurchaseRequest.STATUS_FINANCE_REVIEW,
            PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
            PurchaseRequest.STATUS_FINANCE_APPROVED,
            PurchaseRequest.STATUS_FINANCE_REJECTED,
            PurchaseRequest.STATUS_SENT_BACK,
            'Recommended',
            'SENT_TO_FINANCE',
        ]
        return qs.filter(
            models.Q(status__in=finance_lifecycle_statuses) |
            models.Q(current_approval_level=PurchaseRequest.LEVEL_FINANCE)
        )

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        pk = self.kwargs.get(lookup_url_kwarg)
        pr = get_purchase_request_by_pk_or_request_id(pk)
        if pr:
            self.check_object_permissions(self.request, pr)
            return pr
        return super().get_object()

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsFinanceRole])
    def approve(self, request, pk=None):
        """
        FINANCE APPROVAL:
        FINANCE_REVIEW -> FINANCE_APPROVED
        """
        user = request.user
        serializer = ManagerApproveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        approved_amount = data.get('approved_amount')
        cost_center = data.get('cost_center', '')
        budget_available = data.get('budget_available', True)
        vendor = data.get('vendor', '')
        comments = data.get('comments', '')

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
                    {'error': f"Invalid status transition. Request is in '{pr.status}', but must be in 'FINANCE_REVIEW' to be approved by Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            prev_status = pr.status
            pr.status = PurchaseRequest.STATUS_FINANCE_APPROVED
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.current_stage = 4

            if approved_amount is not None:
                pr.approved_amount = approved_amount
            elif not pr.approved_amount:
                pr.approved_amount = pr.requested_amount

            if cost_center:
                pr.cost_center = cost_center
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
                new_status=PurchaseRequest.STATUS_FINANCE_APPROVED,
                comments=comments or 'Approved by Finance department.',
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
                        title=f"Request {pr.request_id} Approved by Finance",
                        message=f"Request '{pr.title}' has been approved by Finance ({user.username})."
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
    filterset_fields = ['status', 'priority', 'department', 'current_stage']
    search_fields = ['request_id', 'title', 'category', 'description', 'vendor', 'cost_center']

    def get_queryset(self):
        return PurchaseRequest.objects.all().select_related(
            'created_by__department', 'department', 'assigned_team_lead__department', 'assigned_manager__department'
        ).prefetch_related(
            'approval_steps__actor__department',
            'approval_steps__reason',
            'approval_history__performed_by__department'
        ).order_by('-created_at')

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
            pr.status = PurchaseRequest.STATUS_APPROVED
            pr.current_approval_level = PurchaseRequest.LEVEL_COMPLETED
            pr.current_stage = 4
            if approved_amount is not None:
                pr.approved_amount = approved_amount
            pr.save()

            ApprovalHistory.objects.create(
                request=pr,
                action='ADMIN_APPROVE',
                performed_by=user,
                user_role='ADMIN',
                previous_status=prev_status,
                new_status=PurchaseRequest.STATUS_APPROVED,
                comments=comments,
                approved_amount=pr.approved_amount or pr.requested_amount,
                cost_center=pr.cost_center or '',
                budget_available=bool(pr.budget_available if pr.budget_available is not None else True),
                vendor=pr.vendor or ''
            )

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
