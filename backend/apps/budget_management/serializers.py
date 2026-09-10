from rest_framework import serializers
from .models import BudgetLimit, BudgetAllocation
from apps.users.serializers import DepartmentSerializer


class BudgetLimitSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source='department', read_only=True)

    class Meta:
        model = BudgetLimit
        fields = '__all__'


class BudgetAllocationSerializer(serializers.ModelSerializer):
    department_detail = DepartmentSerializer(source='department', read_only=True)
    available_amount = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = BudgetAllocation
        fields = '__all__'
