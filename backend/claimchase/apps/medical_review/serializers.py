"""
Serializers for Medical Review API.
"""

from rest_framework import serializers
from .models import (
    MedicalReviewerProfile,
    ReviewAssignment,
    AssignmentDocument,
    DocumentReview,
    ReviewerStats,
)
from claimchase.apps.grievance_core.models import Document


# ==================== Profile Serializers ====================

class MedicalReviewerProfileSerializer(serializers.ModelSerializer):
    """Full profile serializer"""
    
    display_specialization = serializers.ReadOnlyField()
    user_email = serializers.EmailField(source='user.email', read_only=True)
    
    class Meta:
        model = MedicalReviewerProfile
        fields = [
            'id', 'user', 'user_email', 'full_name', 
            'specialization', 'other_specialization', 'display_specialization',
            'years_of_experience', 'is_onboarded', 'is_available',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'user_email', 'created_at', 'updated_at']


class OnboardingSerializer(serializers.ModelSerializer):
    """Serializer for reviewer onboarding"""
    
    class Meta:
        model = MedicalReviewerProfile
        fields = [
            'full_name', 'specialization', 'other_specialization', 
            'years_of_experience'
        ]
    
    def validate(self, data):
        if data.get('specialization') == 'other' and not data.get('other_specialization'):
            raise serializers.ValidationError({
                'other_specialization': 'Please specify your specialization'
            })
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['user'] = user
        validated_data['is_onboarded'] = True
        return super().create(validated_data)


# ==================== Document Serializers ====================

class DocumentBriefSerializer(serializers.ModelSerializer):
    """Brief document info for review context"""
    
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id', 'file_name', 'file_type', 'file_size',
            'document_type', 'description', 'file_url', 'created_at'
        ]
    
    def get_file_url(self, obj):
        """Return proxy URL for secure document access (auth via cookie)"""
        request = self.context.get('request')
        if obj.id and request:
            proxy_path = f"/api/documents/{obj.id}/file/"
            return request.build_absolute_uri(proxy_path)
        return None


# ==================== Review Serializers ====================

class DocumentReviewSerializer(serializers.ModelSerializer):
    """Serializer for document reviews"""
    
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    document_name = serializers.CharField(source='assignment_document.document.file_name', read_only=True)
    
    class Meta:
        model = DocumentReview
        fields = [
            'id', 'assignment', 'assignment_document',
            'reviewer', 'reviewer_name', 'document_name',
            'outcome', 'comments', 'additional_info_requested',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'reviewer', 'reviewer_name', 'created_at', 'updated_at']


class CreateDocumentReviewSerializer(serializers.ModelSerializer):
    """Serializer for creating a review"""
    
    class Meta:
        model = DocumentReview
        fields = [
            'assignment_document', 'outcome', 'comments', 'additional_info_requested'
        ]
    
    def validate(self, data):
        if data.get('outcome') == 'needs_more_info' and not data.get('additional_info_requested'):
            raise serializers.ValidationError({
                'additional_info_requested': 'Please specify what additional information is needed'
            })
        return data
    
    def create(self, validated_data):
        user = self.context['request'].user
        assignment_doc = validated_data['assignment_document']
        
        validated_data['reviewer'] = user
        validated_data['assignment'] = assignment_doc.assignment
        
        # Check reviewer has access to this assignment
        if assignment_doc.assignment.reviewer != user:
            raise serializers.ValidationError('You are not assigned to review this document')
        
        return super().create(validated_data)


# ==================== Assignment Document Serializers ====================

class AssignmentDocumentSerializer(serializers.ModelSerializer):
    """Document within an assignment with review status"""
    
    document_details = DocumentBriefSerializer(source='document', read_only=True)
    review = serializers.SerializerMethodField()
    is_reviewed = serializers.SerializerMethodField()
    
    class Meta:
        model = AssignmentDocument
        fields = [
            'id', 'document', 'document_details', 
            'review', 'is_reviewed', 'added_at'
        ]
    
    def get_review(self, obj):
        """Get the review for this document by the current reviewer"""
        request = self.context.get('request')
        if request and request.user:
            review = obj.reviews.filter(reviewer=request.user).first()
            if review:
                return DocumentReviewSerializer(review).data
        return None
    
    def get_is_reviewed(self, obj):
        """Check if this document has been reviewed by current user"""
        request = self.context.get('request')
        if request and request.user:
            return obj.reviews.filter(reviewer=request.user).exists()
        return False


# ==================== Assignment Serializers ====================

class ReviewAssignmentListSerializer(serializers.ModelSerializer):
    """List serializer for assignments (lighter weight)"""
    
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    insurance_company = serializers.SerializerMethodField()
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()
    document_count = serializers.ReadOnlyField()
    reviewed_count = serializers.ReadOnlyField()
    
    class Meta:
        model = ReviewAssignment
        fields = [
            'id', 'case', 'case_number', 'insurance_company',
            'reviewer', 'reviewer_name', 'assigned_by', 'assigned_by_name',
            'status', 'document_count', 'reviewed_count',
            'assigned_at', 'started_at', 'completed_at'
        ]
    
    def get_insurance_company(self, obj):
        if obj.case.insurance_company:
            return obj.case.insurance_company.name
        return obj.case.insurance_company_name
    
    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name()
        return None


