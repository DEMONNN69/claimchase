"""
WSGI config for ClaimChase project.
Exposes the WSGI callable as a module-level variable.
Used by Gunicorn/uWSGI in production.
"""

import os
from django.core.wsgi import get_wsgi_application

# Set default settings module (override with environment variable in production)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'claimchase.settings.dev')

application = get_wsgi_application()
