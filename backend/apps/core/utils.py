import time
from django.db.models import Q
from apps.vendor_management.models import Vendor

_VENDOR_CACHE = None
_VENDOR_CACHE_TIME = 0
_CACHE_TTL = 60.0  # 60 seconds TTL


def _get_all_vendors_cached():
    global _VENDOR_CACHE, _VENDOR_CACHE_TIME
    now = time.time()
    if _VENDOR_CACHE is not None and (now - _VENDOR_CACHE_TIME) < _CACHE_TTL:
        return _VENDOR_CACHE
    try:
        vendors = list(
            Vendor.objects.select_related('category', 'user', 'user__department').all()
        )
        _VENDOR_CACHE = vendors
        _VENDOR_CACHE_TIME = now
        return vendors
    except Exception:
        return _VENDOR_CACHE or []


def invalidate_vendor_cache():
    global _VENDOR_CACHE, _VENDOR_CACHE_TIME
    _VENDOR_CACHE = None
    _VENDOR_CACHE_TIME = 0


def resolve_vendor_helper(v_val):
    if not v_val:
        return None
    if isinstance(v_val, Vendor):
        return v_val
    v_str = str(v_val).strip()
    if not v_str:
        return None

    vendors = _get_all_vendors_cached()
    if not vendors:
        # Fallback to direct DB query if cache failed
        if v_str.isdigit():
            return Vendor.objects.select_related('category', 'user', 'user__department').filter(id=int(v_str)).first()
        return Vendor.objects.select_related('category', 'user', 'user__department').filter(
            Q(unique_vendor_id__iexact=v_str) | Q(name__iexact=v_str)
        ).first()

    # 1. Integer ID match
    if v_str.isdigit():
        target_id = int(v_str)
        for v in vendors:
            if v.id == target_id:
                return v

    v_str_lower = v_str.lower()

    # 2. Exact unique_vendor_id or name match
    for v in vendors:
        if (v.unique_vendor_id and v.unique_vendor_id.lower() == v_str_lower) or (v.name and v.name.lower() == v_str_lower):
            return v

    # 3. Substring unique_vendor_id or name
    for v in vendors:
        if (v.unique_vendor_id and v_str_lower in v.unique_vendor_id.lower()) or (v.name and v_str_lower in v.name.lower()):
            return v

    # 4. Known aliases
    alias_map = [
        ('dell', 'VND-HW-001', 'Dell'),
        ('hp', 'VND-HW-002', 'HP'),
        ('hpe', 'VND-HW-002', 'HP'),
        ('lenovo', 'VND-HW-003', 'Lenovo'),
        ('len', 'VND-HW-003', 'Lenovo'),
        ('apple', 'VND-HW-004', 'Apple'),
        ('app', 'VND-HW-004', 'Apple'),
        ('palo', 'VND-SEC-001', 'Palo Alto'),
        ('alto', 'VND-SEC-001', 'Palo Alto'),
        ('crowd', 'VND-SEC-002', 'CrowdStrike'),
        ('strike', 'VND-SEC-002', 'CrowdStrike'),
        ('accenture', 'VND-IT-001', 'Accenture'),
        ('infosys', 'VND-IT-002', 'Infosys'),
        ('herman', 'VND-FUR-001', 'Herman Miller'),
        ('miller', 'VND-FUR-001', 'Herman Miller'),
        ('steelcase', 'VND-FUR-002', 'Steelcase'),
        ('samsung', 'VND-OFF-001', 'Samsung'),
        ('canon', 'VND-OFF-002', 'Canon'),
        ('cisco', 'VND-NET-001', 'Cisco'),
    ]
    for key, uid, name_sub in alias_map:
        if key in v_str_lower:
            uid_lower = uid.lower()
            name_sub_lower = name_sub.lower()
            for v in vendors:
                if (v.unique_vendor_id and v.unique_vendor_id.lower() == uid_lower) or (v.name and name_sub_lower in v.name.lower()):
                    return v

    # 5. Direct DB fallback if cache was stale
    if v_str.isdigit():
        return Vendor.objects.select_related('category', 'user', 'user__department').filter(id=int(v_str)).first()
    return Vendor.objects.select_related('category', 'user', 'user__department').filter(
        Q(unique_vendor_id__iexact=v_str) | Q(name__iexact=v_str)
    ).first()

