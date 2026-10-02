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
        ('PAID', 'Paid'),
        ('SUCCESS', 'Payment Success'),
        ('Failed', 'Failed'),
        ('MOCK_SUCCESS', 'Mock Payment Success'),
        ('MOCK_FAILED', 'Mock Payment Failed'),
    )

    METHOD_CHOICES = (
        ('Bank Transfer', 'Bank Transfer'),
        ('Wire', 'Wire'),
        ('Credit Card', 'Credit Card'),
        ('Check', 'Check'),
        ('MOCK', 'Mock Payment (Simulation)'),
    )

    payment_id = models.CharField(max_length=50, unique=True, editable=False)
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='payments')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='payments', null=True, blank=True)
    vendor_name = models.CharField(max_length=200, blank=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, choices=METHOD_CHOICES, default='Bank Transfer')
    reference_number = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    payment_date = models.DateField(null=True, blank=True)
    payment_proof = models.FileField(upload_to='payment_receipts/', null=True, blank=True)
    notes = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.payment_id:
            import uuid
            self.payment_id = f"PAY-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        vendor_name = self.vendor.name if self.vendor_id else (self.vendor_name or 'No Vendor')
        return f"{self.payment_id} - {vendor_name} (₹{self.amount} - {self.status})"
