"""
Unfold dashboard components for ClaimChase admin.
"""
import json
from unfold.components import BaseComponent
from unfold.decorators import action
from django.utils import timezone
from datetime import timedelta
from django.db.models import Count, Q


class CaseStatusChartComponent(BaseComponent):
    component_name = "CaseStatusChartComponent"
    """Bar chart showing case status distribution"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        from claimchase.apps.grievance_core.models import Case
        
        status_counts = Case.objects.values('status').annotate(count=Count('id'))
        
        labels = []
        data = []
        colors = []
        
        status_colors = {
            'draft': 'var(--color-gray-500)',
            'submitted': 'var(--color-blue-500)',
            'under_review': 'var(--color-purple-500)',
            'resolved': 'var(--color-green-500)',
            'escalated_to_ombudsman': 'var(--color-orange-500)',
            'closed': 'var(--color-gray-700)',
        }
        
        for item in status_counts:
            labels.append(item['status'].replace('_', ' ').title())
            data.append(item['count'])
            colors.append(status_colors.get(item['status'], 'var(--color-primary-500)'))
        
        context.update({
            "height": 300,
            "data": json.dumps({
                "labels": labels,
                "datasets": [{
                    "label": "Cases by Status",
                    "data": data,
                    "backgroundColor": colors,
                }]
            })
        })
        
        return context


class CaseTrendChartComponent(BaseComponent):
    component_name = "CaseTrendChartComponent"
    """Line chart showing case trends over the last 7 days"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        from claimchase.apps.grievance_core.models import Case
        
        labels = []
        data = []
        
        for i in range(6, -1, -1):
            date = timezone.now() - timedelta(days=i)
            labels.append(date.strftime('%a'))
            count = Case.objects.filter(created_at__date=date.date()).count()
            data.append(count)
        
        context.update({
            "height": 300,
            "data": json.dumps({
                "labels": labels,
                "datasets": [{
                    "label": "New Cases",
                    "data": data,
                    "borderColor": "var(--color-primary-500)",
                    "backgroundColor": "var(--color-primary-100)",
                    "fill": True,
                    "tension": 0.4,
                }]
            })
        })
        
        return context


class ReviewOutcomesChartComponent(BaseComponent):
    component_name = "ReviewOutcomesChartComponent"
    """Pie chart showing review outcomes distribution"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        from claimchase.apps.medical_review.models import DocumentReview
        
        outcomes = DocumentReview.objects.values('outcome').annotate(count=Count('id'))
        
        labels = []
        data = []
        colors = ['var(--color-green-500)', 'var(--color-red-500)', 'var(--color-amber-500)']
        
        for item in outcomes:
            if item['outcome']:
                labels.append(item['outcome'].replace('_', ' ').title())
                data.append(item['count'])
        
        context.update({
            "height": 300,
            "data": json.dumps({
                "labels": labels,
                "datasets": [{
                    "label": "Review Outcomes",
                    "data": data,
                    "backgroundColor": colors,
                }]
            })
        })
        
        return context


class DisputePriorityChartComponent(BaseComponent):
    component_name = "DisputePriorityChartComponent"
    """Bar chart showing dispute priority distribution"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        from claimchase.apps.consumer_disputes.models import ConsumerDispute
        
        priorities = ['low', 'medium', 'high', 'urgent']
        data = []
        colors = [
            'var(--color-blue-300)',
            'var(--color-amber-400)',
            'var(--color-orange-500)',
            'var(--color-red-600)',
        ]
        
        for priority in priorities:
            count = ConsumerDispute.objects.filter(priority=priority).count()
            data.append(count)
        
        context.update({
            "height": 300,
            "data": json.dumps({
                "labels": [p.title() for p in priorities],
                "datasets": [{
                    "label": "Disputes by Priority",
                    "data": data,
                    "backgroundColor": colors,
                }]
            })
        })
        
        return context


class DisputeTrendChartComponent(BaseComponent):    
    component_name = "DisputeTrendChartComponent"
    """Line chart showing dispute trends over the last 30 days"""
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        from claimchase.apps.consumer_disputes.models import ConsumerDispute
        
        labels = []
        data = []
        
        for i in range(29, -1, -1):
            date = timezone.now() - timedelta(days=i)
            labels.append(date.strftime('%d %b'))
            count = ConsumerDispute.objects.filter(created_at__date=date.date()).count()
            data.append(count)
        
        context.update({
            "height": 300,
            "data": json.dumps({
                "labels": labels,
                "datasets": [{
                    "label": "New Disputes",
                    "data": data,
                    "borderColor": "var(--color-purple-500)",
                    "backgroundColor": "var(--color-purple-100)",
                    "fill": True,
                    "tension": 0.4,
                    "maxTicksXLimit": 10,
                }]
            })
        })
        
        return context


# Register all components with ComponentRegistry
from unfold.components import ComponentRegistry

ComponentRegistry._registry["CaseStatusChartComponent"] = CaseStatusChartComponent
ComponentRegistry._registry["CaseTrendChartComponent"] = CaseTrendChartComponent
ComponentRegistry._registry["ReviewOutcomesChartComponent"] = ReviewOutcomesChartComponent
ComponentRegistry._registry["DisputePriorityChartComponent"] = DisputePriorityChartComponent
ComponentRegistry._registry["DisputeTrendChartComponent"] = DisputeTrendChartComponent
