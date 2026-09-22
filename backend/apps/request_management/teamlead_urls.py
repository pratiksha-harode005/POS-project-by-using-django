from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TeamLeadRequestViewSet

router = DefaultRouter()
router.register(r'', TeamLeadRequestViewSet, basename='teamlead-requests')

urlpatterns = [
    path('', include(router.urls)),
]
