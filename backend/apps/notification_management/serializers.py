from django.utils import timezone
from rest_framework import serializers
from .models import Notification
from apps.users.serializers import UserSerializer


class NotificationSerializer(serializers.ModelSerializer):
    user_detail = UserSerializer(source='user', read_only=True)
    request_id = serializers.ReadOnlyField(source='purchase_request.request_id')
    requestId = serializers.ReadOnlyField(source='purchase_request.request_id')
    isRead = serializers.BooleanField(source='is_read', required=False)
    timestamp = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    category = serializers.SerializerMethodField()
    sender = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = '__all__'
        read_only_fields = ['user', 'created_at', 'updated_at']

    def get_timestamp(self, obj):
        if not obj.created_at:
            return 'Just now'
        now = timezone.now()
        diff = now - obj.created_at
        seconds = diff.total_seconds()
        if seconds < 60:
            return 'Just now'
        elif seconds < 3600:
            mins = int(seconds // 60)
            return f"{mins} min{'s' if mins > 1 else ''} ago"
        elif seconds < 86400:
            hours = int(seconds // 3600)
            return f"{hours} hour{'s' if hours > 1 else ''} ago"
        elif seconds < 172800:
            return 'Yesterday'
        else:
            days = int(seconds // 86400)
            return f"{days} day{'s' if days > 1 else ''} ago"

    def get_date(self, obj):
        if not obj.created_at:
            return ''
        return obj.created_at.strftime('%Y-%m-%d %H:%M')

    def get_category(self, obj):
        title_msg = f"{obj.title} {obj.message}".lower()
        if any(w in title_msg for w in ['approved', 'rejected', 'returned', 'resubmitted', 'request', 'recommend', 'created', 'review']):
            return 'Approval'
        if any(w in title_msg for w in ['rfq', 'quotation', 'quote']):
            return 'RFQ'
        if any(w in title_msg for w in ['po', 'purchase order', 'receipt', 'goods receipt', 'delivery', 'grn', 'shipped']):
            return 'Logistics'
        if any(w in title_msg for w in ['payment', 'disbursed', 'invoice', 'paid', 'settled', 'utr']):
            return 'Payment'
        if 'budget' in title_msg:
            return 'Budget'
        return 'Compliance'

    def get_sender(self, obj):
        title_msg = f"{obj.title} {obj.message}".lower()
        if 'manager' in title_msg:
            return 'Operations Manager'
        if 'finance' in title_msg:
            return 'Finance Controller'
        if 'admin' in title_msg:
            return 'System Admin'
        if 'vendor' in title_msg or 'dell' in title_msg:
            return 'Vendor Partner'
        if 'team lead' in title_msg:
            return 'Team Lead'
        if obj.user and obj.user.role == 'VENDOR':
            return 'Procurement Desk'
        return 'Procurement System'
