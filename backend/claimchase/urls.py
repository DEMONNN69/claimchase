"""
Main URL configuration for ClaimChase Django project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from claimchase.apps.users.token_refresh_view import CookieTokenRefreshView

# Import webhook handler
from claimchase.apps.grievance_core.webhooks import gmail_webhook

# Import health check
from claimchase.health_check import health_check

urlpatterns = [
    # Health check (for Railway/Render monitoring)
    path('health/', health_check, name='health-check'),
    
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # Webhooks (outside /api/ prefix for cleaner URLs)
    path('webhooks/gmail/', gmail_webhook, name='gmail-webhook'),
    
    # JWT token refresh
    path('api/auth/token/refresh/', CookieTokenRefreshView.as_view(), name='token-refresh'),

    # App URLs
    path('api/', include('claimchase.apps.users.urls')),
    path('api/', include('claimchase.apps.grievance_core.urls')),
    path('api/', include('claimchase.apps.consumer_disputes.urls')),
    path('api/medical-review/', include('claimchase.apps.medical_review.urls')),
    path('api/', include('claimchase.apps.legal.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
