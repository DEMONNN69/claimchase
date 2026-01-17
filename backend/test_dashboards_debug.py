import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'claimchase.settings')
django.setup()

from claimchase.admin_callbacks import medical_review_dashboard_callback, consumer_disputes_dashboard_callback
from django.test import RequestFactory
from django.contrib.auth import get_user_model

# Create a fake request
factory = RequestFactory()
request = factory.get('/admin/')
User = get_user_model()
request.user = User.objects.first()

print("=" * 60)
print("TESTING MEDICAL REVIEW DASHBOARD")
print("=" * 60)
context_med = {}
try:
    result_med = medical_review_dashboard_callback(request, context_med)
    print(f"✓ Callback executed successfully")
    print(f"  show_dashboard: {result_med.get('show_dashboard', 'NOT SET')}")
    if result_med.get('dashboard_error'):
        print(f"  ERROR: {result_med['dashboard_error']}")
    else:
        print(f"  total_assignments: {result_med.get('total_assignments', 'NOT SET')}")
        print(f"  pending_assignments: {result_med.get('pending_assignments', 'NOT SET')}")
        print(f"  total_reviewers: {result_med.get('total_reviewers', 'NOT SET')}")
except Exception as e:
    print(f"✗ Exception occurred: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("TESTING CONSUMER DISPUTES DASHBOARD")
print("=" * 60)
context_cons = {}
try:
    result_cons = consumer_disputes_dashboard_callback(request, context_cons)
    print(f"✓ Callback executed successfully")
    print(f"  show_dashboard: {result_cons.get('show_dashboard', 'NOT SET')}")
    if result_cons.get('dashboard_error'):
        print(f"  ERROR: {result_cons['dashboard_error']}")
    else:
        print(f"  total_disputes: {result_cons.get('total_disputes', 'NOT SET')}")
        print(f"  active_disputes: {result_cons.get('active_disputes', 'NOT SET')}")
except Exception as e:
    print(f"✗ Exception occurred: {type(e).__name__}: {e}")
    import traceback
    traceback.print_exc()

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
