"""
DRF Views for grievance_core app.
Handles API endpoints for case management and status tracking.
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.utils import timezone
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
from .gmail_service import GmailSendService, GmailEncryption

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
    
    @action(detail=True, methods=['get', 'post'])
    def documents(self, request, pk=None):
        """
        Get or upload documents for a case.
        
        GET /api/cases/{id}/documents/ - List all documents
        POST /api/cases/{id}/documents/ - Upload a new document
        
        POST body (multipart/form-data):
        {
            "file": <file>,
            "document_type": "policy_document",
            "description": "Optional description"
        }
        """
        case = self.get_object()
        
        if request.method == 'POST':
            # Handle file upload
            file = request.FILES.get('file')
            document_type = request.data.get('document_type', 'other')
            description = request.data.get('description', '')
            
            if not file:
                return Response({
                    'success': False,
                    'message': 'No file provided',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                # Create document record
                document = Document.objects.create(
                    case=case,
                    uploaded_by=request.user,
                    document_type=document_type,
                    file=file,
                    file_name=file.name,
                    file_size=file.size,
                    file_type=file.content_type,
                    description=description,
                )
                
                # Add timeline event
                CaseTimeline.objects.create(
                    case=case,
                    event_type='document_uploaded',
                    description=f'Document uploaded: {file.name}',
                    created_by=request.user
                )
                
                return Response({
                    'success': True,
                    'message': 'Document uploaded successfully',
                    'document': DocumentBriefSerializer(document).data,
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                logger.error(f"Error uploading document: {e}")
                return Response({
                    'success': False,
                    'message': f'Failed to upload document: {str(e)}',
                }, status=status.HTTP_400_BAD_REQUEST)
        
        # GET request - list documents
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
    
    @action(detail=True, methods=['post'])
    def send_email(self, request, pk=None):
        """
        Send grievance email via Gmail.
        
        Endpoint: POST /api/cases/{id}/send_email/
        
        Request body:
        {
            "email_body": "The grievance letter content",
            "cc_emails": ["optional@email.com"]  # Optional
        }
        
        Returns:
        {
            "success": true,
            "message": "Email sent successfully",
            "message_id": "gmail_message_id",
            "thread_id": "gmail_thread_id"
        }
        """
        case = self.get_object()
        user = request.user
        email_body = request.data.get('email_body')
        cc_emails = request.data.get('cc_emails', [])
        
        # Validate input
        if not email_body:
            return Response({
                'success': False,
                'message': 'email_body is required',
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user has Gmail connected
        if not user.gmail_connected or not user.gmail_refresh_token:
            return Response({
                'success': False,
                'message': 'Gmail account not connected. Please connect your Gmail first.',
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            # Decrypt refresh token
            refresh_token = GmailEncryption.decrypt(user.gmail_refresh_token)
            
            if not refresh_token:
                return Response({
                    'success': False,
                    'message': 'Failed to decrypt Gmail refresh token',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Get fresh access token
            access_token = GmailSendService.refresh_access_token(refresh_token)
            
            if not access_token:
                return Response({
                    'success': False,
                    'message': 'Failed to refresh Gmail access token. Please reconnect your Gmail account.',
                }, status=status.HTTP_401_UNAUTHORIZED)
            
            # Get insurance company email
            insurance_company_email = case.insurance_company.grievance_email if case.insurance_company else None
            
            if not insurance_company_email:
                return Response({
                    'success': False,
                    'message': 'Insurance company grievance email not available',
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Send email via Gmail API
            result = GmailSendService.send_email(
                access_token=access_token,
                from_email=user.gmail_email,
                to_email=insurance_company_email,
                subject=f"Insurance Grievance - Policy {case.policy_number}",
                body=email_body,
                cc_emails=cc_emails
            )
            
            if not result['success']:
                return Response({
                    'success': False,
                    'message': result['error'],
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create EmailTracking record
            email_tracking = EmailTracking.objects.create(
                case=case,
                email_type='outbound',
                from_email=user.gmail_email,
                to_email=insurance_company_email,
                cc_emails=', '.join(cc_emails) if cc_emails else '',
                subject=f"Insurance Grievance - Policy {case.policy_number}",
                body=email_body,
                status='sent',
                sent_at=timezone.now(),
                gmail_message_id=result['message_id'],
                gmail_thread_id=result['thread_id'],
                is_automated=True,
                created_by=user
            )
            
            # Update case status and save Gmail thread ID for reply tracking
            case.status = 'submitted'
            case.gmail_thread_id = result['thread_id']
            case.gmail_message_id = result['message_id']
            case.save(update_fields=['status', 'gmail_thread_id', 'gmail_message_id', 'updated_at'])
            
            # Add timeline event
            CaseTimeline.objects.create(
                case=case,
                event_type='email_sent',
                description=f'Grievance email sent to {insurance_company_email}',
                created_by=user
            )
            
            logger.info(f"Grievance email sent for case {case.case_number} by user {user.email}")
            
            return Response({
                'success': True,
                'message': 'Email sent successfully',
                'message_id': result['message_id'],
                'thread_id': result['thread_id'],
                'case': CaseDetailSerializer(case).data,
            }, status=status.HTTP_200_OK)
        
        except Exception as e:
            logger.error(f"Error sending email for case {case.case_number}: {e}")
            return Response({
                'success': False,
                'message': 'Failed to send email',
                'error': str(e),
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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


@api_view(['GET'])
@permission_classes([AllowAny])
def get_insurance_types(request):
    """
    Get available insurance type choices.
    
    GET /api/insurance-types/
    
    Returns:
    {
        "insurance_types": [
            {"value": "motor", "label": "Motor Insurance"},
            ...
        ]
    }
    """
    insurance_types = [
        {"value": choice[0], "label": choice[1]}
        for choice in Case.INSURANCE_TYPE_CHOICES
    ]
    
    return Response({
        'insurance_types': insurance_types
    })


@api_view(['GET'])
@permission_classes([AllowAny])  # We'll handle auth manually with token parameter
def document_proxy(request, document_id):
    """
    Proxy endpoint to serve document files.
    This allows secure access to Cloudinary private resources.
    
    GET /api/documents/<id>/file/?token=<auth_token>
    """
    from django.http import HttpResponse, HttpResponseRedirect
    from rest_framework.authtoken.models import Token
    import requests
    
    # Get token from query parameter or Authorization header
    token_key = request.GET.get('token') or request.META.get('HTTP_AUTHORIZATION', '').replace('Token ', '').replace('Bearer ', '')
    
    if not token_key:
        return Response(
            {'error': 'Authentication token required'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Authenticate user
    try:
        token = Token.objects.get(key=token_key)
        user = token.user
    except Token.DoesNotExist:
        return Response(
            {'error': 'Invalid authentication token'},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    document = get_object_or_404(Document, id=document_id)
    
    # Check if user has permission to access this document
    has_access = False
    
    # Case owner
    if document.case.user == user:
        has_access = True
    
    # Admin/Staff
    if user.is_staff or user.is_superuser:
        has_access = True
    
    # Medical reviewer with assignment containing this document
    if hasattr(user, 'is_medical_reviewer') and user.is_medical_reviewer:
        from claimchase.apps.medical_review.models import AssignmentDocument
        has_access = AssignmentDocument.objects.filter(
            document=document,
            assignment__reviewer=user
        ).exists()
    
    if not has_access:
        return Response(
            {'error': 'You do not have permission to access this document'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get the file URL
    if document.file:
        try:
            # For Cloudinary, generate a signed URL
            import cloudinary.utils
            
            public_id = str(document.file)
            
            # Generate a signed URL
            signed_url, _ = cloudinary.utils.cloudinary_url(
                public_id,
                sign_url=True,
                secure=True,
            )
            
            # Redirect to the signed URL
            return HttpResponseRedirect(signed_url)
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
            # Fallback to direct URL
            return HttpResponseRedirect(document.file.url)
    
    return Response(
        {'error': 'Document file not found'},
        status=status.HTTP_404_NOT_FOUND
    )

