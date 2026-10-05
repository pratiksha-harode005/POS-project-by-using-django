from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor
from apps.rfq_management.models import Quotation


class ProcurementSafeQuerySet(models.QuerySet):
    def _get_missing_columns(self):
        try:
            from django.db import connection
            if connection.vendor == 'sqlite':
                with connection.cursor() as cursor:
                    cursor.execute(f"PRAGMA table_info({self.model._meta.db_table})")
                    cols = {row[1] for row in cursor.fetchall()}
                    if cols:
                        return [f.name for f in self.model._meta.concrete_fields if f.column and f.column not in cols]
        except Exception:
            pass
        return []

    def iterator(self, *args, **kwargs):
        missing = self._get_missing_columns()
        if missing:
            return super().defer(*missing).iterator(*args, **kwargs)
        return super().iterator(*args, **kwargs)


class ProcurementSafeManager(models.Manager):
    def get_queryset(self):
        qs = ProcurementSafeQuerySet(self.model, using=self._db)
        missing = qs._get_missing_columns()
        if missing:
            return qs.defer(*missing)
        return qs


class PurchaseOrder(TimeStampedModel):
    STATUS_CHOICES = (
        ('Draft', 'Draft'),
        ('Issued', 'Issued'),
        ('Confirmed', 'Confirmed'),
        ('Processing', 'Processing'),
        ('Shipped', 'Shipped'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    )

    objects = ProcurementSafeManager()

    po_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_request = models.ForeignKey(PurchaseRequest, on_delete=models.CASCADE, related_name='purchase_orders')
    quotation = models.ForeignKey(Quotation, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchase_orders')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='purchase_orders')
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Issued', db_index=True)
    order_date = models.DateField(auto_now_add=True)
    expected_delivery = models.DateField(null=True, blank=True)
    terms = models.TextField(blank=True)

    def save(self, *args, **kwargs):
        if not self.po_id:
            if self.purchase_request and hasattr(self.purchase_request, 'request_id') and self.purchase_request.request_id:
                clean_ref = self.purchase_request.request_id.replace('REQ-', '').replace('RFQ-', '').strip().upper()
                candidate_po_id = f"PO-{clean_ref}"
                if not PurchaseOrder.objects.filter(po_id=candidate_po_id).exclude(pk=self.pk).exists():
                    self.po_id = candidate_po_id
                else:
                    import uuid
                    self.po_id = f"PO-{uuid.uuid4().hex[:8].upper()}"
            else:
                import uuid
                self.po_id = f"PO-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.po_id} - {self.vendor.name} (${self.total_amount})"


class GoodsReceipt(TimeStampedModel):
    STATUS_CHOICES = (
        ('Pending Verification', 'Pending Verification'),
        ('Pending', 'Pending'),
        ('Received', 'Received'),
        ('Partial', 'Partial'),
        ('Verified', 'Verified'),
        ('Rejected', 'Rejected'),
        ('Damaged', 'Damaged'),
    )

    objects = ProcurementSafeManager()

    receipt_id = models.CharField(max_length=50, unique=True, editable=False)
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='goods_receipts')
    received_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='receipts_handled')
    delivery_date = models.DateField(null=True, blank=True)
    delivery_location = models.CharField(max_length=255, blank=True, default='')
    product_name = models.CharField(max_length=255, blank=True, default='')
    ordered_quantity = models.IntegerField(null=True, blank=True, default=1)
    received_quantity = models.IntegerField(null=True, blank=True, default=1)
    receipt_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='Pending Verification', db_index=True)
    notes = models.TextField(blank=True, default='')
    verified_by_name = models.CharField(max_length=255, blank=True, default='')
    verified_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.TextField(blank=True, default='')

    def save(self, *args, **kwargs):
        if not self.receipt_id:
            import uuid
            self.receipt_id = f"REC-{uuid.uuid4().hex[:8].upper()}"
        if not self.delivery_location:
            if self.purchase_order and self.purchase_order.purchase_request:
                self.delivery_location = self.purchase_order.purchase_request.delivery_location or 'Main Office / Warehouse'
            else:
                self.delivery_location = 'Main Office / Warehouse'
        if not self.product_name:
            if self.purchase_order and self.purchase_order.purchase_request:
                self.product_name = self.purchase_order.purchase_request.title or 'Procurement Items'
            else:
                self.product_name = 'Procurement Items'
        if self.ordered_quantity is None:
            if self.purchase_order and self.purchase_order.purchase_request:
                self.ordered_quantity = self.purchase_order.purchase_request.quantity or 1
            else:
                self.ordered_quantity = 1
        if self.received_quantity is None:
            self.received_quantity = self.ordered_quantity or 1
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
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', db_index=True)
    document = models.FileField(upload_to='contract_docs/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.contract_id:
            import uuid
            self.contract_id = f"CON-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.contract_id} - {self.title} ({self.vendor.name})"
