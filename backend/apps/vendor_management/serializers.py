from rest_framework import serializers
from .models import VendorCategory, Vendor
from apps.users.serializers import UserSerializer


class VendorCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCategory
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    category_detail = VendorCategorySerializer(source='category', read_only=True)
    user_detail = UserSerializer(source='user', read_only=True)

    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ['unique_vendor_id', 'created_at', 'updated_at']
