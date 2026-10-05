import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Prefetch
from .models import RFQ, Quotation
from .serializers import RFQSerializer, QuotationSerializer
from apps.request_management.models import PurchaseRequest
from apps.vendor_management.models import Vendor
from apps.core.utils import resolve_vendor_helper


class RFQViewSet(viewsets.ModelViewSet):
    serializer_class = RFQSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status', 'purchase_request']
    search_fields = ['rfq_id', 'title']

    def get_queryset(self):
        user = self.request.user
        
        from apps.procurement.models import PurchaseOrder
        # Optimize queries with clean, focused select_related and prefetch_related
        qs = RFQ.objects.select_related(
            'purchase_request',
            'purchase_request__created_by',
            'purchase_request__created_by__department',
            'purchase_request__department',
            'purchase_request__assigned_team_lead',
            'purchase_request__assigned_manager'
        ).prefetch_related(
            Prefetch(
                'invited_vendors',
                queryset=Vendor.objects.select_related('category')
            ),
            Prefetch(
                'purchase_request__purchase_orders',
                queryset=PurchaseOrder.objects.prefetch_related('invoices', 'goods_receipts')
            ),
            Prefetch(
                'quotations',
                queryset=Quotation.objects.select_related(
                    'vendor',
                    'vendor__category'
                )
            ),
            'purchase_request__approval_steps__actor',
            'purchase_request__approval_steps__reason',
            'purchase_request__approval_history__performed_by'
        ).all()

        query_params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))
        vendor_param = query_params.get('vendor') or query_params.get('vendor_id') or query_params.get('vendorId') if query_params else None
        if vendor_param:
            v_val = str(vendor_param).strip()
            v_obj = resolve_vendor_helper(v_val)
            if v_obj:
                filter_q = Q(invited_vendors=v_obj)
                if v_obj.category:
                    filter_q |= Q(purchase_request__category__iexact=v_obj.category.name)
            else:
                filter_q = (
                    Q(invited_vendors__unique_vendor_id__iexact=v_val) |
                    Q(invited_vendors__name__iexact=v_val) |
                    Q(purchase_request__category__icontains=v_val)
                )
            qs = qs.filter(filter_q)
        
        if not vendor_param and getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                v_profile = user.vendor_profile
                v_cat_q = Q(invited_vendors=v_profile)
                if v_profile.category:
                    v_cat_q |= Q(purchase_request__category__iexact=v_profile.category.name)
                return qs.filter(v_cat_q).distinct().order_by('-created_at')

        is_finance_request = (
            (getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'FINANCE') or
            query_params.get('for_finance') == 'true' or
            query_params.get('role') == 'FINANCE'
        )
        if is_finance_request:
            finance_q = (
                Q(purchase_request__flow_type='B') |
                Q(purchase_request__created_by__role='FINANCE') |
                Q(purchase_request__status__in=[
                    PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                    PurchaseRequest.STATUS_MANAGER_RECOMMENDED_TO_FINANCE,
                    PurchaseRequest.STATUS_FINANCE_REVIEW,
                    PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                    PurchaseRequest.STATUS_FINANCE_APPROVED,
                    PurchaseRequest.STATUS_FINANCE_REJECTED,
                    PurchaseRequest.STATUS_FINANCE_REPORT,
                    PurchaseRequest.STATUS_FINANCE_RESEARCH,
                    PurchaseRequest.STATUS_COST_ESTIMATION,
                    PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                    PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN,
                ]) |
                Q(purchase_request__status__icontains='FINANCE') |
                Q(purchase_request__approval_steps__decision='RECOMMEND') |
                Q(purchase_request__approval_steps__role='FINANCE')
            )
            qs = qs.filter(finance_q)

        return qs.distinct().order_by('-created_at')

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg)
        qs = self.filter_queryset(self.get_queryset())
        if str(lookup_val).isdigit():
            obj = qs.filter(
                Q(id=int(lookup_val)) |
                Q(rfq_id__iexact=str(lookup_val)) |
                Q(rfq_id__iexact=f"RFQ-{lookup_val}") |
                Q(rfq_id__icontains=str(lookup_val))
            ).first()
        else:
            obj = qs.filter(
                Q(rfq_id__iexact=str(lookup_val)) |
                Q(rfq_id__iexact=f"RFQ-{lookup_val}") |
                Q(rfq_id__icontains=str(lookup_val).replace('RFQ-', ''))
            ).first()
        if not obj:
            from django.http import Http404
            raise Http404(f"No RFQ matches query '{lookup_val}'.")
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        
        # Handle string purchase_request resolving
        pr_obj = None
        if 'purchase_request' in data and data['purchase_request']:
            pr_val = data['purchase_request']
            if isinstance(pr_val, str) and not pr_val.isdigit():
                try:
                    pr_obj = PurchaseRequest.objects.get(request_id=pr_val)
                    data['purchase_request'] = pr_obj.id
                except PurchaseRequest.DoesNotExist:
                    data['purchase_request'] = None
            elif isinstance(pr_val, int) or (isinstance(pr_val, str) and pr_val.isdigit()):
                try:
                    pr_obj = PurchaseRequest.objects.get(id=int(pr_val))
                except PurchaseRequest.DoesNotExist:
                    pr_obj = None
        
        # Force status to 'Open' so vendors can see the RFQ immediately
        if 'status' not in data or data.get('status') in ('New', '', None):
            data['status'] = 'Open'

        if not data.get('deadline') or str(data.get('deadline')).strip() == '':
            import datetime
            data['deadline'] = (datetime.date.today() + datetime.timedelta(days=7)).isoformat()
                    
        # Map invited vendor names/IDs
        vendor_ids = []
        if 'invited_vendors' in data and data['invited_vendors']:
            raw_vendors = data['invited_vendors']
            if isinstance(raw_vendors, list):
                for item in raw_vendors:
                    if isinstance(item, dict):
                        item = item.get('id') or item.get('unique_vendor_id') or item.get('name')
                    v_res = resolve_vendor_helper(item)
                    if v_res:
                        vendor_ids.append(v_res.id)
                    elif isinstance(item, int) or (isinstance(item, str) and str(item).isdigit()):
                        vendor_ids.append(int(item))

        # Auto-invite vendors matching category ONLY IF no specific vendors were provided or if ALL was requested
        if 'ALL' in [str(x).upper() for x in (data.get('invited_vendors') or [])] or not vendor_ids:
            cat_name = None
            if pr_obj and pr_obj.category:
                cat_name = pr_obj.category.strip()
            elif 'category' in data and data['category']:
                cat_name = str(data['category']).strip()

            matched_vendors = Vendor.objects.none()
            if cat_name and cat_name.upper() not in ('ALL', 'ALL CATEGORIES', 'ALL_VENDORS'):
                c_lower = cat_name.lower()
                q_filter = Q(category__name__iexact=cat_name) | Q(category__name__icontains=cat_name)
                if any(w in c_lower for w in ['hardware', 'laptop', 'compute', 'server', 'pc']):
                    q_filter |= Q(category__name__icontains='Hardware')
                elif any(w in c_lower for w in ['cloud', 'hosting', 'infra', 'serverless']):
                    q_filter |= Q(category__name__icontains='Cloud')
                elif any(w in c_lower for w in ['software', 'saas', 'license', 'app', 'tool']):
                    q_filter |= Q(category__name__icontains='Software')
                elif any(w in c_lower for w in ['security', 'cyber', 'antivirus', 'firewall']):
                    q_filter |= Q(category__name__icontains='Security')
                elif any(w in c_lower for w in ['service', 'consulting', 'integration']):
                    q_filter |= Q(category__name__icontains='Service')
                elif any(w in c_lower for w in ['office', 'furniture', 'accessory', 'chair', 'desk']):
                    q_filter |= Q(category__name__icontains='Office')

                matched_vendors = Vendor.objects.filter(q_filter, status='Active')

            if not matched_vendors.exists():
                # If no specific category matched or "ALL" requested, invite all active vendors
                matched_vendors = Vendor.objects.filter(status='Active')

            for v in matched_vendors:
                vendor_ids.append(v.id)

        data['invited_vendors'] = list(set(vendor_ids))

        # Resolve and persist category on the RFQ itself (so vendor matching works for standalone RFQs)
        effective_category = None
        if pr_obj and pr_obj.category:
            effective_category = pr_obj.category
        elif 'category' in data and data['category']:
            effective_category = str(data['category']).strip()
        if effective_category:
            data['category'] = effective_category

        # If an RFQ already exists for this purchase_request, update and reuse it instead of creating a duplicate
        if pr_obj:
            existing_rfq = RFQ.objects.filter(purchase_request=pr_obj).order_by('-created_at').first()
            if existing_rfq:
                if 'title' in data and data['title']:
                    existing_rfq.title = data['title']
                if 'deadline' in data and data['deadline']:
                    existing_rfq.deadline = data['deadline']
                if 'terms' in data and data['terms']:
                    existing_rfq.terms = data['terms']
                if 'status' in data and data['status']:
                    existing_rfq.status = data['status']
                if effective_category and not existing_rfq.category:
                    existing_rfq.category = effective_category
                existing_rfq.save()
                if vendor_ids:
                    existing_rfq.invited_vendors.add(*vendor_ids)

                try:
                    if pr_obj.current_stage < 4:
                        pr_obj.current_stage = 4
                    if pr_obj.status in ['Pending', 'Recommended', 'Draft', 'Approved']:
                        pr_obj.status = 'In Procurement'
                    pr_obj.save(update_fields=['current_stage', 'status', 'updated_at'])
                except Exception as e:
                    print("Could not update PR stage on RFQ update:", e)

                serializer = self.get_serializer(existing_rfq)
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        rfq = serializer.save()
        try:
            if rfq.purchase_request:
                pr = rfq.purchase_request
                if pr.current_stage < 4:
                    pr.current_stage = 4
                if pr.status in ['Pending', 'Recommended', 'Draft', 'Approved']:
                    pr.status = 'In Procurement'
                pr.save(update_fields=['current_stage', 'status', 'updated_at'])
        except Exception as e:
            print("Could not update PR stage on RFQ creation:", e)

        from apps.notification_management.services import notify_stage_event, notify_vendor
        # 1. Notify invited vendors
        for v in rfq.invited_vendors.all():
            notify_vendor(
                vendor=v,
                title=f"New RFQ {rfq.rfq_id} Invitation",
                message=f"You have been invited to submit a quotation for '{rfq.title}' (Request: {rfq.purchase_request.request_id if rfq.purchase_request else ''}).",
                purchase_request=rfq.purchase_request
            )
        # 2. Notify Request Creator (Originating Portal), Manager, and Admin
        if rfq.purchase_request:
            notify_stage_event(
                'RFQ_PUBLISHED',
                purchase_request=rfq.purchase_request,
                actor=self.request.user if getattr(self.request.user, 'is_authenticated', False) else None,
                details={'rfq_id': rfq.rfq_id, 'vendor_count': rfq.invited_vendors.count()}
            )

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def decline(self, request, pk=None):
        rfq = self.get_object()
        vendor_id = request.data.get('vendor_id') or request.data.get('vendor')
        reason = request.data.get('reason', 'Not specified')

        from apps.vendor_management.models import Vendor
        vendor_obj = None
        if vendor_id:
            vendor_obj = Vendor.objects.filter(Q(unique_vendor_id=vendor_id) | Q(id=int(vendor_id) if str(vendor_id).isdigit() else -1)).first()

        v_name = vendor_obj.name if vendor_obj else (str(vendor_id) if vendor_id else 'Vendor')

        from apps.notification_management.services import create_notification, notify_roles
        # Notify Managers
        notify_roles(
            roles=['MANAGER'],
            title=f"RFQ {rfq.rfq_id} Declined by {v_name}",
            message=f"Vendor {v_name} declined participation for RFQ {rfq.rfq_id}. Reason: {reason}.",
            purchase_request=rfq.purchase_request
        )
        if rfq.purchase_request and rfq.purchase_request.created_by:
            create_notification(
                user=rfq.purchase_request.created_by,
                title=f"RFQ {rfq.rfq_id} Declined by {v_name}",
                message=f"Vendor {v_name} declined RFQ {rfq.rfq_id}. Reason: {reason}.",
                purchase_request=rfq.purchase_request
            )
        return Response({'status': 'RFQ declined successfully.'})


