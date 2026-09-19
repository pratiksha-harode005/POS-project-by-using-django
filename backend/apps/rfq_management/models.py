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
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='rfqs')
    title = models.CharField(max_length=200)
    deadline = models.DateField()
    terms = models.TextField(blank=True)
    invited_vendors = models.ManyToManyField(Vendor, related_name='invited_rfqs')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Open')
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
        ('Selected', 'Selected'),
        ('Rejected', 'Rejected'),
    )

    quotation_id = models.CharField(max_length=50, unique=True, editable=False)
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotations')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='quotations')
    price = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_days = models.PositiveIntegerField(default=7)
    warranty_months = models.PositiveIntegerField(default=12)
    terms_conditions = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Submitted')
    attachments = models.FileField(upload_to='quotation_attachments/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.quotation_id:
            import uuid
            self.quotation_id = f"QUO-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.quotation_id} - {self.vendor.name} (${self.price})"
