"""
User models for ClaimChase.
Implements CustomUser extending AbstractUser with domain-specific fields.
"""

from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import RegexValidator
from django.db.models import F


class CustomUser(AbstractUser):
    """
    Custom user model extending Django's AbstractUser.
    
    Fat Model: Contains validation logic and helper methods for user operations.
    """
    
    ROLE_CHOICES = [
        ('complainant', 'Insurance Complainant'),
        ('ombudsman_admin', 'Ombudsman Admin'),
        ('insurance_agent', 'Insurance Company Agent'),
        ('support_staff', 'Support Staff'),
        ('medical_reviewer', 'Medical Reviewer'),
    ]
    
    # Custom fields
    email = models.EmailField(unique=True, db_index=True)
    phone = models.CharField(
        max_length=15,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message='Phone number must be between 9 and 15 digits.',
                code='invalid_phone'
            )
        ]
    )
    address = models.TextField(blank=True, help_text="Full address")
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    
    # Personal information
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(
        max_length=10,
        choices=[('M', 'Male'), ('F', 'Female'), ('O', 'Other')],
        blank=True
    )
    
    # User profile
    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default='complainant',
        help_text="User role within the system"
    )
    is_verified = models.BooleanField(default=False, help_text="Email/phone verified")
    is_ombudsman_eligible = models.BooleanField(
        default=False,
        help_text="Eligible to escalate to ombudsman"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_login_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Metadata
    document_count = models.IntegerField(default=0, help_text="Number of documents uploaded")
    case_count = models.IntegerField(default=0, help_text="Number of cases created")
    
    # Profile completion
    insurance_company = models.ForeignKey(
        'grievance_core.InsuranceCompany',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        help_text="Selected insurance company"
    )
    problem_type = models.CharField(
        max_length=100,
        blank=True,
        help_text="Type of insurance problem: mediclaim, life_insurance, critical_illness, motor_insurance, marine_claim, fire_claim, or custom"
    )
    
    # Gmail Integration
    gmail_refresh_token = models.TextField(
        null=True,
        blank=True,
        help_text="Encrypted Gmail refresh token for OAuth"
    )
    gmail_email = models.EmailField(
        null=True,
        blank=True,
        help_text="Connected Gmail address"
    )
    gmail_connected = models.BooleanField(
        default=False,
        help_text="Whether Gmail account is connected"
    )
    gmail_token_expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the Gmail access token expires"
    )
    
    # Gmail Pub/Sub Watch for incoming email tracking
    gmail_watch_expiration = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the Gmail Pub/Sub watch expires (needs renewal every 7 days)"
    )
    gmail_history_id = models.CharField(
        max_length=50,
        null=True,
        blank=True,
        help_text="Last known Gmail history ID for incremental sync"
    )
    
    class Meta:
        db_table = 'users_customuser'
        verbose_name = 'User'
        verbose_name_plural = 'Users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['role']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.get_full_name()} ({self.email})"
    
    # ===== Fat Model Methods =====
    
    @property
    def is_complainant(self) -> bool:
        """Check if user is a complainant."""
        return self.role == 'complainant'
    
    @property
    def is_ombudsman_admin(self) -> bool:
        """Check if user is an ombudsman admin."""
        return self.role == 'ombudsman_admin'
    
    @property
    def is_insurance_agent(self) -> bool:
        """Check if user is an insurance company agent."""
        return self.role == 'insurance_agent'
    
    @property
    def is_medical_reviewer(self) -> bool:
        """Check if user is a medical reviewer."""
        return self.role == 'medical_reviewer'
    
    def get_full_name(self) -> str:
        """Return full name or username."""
        if self.first_name or self.last_name:
            return f"{self.first_name} {self.last_name}".strip()
        return self.username
    
    def can_escalate_to_ombudsman(self) -> bool:
        """
        Determine if user is eligible to escalate a case to the ombudsman.
        (Business logic: may depend on time elapsed, case status, etc.)
        """
        return self.is_verified and self.is_ombudsman_eligible
    
    def increment_case_count(self) -> None:
        """Increment case count (called when case is created)."""
        self.case_count += 1
        self.save(update_fields=['case_count'])
    
    def increment_document_count(self) -> None:
        """Increment document count (called when document is uploaded)."""
        self.document_count += 1
        self.save(update_fields=['document_count'])
