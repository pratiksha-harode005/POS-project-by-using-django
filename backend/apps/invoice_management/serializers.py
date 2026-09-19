from rest_framework import serializers
from .models import Invoice, ThreeWayMatch
from apps.procurement.serializers import PurchaseOrderSerializer, GoodsReceiptSerializer
from apps.vendor_management.serializers import VendorSerializer


class InvoiceSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    purchase_order_detail = PurchaseOrderSerializer(source='purchase_order', read_only=True)

    class Meta:
        model = Invoice
        fields = '__all__'
        read_only_fields = ['invoice_id', 'created_at', 'updated_at']


class ThreeWayMatchSerializer(serializers.ModelSerializer):
    purchase_order_detail = PurchaseOrderSerializer(source='purchase_order', read_only=True)
    goods_receipt_detail = GoodsReceiptSerializer(source='goods_receipt', read_only=True)
    invoice_detail = InvoiceSerializer(source='invoice', read_only=True)

    class Meta:
        model = ThreeWayMatch
        fields = '__all__'
        read_only_fields = ['match_id', 'created_at', 'updated_at']
