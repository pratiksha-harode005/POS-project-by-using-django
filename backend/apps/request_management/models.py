from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.users.models import Department


class RejectionReason(TimeStampedModel):
    TYPE_CHOICES = (
        ('REJECT', 'Rejection Reason'),
        ('RECOMMEND', 'Recommendation/Escalation Reason'),
    )
    reason_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='REJECT')
    text = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"[{self.get_reason_type_display()}] {self.text}"


class PurchaseRequest(TimeStampedModel):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Approved', 'Approved'),
        ('Rejected', 'Rejected'),
        ('Returned', 'Returned'),
        ('In Procurement', 'In Procurement'),
        ('Completed', 'Completed'),
    )

    PRIORITY_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
        ('Urgent', 'Urgent'),
    )

    STAGE_CHOICES = (
        (0, 'Create Request'),
        (1, 'Manager Approval'),
        (2, 'Finance Approval'),
        (3, 'Admin Approval'),
        (4, 'RFQ Sent'),
        (5, 'Vendor Quotes Received'),
        (6, 'Product Order'),
        (7, 'Delivery'),
        (8, 'Verification and Order Complete'),
        (9, 'Payment'),
    )

    request_id = models.CharField(max_length=50, unique=True, editable=False)
    title = models.CharField(max_length=200)
    category = models.CharField(max_length=100, db_index=True)
    subcategory = models.CharField(max_length=100, blank=True)
    description = models.TextField()
    quantity = models.PositiveIntegerField(default=1)
    required_by = models.DateField()
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='purchase_requests')
    delivery_location = models.CharField(max_length=255)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='Medium', db_index=True)
    preferred_vendor = models.CharField(max_length=200, blank=True)
    justification = models.TextField()
    attachments = models.FileField(upload_to='request_attachments/', blank=True, null=True)

    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Pending', db_index=True)
    current_stage = models.IntegerField(choices=STAGE_CHOICES, default=1, db_index=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='created_requests')
    
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    flow_type = models.CharField(max_length=5, choices=(('A', 'Flow A'), ('B', 'Flow B')), default='A')
    extra_fields = models.JSONField(default=dict, blank=True)
    renewal_sequence = models.IntegerField(default=0)
    request_operation = models.CharField(max_length=50, default='CREATE')

    @property
    def workflow_type(self):
        cat = (self.category or '').strip().lower()
        tit = (self.title or '').strip().lower()
        software_keywords = [
            'software', 'saas', 'cloud', 'license', 'subscription',
            'digital', 'api', 'aws', 'azure', 'gcp', 'jira', 'figma',
            'slack', 'github', 'zoom', 'antivirus', 'database', 'security tool', 'devops',
            'cybersecurity', 'it services', 'training & certifications'
        ]
        if any(k in cat or k in tit for k in software_keywords):
            return 'SOFTWARE'
        return 'HARDWARE'

    def save(self, *args, **kwargs):
        if not self.request_id:
            import uuid
            self.request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
        if self.renewal_sequence is None:
            self.renewal_sequence = 0
        if not self.request_operation:
            self.request_operation = 'CREATE'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.request_id} - {self.title} ({self.status})"


class ApprovalStep(TimeStampedModel):
    DECISION_CHOICES = (
        ('APPROVE', 'Approve'),
        ('REJECT', 'Reject'),
        ('RECOMMEND', 'Recommend to Next Authority'),
        ('RETURN', 'Return to Team Lead'),
    )

    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='approval_steps')
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='actions_taken')
    role = models.CharField(max_length=20, db_index=True)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, db_index=True)
    reason = models.ForeignKey(RejectionReason, on_delete=models.SET_NULL, null=True, blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.request.request_id} - {self.role} {self.get_decision_display()}"
