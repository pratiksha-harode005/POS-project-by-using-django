from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import PurchaseOrder, GoodsReceipt, Contract
from .serializers import PurchaseOrderSerializer, GoodsReceiptSerializer, ContractSerializer


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vendor', 'purchase_request']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return PurchaseOrder.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return PurchaseOrder.objects.none()
        return PurchaseOrder.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        po = serializer.save()
        # Advance PurchaseRequest stage to 6 (Product Order)
        pr = po.purchase_request
        pr.current_stage = 6
        pr.save()


class GoodsReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = GoodsReceiptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'purchase_order']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return GoodsReceipt.objects.filter(purchase_order__vendor=user.vendor_profile).order_by('-created_at')
            return GoodsReceipt.objects.none()
        return GoodsReceipt.objects.all().order_by('-created_at')

    def perform_create(self, serializer):
        receipt = serializer.save(received_by=self.request.user)
        # Advance PurchaseRequest stage to 7 (Delivery)
        pr = receipt.purchase_order.purchase_request
        pr.current_stage = 7
        pr.save()


class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vendor']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return Contract.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return Contract.objects.none()
        return Contract.objects.all().order_by('-created_at')
