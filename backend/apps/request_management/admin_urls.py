from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AdminRequestViewSet

router = DefaultRouter()
router.register(r'', AdminRequestViewSet, basename='admin-requests')

urlpatterns = [
    path('', include(router.urls)),
]
