from rest_framework import serializers
from .models import PurchaseRequest, ApprovalStep, ApprovalHistory, RejectionReason
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


class PurchaseRequestSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    assigned_team_lead_detail = UserSerializer(source='assigned_team_lead', read_only=True)
    assigned_manager_detail = UserSerializer(source='assigned_manager', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    approval_history = ApprovalHistorySerializer(many=True, read_only=True)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    recommendation_reason = serializers.SerializerMethodField()
    recommended_by = serializers.SerializerMethodField()
    recommended_date = serializers.SerializerMethodField()
    finance_status = serializers.SerializerMethodField()
    finance_approved_by = serializers.SerializerMethodField()
    finance_comment = serializers.SerializerMethodField()

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

    def get_recommendation_reason(self, obj):
        if obj.extra_fields and isinstance(obj.extra_fields, dict) and obj.extra_fields.get('recommendation_reason'):
            return obj.extra_fields.get('recommendation_reason')
        histories = obj.approval_history.all()
        h = next((x for x in histories if x.action == 'RECOMMEND_FINANCE'), None)
        if h and h.comments:
            return h.comments
        steps = obj.approval_steps.all()
        step = next((x for x in steps if x.decision == 'RECOMMEND'), None)
        if step:
            return step.notes or (step.reason.text if getattr(step, 'reason', None) else '')
        return ''

    def get_recommended_by(self, obj):
        if obj.extra_fields and isinstance(obj.extra_fields, dict) and obj.extra_fields.get('recommended_by'):
            return obj.extra_fields.get('recommended_by')
        histories = obj.approval_history.all()
        h = next((x for x in histories if x.action == 'RECOMMEND_FINANCE'), None)
        if h and h.performed_by:
            name = f"{h.performed_by.first_name} {h.performed_by.last_name}".strip()
            return name or h.performed_by.username
        steps = obj.approval_steps.all()
        step = next((x for x in steps if x.decision == 'RECOMMEND'), None)
        if step and step.actor:
            name = f"{step.actor.first_name} {step.actor.last_name}".strip()
            return name or step.actor.username
        return ''

    def get_recommended_date(self, obj):
        if obj.extra_fields and isinstance(obj.extra_fields, dict) and obj.extra_fields.get('recommended_date'):
            return obj.extra_fields.get('recommended_date')
        histories = obj.approval_history.all()
        h = next((x for x in histories if x.action == 'RECOMMEND_FINANCE'), None)
        if h and h.created_at:
            return h.created_at.isoformat()
        steps = obj.approval_steps.all()
        step = next((x for x in steps if x.decision == 'RECOMMEND'), None)
        if step and step.created_at:
            return step.created_at.isoformat()
        return None

    def get_finance_status(self, obj):
        st = (obj.status or '').upper()
        if st in ['FINANCE_APPROVED', 'APPROVED']:
            return 'Approved'
        if st in ['FINANCE_REJECTED', 'REJECTED']:
            return 'Rejected'
        if st in ['FINANCE_REVIEW', 'FINANCE_RECOMMENDED', 'RECOMMENDED', 'SENT_TO_FINANCE']:
            return 'Awaiting Finance Action'
        if st in ['SENT_BACK', 'RETURNED']:
            return 'Sent Back'
        return None

    def get_finance_approved_by(self, obj):
        histories = obj.approval_history.all()
        h = next((x for x in histories if x.action == 'FINANCE_APPROVE'), None)
        if h and h.performed_by:
            name = f"{h.performed_by.first_name} {h.performed_by.last_name}".strip()
            return name or h.performed_by.username
        return ''

    def get_finance_comment(self, obj):
        histories = obj.approval_history.all()
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
            'requested_amount', 'department', 'delivery_location', 'priority',
            'required_by', 'vendor', 'preferred_vendor', 'justification', 'attachments',
            'created_at'
        ]
        read_only_fields = ['id', 'request_id', 'status', 'current_approval_level', 'current_stage', 'created_at']
        extra_kwargs = {
            'department': {'required': False, 'allow_null': True}
        }

    def validate_requested_amount(self, value):
        if value < 0:
            raise serializers.ValidationError("Requested amount cannot be negative.")
        return value


class TeamLeadActionSerializer(serializers.Serializer):
    comments = serializers.CharField(required=False, allow_blank=True, default='')


class TeamLeadRejectOrSendBackSerializer(serializers.Serializer):
    comments = serializers.CharField(required=True, allow_blank=False, min_length=3)


class ManagerApproveSerializer(serializers.Serializer):
    approved_amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    cost_center = serializers.CharField(required=False, allow_blank=True, default='')
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
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'RECOMMEND', 'RETURN'])
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
