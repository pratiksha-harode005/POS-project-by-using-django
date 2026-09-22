from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import VendorCategory, Vendor
from .serializers import VendorCategorySerializer, VendorSerializer


class VendorCategoryViewSet(viewsets.ModelViewSet):
    queryset = VendorCategory.objects.all()
    serializer_class = VendorCategorySerializer
    permission_classes = [IsAuthenticated]


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['category', 'risk_rating', 'status']
    search_fields = ['unique_vendor_id', 'name', 'contact_person', 'email']

    def get_queryset(self):
        user = self.request.user
        qs = Vendor.objects.select_related('category', 'user').order_by('-created_at')
        if user.role == 'VENDOR':
            # Vendor user can only see their own vendor profile
            return qs.filter(user=user)
        return qs
