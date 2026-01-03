"""
DRF Serializers for grievance_core app.
"""

from rest_framework import serializers
from claimchase.apps.users.models import CustomUser
from .models import InsuranceCompany, Case, CaseTimeline, EmailTracking, Consent, Document


class InsuranceCompanySerializer(serializers.ModelSerializer):
    """Serializer for Insurance Company model."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = InsuranceCompany
        fields = (
            'id',
            'name',
            'category',
            'category_display',
            'grievance_email',
            'additional_emails',
            'grievance_helpline',
            'gro_email',
            'website',
            'correspondence_address',
            'is_active',
        )
        read_only_fields = ('id',)


class UserBriefSerializer(serializers.ModelSerializer):
    """Brief user serializer for nested relationships."""
    
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'phone')
        read_only_fields = fields


class CaseTimelineSerializer(serializers.ModelSerializer):
    """Serializer for CaseTimeline model."""
    
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = CaseTimeline
        fields = (
            'id',
            'event_type',
            'description',
            'old_value',
            'new_value',
            'created_by_email',
            'created_at',
        )
        read_only_fields = fields


class EmailTrackingSerializer(serializers.ModelSerializer):
    """Serializer for EmailTracking model."""
    
    created_by_email = serializers.CharField(source='created_by.email', read_only=True, allow_null=True)
    
    class Meta:
        model = EmailTracking
        fields = (
            'id',
            'email_type',
            'from_email',
            'to_email',
            'cc_emails',
            'subject',
            'status',
            'is_automated',
            'sent_at',
            'delivered_at',
            'created_by_email',
            'created_at',
        )
        read_only_fields = fields


class DocumentBriefSerializer(serializers.ModelSerializer):
    """Brief document serializer for nested relationships."""
    
    uploaded_by_email = serializers.CharField(source='uploaded_by.email', read_only=True)
    file_size_mb = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = (
            'id',
            'file_name',
            'document_type',
            'file_size_mb',
            'is_verified',
            'uploaded_by_email',
            'created_at',
        )
        read_only_fields = fields
    
    def get_file_size_mb(self, obj):
        """Convert file size to MB."""
        return round(obj.file_size / (1024 * 1024), 2)


class ConsentSerializer(serializers.ModelSerializer):
    """Serializer for Consent model."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Consent
        fields = (
            'id',
            'consent_type',
            'is_given',
            'is_active',
            'given_at',
            'revoked_at',
            'user_email',
            'created_at',
        )
        read_only_fields = ('given_at', 'revoked_at', 'is_active', 'user_email', 'created_at')


class CaseDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Case model."""
    
    user = UserBriefSerializer(read_only=True)
    insurance_company = InsuranceCompanySerializer(read_only=True)
    timeline_events = CaseTimelineSerializer(read_only=True, many=True)
    emails = EmailTrackingSerializer(read_only=True, many=True)
    documents = DocumentBriefSerializer(read_only=True, many=True)
    ombudsman_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = (
            'id',
            'case_number',
            'user',
            'insurance_company',
            'status',
            'priority',
            'insurance_type',
            'policy_number',
            'insurance_company_name',
            'subject',
            'description',
            'date_of_incident',
            'date_of_rejection',
            'is_escalated_to_ombudsman',
            'escalation_date',
            'submission_date',
            'resolution_date',
            'resolution_notes',
            'ombudsman_status',
            'days_since_submission',
            'days_since_incident',
            'timeline_events',
            'emails',
            'documents',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'case_number',
            'user',
            'created_at',
            'updated_at',
            'escalation_date',
            'submission_date',
            'resolution_date',
        )
    
    def get_ombudsman_status(self, obj):
        """Get ombudsman eligibility status."""
        return obj.get_ombudsman_status()


class CaseListSerializer(serializers.ModelSerializer):
    """Brief serializer for Case list view."""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    insurance_company_data = InsuranceCompanySerializer(source='insurance_company', read_only=True)
    ombudsman_status = serializers.SerializerMethodField()
    
    class Meta:
        model = Case
        fields = (
            'id',
            'case_number',
            'user_email',
            'status',
            'priority',
            'subject',
            'insurance_company',
            'insurance_company_data',
            'insurance_company_name',
            'is_escalated_to_ombudsman',
            'ombudsman_status',
            'created_at',
            'updated_at',
        )
        read_only_fields = fields
    
    def get_ombudsman_status(self, obj):
        """Get ombudsman eligibility status."""
        return obj.get_ombudsman_status()


class CaseCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating and updating cases."""
    
    insurance_company_name = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Case
        fields = (
            'insurance_company',
            'insurance_company_name',
            'policy_number',
            'insurance_type',
            'subject',
            'description',
            'date_of_incident',
        )
    
    def create(self, validated_data):
        """
        Auto-populate insurance_company_name from FK if not provided.
        Generate unique case_number.
        """
        from .services import CaseService
        
        insurance_company = validated_data.get('insurance_company')
        insurance_company_name = validated_data.get('insurance_company_name')
        
        # If FK is provided but name isn't, auto-populate from FK
        if insurance_company and not insurance_company_name:
            validated_data['insurance_company_name'] = insurance_company.name
        
        # Generate unique case number
        validated_data['case_number'] = CaseService.generate_case_number()
        
        return super().create(validated_data)


class CaseStatusResponseSerializer(serializers.Serializer):
    """
    Serializer for CaseStatusView response.
    Returns comprehensive case status information.
    """
    
    case = CaseDetailSerializer(read_only=True)
    status_summary = serializers.SerializerMethodField()
    
    def get_status_summary(self, obj):
        """Build a summary of case status."""
        case = obj['case']
        
        return {
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
