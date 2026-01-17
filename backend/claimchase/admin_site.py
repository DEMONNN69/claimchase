"""
Custom AdminSite with organized sidebar navigation using Unfold.
This custom site simply initializes Unfold with the configured sidebar from settings.
"""

from django.contrib import admin
from unfold.sites import UnfoldAdminSite


class ClaimChaseAdminSite(UnfoldAdminSite):
    """Custom admin site - inherits all sidebar configuration from UNFOLD settings."""
    
    site_header = "🛡️ ClaimChase Admin"
    site_title = "ClaimChase Administration"
    index_title = "Welcome to ClaimChase"

