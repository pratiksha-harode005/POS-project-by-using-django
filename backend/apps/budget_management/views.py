from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import BudgetLimit, BudgetAllocation
from .serializers import BudgetLimitSerializer, BudgetAllocationSerializer
from apps.core.permissions import IsAdminUser


class BudgetLimitViewSet(viewsets.ModelViewSet):
    queryset = BudgetLimit.objects.all()
    serializer_class = BudgetLimitSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['role', 'department', 'fiscal_year']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]


class BudgetAllocationViewSet(viewsets.ModelViewSet):
    queryset = BudgetAllocation.objects.all()
    serializer_class = BudgetAllocationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['department', 'fiscal_year']

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAdminUser()]
        return [IsAuthenticated()]

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def summary(self, request):
        allocations = BudgetAllocation.objects.all()
        total_allocated = sum(a.total_allocated for a in allocations)
        total_committed = sum(a.committed_amount for a in allocations)
        total_spent = sum(a.spent_amount for a in allocations)
        total_available = total_allocated - (total_committed + total_spent)

        return Response({
            'total_allocated': total_allocated,
            'total_committed': total_committed,
            'total_spent': total_spent,
            'total_available': total_available,
        })
