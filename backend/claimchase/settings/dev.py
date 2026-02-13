"""
Development-specific settings for ClaimChase.
Extends base.py with debug, logging, and development-friendly configurations.
"""

from pathlib import Path
from .base import *
from .base import UNFOLD  # Explicitly import UNFOLD
import dj_database_url

DEBUG = True
ALLOWED_HOSTS = ['*']

# Use DATABASE_URL environment variable if set (for Neon DB), otherwise use SQLite
database_url = config('DATABASE_URL', default='')

if database_url:
    # Use Neon PostgreSQL from .env
    DATABASES = {
        'default': dj_database_url.config(
            default=database_url,
            conn_max_age=600,
            ssl_require=True
        )
    }
else:
    # Use SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# Verbose logging for development
LOGGING['loggers']['claimchase']['level'] = 'DEBUG'

# Email backend for development (console output)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# Disable secure cookies in development
SECURE_SSL_REDIRECT = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

# Allow all origins in development
CORS_ALLOWED_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]

CSRF_TRUSTED_ORIGINS = [
    'http://localhost:8080',
    'http://127.0.0.1:8080',
]
