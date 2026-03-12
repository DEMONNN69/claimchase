from django.contrib import admin
from django.utils.html import format_html
from unfold.admin import ModelAdmin
from unfold.decorators import display
from .models import LegalDocument


@admin.register(LegalDocument)
class LegalDocumentAdmin(ModelAdmin):
    list_display = (
        'title',
        'display_doc_type',
        'version',
        'content_format',
        'effective_date',
        'display_status',
        'updated_at',
    )
    list_filter = ('doc_type', 'content_format', 'is_active')
    search_fields = ('title', 'version')
    readonly_fields = ('created_at', 'updated_at', 'content_preview')
    warn_unsaved_form = True
    compressed_fields = True

    fieldsets = (
        ('📄 Document Info', {
            'fields': ('doc_type', 'title', 'version', 'effective_date', 'is_active'),
            'classes': ['tab'],
        }),
        ('📝 Content', {
            'fields': ('content_format', 'content'),
            'classes': ['tab'],
            'description': (
                'Select the content format first, then paste your document. '
                'HTML: paste valid HTML markup. '
                'Plain Text: paste the document as-is, line breaks will be preserved.'
            ),
        }),
        ('👁 Preview', {
            'fields': ('content_preview',),
            'classes': ['tab'],
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ['tab'],
        }),
    )

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        # Make the content textarea tall
        form.base_fields['content'].widget.attrs.update({
            'rows': 40,
            'style': 'font-family: monospace; font-size: 13px;',
        })
        return form

    @display(description='Type', label={
        'terms': 'success',
        'privacy': 'info',
    })
    def display_doc_type(self, obj):
        return obj.doc_type

    @display(description='Status', label={
        True: 'success',
        False: 'warning',
    })
    def display_status(self, obj):
        return obj.is_active

    def content_preview(self, obj):
        if not obj.pk:
            return '—'
        if obj.content_format == 'html':
            return format_html(
                '<div style="border:1px solid #ccc;padding:16px;max-height:500px;overflow-y:auto">{}</div>',
                obj.content,
            )
        return format_html(
            '<pre style="white-space:pre-wrap;border:1px solid #ccc;padding:16px;max-height:500px;overflow-y:auto">{}</pre>',
            obj.content,
        )
    content_preview.short_description = 'Rendered Preview'
