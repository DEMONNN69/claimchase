"""
Consumer Disputes models for ClaimChase.
Implements Category (hierarchical), Entity (companies/brands), ConsumerDispute, and DisputeDocument models.
Designed for lead generation with flexible category hierarchy.
"""

import uuid
from django.db import models
from django.utils import timezone
from claimchase.apps.users.models import CustomUser
from cloudinary.models import CloudinaryField


class DisputeCategory(models.Model):
    """
    Hierarchical category model for consumer disputes.
    Supports Category → Sub-category structure via self-referential parent.
    
    Example: 
    - Online Shopping (category) → Electronics (sub-category)
    - Airlines (category) → Domestic (sub-category)
    """
    
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=100, blank=True, help_text="Icon class name (e.g., lucide icon)")
    
    # Self-referential for hierarchy
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='subcategories',
        help_text="Parent category (leave empty for top-level categories)"
    )
    
    # Ordering and visibility
    display_order = models.PositiveIntegerField(default=0, help_text="Display order in lists")
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = "Dispute Category"
        verbose_name_plural = "Dispute Categories"
        indexes = [
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['slug']),
        ]
    
    def __str__(self):
        if self.parent:
            return f"{self.parent.name} → {self.name}"
        return self.name
    
    @property
    def is_subcategory(self):
        """Check if this is a sub-category (has parent)"""
        return self.parent is not None
    
    @property
    def level(self):
        """Return hierarchy level (0 for root, 1 for sub-category, etc.)"""
        level = 0
        current = self
        while current.parent:
            level += 1
            current = current.parent
        return level
    
    def get_all_subcategories(self):
        """Get all subcategories recursively"""
        subcats = list(self.subcategories.filter(is_active=True))
        for subcat in self.subcategories.filter(is_active=True):
            subcats.extend(subcat.get_all_subcategories())
        return subcats


class Entity(models.Model):
    """
    Entity model for specific companies, brands, or organizations.
    
    An entity can be linked to multiple categories/sub-categories (M2M).
    Example: "Amazon" can be linked to both "Online Shopping" and "Electronics"
    
    Entities are OPTIONAL - users can submit disputes without selecting an entity.
    """
    
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True)
    logo = CloudinaryField('logo', blank=True, null=True)
    website = models.URLField(blank=True)
    
    # Many-to-many relationship with categories
    categories = models.ManyToManyField(
        DisputeCategory,
        related_name='entities',
        blank=True,
        help_text="Categories this entity belongs to"
    )
    
    # Contact information (for reference)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    address = models.TextField(blank=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False, help_text="Admin verified entity")
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = "Entity"
        verbose_name_plural = "Entities"
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['slug']),
            models.Index(fields=['is_active']),
        ]
    
    def __str__(self):
        return self.name


