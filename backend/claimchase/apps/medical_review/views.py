"""
API Views for Medical Review.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from .models import (
    MedicalReviewerProfile,
    ReviewAssignment,
    AssignmentDocument,
    DocumentReview,
    ReviewerStats,
)
from .serializers import (
    MedicalReviewerProfileSerializer,
    OnboardingSerializer,
    ReviewAssignmentListSerializer,
    ReviewAssignmentDetailSerializer,
    CreateAssignmentSerializer,
    AssignmentDocumentSerializer,
    DocumentReviewSerializer,
    CreateDocumentReviewSerializer,
    ReviewerStatsSerializer,
    AdminDocumentReviewSerializer,
)
from claimchase.apps.users.models import CustomUser
from claimchase.apps.grievance_core.models import Case, Document


# ==================== Permission Classes ====================

class IsMedicalReviewer(permissions.BasePermission):
    """Only allow medical reviewers"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            request.user.role == 'medical_reviewer'
        )


class IsAdminOrStaff(permissions.BasePermission):
    """Only allow admins or staff"""
    
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated and 
            (request.user.is_staff or request.user.is_superuser)
        )


# ==================== Reviewer Profile Views ====================

class ReviewerProfileViewSet(viewsets.ModelViewSet):
    """
    ViewSet for medical reviewer profiles.
    """
    serializer_class = MedicalReviewerProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        if user.is_staff or user.is_superuser:
            return MedicalReviewerProfile.objects.all()
        return MedicalReviewerProfile.objects.filter(user=user)
    
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile"""
        try:
            profile = request.user.medical_profile
            return Response(MedicalReviewerProfileSerializer(profile).data)
        except MedicalReviewerProfile.DoesNotExist:
            return Response({'detail': 'Profile not found'}, status=404)
    
    @action(detail=False, methods=['post'])
    def onboard(self, request):
        """Complete onboarding for new reviewer"""
        if request.user.role != 'medical_reviewer':
            return Response(
                {'detail': 'Only medical reviewers can onboard'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Check if already onboarded
        if hasattr(request.user, 'medical_profile') and request.user.medical_profile.is_onboarded:
            return Response(
                {'detail': 'Already onboarded'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = OnboardingSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        
        return Response(
            MedicalReviewerProfileSerializer(profile).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def check_onboarding(self, request):
        """Check if current user needs onboarding"""
        if request.user.role != 'medical_reviewer':
            return Response({'needs_onboarding': False, 'is_reviewer': False})
        
        try:
            profile = request.user.medical_profile
            return Response({
                'needs_onboarding': not profile.is_onboarded,
                'is_reviewer': True,
                'profile': MedicalReviewerProfileSerializer(profile).data if profile.is_onboarded else None
            })
        except MedicalReviewerProfile.DoesNotExist:
            return Response({
                'needs_onboarding': True,
                'is_reviewer': True,
                'profile': None
            })


# ==================== Assignment Views ====================

class ReviewAssignmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for review assignments.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action in ['list', 'my_assignments']:
            return ReviewAssignmentListSerializer
        if self.action == 'create':
            return CreateAssignmentSerializer
        return ReviewAssignmentDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        # Admins see all assignments
        if user.is_staff or user.is_superuser:
            return ReviewAssignment.objects.all().select_related(
                'case', 'reviewer', 'assigned_by'
            ).prefetch_related('documents__document')
        
        # Reviewers only see their assignments
        if user.role == 'medical_reviewer':
            return ReviewAssignment.objects.filter(reviewer=user).select_related(
                'case', 'assigned_by'
            ).prefetch_related('documents__document')
        
        return ReviewAssignment.objects.none()
    
    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context
    
    @action(detail=False, methods=['get'], permission_classes=[IsMedicalReviewer])
    def my_assignments(self, request):
        """Get current reviewer's assignments"""
        status_filter = request.query_params.get('status')
        
        queryset = self.get_queryset()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[IsMedicalReviewer])
    def start_review(self, request, pk=None):
        """Mark assignment as started"""
        assignment = self.get_object()
        
        if assignment.reviewer != request.user:
            return Response(
                {'detail': 'Not your assignment'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        assignment.mark_started()
        return Response(ReviewAssignmentDetailSerializer(assignment, context={'request': request}).data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsMedicalReviewer])
    def stats(self, request):
        """Get current reviewer's statistics"""
        stats = ReviewerStats.update_for_reviewer(request.user)
        return Response(ReviewerStatsSerializer(stats).data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsMedicalReviewer])
    def dashboard_summary(self, request):
        """Get dashboard summary for reviewer"""
        user = request.user
        assignments = ReviewAssignment.objects.filter(reviewer=user)
        
        # Group by case for the pending view
        pending_assignments = assignments.filter(
            status__in=['pending', 'in_progress']
        ).select_related('case').prefetch_related('documents__document')
        
        # Group by case
        cases_data = {}
        for assignment in pending_assignments:
            case_id = assignment.case.id
            if case_id not in cases_data:
                cases_data[case_id] = {
                    'case_id': case_id,
                    'case_number': assignment.case.case_number,
                    'insurance_company': (
                        assignment.case.insurance_company.name 
                        if assignment.case.insurance_company 
                        else assignment.case.insurance_company_name
                    ),
                    'assignments': []
                }
            cases_data[case_id]['assignments'].append(
                ReviewAssignmentListSerializer(assignment).data
            )
        
        return Response({
            'pending_count': assignments.filter(status='pending').count(),
            'in_progress_count': assignments.filter(status='in_progress').count(),
            'completed_count': assignments.filter(status='completed').count(),
            'needs_info_count': assignments.filter(status='needs_more_info').count(),
            'cases': list(cases_data.values())
        })


