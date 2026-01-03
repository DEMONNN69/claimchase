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
    
    full_name = serializers.SerializerMethodField()
    is_ombudsman_eligible = serializers.BooleanField(read_only=True)
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
            'created_at',
        )
        read_only_fields = (
            'id',
            'document_count',
            'case_count',
            'created_at',
            'is_verified',
            'is_ombudsman_eligible',
        )
    
    def get_full_name(self, obj):
        """Get user's full name."""
        return obj.get_full_name()


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