class ReviewAssignmentDetailSerializer(serializers.ModelSerializer):
    """Full assignment details with documents"""
    
    case_number = serializers.CharField(source='case.case_number', read_only=True)
    case_subject = serializers.CharField(source='case.subject', read_only=True)
    insurance_company = serializers.SerializerMethodField()
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    assigned_by_name = serializers.SerializerMethodField()
    documents = AssignmentDocumentSerializer(many=True, read_only=True)
    document_count = serializers.ReadOnlyField()
    reviewed_count = serializers.ReadOnlyField()
    
    class Meta:
        model = ReviewAssignment
        fields = [
            'id', 'case', 'case_number', 'case_subject', 'insurance_company',
            'reviewer', 'reviewer_name', 'assigned_by', 'assigned_by_name',
            'status', 'admin_notes', 'documents',
            'document_count', 'reviewed_count',
            'assigned_at', 'started_at', 'completed_at'
        ]
    
    def get_insurance_company(self, obj):
        if obj.case.insurance_company:
            return obj.case.insurance_company.name
        return obj.case.insurance_company_name
    
    def get_assigned_by_name(self, obj):
        if obj.assigned_by:
            return obj.assigned_by.get_full_name()
        return None


class CreateAssignmentSerializer(serializers.Serializer):
    """Serializer for creating assignments from admin"""
    
    case_id = serializers.IntegerField()
    reviewer_id = serializers.IntegerField()
    document_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1
    )
    admin_notes = serializers.CharField(required=False, allow_blank=True, default='')
    
    def validate_reviewer_id(self, value):
        from claimchase.apps.users.models import CustomUser
        try:
            user = CustomUser.objects.get(id=value, role='medical_reviewer')
            return value
        except CustomUser.DoesNotExist:
            raise serializers.ValidationError('Invalid medical reviewer')
    
    def validate_case_id(self, value):
        from claimchase.apps.grievance_core.models import Case
        try:
            Case.objects.get(id=value)
            return value
        except Case.DoesNotExist:
            raise serializers.ValidationError('Invalid case')
    
    def validate_document_ids(self, value):
        from claimchase.apps.grievance_core.models import Document
        docs = Document.objects.filter(id__in=value)
        if docs.count() != len(value):
            raise serializers.ValidationError('One or more documents not found')
        return value
    
    def create(self, validated_data):
        from claimchase.apps.users.models import CustomUser
        from claimchase.apps.grievance_core.models import Case, Document
        
        case = Case.objects.get(id=validated_data['case_id'])
        reviewer = CustomUser.objects.get(id=validated_data['reviewer_id'])
        documents = Document.objects.filter(id__in=validated_data['document_ids'])
        
        # Check if assignment already exists for this case/reviewer
        assignment, created = ReviewAssignment.objects.get_or_create(
            case=case,
            reviewer=reviewer,
            status__in=['pending', 'in_progress'],
            defaults={
                'assigned_by': self.context['request'].user,
                'admin_notes': validated_data.get('admin_notes', '')
            }
        )
        
        # Add documents to assignment (avoiding duplicates)
        for doc in documents:
            AssignmentDocument.objects.get_or_create(
                assignment=assignment,
                document=doc
            )
        
        return assignment


# ==================== Stats Serializers ====================

class ReviewerStatsSerializer(serializers.ModelSerializer):
    """Serializer for reviewer statistics"""
    
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    
    class Meta:
        model = ReviewerStats
        fields = [
            'reviewer', 'reviewer_name',
            'total_assignments', 'pending_assignments', 'completed_assignments',
            'total_documents_reviewed', 'approved_count', 'rejected_count', 'needs_info_count',
            'avg_review_time_hours', 'last_updated'
        ]


# ==================== Admin View Serializers ====================

class AdminDocumentReviewSerializer(serializers.ModelSerializer):
    """Review details for admin (shows reviewer info)"""
    
    reviewer_name = serializers.CharField(source='reviewer.get_full_name', read_only=True)
    reviewer_specialization = serializers.SerializerMethodField()
    document_name = serializers.CharField(source='assignment_document.document.file_name', read_only=True)
    
    class Meta:
        model = DocumentReview
        fields = [
            'id', 'reviewer', 'reviewer_name', 'reviewer_specialization',
            'document_name', 'outcome', 'comments', 'additional_info_requested',
            'created_at'
        ]
    
    def get_reviewer_specialization(self, obj):
        try:
            profile = obj.reviewer.medical_profile
            return profile.display_specialization
        except:
            return None


class AdminCaseReviewsSerializer(serializers.Serializer):
    """All reviews for a case (admin view)"""
    
    case_id = serializers.IntegerField()
    case_number = serializers.CharField()
    total_assignments = serializers.IntegerField()
    assignments = ReviewAssignmentDetailSerializer(many=True)
    all_reviews = AdminDocumentReviewSerializer(many=True)
