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

router = DefaultRouter()
router.register(r'dispute-categories', DisputeCategoryViewSet, basename='dispute-category')
router.register(r'entities', EntityViewSet, basename='entity')
router.register(r'consumer-disputes', ConsumerDisputeViewSet, basename='consumer-dispute')

urlpatterns = [
    path('', include(router.urls)),
]
