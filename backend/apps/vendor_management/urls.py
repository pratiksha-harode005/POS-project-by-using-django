from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import VendorViewSet, VendorCategoryViewSet

router = DefaultRouter()
router.register(r'categories', VendorCategoryViewSet, basename='vendor-category')
router.register(r'', VendorViewSet, basename='vendor')

urlpatterns = [
    path('', include(router.urls)),
]
