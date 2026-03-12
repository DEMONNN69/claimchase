from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .models import LegalDocument
from .serializers import LegalDocumentSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def terms_view(request):
    """GET /api/legal/terms/ — returns the currently active Terms & Conditions."""
    doc = LegalDocument.objects.filter(doc_type='terms', is_active=True).first()
    if not doc:
        return Response(
            {'detail': 'Terms & Conditions not published yet.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(LegalDocumentSerializer(doc).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def privacy_view(request):
    """GET /api/legal/privacy/ — returns the currently active Privacy Policy."""
    doc = LegalDocument.objects.filter(doc_type='privacy', is_active=True).first()
    if not doc:
        return Response(
            {'detail': 'Privacy Policy not published yet.'},
            status=status.HTTP_404_NOT_FOUND,
        )
    return Response(LegalDocumentSerializer(doc).data)
