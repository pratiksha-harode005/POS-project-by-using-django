from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor
from apps.rfq_management.models import Quotation


class PurchaseOrder(TimeStampedModel):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Issued', 'Issued'),
        ('Confirmed', 'Confirmed'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    )

    po_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='purchase_orders')
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Issued')
    order_date = models.DateField(auto_now_add=True)
    expected_delivery = models.DateField(null=True, blank=True)
    terms = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.po_id:
            import uuid
            self.po_id = f"PO-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_id} - {self.vendor.name} (${self.total_amount})"


class GoodsReceipt(TimeStampedModel):
    STATUS_CHOICES = (
        ('Received', 'Received'),
        ('Partial', 'Partial'),
        ('Verified', 'Verified'),
        ('Damaged', 'Damaged'),
    )

    receipt_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='goods_receipts')
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='receipts_handled')
    delivery_date = models.DateField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Verified')
    notes = models.TextField(blank=True)
    delivery_location = models.CharField(max_length=255, default='Digital Provisioning / Cloud')
    product_name = models.CharField(max_length=255, default='', blank=True)
    ordered_quantity = models.IntegerField(null=True, blank=True, default=1)
    received_quantity = models.IntegerField(null=True, blank=True, default=1)
    receipt_date = models.DateField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by_name = models.CharField(max_length=255, blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.receipt_id:
            import uuid
            self.receipt_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.receipt_id} - PO: {self.purchase_order.po_id}"


class Contract(TimeStampedModel):
    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Expired', 'Expired'),
        ('Terminated', 'Terminated'),
    )

    contract_id = models.CharField(max_length=50, unique=True, editable=False)
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='contracts')
    title = models.CharField(max_length=200)
    value = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')
    document = models.FileField(upload_to='contract_docs/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.contract_id:
            import uuid
            self.contract_id = f"CON-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.contract_id} - {self.title} ({self.vendor.name})"
