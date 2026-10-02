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
            # With conn_max_age=0 (previous value), every API request opened a new TCP
            # connection to PostgreSQL — adding 50-200ms per request.
            # conn_max_age=60 reuses connections for up to 60 seconds.
            conn_max_age=60,
            conn_health_checks=True,
        )
    }
else:
    raise ValueError("Database_URL environment variable is missing. Failing loudly as requested.")




