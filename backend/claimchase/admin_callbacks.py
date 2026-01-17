"""
Admin callbacks for Django Unfold admin panel.
Provides dynamic badges, environment indicators, and dashboard data.
"""

from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta


def environment_callback(request):
    """
    Display environment indicator in admin header.
    Returns [text, color_type] - color_type: info, danger, warning, success
    """
    from django.conf import settings
    
    if settings.DEBUG:
        return ["🔧 Development", "warning"]
    return ["🚀 Production", "success"]


def badge_callback_cases(request):
    """Return count of active cases (not resolved/closed)."""
    try:
        from claimchase.apps.grievance_core.models import Case
        count = Case.objects.exclude(status__in=['resolved', 'closed']).count()
        return count if count > 0 else None
    except Exception:
        return None


def badge_callback_pending_reviews(request):
    """Return count of pending document reviews."""
    try:
        from claimchase.apps.medical_review.models import ReviewAssignment
        count = ReviewAssignment.objects.filter(status='pending').count()
        return count if count > 0 else None
    except Exception:
        return None


def badge_callback_documents(request):
    """Return count of documents pending review."""
    try:
        from claimchase.apps.grievance_core.models import Document
        count = Document.objects.filter(review_status='pending').count()
        return count if count > 0 else None
    except Exception:
        return None


def badge_callback_users(request):
    """Return count of users registered in last 7 days."""
    try:
        from claimchase.apps.users.models import CustomUser
        week_ago = timezone.now() - timedelta(days=7)
        count = CustomUser.objects.filter(date_joined__gte=week_ago).count()
        return f"+{count}" if count > 0 else None
    except Exception:
        return None


def dashboard_callback(request, context):
    """
    Prepare custom variables for the admin dashboard.
    Injects stats and metrics into templates/admin/index.html
    """
    try:
        from claimchase.apps.grievance_core.models import Case, Document
        from claimchase.apps.medical_review.models import ReviewAssignment, DocumentReview
        from claimchase.apps.users.models import CustomUser
        
        # Date ranges
        today = timezone.now().date()
        week_ago = timezone.now() - timedelta(days=7)
        month_ago = timezone.now() - timedelta(days=30)
        
        # Case statistics
        total_cases = Case.objects.count()
        active_cases = Case.objects.exclude(status__in=['resolved', 'closed']).count()
        cases_this_week = Case.objects.filter(created_at__gte=week_ago).count()
        escalated_cases = Case.objects.filter(is_escalated_to_ombudsman=True).count()
        
        # Case status breakdown
        case_status_counts = dict(
            Case.objects.values_list('status')
            .annotate(count=Count('id'))
            .order_by()
        )
        
        # Document statistics
        total_documents = Document.objects.count()
        pending_documents = Document.objects.filter(review_status='pending').count()
        
        # Review statistics
        pending_reviews = ReviewAssignment.objects.filter(status='pending').count()
        in_progress_reviews = ReviewAssignment.objects.filter(status='in_progress').count()
        completed_reviews = ReviewAssignment.objects.filter(status='completed').count()
        
        # User statistics
        total_users = CustomUser.objects.count()
        new_users_week = CustomUser.objects.filter(date_joined__gte=week_ago).count()
        medical_reviewers = CustomUser.objects.filter(role='medical_reviewer').count()
        
        # Recent activity
        recent_cases = Case.objects.select_related('user').order_by('-created_at')[:5]
        recent_reviews = DocumentReview.objects.select_related(
            'assignment__document',
            'assignment__reviewer__user'
        ).order_by('-created_at')[:5]
        
        context.update({
            # Stats cards
            'total_cases': total_cases,
            'active_cases': active_cases,
            'cases_this_week': cases_this_week,
            'escalated_cases': escalated_cases,
            'total_documents': total_documents,
            'pending_documents': pending_documents,
            'pending_reviews': pending_reviews,
            'in_progress_reviews': in_progress_reviews,
            'completed_reviews': completed_reviews,
            'total_users': total_users,
            'new_users_week': new_users_week,
            'medical_reviewers': medical_reviewers,
            
            # Status breakdown
            'case_status_counts': case_status_counts,
            
            # Recent activity
            'recent_cases': recent_cases,
            'recent_reviews': recent_reviews,
            
            # Quick actions
            'show_dashboard': True,
        })
    except Exception as e:
        context.update({
            'dashboard_error': str(e),
            'show_dashboard': False,
        })
    
    return context
