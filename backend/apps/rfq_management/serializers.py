from rest_framework import serializers
from .models import RFQ, Quotation
from apps.users.serializers import UserSerializer, DepartmentSerializer
from apps.vendor_management.serializers import VendorSerializer
from apps.request_management.models import PurchaseRequest


class PurchaseRequestSummarySerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    amount = serializers.DecimalField(source='total_estimated_cost', max_digits=12, decimal_places=2, read_only=True)
    estimated_cost = serializers.DecimalField(source='total_estimated_cost', max_digits=12, decimal_places=2, read_only=True)

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        cost = 0.0
        for val in [instance.total_estimated_cost, instance.requested_amount, instance.approved_amount, instance.existing_cost]:
            if val is not None:
                try:
                    fval = float(val)
                    if fval > 0:
                        cost = fval
                        break
                except (ValueError, TypeError):
                    pass
        if cost == 0.0 and instance.extra_fields and isinstance(instance.extra_fields, dict):
            for k in ['total_estimated_cost', 'requested_amount', 'existing_cost', 'amount', 'totalAmount', 'estimated_amount']:
                v = instance.extra_fields.get(k)
                try:
                    if v and float(v) > 0:
                        cost = float(v)
                        break
                except (ValueError, TypeError):
                    pass
        ret['total_estimated_cost'] = cost
        ret['amount'] = cost
        ret['estimated_cost'] = cost
        ret['estimatedCost'] = cost
        return ret

    class Meta:
        model = PurchaseRequest
        fields = [
            'id', 'request_id', 'title', 'category', 'subcategory', 'quantity', 'description',
            'required_by', 'delivery_location', 'total_estimated_cost', 'amount', 'estimated_cost',
            'status', 'current_stage', 'stage_display', 'preferred_vendor', 'created_by_detail',
            'department_detail', 'created_at', 'updated_at'
        ]


def compute_document_verification(purchase_request, quotation=None):
    if not purchase_request:
        return {
            'status': 'Verification Pending',
            'is_both_verified': False,
            'is_invoice_verified': False,
            'is_goods_receipt_verified': False,
            'po_id': None,
            'invoice_status': None,
            'goods_receipt_status': None,
            'invoice_count': 0,
            'goods_receipt_count': 0,
        }

    if quotation and hasattr(quotation, '_doc_verif_cache'):
        return quotation._doc_verif_cache

    if hasattr(purchase_request, '_rfq_doc_verif_cache'):
        res = purchase_request._rfq_doc_verif_cache
        if quotation:
            quotation._doc_verif_cache = res
        return res
    
    if hasattr(purchase_request, '_prefetched_objects_cache') and 'purchase_orders' in purchase_request._prefetched_objects_cache:
        pos = purchase_request._prefetched_objects_cache['purchase_orders']
    else:
        pos = list(purchase_request.purchase_orders.all()) if hasattr(purchase_request, 'purchase_orders') else []
    
    if not pos:
        res = {
            'status': 'Verification Pending',
            'is_both_verified': False,
            'is_invoice_verified': False,
            'is_goods_receipt_verified': False,
            'po_id': None,
            'invoice_status': None,
            'goods_receipt_status': None,
            'invoice_count': 0,
            'goods_receipt_count': 0,
        }
        purchase_request._rfq_doc_verif_cache = res
        if quotation:
            quotation._doc_verif_cache = res
        return res

    has_verified_invoice = False
    has_verified_gr = False
    latest_po_id = None
    latest_inv_status = None
    latest_gr_status = None
    total_inv_count = 0
    total_gr_count = 0

    for po in pos:
        latest_po_id = po.po_id
        if hasattr(po, '_prefetched_objects_cache') and 'invoices' in po._prefetched_objects_cache:
            invoices = po._prefetched_objects_cache['invoices']
        else:
            invoices = list(po.invoices.all()) if hasattr(po, 'invoices') else []
        total_inv_count += len(invoices)
        for inv in invoices:
            latest_inv_status = inv.status
            if inv.is_manager_verified or inv.status in ['Matched', 'Paid', 'Verified']:
                has_verified_invoice = True

        if hasattr(po, '_prefetched_objects_cache') and 'goods_receipts' in po._prefetched_objects_cache:
            receipts = po._prefetched_objects_cache['goods_receipts']
        else:
            receipts = list(po.goods_receipts.all()) if hasattr(po, 'goods_receipts') else []
        total_gr_count += len(receipts)
        for gr in receipts:
            latest_gr_status = gr.status
            if gr.status in ['Verified', 'Confirmed', 'Approved']:
                has_verified_gr = True

    is_delivered = any(po.status in ['Delivered', 'Fulfilled', 'Completed'] for po in pos) or has_verified_gr
    is_both = is_delivered and has_verified_invoice and has_verified_gr

    res = {
        'status': 'Documents Verified' if is_both else 'Verification Pending',
        'is_both_verified': is_both,
        'is_invoice_verified': has_verified_invoice,
        'is_goods_receipt_verified': has_verified_gr if is_delivered else False,
        'is_delivered': is_delivered,
        'po_id': latest_po_id,
        'invoice_status': latest_inv_status,
        'goods_receipt_status': latest_gr_status if is_delivered else 'Pending Delivery',
        'invoice_count': total_inv_count,
        'goods_receipt_count': total_gr_count,
    }
    purchase_request._rfq_doc_verif_cache = res
    if quotation:
        quotation._doc_verif_cache = res
    return res


