from django.db import models
from apps.core.models import TimeStampedModel
from apps.users.models import Department


class BudgetLimit(TimeStampedModel):
    ROLE_CHOICES = (
        ('MANAGER', 'Manager'),
        ('FINANCE', 'Finance'),
        ('ADMIN', 'Admin'),
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    department = models.ForeignKey(Department, on_delete=models.CASCADE, null=True, blank=True, related_name='budget_limits')
    max_amount = models.DecimalField(max_digits=12, decimal_places=2)
    fiscal_year = models.CharField(max_length=10, default='2026')

    class Meta:
        unique_together = ('role', 'department', 'fiscal_year')

    def __str__(self):
        dept_str = self.department.name if self.department else "Global"
        return f"{dept_str} - {self.get_role_display()} Limit: ${self.max_amount} ({self.fiscal_year})"


class BudgetAllocation(TimeStampedModel):
    department = models.ForeignKey(Department, on_delete=models.CASCADE, related_name='budget_allocations')
    fiscal_year = models.CharField(max_length=10, default='2026')
    total_allocated = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    committed_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)
    spent_amount = models.DecimalField(max_digits=14, decimal_places=2, default=0.00)

    class Meta:
        unique_together = ('department', 'fiscal_year')

    @property
    def available_amount(self):
        return self.total_allocated - (self.committed_amount + self.spent_amount)

    def __str__(self):
        return f"{self.department.name} FY{self.fiscal_year}: Total ${self.total_allocated} (Available: ${self.available_amount})"
