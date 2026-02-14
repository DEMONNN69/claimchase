"""
Serializers for Consumer Disputes API.
"""

from rest_framework import serializers
from .models import (
    DisputeCategory,
    Entity,
    ConsumerDispute,
    DisputeDocument,
    DisputeTimeline
)


class DisputeCategorySerializer(serializers.ModelSerializer):
    """Serializer for dispute categories"""
    
    subcategories = serializers.SerializerMethodField()
    entity_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon',
            'parent', 'display_order', 'is_active',
            'is_subcategory', 'level', 'subcategories', 'entity_count'
        ]
        read_only_fields = ['id', 'is_subcategory', 'level', 'subcategories', 'entity_count']
    
    def get_subcategories(self, obj):
        """Get active subcategories"""
        if obj.parent is None:  # Only for top-level categories
            subcats = obj.subcategories.filter(is_active=True).order_by('display_order', 'name')
            return DisputeCategoryBriefSerializer(subcats, many=True).data
        return []
    
    def get_entity_count(self, obj):
        """Get count of entities in this category"""
        return obj.entities.filter(is_active=True).count()


class DisputeCategoryBriefSerializer(serializers.ModelSerializer):
    """Brief serializer for subcategories (nested use)"""
    
    class Meta:
        model = DisputeCategory
        fields = ['id', 'name', 'slug', 'description', 'icon']


class EntitySerializer(serializers.ModelSerializer):
    """Serializer for entities"""
    
    categories_data = serializers.SerializerMethodField()
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Entity
        fields = [
            'id', 'name', 'slug', 'description', 'logo', 'logo_url',
            'website', 'categories', 'categories_data',
            'contact_email', 'contact_phone', 'address',
            'is_active', 'is_verified'
        ]
        read_only_fields = ['id', 'categories_data', 'logo_url']
    
    def get_categories_data(self, obj):
        """Get category details"""
        return DisputeCategoryBriefSerializer(obj.categories.filter(is_active=True), many=True).data
    
    def get_logo_url(self, obj):
        """Get Cloudinary URL for logo"""
        if obj.logo:
            return obj.logo.url
        return None


class EntityBriefSerializer(serializers.ModelSerializer):
    """Brief serializer for entities (for dropdowns)"""
    
    logo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Entity
        fields = ['id', 'name', 'slug', 'logo_url', 'is_verified']
    
    def get_logo_url(self, obj):
        if obj.logo:
            return obj.logo.url
        return None


class DisputeDocumentSerializer(serializers.ModelSerializer):
    """Serializer for dispute documents"""
    
    file_url = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeDocument
        fields = [
            'id', 'dispute', 'file', 'file_name', 'file_type', 'file_size',
            'document_type', 'description', 'file_url',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at'
        ]
        read_only_fields = ['id', 'file_url', 'uploaded_by_name', 'uploaded_at']
    
    def get_file_url(self, obj):
        """Return frontend proxy URL (hides backend API URL)"""
        request = self.context.get('request')
        if not request:
            return None
            
        # Check if user is authorized
        user = request.user
        dispute = obj.dispute
        
        if user == dispute.user or user.is_staff:
            # Generate temporary access token
            from .document_access import DocumentAccessToken
            temp_token = DocumentAccessToken.generate(
                user_id=user.id,
                document_id=obj.id,
                document_type='dispute'
            )
            
            # Return FRONTEND proxy URL (backend URL completely hidden)
            # Format for Vercel serverless function: /api/proxy-documents?type=dispute&disputeId=X&docId=Y&access=token
            from django.conf import settings
            frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
            return f"{frontend_url}/api/proxy-documents?type=dispute&disputeId={dispute.id}&docId={obj.id}&access={temp_token}"
        
        return None
    
    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name() or obj.uploaded_by.email
        return None


