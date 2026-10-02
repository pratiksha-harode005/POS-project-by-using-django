from rest_framework import serializers
from .models import User, Department

_DEPT_CACHE = {}


def get_cached_department(dept_id):
    if not dept_id:
        return None
    if dept_id not in _DEPT_CACHE:
        try:
            dept = Department.objects.filter(id=dept_id).first()
            if dept:
                _DEPT_CACHE[dept_id] = dept
        except Exception:
            return None
    return _DEPT_CACHE.get(dept_id)


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'


class UserSerializer(serializers.ModelSerializer):
    department_detail = serializers.SerializerMethodField()
    password = serializers.CharField(write_only=True, required=False, default='password123')

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'department', 'department_detail', 'vendor_id_code',
            'phone', 'work_location', 'job_title', 'is_active', 'date_joined', 'password'
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

    def create(self, validated_data):
        password = validated_data.pop('password', 'password123')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'email', 'phone', 'work_location', 'job_title']


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True)

