"""
Medical Review models for ClaimChase.
Handles medical reviewer profiles, document assignments, and reviews.
"""

from django.db import models
from django.utils import timezone
from claimchase.apps.users.models import CustomUser
from claimchase.apps.grievance_core.models import Case, Document


class MedicalReviewerProfile(models.Model):
    """
    Profile for medical reviewers with their specialization.
    Created during reviewer onboarding after admin creates their account.
    """
    
    SPECIALIZATION_CHOICES = [
        ('general_medicine', 'General Medicine'),
        ('cardiology', 'Cardiology'),
        ('orthopedics', 'Orthopedics'),
        ('neurology', 'Neurology'),
        ('oncology', 'Oncology'),
        ('pediatrics', 'Pediatrics'),
        ('surgery', 'General Surgery'),
        ('radiology', 'Radiology'),
        ('pathology', 'Pathology'),
        ('psychiatry', 'Psychiatry'),
        ('dermatology', 'Dermatology'),
        ('ophthalmology', 'Ophthalmology'),
        ('ent', 'ENT'),
        ('gynecology', 'Gynecology'),
        ('urology', 'Urology'),
        ('pulmonology', 'Pulmonology'),
        ('gastroenterology', 'Gastroenterology'),
        ('nephrology', 'Nephrology'),
        ('endocrinology', 'Endocrinology'),
        ('other', 'Other'),
    ]
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='medical_profile',
        help_text="Associated user account"
    )
    
    full_name = models.CharField(
        max_length=255,
        help_text="Full name of the medical reviewer"
    )
    
    specialization = models.CharField(
        max_length=50,
        choices=SPECIALIZATION_CHOICES,
        help_text="Medical specialization"
    )
    
    other_specialization = models.CharField(
        max_length=100,
        blank=True,
        help_text="If specialization is 'other', specify here"
    )
    
    years_of_experience = models.PositiveIntegerField(
        default=0,
        help_text="Years of medical practice"
    )
    
    is_onboarded = models.BooleanField(
        default=False,
        help_text="Whether reviewer has completed onboarding"
    )
    
    is_available = models.BooleanField(
        default=True,
        help_text="Whether reviewer is available for new assignments"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medical_review_profile'
        verbose_name = 'Medical Reviewer Profile'
        verbose_name_plural = 'Medical Reviewer Profiles'
        ordering = ['full_name']
    
    def __str__(self):
        return f"Dr. {self.full_name} ({self.get_specialization_display()})"
    
    @property
    def display_specialization(self):
        if self.specialization == 'other' and self.other_specialization:
            return self.other_specialization
        return self.get_specialization_display()


class ReviewAssignment(models.Model):
    """
    Assignment of documents to medical reviewers.
    Groups documents from the same case together for a reviewer.
    """
    
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('needs_more_info', 'Needs More Information'),
    ]
    
    # The case these documents belong to
    case = models.ForeignKey(
        Case,
        on_delete=models.CASCADE,
        related_name='review_assignments',
        help_text="Associated case"
    )
    
    # The reviewer assigned to review
    reviewer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='review_assignments',
        limit_choices_to={'role': 'medical_reviewer'},
        help_text="Assigned medical reviewer"
    )
    
    # Who assigned this review
    assigned_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_assignments',
        help_text="Admin who assigned this review"
    )
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending',
        db_index=True
    )
    
    # Assignment notes from admin
    admin_notes = models.TextField(
        blank=True,
        help_text="Notes from admin to reviewer"
    )
    
    # Timestamps
    assigned_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When reviewer started the review"
    )
    completed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When review was completed"
    )
    
    class Meta:
        db_table = 'medical_review_assignment'
        verbose_name = 'Review Assignment'
        verbose_name_plural = 'Review Assignments'
        ordering = ['-assigned_at']
        indexes = [
            models.Index(fields=['reviewer', 'status']),
            models.Index(fields=['case', '-assigned_at']),
        ]
    
    def __str__(self):
        return f"Assignment #{self.id} - {self.case.case_number} → {self.reviewer.get_full_name()}"
    
    @property
    def document_count(self):
        return self.documents.count()
    
    @property
    def reviewed_count(self):
        return self.documents.filter(reviews__isnull=False).distinct().count()
    
    def mark_started(self):
        """Mark assignment as in progress"""
        if not self.started_at:
            self.started_at = timezone.now()
            self.status = 'in_progress'
            self.save(update_fields=['started_at', 'status'])
    
    def check_completion(self):
        """Check if all documents are reviewed and update status"""
        total = self.documents.count()
        reviewed = self.documents.filter(reviews__assignment=self).distinct().count()
        
        if total > 0 and total == reviewed:
            # Check if any needs more info
            needs_info = self.documents.filter(
                reviews__assignment=self,
                reviews__outcome='needs_more_info'
            ).exists()
            
            self.status = 'needs_more_info' if needs_info else 'completed'
            self.completed_at = timezone.now()
            self.save(update_fields=['status', 'completed_at'])


