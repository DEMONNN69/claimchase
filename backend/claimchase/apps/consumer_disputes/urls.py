"""
URL configuration for Consumer Disputes API.
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    DisputeCategoryViewSet,
    EntityViewSet,
    ConsumerDisputeViewSet
)
from .expert_views import (
    ExpertProfileViewSet,
    DisputeAssignmentViewSet,
    DisputeDocumentReviewViewSet,
)

router = DefaultRouter()
router.register(r'dispute-categories', DisputeCategoryViewSet, basename='dispute-category')
router.register(r'entities', EntityViewSet, basename='entity')
router.register(r'consumer-disputes', ConsumerDisputeViewSet, basename='consumer-dispute')
router.register(r'disputes', ConsumerDisputeViewSet, basename='dispute')  # Alias for shorter URL

# Expert review endpoints
router.register(r'experts', ExpertProfileViewSet, basename='expert')
router.register(r'expert-assignments', DisputeAssignmentViewSet, basename='expert-assignment')
router.register(r'expert-document-reviews', DisputeDocumentReviewViewSet, basename='expert-document-review')

urlpatterns = [
    path('', include(router.urls)),
]
