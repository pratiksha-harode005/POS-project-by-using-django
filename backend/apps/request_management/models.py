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
    STATUS_TEAM_LEAD_SUBMITTED = 'TEAM_LEAD_SUBMITTED'
    STATUS_TEAM_LEAD_REVIEW = 'TEAM_LEAD_REVIEW'
    STATUS_MANAGER_REVIEW = 'MANAGER_REVIEW'
    STATUS_RECOMMENDED_TO_FINANCE = 'RECOMMENDED_TO_FINANCE'
    STATUS_FINANCE_RECOMMENDED = 'FINANCE_RECOMMENDED'
    STATUS_FINANCE_REVIEW = 'FINANCE_REVIEW'
    STATUS_FINANCE_RESEARCH = 'FINANCE_RESEARCH'
    STATUS_COST_ESTIMATION = 'COST_ESTIMATION'
    STATUS_FINANCE_REPORT = 'FINANCE_REPORT'
    STATUS_MANAGER_RESEARCHING = 'MANAGER_RESEARCHING'
    STATUS_PRE_ESTIMATION_COMPLETED = 'PRE_ESTIMATION_COMPLETED'
    STATUS_MANAGER_APPROVED = 'MANAGER_APPROVED'
    STATUS_FINANCE_APPROVED = 'FINANCE_APPROVED'
    STATUS_FINANCE_REJECTED = 'FINANCE_REJECTED'
    STATUS_PAYMENT_COMPLETED = 'PAYMENT_COMPLETED'
    STATUS_TEAM_LEAD_CONFIRMED = 'TEAM_LEAD_CONFIRMED'
    STATUS_COMPLETED = 'COMPLETED'
    STATUS_SENT_BACK = 'SENT_BACK'
    STATUS_REJECTED = 'REJECTED'
    STATUS_RECOMMENDED_TO_ADMIN = 'RECOMMENDED_TO_ADMIN'
    STATUS_FINANCE_RECOMMENDED_TO_ADMIN = 'FINANCE_RECOMMENDED_TO_ADMIN'
    STATUS_ADMIN_REVIEW = 'ADMIN_REVIEW'
    STATUS_ADMIN_RESEARCH = 'ADMIN_RESEARCH'
    STATUS_ADMIN_APPROVED = 'ADMIN_APPROVED'

    # Software & SaaS Workflow Statuses
    STATUS_MANAGER_RECOMMENDED_TO_FINANCE = 'MANAGER_RECOMMENDED_TO_FINANCE'
    STATUS_PAYMENT_APPROVED = 'PAYMENT_APPROVED'  # Finance approved payment; awaiting TL mock payment
    STATUS_PAYMENT_PROCESSED = 'PAYMENT_PROCESSED'  # Mock payment completed; awaiting TL justification
    STATUS_PAYMENT_JUSTIFICATION_SUBMITTED = 'PAYMENT_JUSTIFICATION_SUBMITTED'  # TL submitted justification; awaiting Manager verification
    STATUS_PAYMENT_JUSTIFIED = 'PAYMENT_JUSTIFIED'  # Manager verified justification; awaiting TL acknowledge
    STATUS_MANAGER_VERIFIED = 'MANAGER_VERIFIED'  # Manager verified payment justification
    STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT = 'MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT'
    STATUS_TEAM_LEAD_ACKNOWLEDGED = 'TEAM_LEAD_ACKNOWLEDGED'
    STATUS_REQUEST_COMPLETED = 'REQUEST_COMPLETED'  # End-to-end workflow completed

    # Legacy statuses for backward compatibility
    STATUS_PENDING = 'Pending'
    STATUS_APPROVED = 'Approved'
    STATUS_RETURNED = 'Returned'
    STATUS_IN_PROCUREMENT = 'In Procurement'

    STATUS_CHOICES = (
        (STATUS_CREATED, 'Created'),
        (STATUS_TEAM_LEAD_SUBMITTED, 'Team Lead Submitted'),
        (STATUS_TEAM_LEAD_REVIEW, 'Team Lead Review'),
        (STATUS_MANAGER_REVIEW, 'Manager Review'),
        (STATUS_RECOMMENDED_TO_FINANCE, 'Recommended to Finance'),
        (STATUS_MANAGER_RECOMMENDED_TO_FINANCE, 'Manager Recommended to Finance'),
        (STATUS_FINANCE_RECOMMENDED, 'Finance Recommended'),
        (STATUS_FINANCE_REVIEW, 'Finance Review'),
        (STATUS_FINANCE_RESEARCH, 'Finance Research'),
        (STATUS_COST_ESTIMATION, 'Cost Estimation'),
        (STATUS_FINANCE_REPORT, 'Finance Report'),
        (STATUS_MANAGER_RESEARCHING, 'Manager Researching'),
        (STATUS_PRE_ESTIMATION_COMPLETED, 'Pre-Estimation Completed'),
        (STATUS_MANAGER_APPROVED, 'Manager Approved'),
        (STATUS_FINANCE_APPROVED, 'Finance Approved'),
        (STATUS_FINANCE_REJECTED, 'Finance Rejected'),
        (STATUS_PAYMENT_COMPLETED, 'Payment Completed'),
        (STATUS_TEAM_LEAD_CONFIRMED, 'Team Lead Confirmed'),
        (STATUS_COMPLETED, 'Completed'),
        (STATUS_SENT_BACK, 'Sent Back'),
        (STATUS_REJECTED, 'Rejected'),
        (STATUS_PAYMENT_APPROVED, 'Payment Approved'),
        (STATUS_PAYMENT_PROCESSED, 'Payment Processed'),
        (STATUS_PAYMENT_JUSTIFICATION_SUBMITTED, 'Payment Justification Submitted'),
        (STATUS_PAYMENT_JUSTIFIED, 'Payment Justified'),
        (STATUS_MANAGER_VERIFIED, 'Manager Verified'),
        (STATUS_MANAGER_VERIFIED_PENDING_TEAM_LEAD_ACKNOWLEDGEMENT, 'Manager Verified - Pending Team Lead Acknowledgement'),
        (STATUS_TEAM_LEAD_ACKNOWLEDGED, 'Team Lead Acknowledged'),
        (STATUS_REQUEST_COMPLETED, 'Request Completed'),
        (STATUS_RECOMMENDED_TO_ADMIN, 'Recommended to Admin'),
        (STATUS_FINANCE_RECOMMENDED_TO_ADMIN, 'Finance Recommended to Admin'),
        (STATUS_ADMIN_REVIEW, 'Admin Review'),
        (STATUS_ADMIN_RESEARCH, 'Admin Research'),
        (STATUS_ADMIN_APPROVED, 'Admin Approved'),
        # Legacy
        (STATUS_PENDING, 'Pending (Legacy)'),
        (STATUS_APPROVED, 'Approved (Legacy)'),
        (STATUS_RETURNED, 'Returned (Legacy)'),
        (STATUS_IN_PROCUREMENT, 'In Procurement (Legacy)'),
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
        (1, 'Request Created'),
        (2, 'Manager Review'),
        (3, 'Manager Research'),
        (4, 'Pre-Estimation Completed'),
        (5, 'Manager Approved'),
        (6, 'Finance Review'),
        (7, 'Finance Approved'),
        (8, 'Payment Completed'),
        (9, 'Team Lead Confirmation'),
        (10, 'Request Completed'),
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

    # Structured Software / Team Lead Requirement Fields
    request_type = models.CharField(max_length=50, default='Renewal', blank=True)  # Renewal / Upgrade / New Purchase
    software_name = models.CharField(max_length=200, blank=True, db_index=True)
    current_plan = models.CharField(max_length=100, blank=True)
    required_plan = models.CharField(max_length=100, blank=True)
    existing_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    business_requirement = models.TextField(blank=True)

    # Financial & Commercial Details
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    finance_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    budget_available = models.BooleanField(default=True)
    cost_center = models.CharField(max_length=100, blank=True)
    budget_code = models.CharField(max_length=100, blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    preferred_vendor = models.CharField(max_length=200, blank=True)

    # Payment Processing Details
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(max_length=40, default='Pending', blank=True)
    payment_notes = models.TextField(blank=True)
    payment_proof = models.FileField(upload_to='payment_receipts/', null=True, blank=True)

    # Team Lead Confirmation
    confirmed_by_team_lead = models.BooleanField(default=False)
    confirmed_at = models.DateTimeField(null=True, blank=True)

    # Workflow Status
    status = models.CharField(max_length=60, choices=STATUS_CHOICES, default=STATUS_TEAM_LEAD_REVIEW, db_index=True)
    current_approval_level = models.CharField(max_length=40, choices=APPROVAL_LEVEL_CHOICES, default=LEVEL_TEAM_LEAD)
    current_stage = models.IntegerField(choices=STAGE_CHOICES, default=1)
    total_estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    flow_type = models.CharField(max_length=5, choices=(('A', 'Flow A'), ('B', 'Flow B')), default='A')
    extra_fields = models.JSONField(default=dict, blank=True)

    # Renewal & Upgrade Tracking
    parent_request = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='child_requests')
    original_request = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='all_descendants')
    request_operation = models.CharField(max_length=20, choices=(('NEW', 'New Purchase'), ('RENEWAL', 'Renewal'), ('UPGRADE', 'Upgrade')), default='NEW')
    renewal_sequence = models.IntegerField(default=0)
    @property
    def is_software(self):
        cat_lower = (self.category or '').lower()
        title_lower = (self.title or '').lower()
        return (
            any(k in cat_lower for k in ['software', 'saas', 'cloud', 'license', 'subscription', 'digital', 'it services', 'cybersecurity']) or
            any(k in title_lower for k in ['software', 'saas', 'cloud', 'license', 'subscription', 'jira', 'slack', 'aws', 'azure']) or
            getattr(self, 'flow_type', '') == 'B' or
            bool(getattr(self, 'software_name', ''))
        )

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

    class Meta:
        ordering = ['-created_at', '-id']
        verbose_name = 'Purchase Request'
        verbose_name_plural = 'Purchase Requests'
        indexes = [
            # Composite index for role-based list views: WHERE status IN (...) ORDER BY -created_at
            # Eliminates full-table scan + sort on every portal load
            models.Index(fields=['status', '-created_at'], name='pr_status_created_idx'),
            # Composite index for team lead queries: WHERE created_by=X AND status=Y ORDER BY -created_at
            models.Index(fields=['created_by', 'status', '-created_at'], name='pr_createdby_status_idx'),
            # Composite index for software/hardware split filtering
            models.Index(fields=['flow_type', 'status'], name='pr_flowtype_status_idx'),
            # Index for approval level filtering used in manager/finance/admin viewsets
            models.Index(fields=['current_approval_level', '-created_at'], name='pr_approval_level_idx'),
        ]

    def __str__(self):
        return f"{self.request_id} - {self.title} [{self.status}]"