class ConsumerDispute(models.Model):
    """
    Main consumer dispute model - represents a lead/complaint submission.
    
    This is a lead generation model where users submit their disputes,
    and the team contacts them later for follow-up.
    """
    
    STATUS_CHOICES = [
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('in_progress', 'In Progress'),
        ('resolved', 'Resolved'),
        ('closed', 'Closed'),
        ('rejected', 'Rejected'),
    ]
    
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    # Unique dispute identifier
    dispute_id = models.CharField(
        max_length=50,
        unique=True,
        editable=False,
        help_text="Auto-generated dispute ID"
    )
    
    # User who submitted the dispute
    user = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='consumer_disputes',
        help_text="User who submitted the dispute"
    )
    
    # Category and Entity relationships
    category = models.ForeignKey(
        DisputeCategory,
        on_delete=models.PROTECT,
        related_name='disputes',
        help_text="Main category of the dispute"
    )
    subcategory = models.ForeignKey(
        DisputeCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='subcategory_disputes',
        help_text="Sub-category (if applicable)"
    )
    entity = models.ForeignKey(
        Entity,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disputes',
        help_text="Specific entity/company (optional)"
    )
    
    # Dispute details
    title = models.CharField(max_length=255, help_text="Brief title of the dispute")
    description = models.TextField(help_text="Detailed description of the issue")
    
    # Transaction/reference details
    transaction_id = models.CharField(
        max_length=255,
        blank=True,
        help_text="Order ID, Booking ID, or any reference number"
    )
    transaction_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of transaction/incident"
    )
    amount_involved = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount in dispute (if applicable)"
    )
    
    # Contact preference for follow-up
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=[
            ('phone', 'Phone Call'),
            ('email', 'Email'),
            ('whatsapp', 'WhatsApp'),
        ],
        default='email'
    )
    preferred_contact_time = models.CharField(
        max_length=50,
        blank=True,
        help_text="Preferred time to contact (e.g., 'Morning', '10 AM - 2 PM')"
    )
    
    # Status tracking
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='new')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Internal notes (admin only)
    internal_notes = models.TextField(blank=True, help_text="Internal notes for team")
    assigned_to = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_disputes',
        help_text="Team member handling this dispute"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    contacted_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Consumer Dispute"
        verbose_name_plural = "Consumer Disputes"
        indexes = [
            models.Index(fields=['dispute_id']),
            models.Index(fields=['status']),
            models.Index(fields=['user']),
            models.Index(fields=['category']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.dispute_id} - {self.title[:50]}"
    
    def save(self, *args, **kwargs):
        # Generate dispute_id on first save
        if not self.dispute_id:
            self.dispute_id = self._generate_dispute_id()
        super().save(*args, **kwargs)
    
    def _generate_dispute_id(self):
        """Generate unique dispute ID: CD-YYYYMMDD-XXXX"""
        date_str = timezone.now().strftime('%Y%m%d')
        # Get count of disputes created today
        today_count = ConsumerDispute.objects.filter(
            created_at__date=timezone.now().date()
        ).count() + 1
        return f"CD-{date_str}-{today_count:04d}"
    
    def mark_contacted(self):
        """Mark dispute as contacted"""
        self.status = 'contacted'
        self.contacted_at = timezone.now()
        self.save(update_fields=['status', 'contacted_at', 'updated_at'])
    
    def mark_resolved(self):
        """Mark dispute as resolved"""
        self.status = 'resolved'
        self.resolved_at = timezone.now()
        self.save(update_fields=['status', 'resolved_at', 'updated_at'])


class DisputeDocument(models.Model):
    """
    Document model for consumer dispute attachments.
    Stores documents in Cloudinary.
    """
    
    DOCUMENT_TYPE_CHOICES = [
        ('receipt', 'Receipt/Invoice'),
        ('screenshot', 'Screenshot'),
        ('email', 'Email Correspondence'),
        ('contract', 'Contract/Agreement'),
        ('id_proof', 'ID Proof'),
        ('bank_statement', 'Bank Statement'),
        ('other', 'Other'),
    ]
    
    dispute = models.ForeignKey(
        ConsumerDispute,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    
    file = CloudinaryField(
        'dispute_document',
        resource_type='raw',
        folder='claimchase/dispute_documents',
        use_filename=True,
        unique_filename=True
    )
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.PositiveIntegerField(default=0, help_text="File size in bytes")
    
    document_type = models.CharField(
        max_length=50,
        choices=DOCUMENT_TYPE_CHOICES,
        default='other'
    )
    description = models.TextField(blank=True)
    
    # Metadata
    uploaded_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_dispute_documents'
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = "Dispute Document"
        verbose_name_plural = "Dispute Documents"
    
    def __str__(self):
        return f"{self.file_name} - {self.dispute.dispute_id}"
    
    @property
    def file_url(self):
        """Get a secure signed URL for the file (expires in 1 hour)"""
        if self.file:
            try:
                import cloudinary.utils
                import time
                
                # Get the public_id from the file
                public_id = str(self.file)
                
                # Generate a signed URL with expiration (1 hour from now)
                expires_at = int(time.time()) + 3600
                
                signed_url, _ = cloudinary.utils.cloudinary_url(
                    public_id,
                    sign_url=True,
                    secure=True,
                    resource_type="raw",
                )
                
                if signed_url:
                    return signed_url
            except Exception as e:
                import logging
                logging.getLogger(__name__).warning(f"Failed to generate signed URL: {e}")
            
            # Fallback to regular URL
            return self.file.url
        return None


class DisputeTimeline(models.Model):
    """
    Timeline/activity log for consumer disputes.
    Tracks status changes and interactions.
    """
    
    EVENT_TYPE_CHOICES = [
        ('created', 'Dispute Created'),
        ('status_change', 'Status Changed'),
        ('note_added', 'Note Added'),
        ('contact_attempted', 'Contact Attempted'),
        ('document_uploaded', 'Document Uploaded'),
        ('assigned', 'Assigned to Team Member'),
        ('resolved', 'Dispute Resolved'),
    ]
    
    dispute = models.ForeignKey(
        ConsumerDispute,
        on_delete=models.CASCADE,
        related_name='timeline'
    )
    
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    description = models.TextField()
    
    # Who performed the action
    performed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='dispute_timeline_actions'
    )
    
    # Optional metadata as JSON
    metadata = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = "Dispute Timeline"
        verbose_name_plural = "Dispute Timeline Entries"
    
    def __str__(self):
        return f"{self.dispute.dispute_id} - {self.get_event_type_display()}"
