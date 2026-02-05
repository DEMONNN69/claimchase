"""
Admin callbacks for Django Unfold admin panel.
Provides dynamic badges, environment indicators, and dashboard data.
"""

from django.db.models import Count, Q, F, Avg
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


def badge_callback_pending_expert_assignments(request):
    """Return count of pending expert assignments."""
    try:
        from claimchase.apps.consumer_disputes.expert_models import DisputeAssignment
        count = DisputeAssignment.objects.filter(status='pending').count()
        return count if count > 0 else None
    except Exception:
        return None


def badge_callback_documents(request):
    """Return count of documents pending review."""
    try:
        from claimchase.apps.grievance_core.models import Document
        count = Document.objects.filter(is_verified=False).count()
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
    print("\n=== MAIN DASHBOARD CALLBACK CALLED ===")
    print(f"Request path: {request.path}")
    
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
        status_data = Case.objects.values('status').annotate(count=Count('id'))
        case_status_counts = {item['status']: item['count'] for item in status_data}
        
        # Document statistics
        total_documents = Document.objects.count()
        pending_documents = Document.objects.filter(is_verified=False).count()
        
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
            'assignment__case',
            'assignment__reviewer'
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


def medical_review_dashboard_callback(request, context):
    """
    Medical Review dashboard statistics and metrics.
    """
    print("\n=== MEDICAL REVIEW DASHBOARD CALLBACK CALLED ===")
    print(f"Request path: {request.path}")
    print(f"Context keys: {context.keys()}")
    print(f"App label from context: {context.get('app_label', 'NOT FOUND')}")
    
    try:
        from claimchase.apps.medical_review.models import (
            ReviewAssignment, DocumentReview, MedicalReviewerProfile, ReviewerStats
        )
        from claimchase.apps.grievance_core.models import Document
        from django.db.models import Avg, Count, Q
        
        week_ago = timezone.now() - timedelta(days=7)
        month_ago = timezone.now() - timedelta(days=30)
        
        # Assignment statistics
        total_assignments = ReviewAssignment.objects.count()
        pending_assignments = ReviewAssignment.objects.filter(status='pending').count()
        in_progress_assignments = ReviewAssignment.objects.filter(status='in_progress').count()
        completed_assignments = ReviewAssignment.objects.filter(status='completed').count()
        
        # Status breakdown
        assignment_status_counts = {
            item['status']: item['count'] 
            for item in ReviewAssignment.objects.values('status').annotate(count=Count('id'))
        }
        
        # Review statistics
        total_reviews = DocumentReview.objects.count()
        reviews_this_week = DocumentReview.objects.filter(created_at__gte=week_ago).count()
        reviews_this_month = DocumentReview.objects.filter(created_at__gte=month_ago).count()
        
        # Outcome breakdown
        outcome_counts = {
            item['outcome']: item['count']
            for item in DocumentReview.objects.values('outcome').annotate(count=Count('id'))
        }
        
        # Reviewer statistics
        total_reviewers = MedicalReviewerProfile.objects.filter(is_available=True).count()
        avg_completion_time = ReviewAssignment.objects.filter(
            status='completed',
            started_at__isnull=False,
            completed_at__isnull=False
        ).annotate(
            duration=F('completed_at') - F('started_at')
        ).aggregate(avg_time=Avg('duration'))
        
        # Top reviewers by completed assignments
        top_reviewers = ReviewerStats.objects.select_related(
            'reviewer'
        ).order_by('-completed_assignments')[:5]
        
        # Recent activity
        recent_assignments = ReviewAssignment.objects.select_related(
            'case', 'reviewer'
        ).order_by('-assigned_at')[:5]
        
        recent_reviews = DocumentReview.objects.select_related(
            'assignment__case',
            'assignment__reviewer'
        ).order_by('-created_at')[:5]
        
        # Documents awaiting review
        unverified_documents = Document.objects.filter(is_verified=False).count()
        
        context.update({
            # Assignment stats
            'total_assignments': total_assignments,
            'pending_assignments': pending_assignments,
            'in_progress_assignments': in_progress_assignments,
            'completed_assignments': completed_assignments,
            'assignment_status_counts': assignment_status_counts,
            
            # Review stats
            'total_reviews': total_reviews,
            'reviews_this_week': reviews_this_week,
            'reviews_this_month': reviews_this_month,
            'outcome_counts': outcome_counts,
            
            # Reviewer stats
            'total_reviewers': total_reviewers,
            'avg_completion_time': avg_completion_time.get('avg_time') if avg_completion_time else None,
            'top_reviewers': top_reviewers,
            'unverified_documents': unverified_documents,
            
            # Recent activity
            'recent_assignments': recent_assignments,
            'recent_reviews': recent_reviews,
            
            'show_dashboard': True,
        })
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Medical Review Dashboard Error: {e}")
        traceback.print_exc()
        context.update({
            'dashboard_error': str(e),
            'show_dashboard': False,
        })
    
    return context


