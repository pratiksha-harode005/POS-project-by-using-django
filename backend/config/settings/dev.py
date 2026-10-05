import dj_database_url
from decouple import config
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

USE_SQLITE = config('USE_SQLITE', default=True, cast=bool)

if USE_SQLITE or not db_url:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
elif db_url:
    DATABASES = {
        'default': dj_database_url.parse(
            db_url,
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True
        )
    }
else:
    raise ValueError("Database configuration missing.")

# Fast password verification for local dev authentication
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]
