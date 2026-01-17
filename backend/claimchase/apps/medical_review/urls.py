"""
URL patterns for Medical Review API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ReviewerProfileViewSet,
    ReviewAssignmentViewSet,
    DocumentReviewViewSet,
    AdminAssignmentView,
    AdminReviewersListView,
    AdminCaseReviewsView,
    CaseDocumentsForAssignmentView,
)

router = DefaultRouter()
router.register(r'profiles', ReviewerProfileViewSet, basename='reviewer-profile')
router.register(r'assignments', ReviewAssignmentViewSet, basename='review-assignment')
router.register(r'reviews', DocumentReviewViewSet, basename='document-review')

urlpatterns = [
    # ViewSet routes
    path('', include(router.urls)),
    
    # Admin routes
    path('admin/assign/', AdminAssignmentView.as_view(), name='admin-assign'),
    path('admin/reviewers/', AdminReviewersListView.as_view(), name='admin-reviewers'),
    path('admin/case/<int:case_id>/reviews/', AdminCaseReviewsView.as_view(), name='admin-case-reviews'),
    path('admin/case/<int:case_id>/documents/', CaseDocumentsForAssignmentView.as_view(), name='case-documents-for-assignment'),
]
