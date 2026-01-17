# -*- coding: utf-8 -*-
"""
Base settings for ClaimChase Django project.
Configuration common to all environments (dev, prod, test).
"""

import os
from pathlib import Path
from decouple import config

# Build paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
APPS_DIR = BASE_DIR / "claimchase" / "apps"

# SECURITY
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG = config('DEBUG', default=False, cast=bool)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=lambda v: [s.strip() for s in v.split(',')])

# Django apps
INSTALLED_APPS = [
    'unfold',  # Modern admin UI - must be first
    'adminpanel.apps.UnfoldAdminConfig',  # Custom admin using Unfold
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Unfold contrib apps
    'unfold.contrib.filters',
    'unfold.contrib.forms',
    'unfold.contrib.inlines',
    
    # Third-party apps
    'rest_framework',
    'rest_framework.authtoken',
    'corsheaders',
    'drf_spectacular',
    'cloudinary_storage',
    'cloudinary',
    
    # Local apps
    'claimchase.apps.users.apps.UsersConfig',
    'claimchase.apps.grievance_core.apps.GrievanceCoreConfig',
    'claimchase.apps.consumer_disputes.apps.ConsumerDisputesConfig',
    'claimchase.apps.medical_review.apps.MedicalReviewConfig',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'claimchase.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'claimchase.wsgi.application'

# Database (override in dev.py/prod.py)
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': config('DB_NAME', default='claimchase_db'),
        'USER': config('DB_USER', default='postgres'),
        'PASSWORD': config('DB_PASSWORD', default='postgres'),
        'HOST': config('DB_HOST', default='localhost'),
        'PORT': config('DB_PORT', default='5432'),
    }
}

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static & Media files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [BASE_DIR / 'static']

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Auth
AUTH_USER_MODEL = 'users.CustomUser'

