from rest_framework import serializers
from .models import PurchaseRequest, ApprovalStep, RejectionReason
from apps.users.serializers import UserSerializer, DepartmentSerializer


class RejectionReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = RejectionReason
        fields = '__all__'


class ApprovalStepSerializer(serializers.ModelSerializer):
    actor_detail = UserSerializer(source='actor', read_only=True)
    reason_detail = RejectionReasonSerializer(source='reason', read_only=True)

    class Meta:
        model = ApprovalStep
        fields = '__all__'


class PurchaseRequestSerializer(serializers.ModelSerializer):
    created_by_detail = UserSerializer(source='created_by', read_only=True)
    department_detail = DepartmentSerializer(source='department', read_only=True)
    approval_steps = ApprovalStepSerializer(many=True, read_only=True)
    stage_display = serializers.CharField(source='get_current_stage_display', read_only=True)
    amount = serializers.SerializerMethodField()
    estimated_cost = serializers.SerializerMethodField()
    requested_amount = serializers.SerializerMethodField()
    approved_amount = serializers.SerializerMethodField()

    def get_amount(self, obj):
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        orig = extra.get('original_requested_amount')
        if orig is not None:
            try:
                val = float(orig)
                if val > 0:
                    return val
            except (ValueError, TypeError):
                pass
        cost = float(obj.total_estimated_cost or 0.0)
        if cost > 0:
            return cost
        appr = extra.get('approved_amount')
        if appr is not None:
            try:
                val = float(appr)
                if val > 0:
                    return val
            except (ValueError, TypeError):
                pass
        return cost

    def get_estimated_cost(self, obj):
        return self.get_amount(obj)

    def get_requested_amount(self, obj):
        return self.get_amount(obj)

    def get_approved_amount(self, obj):
        extra = obj.extra_fields if isinstance(obj.extra_fields, dict) else {}
        appr = extra.get('approved_amount')
        if appr is not None:
            try:
                return float(appr)
            except (ValueError, TypeError):
                pass
        return None

    def get_is_forwarded_to_finance(self, obj):
        if obj.current_stage == 2:
            return True
        if obj.status == 'Recommended' or 'FINANCE' in str(obj.status).upper():
            return True
        steps = list(obj.approval_steps.all()) if hasattr(obj, 'approval_steps') else []
        for step in steps:
            if step.decision == 'RECOMMEND' or step.role == 'FINANCE':
                return True
        if getattr(obj.created_by, 'role', None) == 'FINANCE':
            return True
        return False

    def to_internal_value(self, data):
        data = data.copy() if hasattr(data, 'copy') else dict(data)
        cost_val = None
        for key in ['total_estimated_cost', 'estimated_cost', 'estimatedCost', 'amount', 'cost']:
            val = data.get(key)
            if val is not None and str(val).strip() != '':
                try:
                    parsed_cost = float(val)
                    cost_val = parsed_cost
                    break
                except (ValueError, TypeError):
                    pass
        if cost_val is not None:
            data['total_estimated_cost'] = cost_val
        return super().to_internal_value(data)

    def get_currently_with(self, obj):
        stage = obj.current_stage
        status_lower = str(obj.status).lower().strip()
        is_software = any(kw in (obj.category or '').lower() or kw in (obj.title or '').lower() for kw in ['software', 'saas', 'cloud', 'license', 'subscription', 'digital'])
        if status_lower in ['completed', 'paid']:
            return 'Completed & Archived'
        if status_lower in ['rejected', 'finance_rejected']:
            return 'Rejected & Closed'
        if status_lower in ['returned', 'clarification_requested']:
            return 'Returned to Team Lead'

        rfqs = list(obj.rfqs.all()) if hasattr(obj, 'rfqs') else []
        if rfqs and stage <= 4:
            stage = 5

        if stage == 0 or status_lower in ['pending_arrival', 'draft']:
            return 'Team Lead / Requester'
        elif stage == 1 or status_lower == 'pending_approval':
            return 'Manager — Sarah Manager'
        elif stage == 2 or status_lower in ['finance_review', 'recommended_to_finance', 'sent_to_finance', 'finance_on_hold']:
            return 'Finance — Mark Finance Officer'
        elif stage == 3 or status_lower == 'recommended_to_admin':
            return 'Admin — Executive Authority'
        elif stage == 4:
            return 'IT Operations & Provisioning (License Verification)' if is_software else 'Procurement Sourcing Desk (RFQ Dispatched)'
        elif stage == 5:
            return 'Accounts & Treasury (Payment Processing)' if is_software else 'Vendor Sourcing Desk (Quotations Under Evaluation)'
        elif stage == 6:
            return 'Accounts & Treasury (Payment Processing)' if is_software else 'Selected Vendor (Order Fulfillment & Dispatch)'
        elif stage == 7:
            return 'Accounts & Treasury (Payment Processing)' if is_software else 'Dock & Receiving (Delivery & GRN Verification)'
        elif stage == 8:
            return 'Accounts & Treasury (Payment Processing)' if is_software else 'Accounts Payable & Procurement Audit (Invoice & 3-Way Match)'
        elif stage >= 9:
            return 'Finance Treasury (Payment Processing & Disbursement)'
        return 'Procurement Operations Desk'

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        orig_requested_val = self.get_amount(instance)
        approved_amt_val = self.get_approved_amount(instance)

        ret['total_estimated_cost'] = orig_requested_val
        ret['amount'] = orig_requested_val
        ret['estimated_cost'] = orig_requested_val
        ret['estimatedCost'] = orig_requested_val
        ret['requested_amount'] = orig_requested_val
        ret['requestedAmount'] = orig_requested_val
        ret['original_requested_amount'] = orig_requested_val
        ret['originalRequestedAmount'] = orig_requested_val
        ret['approved_amount'] = approved_amt_val
        ret['approvedAmount'] = approved_amt_val
        if instance.created_at:
            iso_str = instance.created_at.isoformat()
            ret['created_at'] = iso_str
            ret['createdAt'] = iso_str
            ret['date'] = instance.created_at.strftime('%Y-%m-%d')
        if instance.updated_at:
            iso_upd = instance.updated_at.isoformat()
            ret['updated_at'] = iso_upd
            ret['updatedAt'] = iso_upd
        
        # Link real Purchase Order, GRN, and RFQ from prefetched in-memory collections
        pos = list(instance.purchase_orders.all()) if hasattr(instance, 'purchase_orders') else []
        po = pos[0] if pos else None
        if po:
            ret['po_number'] = po.po_id
            ret['poNumber'] = po.po_id
            ret['po_id'] = po.po_id
            ret['po_status'] = po.status
            if po.vendor_id:
                ret['vendor_name'] = po.vendor.name if po.vendor else ''
                ret['vendor'] = po.vendor.name if po.vendor else ''
            grs = list(po.goods_receipts.all()) if hasattr(po, 'goods_receipts') else []
            grn = grs[0] if grs else None
            if grn:
                ret['grn_number'] = grn.receipt_id
                ret['grnNumber'] = grn.receipt_id
                ret['receipt_id'] = grn.receipt_id
                ret['grn_status'] = grn.status

            invs = list(po.invoices.all()) if hasattr(po, 'invoices') else []
            inv = invs[0] if invs else None
            if inv:
                ret['invoice_number'] = inv.invoice_number
                ret['invoiceNumber'] = inv.invoice_number
                ret['invoice_id'] = inv.invoice_id
                ret['invoice_status'] = inv.status
                ret['is_invoice_verified'] = inv.is_manager_verified
        else:
            ret['po_number'] = None
            ret['poNumber'] = None
            ret['grn_number'] = None
            ret['grnNumber'] = None
            ret['invoice_number'] = None
            ret['invoiceNumber'] = None

        rfqs = list(instance.rfqs.all()) if hasattr(instance, 'rfqs') else []
        rfq = rfqs[0] if rfqs else None
        if rfq:
            ret['rfq_id'] = rfq.rfq_id
            ret['rfqId'] = rfq.rfq_id

        # Compute dynamic current_stage based on actual workflow artifacts and workflow type
        wf_type = instance.workflow_type
        is_software = (wf_type == 'SOFTWARE')
        computed_stage = instance.current_stage

        if instance.status not in ['Rejected', 'Returned']:
            if is_software:
                # Software stages: 0=Create Request, 1=Manager Approval, 2=Finance Approval, 3=Admin Approval, 4=Verification and Order Complete, 5=Payment
                has_paid = (instance.status == 'Completed')
                if not has_paid and pos:
                    for p_order in pos:
                        invs_list = list(p_order.invoices.all()) if hasattr(p_order, 'invoices') else []
                        for inv in invs_list:
                            payments_list = list(inv.payments.all()) if hasattr(inv, 'payments') else []
                            if any(p.status == 'Paid' for p in payments_list):
                                has_paid = True
                                break
                if has_paid or str(instance.status).lower() in ['completed', 'paid']:
                    computed_stage = 5
            else:
                # Hardware stages: 0=Create, 1=Manager, 2=Finance, 3=Admin, 4=RFQ Sent, 5=Vendor Quotes Received, 6=Product Order, 7=Delivery, 8=Verification and Order Complete, 9=Payment
                has_quotes = False
                for rfq_item in rfqs:
                    quotes_list = list(rfq_item.quotations.all()) if hasattr(rfq_item, 'quotations') else []
                    if len(quotes_list) > 0:
                        has_quotes = True
                        break

                if rfqs and computed_stage < 4:
                    computed_stage = 4
                if has_quotes and computed_stage < 5:
                    computed_stage = 5
                if pos and computed_stage < 6:
                    computed_stage = 6

                if pos:
                    has_paid = False
                    for p_order in pos:
                        grs_list = list(p_order.goods_receipts.all()) if hasattr(p_order, 'goods_receipts') else []
                        invs_list = list(p_order.invoices.all()) if hasattr(p_order, 'invoices') else []

                        gr_verified = any(g.status in ['Verified', 'Confirmed', 'Approved'] or getattr(g, 'verified_by_name', None) for g in grs_list)
                        inv_verified = any(i.is_manager_verified or i.status in ['Matched', 'Paid', 'Verified'] for i in invs_list)

                        for inv in invs_list:
                            payments_list = list(inv.payments.all()) if hasattr(inv, 'payments') else []
                            if any(p.status == 'Paid' for p in payments_list):
                                has_paid = True

                        if (gr_verified or grs_list or p_order.status in ['Delivered', 'Fulfilled']) and computed_stage < 8:
                            computed_stage = 8
                        if gr_verified and inv_verified and computed_stage < 9:
                            computed_stage = 9
                        elif invs_list and computed_stage < 8:
                            computed_stage = 8

                    if has_paid or str(instance.status).lower() in ['completed', 'paid']:
                        computed_stage = 9

        ret['current_stage'] = computed_stage
        ret['currentStage'] = computed_stage
        ret['currently_with'] = self.get_currently_with(instance)
        ret['currentlyWith'] = ret['currently_with']

        wf_type = instance.workflow_type
        ret['workflow_type'] = wf_type
        ret['workflowType'] = wf_type
        ret['is_hardware'] = (wf_type == 'HARDWARE')
        ret['isHardware'] = (wf_type == 'HARDWARE')
        ret['is_software'] = (wf_type == 'SOFTWARE')
        ret['isSoftware'] = (wf_type == 'SOFTWARE')

        return ret

    class Meta:
        model = PurchaseRequest
        fields = '__all__'
        read_only_fields = ['request_id', 'created_by', 'status', 'current_stage', 'created_at', 'updated_at']
        extra_kwargs = {
            'department': {'required': False, 'allow_null': True}
        }


class ApproveRejectActionSerializer(serializers.Serializer):
    action = serializers.ChoiceField(choices=['APPROVE', 'REJECT', 'RECOMMEND', 'RETURN'])
    reason_id = serializers.IntegerField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    total_estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)
    estimated_cost = serializers.DecimalField(max_digits=12, decimal_places=2, required=False, allow_null=True)

    def validate(self, data):
        action = data.get('action')
        reason_id = data.get('reason_id')
        if action in ['REJECT', 'RECOMMEND'] and not reason_id:
            default_reason = RejectionReason.objects.filter(reason_type=action, is_active=True).first()
            if default_reason:
                data['reason_id'] = default_reason.id
            elif not RejectionReason.objects.filter(reason_type=action).exists():
                created_reason = RejectionReason.objects.create(
                    text="Requires Executive / Director-Level Approval" if action == 'RECOMMEND' else "Standard Policy Rejection",
                    reason_type=action,
                    is_active=True
                )
                data['reason_id'] = created_reason.id
        return data
