"""
Production-specific settings for ClaimChase.
Extends base.py with security, performance, and production configurations.
"""

from .base import *
import dj_database_url

DEBUG = False

# Parse DATABASE_URL from Railway/Render
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=''),
        conn_max_age=600,
        ssl_require=True
    )
}

# Allow Railway/Render domains
ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    default='.up.railway.app,.onrender.com',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

# Security settings (SSL handled by Railway/Render proxy)
SECURE_SSL_REDIRECT = False  # Railway handles SSL
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
X_FRAME_OPTIONS = 'DENY'
SECURE_CONTENT_TYPE_NOSNIFF = True

# CORS (parse from environment)
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()]
)

# CSRF trusted origins (for Railway/Render + frontend)
CSRF_TRUSTED_ORIGINS = config(
    'CSRF_TRUSTED_ORIGINS',
    default='',
    cast=lambda v: [s.strip() for s in v.split(',') if s.strip()]
)

# Email backend for production (use SendGrid, AWS SES, etc.)
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = True
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# Static files with WhiteNoise
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Logging for production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'claimchase': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# S3 storage (if using AWS)
if config('USE_S3', default=False, cast=bool):
    STORAGES = {
        'default': {
            'BACKEND': 'storages.backends.s3boto3.S3Boto3Storage',
            'OPTIONS': {
                'bucket_name': AWS_STORAGE_BUCKET_NAME,
                'region_name': AWS_S3_REGION_NAME,
            },
        },
        'staticfiles': {
            'BACKEND': 'storages.backends.s3boto3.S3StaticStorage',
            'OPTIONS': {
                'bucket_name': AWS_STORAGE_BUCKET_NAME,
                'region_name': AWS_S3_REGION_NAME,
            },
        },
    }

# Sentry for error tracking (optional)
if config('USE_SENTRY', default=False, cast=bool):
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration

    sentry_sdk.init(
        dsn=config('SENTRY_DSN', default=''),
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=False,
    )