def ensure_purchase_order_for_selected_quotation(quotation):
    if not quotation or not quotation.vendor:
        return None
    
    rfq = quotation.rfq
    pr = rfq.purchase_request if rfq else None
    if not pr:
        return None

    from apps.procurement.models import PurchaseOrder, GoodsReceipt
    
    total_amt = quotation.total_amount or quotation.price or pr.total_estimated_cost or 0
    po = PurchaseOrder.objects.filter(purchase_request=pr).first()
    if po:
        po.vendor = quotation.vendor
        po.quotation = quotation
        po.total_amount = total_amt
        if po.status in ('Draft', 'Issued', ''):
            po.status = 'Issued'
        po.save()
    else:
        po = PurchaseOrder.objects.create(
            purchase_request=pr,
            vendor=quotation.vendor,
            quotation=quotation,
            total_amount=total_amt,
            status='Issued'
        )

    if po and not po.goods_receipts.exists():
        receiver = pr.created_by
        if not receiver:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            receiver = User.objects.filter(role__in=['TEAM_LEAD', 'MANAGER', 'ADMIN']).first() or User.objects.first()
        if receiver:
            GoodsReceipt.objects.create(
                purchase_order=po,
                received_by=receiver,
                delivery_date=quotation.valid_until,
                product_name=pr.title or 'Procurement Items',
                ordered_quantity=pr.quantity or 1,
                received_quantity=pr.quantity or 1,
                status='Pending Verification'
            )
    return po


