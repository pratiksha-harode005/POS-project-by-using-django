import dj_database_url
from decouple import config
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

db_url = config('Database_URL', default='')

if db_url:
    DATABASES = {
        'default': dj_database_url.parse(
            db_url,
            # PERFORMANCE FIX: conn_max_age enables persistent PostgreSQL connections.
            conn_max_age=600,
            conn_health_checks=True,
            ssl_require=True
        )
    }
else:
    raise ValueError("Database_URL environment variable is missing. Failing loudly as requested.")

# Fast password verification for local dev authentication
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
]
