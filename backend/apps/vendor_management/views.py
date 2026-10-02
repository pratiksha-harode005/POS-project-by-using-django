from rest_framework import viewsets, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from .models import VendorCategory, Vendor
from .serializers import VendorCategorySerializer, VendorSerializer


class VendorCategoryViewSet(viewsets.ModelViewSet):
    queryset = VendorCategory.objects.all().order_by('name')
    serializer_class = VendorCategorySerializer
    permission_classes = [AllowAny]
    pagination_class = None


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [AllowAny]
    pagination_class = None
    filterset_fields = ['category', 'risk_rating', 'status']
    search_fields = ['unique_vendor_id', 'name', 'contact_person', 'email']

    def get_queryset(self):
        user = self.request.user
        qs = Vendor.objects.select_related('category', 'user', 'user__department')
        if getattr(user, 'role', None) == 'VENDOR':
            # Vendor user can only see their own vendor profile
            return qs.filter(user=user).order_by('id')
        return qs.all().order_by('id')
