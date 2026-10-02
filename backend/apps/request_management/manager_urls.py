from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ManagerRequestViewSet

router = DefaultRouter()
router.register(r'', ManagerRequestViewSet, basename='manager-requests')

urlpatterns = [
    path('', include(router.urls)),
]