class AssignmentDocument(models.Model):
    """
    Documents included in a review assignment.
    Links documents to assignments (many-to-many relationship).
    """
    
    assignment = models.ForeignKey(
        ReviewAssignment,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='review_assignments'
    )
    
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'medical_review_assignment_document'
        verbose_name = 'Assignment Document'
        verbose_name_plural = 'Assignment Documents'
        unique_together = ['assignment', 'document']
    
    def __str__(self):
        return f"{self.document.file_name} in Assignment #{self.assignment.id}"


class DocumentReview(models.Model):
    """
    Individual document review by a medical reviewer.
    Contains the review outcome and comments.
    """
    
    OUTCOME_CHOICES = [
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('needs_more_info', 'Needs More Information'),
    ]
    
    # Link to the assignment (for grouping and access control)
    assignment = models.ForeignKey(
        ReviewAssignment,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="Parent assignment"
    )
    
    # Link to the assignment document
    assignment_document = models.ForeignKey(
        AssignmentDocument,
        on_delete=models.CASCADE,
        related_name='reviews',
        help_text="The document being reviewed"
    )
    
    # The reviewer (denormalized for easier queries)
    reviewer = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='document_reviews',
        help_text="Reviewer who made this review"
    )
    
    outcome = models.CharField(
        max_length=20,
        choices=OUTCOME_CHOICES,
        help_text="Review outcome"
    )
    
    comments = models.TextField(
        help_text="Detailed comments and observations"
    )
    
    # If needs more info, what's needed
    additional_info_requested = models.TextField(
        blank=True,
        help_text="If outcome is 'needs_more_info', specify what's needed"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medical_review_document_review'
        verbose_name = 'Document Review'
        verbose_name_plural = 'Document Reviews'
        ordering = ['-created_at']
        # One reviewer can only review a document once per assignment
        unique_together = ['assignment_document', 'reviewer']
        indexes = [
            models.Index(fields=['assignment', 'outcome']),
            models.Index(fields=['reviewer', '-created_at']),
        ]
    
    def __str__(self):
        return f"Review by {self.reviewer.get_full_name()} - {self.get_outcome_display()}"
    
    def save(self, *args, **kwargs):
        # Auto-populate reviewer from assignment if not set
        if not self.reviewer_id and self.assignment_id:
            self.reviewer = self.assignment.reviewer
        super().save(*args, **kwargs)
        
        # Check if assignment is complete
        self.assignment.check_completion()


class ReviewerStats(models.Model):
    """
    Cached statistics for medical reviewers.
    Updated when reviews are submitted.
    """
    
    reviewer = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='review_stats'
    )
    
    total_assignments = models.PositiveIntegerField(default=0)
    pending_assignments = models.PositiveIntegerField(default=0)
    completed_assignments = models.PositiveIntegerField(default=0)
    
    total_documents_reviewed = models.PositiveIntegerField(default=0)
    approved_count = models.PositiveIntegerField(default=0)
    rejected_count = models.PositiveIntegerField(default=0)
    needs_info_count = models.PositiveIntegerField(default=0)
    
    # Performance metrics
    avg_review_time_hours = models.FloatField(
        default=0,
        help_text="Average time to complete a review in hours"
    )
    
    last_updated = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'medical_review_stats'
        verbose_name = 'Reviewer Statistics'
        verbose_name_plural = 'Reviewer Statistics'
    
    def __str__(self):
        return f"Stats for {self.reviewer.get_full_name()}"
    
    @classmethod
    def update_for_reviewer(cls, reviewer):
        """Update stats for a specific reviewer"""
        from django.db.models import Avg, ExpressionWrapper, F, DurationField
        
        stats, _ = cls.objects.get_or_create(reviewer=reviewer)
        
        assignments = ReviewAssignment.objects.filter(reviewer=reviewer)
        reviews = DocumentReview.objects.filter(reviewer=reviewer)
        
        stats.total_assignments = assignments.count()
        stats.pending_assignments = assignments.filter(status='pending').count()
        stats.completed_assignments = assignments.filter(status='completed').count()
        
        stats.total_documents_reviewed = reviews.count()
        stats.approved_count = reviews.filter(outcome='approved').count()
        stats.rejected_count = reviews.filter(outcome='rejected').count()
        stats.needs_info_count = reviews.filter(outcome='needs_more_info').count()
        
        # Calculate average review time (from assignment to completion)
        completed_assignments = assignments.filter(
            completed_at__isnull=False,
            started_at__isnull=False
        )
        
        # Calculate average manually since Django doesn't have ExtractEpoch
        total_hours = 0
        count = 0
        for assignment in completed_assignments:
            duration = assignment.completed_at - assignment.started_at
            total_hours += duration.total_seconds() / 3600
            count += 1
        
        if count > 0:
            stats.avg_review_time_hours = total_hours / count
        
        stats.save()
        return stats
