from rest_framework import serializers
from .models import PurchaseOrder, GoodsReceipt, Contract
from apps.request_management.serializers import PurchaseRequestSerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.users.serializers import UserSerializer


class PurchaseOrderBasicSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    purchase_request_detail = PurchaseRequestSerializer(source='purchase_request', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'po_id', 'total_amount', 'status', 'order_date', 'expected_delivery', 'vendor_detail', 'purchase_request_detail']


class GoodsReceiptSerializer(serializers.ModelSerializer):
    received_by_detail = UserSerializer(source='received_by', read_only=True)
    purchase_order_detail = PurchaseOrderBasicSerializer(source='purchase_order', read_only=True)

    class Meta:
        model = GoodsReceipt
        fields = '__all__'
        read_only_fields = ['receipt_id', 'created_at', 'updated_at']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    purchase_request_detail = PurchaseRequestSerializer(source='purchase_request', read_only=True)
    goods_receipts = GoodsReceiptSerializer(many=True, read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['po_id', 'order_date', 'created_at', 'updated_at']


class ContractSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)

    class Meta:
        model = Contract
        fields = '__all__'
        read_only_fields = ['contract_id', 'created_at', 'updated_at']
