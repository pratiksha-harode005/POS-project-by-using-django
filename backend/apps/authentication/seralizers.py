from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.users.serializers import UserSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        if user.vendor_id_code:
            token['vendor_id_code'] = user.vendor_id_code
        return token

    def validate(self, attrs):
        username = attrs.get(self.username_field)
        if username and '@' in username:
            try:
                user_obj = User.objects.get(email=username)
                attrs[self.username_field] = user_obj.username
            except User.DoesNotExist:
                pass

        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
