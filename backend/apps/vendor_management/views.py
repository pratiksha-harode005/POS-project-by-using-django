from rest_framework import viewsets, permissions
from rest_framework.permissions import AllowAny
from .models import Vendor, VendorCategory
from .serializers import VendorSerializer, VendorCategorySerializer


class VendorCategoryViewSet(viewsets.ModelViewSet):
    queryset = VendorCategory.objects.all().order_by('name')
    serializer_class = VendorCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class VendorViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing vendor instances.
    """
    queryset = Vendor.objects.select_related('category', 'user', 'user__department').order_by('-created_at', 'id')
    serializer_class = VendorSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    filterset_fields = ['category', 'risk_rating', 'status']
    search_fields = ['unique_vendor_id', 'name', 'contact_person', 'email']

    def get_queryset(self):
        user = self.request.user
        qs = Vendor.objects.select_related('category', 'user', 'user__department').order_by('-created_at', 'id')
        if getattr(user, 'role', None) == 'VENDOR':
            # Vendor user can only see their own vendor profile
            return qs.filter(user=user)
        return qs

