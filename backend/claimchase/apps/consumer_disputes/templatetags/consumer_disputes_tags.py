"""
Template tags for Consumer Disputes dashboard
"""
from django import template
from django.utils import timezone
from datetime import timedelta

register = template.Library()


@register.simple_tag
def get_consumer_disputes_stats():
    """Get consumer disputes dashboard statistics"""
    try:
        from claimchase.apps.consumer_disputes.models import (
            ConsumerDispute, DisputeCategory, Entity
        )
        from django.db.models import Count, Q
        
        week_ago = timezone.now() - timedelta(days=7)
        month_ago = timezone.now() - timedelta(days=30)
        
        # Dispute statistics
        total_disputes = ConsumerDispute.objects.count()
        open_disputes = ConsumerDispute.objects.filter(status='open').count()
        in_review_disputes = ConsumerDispute.objects.filter(status='in_review').count()
        resolved_disputes = ConsumerDispute.objects.filter(status='resolved').count()
        disputes_this_week = ConsumerDispute.objects.filter(created_at__gte=week_ago).count()
        disputes_this_month = ConsumerDispute.objects.filter(created_at__gte=month_ago).count()
        
        # Status counts for pipeline
        dispute_status_counts = {
            'open': open_disputes,
            'in_review': in_review_disputes,
            'resolved': resolved_disputes,
            'escalated': ConsumerDispute.objects.filter(status='escalated').count(),
            'closed': ConsumerDispute.objects.filter(status='closed').count(),
        }
        
        # Priority distribution
        priority_counts = {
            'low': ConsumerDispute.objects.filter(priority='low').count(),
            'medium': ConsumerDispute.objects.filter(priority='medium').count(),
            'high': ConsumerDispute.objects.filter(priority='high').count(),
            'urgent': ConsumerDispute.objects.filter(priority='urgent').count(),
        }
        
        # Top categories
        top_categories = (
            DisputeCategory.objects
            .annotate(dispute_count=Count('disputes'))
            .filter(dispute_count__gt=0)
            .order_by('-dispute_count')[:5]
        )
        
        # Top entities (insurance companies/providers)
        top_entities = (
            Entity.objects
            .annotate(dispute_count=Count('disputes'))
            .filter(dispute_count__gt=0)
            .order_by('-dispute_count')[:5]
        )
        
        # Recent disputes
        recent_disputes = (
            ConsumerDispute.objects
            .select_related('category', 'entity', 'user')
            .order_by('-created_at')[:10]
        )
        
        return {
            'show_dashboard': True,
            'total_disputes': total_disputes,
            'open_disputes': open_disputes,
            'in_review_disputes': in_review_disputes,
            'resolved_disputes': resolved_disputes,
            'disputes_this_week': disputes_this_week,
            'disputes_this_month': disputes_this_month,
            'dispute_status_counts': dispute_status_counts,
            'priority_counts': priority_counts,
            'top_categories': top_categories,
            'top_entities': top_entities,
            'recent_disputes': recent_disputes,
        }
    except Exception as e:
        print(f"Consumer Disputes Template Tag Error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'show_dashboard': False,
            'error': str(e)
        }
