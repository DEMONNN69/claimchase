"""
Core grievance models for ClaimChase.
Implements InsuranceCompany, Case, CaseTimeline, EmailTracking, Consent, and Document models.
Fat Models with business logic embedded.
"""

from django.db import models
from django.utils import timezone
from datetime import timedelta
from claimchase.apps.users.models import CustomUser
from cloudinary.models import CloudinaryField


class InsuranceCompany(models.Model):
    """
    Insurance Company Master Data
    Stores all insurance companies with their grievance contact details
    """
    CATEGORY_CHOICES = [
        ('life', 'Life Insurance'),
        ('health', 'Health Insurance'),
        ('general', 'General Insurance'),
    ]
    
    name = models.CharField(max_length=255, unique=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    
    # Contact Information
    grievance_email = models.EmailField(help_text="Primary grievance email")
    additional_emails = models.JSONField(default=list, blank=True, help_text="Additional emails as list")
    grievance_helpline = models.CharField(max_length=500, blank=True, help_text="Helpline numbers")
    gro_email = models.EmailField(blank=True, help_text="Grievance Redressal Officer email")
    
    # Additional Info
    website = models.URLField(blank=True)
    correspondence_address = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Insurance Company"
        verbose_name_plural = "Insurance Companies"
        indexes = [
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.get_category_display()})"


