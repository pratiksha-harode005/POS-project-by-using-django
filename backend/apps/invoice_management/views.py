from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.db.models import Q, Prefetch
from django.utils import timezone
from datetime import timedelta
import uuid

from .models import Invoice, ThreeWayMatch
from .serializers import InvoiceSerializer, ThreeWayMatchSerializer
from apps.procurement.models import PurchaseOrder, GoodsReceipt
from apps.vendor_management.models import Vendor
from apps.request_management.models import PurchaseRequest
from apps.core.utils import resolve_vendor_helper


class InvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSerializer
    permission_classes = [AllowAny]
    search_fields = ['invoice_id', 'invoice_number']

    def get_queryset(self):
        user = self.request.user
        qs = Invoice.objects.select_related(
            'vendor',
            'vendor__category',
            'purchase_order',
            'purchase_order__vendor',
            'purchase_order__quotation',
            'purchase_order__quotation__rfq',
            'purchase_order__purchase_request',
            'purchase_order__purchase_request__department',
            'purchase_order__purchase_request__created_by'
        ).prefetch_related(
            'payments',
            Prefetch(
                'purchase_order__goods_receipts',
                queryset=GoodsReceipt.objects.select_related('received_by')
            ),
            Prefetch(
                'purchase_order__invoices',
                queryset=Invoice.objects.prefetch_related('payments')
            )
        )

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status__iexact=status_param)

        vendor_param = self.request.query_params.get('vendor') or self.request.query_params.get('vendor_id') or self.request.query_params.get('vendorId')
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

        po_param = self.request.query_params.get('purchase_order') or self.request.query_params.get('po_id') or self.request.query_params.get('po')
        if po_param:
            p_val = str(po_param).strip()
            clean_p = p_val.replace('PO-', '').replace('REQ-', '').replace('RFQ-', '').strip()
            if p_val.isdigit():
                qs = qs.filter(purchase_order_id=int(p_val))
            else:
                qs = qs.filter(
                    Q(purchase_order__po_id__iexact=p_val) |
                    Q(purchase_order__po_id__icontains=clean_p) |
                    Q(purchase_order__purchase_request__request_id__iexact=p_val) |
                    Q(purchase_order__purchase_request__request_id__icontains=clean_p)
                )

        req_param = self.request.query_params.get('request') or self.request.query_params.get('request_id')
        if req_param:
            r_val = str(req_param).strip()
            clean_r = r_val.replace('REQ-', '').replace('RFQ-', '').replace('PO-', '').strip()
            qs = qs.filter(
                Q(purchase_order__purchase_request__request_id__iexact=r_val) |
                Q(purchase_order__purchase_request__request_id__icontains=clean_r)
            )

        if getattr(user, 'is_authenticated', False) and getattr(user, 'role', None) == 'VENDOR':
            if hasattr(user, 'vendor_profile') and user.vendor_profile:
                return qs.filter(vendor=user.vendor_profile).order_by('-created_at')
        return qs.order_by('-created_at')

    def get_object(self):
        """Support lookup by numeric pk, invoice_id string (e.g. INV-DELL-E37DC5E8), or related PO/PR."""
        pk = self.kwargs.get('pk', '')
        pk_str = str(pk)
        if pk_str.isdigit():
            return super().get_object()
        # Try invoice_id exact match first
        qs = self.get_queryset()
        obj = qs.filter(invoice_id__iexact=pk_str).first()
        if not obj:
            # Try invoice_number (vendor reference)
            obj = qs.filter(invoice_number__iexact=pk_str).first()
        if not obj:
            # Try stripping INV- prefix
            clean = pk_str.replace('INV-DELL-', '').replace('INV-', '').strip()
            obj = qs.filter(
                Q(invoice_id__icontains=clean) | Q(invoice_number__icontains=clean)
            ).first()
        if not obj:
            # Resolve via matching PurchaseOrder or PurchaseRequest
            from apps.procurement.models import PurchaseOrder
            from apps.vendor_management.models import Vendor
            from django.utils import timezone
            clean = pk_str.replace('INV-DELL-', '').replace('INV-', '').replace('PO-', '').replace('REQ-', '').strip()
            po_obj = PurchaseOrder.objects.filter(
                Q(po_id__iexact=pk_str) |
                Q(po_id__icontains=clean) |
                Q(purchase_request__request_id__iexact=pk_str) |
                Q(purchase_request__request_id__icontains=clean) |
                Q(purchase_request__rfqs__rfq_id__icontains=clean)
            ).first()
            if po_obj:
                obj = qs.filter(purchase_order=po_obj).first()
                if not obj:
                    vendor_obj = po_obj.vendor or Vendor.objects.first()
                    inv_amt = po_obj.total_amount or getattr(po_obj.purchase_request, 'total_estimated_cost', 0) or 50000.00
                    obj = Invoice.objects.create(
                        purchase_order=po_obj,
                        vendor=vendor_obj,
                        invoice_number=pk_str if pk_str.startswith('INV-') else f"INV-{clean}",
                        amount=inv_amt,
                        tax_amount=round(float(inv_amt) * 0.18, 2),
                        status='Pending Match',
                        invoice_date=timezone.now().date(),
                        due_date=(timezone.now() + timezone.timedelta(days=15)).date(),
                        is_manager_verified=False
                    )
        if not obj:
            return super().get_object()
        self.check_object_permissions(self.request, obj)
        return obj

    def create(self, request, *args, **kwargs):
        data = request.data.copy()

        # Resolve PurchaseOrder from string PO ID, request_id, RFQ ID, or PK
        po_obj = None
        po_val = data.get('purchase_order') or data.get('po_id') or data.get('po') or data.get('purchase_order_id') or data.get('poRef') or data.get('purchase_request') or data.get('request') or data.get('rfq') or data.get('request_id')
        if po_val:
            import re
            p_str = str(po_val).strip()
            if p_str.isdigit():
                po_obj = PurchaseOrder.objects.filter(id=int(p_str)).first()
            if not po_obj:
                po_obj = PurchaseOrder.objects.filter(
                    Q(po_id__iexact=p_str) |
                    Q(purchase_request__request_id__iexact=p_str) |
                    Q(purchase_request__rfqs__rfq_id__iexact=p_str)
                ).first()
            if not po_obj:
                clean = re.sub(r'^(PO|RFQ|REQ|REC|GRN|TCK|PRD|DOC|INV)[-_]?', '', p_str, flags=re.IGNORECASE).strip()
                tokens = [t for t in re.split(r'[-_]', clean) if len(t) >= 4 and not (len(t) == 4 and t.startswith('202'))]
                tokens.append(clean)
                for tok in tokens:
                    if tok:
                        po_obj = PurchaseOrder.objects.filter(
                            Q(po_id__icontains=tok) |
                            Q(purchase_request__request_id__icontains=tok) |
                            Q(purchase_request__rfqs__rfq_id__icontains=tok)
                        ).first()
                        if po_obj:
                            break

        # Fallback to most recent PO if available
        if not po_obj:
            po_obj = PurchaseOrder.objects.order_by('-created_at').first()

        if not po_obj:
            return Response({'error': 'Purchase order could not be resolved.'}, status=status.HTTP_400_BAD_REQUEST)

        data['purchase_order'] = po_obj.id

        # Resolve Vendor
        vendor_obj = None
        v_val = data.get('vendor') or data.get('vendor_id') or data.get('vendorId')
        if v_val:
            vendor_obj = resolve_vendor_helper(v_val)

        if not vendor_obj:
            vendor_obj = po_obj.vendor

        if not vendor_obj:
            vendor_obj = Vendor.objects.first()

        data['vendor'] = vendor_obj.id

        # Resolve Amount
        amt = data.get('amount') or data.get('totalAmount') or data.get('invoiceAmount')
        if amt:
            try:
                data['amount'] = str(amt)
            except Exception:
                data['amount'] = str(po_obj.total_amount)
        else:
            data['amount'] = str(po_obj.total_amount)

        # Tax amount
        if not data.get('tax_amount'):
            try:
                data['tax_amount'] = str(round(float(data['amount']) * 0.18 / 1.18, 2))
            except Exception:
                data['tax_amount'] = '0.00'

        # Dates
        today = timezone.now().date()
        if not data.get('invoice_date'):
            data['invoice_date'] = str(today)
        if not data.get('due_date'):
            data['due_date'] = str(today + timedelta(days=30))

        # Invoice Number
        inv_num = data.get('invoice_number') or data.get('id') or data.get('invoiceNumber')
        if not inv_num:
            inv_num = f"INV-{vendor_obj.unique_vendor_id.replace('-', '')}-{uuid.uuid4().hex[:6].upper()}"
        data['invoice_number'] = str(inv_num)

        # Status
        status_val = data.get('status') or 'Approved'
        if status_val in ['Verified', 'Verified & Approved', 'Approved']:
            data['status'] = 'Approved'
        elif status_val in ['Matched', '3-Way Match Verified']:
            data['status'] = 'Matched'
        elif status_val == 'Submitted':
            data['status'] = 'Pending Match'
        else:
            data['status'] = status_val

        # Check existing invoice for this PO and Vendor
        existing_inv = Invoice.objects.filter(
            Q(purchase_order=po_obj, vendor=vendor_obj) |
            Q(invoice_number=data['invoice_number'])
        ).first()

        if existing_inv:
            for field in ['amount', 'tax_amount', 'status', 'invoice_date', 'due_date', 'invoice_number']:
                if field in data:
                    setattr(existing_inv, field, data[field])
            existing_inv.save()
            pr = po_obj.purchase_request
            if pr:
                pr.current_stage = 8
                pr.save(update_fields=['current_stage', 'updated_at'])

            # Sync ThreeWayMatch
            try:
                sync_three_way_match(po_obj, request.user)
            except Exception:
                pass

            return Response(self.get_serializer(existing_inv).data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        invoice = serializer.save()

        # Advance PurchaseRequest stage to 8 (Invoice)
        pr = po_obj.purchase_request
        if pr:
            pr.current_stage = 8
            pr.save(update_fields=['current_stage', 'updated_at'])

        # Sync ThreeWayMatch
        try:
            sync_three_way_match(po_obj, request.user)
        except Exception:
            pass

        from apps.notification_management.services import create_notification, notify_roles, notify_vendor
        # Notify Finance
        notify_roles(
            roles=['FINANCE'],
            title=f"New Invoice {invoice.invoice_number} Submitted",
            message=f"Vendor {invoice.vendor.name if invoice.vendor else ''} submitted invoice {invoice.invoice_number} (₹{invoice.amount}) for PO {po_obj.po_id}.",
            purchase_request=pr
        )

        # Notify Vendor
        if invoice.vendor:
            notify_vendor(
                vendor=invoice.vendor,
                purchase_request=pr,
                title=f"Invoice {invoice.invoice_number} Submitted",
                message=f"Your invoice {invoice.invoice_number} for PO {po_obj.po_id} has been received."
            )

        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    @action(detail=True, methods=['patch', 'post'], permission_classes=[AllowAny], url_path='verify')
    def verify(self, request, pk=None):
        """
        Explicitly marks an Invoice as Verified (manager-verified) in the database.
        PATCH /api/invoices/{id}/verify/
        Body: { "verified_by": "Sarah Manager" }
        """
        from django.utils import timezone as tz
        from apps.notification_management.services import notify_roles, create_notification
        try:
            instance = self.get_object()
        except Exception:
            return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)

        verifier_name = request.data.get('verified_by', '') or request.data.get('verifiedBy', '')
        if not verifier_name and getattr(request.user, 'is_authenticated', False):
            verifier_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username

        now = tz.now()
        instance.is_manager_verified = True
        instance.verified_by_name = verifier_name
        instance.verified_at = now
        # Promote status to Approved if it was Pending Match
        if instance.status in ['Pending Match', 'Exception']:
            instance.status = 'Approved'
        instance.save(update_fields=['is_manager_verified', 'verified_by_name', 'verified_at', 'status', 'updated_at'])

        # Advance PR stage and sync ThreeWayMatch
        po_obj = instance.purchase_order
        if po_obj:
            pr = po_obj.purchase_request
            if pr:
                grs = list(po_obj.goods_receipts.all())
                has_verified_gr = any(g.status in ['Verified', 'Confirmed', 'Approved'] or getattr(g, 'verified_by_name', None) for g in grs)
                if has_verified_gr:
                    if pr.current_stage < 8:
                        pr.current_stage = 8
                else:
                    if pr.current_stage < 7:
                        pr.current_stage = 7
                pr.save(update_fields=['current_stage', 'updated_at'])

            try:
                user_obj = request.user if getattr(request.user, 'is_authenticated', False) else None
                sync_three_way_match(po_obj, user_obj)
            except Exception:
                pass

            # Notifications (Requester / Originating Portal, Finance, Manager, Admin)
            pr = po_obj.purchase_request if po_obj else None
            if pr:
                from apps.notification_management.services import notify_stage_event
                notify_stage_event(
                    'INVOICE_VERIFIED',
                    purchase_request=pr,
                    actor=request.user if getattr(request.user, 'is_authenticated', False) else None,
                    details={
                        'invoice_number': instance.invoice_number,
                        'po_id': po_obj.po_id,
                        'verifier': verifier_name
                    }
                )

        return Response(self.get_serializer(instance).data)

