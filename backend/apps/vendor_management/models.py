from django.db import models
from django.conf import settings
from apps.core.models import TimeStampedModel


class VendorCategory(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Vendor(TimeStampedModel):
    RISK_CHOICES = (
        ('Low', 'Low'),
        ('Medium', 'Medium'),
        ('High', 'High'),
    )

    STATUS_CHOICES = (
        ('Active', 'Active'),
        ('Pending Approval', 'Pending Approval'),
        ('Suspended', 'Suspended'),
    )

    category = models.ForeignKey(VendorCategory, on_delete=models.CASCADE, related_name='vendors')
    unique_vendor_id = models.CharField(max_length=50, unique=True, editable=False)
    name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=100)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    address = models.TextField(blank=True)
    
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='vendor_profile')
    risk_rating = models.CharField(max_length=20, choices=RISK_CHOICES, default='Low')
    performance_score = models.DecimalField(max_digits=5, decimal_places=2, default=90.00) # 0 to 100
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='Active')
    documents = models.FileField(upload_to='vendor_docs/', blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.unique_vendor_id:
            import uuid
            prefix = self.category.name[:3].upper() if self.category else "VND"
            self.unique_vendor_id = f"{prefix}-{uuid.uuid4().hex[:6].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.unique_vendor_id} - {self.name} ({self.category.name})"
