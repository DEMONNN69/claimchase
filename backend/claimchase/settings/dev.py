"""
Development-specific settings for ClaimChase.
Extends base.py with debug, logging, and development-friendly configurations.
"""

from pathlib import Path
from .base import *

DEBUG = True
ALLOWED_HOSTS = ['*']

# Use SQLite for development (no PostgreSQL required)
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
