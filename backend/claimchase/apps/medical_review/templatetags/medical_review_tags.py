"""
Template tags for Medical Review dashboard
"""
from django import template
from django.utils import timezone
from datetime import timedelta

register = template.Library()


@register.simple_tag
def get_medical_review_stats():
    """Get medical review dashboard statistics"""
    try:
        from claimchase.apps.medical_review.models import (
            ReviewAssignment, DocumentReview, MedicalReviewerProfile, ReviewerStats
        )
        from django.db.models import Count, Q
        
        week_ago = timezone.now() - timedelta(days=7)
        
        # Assignment statistics
        total_assignments = ReviewAssignment.objects.count()
        pending_assignments = ReviewAssignment.objects.filter(status='pending').count()
        in_progress_assignments = ReviewAssignment.objects.filter(status='in_progress').count()
        completed_assignments = ReviewAssignment.objects.filter(status='completed').count()
        reviews_this_week = ReviewAssignment.objects.filter(assigned_at__gte=week_ago).count()
        
        month_ago = timezone.now() - timedelta(days=30)
        reviews_this_month = ReviewAssignment.objects.filter(assigned_at__gte=month_ago).count()
        
        # Assignment status counts for pipeline
        assignment_status_counts = {
            'pending': pending_assignments,
            'in_progress': in_progress_assignments,
            'completed': completed_assignments,
        }
        
        # Reviewer counts
        from claimchase.apps.grievance_core.models import Document
        total_reviewers = MedicalReviewerProfile.objects.filter(is_available=True).count()
        unverified_documents = Document.objects.filter(is_verified=False).count()
        
        # Review outcomes
        review_outcomes = DocumentReview.objects.values('outcome').annotate(count=Count('id'))
        outcomes_dict = {item['outcome']: item['count'] for item in review_outcomes}
        
        # Top reviewers
        top_reviewers = (
            ReviewerStats.objects
            .select_related('reviewer__user')
            .filter(total_documents_reviewed__gt=0)
            .order_by('-total_documents_reviewed')[:5]
        )
        
        # Recent assignments
        recent_assignments = (
            ReviewAssignment.objects
            .select_related('reviewer__user', 'case')
            .order_by('-assigned_at')[:10]
        )
        
        return {
            'show_dashboard': True,
            'total_assignments': total_assignments,
            'pending_assignments': pending_assignments,
            'in_progress_assignments': in_progress_assignments,
            'completed_assignments': completed_assignments,
            'reviews_this_week': reviews_this_week,
            'reviews_this_month': reviews_this_month,
            'assignment_status_counts': assignment_status_counts,
            'total_reviewers': total_reviewers,
            'unverified_documents': unverified_documents,
            'review_outcomes': outcomes_dict,
            'top_reviewers': top_reviewers,
            'recent_assignments': recent_assignments,
        }
    except Exception as e:
        print(f"Medical Review Template Tag Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'show_dashboard': False,
            'error': str(e)
        }