class ManagerResearchEstimation(TimeStampedModel):
    """
    Dedicated PostgreSQL model storing Manager research findings and pre-estimation
    linked to the SAME PurchaseRequest ID.
    """
    request = models.OneToOneField(PurchaseRequest, on_delete=models.CASCADE, related_name='research_estimation')
    researched_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='manager_researches'
    )

    # Step 3 Research fields
    market_pricing = models.TextField(blank=True)
    renewal_pricing = models.TextField(blank=True)
    upgrade_pricing = models.TextField(blank=True)
    available_plans = models.TextField(blank=True)
    license_pricing = models.TextField(blank=True)
    vendor_quotation_ref = models.CharField(max_length=150, blank=True)
    subscription_terms = models.TextField(blank=True)
    tax_gst = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    cost_comparison = models.TextField(blank=True)
    business_value = models.TextField(blank=True)
    available_alternatives = models.TextField(blank=True)
    research_notes = models.TextField(blank=True)

    # Step 4 Pre-estimation fields
    current_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    estimated_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    recommended_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    currency = models.CharField(max_length=10, default='INR', blank=True)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    final_estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    budget_code = models.CharField(max_length=100, blank=True)
    vendor = models.CharField(max_length=200, blank=True)
    pricing_source = models.CharField(max_length=200, blank=True)
    quote_reference = models.CharField(max_length=150, blank=True)
    business_evaluation = models.TextField(blank=True)
    manager_comments = models.TextField(blank=True)
    admin_comments = models.TextField(blank=True, default='')
    hardware_specs = models.TextField(blank=True, default='')
    software_licensing = models.TextField(blank=True, default='')
    quantity_licenses = models.CharField(max_length=100, blank=True, default='')
    estimated_unit_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0.00, blank=True)
    supporting_document = models.FileField(upload_to='research_documents/', null=True, blank=True)
    is_completed = models.BooleanField(default=False)

    def __str__(self):
        return f"Research & Pre-Estimation for {self.request.request_id} ({self.currency} {self.final_estimated_amount})"


