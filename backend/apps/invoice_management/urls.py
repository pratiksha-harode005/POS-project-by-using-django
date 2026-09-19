from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InvoiceViewSet, ThreeWayMatchViewSet

router = DefaultRouter()
router.register(r'three-way-match', ThreeWayMatchViewSet, basename='three-way-match')
router.register(r'', InvoiceViewSet, basename='invoice')

urlpatterns = [
    path('', include(router.urls)),
]
