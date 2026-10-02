from django.db import models
from apps.core.models import TimeStampedModel
from apps.invoice_management.models import Invoice
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor


class Payment(TimeStampedModel):
    STATUS_CHOICES = (
        ('Pending', 'Pending'),
        ('Processing', 'Processing'),
        ('Paid', 'Paid'),
        ('Failed', 'Failed'),
    )

    METHOD_CHOICES = (
        ('Online Bank Transfer', 'Online Bank Transfer (NEFT/RTGS/IMPS)'),
        ('UPI', 'UPI'),
        ('Cash on Hand', 'Cash on Hand'),
        ('Cheque', 'Cheque'),
        ('Card', 'Card'),
        ('Bank Transfer', 'Bank Transfer'),
        ('Wire', 'Wire'),
        ('Credit Card', 'Credit Card'),
        ('Check', 'Check'),
        ('Cash', 'Cash'),
        ('NEFT/RTGS/IMPS', 'NEFT/RTGS/IMPS'),
    )

    payment_id = models.CharField(max_length=50, unique=True, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='payments')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    vendor_name = models.CharField(max_length=200, blank=True, default='')
    payment_proof = models.CharField(max_length=500, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=60, choices=METHOD_CHOICES, default='Online Bank Transfer', db_index=True)
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    payment_date = models.DateField(null=True, blank=True, db_index=True)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.payment_id:
            import uuid
            self.payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
        if not self.vendor_name:
            if self.vendor and hasattr(self.vendor, 'name') and self.vendor.name:
                self.vendor_name = self.vendor.name
            elif self.invoice and self.invoice.vendor and self.invoice.vendor.name:
                self.vendor_name = self.invoice.vendor.name
            else:
                self.vendor_name = 'Vendor Partner'
        super().save(*args, **kwargs)

    def __str__(self):
        vname = self.vendor_name or (self.vendor.name if self.vendor else 'Vendor')
        return f"{self.payment_id} - {vname} (${self.amount} - {self.status})"
