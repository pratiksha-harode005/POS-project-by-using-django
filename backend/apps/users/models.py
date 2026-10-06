from django.contrib.auth.models import AbstractUser
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class User(AbstractUser):
    ROLE_CHOICES = (
        ('EMPLOYEE', 'Employee'),
        ('TEAM_LEAD', 'Team Lead'),
        ('MANAGER', 'Manager'),
        ('FINANCE', 'Finance'),
        ('ADMIN', 'Admin'),
        ('VENDOR', 'Vendor'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='EMPLOYEE')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    vendor_id_code = models.CharField(max_length=50, blank=True, null=True, help_text="Unique Vendor ID for Vendor role")
    phone = models.CharField(max_length=30, blank=True)
    work_location = models.CharField(max_length=150, blank=True)
    job_title = models.CharField(max_length=100, blank=True)
    preferred_name = models.CharField(max_length=100, blank=True)
    emergency_contact = models.CharField(max_length=150, blank=True)
    cost_center = models.CharField(max_length=100, blank=True)
    reporting_manager = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
