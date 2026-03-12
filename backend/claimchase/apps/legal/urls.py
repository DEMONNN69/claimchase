from django.urls import path
from .views import terms_view, privacy_view

urlpatterns = [
    path('legal/terms/', terms_view, name='legal-terms'),
    path('legal/privacy/', privacy_view, name='legal-privacy'),
]
