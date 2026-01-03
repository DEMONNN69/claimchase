# ClaimChase API Integration Guide

## 🚀 Backend Ready

Your Django backend is running with REST API at:
- **API Root**: `http://localhost:8000/api/`
- **Swagger UI**: `http://localhost:8000/api/docs/`
- **Schema**: `http://localhost:8000/api/schema/`

---

## 📋 Authentication Endpoints

### 1. **Signup** (Create Account)
```bash
POST /api/auth/signup/
Content-Type: application/json

{
  "email": "user@gmail.com",
  "username": "username",
  "password": "securepassword123",
  "first_name": "Saurabh",
  "last_name": "Shukla",
  "phone": "+1234567890"
}

Response:
{
  "success": true,
  "message": "Account created successfully",
  "token": "abc123xyz789",
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "username": "username",
    "full_name": "Saurabh Shukla",
    "role": "complainant",
    "case_count": 0,
    "document_count": 0
  }
}
```

### 2. **Login**
```bash
POST /api/auth/login/
Content-Type: application/json

{
  "email": "user@gmail.com",
  "password": "securepassword123"
}

Response:
{
  "success": true,
  "message": "Login successful",
  "token": "abc123xyz789",
  "user": {...}
}
```

### 3. **Get Profile** (Protected)
```bash
GET /api/auth/profile/
Authorization: Token abc123xyz789

Response:
{
  "success": true,
  "user": {...}
}
```

### 4. **Logout** (Protected)
```bash
POST /api/auth/logout/
Authorization: Token abc123xyz789

Response:
{
  "success": true,
  "message": "Logout successful"
}
```

---

## 📁 Case Management Endpoints

### 1. **List User's Cases** (Protected)
```bash
GET /api/cases/
Authorization: Token abc123xyz789

Response:
[
  {
    "id": 1,
    "case_number": "CC-2025-00001",
    "user_email": "user@gmail.com",
    "status": "submitted",
    "priority": "high",
    "subject": "Claim Rejected",
    "insurance_company_name": "HealthPlus",
    "is_escalated_to_ombudsman": false,
    "ombudsman_status": {
      "is_eligible": true,
      "days_remaining": 0,
      "reason": "15+ days since submission - eligible for escalation"
    },
    "created_at": "2025-01-15T10:00:00Z",
    "updated_at": "2025-01-20T15:30:00Z"
  }
]
```

### 2. **Get Case Detail** (Protected)
```bash
GET /api/cases/{id}/
Authorization: Token abc123xyz789

Response:
{
  "id": 1,
  "case_number": "CC-2025-00001",
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "phone": "+1234567890"
  },
  "status": "submitted",
  "priority": "high",
  "subject": "Claim Rejected",
  "description": "My claim was rejected without proper justification...",
  "insurance_company_name": "HealthPlus",
  "policy_number": "POL-123456",
  "date_of_incident": "2025-01-15",
  "date_of_rejection": "2025-01-20",
  "ombudsman_status": {
    "is_eligible": true,
    "days_remaining": 0,
    "reason": "15+ days since submission - eligible for escalation"
  },
  "days_since_submission": 5,
  "timeline_events": [
    {
      "id": 1,
      "event_type": "created",
      "description": "Case CC-2025-00001 created for policy POL-123456",
      "created_by_email": "user@gmail.com",
      "created_at": "2025-01-15T10:00:00Z"
    },
    {
      "id": 2,
      "event_type": "status_change",
      "description": "Case submitted for review",
      "old_value": "draft",
      "new_value": "submitted",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "emails": [
    {
      "id": 1,
      "email_type": "outbound",
      "from_email": "support@claimchase.com",
      "to_email": "user@gmail.com",
      "subject": "Your Case Submission - CC-2025-00001",
      "status": "delivered",
      "sent_at": "2025-01-15T10:35:00Z"
    }
  ],
  "documents": [
    {
      "id": 1,
      "file_name": "rejection_letter.pdf",
      "document_type": "rejection_letter",
      "file_size_mb": 2.5,
      "is_verified": true,
      "uploaded_by_email": "user@gmail.com",
      "created_at": "2025-01-15T10:40:00Z"
    }
  ]
}
```

### 3. **Get Case Status** (Protected)
```bash
GET /api/cases/{id}/status/
Authorization: Token abc123xyz789

Returns comprehensive status summary with ombudsman eligibility
```

### 4. **Update Case Status** (Protected)
```bash
POST /api/cases/{id}/update_status/
Authorization: Token abc123xyz789
Content-Type: application/json

{
  "new_status": "under_review",
  "notes": "Email sent to insurance company requesting clarification"
}

Response:
{
  "success": true,
  "message": "Case status updated to under_review",
  "case": {...}
}
```

Valid status transitions:
- `draft` → `submitted`
- `submitted` → `under_review`, `rejected`
- `under_review` → `rejected`, `escalated_to_ombudsman`, `resolved`
- `rejected` → `escalated_to_ombudsman`
- `escalated_to_ombudsman` → `resolved`, `closed`
- `resolved` → `closed`

