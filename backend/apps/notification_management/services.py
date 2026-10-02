from datetime import timedelta
from django.utils import timezone
from apps.notification_management.models import Notification
from apps.users.models import User


def create_notification(user, title, message, purchase_request=None):
    """
    Creates a notification for a specific user with automatic deduplication.
    """
    if not user:
        return None
    if isinstance(user, (int, str)) and not isinstance(user, User):
        if str(user).isdigit():
            user = User.objects.filter(id=int(user)).first()
        else:
            user = User.objects.filter(username__iexact=str(user)).first()
    if not user:
        return None

    try:
        # Deduplication check: prevent identical notifications within 3 seconds
        recent_threshold = timezone.now() - timedelta(seconds=3)
        duplicate = Notification.objects.filter(
            user=user,
            title=title,
            purchase_request=purchase_request,
            created_at__gte=recent_threshold
        ).first()
        if duplicate:
            return duplicate

        return Notification.objects.create(
            user=user,
            purchase_request=purchase_request,
            title=title,
            message=message,
            is_read=False
        )
    except Exception as e:
        print(f"Error creating notification for {user}: {e}")
        return None


def get_or_create_vendor_user(vendor):
    """
    Resolves or creates a dedicated User account for a given vendor.
    """
    if not vendor:
        return None
    user = getattr(vendor, 'user', None)
    if user:
        return user
    user = User.objects.filter(vendor_profile=vendor).first()
    if user:
        return user
    if hasattr(vendor, 'unique_vendor_id') and vendor.unique_vendor_id:
        user = User.objects.filter(vendor_id_code=vendor.unique_vendor_id).first()
        if user:
            return user
    if hasattr(vendor, 'name') and vendor.name:
        first_token = vendor.name.split()[0].lower()
        user = User.objects.filter(username__icontains=first_token, role='VENDOR').first()
        if user:
            return user

    # Create / link dedicated vendor user account
    try:
        clean_code = (getattr(vendor, 'unique_vendor_id', None) or 'vnd').lower().replace('-', '_')
        username = f"{clean_code}_user"
        user = User.objects.filter(username=username).first()
        if not user:
            user = User.objects.create(
                username=username,
                email=getattr(vendor, 'email', f"{clean_code}@vendor.com") or f"{clean_code}@vendor.com",
                role='VENDOR',
                vendor_id_code=getattr(vendor, 'unique_vendor_id', ''),
                first_name=getattr(vendor, 'contact_person', 'Vendor Representative') or 'Vendor',
                last_name='Partner'
            )
            user.set_password('Vendor@123')
            user.save()
        if hasattr(vendor, 'user') and not vendor.user:
            vendor.user = user
            vendor.save(update_fields=['user'])
        return user
    except Exception as e:
        print(f"Error resolving vendor user: {e}")
        return None


def notify_vendor(vendor, title, message, purchase_request=None):
    """
    Creates a notification strictly for the specific vendor.
    """
    if not vendor:
        return None
    user = get_or_create_vendor_user(vendor)
    if user:
        return create_notification(user, title, message, purchase_request)
    return None


def notify_user_or_role(user=None, role=None, title="", message="", purchase_request=None):
    """
    Helper to notify either a specific user or all users in a role.
    """
    if user:
        return create_notification(user, title, message, purchase_request)
    elif role:
        return notify_roles(role, title, message, purchase_request)
    return None


def notify_roles(roles, title, message, purchase_request=None, exclude_users=None):
    """
    Creates notifications for all active users with the given role(s).
    """
    if isinstance(roles, str):
        roles = [roles]

    exclude_ids = set()
    if exclude_users:
        if isinstance(exclude_users, (list, set, tuple)):
            for u in exclude_users:
                if hasattr(u, 'id'):
                    exclude_ids.add(u.id)
                elif isinstance(u, int):
                    exclude_ids.add(u)
        elif hasattr(exclude_users, 'id'):
            exclude_ids.add(exclude_users.id)

    users = User.objects.filter(role__in=roles, is_active=True).exclude(id__in=exclude_ids)
    created = []
    for u in users:
        n = create_notification(u, title, message, purchase_request=purchase_request)
        if n:
            created.append(n)
    return created