# REST Framework
REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.TokenAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# CORS
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:8080',
    cast=lambda v: [s.strip() for s in v.split(',')]
)

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# AWS S3 (optional, for document uploads)
AWS_ACCESS_KEY_ID = config('AWS_ACCESS_KEY_ID', default='')
AWS_SECRET_ACCESS_KEY = config('AWS_SECRET_ACCESS_KEY', default='')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='claimchase-documents')
AWS_S3_REGION_NAME = config('AWS_S3_REGION_NAME', default='us-east-1')
AWS_S3_CUSTOM_DOMAIN = config('AWS_S3_CUSTOM_DOMAIN', default=None)
AWS_DEFAULT_ACL = 'public-read'
AWS_QUERYSTRING_AUTH = False

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
        'file': {
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'logs' / 'claimchase.log',
        },
    },
    'root': {
        'handlers': ['console', 'file'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console', 'file'],
            'level': 'INFO',
            'propagate': False,
        },
        'claimchase': {
            'handlers': ['console', 'file'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}

# Google OAuth & Gmail Integration
GOOGLE_OAUTH_CLIENT_ID = config('GOOGLE_OAUTH_CLIENT_ID', default='')
GOOGLE_OAUTH_CLIENT_SECRET = config('GOOGLE_OAUTH_CLIENT_SECRET', default='')
GOOGLE_OAUTH_REDIRECT_URI = config('GOOGLE_OAUTH_REDIRECT_URI', default='http://localhost:8000/api/auth/gmail/callback/')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5173')

GMAIL_SCOPES = [
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
]

# Encryption key for storing sensitive tokens (use SECRET_KEY)
ENCRYPTION_KEY = SECRET_KEY[:32]  # First 32 chars of SECRET_KEY

# Cloudinary Configuration for Document Storage
CLOUDINARY_STORAGE = {
    'CLOUD_NAME': config('CLOUDINARY_CLOUD_NAME', default=''),
    'API_KEY': config('CLOUDINARY_API_KEY', default=''),
    'API_SECRET': config('CLOUDINARY_API_SECRET', default=''),
}

# Configure Cloudinary directly (needed for cloudinary.uploader and CloudinaryField)
import cloudinary
cloudinary.config(
    cloud_name=config('CLOUDINARY_CLOUD_NAME', default=''),
    api_key=config('CLOUDINARY_API_KEY', default=''),
    api_secret=config('CLOUDINARY_API_SECRET', default=''),
    secure=True
)

# Set Cloudinary as default file storage
DEFAULT_FILE_STORAGE = 'cloudinary_storage.storage.MediaCloudinaryStorage'

# Unfold Admin configuration
UNFOLD = {
    # Branding
    "SITE_TITLE": "ClaimChase",
    "SITE_HEADER": "ClaimChase",
    "SITE_SUBHEADER": "Insurance Grievance Management",
    "SITE_URL": "/",
    "SITE_SYMBOL": "gavel",
    
    # Features
    "SHOW_HISTORY": True,
    "SHOW_VIEW_ON_SITE": True,
    "SHOW_BACK_BUTTON": True,
    
    # Environment indicator
    "ENVIRONMENT": "claimchase.admin_callbacks.environment_callback",
    
    # Dashboard callback
    "DASHBOARD_CALLBACK": "claimchase.admin_callbacks.dashboard_callback",
    
    # App-specific dashboard callbacks
    "APPS": {
        "medical_review": {
            "DASHBOARD_CALLBACK": "claimchase.admin_callbacks.medical_review_dashboard_callback",
        },
        "consumer_disputes": {
            "DASHBOARD_CALLBACK": "claimchase.admin_callbacks.consumer_disputes_dashboard_callback",
        },
    },
    
    # Modern OKLCH Color Scheme - Professional Blue Theme
    "COLORS": {
        "base": {
            "50": "oklch(98% .01 250)",
            "100": "oklch(96% .015 250)",
            "200": "oklch(92% .02 250)",
            "300": "oklch(86% .025 250)",
            "400": "oklch(70% .03 250)",
            "500": "oklch(55% .04 250)",
            "600": "oklch(45% .04 250)",
            "700": "oklch(37% .04 250)",
            "800": "oklch(27% .03 250)",
            "900": "oklch(20% .025 250)",
            "950": "oklch(14% .02 250)",
        },
        "primary": {
            "50": "oklch(97% .02 250)",
            "100": "oklch(94% .05 250)",
            "200": "oklch(88% .09 250)",
            "300": "oklch(80% .14 250)",
            "400": "oklch(70% .18 250)",
            "500": "oklch(60% .22 250)",
            "600": "oklch(52% .22 250)",
            "700": "oklch(45% .2 250)",
            "800": "oklch(38% .16 250)",
            "900": "oklch(32% .12 250)",
            "950": "oklch(24% .09 250)",
        },
    },
    
    # Rounded borders for modern look
    "BORDER_RADIUS": "8px",
    
    # Sidebar configuration - Custom navigation only
    "SIDEBAR": {
        "show_search": True,
        "show_all_applications": False,  # Hide default app list, use custom navigation only
        "navigation": [
            # ══════════════════════════════════════════════════════════════
            # DASHBOARD
            # ══════════════════════════════════════════════════════════════
            {
                "title": "🏠 Dashboard",
                "separator": False,
                "collapsible": False,
                "items": [
                    {
                        "title": "Overview",
                        "icon": "dashboard",
                        "link": "/admin/",
                    },
                ],
            },
            # ══════════════════════════════════════════════════════════════
            # INSURANCE GRIEVANCES
            # ══════════════════════════════════════════════════════════════
            {
                "title": "🛡️ Insurance Grievances",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Cases",
                        "icon": "folder",
                        "link": "/admin/grievance_core/case/",
                        "badge": "claimchase.admin_callbacks.badge_callback_cases",
                        "badge_class": "bg-primary-600 text-white",
                    },
                    {
                        "title": "Documents",
                        "icon": "description",
                        "link": "/admin/grievance_core/document/",
                        "badge": "claimchase.admin_callbacks.badge_callback_documents",
                        "badge_class": "bg-amber-600 text-white",
                    },
                    {
                        "title": "Timeline",
                        "icon": "timeline",
                        "link": "/admin/grievance_core/casetimeline/",
                    },
                    {
                        "title": "Email Tracking",
                        "icon": "email",
                        "link": "/admin/grievance_core/emailtracking/",
                    },
                    {
                        "title": "Consents",
                        "icon": "verified",
                        "link": "/admin/grievance_core/consent/",
                    },
                    {
                        "title": "Insurance Companies",
                        "icon": "business",
                        "link": "/admin/grievance_core/insurancecompany/",
                    },
                ],
            },
            # ══════════════════════════════════════════════════════════════
            # CONSUMER DISPUTES
            # ══════════════════════════════════════════════════════════════
            {
                "title": "⚖️ Consumer Disputes",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Disputes",
                        "icon": "warning",
                        "link": "/admin/consumer_disputes/consumerdispute/",
                    },
                    {
                        "title": "Categories",
                        "icon": "category",
                        "link": "/admin/consumer_disputes/disputecategory/",
                    },
                    {
                        "title": "Entities",
                        "icon": "store",
                        "link": "/admin/consumer_disputes/entity/",
                    },
                    {
                        "title": "Dispute Documents",
                        "icon": "attachment",
                        "link": "/admin/consumer_disputes/disputedocument/",
                    },
                    {
                        "title": "Dispute Timeline",
                        "icon": "history",
                        "link": "/admin/consumer_disputes/disputetimeline/",
                    },
                ],
            },
            # ══════════════════════════════════════════════════════════════
            # MEDICAL REVIEW
            # ══════════════════════════════════════════════════════════════
            {
                "title": "🏥 Medical Review",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Assignments",
                        "icon": "assignment",
                        "link": "/admin/medical_review/reviewassignment/",
                        "badge": "claimchase.admin_callbacks.badge_callback_pending_reviews",
                        "badge_class": "bg-red-600 text-white",
                    },
                    {
                        "title": "Document Reviews",
                        "icon": "rate_review",
                        "link": "/admin/medical_review/documentreview/",
                    },
                    {
                        "title": "Reviewer Profiles",
                        "icon": "badge",
                        "link": "/admin/medical_review/medicalreviewerprofile/",
                    },
                    {
                        "title": "Statistics",
                        "icon": "analytics",
                        "link": "/admin/medical_review/reviewerstats/",
                    },
                ],
            },
            # ══════════════════════════════════════════════════════════════
            # USER MANAGEMENT
            # ══════════════════════════════════════════════════════════════
            {
                "title": "👥 User Management",
                "separator": True,
                "collapsible": True,
                "items": [
                    {
                        "title": "Users",
                        "icon": "people",
                        "link": "/admin/users/customuser/",
                        "badge": "claimchase.admin_callbacks.badge_callback_users",
                        "badge_class": "bg-emerald-600 text-white",
                    },
                ],
            },
        ],
    },
}