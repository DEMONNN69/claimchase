import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'claimchase.settings.dev')
django.setup()

from claimchase.admin_callbacks import (
    dashboard_callback,
    medical_review_dashboard_callback,
    consumer_disputes_dashboard_callback
)
from django.contrib.auth import get_user_model

User = get_user_model()
user = User.objects.first()

class FakeRequest:
    pass

request = FakeRequest()
request.user = user

# Test main dashboard
print("=" * 60)
print("MAIN DASHBOARD")
print("=" * 60)
context = {}
dashboard_callback(request, context)
print('show_dashboard:', context.get('show_dashboard'))
print('total_cases:', context.get('total_cases'))
print('active_cases:', context.get('active_cases'))
print('error:', context.get('dashboard_error'))

# Test medical review dashboard
print("\n" + "=" * 60)
print("MEDICAL REVIEW DASHBOARD")
print("=" * 60)
context = {}
medical_review_dashboard_callback(request, context)
print('show_dashboard:', context.get('show_dashboard'))
print('total_assignments:', context.get('total_assignments'))
print('pending_assignments:', context.get('pending_assignments'))
print('total_reviewers:', context.get('total_reviewers'))
print('error:', context.get('dashboard_error'))

# Test consumer disputes dashboard
print("\n" + "=" * 60)
print("CONSUMER DISPUTES DASHBOARD")
print("=" * 60)
context = {}
consumer_disputes_dashboard_callback(request, context)
print('show_dashboard:', context.get('show_dashboard'))
print('total_disputes:', context.get('total_disputes'))
print('active_disputes:', context.get('active_disputes'))
print('resolution_rate:', context.get('resolution_rate'))
print('error:', context.get('dashboard_error'))

print("\n" + "=" * 60)
print("ALL TESTS COMPLETED!")
print("=" * 60)
