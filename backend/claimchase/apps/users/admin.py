"""
Users app admin interface.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import CustomUser


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin):
    """Admin for CustomUser model."""
    
    list_display = ('email', 'get_full_name', 'phone', 'insurance_company', 'problem_type', 'role', 'is_verified', 'is_active', 'created_at')
    list_filter = ('role', 'is_verified', 'is_ombudsman_eligible', 'is_active', 'created_at')
    search_fields = ('email', 'username', 'first_name', 'last_name', 'phone', 'insurance_company__name')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Contact Info', {
            'fields': ('phone', 'address', 'city', 'state', 'postal_code')
        }),
        ('Personal Info', {
            'fields': ('date_of_birth', 'gender')
        }),
        ('Profile', {
            'fields': ('role', 'is_verified', 'is_ombudsman_eligible', 'document_count', 'case_count')
        }),
        ('Grievance Details', {
            'fields': ('insurance_company', 'problem_type'),
            'description': 'Insurance company and problem type selected during onboarding'
        }),
        ('Metadata', {
            'fields': ('last_login_ip', 'created_at', 'updated_at')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at', 'document_count', 'case_count')
