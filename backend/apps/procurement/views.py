from rest_framework import viewsets, status
from rest_framework.permissions import IsAuthenticated
from .models import PurchaseOrder, GoodsReceipt, Contract
from .serializers import PurchaseOrderSerializer, GoodsReceiptSerializer, ContractSerializer
from apps.notification_management.models import Notification


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vendor', 'purchase_request']

    def get_queryset(self):
        user = self.request.user
        qs = PurchaseOrder.objects.select_related(
            'vendor',
            'vendor__category',
            'vendor__user',
            'purchase_request',
            'purchase_request__created_by',
            'purchase_request__department',
            'purchase_request__assigned_team_lead',
            'purchase_request__assigned_manager'
        ).prefetch_related(
            'goods_receipts',
            'purchase_request__approval_steps__actor',
            'purchase_request__approval_steps__reason',
            'purchase_request__approval_history__performed_by'
        ).order_by('-created_at')

        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(vendor=user.vendor_profile)
            return qs
        return qs

    def perform_create(self, serializer):
        po = serializer.save()
        # Advance PurchaseRequest stage to 6 (Product Order)
        pr = po.purchase_request
        pr.current_stage = 6
        pr.save()

        # Notify team lead
        Notification.objects.create(
            user=pr.created_by,
            purchase_request=pr,
            title=f"Purchase Order {po.po_id} Issued",
            message=f"PO has been issued to vendor {po.vendor.name} for request {pr.request_id}."
        )


class GoodsReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = GoodsReceiptSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'purchase_order']

    def get_queryset(self):
        user = self.request.user
        qs = GoodsReceipt.objects.select_related(
            'received_by',
            'purchase_order',
            'purchase_order__vendor',
            'purchase_order__vendor__category',
            'purchase_order__purchase_request',
            'purchase_order__purchase_request__created_by',
            'purchase_order__purchase_request__department'
        ).order_by('-created_at')
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(purchase_order__vendor=user.vendor_profile)
            return qs
        return qs

    def perform_create(self, serializer):
        receipt = serializer.save(received_by=self.request.user)
        # Advance PurchaseRequest stage to 7 (Delivery)
        pr = receipt.purchase_order.purchase_request
        pr.current_stage = 7
        pr.save()

        # Notify team lead
        Notification.objects.create(
            user=pr.created_by,
            purchase_request=pr,
            title=f"Goods Receipt {receipt.receipt_id} Verified",
            message=f"Delivery received and verified for PO {receipt.purchase_order.po_id}."
        )


class ContractViewSet(viewsets.ModelViewSet):
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'vendor']

    def get_queryset(self):
        user = self.request.user
        if user.role == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return Contract.objects.filter(vendor=user.vendor_profile).order_by('-created_at')
            return Contract.objects.all()
        return Contract.objects.all().order_by('-created_at')
