"""
Service layer for grievance_core app.
Handles complex workflows and business logic.

Service Layer Pattern: These classes encapsulate multi-step operations,
error handling, and data transformations. Views should call these services,
not execute business logic directly.
"""

import logging
from typing import Dict, Tuple, Optional
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from django.core.exceptions import ValidationError

from claimchase.apps.users.models import CustomUser
from .models import Case, CaseTimeline, EmailTracking, Consent, Document

logger = logging.getLogger(__name__)


class CaseService:
    """
    Service for managing case operations.
    Handles: Case creation, status transitions, escalations, timeline tracking.
    """
    
    @staticmethod
    def generate_case_number() -> str:
        """
        Generate a unique case number.
        Format: CC-YYYY-[COUNT]
        Example: CC-2025-00001
        """
        from django.db.models import Max, F
        from django.db.models.functions import Cast
        
        current_year = timezone.now().year
        latest_case = Case.objects.filter(
            case_number__startswith=f'CC-{current_year}-'
        ).order_by('-id').first()
        
        if latest_case:
            # Extract the numeric part and increment
            parts = latest_case.case_number.split('-')
            current_count = int(parts[-1])
            new_count = current_count + 1
        else:
            new_count = 1
        
        return f'CC-{current_year}-{new_count:05d}'
    
    @staticmethod
    @transaction.atomic
    def create_case(
        user: CustomUser,
        insurance_type: str,
        policy_number: str,
        insurance_company_name: str,
        subject: str,
        description: str,
        date_of_incident: datetime.date,
        date_of_rejection: Optional[datetime.date] = None,
        priority: str = 'medium',
        draft_content: Optional[Dict] = None,
    ) -> Tuple[Case, str]:
        """
        Create a new grievance case.
        
        Args:
            user: The complainant user
            insurance_type: Type of insurance (motor, health, etc.)
            policy_number: Insurance policy number
            insurance_company_name: Name of insurance company
            subject: Grievance subject
            description: Detailed grievance description
            date_of_incident: Date when incident occurred
            date_of_rejection: Date of rejection (if applicable)
            priority: Case priority (low, medium, high, urgent)
            draft_content: Optional JSON draft content
        
        Returns:
            Tuple[Case, str]: Created case and success message
        
        Raises:
            ValidationError: If validation fails
        """
        try:
            # Validation
            if not user.is_verified:
                raise ValidationError("User email must be verified before creating a case.")
            
            if date_of_incident > timezone.now().date():
                raise ValidationError("Incident date cannot be in the future.")
            
            if date_of_rejection and date_of_rejection > timezone.now().date():
                raise ValidationError("Rejection date cannot be in the future.")
            
            # Generate unique case number
            case_number = CaseService.generate_case_number()
            
            # Create case
            case = Case.objects.create(
                user=user,
                case_number=case_number,
                insurance_type=insurance_type,
                policy_number=policy_number,
                insurance_company_name=insurance_company_name,
                subject=subject,
                description=description,
                date_of_incident=date_of_incident,
                date_of_rejection=date_of_rejection,
                priority=priority,
                draft_content=draft_content or {},
                status='draft',
            )
            
            # Log timeline event
            CaseTimeline.objects.create(
                case=case,
                event_type='created',
                description=f'Case {case_number} created for policy {policy_number}',
                created_by=user,
            )
            
            # Increment user's case count
            user.increment_case_count()
            
            logger.info(f"Case {case_number} created by {user.email}")
            return case, f"Case {case_number} created successfully."
        
        except ValidationError as e:
            logger.error(f"Validation error creating case: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating case: {e}")
            raise
    
    @staticmethod
    @transaction.atomic
    def submit_case(case: Case) -> Tuple[bool, str]:
        """
        Submit a case from draft status.
        
        Returns:
            Tuple[bool, str]: Success status and message
        """
        try:
            if case.status != 'draft':
                return False, f"Cannot submit case with status '{case.status}'"
            
            # Validate required fields
            if not case.subject or not case.description:
                return False, "Case must have subject and description"
            
            # Transition to submitted
            success = case.transition_to('submitted')
            if not success:
                return False, "Failed to transition case to submitted status"
            
            # Log timeline event
            CaseTimeline.objects.create(
                case=case,
                event_type='status_change',
                description='Case submitted for review',
                old_value='draft',
                new_value='submitted',
                created_by=case.user,
            )
            
            logger.info(f"Case {case.case_number} submitted")
            return True, "Case submitted successfully"
        
        except Exception as e:
            logger.error(f"Error submitting case {case.case_number}: {e}")
            return False, f"Error submitting case: {str(e)}"
    
    @staticmethod
    @transaction.atomic
    def update_case_status(
        case: Case,
        new_status: str,
        notes: Optional[str] = None,
    ) -> Tuple[bool, str]:
        """
        Update case status with validation and timeline tracking.
        
        Returns:
            Tuple[bool, str]: Success status and message
        """
        try:
            old_status = case.status
            success = case.transition_to(new_status)
            
            if not success:
                is_valid, reason = case.can_transition_to(new_status)
                return False, reason
            
            # Log timeline event
            CaseTimeline.objects.create(
                case=case,
                event_type='status_change',
                description=notes or f'Status changed to {new_status}',
                old_value=old_status,
                new_value=new_status,
            )
            
            logger.info(f"Case {case.case_number} status updated: {old_status} → {new_status}")
            return True, f"Case status updated to {new_status}"
        
        except Exception as e:
            logger.error(f"Error updating case {case.case_number} status: {e}")
            return False, f"Error updating status: {str(e)}"
    
    @staticmethod
    @transaction.atomic
    def check_and_escalate_to_ombudsman(case: Case) -> Tuple[bool, str]:
        """
        Check if case is eligible for ombudsman escalation and escalate if eligible.
        
        Returns:
            Tuple[bool, str]: Success status and reason/message
        """
        try:
            is_eligible, reason = case.is_eligible_for_ombudsman_escalation()
            
            if not is_eligible:
                return False, reason
            
            success = case.escalate_to_ombudsman()
            if success:
                # Log timeline event
                CaseTimeline.objects.create(
                    case=case,
                    event_type='escalated',
                    description='Case escalated to ombudsman',
                    created_by=case.user,
                )
                
                # Update user's ombudsman eligibility flag
                case.user.is_ombudsman_eligible = True
                case.user.save(update_fields=['is_ombudsman_eligible'])
                
                logger.info(f"Case {case.case_number} escalated to ombudsman")
                return True, "Case escalated to ombudsman successfully"
            else:
                return False, "Escalation failed"
        
        except Exception as e:
            logger.error(f"Error escalating case {case.case_number}: {e}")
            return False, f"Error during escalation: {str(e)}"
    
    @staticmethod
    @transaction.atomic
    def record_email_reply(
        case: Case,
        from_email: str,
        to_email: str,
        subject: str,
        body: str,
        email_type: str = 'inbound',
        created_by: Optional[CustomUser] = None,
    ) -> Tuple[EmailTracking, str]:
        """
        Record an email received or sent related to a case.
        
        Returns:
            Tuple[EmailTracking, str]: Created EmailTracking object and message
        """
        try:
            email_tracking = EmailTracking.objects.create(
                case=case,
                from_email=from_email,
                to_email=to_email,
                subject=subject,
                body=body,
                email_type=email_type,
                created_by=created_by,
                status='delivered' if email_type == 'inbound' else 'sent',
                sent_at=timezone.now(),
            )
            
            # Log timeline event
            event_type = 'email_received' if email_type == 'inbound' else 'email_sent'
            CaseTimeline.objects.create(
                case=case,
                event_type=event_type,
                description=f'Email: {subject}',
                created_by=created_by,
            )
            
            logger.info(f"Email tracked for case {case.case_number}")
            return email_tracking, "Email recorded successfully"
        
        except Exception as e:
            logger.error(f"Error recording email for case {case.case_number}: {e}")
            raise
    
    @staticmethod
    def get_case_summary(case: Case) -> Dict:
        """
        Get a comprehensive summary of a case for display/reporting.
        
        Returns:
            Dict with case details, timeline, documents, etc.
        """
        return {
            'id': case.id,
            'case_number': case.case_number,
            'status': case.status,
            'priority': case.priority,
            'insurance_type': case.insurance_type,
            'policy_number': case.policy_number,
            'insurance_company_name': case.insurance_company_name,
            'subject': case.subject,
            'description': case.description,
            'date_of_incident': case.date_of_incident.isoformat(),
            'date_of_rejection': case.date_of_rejection.isoformat() if case.date_of_rejection else None,
            'is_escalated_to_ombudsman': case.is_escalated_to_ombudsman,
            'escalation_date': case.escalation_date.isoformat() if case.escalation_date else None,
            'days_since_submission': case.get_days_since_submission(),
            'days_since_incident': case.get_days_since_incident(),
            'created_at': case.created_at.isoformat(),
            'updated_at': case.updated_at.isoformat(),
            'user': {
                'id': case.user.id,
                'email': case.user.email,
                'name': case.user.get_full_name(),
            },
            'document_count': case.documents.count(),
            'email_count': case.emails.count(),
            'timeline_events_count': case.timeline_events.count(),
        }


