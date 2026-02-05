"""
Views for Consumer Disputes API.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q
from django.http import HttpResponse, Http404
import requests

from .models import (
    DisputeCategory,
    Entity,
    ConsumerDispute,
    DisputeDocument,
    DisputeTimeline
)
from .serializers import (
    DisputeCategorySerializer,
    DisputeCategoryBriefSerializer,
    EntitySerializer,
    EntityBriefSerializer,
    ConsumerDisputeSerializer,
    ConsumerDisputeListSerializer,
    ConsumerDisputeCreateSerializer,
    DisputeDocumentSerializer,
    DisputeTimelineSerializer
)


class DisputeCategoryViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for dispute categories.
    Provides list and retrieve actions for categories.
    """
    
    queryset = DisputeCategory.objects.filter(is_active=True)
    serializer_class = DisputeCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter to show only top-level categories by default"""
        # Optimize with select_related for parent and prefetch for subcategories
        queryset = DisputeCategory.objects.filter(is_active=True).select_related(
            'parent'
        ).prefetch_related(
            'subcategories'
        )
        
        # Option to filter by parent
        parent = self.request.query_params.get('parent', None)
        if parent == 'root':
            queryset = queryset.filter(parent__isnull=True)
        elif parent:
            queryset = queryset.filter(parent_id=parent)
        
        return queryset.order_by('display_order', 'name')
    
    @action(detail=False, methods=['get'])
    def tree(self, request):
        """
        Get full category tree (top-level categories with nested subcategories).
        """
        top_level = DisputeCategory.objects.filter(
            is_active=True,
            parent__isnull=True
        ).order_by('display_order', 'name')
        
        serializer = DisputeCategorySerializer(top_level, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def subcategories(self, request, pk=None):
        """Get subcategories for a specific category"""
        category = self.get_object()
        subcats = category.subcategories.filter(is_active=True).order_by('display_order', 'name')
        serializer = DisputeCategoryBriefSerializer(subcats, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def entities(self, request, pk=None):
        """Get entities linked to this category"""
        category = self.get_object()
        entities = category.entities.filter(is_active=True).order_by('name')
        serializer = EntityBriefSerializer(entities, many=True)
        return Response(serializer.data)


class EntityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for entities.
    """
    
    queryset = Entity.objects.filter(is_active=True)
    serializer_class = EntitySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EntityBriefSerializer
        return EntitySerializer
    
    def get_queryset(self):
        # Optimize with prefetch_related for M2M categories relationship
        queryset = Entity.objects.filter(is_active=True).prefetch_related(
            'categories',
            'categories__parent'
        )
        
        # Filter by category
        category_id = self.request.query_params.get('category', None)
        if category_id:
            queryset = queryset.filter(categories__id=category_id).distinct()
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset.order_by('name')


