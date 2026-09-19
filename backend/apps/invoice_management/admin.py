from django.contrib import admin
from .models import Invoice, ThreeWayMatch


@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ('invoice_id', 'invoice_number', 'vendor', 'amount', 'status', 'due_date')
    list_filter = ('status', 'due_date')
    search_fields = ('invoice_id', 'invoice_number', 'vendor__name')


@admin.register(ThreeWayMatch)
class ThreeWayMatchAdmin(admin.ModelAdmin):
    list_display = ('match_id', 'purchase_order', 'invoice', 'is_matched', 'verified_by')
    list_filter = ('is_matched',)
