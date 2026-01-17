"""
Admin interface for grievance_core app.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from .models import InsuranceCompany, Case, CaseTimeline, EmailTracking, Consent, Document


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(admin.ModelAdmin):
    """Admin for Insurance Company model."""
    
    list_display = (
        'name',
        'category_badge',
        'grievance_email',
        'grievance_helpline',
        'is_active',
        'created_at',
    )
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('name', 'grievance_email', 'gro_email')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'category', 'is_active')
        }),
        ('Contact Details', {
            'fields': ('grievance_email', 'additional_emails', 'grievance_helpline', 'gro_email')
        }),
        ('Additional Information', {
            'fields': ('website', 'correspondence_address')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def category_badge(self, obj):
        """Display category with badge."""
        colors = {
            'life': '#4CAF50',
            'health': '#2196F3',
            'general': '#FF9800',
        }
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px; font-weight: bold;">{}</span>',
            colors.get(obj.category, '#999'),
            obj.get_category_display()
        )
    category_badge.short_description = 'Category'


@admin.register(Case)
class CaseAdmin(admin.ModelAdmin):
    """Admin for Case model."""
    
    list_display = (
        'case_number',
        'user_email',
        'status_badge',
        'priority',
        'insurance_type',
        'ombudsman_status',
        'created_at',
    )
    list_filter = ('status', 'priority', 'insurance_type', 'is_escalated_to_ombudsman', 'created_at')
    search_fields = ('case_number', 'user__email', 'policy_number', 'subject')
    readonly_fields = ('case_number', 'created_at', 'updated_at', 'submission_date', 'escalation_date')
    
    fieldsets = (
        ('Case Metadata', {
            'fields': ('case_number', 'user', 'status', 'priority')
        }),
        ('Insurance Details', {
            'fields': ('insurance_company', 'insurance_type', 'policy_number', 'insurance_company_name')
        }),
        ('Grievance Details', {
            'fields': ('subject', 'description', 'date_of_incident', 'date_of_rejection')
        }),
        ('Escalation', {
            'fields': ('is_escalated_to_ombudsman', 'escalation_date')
        }),
        ('Draft & Submission', {
            'fields': ('draft_content', 'submission_date')
        }),
        ('Resolution', {
            'fields': ('resolution_date', 'resolution_notes')
        }),
        ('Metadata', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        """Display user email safely."""
        if obj.user:
            return obj.user.email
        return '-'
    user_email.short_description = 'User Email'
    
    def status_badge(self, obj):
        """Display status with colored badge."""
        if not obj.status:
            return '-'
        colors = {
            'draft': '#FFA500',
            'submitted': '#0099FF',
            'under_review': '#9900FF',
            'rejected': '#FF0000',
            'escalated_to_ombudsman': '#FF6600',
            'resolved': '#00AA00',
            'closed': '#666666',
        }
        color = colors.get(obj.status, '#000000')
        display = obj.get_status_display() or obj.status
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            display
        )
    status_badge.short_description = 'Status'
    
    def ombudsman_status(self, obj):
        """Display ombudsman escalation status."""
        if obj.is_escalated_to_ombudsman:
            return mark_safe('<span style="color: green;">✓ Escalated</span>')
        return mark_safe('<span style="color: gray;">—</span>')
    ombudsman_status.short_description = 'Ombudsman'


@admin.register(CaseTimeline)
class CaseTimelineAdmin(admin.ModelAdmin):
    """Admin for CaseTimeline model."""
    
    list_display = ('case', 'event_type', 'description_short', 'created_by', 'created_at')
    list_filter = ('event_type', 'created_at')
    search_fields = ('case__case_number', 'description')
    readonly_fields = ('case', 'created_at', 'created_by', 'event_type', 'description', 'old_value', 'new_value')
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'
    
    def has_add_permission(self, request):
        """Timeline events should only be created programmatically."""
        return False


@admin.register(EmailTracking)
class EmailTrackingAdmin(admin.ModelAdmin):
    """Admin for EmailTracking model."""
    
    list_display = ('subject', 'case', 'email_type_badge', 'status_badge', 'from_email', 'to_email', 'created_at')
    list_filter = ('email_type', 'status', 'created_at')
    search_fields = ('case__case_number', 'subject', 'from_email', 'to_email')
    readonly_fields = ('case', 'created_at', 'updated_at', 'sent_at', 'delivered_at')
    
    fieldsets = (
        ('Case Association', {
            'fields': ('case',)
        }),
        ('Email Details', {
            'fields': ('from_email', 'to_email', 'cc_emails', 'subject', 'body')
        }),
        ('Status', {
            'fields': ('email_type', 'status', 'sent_at', 'delivered_at')
        }),
        ('Metadata', {
            'fields': ('is_automated', 'created_by', 'created_at', 'updated_at')
        }),
    )
    
    def email_type_badge(self, obj):
        color = '#0099FF' if obj.email_type == 'inbound' else '#00AA00'
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_email_type_display()
        )
    email_type_badge.short_description = 'Type'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#FFA500',
            'sent': '#0099FF',
            'delivered': '#00AA00',
            'bounced': '#FF6600',
            'failed': '#FF0000',
        }
        color = colors.get(obj.status, '#000000')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 10px; border-radius: 3px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Delivery Status'


@admin.register(Consent)
class ConsentAdmin(admin.ModelAdmin):
    """Admin for Consent model."""
    
    list_display = ('user_email', 'consent_type', 'case', 'is_active_badge', 'given_at', 'revoked_at')
    list_filter = ('consent_type', 'is_given', 'given_at')
    search_fields = ('user__email', 'case__case_number')
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Consent Details', {
            'fields': ('case', 'user', 'consent_type', 'is_given')
        }),
        ('Timestamps', {
            'fields': ('given_at', 'revoked_at')
        }),
        ('Metadata', {
            'fields': ('ip_address', 'notes', 'created_at', 'updated_at')
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def is_active_badge(self, obj):
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Active</span>')
        return format_html('<span style="color: red;">✗ Revoked</span>')
    is_active_badge.short_description = 'Status'


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Admin for Document model."""
    
    list_display = (
        'file_name_display',
        'case_number_display',
        'document_type_display',
        'uploaded_by_email',
        'is_verified_badge',
        'file_size_display',
        'created_at',
    )
    list_filter = ('document_type', 'is_verified', 'created_at')
    search_fields = ('file_name', 'case__case_number', 'uploaded_by__email')
    readonly_fields = ('created_at', 'updated_at', 'verified_at', 'file_url')
    
    fieldsets = (
        ('Document Details', {
            'fields': ('case', 'file', 'file_name', 'document_type', 'description')
        }),
        ('File Metadata', {
            'fields': ('file_size', 'file_type', 'file_url')
        }),
        ('Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_at')
        }),
        ('Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at')
        }),
    )
    
    def file_name_display(self, obj):
        """Display file name safely."""
        return obj.file_name if obj.file_name else 'N/A'
    file_name_display.short_description = 'File Name'
    
    def case_number_display(self, obj):
        """Display case number safely."""
        if obj.case and hasattr(obj.case, 'case_number'):
            return obj.case.case_number
        return 'N/A'
    case_number_display.short_description = 'Case'
    
    def document_type_display(self, obj):
        """Display document type safely."""
        if obj.document_type:
            return obj.get_document_type_display()
        return 'N/A'
    document_type_display.short_description = 'Type'
    
    def uploaded_by_email(self, obj):
        if obj.uploaded_by and hasattr(obj.uploaded_by, 'email'):
            return obj.uploaded_by.email
        return 'N/A'
    uploaded_by_email.short_description = 'Uploaded By'
    
    def is_verified_badge(self, obj):
        if obj.is_verified:
            return mark_safe('<span style="color: green;">✓ Verified</span>')
        return mark_safe('<span style="color: gray;">—</span>')
    is_verified_badge.short_description = 'Verified'
    
    def file_size_display(self, obj):
        """Display file size in human-readable format."""
        if obj.file_size and obj.file_size > 0:
            size_mb = obj.file_size / (1024 * 1024)
            return f"{size_mb:.2f} MB"
        return '0 MB'
    file_size_display.short_description = 'Size'
    
    def file_url(self, obj):
        """Display file URL as a link."""
        try:
            if obj.file and hasattr(obj.file, 'url'):
                url = obj.file.url
                if url:
                    return format_html('<a href="{}" target="_blank">{}</a>', url, url)
        except Exception:
            pass
        return 'N/A'
    file_url.short_description = 'File URL'
