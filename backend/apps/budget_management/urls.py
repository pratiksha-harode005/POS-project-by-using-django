from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BudgetLimitViewSet, BudgetAllocationViewSet

router = DefaultRouter()
router.register(r'limits', BudgetLimitViewSet, basename='budget-limit')
router.register(r'allocations', BudgetAllocationViewSet, basename='budget-allocation')
router.register(r'', BudgetAllocationViewSet, basename='budget')

urlpatterns = [
    path('', include(router.urls)),
]
