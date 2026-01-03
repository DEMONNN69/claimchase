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

urlpatterns = [
    path('', include(router.urls)),
]
