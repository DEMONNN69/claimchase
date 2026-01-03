# ClaimChase Phase 1 Setup & Documentation

## 🏛️ Architecture Overview

ClaimChase follows strict Django best practices:

### 1. **Modular App Structure**
- `users/` — Custom User Model and authentication
- `grievance_core/` — Case management, escalations, and audit trails

### 2. **Fat Models, Thin Views**
Models contain business logic:
- `Case.transition_to()` — Status transitions with validation
- `Case.is_eligible_for_ombudsman_escalation()` — Eligibility checks
- `Case.escalate_to_ombudsman()` — Escalation logic
- `Document.mark_as_verified()` — Verification workflow
- `Consent.is_active` — Active consent checking

### 3. **Service Layer Pattern**
`grievance_core/services.py` contains:
- `CaseService` — Case creation, submission, escalation, email tracking
- `ConsentService` — GDPR/consent management
- `DocumentService` — Document uploads and verification

Views call services, services call models.

---

## 📋 Project Structure

```
claimchase/
├── manage.py
├── requirements.txt
├── .env.example
├── claimchase/
│   ├── __init__.py
│   ├── wsgi.py
│   ├── urls.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py (shared config)
│   │   ├── dev.py (development overrides)
│   │   └── prod.py (production overrides)
│   └── apps/
│       ├── users/
│       │   ├── models.py (CustomUser)
│       │   ├── admin.py
│       │   └── apps.py
│       └── grievance_core/
│           ├── models.py (Case, CaseTimeline, EmailTracking, Consent, Document)
│           ├── services.py (Business logic)
│           ├── admin.py
│           └── apps.py
```

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Setup Environment
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

### 3. Create PostgreSQL Database
```bash
psql -U postgres
CREATE DATABASE claimchase_db;
\q
```

### 4. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 5. Create Superuser
```bash
python manage.py createsuperuser
```

### 6. Run Development Server
```bash
python manage.py runserver 0.0.0.0:8000
```

### 7. Access Admin Panel
```
http://localhost:8000/admin/
```

---

## 📊 Database Models

### CustomUser
- Extends Django's `AbstractUser`
- Fields: `email`, `phone`, `address`, `city`, `state`, `postal_code`, `date_of_birth`, `gender`
- Roles: `complainant`, `ombudsman_admin`, `insurance_agent`, `support_staff`
- Flags: `is_verified`, `is_ombudsman_eligible`
- Methods: `can_escalate_to_ombudsman()`, `increment_case_count()`, `increment_document_count()`

### Case
- Status flow: `draft` → `submitted` → `under_review` → `rejected` OR `escalated_to_ombudsman` → `resolved` → `closed`
- Tracks: policy number, rejection date, draft content, escalation metadata
- Fat Model Methods:
  - `can_transition_to(new_status)` — Validate transitions
  - `transition_to(new_status)` — Execute transitions
  - `is_eligible_for_ombudsman_escalation()` — 15-day rule + rejection check
  - `escalate_to_ombudsman()` — Escalate if eligible
  - `get_days_since_submission()` — Timeline utility
  - `mark_as_resolved(notes)` — Resolution workflow

### CaseTimeline
- Immutable audit trail of all case events
- Event types: `created`, `status_change`, `document_uploaded`, `email_received`, `email_sent`, `escalated`, `comment_added`, `resolved`
- Stores old/new values for status changes

### EmailTracking
- Direction: `inbound` or `outbound`
- Status: `pending`, `sent`, `delivered`, `bounced`, `failed`
- Tracks sender, recipient, subject, body, timestamps
- Flags: `is_automated`

### Consent
- Types: `data_processing`, `email_communication`, `phone_communication`, `information_sharing`, `terms_and_conditions`
- Tracks: `given_at`, `revoked_at`, `ip_address`
- Property: `is_active` — checks if given and not revoked

### Document
- Types: `policy_document`, `rejection_letter`, `support_document`, `communication`, `proof_of_payment`, `medical_report`, `other`
- Supports local file storage and S3 integration
- Verification tracking: `is_verified`, `verified_by`, `verified_at`

---

## 🔧 Service Layer Usage Examples