class Case(models.Model):
    """
    Represents an insurance grievance/claim case.
    
    Fat Model: Contains logic for status transitions, timeline checks, ombudsman eligibility.
    """
    
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('under_review', 'Under Review'),
        ('rejected', 'Rejected'),
        ('escalated_to_ombudsman', 'Escalated to Ombudsman'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    INSURANCE_TYPE_CHOICES = [
        ('motor', 'Motor Insurance'),
        ('health', 'Health Insurance'),
        ('home', 'Home Insurance'),
        ('life', 'Life Insurance'),
        ('travel', 'Travel Insurance'),
        ('other', 'Other'),
    ]
    
    # Relationships
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='cases',
        help_text="User who filed the complaint"
    )
    
    # Case metadata
    case_number = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique case identifier (e.g., CC-2025-001)"
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='draft',
        db_index=True,
        help_text="Current status of the case"
    )
    priority = models.CharField(
        max_length=20,
        choices=PRIORITY_CHOICES,
        default='medium',
        help_text="Case priority level"
    )
    
    # Grievance details
    insurance_company = models.ForeignKey(
        InsuranceCompany,
        on_delete=models.PROTECT,
        related_name='cases',
        null=True,
        blank=True,
        help_text="Insurance company (foreign key)"
    )
    insurance_type = models.CharField(
        max_length=30,
        choices=INSURANCE_TYPE_CHOICES,
        help_text="Type of insurance policy"
    )
    policy_number = models.CharField(
        max_length=100,
        db_index=True,
        help_text="Insurance policy number"
    )
    insurance_company_name = models.CharField(
        max_length=255,
        help_text="Name of the insurance company (legacy field, use insurance_company FK)"
    )
    
    # Complaint details
    subject = models.CharField(
        max_length=255,
        help_text="Subject of the grievance"
    )
    description = models.TextField(
        help_text="Detailed description of the complaint"
    )
    date_of_incident = models.DateField(
        help_text="Date when the incident/rejection occurred"
    )
    date_of_rejection = models.DateField(
        null=True,
        blank=True,
        help_text="Date when policy was rejected (if applicable)"
    )
    
    # Drafting and submission
    draft_content = models.JSONField(
        default=dict,
        blank=True,
        help_text="JSON draft of the complaint (for multi-step form)"
    )
    submission_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the case was formally submitted"
    )
    
    # Escalation tracking
    is_escalated_to_ombudsman = models.BooleanField(
        default=False,
        db_index=True,
        help_text="Whether case has been escalated to ombudsman"
    )
    escalation_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date of escalation to ombudsman"
    )
    
    # Resolution
    resolution_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date case was resolved"
    )
    resolution_notes = models.TextField(
        blank=True,
        help_text="Notes on how the case was resolved"
    )
    
    # Gmail Integration - for tracking email threads
    gmail_thread_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        db_index=True,
        help_text="Gmail thread ID for tracking replies to this case"
    )
    gmail_message_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Gmail message ID of the original grievance email"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'grievance_core_case'
        verbose_name = 'Case'
        verbose_name_plural = 'Cases'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['case_number']),
            models.Index(fields=['policy_number']),
            models.Index(fields=['is_escalated_to_ombudsman']),
            models.Index(fields=['-created_at']),
            models.Index(fields=['gmail_thread_id']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.case_number} - {self.subject}"
    
    # ===== Fat Model Methods =====
    
    def can_transition_to(self, new_status: str) -> tuple[bool, str]:
        """
        Validate if case can transition to a new status.
        Returns (is_valid, message)
        """
        valid_transitions = {
            'draft': ['submitted'],
            'submitted': ['under_review', 'rejected'],
            'under_review': ['rejected', 'escalated_to_ombudsman', 'resolved'],
            'rejected': ['escalated_to_ombudsman'],
            'escalated_to_ombudsman': ['resolved', 'closed'],
            'resolved': ['closed'],
            'closed': [],
        }
        
        if new_status not in valid_transitions.get(self.status, []):
            return False, f"Cannot transition from {self.status} to {new_status}"
        
        return True, "Valid transition"
    
    def transition_to(self, new_status: str) -> bool:
        """
        Transition case to new status if valid.
        Returns True if successful, False otherwise.
        """
        is_valid, _ = self.can_transition_to(new_status)
        if is_valid:
            self.status = new_status
            if new_status == 'submitted' and not self.submission_date:
                self.submission_date = timezone.now()
            if new_status in ['resolved', 'closed']:
                self.resolution_date = timezone.now()
            self.save()
            return True
        return False
    
    def is_eligible_for_ombudsman_escalation(self) -> tuple[bool, str]:
        """
        Check if case is eligible to be escalated to ombudsman.
        Rules: Submitted 15+ days ago OR rejected by insurance.
        Returns (is_eligible, reason)
        """
        # Not eligible if already escalated or resolved
        if self.is_escalated_to_ombudsman or self.status in ['resolved', 'closed']:
            return False, "Case already escalated or closed"
        
        # Check if 15 days have passed since submission
        if self.submission_date:
            days_since_submission = (timezone.now() - self.submission_date).days
            if days_since_submission >= 15:
                return True, "15+ days since submission"
        
        # Check if rejected by insurance
        if self.status == 'rejected':
            return True, "Rejected by insurance company"
        
        return False, "Not eligible yet (not 15 days old and not rejected)"
    
    def escalate_to_ombudsman(self) -> bool:
        """
        Escalate case to ombudsman if eligible.
        Returns True if successful, False otherwise.
        """
        is_eligible, _ = self.is_eligible_for_ombudsman_escalation()
        if is_eligible:
            self.is_escalated_to_ombudsman = True
            self.escalation_date = timezone.now()
            self.status = 'escalated_to_ombudsman'
            self.save()
            return True
        return False
    
    def get_days_since_submission(self) -> int:
        """Calculate days since case submission."""
        if self.submission_date:
            return (timezone.now() - self.submission_date).days
        return 0
    
    def get_days_since_incident(self) -> int:
        """Calculate days since incident occurred."""
        return (timezone.now().date() - self.date_of_incident).days
    
    def mark_as_resolved(self, notes: str = "") -> bool:
        """Mark case as resolved."""
        if self.transition_to('resolved'):
            self.resolution_notes = notes
            self.save()
            return True
        return False
    
    def get_ombudsman_status(self) -> dict:
        """
        Get comprehensive ombudsman eligibility status.
        Returns dict with:
        - is_eligible: Boolean, True if eligible for ombudsman escalation
        - days_remaining: Integer, days until eligible (0 if already eligible)
        - reason: String explaining the status
        """
        # Check if already escalated or closed
        if self.is_escalated_to_ombudsman:
            return {
                'is_eligible': False,
                'days_remaining': 0,
                'reason': 'Case already escalated to ombudsman',
            }
        
        if self.status in ['resolved', 'closed']:
            return {
                'is_eligible': False,
                'days_remaining': 0,
                'reason': f'Case is {self.status}, cannot escalate',
            }
        
        # Check if rejected by insurance (immediately eligible)
        if self.status == 'rejected':
            return {
                'is_eligible': True,
                'days_remaining': 0,
                'reason': 'Rejected by insurance company - immediately eligible',
            }
        
        # Check 15-day rule from submission date
        if self.submission_date:
            days_since_submission = (timezone.now() - self.submission_date).days
            days_until_eligible = 15 - days_since_submission
            
            if days_since_submission >= 15:
                return {
                    'is_eligible': True,
                    'days_remaining': 0,
                    'reason': '15+ days since submission - eligible for escalation',
                }
            else:
                return {
                    'is_eligible': False,
                    'days_remaining': max(0, days_until_eligible),
                    'reason': f'{days_until_eligible} days until eligible for escalation',
                }
        
        # Not submitted yet
        return {
            'is_eligible': False,
            'days_remaining': 15,
            'reason': 'Case not submitted yet - must submit before escalation',
        }


