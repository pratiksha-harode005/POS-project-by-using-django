from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import BudgetLimit, BudgetAllocation
from .serializers import BudgetLimitSerializer, BudgetAllocationSerializer
from django.db.models import Sum
from apps.core.permissions import IsAdminUser


class BudgetLimitViewSet(viewsets.ModelViewSet):
    queryset = BudgetLimit.objects.select_related('department').all().order_by('-fiscal_year', 'role')
    serializer_class = BudgetLimitSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['role', 'department', 'fiscal_year']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]


class BudgetAllocationViewSet(viewsets.ModelViewSet):
    queryset = BudgetAllocation.objects.select_related('department').all().order_by('-fiscal_year', 'department__name')
    serializer_class = BudgetAllocationSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['department', 'fiscal_year']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [AllowAny()]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        agg = BudgetAllocation.objects.aggregate(
            total_allocated=Sum('total_allocated'),
            total_committed=Sum('committed_amount'),
            total_spent=Sum('spent_amount')
        )
        total_allocated = agg['total_allocated'] or 0
        total_committed = agg['total_committed'] or 0
        total_spent = agg['total_spent'] or 0
        total_available = total_allocated - (total_committed + total_spent)

        return Response({
            'total_allocated': total_allocated,
            'total_committed': total_committed,
            'total_spent': total_spent,
            'total_available': total_available,
        })
