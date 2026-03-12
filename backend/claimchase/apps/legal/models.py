from django.db import models


class LegalDocument(models.Model):
    """
    Stores the active Terms & Conditions or Privacy Policy document.

    Only one document per doc_type can be active at a time.
    Setting is_active=True on a new document automatically deactivates
    any previously active document of the same type.
    """

    DOC_TYPE_CHOICES = [
        ('terms', 'Terms & Conditions'),
        ('privacy', 'Privacy Policy'),
    ]

    CONTENT_FORMAT_CHOICES = [
        ('html', 'HTML — paste formatted HTML markup'),
        ('plain_text', 'Plain Text — paste raw text, line breaks preserved'),
    ]

    doc_type = models.CharField(
        max_length=20,
        choices=DOC_TYPE_CHOICES,
        help_text='Type of legal document',
    )
    title = models.CharField(
        max_length=200,
        help_text='Display title, e.g. "Terms & Conditions — v2.1"',
    )
    content = models.TextField(
        help_text=(
            'Paste your document content here. '
            'If content_format is HTML, paste raw HTML. '
            'If content_format is Plain Text, paste the document as-is.'
        ),
    )
    content_format = models.CharField(
        max_length=20,
        choices=CONTENT_FORMAT_CHOICES,
        default='plain_text',
        help_text='Select the format of the content you are pasting above',
    )
    version = models.CharField(
        max_length=50,
        default='1.0',
        help_text='Version label shown to users, e.g. "2.1" or "March 2026"',
    )
    effective_date = models.DateField(
        help_text='Date from which this version is effective',
    )
    is_active = models.BooleanField(
        default=False,
        help_text=(
            'Check this to make this version the one shown to users. '
            'Activating this will automatically deactivate the previous active version.'
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Legal Document'
        verbose_name_plural = 'Legal Documents'

    def __str__(self):
        status = '✅ ACTIVE' if self.is_active else '—'
        return f"{self.get_doc_type_display()} v{self.version} {status}"

    def save(self, *args, **kwargs):
        # Ensure only one active document per type at a time
        if self.is_active:
            LegalDocument.objects.filter(
                doc_type=self.doc_type,
                is_active=True,
            ).exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)
