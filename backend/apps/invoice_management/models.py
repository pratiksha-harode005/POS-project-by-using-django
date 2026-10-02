from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.vendor_management.models import Vendor


class Invoice(TimeStampedModel):
    STATUS_CHOICES = (
        ('Pending Match', 'Pending Match'),
        ('Matched', 'Matched'),
        ('Exception', 'Exception'),
        ('Approved', 'Approved'),
        ('Paid', 'Paid'),
    )

    invoice_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='invoices')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='invoices')
    invoice_number = models.CharField(max_length=100) # Vendor reference number
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending Match', db_index=True)
    invoice_date = models.DateField(db_index=True)
    due_date = models.DateField(db_index=True)
    document = models.FileField(upload_to='invoices/', blank=True, null=True)
    # Manager explicit verification flag (separate from status which defaults to 'Approved' on creation)
    is_manager_verified = models.BooleanField(default=False, db_index=True)
    verified_by_name = models.CharField(max_length=200, blank=True, default='')
    verified_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.invoice_id:
            import uuid
            self.invoice_id = f"INV-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.invoice_id} - {self.invoice_number} (${self.amount})"


class ThreeWayMatch(TimeStampedModel):
    match_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='matches')
    goods_receipt = models.ForeignKey(GoodsReceipt, on_delete=models.CASCADE, related_name='matches')
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='matches')
    
    po_amount = models.DecimalField(max_digits=12, decimal_places=2)
    invoice_amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_matched = models.BooleanField(default=False, db_index=True)
    variance_reason = models.TextField(blank=True)
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.match_id:
            import uuid
            self.match_id = f"3WM-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.match_id} - PO: {self.purchase_order.po_id} (Matched: {self.is_matched})"
