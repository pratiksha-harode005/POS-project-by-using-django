from django.contrib import admin
from .models import PurchaseOrder, GoodsReceipt, Contract


@admin.register(PurchaseOrder)
class PurchaseOrderAdmin(admin.ModelAdmin):
    list_display = ('po_id', 'vendor', 'purchase_request', 'total_amount', 'status', 'order_date')
    list_filter = ('status', 'order_date')


@admin.register(GoodsReceipt)
class GoodsReceiptAdmin(admin.ModelAdmin):
    list_display = ('receipt_id', 'purchase_order', 'received_by', 'status', 'delivery_date')
    list_filter = ('status', 'delivery_date')


@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ('contract_id', 'title', 'vendor', 'value', 'status', 'end_date')
    list_filter = ('status',)
