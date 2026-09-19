from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PurchaseOrderViewSet, GoodsReceiptViewSet, ContractViewSet

router = DefaultRouter()
router.register(r'purchase-orders', PurchaseOrderViewSet, basename='purchase-order')
router.register(r'receipts', GoodsReceiptViewSet, basename='goods-receipt')
router.register(r'contracts', ContractViewSet, basename='contract')

urlpatterns = [
    path('', include(router.urls)),
]
