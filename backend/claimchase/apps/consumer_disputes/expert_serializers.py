"""
Serializers for Expert Review System
Mirrors medical_review serializers
"""

from rest_framework import serializers
from claimchase.apps.users.models import CustomUser
from .expert_models import ExpertProfile, DisputeAssignment, DisputeDocumentReview
from .models import ConsumerDispute, DisputeDocument
from .serializers import ConsumerDisputeSerializer, DisputeDocumentSerializer


class ExpertUserSerializer(serializers.ModelSerializer):
    """Brief serializer for expert user info"""
    
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'first_name', 'last_name', 'phone')
        read_only_fields = fields


class ExpertProfileSerializer(serializers.ModelSerializer):
    """Serializer for Expert Profile"""
    
    user = ExpertUserSerializer(read_only=True)
    active_assignments_count = serializers.IntegerField(read_only=True, source='get_active_assignments_count')
    completed_assignments_count = serializers.IntegerField(read_only=True, source='get_completed_assignments_count')
    
    class Meta:
        model = ExpertProfile
        fields = (
            'id',
            'user',
            'license_number',
            'years_of_experience',
            'bio',
            'is_active',
            'active_assignments_count',
            'completed_assignments_count',
            'created_at',
            'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')


class DisputeDocumentReviewSerializer(serializers.ModelSerializer):
    """Serializer for document reviews"""
    
    document = DisputeDocumentSerializer(read_only=True)
    document_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = DisputeDocumentReview
        fields = (
            'id',
            'assignment',
            'document',
            'document_id',
            'status',
            'comments',
            'is_authentic',
            'confidence_level',
            'reviewed_at',
            'created_at',
        )
        read_only_fields = ('reviewed_at', 'created_at')


class DisputeAssignmentSerializer(serializers.ModelSerializer):
    """Detailed serializer for assignments"""
    
    expert = ExpertProfileSerializer(read_only=True)
    dispute = ConsumerDisputeSerializer(read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True)
    document_reviews = DisputeDocumentReviewSerializer(many=True, read_only=True)
    
    class Meta:
        model = DisputeAssignment
        fields = (
            'id',
            'dispute',
            'expert',
            'assigned_by',
            'assigned_by_email',
            'status',
            'priority',
            'notes',
            'review_summary',
            'recommendation',
            'assigned_at',
            'started_at',
            'completed_at',
            'document_reviews',
        )
        read_only_fields = ('assigned_at', 'started_at', 'completed_at')


class DisputeAssignmentListSerializer(serializers.ModelSerializer):
    """Brief serializer for assignment lists"""
    
    expert_name = serializers.CharField(source='expert.user.get_full_name', read_only=True)
    dispute_id = serializers.CharField(source='dispute.dispute_id', read_only=True)
    dispute_title = serializers.CharField(source='dispute.title', read_only=True)
    
    class Meta:
        model = DisputeAssignment
        fields = (
            'id',
            'dispute',
            'dispute_id',
            'dispute_title',
            'expert',
            'expert_name',
            'status',
            'priority',
            'assigned_at',
            'started_at',
            'completed_at',
        )
        read_only_fields = fields


class DisputeAssignmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating assignments"""
    
    expert_id = serializers.IntegerField(write_only=True)
    dispute_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = DisputeAssignment
        fields = (
            'expert_id',
            'dispute_id',
            'priority',
            'notes',
        )
    
    def create(self, validated_data):
        expert_id = validated_data.pop('expert_id')
        dispute_id = validated_data.pop('dispute_id')
        
        expert = ExpertProfile.objects.get(id=expert_id)
        dispute = ConsumerDispute.objects.get(id=dispute_id)
        
        assignment = DisputeAssignment.objects.create(
            expert=expert,
            dispute=dispute,
            assigned_by=self.context['request'].user,
            **validated_data
        )
        
        return assignment
