from django.db import models
from apps.core.models import TimeStampedModel
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor


class RFQ(TimeStampedModel):
    STATUS_CHOICES = (
        ('New', 'New'),
        ('Open', 'Open'),
        ('Expired', 'Expired'),
        ('Closed', 'Closed'),
    )

    rfq_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='rfqs', null=True, blank=True)
    title = models.CharField(max_length=200)
    deadline = models.DateField(db_index=True)
    terms = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True, null=True, db_index=True)
    invited_vendors = models.ManyToManyField(Vendor, related_name='invited_rfqs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open', db_index=True)
    attachments = models.FileField(upload_to='rfq_attachments/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.rfq_id:
            import uuid
            self.rfq_id = f"RFQ-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.rfq_id} - {self.title}"


class Quotation(TimeStampedModel):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Submitted', 'Submitted'),
        ('Under Evaluation', 'Under Evaluation'),
        ('Shortlisted', 'Shortlisted'),
        ('Selected', 'Selected'),
        ('Rejected', 'Rejected'),
    )

    quotation_id = models.CharField(max_length=50, unique=True, editable=False)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='quotations')
    price = models.DecimalField(max_digits=12, decimal_places=2, db_index=True)
    gst_rate = models.DecimalField(max_digits=5, decimal_places=2, default=18.00, db_index=True)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    delivery_days = models.PositiveIntegerField(default=7)
    warranty_months = models.PositiveIntegerField(default=12)
    valid_until = models.DateField(null=True, blank=True)
    terms_conditions = models.TextField(blank=True)
    extra_fields = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted', db_index=True)
    attachments = models.FileField(upload_to='quotation_attachments/', blank=True, null=True)

    def save(self, *args, **kwargs):
        from decimal import Decimal
        if not self.quotation_id:
            import uuid
            self.quotation_id = f"QUO-{uuid.uuid4().hex[:8].upper()}"

        if self.gst_rate is None:
            self.gst_rate = Decimal('18.00')

        if self.price is not None:
            price_dec = Decimal(str(self.price))
            rate_dec = Decimal(str(self.gst_rate))
            expected_tax = (price_dec * (rate_dec / Decimal('100.00'))).quantize(Decimal('0.01'))
            expected_total = (price_dec + expected_tax).quantize(Decimal('0.01'))
            self.tax_amount = expected_tax
            self.total_amount = expected_total

        if not self.valid_until and self.rfq and hasattr(self.rfq, 'deadline') and self.rfq.deadline:
            self.valid_until = self.rfq.deadline

        # Enforce rule: Only ONE quotation can be Selected per RFQ at the database model level
        if self.status == 'Selected' and self.rfq_id:
            Quotation.objects.filter(rfq_id=self.rfq_id, status='Selected').exclude(id=self.id).update(status='Under Evaluation')

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_id} - {self.vendor.name} (${self.price})"

