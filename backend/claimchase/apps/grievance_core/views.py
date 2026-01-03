"""
DRF Views for grievance_core app.
Handles API endpoints for case management and status tracking.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
import logging

from .models import InsuranceCompany, Case, CaseTimeline, EmailTracking, Document
from .serializers import (
    InsuranceCompanySerializer,
    CaseDetailSerializer,
    CaseListSerializer,
    CaseCreateSerializer,
    CaseTimelineSerializer,
    EmailTrackingSerializer,
    DocumentBriefSerializer,
    CaseStatusResponseSerializer,
)
from .services import CaseService, EmailTrackingService, DocumentService

logger = logging.getLogger(__name__)


class InsuranceCompanyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for Insurance Company model.
    Provides list and retrieve endpoints for insurance companies.
    """
    queryset = InsuranceCompany.objects.filter(is_active=True)
    serializer_class = InsuranceCompanySerializer
    permission_classes = [AllowAny]  # Public access for company list
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'category']
    ordering_fields = ['name', 'category', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        """Filter by category if provided."""
        queryset = super().get_queryset()
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        return queryset


class CaseViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Case model.
    Provides full CRUD operations and custom actions for case management.
    """
    
    permission_classes = [IsAuthenticated]
    queryset = Case.objects.all()
    
    def get_queryset(self):
        """Filter cases to show only user's cases (unless admin)."""
        user = self.request.user
        if user.is_staff:
            return Case.objects.all()
        return Case.objects.filter(user=user)
    
    def get_serializer_class(self):
        """Use different serializers for list, detail, and create views."""
        if self.action == 'retrieve':
            return CaseDetailSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CaseCreateSerializer
        return CaseListSerializer
    
    def perform_create(self, serializer):
        """Automatically set the user when creating a case."""
        serializer.save(user=self.request.user)
    
    @action(detail=True, methods=['get'])
    def status(self, request, pk=None):
        """
        Get detailed status information for a case.
        
        Returns case status, ombudsman eligibility, and timeline summary.
        Endpoint: GET /api/cases/{id}/status/
        """
        case = self.get_object()
        
        response_data = {
            'case': CaseDetailSerializer(case).data,
            'status_summary': {
                'case_number': case.case_number,
                'current_status': case.status,
                'status_display': case.get_status_display(),
                'priority': case.priority,
                'is_escalated': case.is_escalated_to_ombudsman,
                'ombudsman_eligibility': case.get_ombudsman_status(),
                'days_since_submission': case.get_days_since_submission(),
                'timeline_count': case.timeline_events.count(),
                'document_count': case.documents.count(),
                'email_count': case.emails.count(),
                'last_update': case.updated_at.isoformat(),
            }
        }
        
        serializer = CaseStatusResponseSerializer(response_data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def check_for_replies(self, request, pk=None):
        """
        Check for email replies related to this case.
        
        Simulates checking an email provider and updates case status if reply found.
        Endpoint: POST /api/cases/{id}/check_for_replies/
        """
        case = self.get_object()
        
        success, message = EmailTrackingService.check_for_replies(case.id)
        
        if success:
            case.refresh_from_db()
            return Response({
                'success': True,
                'message': message,
                'case': CaseDetailSerializer(case).data,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': message,
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def mark_as_sent(self, request, pk=None):
        """
        Mark a case as having email sent (status: 'sent').
        
        Convenience action for transitioning draft cases to 'sent' status.
        Endpoint: POST /api/cases/{id}/mark_as_sent/
        
        Request body (optional):
        {
            "notes": "Email sent to insurance company"
        }
        """
        case = self.get_object()
        notes = request.data.get('notes', 'Email sent')
        
        # Validate current status - only draft can be marked as sent
        if case.status != 'draft':
            return Response({
                'success': False,
                'message': f'Cannot mark as sent - current status is {case.status}. Only draft cases can be marked as sent.',
                'current_status': case.status,
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status to submitted (which represents "sent")
        success, message = CaseService.update_case_status(case, 'submitted', notes)
        
        case.refresh_from_db()
        
        if success:
            return Response({
                'success': True,
                'message': 'Case marked as sent successfully',
                'case': CaseDetailSerializer(case).data,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': message,
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Get timeline events for a case.
        
        Returns all status changes and events in chronological order.
        Endpoint: GET /api/cases/{id}/timeline/
        """
        case = self.get_object()
        timeline_events = case.timeline_events.all().order_by('-created_at')
        
        serializer = CaseTimelineSerializer(timeline_events, many=True)
        return Response({
            'case_number': case.case_number,
            'event_count': timeline_events.count(),
            'events': serializer.data,
        })
    
    @action(detail=True, methods=['get'])
    def emails(self, request, pk=None):
        """
        Get email tracking for a case.
        
        Returns all inbound and outbound emails related to the case.
        Endpoint: GET /api/cases/{id}/emails/
        """
        case = self.get_object()
        emails = case.emails.all().order_by('-created_at')
        
        serializer = EmailTrackingSerializer(emails, many=True)
        return Response({
            'case_number': case.case_number,
            'email_count': emails.count(),
            'emails': serializer.data,
        })
    
    @action(detail=True, methods=['get'])
    def documents(self, request, pk=None):
        """
        Get documents attached to a case.
        
        Returns all uploaded documents with verification status.
        Endpoint: GET /api/cases/{id}/documents/
        """
        case = self.get_object()
        documents = case.documents.all().order_by('-created_at')
        
        serializer = DocumentBriefSerializer(documents, many=True)
        return Response({
            'case_number': case.case_number,
            'document_count': documents.count(),
            'verified_count': documents.filter(is_verified=True).count(),
            'documents': serializer.data,
        })
    
    @action(detail=True, methods=['get'])
    def ombudsman_eligibility(self, request, pk=None):
        """
        Check ombudsman escalation eligibility for a case.
        
        Returns detailed eligibility status and days remaining.
        Endpoint: GET /api/cases/{id}/ombudsman_eligibility/
        """
        case = self.get_object()
        ombudsman_status = case.get_ombudsman_status()
        
        return Response({
            'case_number': case.case_number,
            'current_status': case.status,
            'is_already_escalated': case.is_escalated_to_ombudsman,
            **ombudsman_status,
        })
    
    @action(detail=True, methods=['post'])
    def escalate_to_ombudsman(self, request, pk=None):
        """
        Attempt to escalate case to ombudsman.
        
        Only succeeds if case meets eligibility criteria.
        Endpoint: POST /api/cases/{id}/escalate_to_ombudsman/
        """
        case = self.get_object()
        
        # Check eligibility
        is_eligible, reason = case.is_eligible_for_ombudsman_escalation()
        
        if not is_eligible:
            return Response({
                'success': False,
                'message': reason,
                'ombudsman_status': case.get_ombudsman_status(),
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Attempt escalation via service
        success, message = CaseService.check_and_escalate_to_ombudsman(case)
        
        case.refresh_from_db()
        
        if success:
            return Response({
                'success': True,
                'message': message,
                'case': CaseDetailSerializer(case).data,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': message,
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """
        Manually update case status.
        
        Handles transitions like 'email sent', 'under review', etc.
        Endpoint: POST /api/cases/{id}/update_status/
        
        Request body:
        {
            "new_status": "under_review",
            "notes": "Email sent to insurance company"
        }
        """
        case = self.get_object()
        
        # Get new status from request
        new_status = request.data.get('new_status')
        notes = request.data.get('notes', '')
        
        if not new_status:
            return Response({
                'success': False,
                'message': 'new_status field is required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate transition
        is_valid, reason = case.can_transition_to(new_status)
        if not is_valid:
            return Response({
                'success': False,
                'message': reason,
                'current_status': case.status,
                'valid_transitions': self._get_valid_transitions(case),
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update status via service
        success, message = CaseService.update_case_status(case, new_status, notes)
        
        case.refresh_from_db()
        
        if success:
            return Response({
                'success': True,
                'message': message,
                'case': CaseDetailSerializer(case).data,
            }, status=status.HTTP_200_OK)
        else:
            return Response({
                'success': False,
                'message': message,
            }, status=status.HTTP_400_BAD_REQUEST)
    
    @staticmethod
    def _get_valid_transitions(case: Case) -> list:
        """Get list of valid next statuses for a case."""
        valid_transitions = {
            'draft': ['submitted'],
            'submitted': ['under_review', 'rejected'],
            'under_review': ['rejected', 'escalated_to_ombudsman', 'resolved'],
            'rejected': ['escalated_to_ombudsman'],
            'escalated_to_ombudsman': ['resolved', 'closed'],
            'resolved': ['closed'],
            'closed': [],
        }
        return valid_transitions.get(case.status, [])


class CaseTimelineViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for CaseTimeline model.
    Provides read-only access to case audit trail.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = CaseTimelineSerializer
    
    def get_queryset(self):
        """Filter timeline events to show only for user's cases."""
        user = self.request.user
        if user.is_staff:
            return CaseTimeline.objects.all()
        return CaseTimeline.objects.filter(case__user=user).order_by('-created_at')


class EmailTrackingViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for EmailTracking model.
    Provides read-only access to email metadata and tracking.
    """
    
    permission_classes = [IsAuthenticated]
    serializer_class = EmailTrackingSerializer
    
    def get_queryset(self):
        """Filter emails to show only for user's cases."""
        user = self.request.user
        if user.is_staff:
            return EmailTracking.objects.all()
        return EmailTracking.objects.filter(case__user=user).order_by('-created_at')


class CaseStatusView:
    """
    Helper view class for getting comprehensive case status information.
    Used by the case detail endpoint.
    """
    
    @staticmethod
    def get_case_status(case_id: int) -> dict:
        """
        Get comprehensive status information for a case.
        
        Returns dict with:
        - case details
        - ombudsman eligibility
        - timeline summary
        - email summary
        - document summary
        """
        case = get_object_or_404(Case, id=case_id)
        
        return {
            'case': CaseDetailSerializer(case).data,
            'ombudsman_status': case.get_ombudsman_status(),
            'email_summary': EmailTrackingService.get_email_summary(case),
            'timeline_count': case.timeline_events.count(),
            'document_count': case.documents.count(),
        }