class CaseTimeline(models.Model):
    """
    Audit trail for case status changes and important events.
    Immutable record of what happened and when.
    """
    
    EVENT_TYPE_CHOICES = [
        ('created', 'Case Created'),
        ('status_change', 'Status Changed'),
        ('document_uploaded', 'Document Uploaded'),
        ('email_received', 'Email Received'),
        ('email_sent', 'Email Sent'),
        ('escalated', 'Escalated to Ombudsman'),
        ('comment_added', 'Comment Added'),
        ('resolved', 'Case Resolved'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='timeline_events',
        help_text="Associated case"
    )
    
    event_type = models.CharField(
        max_length=30,
        choices=EVENT_TYPE_CHOICES,
        help_text="Type of event"
    )
    description = models.TextField(
        help_text="Description of the event"
    )
    old_value = models.CharField(
        max_length=255,
        blank=True,
        help_text="Previous value (for status changes)"
    )
    new_value = models.CharField(
        max_length=255,
        blank=True,
        help_text="New value (for status changes)"
    )
    
    # Optional reference to related objects
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='timeline_events_created',
        help_text="User who triggered this event"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'grievance_core_casetimeline'
        verbose_name = 'Case Timeline'
        verbose_name_plural = 'Case Timelines'
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['event_type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.case.case_number} - {self.event_type} - {self.created_at}"


class EmailTracking(models.Model):
    """
    Track emails sent and received related to a case.
    Records metadata: sender, recipient, subject, timestamps.
    
    PRIVACY NOTE: For inbound emails, body content is NOT stored for privacy compliance.
    Users can view email content directly in their Gmail inbox.
    Only outbound emails (sent by user) have body stored for reference.
    """
    
    EMAIL_TYPE_CHOICES = [
        ('inbound', 'Inbound'),
        ('outbound', 'Outbound'),
    ]
    
    EMAIL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('bounced', 'Bounced'),
        ('failed', 'Failed'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='emails',
        help_text="Associated case"
    )
    
    email_type = models.CharField(
        max_length=20,
        choices=EMAIL_TYPE_CHOICES,
        help_text="Direction of email (inbound/outbound)"
    )
    
    from_email = models.EmailField(help_text="Sender email address")
    to_email = models.EmailField(help_text="Recipient email address")
    cc_emails = models.CharField(
        max_length=500,
        blank=True,
        help_text="CC recipients (comma-separated)"
    )
    
    subject = models.CharField(max_length=255, help_text="Email subject")
    body = models.TextField(
        help_text="Email body content. For inbound emails, this is not stored for privacy compliance."
    )
    
    status = models.CharField(
        max_length=20,
        choices=EMAIL_STATUS_CHOICES,
        default='pending',
        help_text="Delivery status"
    )
    
    sent_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email was sent"
    )
    delivered_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When email was delivered"
    )
    
    # Gmail Integration
    gmail_message_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Gmail message ID for tracking"
    )
    gmail_thread_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Gmail thread ID for conversation tracking"
    )
    
    # Metadata
    is_automated = models.BooleanField(
        default=False,
        help_text="Whether email was auto-generated by system"
    )
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='emails_created',
        help_text="User who sent the email (if manual)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'grievance_core_emailtracking'
        verbose_name = 'Email Tracking'
        verbose_name_plural = 'Email Tracking'
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['email_type', 'status']),
            models.Index(fields=['from_email']),
            models.Index(fields=['to_email']),
            models.Index(fields=['gmail_message_id']),
            models.Index(fields=['gmail_thread_id']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.email_type.upper()} - {self.subject}"


