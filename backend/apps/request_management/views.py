from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import PurchaseRequest, ApprovalStep, RejectionReason
from .serializers import (
    PurchaseRequestSerializer, ApprovalStepSerializer,
    RejectionReasonSerializer, ApproveRejectActionSerializer
)
from apps.notification_management.models import Notification


class RejectionReasonViewSet(viewsets.ModelViewSet):
    queryset = RejectionReason.objects.filter(is_active=True)
    serializer_class = RejectionReasonSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['reason_type']


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    permission_classes = []
    filterset_fields = ['status', 'priority', 'department', 'current_stage']
    search_fields = ['request_id', 'title', 'category', 'description']

    def get_queryset(self):
        user = self.request.user
        queryset = PurchaseRequest.objects.select_related(
            'created_by',
            'department'
        ).prefetch_related(
            'approval_steps'
        ).all().order_by('-created_at')

        if not user or user.is_anonymous:
            return queryset

        if getattr(user, 'role', None) == 'TEAM_LEAD':
            return queryset
        elif getattr(user, 'role', None) == 'MANAGER':
            return queryset
        elif getattr(user, 'role', None) in ['FINANCE', 'ADMIN']:
            return queryset
        elif getattr(user, 'role', None) == 'VENDOR':
            return queryset.filter(current_stage__gte=4)
        return queryset

    def get_object(self):
        from django.db import models
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
            from rest_framework.exceptions import NotFound
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

        dept_val = data.get('department')
        if dept_val:
            from apps.users.models import Department
            if isinstance(dept_val, str) and not dept_val.isdigit():
                dept_obj = Department.objects.filter(name__icontains=dept_val).first() or Department.objects.first()
                if dept_obj:
                    data['department'] = dept_obj.id
            elif isinstance(dept_val, int) or (isinstance(dept_val, str) and dept_val.isdigit()):
                data['department'] = int(dept_val)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user if (self.request.user and self.request.user.is_authenticated) else None
        if not user or user.is_anonymous:
            from apps.users.models import User
            user = User.objects.filter(role='TEAM_LEAD').first() or User.objects.first()

        dept = serializer.validated_data.pop('department', None)
        if not dept:
            if hasattr(user, 'department') and user.department:
                dept = user.department
            else:
                from apps.users.models import Department
                dept = Department.objects.first()

        serializer.save(
            created_by=user,
            department=dept,
            current_stage=1,
            status='Pending'
        )

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

        if amount is not None and amount > 0:
            pr.total_estimated_cost = amount

        reason_obj = None
        if reason_id:
            try:
                reason_obj = RejectionReason.objects.get(id=reason_id)
            except RejectionReason.DoesNotExist:
                return Response({'reason_id': 'Invalid reason ID'}, status=status.HTTP_400_BAD_REQUEST)

        # Record step
        actor = request.user if (request.user and request.user.is_authenticated) else pr.created_by
        role = getattr(actor, 'role', 'MANAGER')
        step = ApprovalStep.objects.create(
            request=pr,
            actor=actor,
            role=role,
            decision=act,
            reason=reason_obj,
            notes=notes
        )

        # Update request state
        if act == 'APPROVE':
            pr.status = 'In Procurement'
            
            if pr.flow_type == 'B':
                # Flow B: Funds released directly to Team Lead (Stages 0-6)
                if pr.current_stage <= 2:
                    pr.current_stage = 4 # Skip Admin approval if Manager/Finance approves directly
                else:
                    pr.current_stage = min(pr.current_stage + 1, 6)
                    
                if pr.current_stage >= 6:
                    pr.status = 'Completed'
            else:
                # Flow A: Full vendor procurement cycle (Stages 0-9)
                if pr.current_stage <= 2:
                    pr.current_stage = 4
                elif pr.current_stage == 3:
                    pr.current_stage = 5
                else:
                    pr.current_stage = min(pr.current_stage + 1, 9)

                if pr.current_stage >= 9:
                    pr.status = 'Completed'

        elif act == 'REJECT':
            pr.status = 'Rejected'

        elif act == 'RETURN':
            pr.status = 'Returned'
            pr.current_stage = 0 # Returned to Team Lead

        elif act == 'RECOMMEND':
            pr.status = 'Recommended'
            if pr.current_stage == 1:
                pr.current_stage = 2 # Escalate to Finance
            elif pr.current_stage == 2:
                pr.current_stage = 3 # Escalate to Admin

        pr.save()

        # Dynamic Notification: notify creator + all previous actors
        recipients = set()
        if pr.created_by:
            recipients.add(pr.created_by)
        for step_item in ApprovalStep.objects.filter(request=pr).select_related('actor'):
            if step_item.actor:
                recipients.add(step_item.actor)

        if act == 'RECOMMEND':
            from apps.users.models import User
            if pr.current_stage == 2:
                finance_users = User.objects.filter(role='FINANCE')
                for f_u in finance_users:
                    recipients.add(f_u)
            elif pr.current_stage == 3:
                admin_users = User.objects.filter(role='ADMIN')
                for a_u in admin_users:
                    recipients.add(a_u)

        username_display = getattr(request.user, 'username', 'Manager') if request.user else 'Manager'
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

        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def resubmit(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'Returned':
            return Response({'error': 'Only returned requests can be resubmitted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        pr.status = 'Pending'
        pr.current_stage = 1
        pr.save()

        # Notify Manager
        Notification.objects.create(
            user=pr.created_by,
            purchase_request=pr,
            title=f"Request {pr.request_id} Resubmitted",
            message=f"Request {pr.request_id} has been resubmitted by Team Lead {request.user.username}."
        )

        return Response(PurchaseRequestSerializer(pr).data)
