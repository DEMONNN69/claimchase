"""
Admin configuration for Medical Review.
Enhanced with Django Unfold for professional appearance.
"""

from django.contrib import admin
from django.contrib import messages
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from unfold.admin import ModelAdmin
from unfold.decorators import action, display

from .models import (
    MedicalReviewerProfile,
    ReviewAssignment,
    AssignmentDocument,
    DocumentReview,
    ReviewerStats,
)
from .forms import ReviewAssignmentAdminForm


# ==================== Inlines ====================

class AssignmentDocumentInline(admin.TabularInline):
    """Inline for documents in an assignment"""
    model = AssignmentDocument
    extra = 1
    raw_id_fields = ['document']
    readonly_fields = ['document_link', 'added_at']
    fields = ['document', 'document_link', 'added_at']
    verbose_name = "Document to Review"
    verbose_name_plural = "Documents to Review"
    
    def get_formset(self, request, obj=None, **kwargs):
        """Store the parent assignment in the request for reference"""
        formset = super().get_formset(request, obj, **kwargs)
        if obj and obj.case:
            # Store case info in formset for use in help text
            formset._case_number = obj.case.case_number
            formset._case_doc_count = obj.case.documents.count()
        return formset
    
    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        """Filter documents based on the parent assignment's case"""
        if db_field.name == "document":
            # Get the assignment ID from the URL
            parent_obj_id = request.resolver_match.kwargs.get('object_id')
            
            if parent_obj_id:
                try:
                    from .models import ReviewAssignment
                    from claimchase.apps.grievance_core.models import Document
                    
                    assignment = ReviewAssignment.objects.get(pk=parent_obj_id)
                    
                    # Filter to only documents from this case
                    kwargs["queryset"] = Document.objects.filter(
                        case=assignment.case
                    )
                    
                except ReviewAssignment.DoesNotExist:
                    from claimchase.apps.grievance_core.models import Document
                    kwargs["queryset"] = Document.objects.none()
            else:
                from claimchase.apps.grievance_core.models import Document
                kwargs["queryset"] = Document.objects.none()
        
        return super().formfield_for_foreignkey(db_field, request, **kwargs)
    
    def document_link(self, obj):
        if obj.document and obj.document.file:
            return format_html(
                '<a href="{}" target="_blank" class="text-primary-600 hover:underline">📄 View</a>',
                obj.document.file.url
            )
        return '-'
    document_link.short_description = 'View'


class DocumentReviewInline(admin.TabularInline):
    """Inline for reviews in an assignment"""
    model = DocumentReview
    extra = 0
    readonly_fields = ['reviewer', 'assignment_document', 'outcome_display', 'comments', 'created_at']
    fields = ['assignment_document', 'reviewer', 'outcome_display', 'comments', 'created_at']
    can_delete = False
    
    def outcome_display(self, obj):
        colors = {
            'approved': 'bg-green-100 text-green-800',
            'rejected': 'bg-red-100 text-red-800',
            'needs_more_info': 'bg-amber-100 text-amber-800',
        }
        css = colors.get(obj.outcome, 'bg-gray-100 text-gray-800')
        return format_html(
            '<span class="px-2 py-1 rounded-full text-xs font-medium {}">{}</span>',
            css,
            obj.get_outcome_display()
        )
    outcome_display.short_description = 'Outcome'


# ==================== Model Admins ====================