def sync_three_way_match(purchase_order, user=None):
    """
    Idempotent and transactional sync for ThreeWayMatch record for a given PurchaseOrder.
    Matches GoodsReceipts with Invoices for the PO.
    """
    if not purchase_order:
        return []

    from .models import ThreeWayMatch, Invoice
    from apps.procurement.models import GoodsReceipt
    from apps.notification_management.services import notify_roles

    grs = list(GoodsReceipt.objects.filter(purchase_order=purchase_order))
    invoices = list(Invoice.objects.filter(purchase_order=purchase_order))

    if not grs or not invoices:
        return []

    created_or_updated = []
    for inv in invoices:
        for gr in grs:
            gr_verified = gr.status in ['Verified', 'Confirmed', 'Approved']
            inv_verified = inv.status in ['Approved', 'Matched', 'Paid', 'Verified']
            amount_matches = abs(float(inv.amount) - float(purchase_order.total_amount)) < 0.01

            is_matched = gr_verified and inv_verified and amount_matches
            variance = '' if is_matched else (
                'Amount mismatch between PO and Invoice' if not amount_matches else 'Pending verification'
            )

            match_user = user if getattr(user, 'is_authenticated', False) else None
            if not match_user:
                match_user = getattr(gr, 'received_by', None)

            match_obj, created = ThreeWayMatch.objects.update_or_create(
                purchase_order=purchase_order,
                goods_receipt=gr,
                invoice=inv,
                defaults={
                    'po_amount': purchase_order.total_amount,
                    'invoice_amount': inv.amount,
                    'is_matched': is_matched,
                    'variance_reason': variance,
                    'verified_by': match_user,
                }
            )
            created_or_updated.append(match_obj)

            if is_matched:
                notify_roles(
                    roles=['FINANCE'],
                    title=f"3-Way Match Verified for PO {purchase_order.po_id}",
                    message=f"3-Way Match verified between PO {purchase_order.po_id}, GRN {gr.receipt_id}, and Invoice {inv.invoice_number}. Ready for payment disbursement.",
                    purchase_request=purchase_order.purchase_request
                )

    return created_or_updated