### Create a Case
```python
from claimchase.apps.grievance_core.services import CaseService
from claimchase.apps.users.models import CustomUser
from datetime import date

user = CustomUser.objects.get(email='user@gmail.com')

case, message = CaseService.create_case(
    user=user,
    insurance_type='health',
    policy_number='POL-123456',
    insurance_company_name='HealthPlus Insurance',
    subject='Claim Rejected Without Justification',
    description='My claim was rejected on grounds not mentioned in my policy...',
    date_of_incident=date(2025, 1, 15),
    date_of_rejection=date(2025, 1, 20),
    priority='high',
)
print(f"Case {case.case_number} created: {message}")
```

### Submit a Case
```python
success, message = CaseService.submit_case(case)
if success:
    print(f"Case submitted: {message}")
else:
    print(f"Error: {message}")
```

### Check & Escalate to Ombudsman
```python
success, message = CaseService.check_and_escalate_to_ombudsman(case)
if success:
    print(f"Case escalated: {message}")
else:
    print(f"Not eligible: {message}")
```

### Record an Email
```python
email_tracking, message = CaseService.record_email_reply(
    case=case,
    from_email='support@claimchase.com',
    to_email='user@gmail.com',
    subject='Re: Your Claim - CC-2025-00001',
    body='Thank you for filing the grievance. We are reviewing your case...',
    email_type='outbound',
    created_by=admin_user,
)
print(f"Email recorded: {message}")
```

### Upload a Document
```python
from claimchase.apps.grievance_core.services import DocumentService

with open('rejection_letter.pdf', 'rb') as f:
    document, message = DocumentService.upload_document(
        case=case,
        file=f,
        file_name='rejection_letter.pdf',
        document_type='rejection_letter',
        uploaded_by=user,
        description='Original rejection letter from insurance company',
    )
print(f"Document uploaded: {message}")
```

---

## 🔐 Security Considerations

1. **CustomUser Model** — Set early (migration is hard later)
2. **Consent Tracking** — GDPR compliance with revocation support
3. **Document Verification** — Admin approval before use
4. **Email Tracking** — Complete audit trail for communications
5. **Timeline Immutability** — No-delete policy on audit logs

---

## 📝 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DJANGO_SETTINGS_MODULE` | `claimchase.settings.dev` | Settings module (dev/prod) |
| `SECRET_KEY` | ⚠️ Change in production | Django secret key |
| `DEBUG` | `True` (dev only) | Debug mode |
| `DB_NAME` | `claimchase_db` | PostgreSQL database name |
| `DB_USER` | `postgres` | PostgreSQL username |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Frontend URLs |

---

## 🧪 Testing (Phase 2)

Recommended test structure:
- `tests/test_models.py` — Model methods and validation
- `tests/test_services.py` — Service layer workflows
- `tests/test_views.py` — API endpoints
- `tests/test_workflows.py` — End-to-end case workflows

---

## 🚢 Deployment Checklist

- [ ] Set `DEBUG = False` in production
- [ ] Set strong `SECRET_KEY`
- [ ] Configure PostgreSQL with SSL
- [ ] Set `SECURE_SSL_REDIRECT = True`
- [ ] Use environment variables for sensitive data
- [ ] Run `python manage.py collectstatic` before deploy
- [ ] Configure email backend (SendGrid, AWS SES)
- [ ] Optional: Set up Sentry for error tracking
- [ ] Optional: Configure AWS S3 for document storage

---

## 📅 Next Steps (Phase 2)

1. **REST API Views** — DRF ViewSets for Case, Document, Consent
2. **Authentication** — Token/JWT auth, Signup/Login endpoints
3. **Permissions** — Role-based access (user can only see own cases)
4. **Pagination & Filtering** — QuerySet optimization
5. **Tests** — Unit + integration tests
6. **API Documentation** — Auto-generated with drf-spectacular
7. **Email Integration** — Send notifications on status changes
8. **Frontend Integration** — Connect Vite React app

---

## 🎯 Key Design Decisions

1. **Fat Models**: All status transitions, eligibility checks, and calculations live in models. Services orchestrate.
2. **Service Layer**: No business logic in views. Views are thin: validate input → call service → return response.
3. **Immutable Timeline**: `CaseTimeline` records cannot be edited/deleted—complete audit trail.
4. **Custom User Early**: Django user model changes are migration nightmares. Built it right from the start.
5. **Database Indexes**: Added on frequently filtered fields (user, status, case_number, policy_number).
6. **Timestamps**: All models have `created_at`/`updated_at` for auditability.

---

**Last Updated**: December 30, 2025  
**Version**: Phase 1 (Model & Service Layer Foundation)