# ==================== Document Review Views ====================

class DocumentReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for document reviews.
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return CreateDocumentReviewSerializer
        return DocumentReviewSerializer
    
    def get_queryset(self):
        user = self.request.user
        
        if user.is_staff or user.is_superuser:
            return DocumentReview.objects.all()
        
        if user.role == 'medical_reviewer':
            return DocumentReview.objects.filter(reviewer=user)
        
        return DocumentReview.objects.none()
    
    def perform_create(self, serializer):
        review = serializer.save()
        # Update stats
        ReviewerStats.update_for_reviewer(review.reviewer)
    
    @action(detail=False, methods=['post'], permission_classes=[IsMedicalReviewer])
    def submit_review(self, request):
        """Submit a review for a document"""
        serializer = CreateDocumentReviewSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        
        # Update stats
        ReviewerStats.update_for_reviewer(request.user)
        
        return Response(
            DocumentReviewSerializer(review).data,
            status=status.HTTP_201_CREATED
        )


# ==================== Admin Views ====================

class AdminAssignmentView(APIView):
    """
    Admin view for creating and managing assignments.
    """
    permission_classes = [IsAdminOrStaff]
    
    def post(self, request):
        """Create a new assignment"""
        serializer = CreateAssignmentSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        assignment = serializer.save()
        
        return Response(
            ReviewAssignmentDetailSerializer(assignment, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class AdminReviewersListView(APIView):
    """
    List all medical reviewers for admin assignment.
    """
    permission_classes = [IsAdminOrStaff]
    
    def get(self, request):
        """Get list of medical reviewers"""
        reviewers = CustomUser.objects.filter(
            role='medical_reviewer'
        ).select_related('medical_profile')
        
        data = []
        for reviewer in reviewers:
            profile = getattr(reviewer, 'medical_profile', None)
            data.append({
                'id': reviewer.id,
                'email': reviewer.email,
                'name': reviewer.get_full_name(),
                'is_onboarded': profile.is_onboarded if profile else False,
                'specialization': profile.display_specialization if profile else None,
                'is_available': profile.is_available if profile else False,
                'pending_count': ReviewAssignment.objects.filter(
                    reviewer=reviewer, 
                    status='pending'
                ).count()
            })
        
        return Response(data)


class AdminCaseReviewsView(APIView):
    """
    Get all reviews for a case (admin only).
    """
    permission_classes = [IsAdminOrStaff]
    
    def get(self, request, case_id):
        """Get all reviews for a specific case"""
        case = get_object_or_404(Case, id=case_id)
        
        assignments = ReviewAssignment.objects.filter(case=case).prefetch_related(
            'documents__document',
            'documents__reviews',
            'reviews'
        )
        
        # Get all reviews across all assignments
        all_reviews = DocumentReview.objects.filter(
            assignment__case=case
        ).select_related('reviewer', 'assignment_document__document')
        
        return Response({
            'case_id': case.id,
            'case_number': case.case_number,
            'total_assignments': assignments.count(),
            'assignments': ReviewAssignmentDetailSerializer(
                assignments, many=True, context={'request': request}
            ).data,
            'all_reviews': AdminDocumentReviewSerializer(all_reviews, many=True).data
        })


class CaseDocumentsForAssignmentView(APIView):
    """
    Get documents from a case that can be assigned for review.
    """
    permission_classes = [IsAdminOrStaff]
    
    def get(self, request, case_id):
        """Get case documents available for assignment"""
        case = get_object_or_404(Case, id=case_id)
        documents = case.documents.all()
        
        data = []
        for doc in documents:
            # Check existing assignments
            existing_reviewers = AssignmentDocument.objects.filter(
                document=doc
            ).values_list('assignment__reviewer__id', flat=True)
            
            data.append({
                'id': doc.id,
                'file_name': doc.file_name,
                'file_type': doc.file_type,
                'document_type': doc.document_type,
                'file_url': doc.file_url,
                'created_at': doc.created_at,
                'assigned_to_reviewers': list(existing_reviewers)
            })
        
        return Response({
            'case_id': case.id,
            'case_number': case.case_number,
            'documents': data
        })
