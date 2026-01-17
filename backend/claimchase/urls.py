"""
Main URL configuration for ClaimChase Django project.
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

# Import custom admin site and replace the default
from claimchase.admin_site import ClaimChaseAdminSite

# Replace default admin site with our custom one
admin.site.__class__ = ClaimChaseAdminSite

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/', include('claimchase.apps.users.urls')),
    path('api/', include('claimchase.apps.grievance_core.urls')),
    path('api/', include('claimchase.apps.consumer_disputes.urls')),
    path('api/medical-review/', include('claimchase.apps.medical_review.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
