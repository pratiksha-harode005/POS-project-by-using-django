from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RFQViewSet, QuotationViewSet

router = DefaultRouter()
router.register(r'quotations', QuotationViewSet, basename='quotation')
router.register(r'', RFQViewSet, basename='rfq')

urlpatterns = [
    path('', include(router.urls)),
]
