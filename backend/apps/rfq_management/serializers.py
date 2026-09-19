from rest_framework import serializers
from .models import RFQ, Quotation
from apps.request_management.serializers import PurchaseRequestSerializer
from apps.vendor_management.serializers import VendorSerializer


class QuotationSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['quotation_id', 'created_at', 'updated_at']


class RFQSerializer(serializers.ModelSerializer):
    purchase_request_detail = PurchaseRequestSerializer(source='purchase_request', read_only=True)
    invited_vendors_detail = VendorSerializer(source='invited_vendors', many=True, read_only=True)
    quotations = QuotationSerializer(many=True, read_only=True)

    class Meta:
        model = RFQ
        fields = '__all__'
        read_only_fields = ['rfq_id', 'created_at', 'updated_at']
