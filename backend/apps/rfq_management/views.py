from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import RFQ, Quotation
from .serializers import RFQSerializer, QuotationSerializer
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor


class RFQViewSet(viewsets.ModelViewSet):
    serializer_class = RFQSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'purchase_request']
    search_fields = ['rfq_id', 'title']

    def get_queryset(self):
        user = self.request.user
        
        # Optimize queries with select_related and prefetch_related
        qs = RFQ.objects.select_related(
            'purchase_request',
            'purchase_request__created_by',
            'purchase_request__department'
        ).prefetch_related(
            'invited_vendors',
            'invited_vendors__category',
            'quotations',
            'quotations__vendor',
            'quotations__vendor__category',
            'purchase_request__approval_steps'
        ).all()
        
        if user.role == 'VENDOR':
            # Vendor only sees RFQs where their vendor profile is in invited_vendors
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(invited_vendors=user.vendor_profile).distinct().order_by('-created_at')
            return qs.order_by('-created_at')
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Handle string purchase_request resolving
        if 'purchase_request' in data and data['purchase_request']:
            pr_val = data['purchase_request']
            if isinstance(pr_val, str) and not pr_val.isdigit():
                try:
                    pr = PurchaseRequest.objects.get(request_id=pr_val)
                    data['purchase_request'] = pr.id
                except PurchaseRequest.DoesNotExist:
                    data['purchase_request'] = None
        
        # Force status to 'Open' so vendors can see the RFQ immediately
        if 'status' not in data or data.get('status') in ('New', '', None):
            data['status'] = 'Open'
                    
        # Map invited vendor names to PKs — always prefer canonical VND-* records
        vendor_ids = []
        if 'invited_vendors' in data:
            vendor_names = data.get('invited_vendors', [])
            if isinstance(vendor_names, str):
                vendor_names = [vendor_names]
            for vname in vendor_names:
                vname = str(vname).strip()
                if not vname:
                    continue
                v = Vendor.objects.filter(name__iexact=vname, unique_vendor_id__startswith='VND-').first()
                if not v:
                    v = Vendor.objects.filter(name__iexact=vname).first()
                if not v:
                    from apps.vendor_management.models import VendorCategory
                    default_cat = VendorCategory.objects.first()
                    safe_uid = f"V-AUTO-{vname.replace(' ', '')[:8].upper()}-{abs(hash(vname)) % 9999}"
                    v = Vendor.objects.create(
                        name=vname,
                        category=default_cat,
                        unique_vendor_id=safe_uid
                    )
                if v and v.id not in vendor_ids:
                    vendor_ids.append(v.id)

        # Ensure ALL active vendors in the category of the purchase request are invited
        if data.get('purchase_request'):
            try:
                pr_obj = PurchaseRequest.objects.get(id=data['purchase_request'])
                if pr_obj.category:
                    cat_name = pr_obj.category.strip()
                    cat_vendors = Vendor.objects.filter(
                        category__name__icontains=cat_name
                    ).values_list('id', flat=True)
                    for cv_id in cat_vendors:
                        if cv_id not in vendor_ids:
                            vendor_ids.append(cv_id)
            except PurchaseRequest.DoesNotExist:
                pass

        if hasattr(data, 'setlist'):
            data.setlist('invited_vendors', vendor_ids)
        else:
            data['invited_vendors'] = vendor_ids
                    
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        
        if 'purchase_request' in data and data['purchase_request']:
            try:
                pr = PurchaseRequest.objects.get(id=data['purchase_request'])
                pr.status = 'rfq_sent'
                if pr.current_stage < 4:
                    pr.current_stage = 4
                pr.save()
            except PurchaseRequest.DoesNotExist:
                pass
                
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)



class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [IsAuthenticated]
    filterset_fields = ['status', 'rfq', 'vendor']

    def get_queryset(self):
        user = self.request.user
        
        # Optimize queries with select_related
        qs = Quotation.objects.select_related(
            'vendor',
            'vendor__category'
        ).all()
        
        if user.role == 'VENDOR':
            # Vendor only sees their own quotations
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(vendor=user.vendor_profile).order_by('-created_at')
            return qs.order_by('-created_at')
        return qs.order_by('-created_at')

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Resolve RFQ from string RFQ-ID
        if 'rfq' in data:
            rfq_val = data['rfq']
            if isinstance(rfq_val, str) and not rfq_val.isdigit():
                try:
                    # Strip 'RFQ-' prefix if present and find
                    # Actually just lookup by rfq_id
                    rfq = RFQ.objects.get(rfq_id=rfq_val)
                    data['rfq'] = rfq.id
                except RFQ.DoesNotExist:
                    pass
                    
        # Resolve Vendor from name
        if 'vendor' in data:
            v_val = data['vendor']
            if isinstance(v_val, str) and not v_val.isdigit():
                try:
                    # Look up by name
                    vendor = Vendor.objects.get(name=v_val)
                    data['vendor'] = vendor.id
                except Vendor.DoesNotExist:
                    pass

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        user = self.request.user
        if user.role == 'VENDOR' and hasattr(user, 'vendor_profile') and user.vendor_profile:
            quotation = serializer.save(vendor=user.vendor_profile)
        else:
            quotation = serializer.save()

        # Update purchase request stage to 5 (Vendor Quotes Received)
        pr = quotation.rfq.purchase_request
        if pr.current_stage < 5:
            pr.current_stage = 5
            pr.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def select_quotation(self, request, pk=None):
        quotation = self.get_object()
        rfq = quotation.rfq

        # Reject all other quotations for this RFQ, select this one
        Quotation.objects.filter(rfq=rfq).exclude(id=quotation.id).update(status='Rejected')
        quotation.status = 'Selected'
        quotation.save()

        # Advance PurchaseRequest stage to 6 (Product Order)
        pr = rfq.purchase_request
        pr.current_stage = 6
        pr.status = 'In Procurement'
        pr.save()

        return Response({'status': 'Quotation selected successfully.', 'quotation': QuotationSerializer(quotation).data})
