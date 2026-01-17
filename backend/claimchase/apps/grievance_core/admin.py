"""
Admin interface for grievance_core app.
Enhanced with Django Unfold for professional appearance.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.contrib import messages
from unfold.admin import ModelAdmin
from unfold.decorators import action, display
from .models import InsuranceCompany, Case, CaseTimeline, EmailTracking, Consent, Document


@admin.register(InsuranceCompany)
class InsuranceCompanyAdmin(ModelAdmin):
    """Admin for Insurance Company model."""
    
    list_display = (
        'name',
        'display_category',
        'grievance_email',
        'grievance_helpline',
        'display_status',
        'created_at',
    )
    list_filter = ('category', 'is_active', 'created_at')
    search_fields = ('name', 'grievance_email', 'gro_email')
    readonly_fields = ('created_at', 'updated_at')
    list_filter_submit = True  # Add apply button for filters
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('🏢 Basic Information', {
            'fields': ('name', 'category', 'is_active'),
            'classes': ['tab'],
        }),
        ('📞 Contact Details', {
            'fields': ('grievance_email', 'additional_emails', 'grievance_helpline', 'gro_email'),
            'classes': ['tab'],
        }),
        ('🌐 Additional Info', {
            'fields': ('website', 'correspondence_address'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )

    @display(description='Category', label={
        'life': 'success',
        'health': 'info', 
        'general': 'warning',
    })
    def display_category(self, obj):
        return obj.category

    @display(description='Status', label={
        True: 'success',
        False: 'danger',
    })
    def display_status(self, obj):
        return obj.is_active


@admin.register(Case)
class CaseAdmin(ModelAdmin):
    """Admin for Case model with enhanced actions and display."""
    
    list_display = (
        'case_number',
        'user_email',
        'display_status',
        'display_priority',
        'insurance_type',
        'display_ombudsman',
        'created_at',
    )
    list_filter = ('status', 'priority', 'insurance_type', 'is_escalated_to_ombudsman', 'created_at')
    list_filter_submit = True
    search_fields = ('case_number', 'user__email', 'policy_number', 'subject')
    readonly_fields = ('case_number', 'created_at', 'updated_at', 'submission_date', 'escalation_date')
    date_hierarchy = 'created_at'
    actions = ['mark_under_review', 'escalate_to_ombudsman', 'mark_resolved']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('📋 Case Info', {
            'fields': ('case_number', 'user', 'status', 'priority'),
            'classes': ['tab'],
        }),
        ('🏢 Insurance', {
            'fields': ('insurance_company', 'insurance_type', 'policy_number', 'insurance_company_name'),
            'classes': ['tab'],
        }),
        ('📝 Grievance', {
            'fields': ('subject', 'description', 'date_of_incident', 'date_of_rejection'),
            'classes': ['tab'],
        }),
        ('⚠️ Escalation', {
            'fields': ('is_escalated_to_ombudsman', 'escalation_date'),
            'classes': ['tab'],
        }),
        ('📧 Draft', {
            'fields': ('draft_content', 'submission_date'),
            'classes': ['tab'],
        }),
        ('✅ Resolution', {
            'fields': ('resolution_date', 'resolution_notes'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )
    
    def user_email(self, obj):
        if obj.user:
            return obj.user.email
        return '-'
    user_email.short_description = 'User'

    @display(description='Status', label={
        'draft': 'secondary',
        'submitted': 'info',
        'under_review': 'primary',
        'rejected': 'danger',
        'escalated_to_ombudsman': 'warning',
        'resolved': 'success',
        'closed': 'secondary',
    })
    def display_status(self, obj):
        return obj.status

    @display(description='Priority', label={
        'low': 'secondary',
        'medium': 'info',
        'high': 'warning',
        'urgent': 'danger',
    })
    def display_priority(self, obj):
        return obj.priority

    @display(description='Ombudsman', boolean=True)
    def display_ombudsman(self, obj):
        return obj.is_escalated_to_ombudsman

    @action(description='📋 Mark as Under Review')
    def mark_under_review(self, request, queryset):
        updated = queryset.update(status='under_review')
        self.message_user(request, f'{updated} case(s) marked as under review.', messages.SUCCESS)
    
    @action(description='⚠️ Escalate to Ombudsman')
    def escalate_to_ombudsman(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            is_escalated_to_ombudsman=True,
            status='escalated_to_ombudsman',
            escalation_date=timezone.now().date()
        )
        self.message_user(request, f'{updated} case(s) escalated to Ombudsman.', messages.WARNING)
    
    @action(description='✅ Mark as Resolved')
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(
            status='resolved',
            resolution_date=timezone.now().date()
        )
        self.message_user(request, f'{updated} case(s) marked as resolved.', messages.SUCCESS)


@admin.register(CaseTimeline)
class CaseTimelineAdmin(ModelAdmin):
    """Admin for CaseTimeline model."""
    
    list_display = ('case', 'display_event_type', 'description_short', 'created_by', 'created_at')
    list_filter = ('event_type', 'created_at')
    list_filter_submit = True
    search_fields = ('case__case_number', 'description')
    readonly_fields = ('case', 'created_at', 'created_by', 'event_type', 'description', 'old_value', 'new_value')
    
    @display(description='Event Type', label={
        'status_change': 'info',
        'document_added': 'success',
        'comment_added': 'primary',
        'escalation': 'warning',
        'resolution': 'success',
    })
    def display_event_type(self, obj):
        return obj.event_type
    
    def description_short(self, obj):
        return obj.description[:50] + '...' if len(obj.description) > 50 else obj.description
    description_short.short_description = 'Description'
    
    def has_add_permission(self, request):
        """Timeline events should only be created programmatically."""
        return False


@admin.register(EmailTracking)
class EmailTrackingAdmin(ModelAdmin):
    """Admin for EmailTracking model."""
    
    list_display = ('subject', 'case', 'display_email_type', 'display_status', 'from_email', 'to_email', 'created_at')
    list_filter = ('email_type', 'status', 'created_at')
    list_filter_submit = True
    search_fields = ('case__case_number', 'subject', 'from_email', 'to_email')
    readonly_fields = ('case', 'created_at', 'updated_at', 'sent_at', 'delivered_at')
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('📋 Case', {
            'fields': ('case',),
            'classes': ['tab'],
        }),
        ('✉️ Email Details', {
            'fields': ('from_email', 'to_email', 'cc_emails', 'subject', 'body'),
            'classes': ['tab'],
        }),
        ('📤 Status', {
            'fields': ('email_type', 'status', 'sent_at', 'delivered_at'),
            'classes': ['tab'],
        }),
        ('⏰ Metadata', {
            'fields': ('is_automated', 'created_by', 'created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )

    @display(description='Type', label={
        'inbound': 'info',
        'outbound': 'success',
    })
    def display_email_type(self, obj):
        return obj.email_type

    @display(description='Delivery Status', label={
        'pending': 'warning',
        'sent': 'info',
        'delivered': 'success',
        'bounced': 'warning',
        'failed': 'danger',
    })
    def display_status(self, obj):
        return obj.status


@admin.register(Consent)
class ConsentAdmin(ModelAdmin):
    """Admin for Consent model."""
    
    list_display = ('user_email', 'consent_type', 'case', 'display_active', 'given_at', 'revoked_at')
    list_filter = ('consent_type', 'is_given', 'given_at')
    list_filter_submit = True
    search_fields = ('user__email', 'case__case_number')
    readonly_fields = ('created_at', 'updated_at')
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('✅ Consent Details', {
            'fields': ('case', 'user', 'consent_type', 'is_given'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('given_at', 'revoked_at'),
            'classes': ['tab'],
        }),
        ('📝 Metadata', {
            'fields': ('ip_address', 'notes', 'created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    @display(description='Status', label={
        True: 'success',
        False: 'danger',
    })
    def display_active(self, obj):
        return obj.is_active


@admin.register(Document)
class DocumentAdmin(ModelAdmin):
    """Admin for Document model with actions."""
    
    list_display = (
        'file_name_display',
        'case_number_display',
        'document_type_display',
        'uploaded_by_email',
        'display_verified',
        'file_size_display',
        'created_at',
    )
    list_filter = ('document_type', 'is_verified', 'created_at')
    list_filter_submit = True
    search_fields = ('file_name', 'case__case_number', 'uploaded_by__email')
    readonly_fields = ('created_at', 'updated_at', 'verified_at', 'file_url')
    actions = ['verify_documents', 'unverify_documents']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('📄 Document', {
            'fields': ('case', 'file', 'file_name', 'document_type', 'description'),
            'classes': ['tab'],
        }),
        ('📊 File Info', {
            'fields': ('file_size', 'file_type', 'file_url'),
            'classes': ['tab'],
        }),
        ('✅ Verification', {
            'fields': ('is_verified', 'verified_by', 'verified_at'),
            'classes': ['tab'],
        }),
        ('⏰ Metadata', {
            'fields': ('uploaded_by', 'created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )
    
    def file_name_display(self, obj):
        return obj.file_name if obj.file_name else 'N/A'
    file_name_display.short_description = 'File Name'
    
    def case_number_display(self, obj):
        if obj.case and hasattr(obj.case, 'case_number'):
            return obj.case.case_number
        return 'N/A'
    case_number_display.short_description = 'Case'
    
    def document_type_display(self, obj):
        if obj.document_type:
            return obj.get_document_type_display()
        return 'N/A'
    document_type_display.short_description = 'Type'
    
    def uploaded_by_email(self, obj):
        if obj.uploaded_by and hasattr(obj.uploaded_by, 'email'):
            return obj.uploaded_by.email
        return 'N/A'
    uploaded_by_email.short_description = 'Uploaded By'
    
    @display(description='Verified', boolean=True)
    def display_verified(self, obj):
        return obj.is_verified
    
    def file_size_display(self, obj):
        if obj.file_size and obj.file_size > 0:
            size_mb = obj.file_size / (1024 * 1024)
            return f"{size_mb:.2f} MB"
        return '0 MB'
    file_size_display.short_description = 'Size'
    
    def file_url(self, obj):
        try:
            if obj.file and hasattr(obj.file, 'url'):
                url = obj.file.url
                if url:
                    return format_html('<a href="{}" target="_blank" class="text-primary-600 hover:underline">{}</a>', url, url[:50] + '...')
        except Exception:
            pass
        return 'N/A'
    file_url.short_description = 'File URL'

    @action(description='✅ Verify selected documents')
    def verify_documents(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(is_verified=True, verified_by=request.user, verified_at=timezone.now())
        self.message_user(request, f'{updated} document(s) verified.', messages.SUCCESS)
    
    @action(description='❌ Unverify selected documents')
    def unverify_documents(self, request, queryset):
        updated = queryset.update(is_verified=False, verified_by=None, verified_at=None)
        self.message_user(request, f'{updated} document(s) unverified.', messages.WARNING)
