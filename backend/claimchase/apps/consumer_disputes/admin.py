"""
Admin configuration for Consumer Disputes.
"""

from django.contrib import admin
from django.utils.safestring import mark_safe
from django.utils.html import format_html
from .models import (
    DisputeCategory,
    Entity,
    ConsumerDispute,
    DisputeDocument,
    DisputeTimeline
)


@admin.register(DisputeCategory)
class DisputeCategoryAdmin(admin.ModelAdmin):
    """Admin for dispute categories"""
    
    list_display = [
        'name', 'parent', 'display_order', 'entity_count', 'is_active', 'created_at'
    ]
    list_filter = ['is_active', 'parent']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['parent__name', 'display_order', 'name']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'icon')
        }),
        ('Hierarchy', {
            'fields': ('parent', 'display_order')
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )
    
    def entity_count(self, obj):
        return obj.entities.count()
    entity_count.short_description = 'Entities'


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    """Admin for entities"""
    
    list_display = [
        'name', 'logo_preview', 'category_list', 'is_active', 'is_verified', 'created_at'
    ]
    list_filter = ['is_active', 'is_verified', 'categories']
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ['categories']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'slug', 'description', 'logo', 'website')
        }),
        ('Categories', {
            'fields': ('categories',)
        }),
        ('Contact Information', {
            'fields': ('contact_email', 'contact_phone', 'address'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active', 'is_verified')
        }),
    )
    
    def logo_preview(self, obj):
        if obj.logo:
            return mark_safe(f'<img src="{obj.logo.url}" width="40" height="40" style="object-fit: contain; border-radius: 4px;" />')
        return mark_safe('<span style="color: #999;">No logo</span>')
    logo_preview.short_description = 'Logo'
    
    def category_list(self, obj):
        categories = obj.categories.all()[:3]
        names = ', '.join([c.name for c in categories])
        if obj.categories.count() > 3:
            names += f' (+{obj.categories.count() - 3} more)'
        return names or '-'
    category_list.short_description = 'Categories'


class DisputeDocumentInline(admin.TabularInline):
    """Inline for dispute documents"""
    model = DisputeDocument
    extra = 0
    readonly_fields = ['file_preview', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'uploaded_at']
    fields = ['file_preview', 'file_name', 'document_type', 'description', 'uploaded_by', 'uploaded_at']
    
    def file_preview(self, obj):
        if obj.file:
            return mark_safe(f'<a href="{obj.file.url}" target="_blank">View File</a>')
        return '-'
    file_preview.short_description = 'File'


class DisputeTimelineInline(admin.TabularInline):
    """Inline for dispute timeline"""
    model = DisputeTimeline
    extra = 0
    readonly_fields = ['event_type', 'description', 'performed_by', 'created_at']
    fields = ['event_type', 'description', 'performed_by', 'created_at']
    ordering = ['-created_at']
    
    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ConsumerDispute)