class ConsentService:
    """
    Service for managing user consents (GDPR, communications, data sharing).
    """
    
    @staticmethod
    @transaction.atomic
    def create_or_update_consent(
        case: Case,
        user: CustomUser,
        consent_type: str,
        is_given: bool,
        ip_address: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> Tuple[Consent, bool]:
        """
        Create or update a consent record.
        
        Returns:
            Tuple[Consent, bool]: Consent object and whether it was created (True) or updated (False)
        """
        try:
            consent, created = Consent.objects.get_or_create(
                case=case,
                user=user,
                consent_type=consent_type,
                defaults={
                    'is_given': is_given,
                    'given_at': timezone.now() if is_given else None,
                    'ip_address': ip_address,
                    'notes': notes,
                }
            )
            
            if not created:
                consent.is_given = is_given
                consent.given_at = timezone.now() if is_given else consent.given_at
                consent.ip_address = ip_address or consent.ip_address
                consent.notes = notes or consent.notes
                consent.save()
            
            logger.info(f"Consent '{consent_type}' {'created' if created else 'updated'} for {user.email}")
            return consent, created
        
        except Exception as e:
            logger.error(f"Error managing consent: {e}")
            raise


class DocumentService:
    """
    Service for managing case documents.
    Handles uploads, verification, and file management.
    """
    
    @staticmethod
    @transaction.atomic
    def upload_document(
        case: Case,
        file,
        file_name: str,
        document_type: str,
        uploaded_by: CustomUser,
        description: Optional[str] = None,
    ) -> Tuple[Document, str]:
        """
        Upload and track a document for a case.
        
        Returns:
            Tuple[Document, str]: Created Document object and message
        """
        try:
            # File size validation (max 10MB)
            max_size = 10 * 1024 * 1024  # 10MB
            if file.size > max_size:
                raise ValidationError(f"File size exceeds 10MB limit")
            
            # Create document record
            document = Document.objects.create(
                case=case,
                uploaded_by=uploaded_by,
                document_type=document_type,
                file=file,
                file_name=file_name,
                file_size=file.size,
                file_type=file.content_type,
                description=description or '',
            )
            
            # Log timeline event
            CaseTimeline.objects.create(
                case=case,
                event_type='document_uploaded',
                description=f'Document uploaded: {file_name}',
                created_by=uploaded_by,
            )
            
            # Increment user's document count
            uploaded_by.increment_document_count()
            
            logger.info(f"Document '{file_name}' uploaded for case {case.case_number}")
            return document, "Document uploaded successfully"
        
        except ValidationError as e:
            logger.error(f"Document validation error: {e}")
            raise
        except Exception as e:
            logger.error(f"Error uploading document: {e}")
            raise
    
    @staticmethod
    def verify_document(
        document: Document,
        verified_by: CustomUser,
    ) -> Tuple[bool, str]:
        """
        Mark a document as verified by an admin.
        
        Returns:
            Tuple[bool, str]: Success status and message
        """
        try:
            document.mark_as_verified(verified_by)
            
            # Log timeline event
            CaseTimeline.objects.create(
                case=document.case,
                event_type='comment_added',
                description=f'Document verified: {document.file_name}',
                created_by=verified_by,
            )
            
            logger.info(f"Document {document.id} verified by {verified_by.email}")
            return True, "Document verified successfully"
        
        except Exception as e:
            logger.error(f"Error verifying document: {e}")
            return False, f"Error verifying document: {str(e)}"


class EmailTrackingService:
    """
    Service for email tracking and metadata monitoring.
    Checks for replies and updates case status accordingly.
    """
    
    @staticmethod
    @transaction.atomic
    def check_for_replies(case_id: int) -> Tuple[bool, str]:
        """
        Check for email replies related to a case.
        
        Simulates checking an email provider (Gmail API placeholder).
        If a reply is found, updates case status to 'reply_received' and logs timeline event.
        
        Args:
            case_id: ID of the case to check
        
        Returns:
            Tuple[bool, str]: Success status and message
        """
        try:
            case = Case.objects.get(id=case_id)
        except Case.ShuklasNotExist:
            return False, f"Case with ID {case_id} not found"
        
        except Exception as e:
            logger.error(f"Error retrieving case {case_id}: {e}")
            return False, f"Error retrieving case: {str(e)}"
        
        try:
            # Simulate email provider check (placeholder for Gmail API)
            mock_reply = EmailTrackingService._simulate_provider_check(case)
            
            if mock_reply:
                # Update case status if reply found
                old_status = case.status
                case.status = 'under_review'  # Mark as under review since reply received
                case.save()
                
                # Log timeline event documenting reply detection
                CaseTimeline.objects.create(
                    case=case,
                    event_type='email_received',
                    description=f'Reply detected via email metadata check: {mock_reply.get("subject", "No Subject")}',
                    old_value=old_status,
                    new_value=case.status,
                )
                
                # Create EmailTracking record
                EmailTracking.objects.create(
                    case=case,
                    email_type='inbound',
                    from_email=mock_reply.get('from_email', 'noreply@provider.com'),
                    to_email=case.user.email,
                    subject=mock_reply.get('subject', 'Reply to your case'),
                    body=mock_reply.get('body', 'We have received your case and are reviewing it.'),
                    status='delivered',
                    is_automated=True,
                    sent_at=timezone.now(),
                )
                
                logger.info(f"Reply detected for case {case.case_number}: {mock_reply.get('subject')}")
                return True, f"Reply found for case {case.case_number}. Status updated to 'under_review'."
            else:
                logger.info(f"No replies found for case {case.case_number}")
                return True, f"No new replies found for case {case.case_number}."
        
        except Exception as e:
            logger.error(f"Error checking for replies on case {case_id}: {e}")
            return False, f"Error checking for replies: {str(e)}"
    
    @staticmethod
    def _simulate_provider_check(case: Case) -> Optional[Dict]:
        """
        Simulate checking an email provider (Gmail API, Outlook API, etc.).
        
        This is a placeholder. In production, replace with actual API calls:
        - Gmail API: gmail.users().messages().list()
        - Outlook: Microsoft Graph API
        - Generic IMAP: imaplib
        
        Returns:
            Dict with mock reply data or None if no reply found
        """
        import random
        
        # Simulate 30% chance of finding a reply
        if random.random() < 0.3:
            mock_replies = [
                {
                    'subject': f'Re: {case.subject}',
                    'from_email': case.insurance_company_name.lower().replace(' ', '') + '@insurer.com',
                    'body': f'Thank you for reporting your grievance regarding policy {case.policy_number}. '
                            f'We are currently reviewing your case and will provide a response within 7 days.',
                },
                {
                    'subject': f'Case Update: {case.case_number}',
                    'from_email': 'support@insurer.com',
                    'body': f'Your case {case.case_number} has been escalated to our claims team. '
                            f'Please expect an update within 5 business days.',
                },
            ]
            return random.choice(mock_replies)
        
        return None
    
    @staticmethod
    def get_email_summary(case: Case) -> Dict:
        """
        Get a summary of all emails related to a case.
        
        Returns:
            Dict with email metadata and counts
        """
        emails = case.emails.all()
        
        return {
            'total_emails': emails.count(),
            'inbound_count': emails.filter(email_type='inbound').count(),
            'outbound_count': emails.filter(email_type='outbound').count(),
            'delivered_count': emails.filter(status='delivered').count(),
            'failed_count': emails.filter(status__in=['bounced', 'failed']).count(),
            'last_email': {
                'subject': emails.first().subject if emails.exists() else None,
                'sent_at': emails.first().created_at.isoformat() if emails.exists() else None,
            },
        }