class DisputeTimelineSerializer(serializers.ModelSerializer):
    """Serializer for dispute timeline entries"""
    
    performed_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeTimeline
        fields = [
            'id', 'event_type', 'description',
            'performed_by', 'performed_by_name', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_performed_by_name(self, obj):
        if obj.performed_by:
            return obj.performed_by.get_full_name() or obj.performed_by.email
        return "System"


class ConsumerDisputeSerializer(serializers.ModelSerializer):
    """Full serializer for consumer disputes"""
    
    category_data = serializers.SerializerMethodField()
    subcategory_data = serializers.SerializerMethodField()
    entity_data = serializers.SerializerMethodField()
    user_data = serializers.SerializerMethodField()
    documents = DisputeDocumentSerializer(many=True, read_only=True)
    timeline = DisputeTimelineSerializer(many=True, read_only=True)
    
    class Meta:
        model = ConsumerDispute
        fields = [
            'id', 'dispute_id', 'user', 'user_data',
            'category', 'category_data', 'subcategory', 'subcategory_data',
            'entity', 'entity_data',
            'title', 'description',
            'transaction_id', 'transaction_date', 'amount_involved',
            'preferred_contact_method', 'preferred_contact_time',
            'status', 'priority',
            'internal_notes', 'assigned_to',
            'created_at', 'updated_at', 'contacted_at', 'resolved_at',
            'documents', 'timeline'
        ]
        read_only_fields = [
            'id', 'dispute_id', 'user', 'user_data',
            'category_data', 'subcategory_data', 'entity_data',
            'documents', 'timeline',
            'created_at', 'updated_at', 'contacted_at', 'resolved_at'
        ]
    
    def get_category_data(self, obj):
        return DisputeCategoryBriefSerializer(obj.category).data
    
    def get_subcategory_data(self, obj):
        if obj.subcategory:
            return DisputeCategoryBriefSerializer(obj.subcategory).data
        return None
    
    def get_entity_data(self, obj):
        if obj.entity:
            return EntityBriefSerializer(obj.entity).data
        return None
    
    def get_user_data(self, obj):
        return {
            'id': obj.user.id,
            'email': obj.user.email,
            'name': obj.user.get_full_name() or obj.user.email
        }


class ConsumerDisputeListSerializer(serializers.ModelSerializer):
    """List serializer for consumer disputes (lighter weight)"""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    subcategory_name = serializers.SerializerMethodField()
    entity_name = serializers.SerializerMethodField()
    document_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ConsumerDispute
        fields = [
            'id', 'dispute_id', 'title',
            'category', 'category_name', 'subcategory_name', 'entity_name',
            'status', 'priority', 'amount_involved',
            'preferred_contact_method',
            'created_at', 'updated_at', 'document_count'
        ]
    
    def get_subcategory_name(self, obj):
        return obj.subcategory.name if obj.subcategory else None
    
    def get_entity_name(self, obj):
        return obj.entity.name if obj.entity else None
    
    def get_document_count(self, obj):
        return obj.documents.count()


class ConsumerDisputeCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating consumer disputes"""
    
    class Meta:
        model = ConsumerDispute
        fields = [
            'category', 'subcategory', 'entity',
            'title', 'description',
            'transaction_id', 'transaction_date', 'amount_involved',
            'preferred_contact_method', 'preferred_contact_time',
            # These fields are returned after creation
            'id', 'dispute_id', 'status', 'created_at'
        ]
        read_only_fields = ['id', 'dispute_id', 'status', 'created_at']
    
    def validate(self, data):
        """Validate category hierarchy"""
        category = data.get('category')
        subcategory = data.get('subcategory')
        entity = data.get('entity')
        
        # Ensure category is a top-level category
        if category and category.parent is not None:
            raise serializers.ValidationError({
                'category': 'Please select a top-level category, not a subcategory.'
            })
        
        # Ensure subcategory belongs to the selected category
        if subcategory:
            if subcategory.parent != category:
                raise serializers.ValidationError({
                    'subcategory': 'Selected subcategory does not belong to the chosen category.'
                })
        
        # If entity is selected, verify it belongs to the category or subcategory
        if entity:
            entity_categories = entity.categories.all()
            valid = False
            if category in entity_categories:
                valid = True
            if subcategory and subcategory in entity_categories:
                valid = True
            if not valid and entity_categories.exists():
                # Entity has categories but doesn't match - just a warning, allow anyway
                pass
        
        return data
    
    def create(self, validated_data):
        """Create dispute with timeline entry"""
        user = self.context['request'].user
        validated_data['user'] = user
        
        dispute = super().create(validated_data)
        
        # Create timeline entry for dispute creation
        DisputeTimeline.objects.create(
            dispute=dispute,
            event_type='created',
            description=f'Dispute submitted by {user.email}',
            performed_by=user
        )
        
        return dispute
