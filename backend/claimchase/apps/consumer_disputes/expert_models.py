"""
Expert Review Models for Consumer Disputes
Mirrors the medical_review app structure for consistency
"""

from django.db import models
from django.utils import timezone
from claimchase.apps.users.models import CustomUser
from .models import ConsumerDispute, DisputeDocument


class ExpertProfile(models.Model):
    """
    Profile for dispute review experts.
    Mirrors MedicalReviewerProfile structure.
    """
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='expert_profile',
        help_text="User account for the expert"
    )
    
    license_number = models.CharField(
        max_length=100,
        blank=True,
        help_text="Professional license/certification number"
    )
    
    years_of_experience = models.PositiveIntegerField(
        default=0,
        help_text="Years of experience in dispute resolution"
    )
    
    bio = models.TextField(
        blank=True,
        help_text="Expert's background and expertise"
    )
    
    is_active = models.BooleanField(
        default=True,
        help_text="Whether the expert is currently active"
    )
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'consumer_disputes_expert_profile'
        verbose_name = 'Expert Profile'
        verbose_name_plural = 'Expert Profiles'
        ordering = ['user__first_name', 'user__last_name']
    
    def __str__(self):
        return f"Expert: {self.user.get_full_name()}"
    
    def get_active_assignments_count(self):
        """Count of active assignments"""
        return self.assignments.filter(
            status__in=['pending', 'in_review']
        ).count()
    
    def get_completed_assignments_count(self):
        """Count of completed assignments"""
        return self.assignments.filter(
            status='completed'
        ).count()


class DisputeAssignment(models.Model):
    """
    Assignment of a consumer dispute to an expert for review.
    Mirrors Assignment model from medical_review.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('in_review', 'In Review'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    dispute = models.ForeignKey(
        ConsumerDispute,
        on_delete=models.CASCADE,
        related_name='expert_assignments',
        help_text="Consumer dispute being reviewed"
    )
    
    expert = models.ForeignKey(
        ExpertProfile,
        on_delete=models.CASCADE,
        related_name='assignments',
        help_text="Expert assigned to review"
    )
    
    assigned_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='expert_assignments_created',
        help_text="Admin who created the assignment"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Current status of the assignment"
    )
    
    priority = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low'),
            ('medium', 'Medium'),
            ('high', 'High'),
            ('urgent', 'Urgent'),
        ],
        default='medium',
        help_text="Priority level of the review"
    )
    
    notes = models.TextField(
        blank=True,
        help_text="Assignment notes or special instructions"
    )
    
    # Expert's review
    review_summary = models.TextField(
        blank=True,
        help_text="Expert's overall review summary"
    )
    
    recommendation = models.CharField(
        max_length=20,
        choices=[
            ('approve', 'Approve'),
            ('reject', 'Reject'),
            ('needs_info', 'Needs More Information'),
            ('escalate', 'Escalate'),
        ],
        blank=True,
        help_text="Expert's recommendation"
    )
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When expert started the review"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When review was completed"
    )
    
    class Meta:
        db_table = 'consumer_disputes_assignment'
        verbose_name = 'Dispute Assignment'
        verbose_name_plural = 'Dispute Assignments'
        indexes = [
            models.Index(fields=['expert', 'status']),
            models.Index(fields=['dispute', 'status']),
            models.Index(fields=['-assigned_at']),
        ]
        ordering = ['-assigned_at']
    
    def __str__(self):
        return f"{self.dispute.dispute_id} → {self.expert.user.get_full_name()}"
    
    def start_review(self):
        """Mark assignment as in review"""
        if self.status == 'pending':
            self.status = 'in_review'
            self.started_at = timezone.now()
            self.save()
    
    def complete_review(self, recommendation, summary):
        """Mark assignment as completed"""
        self.status = 'completed'
        self.recommendation = recommendation
        self.review_summary = summary
        self.completed_at = timezone.now()
        self.save()
    
    def cancel(self):
        """Cancel the assignment"""
        self.status = 'cancelled'
        self.save()


class DisputeDocumentReview(models.Model):
    """
    Expert's review of individual dispute documents.
    Mirrors DocumentReview from medical_review.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('verified', 'Verified'),
        ('rejected', 'Rejected'),
        ('needs_clarification', 'Needs Clarification'),
    ]
    
    assignment = models.ForeignKey(
        DisputeAssignment,
        on_delete=models.CASCADE,
        related_name='document_reviews',
        help_text="Assignment this review belongs to"
    )
    
    document = models.ForeignKey(
        DisputeDocument,
        on_delete=models.CASCADE,
        related_name='expert_reviews',
        help_text="Document being reviewed"
    )
    
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending',
        help_text="Review status"
    )
    
    comments = models.TextField(
        blank=True,
        help_text="Expert's comments on the document"
    )
    
    is_authentic = models.BooleanField(
        null=True,
        blank=True,
        help_text="Whether document appears authentic"
    )
    
    confidence_level = models.CharField(
        max_length=20,
        choices=[
            ('low', 'Low Confidence'),
            ('medium', 'Medium Confidence'),
            ('high', 'High Confidence'),
        ],
        blank=True,
        help_text="Expert's confidence in the review"
    )
    
    # Timestamps
    reviewed_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'consumer_disputes_document_review'
        verbose_name = 'Document Review'
        verbose_name_plural = 'Document Reviews'
        indexes = [
            models.Index(fields=['assignment', 'status']),
            models.Index(fields=['document']),
        ]
        ordering = ['-reviewed_at']
        unique_together = [['assignment', 'document']]
    
    def __str__(self):
        return f"Review: {self.document.file_name} by {self.assignment.expert.user.get_full_name()}"
    
    def mark_verified(self, comments=''):
        """Mark document as verified"""
        self.status = 'verified'
        self.comments = comments
        self.is_authentic = True
        self.save()
    
    def mark_rejected(self, comments):
        """Mark document as rejected"""
        self.status = 'rejected'
        self.comments = comments
        self.is_authentic = False
        self.save()