def notify_stage_event(event_type, purchase_request=None, actor=None, details=None):
    """
    Dispatches coordinated real-time notifications to the originating portal (request creator),
    governing roles (Manager, Finance, Admin), and vendors whenever a request transitions across stages.
    """
    if not purchase_request:
        return []

    pr = purchase_request
    pr_id = pr.request_id
    title = pr.title
    req_user = pr.created_by
    dept = getattr(pr.department, 'name', '') or ''
    amt = float(pr.total_estimated_cost or 0)
    details = details or {}
    actor_name = getattr(actor, 'username', 'System') if actor else 'System'
    actor_role = getattr(actor, 'role', 'ADMIN') if actor else 'SYSTEM'

    created_notes = []

    # 1. REQUEST CREATION (Stage 0 -> Stage 1)
    if event_type == 'REQUEST_CREATED':
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Submitted",
                message=f"Your purchase request '{title}' (Rs.{amt:,.2f}) was submitted to Manager for approval.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER'],
            title=f"New Request {pr_id} Arrived",
            message=f"New request '{title}' (Rs.{amt:,.2f}) submitted by {getattr(req_user, 'username', 'Team Lead')} ({dept}) for approval.",
            purchase_request=pr,
            exclude_users=[req_user] if req_user else None
        ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"New Requisition {pr_id} Logged",
            message=f"Requisition '{title}' (Rs.{amt:,.2f}) submitted in {dept}.",
            purchase_request=pr,
            exclude_users=[req_user] if req_user else None
        ))

    # 2. MANAGER APPROVAL (Stage 1 -> Stage 4)
    elif event_type == 'MANAGER_APPROVED':
        appr_amt = details.get('amount') or amt
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Approved by Manager",
                message=f"Your request '{title}' was approved by {actor_name} (Manager). Advancing to Procurement Sourcing Desk.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['ADMIN', 'FINANCE'],
            title=f"Request {pr_id} Approved by Manager",
            message=f"Request '{title}' (Rs.{appr_amt:,.2f}) approved by {actor_name} (Manager). Ready for procurement.",
            purchase_request=pr,
            exclude_users=[actor] if actor else None
        ))

    # 3. MANAGER RECOMMENDED TO FINANCE (Stage 1 -> Stage 2)
    elif event_type == 'MANAGER_RECOMMENDED_FINANCE':
        rec_amt = details.get('amount') or amt
        reason_txt = details.get('reason', '')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Under Financial Review",
                message=f"Your request '{title}' (Rs.{rec_amt:,.2f}) was forwarded to Finance by Manager for budget review.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['FINANCE'],
            title=f"Request {pr_id} Forwarded for Review",
            message=f"Request '{title}' (Rs.{rec_amt:,.2f}) escalated to Finance by {actor_name}." + (f" Reason: {reason_txt}" if reason_txt else ""),
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"Request {pr_id} Escalated to Finance",
            message=f"Request '{title}' (Rs.{rec_amt:,.2f}) escalated to Finance by Manager ({actor_name}).",
            purchase_request=pr
        ))

    # 4. MANAGER RECOMMENDED TO ADMIN (Stage 1 -> Stage 3)
    elif event_type == 'MANAGER_RECOMMENDED_ADMIN':
        rec_amt = details.get('amount') or amt
        reason_txt = details.get('reason', '')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Under Executive Review",
                message=f"Your request '{title}' (Rs.{rec_amt:,.2f}) was escalated to Admin by Manager for executive approval.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"Request {pr_id} Forwarded to Admin",
            message=f"Request '{title}' (Rs.{rec_amt:,.2f}) escalated to Admin by Manager ({actor_name})." + (f" Reason: {reason_txt}" if reason_txt else ""),
            purchase_request=pr
        ))

    # 5. FINANCE APPROVED (Stage 2 -> Stage 4)
    elif event_type == 'FINANCE_APPROVED':
        appr_amt = details.get('amount') or amt
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Financial Approval Granted",
                message=f"Budget verified and approved by Finance ({actor_name}). Request moved to Procurement Sourcing.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER'],
            title=f"Request {pr_id} Approved by Finance",
            message=f"Budget approved for '{title}' (Rs.{appr_amt:,.2f}) by {actor_name} (Finance). Sourcing can proceed.",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"Request {pr_id} Approved by Finance",
            message=f"Budget approved for '{title}' (Rs.{appr_amt:,.2f}) by Finance ({actor_name}).",
            purchase_request=pr
        ))

    # 6. FINANCE RECOMMENDED TO ADMIN (Stage 2 -> Stage 3)
    elif event_type == 'FINANCE_RECOMMENDED_ADMIN':
        rec_amt = details.get('amount') or amt
        reason_txt = details.get('reason', '')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Escalated to Executive Authority",
                message=f"Your request '{title}' (Rs.{rec_amt:,.2f}) was reviewed by Finance and escalated to Admin for sign-off.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER'],
            title=f"Request {pr_id} Forwarded to Admin",
            message=f"Request '{title}' recommended to Admin by Finance ({actor_name}).",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"Request {pr_id} Forwarded to Admin",
            message=f"Request '{title}' (Rs.{rec_amt:,.2f}) escalated to Admin by Finance ({actor_name})." + (f" Reason: {reason_txt}" if reason_txt else ""),
            purchase_request=pr
        ))

    # 7. ADMIN APPROVED (Stage 3 -> Stage 4)
    elif event_type == 'ADMIN_APPROVED':
        appr_amt = details.get('amount') or amt
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Executive Approval Granted",
                message=f"Final authorization granted by Admin (Executive Authority). Advancing to Vendor RFQ & Sourcing.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER'],
            title=f"Request {pr_id} Approved by Admin",
            message=f"Executive sign-off granted for '{title}' (Rs.{appr_amt:,.2f}) by Admin. Ready for RFQ dispatch.",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['FINANCE'],
            title=f"Request {pr_id} Approved by Admin",
            message=f"Executive approval granted for '{title}' (Rs.{appr_amt:,.2f}) by Admin ({actor_name}).",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['ADMIN'],
            title=f"Request {pr_id} Approved",
            message=f"Executive authorization completed for '{title}' (Rs.{appr_amt:,.2f}).",
            purchase_request=pr,
            exclude_users=[actor] if actor else None
        ))

    # 8. REJECTED
    elif event_type == 'REQUEST_REJECTED':
        reason_txt = details.get('reason', 'Policy reasons')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Rejected",
                message=f"Your request '{title}' was rejected by {actor_name} ({actor_role}). Reason: {reason_txt}.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'FINANCE', 'ADMIN'],
            title=f"Request {pr_id} Rejected",
            message=f"Request '{title}' was rejected by {actor_name} ({actor_role}). Reason: {reason_txt}.",
            purchase_request=pr,
            exclude_users=[actor] if actor else None
        ))

    # 9. RETURNED FOR CLARIFICATION
    elif event_type == 'REQUEST_RETURNED':
        reason_txt = details.get('reason', 'Clarification required')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Returned for Revision",
                message=f"Your request '{title}' was returned by {actor_name} ({actor_role}). Reason: {reason_txt}. Please update and resubmit.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER'],
            title=f"Request {pr_id} Returned to Requester",
            message=f"Request '{title}' returned to Team Lead by {actor_name} ({actor_role}).",
            purchase_request=pr,
            exclude_users=[actor] if actor else None
        ))

    # 10. RFQ PUBLISHED (Stage 4)
    elif event_type == 'RFQ_PUBLISHED':
        rfq_id = details.get('rfq_id', '')
        v_count = details.get('vendor_count', 0)
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"RFQ {rfq_id} Published for {pr_id}",
                message=f"RFQ '{title}' was dispatched to {v_count} invited vendors for competitive quotation.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'ADMIN'],
            title=f"RFQ {rfq_id} Published",
            message=f"RFQ {rfq_id} for request {pr_id} ('{title}') published to {v_count} vendors.",
            purchase_request=pr
        ))

    # 11. QUOTATION SUBMITTED (Stage 5)
    elif event_type == 'QUOTATION_SUBMITTED':
        q_id = details.get('quotation_id', '')
        v_name = details.get('vendor_name', 'Vendor')
        q_price = details.get('price', 0)
        rfq_id = details.get('rfq_id', '')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Quotation Received for {pr_id}",
                message=f"Vendor {v_name} submitted quote ({q_id}, Rs.{q_price:,.2f}) for RFQ {rfq_id}.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'ADMIN'],
            title=f"New Quotation Received ({q_id})",
            message=f"Vendor {v_name} submitted quotation of Rs.{q_price:,.2f} for RFQ {rfq_id}.",
            purchase_request=pr
        ))

    # 12. VENDOR SELECTED & PO ISSUED (Stage 6)
    elif event_type == 'PO_ISSUED':
        po_id = details.get('po_id', '')
        v_name = details.get('vendor_name', 'Vendor')
        po_amt = details.get('amount') or amt
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Purchase Order {po_id} Issued for {pr_id}",
                message=f"Vendor {v_name} selected. Purchase Order {po_id} (Rs.{po_amt:,.2f}) generated and dispatched.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'FINANCE', 'ADMIN'],
            title=f"Purchase Order {po_id} Issued",
            message=f"Purchase Order {po_id} (Rs.{po_amt:,.2f}) issued to {v_name} for Request {pr_id}.",
            purchase_request=pr
        ))

    # 13. GOODS RECEIPT VERIFIED (Stage 7)
    elif event_type == 'GOODS_RECEIPT_VERIFIED':
        grn_id = details.get('receipt_id', '')
        po_id = details.get('po_id', '')
        verifier = details.get('verifier', actor_name)
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Goods Receipt {grn_id} Verified for {pr_id}",
                message=f"Physical delivery verified for PO {po_id} by {verifier}. Goods received at facility.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['FINANCE'],
            title=f"GRN {grn_id} Verified -- Ready for 3-Way Match",
            message=f"Goods Receipt {grn_id} verified for PO {po_id}. Ready for invoice matching.",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'ADMIN'],
            title=f"Goods Receipt {grn_id} Verified",
            message=f"Physical delivery verified for Request {pr_id} (PO: {po_id}).",
            purchase_request=pr
        ))

    # 14. INVOICE VERIFIED (Stage 8)
    elif event_type == 'INVOICE_VERIFIED':
        inv_num = details.get('invoice_number', '')
        po_id = details.get('po_id', '')
        verifier = details.get('verifier', actor_name)
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Invoice {inv_num} Verified for {pr_id}",
                message=f"Invoice {inv_num} verified against PO & Goods Receipt (3-Way Match Verified). Advancing to Payment.",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['FINANCE'],
            title=f"Invoice {inv_num} Approved for Payment",
            message=f"Invoice {inv_num} verified (3-Way Match Passed) for PO {po_id}. Ready for Treasury Payment Disbursement.",
            purchase_request=pr
        ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'ADMIN'],
            title=f"Invoice {inv_num} Verified (3-Way Match)",
            message=f"Invoice {inv_num} verified and approved for Request {pr_id} (PO: {po_id}).",
            purchase_request=pr
        ))

    # 15. PAYMENT COMPLETED (Stage 9)
    elif event_type == 'PAYMENT_COMPLETED':
        pay_amt = details.get('amount') or amt
        utr = details.get('reference_number', '')
        v_name = details.get('vendor_name', 'Vendor')
        po_id = details.get('po_id', '')
        if req_user:
            created_notes.append(create_notification(
                user=req_user,
                title=f"Request {pr_id} Completed & Paid",
                message=f"Payment of Rs.{pay_amt:,.2f} settled to {v_name} for '{title}'. UTR: {utr}. Procurement complete!",
                purchase_request=pr
            ))
        created_notes.extend(notify_roles(
            roles=['MANAGER', 'FINANCE', 'ADMIN'],
            title=f"Payment Settled for Request {pr_id} (UTR: {utr})",
            message=f"Payment of Rs.{pay_amt:,.2f} disbursed to {v_name} (PO: {po_id}, UTR: {utr}). Request marked Completed.",
            purchase_request=pr
        ))

    return created_notes