class ConsumerDisputeViewSet(viewsets.ModelViewSet):
    """
    ViewSet for consumer disputes.
    Users can create, view their own disputes.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # JSONParser first for create
    
    def get_queryset(self):
        """Users can only see their own disputes"""
        user = self.request.user
        
        # Optimize with select_related and prefetch_related
        queryset = ConsumerDispute.objects.select_related(
            'user',
            'category',
            'category__parent',
            'entity'
        ).prefetch_related(
            'documents',
            'documents__uploaded_by'
        )
        
        # Staff can see all disputes
        if not user.is_staff:
            queryset = queryset.filter(user=user)
        
        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category_id=category)
        
        return queryset.order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ConsumerDisputeListSerializer
        elif self.action == 'create':
            return ConsumerDisputeCreateSerializer
        return ConsumerDisputeSerializer
    
    @action(detail=True, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_document(self, request, pk=None):
        """
        Upload a document to a dispute.
        """
        dispute = self.get_object()
        
        # Verify user owns this dispute
        if dispute.user != request.user and not request.user.is_staff:
            return Response(
                {'error': 'You do not have permission to upload to this dispute.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        file = request.FILES.get('file')
        if not file:
            return Response(
                {'error': 'No file provided.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_type = request.data.get('document_type', 'other')
        description = request.data.get('description', '')
        
        document = DisputeDocument.objects.create(
            dispute=dispute,
            file=file,
            file_name=file.name,
            file_type=file.content_type,
            file_size=file.size,
            document_type=document_type,
            description=description,
            uploaded_by=request.user
        )
        
        # Add timeline entry
        DisputeTimeline.objects.create(
            dispute=dispute,
            event_type='document_uploaded',
            description=f'Document "{file.name}" uploaded',
            performed_by=request.user
        )
        
        serializer = DisputeDocumentSerializer(document, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a dispute"""
        dispute = self.get_object()
        documents = dispute.documents.all()
        serializer = DisputeDocumentSerializer(documents, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'], url_path='documents/(?P<doc_id>[^/.]+)/download', permission_classes=[])
    def download_document(self, request, pk=None, doc_id=None):
        """
        Proxy endpoint - ONLY accessible from frontend proxy server.
        Validates origin to prevent direct access.
        """
        from django.conf import settings
        import logging
        logger = logging.getLogger(__name__)
        
        # SECURITY: Only allow requests from frontend proxy
        origin = request.META.get('HTTP_ORIGIN', '')
        referer = request.META.get('HTTP_REFERER', '')
        allowed = getattr(settings, 'ALLOWED_DOCUMENT_ORIGINS', [])
        
        logger.info(f"Origin: {origin}, Referer: {referer}, Allowed: {allowed}")
        
        if not any(origin.startswith(o) or referer.startswith(o) for o in allowed):
            logger.error(f"Origin validation failed. Origin: {origin}, Referer: {referer}, Allowed: {allowed}")
            raise Http404("Direct access not allowed")
        
        from .document_access import DocumentAccessToken
        
        # Get temporary access token from query parameter
        temp_token = request.GET.get('access')
        
        if not temp_token:
            logger.error("No access token provided")
            raise Http404("Access token required")
        
        # Validate temporary token
        token_data = DocumentAccessToken.validate(temp_token)
        
        if not token_data:
            logger.error(f"Invalid or expired token: {temp_token[:20]}...")
            raise Http404("Invalid or expired access token")
        
        logger.info(f"Token validated: {token_data}")
        
        # Verify token is for this document
        if token_data['document_id'] != int(doc_id) or token_data['document_type'] != 'dispute':
            logger.error(f"Token mismatch. Expected doc_id={doc_id}, got {token_data['document_id']}")
            raise Http404("Token mismatch")
        
        try:
            dispute = ConsumerDispute.objects.get(id=pk)
        except ConsumerDispute.DoesNotExist:
            raise Http404("Dispute not found")
        
        # Verify user from token has access
        from claimchase.apps.users.models import CustomUser
        try:
            user = CustomUser.objects.get(id=token_data['user_id'])
        except CustomUser.DoesNotExist:
            raise Http404("User not found")
        
        if dispute.user != user and not user.is_staff:
            raise Http404("Access denied")
        
        try:
            document = DisputeDocument.objects.get(id=doc_id, dispute=dispute)
        except DisputeDocument.DoesNotExist:
            raise Http404("Document not found")
        
        # Get the actual Cloudinary URL (or signed URL)
        if document.file:
            file_url = document.file.url
            
            # Fetch file from Cloudinary
            response = requests.get(file_url, stream=True)
            
            if response.status_code == 200:
                # Create HTTP response with file content
                http_response = HttpResponse(
                    response.content,
                    content_type=document.file_type or 'application/octet-stream'
                )
                http_response['Content-Disposition'] = f'inline; filename="{document.file_name}"'
                http_response['Content-Length'] = document.file_size
                return http_response
        
        raise Http404("File not found")
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """Get timeline for a dispute"""
        dispute = self.get_object()
        timeline = dispute.timeline.all()
        serializer = DisputeTimelineSerializer(timeline, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_disputes(self, request):
        """Get current user's disputes"""
        disputes = ConsumerDispute.objects.filter(user=request.user).order_by('-created_at')
        serializer = ConsumerDisputeListSerializer(disputes, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get dispute statistics for current user"""
        user = request.user
        
        if user.is_staff:
            queryset = ConsumerDispute.objects.all()
        else:
            queryset = ConsumerDispute.objects.filter(user=user)
        
        stats = {
            'total': queryset.count(),
            'new': queryset.filter(status='new').count(),
            'in_progress': queryset.filter(status='in_progress').count(),
            'contacted': queryset.filter(status='contacted').count(),
            'resolved': queryset.filter(status='resolved').count(),
            'closed': queryset.filter(status='closed').count(),
        }
        
        return Response(stats)
