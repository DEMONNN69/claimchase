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
    document_proxy,
    get_notifications,
    mark_notification_read,
    mark_all_notifications_read,
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
    path('documents/<int:document_id>/file/', document_proxy, name='document-proxy'),
    path('notifications/', get_notifications, name='notifications'),
    path('notifications/<int:notification_id>/read/', mark_notification_read, name='mark-notification-read'),
    path('notifications/mark-all-read/', mark_all_notifications_read, name='mark-all-notifications-read'),
    path('', include(router.urls)),
]