class PaymentJustification(TimeStampedModel):
    """
    Dedicated PostgreSQL model storing Team Lead Payment Justification (7 Sections)
    linked to the SAME PurchaseRequest ID.
    """
    request = models.OneToOneField(PurchaseRequest, on_delete=models.CASCADE, related_name='payment_justification')
    submitted_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='submitted_justifications'
    )

    # 1. Request Details (Auto-filled / Read-Only from PurchaseRequest)

    # 2. Software / SaaS Details
    software_name = models.CharField(max_length=255, blank=True)
    vendor_name = models.CharField(max_length=255, blank=True)
    purchase_type = models.CharField(max_length=50, default='New', blank=True)  # New / Renewal / Upgrade
    subscription_type = models.CharField(max_length=50, default='Annual', blank=True)  # Monthly / Annual / One-Time
    users_licenses = models.CharField(max_length=100, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    plan_edition = models.CharField(max_length=150, blank=True)

    # 3. Financial Details
    requested_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    manager_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    finance_approved_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    actual_purchase_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    gst_tax = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    discount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    final_payable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # 4. Business Justification
    why_required = models.TextField(blank=True)
    business_purpose = models.TextField(blank=True)
    who_will_use = models.TextField(blank=True)
    expected_benefits = models.TextField(blank=True)
    impact_if_not_purchased = models.TextField(blank=True)
    urgency = models.CharField(max_length=50, default='Medium', blank=True)
    required_by_date = models.DateField(null=True, blank=True)

    # 5. Vendor & Purchase Details
    vendor_contact = models.CharField(max_length=255, blank=True)
    quote_number = models.CharField(max_length=100, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    po_number = models.CharField(max_length=100, blank=True)
    purchase_url = models.CharField(max_length=500, blank=True)
    selected_plan = models.CharField(max_length=150, blank=True)
    purchase_remarks = models.TextField(blank=True)

    # 6. Payment & Documents
    payment_method = models.CharField(max_length=100, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    payment_date = models.DateField(null=True, blank=True)
    payment_status = models.CharField(max_length=50, default='Paid', blank=True)
    invoice_file = models.FileField(upload_to='justifications/invoices/', null=True, blank=True)
    quote_file = models.FileField(upload_to='justifications/quotes/', null=True, blank=True)
    receipt_file = models.FileField(upload_to='justifications/receipts/', null=True, blank=True)
    supporting_doc = models.FileField(upload_to='justifications/supporting/', null=True, blank=True)

    # 7. Team Lead Confirmation
    team_lead_name = models.CharField(max_length=255, blank=True)
    submitted_at = models.DateTimeField(auto_now_add=True)
    comments_remarks = models.TextField(blank=True)
    confirmation_checked = models.BooleanField(default=False)

    # Manager Verification
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='verified_justifications'
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    manager_notes = models.TextField(blank=True)

    # Team Lead Final Acknowledgement
    is_acknowledged = models.BooleanField(default=False)
    acknowledged_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='acknowledged_justifications'
    )
    acknowledged_at = models.DateTimeField(null=True, blank=True)
    acknowledgement_notes = models.TextField(blank=True)

    def __str__(self):
        return f"Payment Justification for {self.request.request_id} ({self.software_name})"



class ApprovalHistory(TimeStampedModel):
    """
    Immutable audit log of all transitions and decisions on a Procurement Request.
    """
    ACTION_CHOICES = (
        ('CREATE', 'Created'),
        ('RESEARCH_SAVED', 'Research Saved'),
        ('PRE_ESTIMATION_COMPLETED', 'Pre-Estimation Completed'),
        ('APPROVE', 'Approved'),
        ('REJECT', 'Rejected'),
        ('SEND_BACK', 'Sent Back'),
        ('RESUBMIT', 'Resubmitted'),
        ('RECOMMEND_FINANCE', 'Recommended to Finance'),
        ('MANAGER_RECOMMEND_FINANCE', 'Manager Recommended to Finance'),
        ('RECOMMEND_ADMIN', 'Recommended to Admin'),
        ('FINANCE_RECOMMEND_ADMIN', 'Finance Recommended to Admin'),
        ('FINANCE_REVIEW', 'Finance Review'),
        ('FINANCE_RESEARCH', 'Finance Research'),
        ('COST_ESTIMATION', 'Cost Estimation Submitted'),
        ('FINANCE_REPORT', 'Finance Report Generated'),
        ('FINANCE_APPROVE', 'Finance Approved'),
        ('FINANCE_REJECT', 'Finance Rejected'),
        ('PAYMENT_COMPLETED', 'Payment Completed'),
        ('MOCK_PAYMENT', 'Mock Payment Completed'),
        ('PAYMENT_PROCESSED', 'Payment Processed'),
        ('PAYMENT_JUSTIFICATION_SUBMITTED', 'Payment Justification Submitted'),
        ('PAYMENT_JUSTIFIED', 'Payment Justified'),
        ('MANAGER_VERIFIED', 'Manager Verified Justification'),
        ('TEAM_LEAD_ACKNOWLEDGE', 'Team Lead Acknowledged Justification'),
        ('REQUEST_COMPLETED', 'Request Completed'),
        ('TEAM_LEAD_CONFIRM', 'Team Lead Confirmed'),
        ('TEAM_LEAD_CONFIRMED', 'Team Lead Confirmed'),
        ('COMPLETED', 'Completed'),
        ('ADMIN_APPROVE', 'Admin Approved'),
        ('ADMIN_REJECT', 'Admin Rejected'),
        ('ADMIN_RETURN', 'Admin Returned'),
        ('ADMIN_RESEARCH', 'Admin Research Saved'),
        ('ADMIN_COST_ESTIMATION', 'Admin Cost Estimation Submitted'),
    )

    request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='approval_history')
    action = models.CharField(max_length=60, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='approval_history_actions')
    user_role = models.CharField(max_length=40)
    previous_status = models.CharField(max_length=60)
    new_status = models.CharField(max_length=60)
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