class QuotationSerializer(serializers.ModelSerializer):
    vendor_detail = VendorSerializer(source='vendor', read_only=True)
    rfq_id = serializers.ReadOnlyField(source='rfq.rfq_id')
    rfq_title = serializers.ReadOnlyField(source='rfq.title')
    request_id = serializers.ReadOnlyField(source='rfq.purchase_request.request_id')
    quantity = serializers.ReadOnlyField(source='rfq.purchase_request.quantity')
    category = serializers.ReadOnlyField(source='rfq.purchase_request.category')
    subcategory = serializers.ReadOnlyField(source='rfq.purchase_request.subcategory')
    required_by = serializers.ReadOnlyField(source='rfq.purchase_request.required_by')
    total_estimated_cost = serializers.ReadOnlyField(source='rfq.purchase_request.total_estimated_cost')
    delivery_location = serializers.ReadOnlyField(source='rfq.purchase_request.delivery_location')
    rfq_deadline = serializers.ReadOnlyField(source='rfq.deadline')
    document_verification = serializers.SerializerMethodField()
    document_verification_status = serializers.SerializerMethodField()
    purchase_order_detail = serializers.SerializerMethodField()
    goods_receipt_detail = serializers.SerializerMethodField()

    class Meta:
        model = Quotation
        fields = '__all__'
        read_only_fields = ['quotation_id', 'created_at', 'updated_at']

    def _get_parent_pr(self, obj):
        if obj.rfq and hasattr(obj.rfq, 'purchase_request'):
            return obj.rfq.purchase_request
        return None

    def get_document_verification(self, obj):
        pr = self._get_parent_pr(obj)
        return compute_document_verification(pr, quotation=obj)

    def get_document_verification_status(self, obj):
        pr = self._get_parent_pr(obj)
        res = compute_document_verification(pr, quotation=obj)
        return res['status']

    def get_purchase_order_detail(self, obj):
        if hasattr(obj, '_po_detail_cache'):
            return obj._po_detail_cache
        po = None
        pr = self._get_parent_pr(obj)
        if pr and hasattr(pr, '_prefetched_objects_cache') and 'purchase_orders' in pr._prefetched_objects_cache:
            for p in pr._prefetched_objects_cache['purchase_orders']:
                if (p.quotation_id and p.quotation_id == obj.id) or (p.vendor_id and p.vendor_id == obj.vendor_id):
                    po = p
                    break
        elif hasattr(obj, '_prefetched_objects_cache') and 'purchase_orders' in obj._prefetched_objects_cache:
            pos = obj._prefetched_objects_cache['purchase_orders']
            po = pos[0] if pos else None
        elif hasattr(obj, 'purchase_orders') and not self.context.get('skip_lazy_queries'):
            pos = list(obj.purchase_orders.all())
            po = pos[0] if pos else None
            if not po and pr and hasattr(pr, 'purchase_orders'):
                for p in pr.purchase_orders.all():
                    if (p.quotation_id and p.quotation_id == obj.id) or (p.vendor_id and p.vendor_id == obj.vendor_id):
                        po = p
                        break

        if po:
            res = {
                'id': po.id,
                'po_id': po.po_id,
                'status': po.status,
                'total_amount': float(po.total_amount) if po.total_amount is not None else 0.0,
                'order_date': str(po.order_date) if po.order_date else None,
                'expected_delivery': str(po.expected_delivery) if po.expected_delivery else None,
            }
        else:
            res = None
        obj._po_detail_cache = res
        return res

    def get_goods_receipt_detail(self, obj):
        if hasattr(obj, '_gr_detail_cache'):
            return obj._gr_detail_cache
        po_detail = self.get_purchase_order_detail(obj)
        if not po_detail:
            obj._gr_detail_cache = None
            return None
        po = None
        pr = self._get_parent_pr(obj)
        if pr and hasattr(pr, '_prefetched_objects_cache') and 'purchase_orders' in pr._prefetched_objects_cache:
            for p in pr._prefetched_objects_cache['purchase_orders']:
                if p.id == po_detail['id'] or p.po_id == po_detail['po_id']:
                    po = p
                    break
        elif hasattr(obj, '_prefetched_objects_cache') and 'purchase_orders' in obj._prefetched_objects_cache:
            for p in obj._prefetched_objects_cache['purchase_orders']:
                if p.id == po_detail['id'] or p.po_id == po_detail['po_id']:
                    po = p
                    break
        gr = None
        if po:
            if hasattr(po, '_prefetched_objects_cache') and 'goods_receipts' in po._prefetched_objects_cache:
                grs = po._prefetched_objects_cache['goods_receipts']
                gr = grs[0] if grs else None
            elif hasattr(po, 'goods_receipts') and not self.context.get('skip_lazy_queries'):
                grs = list(po.goods_receipts.all())
                gr = grs[0] if grs else None
        if gr:
            res = {
                'id': gr.id,
                'receipt_id': gr.receipt_id,
                'status': gr.status,
                'delivery_date': str(gr.delivery_date) if gr.delivery_date else None,
                'received_quantity': gr.received_quantity,
                'created_at': str(gr.created_at.date()) if gr.created_at else None,
            }
        else:
            res = None
        obj._gr_detail_cache = res
        return res

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        rfq = instance.rfq
        pr = rfq.purchase_request if rfq else None
        title = rfq.title if (rfq and rfq.title) else (pr.title if pr else 'Enterprise Hardware & Supplies')
        qty = pr.quantity if (pr and pr.quantity) else (ret.get('quantity') or 15)
        
        base_price = float(instance.price) if instance.price is not None else 0.0
        gst_pct = float(instance.gst_rate) if (instance.gst_rate is not None and float(instance.gst_rate) > 0) else 18.0
        tax_amt = float(instance.tax_amount) if instance.tax_amount is not None else round(base_price * (gst_pct / 100.0), 2)
        total_amt = float(instance.total_amount) if instance.total_amount is not None else round(base_price + tax_amt, 2)
        unit_rate = round(base_price / max(qty, 1), 2)
        unit_landed = round(total_amt / max(qty, 1), 2)
        valid_until = str(instance.valid_until) if instance.valid_until else (str(rfq.deadline) if (rfq and rfq.deadline) else None)

        ret['rfq_title'] = title
        ret['product_name'] = pr.title if pr else title
        ret['quantity'] = qty
        ret['category'] = pr.category if pr else (ret.get('category') or 'IT Hardware')
        ret['valid_until'] = valid_until
        ret['validUntil'] = valid_until
        
        # Financial breakdown (snake_case and camelCase for complete consistency)
        ret['base_amount'] = base_price
        ret['baseAmount'] = base_price
        ret['unit_price'] = unit_rate
        ret['unitPrice'] = unit_rate
        ret['gst_rate'] = gst_pct
        ret['gstPercent'] = gst_pct
        ret['tax_amount'] = tax_amt
        ret['taxAmount'] = tax_amt
        ret['gst_amount'] = tax_amt
        ret['gstAmount'] = tax_amt
        ret['discount_amount'] = 0.0
        ret['discountAmount'] = 0.0
        ret['shipping_cost'] = 0.0
        ret['shippingCost'] = 0.0
        ret['total_amount'] = total_amt
        ret['totalAmount'] = total_amt
        ret['unit_landed_price'] = unit_landed
        ret['unitLandedPrice'] = unit_landed

        # Unpack extra_fields into representation (both snake_case and camelCase)
        extra = instance.extra_fields or {}
        if isinstance(extra, dict):
            for k, v in extra.items():
                ret[k] = v
                camel_k = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(k.split('_')))
                ret[camel_k] = v

        return ret

    def validate(self, attrs):
        return attrs


