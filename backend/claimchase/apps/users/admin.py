"""Users app admin interface - Enhanced with Django Unfold."""

from django.contrib import admin
from django.contrib import messages
from unfold.admin import ModelAdmin
from unfold.decorators import action, display 
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.contrib.auth.forms import UserChangeForm, UserCreationForm, AdminPasswordChangeForm 
from django.contrib.auth.models import Group
from .models import CustomUser
from claimchase.apps.medical_review.models import MedicalReviewerProfile

# Hide unnecessary Django models from admin - do this at module level
admin.site.unregister(Group)

# Unregister Token model if it exists
try:
    from rest_framework.authtoken.models import Token
    if admin.site.is_registered(Token):
        admin.site.unregister(Token)
except (ImportError, admin.sites.NotRegistered):
    pass


class MedicalReviewerProfileInline(admin.StackedInline):
    """Inline for medical reviewer profile (visible for reviewer roles)."""
    model = MedicalReviewerProfile
    fk_name = 'user'
    extra = 0
    fields = (
        'full_name',
        'specialization',
        'other_specialization',
        'years_of_experience',
        'is_onboarded',
        'is_available',
    )
    readonly_fields = ()
    show_change_link = True


@admin.register(CustomUser)
class CustomUserAdmin(BaseUserAdmin, ModelAdmin):
    '`Streamlined admin for CustomUser model with enhanced features.`'

    # Enable password change functionality
    change_password_form = AdminPasswordChangeForm
    form = UserChangeForm
    add_form = UserCreationForm

    list_display = (
        'email',
        'full_name',
        'display_role',
        'display_active',
        'display_staff',
        'last_login',
        'date_joined',
    )
    list_filter = (
        'role',
        'is_active',
        'is_staff',
        'is_superuser',
        'date_joined',
    )
    list_filter_submit = True
    search_fields = ('email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    date_hierarchy = 'date_joined'
    actions = ['make_active', 'make_inactive', 'promote_to_medical_reviewer']

    # Enable horizontal tabs
    warn_unsaved_form = True
    compressed_fields = True

    fieldsets = (
        ('👤 Account', {
            'fields': ('email', 'password'),
            'classes': ['tab'],
        }),
        ('📋 Profile', {
            'fields': ('first_name', 'last_name', 'phone', 'role'),
            'classes': ['tab'],
        }),
        (
            '🔐 Permissions',
            {
                'fields': (
                    'is_active',
                    'is_staff',
                    'is_superuser',
                    'groups',
                    'user_permissions',
                ),
                'classes': ['tab'],
            },
        ),
        (
            '📅 Dates',
            {
                'fields': ('last_login', 'date_joined'),
                'classes': ['tab'],
            },
        ),
        (
            '📊 Metadata',
            {
                'fields': (
                    'document_count',
                    'case_count',
                    'is_verified',
                    'is_ombudsman_eligible',
                    'last_login_ip',
                    'created_at',
                    'updated_at',
                ),
                'classes': ['tab'],
            },
        ),
    )

    add_fieldsets = (
        (
            None,
            {
                'classes': ('wide',),
                'fields': ('email', 'password1', 'password2', 'first_name', 'last_name', 'role', 'is_staff', 'is_superuser'),
            },
        ),
    )

    readonly_fields = (
        'last_login',
        'date_joined',
        'password',
        'created_at',
        'updated_at',
        'document_count',
        'case_count',
    )

    inlines = [MedicalReviewerProfileInline]

    def get_urls(self):
        """Add password change URL."""
        from django.urls import path
        from django.contrib.auth.views import redirect_to_login
        urls = super().get_urls()
        # Password change URLs are automatically added by BaseUserAdmin
        return urls

    def full_name(self, obj):
        return obj.get_full_name() or obj.email
    full_name.short_description = 'Full name'

    @display(description='Role', label={
        'patient': 'info',
        'medical_reviewer': 'success',
        'admin': 'danger',
    })
    def display_role(self, obj):
        return obj.role

    @display(description='Active', boolean=True)
    def display_active(self, obj):
        return obj.is_active

    @display(description='Staff', boolean=True)
    def display_staff(self, obj):
        return obj.is_staff

    @action(description='✅ Activate selected users')
    def make_active(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f'{updated} user(s) activated.', messages.SUCCESS)

    @action(description='❌ Deactivate selected users')
    def make_inactive(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f'{updated} user(s) deactivated.', messages.WARNING)

    @action(description='🏥 Promote to Medical Reviewer')
    def promote_to_medical_reviewer(self, request, queryset):
        updated = 0
        for user in queryset:
            if user.role != 'medical_reviewer':
                user.role = 'medical_reviewer'
                user.save()
                # Create profile if doesn't exist
                MedicalReviewerProfile.objects.get_or_create(
                    user=user,
                    defaults={'full_name': user.get_full_name() or user.email}
                )
                updated += 1
        self.message_user(request, f'{updated} user(s) promoted to Medical Reviewer.', messages.SUCCESS)

    def get_inline_instances(self, request, obj=None):
        instances = super().get_inline_instances(request, obj)
        if obj is None or (obj and obj.role != 'medical_reviewer'):
            return [inline for inline in instances if not isinstance(inline, MedicalReviewerProfileInline)]
        return instances