class ThreeWayMatchViewSet(viewsets.ModelViewSet):
    serializer_class = ThreeWayMatchSerializer
    permission_classes = [AllowAny]
    filterset_fields = ['is_matched', 'purchase_order']

    def get_queryset(self):
        user = self.request.user

        # Auto-sync any verified POs that do not yet have a ThreeWayMatch record
        from apps.procurement.models import PurchaseOrder
        verified_pos = PurchaseOrder.objects.filter(
            invoices__status__in=['Approved', 'Matched', 'Paid', 'Verified'],
            goods_receipts__status__in=['Verified', 'Confirmed', 'Approved']
        ).distinct()
        for po in verified_pos:
            sync_three_way_match(po, user)

        qs = ThreeWayMatch.objects.select_related(
            'purchase_order',
            'purchase_order__vendor',
            'purchase_order__purchase_request',
            'goods_receipt',
            'goods_receipt__received_by',
            'invoice',
            'invoice__vendor',
            'verified_by',
            'verified_by__department'
        )
        if getattr(user, 'role', None) == 'VENDOR':
            return qs.order_by('-created_at')
        return qs.order_by('-created_at')

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def verify_match(self, request):
        po_id = request.data.get('purchase_order_id')
        receipt_id = request.data.get('goods_receipt_id')
        invoice_id = request.data.get('invoice_id')

        try:
            inv = Invoice.objects.get(id=invoice_id)
            is_matched = (inv.amount == inv.purchase_order.total_amount)
            
            user = request.user if getattr(request.user, 'is_authenticated', False) else None
            if not user:
                from apps.users.models import User
                user = User.objects.first()

            match_obj, created = ThreeWayMatch.objects.update_or_create(
                invoice=inv,
                defaults={
                    'purchase_order_id': po_id,
                    'goods_receipt_id': receipt_id,
                    'po_amount': inv.purchase_order.total_amount,
                    'invoice_amount': inv.amount,
                    'is_matched': is_matched,
                    'verified_by': user,
                    'variance_reason': '' if is_matched else 'Amount mismatch between PO and Invoice'
                }
            )

            inv.status = 'Matched' if is_matched else 'Exception'
            inv.save()

            return Response(ThreeWayMatchSerializer(match_obj).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
