from django.contrib import admin
from .models import PurchaseRequest, ApprovalStep, ApprovalHistory, RejectionReason


@admin.register(RejectionReason)
class RejectionReasonAdmin(admin.ModelAdmin):
    list_display = ('text', 'reason_type', 'is_active')
    list_filter = ('reason_type', 'is_active')


class ApprovalHistoryInline(admin.TabularInline):
    model = ApprovalHistory
    extra = 0
    readonly_fields = (
        'action', 'performed_by', 'user_role', 'previous_status', 'new_status',
        'comments', 'approved_amount', 'cost_center', 'budget_available', 'vendor', 'created_at'
    )
    can_delete = False


@admin.register(ApprovalHistory)
class ApprovalHistoryAdmin(admin.ModelAdmin):
    list_display = ('request', 'action', 'performed_by', 'user_role', 'previous_status', 'new_status', 'created_at')
    list_filter = ('action', 'user_role', 'new_status')
    search_fields = ('request__request_id', 'performed_by__username', 'comments')
    readonly_fields = [f.name for f in ApprovalHistory._meta.fields]


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ('request', 'actor', 'role', 'decision', 'created_at')
    list_filter = ('decision', 'role')


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = (
        'request_id', 'title', 'category', 'department', 'requested_amount',
        'approved_amount', 'status', 'current_approval_level', 'created_by', 'created_at'
    )
    list_filter = ('status', 'current_approval_level', 'department', 'priority')
    search_fields = ('request_id', 'title', 'category', 'description')
    inlines = [ApprovalHistoryInline]
