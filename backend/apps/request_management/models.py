import uuid
from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.users.models import Department


class RejectionReason(TimeStampedModel):
    TYPE_CHOICES = (
        ('REJECT', 'Rejection Reason'),
        ('RECOMMEND', 'Recommendation/Escalation Reason'),
        ('SEND_BACK', 'Send Back Reason'),
    )
    reason_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='REJECT')
    text = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"[{self.get_reason_type_display()}] {self.text}"


class PurchaseRequest(TimeStampedModel):
    # Standard Workflow Statuses
    STATUS_CREATED = 'CREATED'
    STATUS_TEAM_LEAD_REVIEW = 'TEAM_LEAD_REVIEW'
    STATUS_MANAGER_REVIEW = 'MANAGER_REVIEW'
    STATUS_MANAGER_APPROVED = 'MANAGER_APPROVED'
    STATUS_FINANCE_RECOMMENDED = 'FINANCE_RECOMMENDED'
    STATUS_FINANCE_REVIEW = 'FINANCE_REVIEW'
    STATUS_FINANCE_APPROVED = 'FINANCE_APPROVED'
    STATUS_FINANCE_REJECTED = 'FINANCE_REJECTED'
    STATUS_SENT_BACK = 'SENT_BACK'
    STATUS_REJECTED = 'REJECTED'

    # Legacy statuses for backward compatibility
    STATUS_PENDING = 'Pending'
    STATUS_APPROVED = 'Approved'
    STATUS_RETURNED = 'Returned'
    STATUS_IN_PROCUREMENT = 'In Procurement'
    STATUS_COMPLETED = 'Completed'

    STATUS_CHOICES = (
        (STATUS_CREATED, 'Created'),
        (STATUS_TEAM_LEAD_REVIEW, 'Team Lead Review'),
        (STATUS_MANAGER_REVIEW, 'Manager Review'),
        (STATUS_MANAGER_APPROVED, 'Manager Approved'),
        (STATUS_FINANCE_RECOMMENDED, 'Finance Recommended'),
        (STATUS_FINANCE_REVIEW, 'Finance Review'),
        (STATUS_FINANCE_APPROVED, 'Finance Approved'),
        (STATUS_FINANCE_REJECTED, 'Finance Rejected'),
        (STATUS_SENT_BACK, 'Sent Back'),
        (STATUS_REJECTED, 'Rejected'),
        # Legacy
        (STATUS_PENDING, 'Pending (Legacy)'),
        (STATUS_APPROVED, 'Approved (Legacy)'),
        (STATUS_RETURNED, 'Returned (Legacy)'),
        (STATUS_IN_PROCUREMENT, 'In Procurement (Legacy)'),
        (STATUS_COMPLETED, 'Completed (Legacy)'),
    )

    LEVEL_EMPLOYEE = 'EMPLOYEE'
    LEVEL_TEAM_LEAD = 'TEAM_LEAD'
    LEVEL_MANAGER = 'MANAGER'
    LEVEL_FINANCE = 'FINANCE'
    LEVEL_ADMIN = 'ADMIN'
    LEVEL_COMPLETED = 'COMPLETED'
    LEVEL_NONE = 'NONE'

    APPROVAL_LEVEL_CHOICES = (
        (LEVEL_EMPLOYEE, 'Employee'),
        (LEVEL_TEAM_LEAD, 'Team Lead'),
        (LEVEL_MANAGER, 'Manager'),
        (LEVEL_FINANCE, 'Finance'),
        (LEVEL_ADMIN, 'Admin'),
        (LEVEL_COMPLETED, 'Completed'),
        (LEVEL_NONE, 'None'),
    )

    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    )

    STAGE_CHOICES = (
        (0, 'Create Request'),
        (1, 'Team Lead Review'),
        (2, 'Manager Approval'),
        (3, 'Finance Approval'),
        (4, 'Admin Approval'),
        (5, 'RFQ Sent'),
        (6, 'Vendor Quotes Received'),
        (7, 'Product Order'),
        (8, 'Delivery'),
        (9, 'Invoice'),
        (10, 'Payment'),
    )

    # Identifiers & Assignment
    request_id = models.CharField(max_length=50, unique=True, editable=False, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_requests')
    assigned_team_lead = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_team_lead_requests'
    )
    assigned_manager = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_manager_requests'
    )
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='purchase_requests')

    # Content
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100)
    subcategory = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    quantity = models.PositiveIntegerField(default=1)
    required_by = models.DateField(null=True, blank=True)
    delivery_location = models.CharField(max_length=255, blank=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium')
    justification = models.TextField(blank=True)
    attachments = models.FileField(upload_to='request_attachments/', blank=True, null=True)

    # Financial & Commercial Details
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_available = models.BooleanField(default=True)
    cost_center = models.CharField(max_length=100, blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    preferred_vendor = models.CharField(max_length=200, blank=True)

    # Workflow Status
    status = models.CharField(max_length=40, choices=STATUS_CHOICES, default=STATUS_TEAM_LEAD_REVIEW, db_index=True)
    current_approval_level = models.CharField(max_length=40, choices=APPROVAL_LEVEL_CHOICES, default=LEVEL_TEAM_LEAD)
    current_stage = models.IntegerField(choices=STAGE_CHOICES, default=1)
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    flow_type = models.CharField(max_length=5, choices=(('A', 'Flow A'), ('B', 'Flow B')), default='A')
    extra_fields = models.JSONField(default=dict, blank=True)

    @property
    def requester(self):
        return self.created_by

    def save(self, *args, **kwargs):
        if not self.request_id:
            self.request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
        # Sync requested_amount and total_estimated_cost
        if self.requested_amount and not self.total_estimated_cost:
            self.total_estimated_cost = self.requested_amount
        elif self.total_estimated_cost and not self.requested_amount:
            self.requested_amount = self.total_estimated_cost
        if self.vendor and not self.preferred_vendor:
            self.preferred_vendor = self.vendor
        elif self.preferred_vendor and not self.vendor:
            self.vendor = self.preferred_vendor
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_id} - {self.title} [{self.status}]"


class ApprovalHistory(TimeStampedModel):
    """
    Immutable audit log of all transitions and decisions on a Procurement Request.
    """
    ACTION_CHOICES = (
        ('CREATE', 'Created'),
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
        ('SEND_BACK', 'Sent Back'),
        ('RESUBMIT', 'Resubmitted'),
        ('RECOMMEND_FINANCE', 'Recommended to Finance'),
        ('FINANCE_APPROVE', 'Finance Approved'),
        ('FINANCE_REJECT', 'Finance Rejected'),
        ('ADMIN_APPROVE', 'Admin Approved'),
        ('ADMIN_REJECT', 'Admin Rejected'),
        ('ADMIN_RETURN', 'Admin Returned'),
    )

    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='approval_history')
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='approval_history_actions')
    user_role = models.CharField(max_length=20)
    previous_status = models.CharField(max_length=40)
    new_status = models.CharField(max_length=40)
    comments = models.TextField(blank=True)

    # Contextual snapshots at time of action
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    budget_available = models.BooleanField(default=True)
    vendor = models.CharField(max_length=200, blank=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Approval History Record'
        verbose_name_plural = 'Approval History Records'

    def __str__(self):
        return f"{self.request.request_id} | {self.action} by {self.performed_by.username} ({self.user_role}) at {self.created_at}"


class ApprovalStep(TimeStampedModel):
    """Legacy approval step preserved for backward compatibility."""
    DECISION_CHOICES = (
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('RECOMMEND', 'Recommend to Next Authority'),
        ('RETURN', 'Return to Team Lead'),
    )

    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='approval_steps')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='actions_taken')
    role = models.CharField(max_length=20)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES)
    reason = models.ForeignKey(RejectionReason, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.request.request_id} - {self.role} {self.get_decision_display()}"
