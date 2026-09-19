from django.contrib import admin
from .models import VendorCategory, Vendor


@admin.register(VendorCategory)
class VendorCategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'created_at')


@admin.register(Vendor)
class VendorAdmin(admin.ModelAdmin):
    list_display = ('unique_vendor_id', 'name', 'category', 'risk_rating', 'performance_score', 'status')
    list_filter = ('category', 'risk_rating', 'status')
    search_fields = ('unique_vendor_id', 'name', 'email')
