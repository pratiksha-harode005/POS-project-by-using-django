from rest_framework import serializers
from .models import PurchaseRequest, ApprovalStep, RejectionReason
from apps.users.serializers import UserSerializer, DepartmentSerializer


class RejectionReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = RejectionReason
        fields = '__all__'


class ApprovalStepSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source='actor', read_only=True)
    reason_detail = RejectionReasonSerializer(source='reason', read_only=True)

    class Meta:
        model = ApprovalStep
        fields = '__all__'


class PurchaseRequestSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)

    class Meta:
        model = PurchaseRequest
        fields = '__all__'
        read_only_fields = ['request_id', 'created_by', 'status', 'current_stage', 'created_at', 'updated_at']
        extra_kwargs = {
            'department': {'required': False, 'allow_null': True}
        }


class ApproveRejectActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'RECOMMEND', 'RETURN'])
    reason_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, data):
        action = data.get('action')
        reason_id = data.get('reason_id')
        if action in ['REJECT', 'RECOMMEND'] and not reason_id:
            raise serializers.ValidationError({"reason_id": f"Reason is required when action is {action}."})
        return data
