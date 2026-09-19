from rest_framework import serializers
from .models import Payment
from apps.invoice_management.serializers import InvoiceSerializer
from apps.vendor_management.serializers import VendorSerializer


class PaymentSerializer(serializers.ModelSerializer):
    invoice_detail = InvoiceSerializer(source='invoice', read_only=True)
    vendor_detail = VendorSerializer(source='vendor', read_only=True)

    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_id', 'created_at', 'updated_at']
