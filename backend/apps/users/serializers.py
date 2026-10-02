import time
from rest_framework import serializers
from .models import User, Department

_DEPT_CACHE = {}
_DEPT_CACHE_TS = 0
_DEPT_CACHE_TTL = 300.0


def get_cached_department(dept_id):
    global _DEPT_CACHE, _DEPT_CACHE_TS
    if not dept_id:
        return None
    now = time.time()
    if not _DEPT_CACHE or (now - _DEPT_CACHE_TS) > _DEPT_CACHE_TTL:
        try:
            depts = {d.id: d for d in Department.objects.all()}
            _DEPT_CACHE = depts
            _DEPT_CACHE_TS = now
        except Exception:
            return None
    return _DEPT_CACHE.get(dept_id)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    department_detail = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'department', 'department_detail', 'vendor_id_code',
            'phone', 'work_location', 'job_title', 'is_active', 'date_joined'
        ]
        read_only_fields = ['id', 'date_joined']

    def get_department_detail(self, obj):
        if not obj or not obj.department_id:
            return None
        if hasattr(obj, '_state') and 'department' in getattr(obj._state, 'fields_cache', {}):
            dept = obj._state.fields_cache['department']
        else:
            dept = get_cached_department(obj.department_id)
        if dept:
            return DepartmentSerializer(dept).data
        return None


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'work_location', 'job_title']


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=6)
