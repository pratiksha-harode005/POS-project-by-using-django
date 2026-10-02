from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinanceRequestViewSet

router = DefaultRouter()
router.register(r'', FinanceRequestViewSet, basename='finance-requests')

urlpatterns = [
    path('', include(router.urls)),
]
