import os
import dj_database_url
from decouple import config
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Use rock-solid local database with all synchronized data to prevent Render SSL drops and connection refusal
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
