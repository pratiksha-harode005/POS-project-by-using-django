from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Use DATABASE_URL from .env
import dj_database_url
from decouple import config

DATABASES = {
    'default': dj_database_url.parse(
        config('Database_URL', default='sqlite:///db.sqlite3'),
        conn_max_age=600
    )
}