### 5. **Check for Email Replies** (Protected)
```bash
POST /api/cases/{id}/check_for_replies/
Authorization: Token abc123xyz789

Response:
{
  "success": true,
  "message": "Reply found for case CC-2025-00001. Status updated to 'under_review'.",
  "case": {...}
}
```

### 6. **Get Case Timeline** (Protected)
```bash
GET /api/cases/{id}/timeline/
Authorization: Token abc123xyz789

Response:
{
  "case_number": "CC-2025-00001",
  "event_count": 5,
  "events": [...]
}
```

### 7. **Get Case Emails** (Protected)
```bash
GET /api/cases/{id}/emails/
Authorization: Token abc123xyz789

Response:
{
  "case_number": "CC-2025-00001",
  "email_count": 3,
  "emails": [...]
}
```

### 8. **Get Case Documents** (Protected)
```bash
GET /api/cases/{id}/documents/
Authorization: Token abc123xyz789

Response:
{
  "case_number": "CC-2025-00001",
  "document_count": 2,
  "verified_count": 1,
  "documents": [...]
}
```

### 9. **Check Ombudsman Eligibility** (Protected)
```bash
GET /api/cases/{id}/ombudsman_eligibility/
Authorization: Token abc123xyz789

Response:
{
  "case_number": "CC-2025-00001",
  "current_status": "submitted",
  "is_already_escalated": false,
  "is_eligible": true,
  "days_remaining": 0,
  "reason": "15+ days since submission - eligible for escalation"
}
```

### 10. **Escalate to Ombudsman** (Protected)
```bash
POST /api/cases/{id}/escalate_to_ombudsman/
Authorization: Token abc123xyz789

Response:
{
  "success": true,
  "message": "Case escalated to ombudsman successfully",
  "case": {...}
}
```

---

## 🔒 CORS Configuration

CORS is already configured to allow requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- `http://127.0.0.1:3000`
- `http://127.0.0.1:5173`

---

## 🔐 Authentication Flow

1. **Sign up or login** to get a token
2. **Include token in headers**: `Authorization: Token <token>`
3. **All subsequent requests** are authenticated and user-scoped

---

## 📝 React Integration Example

### Install API Client
```bash
npm install axios
```

### Create API Service (`src/services/api.ts`)
```typescript
import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

export const authAPI = {
  signup: (data) => api.post('/auth/signup/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: () => api.post('/auth/logout/'),
  getProfile: () => api.get('/auth/profile/'),
};

export const caseAPI = {
  list: () => api.get('/cases/'),
  get: (id) => api.get(`/cases/${id}/`),
  getStatus: (id) => api.get(`/cases/${id}/status/`),
  updateStatus: (id, data) => api.post(`/cases/${id}/update_status/`, data),
  checkReplies: (id) => api.post(`/cases/${id}/check_for_replies/`),
  escalate: (id) => api.post(`/cases/${id}/escalate_to_ombudsman/`),
  getTimeline: (id) => api.get(`/cases/${id}/timeline/`),
  getEmails: (id) => api.get(`/cases/${id}/emails/`),
  getDocuments: (id) => api.get(`/cases/${id}/documents/`),
  getOmbudsmanStatus: (id) => api.get(`/cases/${id}/ombudsman_eligibility/`),
};

export default api;
```

### Use in React Component
```typescript
import { useState, useEffect } from 'react';
import { caseAPI } from '@/services/api';

export function CaseDetail({ caseId }) {
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    caseAPI.get(caseId).then(res => {
      setCaseData(res.data);
      setLoading(false);
    });
  }, [caseId]);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{caseData.case_number}</h1>
      <p>Status: {caseData.status}</p>
      <p>Eligible for ombudsman: {caseData.ombudsman_status.is_eligible ? 'Yes' : 'No'}</p>
      {caseData.ombudsman_status.days_remaining > 0 && (
        <p>Days until eligible: {caseData.ombudsman_status.days_remaining}</p>
      )}
    </div>
  );
}
```

---

## 🧪 Testing with cURL

```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","username":"testuser","password":"pass123"}'

# Login
curl -X POST http://localhost:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"test@gmail.com","password":"pass123"}'

# Get cases (replace TOKEN with actual token)
curl http://localhost:8000/api/cases/ \
  -H "Authorization: Token TOKEN"

# Update status
curl -X POST http://localhost:8000/api/cases/1/update_status/ \
  -H "Authorization: Token TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"new_status":"under_review","notes":"Email sent"}'
```

---

## 📊 Swagger UI

Visit `http://localhost:8000/api/docs/` to:
- View all endpoints
- Test endpoints directly
- See request/response schemas
- Download OpenAPI spec

---

## ✅ Next Steps

1. Run migrations: `python manage.py migrate`
2. Create superuser: `python manage.py createsuperuser`
3. Start server: `python manage.py runserver`
4. Integrate React frontend with API service
5. Handle authentication tokens in localStorage
6. Display case data and timelines in UI

---

**Last Updated**: December 30, 2025
