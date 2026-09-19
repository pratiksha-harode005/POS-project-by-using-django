from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseRequestViewSet, RejectionReasonViewSet

router = DefaultRouter()
router.register(r'reasons', RejectionReasonViewSet, basename='rejection-reason')
router.register(r'', PurchaseRequestViewSet, basename='purchase-request')

urlpatterns = [
    path('', include(router.urls)),
]
