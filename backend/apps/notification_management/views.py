from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Notification
from .serializers import NotificationSerializer
from apps.users.models import User


class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer
    permission_classes = [AllowAny]

    def get_filtered_queryset(self, request=None):
        req = request or self.request
        try:
            user = req.user
            qs = Notification.objects.select_related(
                'purchase_request',
                'user'
            )

            role_param = req.query_params.get('role')
            user_param = req.query_params.get('user') or req.query_params.get('user_id')
            vendor_param = req.query_params.get('vendor') or req.query_params.get('vendor_id')

            if self.action in ['retrieve', 'update', 'partial_update', 'destroy', 'mark_read'] or self.kwargs.get('pk'):
                return Notification.objects.all()

            if user_param and role_param:
                u_lookup = Q(username__iexact=str(user_param)) | Q(email__iexact=str(user_param))
                if str(user_param).isdigit():
                    u_lookup |= Q(id=int(user_param))

                target_user = User.objects.filter(u_lookup).first()
                if target_user:
                    return qs.filter(user=target_user)

                r_clean = str(role_param).strip().upper()
                return qs.filter(user__role__iexact=r_clean).distinct()

            if user_param:
                if str(user_param).isdigit():
                    return qs.filter(user_id=int(user_param))
                return qs.filter(Q(user__username__iexact=str(user_param)) | Q(user__email__iexact=str(user_param)))

            if vendor_param:
                v_clean = str(vendor_param).strip()
                from apps.core.utils import resolve_vendor_helper
                v_obj = resolve_vendor_helper(v_clean)
                
                q_filter = (
                    Q(user__vendor_id_code__iexact=v_clean) |
                    Q(user__vendor_profile__unique_vendor_id__iexact=v_clean) |
                    Q(user__username__iexact=v_clean) |
                    Q(user__username__icontains=v_clean.lower().replace('-', '_'))
                )
                if v_obj:
                    if getattr(v_obj, 'user', None):
                        q_filter |= Q(user=v_obj.user)
                    else:
                        from apps.notification_management.services import get_or_create_vendor_user
                        vu = get_or_create_vendor_user(v_obj)
                        if vu:
                            q_filter |= Q(user=vu)
                    if getattr(v_obj, 'unique_vendor_id', None):
                        q_filter |= Q(user__vendor_profile__unique_vendor_id__iexact=v_obj.unique_vendor_id)
                        q_filter |= Q(user__vendor_id_code__iexact=v_obj.unique_vendor_id)
                        q_filter |= Q(user__username__icontains=v_obj.unique_vendor_id.lower().replace('-', '_'))
                    if getattr(v_obj, 'name', None):
                        first_tok = v_obj.name.split()[0].lower()
                        q_filter |= Q(user__username__icontains=first_tok)

                return qs.filter(q_filter).distinct()

            # If user is authenticated
            if getattr(user, 'is_authenticated', False) and user.is_authenticated:
                if role_param:
                    r_clean = str(role_param).strip().upper()
                    return qs.filter(Q(user=user) | Q(user__role__iexact=r_clean)).distinct()
                return qs.filter(user=user)

            if role_param:
                return qs.filter(user__role__iexact=str(role_param).strip()).distinct()

            return qs
        except Exception:
            return Notification.objects.none()

    def get_queryset(self):
        return self.get_filtered_queryset().order_by('-created_at')

    def list(self, request, *args, **kwargs):
        base_qs = self.get_filtered_queryset(request)
        unread_count = base_qs.filter(is_read=False).order_by().count()
        
        page_size_param = request.query_params.get('page_size')
        if page_size_param:
            try:
                page_size = max(1, min(1000, int(page_size_param)))
                page_num = max(1, int(request.query_params.get('page', 1)))
                start = (page_num - 1) * page_size
                end = start + page_size
                ordered_qs = base_qs.order_by('-created_at')
                total_count = ordered_qs.count()
                items = ordered_qs[start:end]
                serializer = self.get_serializer(items, many=True)
                return Response({
                    'count': total_count,
                    'unread_count': unread_count,
                    'results': serializer.data
                })
            except (ValueError, TypeError):
                pass

        page = self.paginate_queryset(self.get_queryset())
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            res = self.get_paginated_response(serializer.data)
            res.data['unread_count'] = unread_count
            return res

        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({
            'count': base_qs.count(),
            'unread_count': unread_count,
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def unread_count(self, request):
        base_qs = self.get_filtered_queryset(request)
        count = base_qs.filter(is_read=False).order_by().count()
        return Response({'unread_count': count})

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def mark_all_read(self, request):
        user = request.user
        user_param = request.data.get('user') or request.query_params.get('user')
        role_param = request.data.get('role') or request.query_params.get('role')
        vendor_param = request.data.get('vendor') or request.query_params.get('vendor')

        qs = Notification.objects.filter(is_read=False)
        if user_param and role_param:
            u_lookup = Q(username__iexact=str(user_param)) | Q(email__iexact=str(user_param))
            if str(user_param).isdigit():
                u_lookup |= Q(id=int(user_param))
            target_user = User.objects.filter(u_lookup).first()
            if target_user:
                qs = qs.filter(user=target_user)
            else:
                qs = qs.none()
        elif user_param:
            if str(user_param).isdigit():
                qs = qs.filter(user_id=int(user_param))
            else:
                qs = qs.filter(Q(user__username__iexact=str(user_param)) | Q(user__email__iexact=str(user_param)))
        elif vendor_param:
            v_clean = str(vendor_param).strip()
            from apps.core.utils import resolve_vendor_helper
            v_obj = resolve_vendor_helper(v_clean)
            
            q_filter = (
                Q(user__vendor_id_code__iexact=v_clean) |
                Q(user__vendor_profile__unique_vendor_id__iexact=v_clean) |
                Q(user__username__iexact=v_clean) |
                Q(user__username__icontains=v_clean.lower().replace('-', '_'))
            )
            if v_obj:
                if getattr(v_obj, 'user', None):
                    q_filter |= Q(user=v_obj.user)
                else:
                    from apps.notification_management.services import get_or_create_vendor_user
                    vu = get_or_create_vendor_user(v_obj)
                    if vu:
                        q_filter |= Q(user=vu)
                if getattr(v_obj, 'unique_vendor_id', None):
                    q_filter |= Q(user__vendor_profile__unique_vendor_id__iexact=v_obj.unique_vendor_id)
                    q_filter |= Q(user__vendor_id_code__iexact=v_obj.unique_vendor_id)
                    q_filter |= Q(user__username__icontains=v_obj.unique_vendor_id.lower().replace('-', '_'))
                if getattr(v_obj, 'name', None):
                    first_tok = v_obj.name.split()[0].lower()
                    q_filter |= Q(user__username__icontains=first_tok)

            qs = qs.filter(q_filter)
        elif role_param and getattr(user, 'is_authenticated', False) and user.is_authenticated:
            qs = qs.filter(user=user, user__role__iexact=str(role_param).strip())
        elif role_param:
            qs = qs.filter(user__role__iexact=str(role_param).strip())
        elif getattr(user, 'is_authenticated', False) and user.is_authenticated:
            qs = qs.filter(user=user)

        updated_count = qs.update(is_read=True)
        return Response({'status': 'All notifications marked as read.', 'updated_count': updated_count})

    @action(detail=True, methods=['post', 'patch'], permission_classes=[AllowAny])
    def mark_read(self, request, pk=None):
        notification = Notification.objects.filter(pk=pk).first()
        if not notification:
            return Response({'error': 'Notification not found.'}, status=status.HTTP_404_NOT_FOUND)
        notification.is_read = True
        notification.save(update_fields=['is_read', 'updated_at'])

        # If sibling role notifications exist for this exact same event, sync them too
        if notification.purchase_request_id:
            Notification.objects.filter(
                purchase_request_id=notification.purchase_request_id,
                title=notification.title,
                user__role=notification.user.role,
                is_read=False
            ).update(is_read=True)

        return Response({'status': 'Notification marked as read.', 'notification': NotificationSerializer(notification).data})