class QuotationViewSet(viewsets.ModelViewSet):
    serializer_class = QuotationSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['status']

    def get_queryset(self):
        user = self.request.user
        
        from apps.procurement.models import PurchaseOrder
        # Optimize queries with select_related and prefetch_related
        qs = Quotation.objects.select_related(
            'vendor',
            'vendor__category',
            'vendor__user',
            'vendor__user__department',
            'rfq',
            'rfq__purchase_request',
            'rfq__purchase_request__department',
            'rfq__purchase_request__created_by'
        ).prefetch_related(
            Prefetch(
                'rfq__purchase_request__purchase_orders',
                queryset=PurchaseOrder.objects.prefetch_related('invoices', 'goods_receipts')
            )
        ).all()

        query_params = getattr(self.request, 'query_params', getattr(self.request, 'GET', {}))
        vendor_param = query_params.get('vendor') or query_params.get('vendor_id') or query_params.get('vendorId') if query_params else None
        if vendor_param:
            v_val = str(vendor_param).strip()
            v_obj = resolve_vendor_helper(v_val)
            if v_obj:
                qs = qs.filter(vendor=v_obj)
            else:
                qs = qs.filter(
                    Q(vendor__unique_vendor_id__iexact=v_val) |
                    Q(vendor__name__iexact=v_val)
                )

        rfq_param = query_params.get('rfq') if query_params else None
        if rfq_param:
            r_val = str(rfq_param).strip()
            if r_val.isdigit():
                qs = qs.filter(Q(rfq__id=int(r_val)) | Q(rfq__rfq_id=r_val))
            else:
                qs = qs.filter(
                    Q(rfq__rfq_id__iexact=r_val) |
                    Q(rfq__rfq_id__icontains=r_val.replace('RFQ-', '')) |
                    Q(rfq__purchase_request__request_id__iexact=r_val)
                )

        if not vendor_param and getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'VENDOR':
            # Vendor only sees their own quotations
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(vendor=user.vendor_profile).order_by('-created_at')
            return qs.order_by('-created_at')

        is_finance_request = (
            (getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'FINANCE') or
            query_params.get('for_finance') == 'true' or
            query_params.get('role') == 'FINANCE'
        )
        if is_finance_request:
            finance_q = (
                Q(rfq__purchase_request__flow_type='B') |
                Q(rfq__purchase_request__created_by__role='FINANCE') |
                Q(rfq__purchase_request__status__in=[
                    PurchaseRequest.STATUS_RECOMMENDED_TO_FINANCE,
                    PurchaseRequest.STATUS_MANAGER_RECOMMENDED_TO_FINANCE,
                    PurchaseRequest.STATUS_FINANCE_REVIEW,
                    PurchaseRequest.STATUS_FINANCE_RECOMMENDED,
                    PurchaseRequest.STATUS_FINANCE_APPROVED,
                    PurchaseRequest.STATUS_FINANCE_REJECTED,
                    PurchaseRequest.STATUS_FINANCE_REPORT,
                    PurchaseRequest.STATUS_FINANCE_RESEARCH,
                    PurchaseRequest.STATUS_COST_ESTIMATION,
                    PurchaseRequest.STATUS_RECOMMENDED_TO_ADMIN,
                    PurchaseRequest.STATUS_FINANCE_RECOMMENDED_TO_ADMIN,
                ]) |
                Q(rfq__purchase_request__status__icontains='FINANCE') |
                Q(rfq__purchase_request__approval_steps__decision='RECOMMEND') |
                Q(rfq__purchase_request__approval_steps__role='FINANCE')
            )
            qs = qs.filter(finance_q)

        return qs.order_by('-created_at')

    def get_object(self):
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        lookup_val = self.kwargs.get(lookup_url_kwarg)
        qs = self.filter_queryset(self.get_queryset())
        if str(lookup_val).isdigit():
            obj = qs.filter(Q(id=int(lookup_val)) | Q(quotation_id=str(lookup_val))).first()
        else:
            obj = qs.filter(
                Q(quotation_id__iexact=str(lookup_val)) |
                Q(quotation_id__iexact=f"QUO-{lookup_val}") |
                Q(quotation_id__icontains=str(lookup_val).replace('QUO-', ''))
            ).first()
        if not obj:
            from django.http import Http404
            raise Http404(f"No Quotation matches query '{lookup_val}'.")
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Resolve RFQ strictly from string RFQ-ID, request_id, or integer PK
        rfq_obj = None
        if 'rfq' in data and data['rfq']:
            rfq_val = str(data['rfq']).strip()
            if rfq_val.isdigit():
                rfq_obj = RFQ.objects.filter(id=int(rfq_val)).first()
            if not rfq_obj:
                prefixed = rfq_val if rfq_val.startswith('RFQ-') else f"RFQ-{rfq_val}"
                unprefixed = rfq_val.replace('RFQ-', '').strip()
                rfq_obj = RFQ.objects.filter(
                    Q(rfq_id__iexact=rfq_val) |
                    Q(rfq_id__iexact=prefixed) |
                    Q(purchase_request__request_id__iexact=rfq_val) |
                    Q(purchase_request__request_id__iexact=f"REQ-{unprefixed}") |
                    Q(rfq_id__icontains=unprefixed) |
                    Q(title__icontains=rfq_val)
                ).first()

        if not rfq_obj:
            return Response(
                {'error': f"Invalid or missing RFQ reference: '{data.get('rfq')}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        data['rfq'] = rfq_obj.id

        # Resolve Vendor strictly from payload (vendor name/ID) or authenticated user profile
        vendor_obj = None
        user = request.user
        if 'vendor' in data and data['vendor']:
            vendor_obj = resolve_vendor_helper(data['vendor'])

        if not vendor_obj and user.is_authenticated and getattr(user, 'role', '') == 'VENDOR' and hasattr(user, 'vendor_profile') and user.vendor_profile:
            vendor_obj = user.vendor_profile

        if not vendor_obj:
            return Response(
                {'error': f"Invalid or missing Vendor reference: '{data.get('vendor')}'"},
                status=status.HTTP_400_BAD_REQUEST
            )
        data['vendor'] = vendor_obj.id

        # Normalize field aliases in incoming payload
        if 'gst_rate' not in data:
            if 'gstPercent' in data:
                data['gst_rate'] = data['gstPercent']
            elif 'gst_percent' in data:
                data['gst_rate'] = data['gst_percent']
        if 'valid_until' not in data:
            if 'expiryDate' in data:
                data['valid_until'] = data['expiryDate']
            elif 'quoteValidUntil' in data:
                data['valid_until'] = data['quoteValidUntil']
        if 'tax_amount' not in data and 'taxAmount' in data:
            data['tax_amount'] = data['taxAmount']
        if 'total_amount' not in data and 'totalAmount' in data:
            data['total_amount'] = data['totalAmount']

        # --- UPDATE OR CREATE QUOTATION FOR RFQ & VENDOR ---------------
        existing_quotation = Quotation.objects.filter(rfq=rfq_obj, vendor=vendor_obj).first()
        if existing_quotation:
            for field in ['price', 'gst_rate', 'tax_amount', 'total_amount', 'delivery_days', 'warranty_months', 'valid_until', 'terms_conditions', 'extra_fields']:
                if field in data and data[field] is not None:
                    setattr(existing_quotation, field, data[field])
            existing_quotation.status = data.get('status', 'Submitted')
            existing_quotation.save()
            try:
                if existing_quotation.rfq and existing_quotation.rfq.purchase_request:
                    pr = existing_quotation.rfq.purchase_request
                    if existing_quotation.status == 'Selected':
                        if pr.current_stage < 6:
                            pr.current_stage = 6
                        pr.status = 'In Procurement'
                        pr.preferred_vendor = existing_quotation.vendor.name
                        pr.save()
                        ensure_purchase_order_for_selected_quotation(existing_quotation)
                    elif pr.current_stage < 5:
                        pr.current_stage = 5
                        pr.save()
            except Exception:
                pass
            return Response(QuotationSerializer(existing_quotation).data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        quotation = serializer.save()

        # Update purchase request stage to 5 (Vendor Quotes Received)
        try:
            if quotation.rfq and quotation.rfq.purchase_request:
                pr = quotation.rfq.purchase_request
                if quotation.status == 'Selected':
                    if pr.current_stage < 6:
                        pr.current_stage = 6
                    pr.status = 'In Procurement'
                    pr.preferred_vendor = quotation.vendor.name
                    pr.save()
                    ensure_purchase_order_for_selected_quotation(quotation)
                elif pr.current_stage < 5:
                    pr.current_stage = 5
                    pr.save()
        except Exception as e:
            print("Could not update PR stage on quotation creation:", e)

        from apps.notification_management.services import notify_stage_event, notify_vendor
        # 1. Notify Vendor
        notify_vendor(
            vendor=quotation.vendor,
            title=f"Quotation {quotation.quotation_id} Submitted",
            message=f"Your quotation of Rs.{quotation.price} for RFQ {quotation.rfq.rfq_id if quotation.rfq else ''} was submitted successfully.",
            purchase_request=quotation.rfq.purchase_request if quotation.rfq else None
        )
        # 2. Notify Request Creator (Originating Portal), Manager, and Admin
        if quotation.rfq and quotation.rfq.purchase_request:
            notify_stage_event(
                'QUOTATION_SUBMITTED',
                purchase_request=quotation.rfq.purchase_request,
                details={
                    'quotation_id': quotation.quotation_id,
                    'vendor_name': quotation.vendor.name if quotation.vendor else 'Vendor',
                    'price': float(quotation.price or 0),
                    'rfq_id': quotation.rfq.rfq_id if quotation.rfq else ''
                }
            )

    def perform_update(self, serializer):
        quotation = serializer.save()
        # Enforce rule: Only ONE quotation can be Selected per RFQ
        if quotation.status == 'Selected':
            Quotation.objects.filter(rfq=quotation.rfq).exclude(id=quotation.id).filter(status='Selected').update(status='Under Evaluation')
            try:
                rfq = quotation.rfq
                if rfq:
                    rfq.status = 'Closed'
                    rfq.save()
                if quotation.rfq and quotation.rfq.purchase_request:
                    pr = quotation.rfq.purchase_request
                    if pr.current_stage < 6:
                        pr.current_stage = 6
                    pr.status = 'In Procurement'
                    if quotation.vendor:
                        pr.preferred_vendor = quotation.vendor.name
                    pr.save()
                    ensure_purchase_order_for_selected_quotation(quotation)
            except Exception as e:
                print("Could not update PR stage on quotation selection update:", e)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def select_quotation(self, request, pk=None):
        quotation = self.get_object()
        rfq = quotation.rfq

        # Enforce rule: Only ONE quotation can be Selected per RFQ; all others become Under Evaluation
        Quotation.objects.filter(rfq=rfq).exclude(id=quotation.id).update(status='Under Evaluation')
        quotation.status = 'Selected'
        quotation.save()

        # Update RFQ status to Closed
        if rfq:
            rfq.status = 'Closed'
            rfq.save()

        # Advance PurchaseRequest stage to 6 (Assigned to Vendor) and set preferred vendor
        po_obj = None
        try:
            if rfq and rfq.purchase_request:
                pr = rfq.purchase_request
                if pr.current_stage < 6:
                    pr.current_stage = 6
                pr.status = 'In Procurement'
                if quotation.vendor:
                    pr.preferred_vendor = quotation.vendor.name
                pr.save()
                po_obj = ensure_purchase_order_for_selected_quotation(quotation)
        except Exception as e:
            print("Could not update PR stage on quotation selection:", e)

        from apps.notification_management.services import create_notification, notify_vendor
        # Notify selected vendor
        notify_vendor(
            vendor=quotation.vendor,
            title=f"Quotation {quotation.quotation_id} Selected!",
            message=f"Your quotation for RFQ {rfq.rfq_id if rfq else ''} has been accepted. Purchase Order is being generated.",
            purchase_request=rfq.purchase_request if rfq else None
        )
        # Notify other bidding vendors
        if rfq:
            other_quotes = Quotation.objects.filter(rfq=rfq).exclude(id=quotation.id).select_related('vendor', 'vendor__user')
            for oq in other_quotes:
                if oq.vendor and oq.vendor_id != quotation.vendor_id:
                    notify_vendor(
                        vendor=oq.vendor,
                        title=f"RFQ {rfq.rfq_id} Evaluation Update",
                        message=f"Evaluation completed for RFQ {rfq.rfq_id}. Another proposal was selected.",
                        purchase_request=rfq.purchase_request if rfq else None
                    )
            # Notify requester (Originating Portal), Manager, Finance, and Admin
            if rfq.purchase_request:
                from apps.notification_management.services import notify_stage_event
                notify_stage_event(
                    'PO_ISSUED',
                    purchase_request=rfq.purchase_request,
                    actor=request.user if getattr(request.user, 'is_authenticated', False) else None,
                    details={
                        'po_id': po_obj.po_id if po_obj else 'PO-AUTO',
                        'vendor_name': quotation.vendor.name if quotation.vendor else 'Vendor',
                        'amount': float(po_obj.total_amount if po_obj else (quotation.price or 0))
                    }
                )

        from apps.procurement.serializers import PurchaseOrderSerializer
        return Response({
            'status': 'Quotation selected successfully.',
            'quotation': QuotationSerializer(quotation).data,
            'purchase_order': PurchaseOrderSerializer(po_obj).data if po_obj else None
        })
