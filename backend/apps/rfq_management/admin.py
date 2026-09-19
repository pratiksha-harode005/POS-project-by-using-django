from django.contrib import admin
from .models import RFQ, Quotation


@admin.register(RFQ)
class RFQAdmin(admin.ModelAdmin):
    list_display = ('rfq_id', 'title', 'purchase_request', 'deadline', 'status')
    list_filter = ('status', 'deadline')
    search_fields = ('rfq_id', 'title')


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ('quotation_id', 'rfq', 'vendor', 'price', 'delivery_days', 'status')
    list_filter = ('status',)
    search_fields = ('quotation_id', 'vendor__name')
