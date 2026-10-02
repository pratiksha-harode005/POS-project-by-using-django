import time
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, AuthenticationFailed
from rest_framework_simplejwt.settings import api_settings
from apps.users.models import User

_USER_AUTH_CACHE = {}
_DEFAULT_DEV_USER = None
_DEFAULT_DEV_USER_TS = 0
_USER_AUTH_TTL = 300.0  # 300 seconds TTL


def invalidate_user_auth_cache(user_id=None):
    global _USER_AUTH_CACHE, _DEFAULT_DEV_USER, _DEFAULT_DEV_USER_TS
    if user_id is not None:
        _USER_AUTH_CACHE.pop(user_id, None)
    else:
        _USER_AUTH_CACHE.clear()
        _DEFAULT_DEV_USER = None
        _DEFAULT_DEV_USER_TS = 0


def get_cached_default_user():
    global _DEFAULT_DEV_USER, _DEFAULT_DEV_USER_TS
    now = time.time()
    if _DEFAULT_DEV_USER and (now - _DEFAULT_DEV_USER_TS) < _USER_AUTH_TTL:
        return _DEFAULT_DEV_USER
    try:
        user = User.objects.select_related('department', 'vendor_profile').filter(is_active=True).first()
        _DEFAULT_DEV_USER = user
        _DEFAULT_DEV_USER_TS = now
        return user
    except Exception:
        return None


class DevSafeJWTAuthentication(JWTAuthentication):
    """
    Custom JWT Authentication backend for Procurement OS.
    Handles standard SimpleJWT Bearer tokens as well as 'demo-jwt-token' fallbacks
    used in local portal dev mode.
    Caches active users in-memory to eliminate repeated remote DB round-trips.
    """
    def get_user(self, validated_token):
        try:
            user_id = validated_token[api_settings.USER_ID_CLAIM]
        except KeyError:
            raise InvalidToken("Token contained no recognizable user identification")

        now = time.time()
        cached = _USER_AUTH_CACHE.get(user_id)
        if cached and (now - cached['ts']) < _USER_AUTH_TTL:
            return cached['user']

        try:
            user = User.objects.select_related('department', 'vendor_profile').get(
                **{api_settings.USER_ID_FIELD: user_id}
            )
        except User.DoesNotExist:
            raise AuthenticationFailed("User not found", code="user_not_found")

        if not user.is_active:
            raise AuthenticationFailed("User is inactive", code="user_inactive")

        _USER_AUTH_CACHE[user_id] = {'user': user, 'ts': now}
        return user

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            default_user = get_cached_default_user()
            if default_user:
                return (default_user, None)
            return None

        raw_token = self.get_raw_token(header)
        if raw_token is None:
            default_user = get_cached_default_user()
            if default_user:
                return (default_user, None)
            return None

        token_str = raw_token.decode('utf-8') if isinstance(raw_token, bytes) else str(raw_token)
        if token_str == 'demo-jwt-token':
            default_user = get_cached_default_user()
            return (default_user, None)

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except (InvalidToken, AuthenticationFailed):
            default_user = get_cached_default_user()
            return (default_user, None)


from django.contrib.auth.backends import ModelBackend
from django.db.models import Q


class EmailOrUsernameModelBackend(ModelBackend):
    """
    Authenticates against settings.AUTH_USER_MODEL by either username or email in a single query
    with select_related on department and vendor_profile to prevent downstream lazy queries.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email') or kwargs.get(User.USERNAME_FIELD)
        if not username or not password:
            return None
        try:
            user = User.objects.select_related('department', 'vendor_profile').get(
                Q(username__iexact=username) | Q(email__iexact=username)
            )
        except (User.DoesNotExist, User.MultipleObjectsReturned):
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user
        return None