class RFQSerializer(serializers.ModelSerializer):
    purchase_request_detail = PurchaseRequestSummarySerializer(source='purchase_request', read_only=True)
    invited_vendors_detail = VendorSerializer(source='invited_vendors', many=True, read_only=True)
    quotations = serializers.SerializerMethodField()
    document_verification = serializers.SerializerMethodField()
    document_verification_status = serializers.SerializerMethodField()

    class Meta:
        model = RFQ
        fields = '__all__'
        read_only_fields = ['rfq_id', 'created_at', 'updated_at']

    def get_document_verification(self, obj):
        return compute_document_verification(obj.purchase_request)

    def get_document_verification_status(self, obj):
        res = compute_document_verification(obj.purchase_request)
        return res['status']

    def get_quotations(self, obj):
        quotes = obj.quotations.all() if hasattr(obj, 'quotations') else []
        if not quotes:
            return []
        
        pr = obj.purchase_request
        doc_verif = compute_document_verification(pr)
        pos = []
        if pr and hasattr(pr, '_prefetched_objects_cache') and 'purchase_orders' in pr._prefetched_objects_cache:
            pos = pr._prefetched_objects_cache['purchase_orders']
        elif pr and hasattr(pr, 'purchase_orders'):
            pos = list(pr.purchase_orders.all())

        results = []
        for q in quotes:
            q._doc_verif_cache = doc_verif
            
            po = None
            for p in pos:
                if (p.quotation_id and p.quotation_id == q.id) or (p.vendor_id and p.vendor_id == q.vendor_id):
                    po = p
                    break
            
            po_detail = None
            gr_detail = None
            if po:
                po_detail = {
                    'id': po.id,
                    'po_id': po.po_id,
                    'status': po.status,
                    'total_amount': float(po.total_amount) if po.total_amount is not None else 0.0,
                    'order_date': str(po.order_date) if po.order_date else None,
                    'expected_delivery': str(po.expected_delivery) if po.expected_delivery else None,
                }
                grs = []
                if hasattr(po, '_prefetched_objects_cache') and 'goods_receipts' in po._prefetched_objects_cache:
                    grs = po._prefetched_objects_cache['goods_receipts']
                elif hasattr(po, 'goods_receipts'):
                    grs = list(po.goods_receipts.all())
                if grs:
                    gr = grs[0]
                    gr_detail = {
                        'id': gr.id,
                        'receipt_id': gr.receipt_id,
                        'status': gr.status,
                        'delivery_date': str(gr.delivery_date) if gr.delivery_date else None,
                        'received_quantity': gr.received_quantity,
                        'created_at': str(gr.created_at.date()) if gr.created_at else None,
                    }

            base_price = float(q.price) if q.price is not None else 0.0
            gst_pct = float(q.gst_rate) if (q.gst_rate is not None and float(q.gst_rate) > 0) else 18.0
            tax_amt = float(q.tax_amount) if q.tax_amount is not None else round(base_price * (gst_pct / 100.0), 2)
            total_amt = float(q.total_amount) if q.total_amount is not None else round(base_price + tax_amt, 2)
            qty = pr.quantity if (pr and pr.quantity) else 15
            unit_rate = round(base_price / max(qty, 1), 2)
            unit_landed = round(total_amt / max(qty, 1), 2)
            valid_until = str(q.valid_until) if q.valid_until else (str(obj.deadline) if obj.deadline else None)

            q_data = {
                'id': q.id,
                'quotation_id': q.quotation_id,
                'rfq': obj.id,
                'rfq_id': obj.rfq_id,
                'rfq_title': obj.title or (pr.title if pr else 'Procurement RFQ'),
                'request_id': pr.request_id if pr else None,
                'quantity': qty,
                'category': pr.category if pr else 'IT Hardware',
                'subcategory': pr.subcategory if pr else 'Laptops',
                'required_by': str(pr.required_by) if (pr and pr.required_by) else None,
                'total_estimated_cost': float(pr.total_estimated_cost) if (pr and pr.total_estimated_cost) else 0.0,
                'delivery_location': pr.delivery_location if pr else 'HQ',
                'rfq_deadline': str(obj.deadline) if obj.deadline else None,
                'vendor': q.vendor_id,
                'vendor_detail': VendorSerializer(q.vendor).data if q.vendor else None,
                'price': base_price,
                'base_amount': base_price,
                'baseAmount': base_price,
                'gst_rate': gst_pct,
                'gstPercent': gst_pct,
                'tax_amount': tax_amt,
                'taxAmount': tax_amt,
                'gst_amount': tax_amt,
                'gstAmount': tax_amt,
                'total_amount': total_amt,
                'totalAmount': total_amt,
                'unit_price': unit_rate,
                'unitPrice': unit_rate,
                'unit_landed_price': unit_landed,
                'unitLandedPrice': unit_landed,
                'delivery_days': q.delivery_days,
                'warranty_months': q.warranty_months,
                'valid_until': valid_until,
                'validUntil': valid_until,
                'status': q.status,
                'terms_conditions': q.terms_conditions,
                'document_verification': doc_verif,
                'document_verification_status': doc_verif['status'],
                'purchase_order_detail': po_detail,
                'goods_receipt_detail': gr_detail,
                'extra_fields': q.extra_fields,
                'created_at': q.created_at.isoformat() if q.created_at else None,
                'updated_at': q.updated_at.isoformat() if q.updated_at else None,
            }
            extra = q.extra_fields or {}
            if isinstance(extra, dict):
                for k, v in extra.items():
                    q_data[k] = v
                    camel_k = ''.join(word.capitalize() if i > 0 else word for i, word in enumerate(k.split('_')))
                    q_data[camel_k] = v
            results.append(q_data)
        return results

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        pr = instance.purchase_request
        est_amount = 0.0
        if pr:
            for val in [pr.total_estimated_cost, pr.requested_amount, pr.approved_amount, pr.existing_cost]:
                if val is not None:
                    try:
                        fval = float(val)
                        if fval > 0:
                            est_amount = fval
                            break
                    except (ValueError, TypeError):
                        pass
            if est_amount == 0.0 and pr.extra_fields and isinstance(pr.extra_fields, dict):
                for k in ['total_estimated_cost', 'requested_amount', 'existing_cost', 'amount', 'totalAmount', 'estimated_amount']:
                    v = pr.extra_fields.get(k)
                    try:
                        if v and float(v) > 0:
                            est_amount = float(v)
                            break
                    except (ValueError, TypeError):
                        pass
        ret['estimated_amount'] = est_amount
        ret['estimatedAmount'] = est_amount
        ret['total_estimated_cost'] = est_amount
        return ret
