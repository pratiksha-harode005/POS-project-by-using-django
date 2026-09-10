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
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'priority', 'department', 'current_stage']
    search_fields = ['request_id', 'title', 'category', 'description']

    def get_queryset(self):
        user = self.request.user
        queryset = PurchaseRequest.objects.all().order_by('-created_at')

        if user.role == 'TEAM_LEAD':
            return queryset.filter(created_by=user)
        elif user.role == 'MANAGER':
            # Manager sees requests in their department or where they took action
            return queryset.filter(department=user.department) if user.department else queryset
        elif user.role in ['FINANCE', 'ADMIN']:
            return queryset
        elif user.role == 'VENDOR':
            # Vendors see requests at RFQ stage or beyond
            return queryset.filter(current_stage__gte=4)
        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user, current_stage=1, status='Pending')

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def process_approval(self, request, pk=None):
        pr = self.get_object()
        serializer = ApproveRejectActionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        act = serializer.validated_data['action']
        reason_id = serializer.validated_data.get('reason_id')
        notes = serializer.validated_data.get('notes', '')

        reason_obj = None
        if reason_id:
            try:
                reason_obj = RejectionReason.objects.get(id=reason_id)
            except RejectionReason.DoesNotExist:
                return Response({'reason_id': 'Invalid reason ID'}, status=status.HTTP_400_BAD_REQUEST)

        # Record step
        step = ApprovalStep.objects.create(
            request=pr,
            actor=request.user,
            role=request.user.role,
            decision=act,
            reason=reason_obj,
            notes=notes
        )

        # Update request state
        if act == 'APPROVE':
            if pr.current_stage == 1: # Manager approval
                pr.current_stage = 2
            elif pr.current_stage == 2: # Finance approval
                pr.current_stage = 3
            elif pr.current_stage == 3: # Admin approval -> moves to RFQ
                pr.current_stage = 4
                pr.status = 'In Procurement'
            else:
                pr.current_stage = min(pr.current_stage + 1, 9)
            
            if pr.current_stage == 9:
                pr.status = 'Completed'

        elif act == 'REJECT':
            pr.status = 'Rejected'

        elif act == 'RETURN':
            pr.status = 'Returned'
            pr.current_stage = 0 # Returned to Team Lead

        elif act == 'RECOMMEND':
            # Escalated
            if pr.current_stage == 1:
                pr.current_stage = 2 # Escalate to Finance
            elif pr.current_stage == 2:
                pr.current_stage = 3 # Escalate to Admin

        pr.save()

        # Dynamic Notification: notify creator + all previous actors
        recipients = set([pr.created_by])
        previous_actors = ApprovalStep.objects.filter(request=pr).values_list('actor', flat=True)
        for actor_id in previous_actors:
            recipients.add(actor_id)

        msg = f"Request {pr.request_id} ({pr.title}) updated to '{pr.status}' by {request.user.username} ({act})"
        if reason_obj:
            msg += f" - Reason: {reason_obj.text}"

        for r_user_id in recipients:
            Notification.objects.create(
                user_id=r_user_id,
                purchase_request=pr,
                title=f"Request {pr.request_id} Update",
                message=msg
            )

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
