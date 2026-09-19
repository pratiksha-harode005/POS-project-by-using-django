from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'created_at')
    search_fields = ('name', 'code')


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'role', 'department', 'vendor_id_code', 'is_staff')
    list_filter = ('role', 'department', 'is_staff', 'is_active')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Procurement OS Profile', {'fields': ('role', 'department', 'vendor_id_code', 'phone', 'work_location', 'job_title')}),
    )
