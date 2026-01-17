"""
Admin configuration for Consumer Disputes.
Enhanced with Django Unfold for professional appearance.
"""

from django.contrib import admin
from django.contrib import messages
from django.utils.safestring import mark_safe
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import action, display
from .models import (
    DisputeCategory,
    Entity,
    ConsumerDispute,
    DisputeDocument,
    DisputeTimeline
)


@admin.register(DisputeCategory)
class DisputeCategoryAdmin(ModelAdmin):
    """Admin for dispute categories"""
    
    list_display = [
        'name', 'parent', 'display_order', 'entity_count', 'display_active', 'created_at'
    ]
    list_filter = ['is_active', 'parent']
    list_filter_submit = True
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    ordering = ['parent__name', 'display_order', 'name']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('🏷️ Details', {
            'fields': ('name', 'slug', 'description', 'icon'),
            'classes': ['tab'],
        }),
        ('📂 Hierarchy', {
            'fields': ('parent', 'display_order'),
            'classes': ['tab'],
        }),
        ('⚙️ Status', {
            'fields': ('is_active',),
            'classes': ['tab'],
        }),
    )
    
    def entity_count(self, obj):
        return obj.entities.count()
    entity_count.short_description = 'Entities'

    @display(description='Active', boolean=True)
    def display_active(self, obj):
        return obj.is_active


@admin.register(Entity)
class EntityAdmin(ModelAdmin):
    """Admin for entities"""
    
    list_display = [
        'name', 'logo_preview', 'category_list', 'display_active', 'display_verified', 'created_at'
    ]
    list_filter = ['is_active', 'is_verified', 'categories']
    list_filter_submit = True
    search_fields = ['name', 'slug', 'description']
    prepopulated_fields = {'slug': ('name',)}
    filter_horizontal = ['categories']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('🏢 Basic Info', {
            'fields': ('name', 'slug', 'description', 'logo', 'website'),
            'classes': ['tab'],
        }),
        ('📂 Categories', {
            'fields': ('categories',),
            'classes': ['tab'],
        }),
        ('📞 Contact', {
            'fields': ('contact_email', 'contact_phone', 'address'),
            'classes': ['tab'],
        }),
        ('⚙️ Status', {
            'fields': ('is_active', 'is_verified'),
            'classes': ['tab'],
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

    @display(description='Active', boolean=True)
    def display_active(self, obj):
        return obj.is_active

    @display(description='Verified', boolean=True)
    def display_verified(self, obj):
        return obj.is_verified


class DisputeDocumentInline(admin.TabularInline):
    """Inline for dispute documents"""
    model = DisputeDocument
    extra = 0
    readonly_fields = ['file_preview', 'file_name', 'file_type', 'file_size', 'uploaded_by', 'uploaded_at']
    fields = ['file_preview', 'file_name', 'document_type', 'description', 'uploaded_by', 'uploaded_at']
    
    def file_preview(self, obj):
        if obj.file:
            return mark_safe(f'<a href="{obj.file.url}" target="_blank" class="text-primary-600 hover:underline">View File</a>')
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
class ConsumerDisputeAdmin(ModelAdmin):
    """Admin for consumer disputes"""
    
    list_display = [
        'dispute_id', 'title_truncated', 'user_email', 'category',
        'display_status', 'display_priority', 'amount_display', 'created_at'
    ]
    list_filter = ['status', 'priority', 'category', 'preferred_contact_method', 'created_at']
    list_filter_submit = True
    search_fields = ['dispute_id', 'title', 'description', 'user__email', 'transaction_id']
    readonly_fields = ['dispute_id', 'created_at', 'updated_at', 'contacted_at', 'resolved_at']
    raw_id_fields = ['user', 'assigned_to']
    date_hierarchy = 'created_at'
    inlines = [DisputeDocumentInline, DisputeTimelineInline]
    actions = ['mark_contacted', 'mark_in_progress', 'mark_resolved']
    
    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True
    
    fieldsets = (
        ('📋 Dispute Info', {
            'fields': ('dispute_id', 'user', 'title', 'description'),
            'classes': ['tab'],
        }),
        ('🏷️ Category', {
            'fields': ('category', 'subcategory', 'entity'),
            'classes': ['tab'],
        }),
        ('💰 Transaction', {
            'fields': ('transaction_id', 'transaction_date', 'amount_involved'),
            'classes': ['tab'],
        }),
        ('📞 Contact', {
            'fields': ('preferred_contact_method', 'preferred_contact_time'),
            'classes': ['tab'],
        }),
        ('⚙️ Status', {
            'fields': ('status', 'priority', 'assigned_to', 'internal_notes'),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at', 'contacted_at', 'resolved_at'),
            'classes': ['tab'],
        }),
    )
    
    def title_truncated(self, obj):
        return obj.title[:50] + '...' if len(obj.title) > 50 else obj.title
    title_truncated.short_description = 'Title'
    
    def user_email(self, obj):
        return obj.user.email
    user_email.short_description = 'User'

    @display(description='Status', label={
        'new': 'info',
        'contacted': 'warning',
        'in_progress': 'primary',
        'resolved': 'success',
        'closed': 'secondary',
        'rejected': 'danger',
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
    
    def amount_display(self, obj):
        if obj.amount_involved:
            return f'₹{obj.amount_involved:,.2f}'
        return '-'
    amount_display.short_description = 'Amount'

    @action(description='📞 Mark as Contacted')
    def mark_contacted(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='contacted', contacted_at=timezone.now())
        self.message_user(request, f'{updated} disputes marked as contacted.', messages.SUCCESS)

    @action(description='🔄 Mark as In Progress')
    def mark_in_progress(self, request, queryset):
        updated = queryset.update(status='in_progress')
        self.message_user(request, f'{updated} disputes marked as in progress.', messages.INFO)

    @action(description='✅ Mark as Resolved')
    def mark_resolved(self, request, queryset):
        from django.utils import timezone
        updated = queryset.update(status='resolved', resolved_at=timezone.now())
        self.message_user(request, f'{updated} disputes marked as resolved.', messages.SUCCESS)


@admin.register(DisputeDocument)
class DisputeDocumentAdmin(ModelAdmin):
    """Admin for dispute documents"""
    
    list_display = ['file_name', 'dispute_link', 'document_type', 'file_size_display', 'uploaded_by', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']
    list_filter_submit = True
    search_fields = ['file_name', 'dispute__dispute_id', 'dispute__title']
    raw_id_fields = ['dispute', 'uploaded_by']
    
    def dispute_link(self, obj):
        if obj.dispute:
            return mark_safe(f'<a href="/admin/consumer_disputes/consumerdispute/{obj.dispute.id}/change/" class="text-primary-600 hover:underline">{obj.dispute.dispute_id}</a>')
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
class DisputeTimelineAdmin(ModelAdmin):
    """Admin for dispute timeline"""
    
    list_display = ['dispute_id_display', 'event_type', 'description_truncated', 'performed_by', 'created_at']
    list_filter = ['event_type', 'created_at']
    list_filter_submit = True
    search_fields = ['dispute__dispute_id', 'description']
    raw_id_fields = ['dispute', 'performed_by']
    
    def dispute_id_display(self, obj):
        return obj.dispute.dispute_id
    dispute_id_display.short_description = 'Dispute ID'
    
    def description_truncated(self, obj):
        return obj.description[:100] + '...' if len(obj.description) > 100 else obj.description
    description_truncated.short_description = 'Description'
