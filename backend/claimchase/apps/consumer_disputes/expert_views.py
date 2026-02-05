"""
Expert Review ViewSets
Mirrors medical_review views structure
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q, Count

from .expert_models import ExpertProfile, DisputeAssignment, DisputeDocumentReview
from .models import ConsumerDispute
from .expert_serializers import (
    ExpertProfileSerializer,
    DisputeAssignmentSerializer,
    DisputeAssignmentListSerializer,
    DisputeAssignmentCreateSerializer,
    DisputeDocumentReviewSerializer,
)


class IsExpertOrAdmin(permissions.BasePermission):
    """
    Custom permission: Allow experts to access their own data, admins can access all
    """
    
    def has_permission(self, request, view):
        user = request.user
        return user.is_authenticated and (user.is_staff or user.is_dispute_expert)


class ExpertProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Expert Profiles
    Experts can update their own profile, admins can see all
    """
    
    queryset = ExpertProfile.objects.all()
    serializer_class = ExpertProfileSerializer
    permission_classes = [IsExpertOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return ExpertProfile.objects.all()
        
        # Experts can only see their own profile
        if user.is_dispute_expert:
            return ExpertProfile.objects.filter(user=user)
        
        return ExpertProfile.objects.none()
    
    @action(detail=False, methods=['get', 'patch'])
    def me(self, request):
        """
        Get or update current expert's profile
        GET /api/experts/me/
        PATCH /api/experts/me/
        """
        # Get or create profile
        profile, created = ExpertProfile.objects.get_or_create(user=request.user)
        
        if request.method == 'PATCH':
            serializer = self.get_serializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        # GET request
        serializer = self.get_serializer(profile)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], url_path='check_onboarding')
    def check_onboarding(self, request):
        """
        Check if current user needs onboarding
        GET /api/expert/check_onboarding/
        """
        if not request.user.is_dispute_expert:
            return Response({'needs_onboarding': False, 'is_expert': False})
        
        try:
            profile = request.user.expert_profile
            # Check if profile has required fields filled (just years of experience and bio with expertise)
            needs_onboarding = profile.years_of_experience is None or not profile.bio
            return Response({
                'needs_onboarding': needs_onboarding,
                'is_expert': True,
                'profile': ExpertProfileSerializer(profile).data if not needs_onboarding else None
            })
        except ExpertProfile.DoesNotExist:
            return Response({
                'needs_onboarding': True,
                'is_expert': True,
                'profile': None
            })


class DisputeAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Dispute Assignments
    """
    
    permission_classes = [IsExpertOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return DisputeAssignment.objects.select_related(
                'expert__user',
                'dispute',
                'assigned_by'
            ).prefetch_related(
                'document_reviews',
                'document_reviews__document'
            ).all()
        
        # Experts see only their assignments
        if user.is_dispute_expert:
            return DisputeAssignment.objects.select_related(
                'expert__user',
                'dispute',
                'assigned_by'
            ).prefetch_related(
                'document_reviews',
                'document_reviews__document'
            ).filter(expert__user=user)
        
        return DisputeAssignment.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'list':
            return DisputeAssignmentListSerializer
        elif self.action == 'create':
            return DisputeAssignmentCreateSerializer
        return DisputeAssignmentSerializer
    
    @action(detail=True, methods=['post'])
    def start_review(self, request, pk=None):
        """
        Mark assignment as in review
        POST /api/expert-assignments/{id}/start_review/
        """
        assignment = self.get_object()
        
        if assignment.status != 'pending':
            return Response(
                {'error': 'Can only start pending assignments'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignment.start_review()
        
        return Response({
            'message': 'Review started',
            'assignment': DisputeAssignmentSerializer(assignment).data
        })
    
    @action(detail=True, methods=['post'])
    def complete_review(self, request, pk=None):
        """
        Complete assignment review
        POST /api/expert-assignments/{id}/complete_review/
        
        Body:
        {
            "recommendation": "approve|reject|needs_info|escalate",
            "review_summary": "Overall review summary"
        }
        """
        assignment = self.get_object()
        
        if assignment.status not in ['pending', 'in_review']:
            return Response(
                {'error': 'Assignment already completed or cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        recommendation = request.data.get('recommendation')
        summary = request.data.get('review_summary', '')
        
        if not recommendation:
            return Response(
                {'error': 'Recommendation is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        assignment.complete_review(recommendation, summary)
        
        return Response({
            'message': 'Review completed',
            'assignment': DisputeAssignmentSerializer(assignment).data
        })
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel assignment (admin only)
        POST /api/expert-assignments/{id}/cancel/
        """
        if not request.user.is_staff:
            return Response(
                {'error': 'Only admins can cancel assignments'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment = self.get_object()
        assignment.cancel()
        
        return Response({
            'message': 'Assignment cancelled',
            'assignment': DisputeAssignmentSerializer(assignment).data
        })
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get assignment statistics for current expert
        GET /api/expert-assignments/stats/
        """
        user = request.user
        
        if user.is_dispute_expert:
            try:
                profile = ExpertProfile.objects.get(user=user)
                assignments = DisputeAssignment.objects.filter(expert=profile)
                
                stats = {
                    'total': assignments.count(),
                    'pending': assignments.filter(status='pending').count(),
                    'in_review': assignments.filter(status='in_review').count(),
                    'completed': assignments.filter(status='completed').count(),
                    'cancelled': assignments.filter(status='cancelled').count(),
                }
                
                return Response(stats)
            except ExpertProfile.DoesNotExist:
                return Response({'error': 'Expert profile not found'}, status=404)
        
        return Response({'error': 'Not authorized'}, status=403)
    
    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Get dashboard data for current expert
        GET /api/expert-assignments/dashboard/
        """
        user = request.user
        
        if not user.is_dispute_expert:
            return Response({'error': 'Not authorized'}, status=403)
        
        try:
            profile = ExpertProfile.objects.get(user=user)
            assignments = DisputeAssignment.objects.filter(expert=profile).select_related(
                'dispute'
            ).prefetch_related('document_reviews')
            
            # Group disputes with their assignments
            from collections import defaultdict
            dispute_map = defaultdict(list)
            
            for assignment in assignments:
                dispute_map[assignment.dispute.id].append({
                    'id': assignment.id,
                    'status': assignment.status,
                    'priority': assignment.priority,
                    'assigned_date': assignment.assigned_at,
                    'recommendation': assignment.recommendation,
                })
            
            disputes = []
            for dispute_id, assignment_list in dispute_map.items():
                dispute = ConsumerDispute.objects.get(id=dispute_id)
                disputes.append({
                    'id': dispute.id,
                    'dispute_id': dispute.dispute_id,
                    'title': dispute.title,
                    'description': dispute.description,
                    'status': dispute.status,
                    'priority': dispute.priority,
                    'created_at': dispute.created_at,
                    'assignments': assignment_list,
                })
            
            # Calculate counts
            pending_count = assignments.filter(status='pending').count()
            in_progress_count = assignments.filter(status='in_review').count()
            completed_count = assignments.filter(status='completed').count()
            needs_info_count = assignments.filter(recommendation='needs_info').count()
            
            return Response({
                'disputes': disputes,
                'pending_count': pending_count,
                'in_progress_count': in_progress_count,
                'completed_count': completed_count,
                'needs_info_count': needs_info_count,
            })
        except ExpertProfile.DoesNotExist:
            return Response({'error': 'Expert profile not found'}, status=404)


class DisputeDocumentReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Document Reviews
    """
    
    serializer_class = DisputeDocumentReviewSerializer
    permission_classes = [IsExpertOrAdmin]
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff:
            return DisputeDocumentReview.objects.select_related(
                'assignment__expert__user',
                'document'
            ).all()
        
        # Experts see only their reviews
        if user.is_dispute_expert:
            return DisputeDocumentReview.objects.select_related(
                'assignment__expert__user',
                'document'
            ).filter(assignment__expert__user=user)
        
        return DisputeDocumentReview.objects.none()
    
    @action(detail=True, methods=['post'])
    def mark_verified(self, request, pk=None):
        """
        Mark document as verified
        POST /api/expert-document-reviews/{id}/mark_verified/
        
        Body: {"comments": "..."}
        """
        review = self.get_object()
        comments = request.data.get('comments', '')
        
        review.mark_verified(comments)
        
        return Response({
            'message': 'Document marked as verified',
            'review': self.get_serializer(review).data
        })
    
    @action(detail=True, methods=['post'])
    def mark_rejected(self, request, pk=None):
        """
        Mark document as rejected
        POST /api/expert-document-reviews/{id}/mark_rejected/
        
        Body: {"comments": "Reason for rejection"}
        """
        review = self.get_object()
        comments = request.data.get('comments')
        
        if not comments:
            return Response(
                {'error': 'Comments required for rejection'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        review.mark_rejected(comments)
        
        return Response({
            'message': 'Document marked as rejected',
            'review': self.get_serializer(review).data
        })
