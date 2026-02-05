"""
DRF Serializers for users app.
"""

from rest_framework import serializers
from .models import CustomUser
from ..grievance_core.models import InsuranceCompany


class InsuranceCompanySimpleSerializer(serializers.ModelSerializer):
    """Simple serializer for InsuranceCompany (for nested use)."""
    
    class Meta:
        model = InsuranceCompany
        fields = ('id', 'name', 'category')


class UserSerializer(serializers.ModelSerializer):
    """Serializer for CustomUser model."""
    
    full_name = serializers.CharField(required=False, allow_blank=True)
    is_ombudsman_eligible = serializers.BooleanField(read_only=True)
    is_expert = serializers.SerializerMethodField()
    insurance_company = InsuranceCompanySimpleSerializer(read_only=True)
    insurance_company_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = (
            'id',
            'email',
            'username',
            'full_name',
            'first_name',
            'last_name',
            'phone',
            'address',
            'city',
            'state',
            'postal_code',
            'date_of_birth',
            'gender',
            'role',
            'is_verified',
            'is_ombudsman_eligible',
            'is_expert',
            'document_count',
            'case_count',
            'insurance_company',
            'insurance_company_id',
            'problem_type',
            'gmail_connected',
            'gmail_email',
            'created_at',
        )
        read_only_fields = (
            'id',
            'document_count',
            'case_count',
            'created_at',
            'is_verified',
            'is_ombudsman_eligible',
            'is_expert',
            'gmail_connected',
            'gmail_email',
        )
    
    def get_is_expert(self, obj):
        """Return whether user is a dispute expert."""
        return obj.is_dispute_expert
    
    def to_representation(self, instance):
        """Add computed full_name to response."""
        ret = super().to_representation(instance)
        ret['full_name'] = instance.get_full_name()
        return ret
    
    def update(self, instance, validated_data):
        """Handle full_name by splitting into first_name and last_name."""
        full_name = validated_data.pop('full_name', None)
        if full_name:
            parts = full_name.strip().split(' ', 1)
            validated_data['first_name'] = parts[0]
            validated_data['last_name'] = parts[1] if len(parts) > 1 else ''
        return super().update(instance, validated_data)


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for user profile."""
    
    full_name = serializers.SerializerMethodField()
    insurance_company = InsuranceCompanySimpleSerializer(read_only=True)
    insurance_company_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    
    class Meta:
        model = CustomUser
        fields = (
            'id',
            'email',
            'username',
            'full_name',
            'first_name',
            'last_name',
            'phone',
            'address',
            'city',
            'state',
            'postal_code',
            'date_of_birth',
            'gender',
            'role',
            'is_verified',
            'is_ombudsman_eligible',
            'document_count',
            'case_count',
            'insurance_company',
            'insurance_company_id',
            'problem_type',
            'last_login',
            'last_login_ip',
            'created_at',
            'updated_at',
        )
        read_only_fields = (
            'id',
            'document_count',
            'case_count',
            'last_login',
            'last_login_ip',
            'created_at',
            'updated_at',
        )
    
    def get_full_name(self, obj):
        """Get user's full name."""
        return obj.get_full_name()