class Consent(models.Model):
    """
    Legal consent records for GDPR, data sharing, communications, etc.
    """
    
    CONSENT_TYPE_CHOICES = [
        ('data_processing', 'Data Processing Consent'),
        ('email_communication', 'Email Communication'),
        ('phone_communication', 'Phone Communication'),
        ('information_sharing', 'Third-Party Information Sharing'),
        ('terms_and_conditions', 'Terms and Conditions'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='consents',
        help_text="Associated case"
    )
    
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='consents',
        help_text="User providing consent"
    )
    
    consent_type = models.CharField(
        max_length=50,
        choices=CONSENT_TYPE_CHOICES,
        help_text="Type of consent"
    )
    
    is_given = models.BooleanField(
        default=False,
        help_text="Whether consent was given"
    )
    
    given_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When consent was given"
    )
    
    revoked_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When consent was revoked (if applicable)"
    )
    
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address at time of consent"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Additional notes"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'grievance_core_consent'
        verbose_name = 'Consent'
        verbose_name_plural = 'Consents'
        unique_together = [['case', 'user', 'consent_type']]
        indexes = [
            models.Index(fields=['user', 'consent_type']),
            models.Index(fields=['case', 'consent_type']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.consent_type}"
    
    @property
    def is_active(self) -> bool:
        """Check if consent is currently active (given and not revoked)."""
        return self.is_given and self.revoked_at is None
    
    def revoke(self) -> None:
        """Revoke the consent."""
        self.revoked_at = timezone.now()
        self.save()


class Document(models.Model):
    """
    Store documents uploaded by users or attached to cases.
    Supports local storage and S3 integration.
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('policy_document', 'Policy Document'),
        ('rejection_letter', 'Rejection Letter'),
        ('support_document', 'Support Document'),
        ('communication', 'Communication'),
        ('proof_of_payment', 'Proof of Payment'),
        ('medical_report', 'Medical Report'),
        ('other', 'Other'),
    ]
    
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='documents',
        help_text="Associated case"
    )
    
    uploaded_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        help_text="User who uploaded the document"
    )
    
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        help_text="Type of document"
    )
    
    file = CloudinaryField(
        'document',
        resource_type='raw',
        folder='claimchase/documents',
        use_filename=True,
        unique_filename=True,
        help_text="File upload to Cloudinary"
    )
    
    file_name = models.CharField(
        max_length=255,
        help_text="Original file name"
    )
    
    file_size = models.BigIntegerField(
        help_text="File size in bytes"
    )
    
    file_type = models.CharField(
        max_length=50,
        help_text="MIME type (e.g., application/pdf)"
    )
    
    description = models.TextField(
        blank=True,
        help_text="Description of document content"
    )
    
    # Metadata
    is_verified = models.BooleanField(
        default=False,
        help_text="Whether document has been verified by admin"
    )
    verified_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='verified_documents',
        help_text="Admin who verified the document"
    )
    verified_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When document was verified"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'grievance_core_document'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        indexes = [
            models.Index(fields=['case', '-created_at']),
            models.Index(fields=['document_type']),
            models.Index(fields=['is_verified']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.file_name} - {self.case.case_number}"
    
    @property
    def file_url(self) -> str:
        """Return a signed URL for accessing the file (works with authenticated/restricted resources)."""
        if self.file:
            try:
                import cloudinary
                import cloudinary.utils
                
                # Get the public_id from the file
                public_id = str(self.file)
                
                # For authenticated/restricted files, use CloudinaryResource.build_url with authentication
                # This generates a signed URL that works with restricted access control
                signed_url = cloudinary.CloudinaryResource(public_id, resource_type='raw').build_url(
                    sign_url=True,
                    secure=True,
                    type='authenticated'  # Critical: tells Cloudinary this is an authenticated resource
                )
                
                if signed_url:
                    return signed_url
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to generate signed URL: {e}")
            
            # Fallback to regular URL (may not work for restricted files)
            return self.file.url
        return ""
    
    def mark_as_verified(self, verified_by: CustomUser) -> None:
        """Mark document as verified by an admin."""
        self.is_verified = True
        self.verified_by = verified_by
        self.verified_at = timezone.now()
        self.save()


class Notification(models.Model):
    """
    In-app notifications for users about case updates.
    """
    NOTIFICATION_TYPES = [
        ('email_reply', 'Email Reply Received'),
        ('status_change', 'Case Status Changed'),
        ('document_uploaded', 'Document Uploaded'),
        ('reminder', 'Reminder'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='notifications')
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name='notifications', null=True, blank=True)
    type = models.CharField(max_length=50, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    action_url = models.CharField(max_length=500, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        return f"{self.type} - {self.user.username} - {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.save(update_fields=['is_read'])
