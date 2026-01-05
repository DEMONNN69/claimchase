"""
URLs for grievance_core app API endpoints.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InsuranceCompanyViewSet,
    CaseViewSet,
    CaseTimelineViewSet,
    EmailTrackingViewSet,
    get_insurance_types,
)

# Create router and register viewsets
router = DefaultRouter()
router.register(r'insurance-companies', InsuranceCompanyViewSet, basename='insurance-company')
router.register(r'cases', CaseViewSet, basename='case')
router.register(r'timeline', CaseTimelineViewSet, basename='timeline')
router.register(r'emails', EmailTrackingViewSet, basename='email')

app_name = 'grievance_core'

urlpatterns = [
    path('insurance-types/', get_insurance_types, name='insurance-types'),
    path('', include(router.urls)),
]