class ConsumerDisputeAdmin(admin.ModelAdmin):
    """Admin for consumer disputes"""
    
    list_display = [
        'dispute_id', 'title_truncated', 'user_email', 'category',
        'status_badge', 'priority_badge', 'amount_display', 'created_at'
    ]
    list_filter = ['status', 'priority', 'category', 'preferred_contact_method', 'created_at']
    search_fields = ['dispute_id', 'title', 'description', 'user__email', 'transaction_id']
    readonly_fields = ['dispute_id', 'created_at', 'updated_at', 'contacted_at', 'resolved_at']
    raw_id_fields = ['user', 'assigned_to']
    date_hierarchy = 'created_at'
    inlines = [DisputeDocumentInline, DisputeTimelineInline]
    
    fieldsets = (
        ('Dispute Information', {
            'fields': ('dispute_id', 'user', 'title', 'description')
        }),
        ('Category & Entity', {
            'fields': ('category', 'subcategory', 'entity')
        }),
        ('Transaction Details', {
            'fields': ('transaction_id', 'transaction_date', 'amount_involved')
        }),
        ('Contact Preferences', {
            'fields': ('preferred_contact_method', 'preferred_contact_time')
        }),
        ('Status & Assignment', {
            'fields': ('status', 'priority', 'assigned_to', 'internal_notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'contacted_at', 'resolved_at'),
            'classes': ('collapse',)
        }),
    )
    
    def title_truncated(self, obj):
        return obj.title[:50] + '...' if len(obj.title) > 50 else obj.title
    title_truncated.short_description = 'Title'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'
    
    def status_badge(self, obj):
        colors = {
            'new': '#3b82f6',
            'contacted': '#f59e0b',
            'in_progress': '#8b5cf6',
            'resolved': '#22c55e',
            'closed': '#6b7280',
            'rejected': '#ef4444',
        }
        color = colors.get(obj.status, '#6b7280')
        return mark_safe(
            f'<span style="background-color: {color}; color: white; padding: 3px 8px; '
            f'border-radius: 4px; font-size: 11px; font-weight: 500;">'
            f'{obj.get_status_display()}</span>'
        )
    status_badge.short_description = 'Status'
    
    def priority_badge(self, obj):
        colors = {
            'low': '#6b7280',
            'medium': '#3b82f6',
            'high': '#f59e0b',
            'urgent': '#ef4444',
        }
        color = colors.get(obj.priority, '#6b7280')
        return mark_safe(
            f'<span style="background-color: {color}; color: white; padding: 3px 8px; '
            f'border-radius: 4px; font-size: 11px; font-weight: 500;">'
            f'{obj.get_priority_display()}</span>'
        )
    priority_badge.short_description = 'Priority'
    
    def amount_display(self, obj):
        if obj.amount_involved:
            return f'₹{obj.amount_involved:,.2f}'
        return '-'
    amount_display.short_description = 'Amount'
    
    actions = ['mark_contacted', 'mark_in_progress', 'mark_resolved']
    
    @admin.action(description='Mark selected as Contacted')
    def mark_contacted(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='contacted', contacted_at=timezone.now())
        self.message_user(request, f'{updated} disputes marked as contacted.')
    
    @admin.action(description='Mark selected as In Progress')
    def mark_in_progress(self, request, queryset):
        updated = queryset.update(status='in_progress')
        self.message_user(request, f'{updated} disputes marked as in progress.')
    
    @admin.action(description='Mark selected as Resolved')
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='resolved', resolved_at=timezone.now())
        self.message_user(request, f'{updated} disputes marked as resolved.')


@admin.register(DisputeDocument)
class DisputeDocumentAdmin(admin.ModelAdmin):
    """Admin for dispute documents"""
    
    list_display = ['file_name', 'dispute_link', 'document_type', 'file_size_display', 'uploaded_by', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    search_fields = ['file_name', 'dispute__dispute_id', 'dispute__title']
    raw_id_fields = ['dispute', 'uploaded_by']
    
    def dispute_link(self, obj):
        if obj.dispute:
            return mark_safe(f'<a href="/admin/consumer_disputes/consumerdispute/{obj.dispute.id}/change/">{obj.dispute.dispute_id}</a>')
        return '-'
    dispute_link.short_description = 'Dispute'
    
    def file_size_display(self, obj):
        if obj.file_size:
            if obj.file_size < 1024:
                return f'{obj.file_size} B'
            elif obj.file_size < 1024 * 1024:
                return f'{obj.file_size / 1024:.1f} KB'
            else:
                return f'{obj.file_size / (1024 * 1024):.1f} MB'
        return '-'
    file_size_display.short_description = 'Size'


@admin.register(DisputeTimeline)
class DisputeTimelineAdmin(admin.ModelAdmin):
    """Admin for dispute timeline"""
    
    list_display = ['dispute_id_display', 'event_type', 'description_truncated', 'performed_by', 'created_at']
    list_filter = ['event_type', 'created_at']
    search_fields = ['dispute__dispute_id', 'description']
    raw_id_fields = ['dispute', 'performed_by']
    
    def dispute_id_display(self, obj):
        return obj.dispute.dispute_id
    dispute_id_display.short_description = 'Dispute ID'
    
    def description_truncated(self, obj):
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_truncated.short_description = 'Description'
