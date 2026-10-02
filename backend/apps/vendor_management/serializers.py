import time
from rest_framework import serializers
from .models import VendorCategory, Vendor
from apps.users.serializers import UserSerializer

_CATEGORY_CACHE = {}
_CATEGORY_CACHE_TS = 0
_CATEGORY_CACHE_TTL = 300.0


def get_cached_category(cat_id):
    global _CATEGORY_CACHE, _CATEGORY_CACHE_TS
    if not cat_id:
        return None
    now = time.time()
    if not _CATEGORY_CACHE or (now - _CATEGORY_CACHE_TS) > _CATEGORY_CACHE_TTL:
        try:
            cats = {c.id: c for c in VendorCategory.objects.all()}
            _CATEGORY_CACHE = cats
            _CATEGORY_CACHE_TS = now
        except Exception:
            return None
    return _CATEGORY_CACHE.get(cat_id)


class VendorCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = VendorCategory
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    category_detail = serializers.SerializerMethodField()
    user_detail = serializers.SerializerMethodField()

    class Meta:
        model = Vendor
        fields = '__all__'
        read_only_fields = ['unique_vendor_id', 'created_at', 'updated_at']

    def get_category_detail(self, obj):
        if not obj or not obj.category_id:
            return None
        if hasattr(obj, '_state') and 'category' in getattr(obj._state, 'fields_cache', {}):
            cat = obj._state.fields_cache['category']
        else:
            cat = get_cached_category(obj.category_id)
        if cat:
            return VendorCategorySerializer(cat).data
        return None

    def get_user_detail(self, obj):
        if not obj or not obj.user_id:
            return None
        if hasattr(obj, '_state') and 'user' in getattr(obj._state, 'fields_cache', {}):
            u = obj._state.fields_cache['user']
            if u:
                return UserSerializer(u).data
        return None
