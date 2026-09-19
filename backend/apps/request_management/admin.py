from django.contrib import admin
from .models import PurchaseRequest, ApprovalStep, RejectionReason


@admin.register(RejectionReason)
class RejectionReasonAdmin(admin.ModelAdmin):
    list_display = ('text', 'reason_type', 'is_active')
    list_filter = ('reason_type', 'is_active')


@admin.register(ApprovalStep)
class ApprovalStepAdmin(admin.ModelAdmin):
    list_display = ('request', 'actor', 'role', 'decision', 'created_at')
    list_filter = ('decision', 'role')


@admin.register(PurchaseRequest)
class PurchaseRequestAdmin(admin.ModelAdmin):
    list_display = ('request_id', 'title', 'category', 'department', 'status', 'current_stage', 'created_by')
    list_filter = ('status', 'current_stage', 'department', 'priority')
    search_fields = ('request_id', 'title', 'category')
