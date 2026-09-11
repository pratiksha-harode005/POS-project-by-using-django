<<<<<<< HEAD
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from apps.users.serializers import UserSerializer


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
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data
=======
from .serializers import CustomTokenObtainPairSerializer

__all__ = ['CustomTokenObtainPairSerializer']
>>>>>>> 6bd518d77d16e53fe63b3e45feb177424be96d52
