"""
Admin configuration for Medical Review.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe

from .models import (
    MedicalReviewerProfile,
    ReviewAssignment,
    AssignmentDocument,
    DocumentReview,
    ReviewerStats,
)


# ==================== Inlines ====================

class AssignmentDocumentInline(admin.TabularInline):
    """Inline for documents in an assignment"""
    model = AssignmentDocument
    extra = 1
    raw_id_fields = ['document']
    readonly_fields = ['document_link', 'added_at']
    fields = ['document', 'document_link', 'added_at']
    
    def document_link(self, obj):
        if obj.document and obj.document.file:
            return format_html(
                '<a href="{}" target="_blank">View Document</a>',
                obj.document.file.url
            )
        return '-'
    document_link.short_description = 'View'


class DocumentReviewInline(admin.TabularInline):
    """Inline for reviews in an assignment"""
    model = DocumentReview
    extra = 0
    readonly_fields = ['reviewer', 'assignment_document', 'outcome_badge', 'comments', 'created_at']
    fields = ['assignment_document', 'reviewer', 'outcome_badge', 'comments', 'created_at']
    can_delete = False
    
    def outcome_badge(self, obj):
        colors = {
            'approved': '#10b981',
            'rejected': '#ef4444',
            'needs_more_info': '#f59e0b',
        }
        color = colors.get(obj.outcome, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_outcome_display()
        )
    outcome_badge.short_description = 'Outcome'


# ==================== Model Admins ====================

@admin.register(MedicalReviewerProfile)
class MedicalReviewerProfileAdmin(admin.ModelAdmin):
    """Admin for medical reviewer profiles"""
    
    list_display = [
        'full_name', 'user_email', 'specialization_display', 
        'years_of_experience', 'is_onboarded', 'is_available', 'created_at'
    ]
    list_filter = ['specialization', 'is_onboarded', 'is_available']
    search_fields = ['full_name', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user']
    
    fieldsets = (
        ('User', {
            'fields': ('user',)
        }),
        ('Profile', {
            'fields': ('full_name', 'specialization', 'other_specialization', 'years_of_experience')
        }),
        ('Status', {
            'fields': ('is_onboarded', 'is_available')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'Email'
    
    def specialization_display(self, obj):
        return obj.display_specialization
    specialization_display.short_description = 'Specialization'


@admin.register(ReviewAssignment)
class ReviewAssignmentAdmin(admin.ModelAdmin):
    """Admin for review assignments"""
    
    list_display = [
        'id', 'case_number', 'reviewer_name', 'status_badge',
        'document_count', 'reviewed_count', 'assigned_at'
    ]
    list_filter = ['status', 'assigned_at']
    search_fields = ['case__case_number', 'reviewer__email', 'reviewer__first_name']
    readonly_fields = ['assigned_at', 'started_at', 'completed_at', 'document_count', 'reviewed_count']
    raw_id_fields = ['case', 'reviewer', 'assigned_by']
    inlines = [AssignmentDocumentInline, DocumentReviewInline]
    
    fieldsets = (
        ('Assignment', {
            'fields': ('case', 'reviewer', 'assigned_by', 'status')
        }),
        ('Notes', {
            'fields': ('admin_notes',)
        }),
        ('Progress', {
            'fields': ('document_count', 'reviewed_count')
        }),
        ('Timestamps', {
            'fields': ('assigned_at', 'started_at', 'completed_at'),
            'classes': ('collapse',)
        }),
    )
    
    def case_number(self, obj):
        return obj.case.case_number
    case_number.short_description = 'Case'
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Reviewer'
    
    def status_badge(self, obj):
        colors = {
            'pending': '#6b7280',
            'in_progress': '#3b82f6',
            'completed': '#10b981',
            'needs_more_info': '#f59e0b',
        }
        color = colors.get(obj.status, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_badge.short_description = 'Status'
    
    actions = ['mark_completed']
    
    @admin.action(description='Mark selected assignments as completed')
    def mark_completed(self, request, queryset):
        from django.utils import timezone
        queryset.update(status='completed', completed_at=timezone.now())


@admin.register(DocumentReview)
class DocumentReviewAdmin(admin.ModelAdmin):
    """Admin for document reviews"""
    
    list_display = [
        'id', 'document_name', 'reviewer_name', 'outcome_badge',
        'case_number', 'created_at'
    ]
    list_filter = ['outcome', 'created_at']
    search_fields = [
        'assignment__case__case_number',
        'reviewer__email',
        'assignment_document__document__file_name'
    ]
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['assignment', 'assignment_document', 'reviewer']
    
    fieldsets = (
        ('Review', {
            'fields': ('assignment', 'assignment_document', 'reviewer')
        }),
        ('Outcome', {
            'fields': ('outcome', 'comments', 'additional_info_requested')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
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
    
    def outcome_badge(self, obj):
        colors = {
            'approved': '#10b981',
            'rejected': '#ef4444',
            'needs_more_info': '#f59e0b',
        }
        color = colors.get(obj.outcome, '#6b7280')
        return format_html(
            '<span style="background: {}; color: white; padding: 3px 8px; border-radius: 4px; font-size: 11px;">{}</span>',
            color,
            obj.get_outcome_display()
        )
    outcome_badge.short_description = 'Outcome'


@admin.register(ReviewerStats)
class ReviewerStatsAdmin(admin.ModelAdmin):
    """Admin for reviewer statistics"""
    
    list_display = [
        'reviewer_name', 'total_assignments', 'pending_assignments',
        'completed_assignments', 'total_documents_reviewed',
        'approval_rate', 'avg_review_time_hours', 'last_updated'
    ]
    readonly_fields = [
        'reviewer', 'total_assignments', 'pending_assignments',
        'completed_assignments', 'total_documents_reviewed',
        'approved_count', 'rejected_count', 'needs_info_count',
        'avg_review_time_hours', 'last_updated'
    ]
    
    def reviewer_name(self, obj):
        return obj.reviewer.get_full_name()
    reviewer_name.short_description = 'Reviewer'
    
    def approval_rate(self, obj):
        if obj.total_documents_reviewed > 0:
            rate = (obj.approved_count / obj.total_documents_reviewed) * 100
            return f"{rate:.1f}%"
        return "N/A"
    approval_rate.short_description = 'Approval Rate'
    
    def has_add_permission(self, request):
        return False  # Stats are auto-generated
    
    def has_delete_permission(self, request, obj=None):
        return False


# ==================== Custom Admin Actions ====================

# Add action to User admin to create medical reviewers
from django.contrib.auth.admin import UserAdmin
from claimchase.apps.users.models import CustomUser

# We'll need to extend the existing admin or create a separate action