def consumer_disputes_dashboard_callback(request, context):
    """
    Consumer Disputes dashboard statistics and metrics.
    """
    print("\n=== CONSUMER DISPUTES DASHBOARD CALLBACK CALLED ===")
    print(f"Request path: {request.path}")
    print(f"Context keys: {context.keys()}")
    print(f"App label from context: {context.get('app_label', 'NOT FOUND')}")
    
    try:
        from claimchase.apps.consumer_disputes.models import (
            ConsumerDispute, DisputeCategory, Entity, DisputeDocument, DisputeTimeline
        )
        from django.db.models import Count, Q
        
        week_ago = timezone.now() - timedelta(days=7)
        month_ago = timezone.now() - timedelta(days=30)
        
        # Dispute statistics
        total_disputes = ConsumerDispute.objects.count()
        active_disputes = ConsumerDispute.objects.exclude(status__in=['resolved', 'closed', 'rejected']).count()
        disputes_this_week = ConsumerDispute.objects.filter(created_at__gte=week_ago).count()
        disputes_this_month = ConsumerDispute.objects.filter(created_at__gte=month_ago).count()
        
        # Status breakdown
        dispute_status_counts = {
            item['status']: item['count']
            for item in ConsumerDispute.objects.values('status').annotate(count=Count('id'))
        }
        
        # Priority breakdown
        dispute_priority_counts = {
            item['priority']: item['count']
            for item in ConsumerDispute.objects.values('priority').annotate(count=Count('id'))
        }
        
        # Category statistics
        top_categories = DisputeCategory.objects.filter(
            parent__isnull=True  # Only root categories
        ).annotate(
            dispute_count=Count('disputes')
        ).order_by('-dispute_count')[:5]
        
        # Entity statistics
        top_entities = Entity.objects.annotate(
            dispute_count=Count('disputes')
        ).order_by('-dispute_count')[:5]
        
        # Document statistics
        total_documents = DisputeDocument.objects.count()
        pending_documents = 0  # DisputeDocument doesn't have verification field
        
        # Timeline entries
        total_timeline_entries = DisputeTimeline.objects.count()
        recent_timeline = DisputeTimeline.objects.select_related(
            'dispute', 'created_by'
        ).order_by('-created_at')[:5]
        
        # Recent activity
        recent_disputes = ConsumerDispute.objects.select_related(
            'user', 'category', 'entity'
        ).order_by('-created_at')[:5]
        
        # Resolution rate
        resolved_count = dispute_status_counts.get('resolved', 0)
        resolution_rate = (resolved_count / total_disputes * 100) if total_disputes > 0 else 0
        
        context.update({
            # Dispute stats
            'total_disputes': total_disputes,
            'active_disputes': active_disputes,
            'disputes_this_week': disputes_this_week,
            'disputes_this_month': disputes_this_month,
            'dispute_status_counts': dispute_status_counts,
            'dispute_priority_counts': dispute_priority_counts,
            'resolution_rate': round(resolution_rate, 1),
            
            # Category & Entity stats
            'top_categories': top_categories,
            'top_entities': top_entities,
            
            # Document stats
            'total_documents': total_documents,
            'pending_documents': pending_documents,
            
            # Timeline stats
            'total_timeline_entries': total_timeline_entries,
            'recent_timeline': recent_timeline,
            
            # Recent activity
            'recent_disputes': recent_disputes,
            
            'show_dashboard': True,
        })
    except Exception as e:
        # Log the error for debugging
        import traceback
        print(f"Consumer Disputes Dashboard Error: {e}")
        traceback.print_exc()
        context.update({
            'dashboard_error': str(e),
            'show_dashboard': False,
        })
    
    return context
