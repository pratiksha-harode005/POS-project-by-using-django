from django.contrib import admin
from .models import BudgetLimit, BudgetAllocation


@admin.register(BudgetLimit)
class BudgetLimitAdmin(admin.ModelAdmin):
    list_display = ('role', 'department', 'max_amount', 'fiscal_year')
    list_filter = ('role', 'fiscal_year')


@admin.register(BudgetAllocation)
class BudgetAllocationAdmin(admin.ModelAdmin):
    list_display = ('department', 'fiscal_year', 'total_allocated', 'committed_amount', 'spent_amount', 'available_amount')
    list_filter = ('fiscal_year',)
