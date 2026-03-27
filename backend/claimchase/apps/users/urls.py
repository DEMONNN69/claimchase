"""
URLs for users app API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AuthViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')

app_name = 'users'

# Custom URL patterns 
urlpatterns = [
    # Include router URLs first (generates /auth/login/, /auth/signup/, /auth/profile/, etc.)
    path('', include(router.urls)),
    
    # Gmail OAuth endpoints with custom paths (override if needed)
    path('auth/gmail/connect/', AuthViewSet.as_view({'get': 'gmail_connect'}), name='auth-gmail-connect-custom'),
    path('auth/gmail/callback/', AuthViewSet.as_view({'get': 'gmail_callback', 'post': 'gmail_callback'}), name='auth-gmail-callback-custom'),
    path('auth/gmail/disconnect/', AuthViewSet.as_view({'post': 'gmail_disconnect'}), name='auth-gmail-disconnect-custom'),

    # Google Login (SSO)
    path('auth/google/connect/', AuthViewSet.as_view({'get': 'google_connect'}), name='auth-google-connect'),
    path('auth/google/callback/', AuthViewSet.as_view({'post': 'google_callback'}), name='auth-google-callback'),
]
