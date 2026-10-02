from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import PurchaseRequest, ApprovalStep, RejectionReason
from .serializers import (
    PurchaseRequestSerializer, ApprovalStepSerializer,
    RejectionReasonSerializer, ApproveRejectActionSerializer
)
from apps.notification_management.models import Notification


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


class PurchaseRequestViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseRequestSerializer
    permission_classes = []
    filterset_fields = ['status', 'priority', 'department', 'current_stage']
    search_fields = ['request_id', 'title', 'category', 'description']
    ordering_fields = ['created_at', 'total_estimated_cost', 'priority', 'status', 'id', 'updated_at']
    ordering = ['-created_at']

    def get_queryset(self):
        user = self.request.user
        from django.db.models import Prefetch
        from apps.procurement.models import PurchaseOrder
        queryset = PurchaseRequest.objects.select_related(
            'created_by',
            'created_by__department',
            'department'
        ).prefetch_related(
            Prefetch(
                'approval_steps',
                queryset=ApprovalStep.objects.select_related('actor', 'actor__department', 'reason')
            ),
            Prefetch(
                'purchase_orders',
                queryset=PurchaseOrder.objects.select_related('vendor').prefetch_related('goods_receipts', 'invoices')
            ),
            'rfqs'
        ).all().order_by('-created_at')

        if not user or user.is_anonymous:
            return queryset

        if getattr(user, 'role', None) == 'TEAM_LEAD':
            return queryset.filter(created_by=user).order_by('-created_at')
        elif getattr(user, 'role', None) == 'MANAGER':
            return queryset.order_by('-created_at')
        elif getattr(user, 'role', None) == 'ADMIN':
            return queryset.order_by('-created_at')
        elif getattr(user, 'role', None) == 'FINANCE' or self.request.query_params.get('for_finance') == 'true' or self.request.query_params.get('role') == 'FINANCE':
            from django.db.models import Q
            return queryset.filter(
                Q(status='Recommended') |
                Q(status__icontains='FINANCE') |
                Q(approval_steps__decision='RECOMMEND') |
                Q(approval_steps__role='FINANCE') |
                Q(created_by__role='FINANCE') |
                Q(created_by=user) |
                Q(current_stage__gte=2)
            ).distinct().order_by('-created_at')
        elif getattr(user, 'role', None) == 'VENDOR':
            queryset = queryset.filter(current_stage__gte=4).order_by('-created_at')

        # Filter by workflow type if requested
        query_params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))
        wf_param = query_params.get('workflow_type') or query_params.get('workflowType')
        is_hw = query_params.get('is_hardware') or query_params.get('isHardware')
        is_sw = query_params.get('is_software') or query_params.get('isSoftware')

        from django.db.models import Q
        software_q = (
            Q(category__icontains='Software') |
            Q(category__icontains='SaaS') |
            Q(category__icontains='Cloud') |
            Q(category__icontains='License') |
            Q(category__icontains='Subscription') |
            Q(category__icontains='Digital') |
            Q(category__icontains='Cybersecurity') |
            Q(category__icontains='IT Services') |
            Q(category__icontains='Training') |
            Q(title__icontains='Software') |
            Q(title__icontains='License') |
            Q(title__icontains='Subscription') |
            Q(title__icontains='Cloud') |
            Q(title__icontains='AWS') |
            Q(title__icontains='SaaS') |
            Q(title__icontains='Antigravity') |
            Q(title__icontains='Microsoft 365')
        )

        if wf_param:
            if str(wf_param).upper() == 'HARDWARE':
                queryset = queryset.exclude(software_q)
            elif str(wf_param).upper() == 'SOFTWARE':
                queryset = queryset.filter(software_q)
        elif is_hw is not None and str(is_hw).lower() in ('true', '1', 'yes'):
            queryset = queryset.exclude(software_q)
        elif is_sw is not None and str(is_sw).lower() in ('true', '1', 'yes'):
            queryset = queryset.filter(software_q)

        return queryset.order_by('-created_at')

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

        pr = serializer.save(
            created_by=user,
            department=dept,
            current_stage=1,
            status='Pending',
            renewal_sequence=0,
            request_operation='CREATE'
        )

        if not pr.extra_fields or not isinstance(pr.extra_fields, dict):
            pr.extra_fields = {}
        pr.extra_fields['original_requested_amount'] = float(pr.total_estimated_cost or 0.0)
        pr.save(update_fields=['extra_fields'])

        from apps.notification_management.services import notify_stage_event
        notify_stage_event('REQUEST_CREATED', purchase_request=pr, actor=user)

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
        amt_val = serializer.validated_data.get('amount') or serializer.validated_data.get('total_estimated_cost') or serializer.validated_data.get('estimated_cost')
        if amt_val is not None:
            amt_val = float(amt_val)

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
                    {'detail': f"Manager approval limit is ₹50,000. For amounts exceeding ₹50,000 ({amt_val}), please recommend to Finance."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if amt_val is not None and amt_val > 100000 and (role == 'FINANCE' or pr.current_stage == 2 or (role and 'FINANCE' in str(role).upper())):
                return Response(
                    {'detail': f"Finance approval limit is ₹1,00,000. Approved amount (₹{amt_val:,.2f}) cannot exceed ₹1,00,000. For amounts exceeding ₹1,00,000, please recommend to Admin."},
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
                # Flow B: Software / Digital Workflow (Stages 0-5)
                if pr.current_stage <= 3:
                    pr.current_stage = 4 # Verification and Order Complete
                else:
                    pr.current_stage = min(pr.current_stage + 1, 5)
                    
                if pr.current_stage >= 5:
                    pr.status = 'Completed'
            else:
                # Flow A: Full vendor procurement cycle (Stages 0-9)
                if pr.current_stage <= 3:
                    pr.current_stage = 4 # RFQ Sent
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

        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def resubmit(self, request, pk=None):
        pr = self.get_object()
        if pr.status != 'Returned':
            return Response({'error': 'Only returned requests can be resubmitted.'}, status=status.HTTP_400_BAD_REQUEST)
        
        pr.status = 'Pending'
        pr.current_stage = 1
        pr.save()

        from apps.notification_management.services import notify_stage_event
        notify_stage_event('REQUEST_CREATED', purchase_request=pr, actor=request.user)

        return Response(PurchaseRequestSerializer(pr).data)

    @action(detail=True, methods=['post', 'patch'], permission_classes=[AllowAny], url_path='complete_verification')
    def complete_verification(self, request, pk=None):
        pr = self.get_object()
        user_name = request.data.get('verified_by', '') or 'Sarah Manager'
        from django.utils import timezone
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
