"""
Views for Consumer Disputes API.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q

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
        queryset = super().get_queryset()
        
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
        queryset = super().get_queryset()
        
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
        
        # Staff can see all disputes
        if user.is_staff:
            queryset = ConsumerDispute.objects.all()
        else:
            queryset = ConsumerDispute.objects.filter(user=user)
        
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
        
        serializer = DisputeDocumentSerializer(document)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """Get all documents for a dispute"""
        dispute = self.get_object()
        documents = dispute.documents.all()
        serializer = DisputeDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
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