@admin.register(MedicalReviewerProfile)
class MedicalReviewerProfileAdmin(ModelAdmin):
    """Admin for medical reviewer profiles"""
    
    list_display = [
        'full_name', 'user_email', 'specialization_display', 
        'years_of_experience', 'display_onboarded', 'display_available', 'created_at'
    ]
    list_filter = ['specialization', 'is_onboarded', 'is_available']
    list_filter_submit = True
    search_fields = ['full_name', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']
    actions = ['make_available', 'make_unavailable']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('👤 User', {
            'fields': ('user',),
            'classes': ['tab'],
        }),
        ('📋 Profile', {
            'fields': ('full_name', 'specialization', 'other_specialization', 'years_of_experience'),
            'classes': ['tab'],
        }),
        ('🔘 Status', {
            'fields': ('is_onboarded', 'is_available'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    
    def specialization_display(self, obj):
        return obj.display_specialization
    specialization_display.short_description = 'Specialization'

    @display(description='Onboarded', boolean=True)
    def display_onboarded(self, obj):
        return obj.is_onboarded

    @display(description='Available', boolean=True)
    def display_available(self, obj):
        return obj.is_available

    @action(description='✅ Make available for assignments')
    def make_available(self, request, queryset):
        updated = queryset.update(is_available=True)
        self.message_user(request, f'{updated} reviewer(s) marked as available.', messages.SUCCESS)

    @action(description='⏸️ Make unavailable for assignments')
    def make_unavailable(self, request, queryset):
        updated = queryset.update(is_available=False)
        self.message_user(request, f'{updated} reviewer(s) marked as unavailable.', messages.WARNING)


@admin.register(ReviewAssignment)
class ReviewAssignmentAdmin(ModelAdmin):
    """Admin for review assignments"""
    
    form = ReviewAssignmentAdminForm
    
    list_display = [
        'id', 'case_number', 'reviewer_name', 'display_status',
        'document_count', 'reviewed_count', 'assigned_at'
    ]
    list_filter = ['status', 'assigned_at']
    list_filter_submit = True
    search_fields = ['case__case_number', 'reviewer__email', 'reviewer__first_name']
    readonly_fields = ['assigned_at', 'started_at', 'completed_at', 'document_count', 'reviewed_count']
    raw_id_fields = ['case', 'reviewer', 'assigned_by']
    inlines = [DocumentReviewInline]
    date_hierarchy = 'assigned_at'
    actions = ['mark_pending', 'mark_in_progress', 'mark_completed']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    class Media:
        js = ('admin/js/jquery.init.js',)  # Required for FilteredSelectMultiple
    
    fieldsets = (
        ('📋 Assignment', {
            'fields': ('case', 'reviewer', 'assigned_by', 'status'),
            'classes': ['tab'],
        }),
        ('📎 Documents to Review', {
            'fields': ('documents',),
            'classes': ['tab'],
            'description': 'Select documents from the case for review. Save the assignment first if no documents appear.',
        }),
        ('📝 Notes', {
            'fields': ('admin_notes',),
            'classes': ['tab'],
        }),
        ('📊 Progress', {
            'fields': ('document_count', 'reviewed_count'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('assigned_at', 'started_at', 'completed_at'),
            'classes': ['tab'],
        }),
    )
    
    def save_related(self, request, form, formsets, change):
        """Override to ensure documents are saved properly."""
        super().save_related(request, form, formsets, change)
        # Call the form's custom document processing
        if hasattr(form, '_save_documents'):
            form._save_documents()
    
    def case_number(self, obj):
        return obj.case.case_number
    case_number.short_description = 'Case'
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Reviewer'

    @display(description='Status', label={
        'pending': 'secondary',
        'in_progress': 'info',
        'completed': 'success',
        'needs_more_info': 'warning',
    })
    def display_status(self, obj):
        return obj.status

    @action(description='⏳ Mark as Pending')
    def mark_pending(self, request, queryset):
        updated = queryset.update(status='pending', started_at=None, completed_at=None)
        self.message_user(request, f'{updated} assignment(s) marked as pending.', messages.INFO)

    @action(description='🔄 Mark as In Progress')
    def mark_in_progress(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='in_progress', started_at=timezone.now())
        self.message_user(request, f'{updated} assignment(s) marked as in progress.', messages.INFO)

    @action(description='✅ Mark as Completed')
    def mark_completed(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='completed', completed_at=timezone.now())
        self.message_user(request, f'{updated} assignment(s) marked as completed.', messages.SUCCESS)


@admin.register(DocumentReview)
class DocumentReviewAdmin(ModelAdmin):
    """Admin for document reviews"""
    
    list_display = [
        'id', 'document_name', 'reviewer_name', 'display_outcome',
        'case_number', 'created_at'
    ]
    list_filter = ['outcome', 'created_at']
    list_filter_submit = True
    search_fields = [
        'assignment__case__case_number',
        'reviewer__email',
        'assignment_document__document__file_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['assignment', 'assignment_document', 'reviewer']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('📋 Review', {
            'fields': ('assignment', 'assignment_document', 'reviewer'),
            'classes': ['tab'],
        }),
        ('✅ Outcome', {
            'fields': ('outcome', 'comments', 'additional_info_requested'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )
    
    def document_name(self, obj):
        return obj.assignment_document.document.file_name
    document_name.short_description = 'Document'
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Reviewer'
    
    def case_number(self, obj):
        return obj.assignment.case.case_number
    case_number.short_description = 'Case'

    @display(description='Outcome', label={
        'approved': 'success',
        'rejected': 'danger',
        'needs_more_info': 'warning',
    })
    def display_outcome(self, obj):
        return obj.outcome


@admin.register(ReviewerStats)
class ReviewerStatsAdmin(ModelAdmin):
    """Admin for reviewer statistics (read-only)"""
    
    list_display = [
        'reviewer_name', 'total_assignments', 'pending_assignments',
        'completed_assignments', 'total_documents_reviewed',
        'display_approval_rate', 'avg_review_time_hours', 'last_updated'
    ]
    readonly_fields = [
        'reviewer', 'total_assignments', 'pending_assignments',
        'completed_assignments', 'total_documents_reviewed',
        'approved_count', 'rejected_count', 'needs_info_count',
        'avg_review_time_hours', 'last_updated'
    ]
    list_filter_submit = True
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Reviewer'
    
    def display_approval_rate(self, obj):
        if obj.total_documents_reviewed > 0:
            rate = (obj.approved_count / obj.total_documents_reviewed) * 100
            if rate >= 80:
                color = 'text-green-600'
            elif rate >= 60:
                color = 'text-amber-600'
            else:
                color = 'text-red-600'
            return format_html('<span class="font-semibold {}">{:.1f}%</span>', color, rate)
        return "N/A"
    display_approval_rate.short_description = 'Approval Rate'
    
    def has_add_permission(self, request):
        return False  # Stats are auto-generated
    
    def has_delete_permission(self, request, obj=None):
        return False
