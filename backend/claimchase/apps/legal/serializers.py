from rest_framework import serializers
from .models import LegalDocument


class LegalDocumentSerializer(serializers.ModelSerializer):
    doc_type_display = serializers.CharField(source='get_doc_type_display', read_only=True)

    class Meta:
        model = LegalDocument
        fields = [
            'id',
            'doc_type',
            'doc_type_display',
            'title',
            'content',
            'content_format',
            'version',
            'effective_date',
            'updated_at',
        ]
