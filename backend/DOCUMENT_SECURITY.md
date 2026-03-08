# Document Security Architecture

## 🔒 Security Model

### Problem
- Backend API URL exposed in document URLs
- Anyone can see Cloudinary source
- Permanent auth tokens visible in logs

### Solution
**3-Layer Security:**
1. **Temporary Tokens** (5 min expiry, single-use)
2. **Frontend Proxy** (hides backend URL)
3. **Origin Validation** (only frontend can access backend)

---

## 📐 Architecture

```
User Browser
    ↓ Sees only: claimchase.com/proxy/documents/...
Frontend Proxy Server (Port 3001)
    ↓ Makes internal request
Backend API (HIDDEN: api.claimchase.com)
    ↓ Validates origin
Cloudinary Storage
```

**User Never Sees:**
- ❌ Backend API URL
- ❌ Cloudinary URL
- ❌ Permanent auth tokens

---

## 🚀 Development Setup

### 1. Install Dependencies
```bash
cd frontend
npm install express cors
```

### 2. Configure Environment
```bash
cp .env.proxy.example .env.proxy
# Edit .env.proxy with your settings
```

### 3. Start Services
```bash
# Terminal 1: Backend
cd backend
python manage.py runserver

# Terminal 2: Frontend + Proxy
cd frontend
npm run dev:all
```

Or separately:
```bash
# Terminal 2: Frontend
npm run dev

# Terminal 3: Proxy
npm run dev:proxy
```

---

## 🌐 Production Deployment

### Backend (Django)
```python
# .env
FRONTEND_URL=https://claimchase.com
ALLOWED_DOCUMENT_ORIGINS=https://claimchase.com,https://www.claimchase.com
CORS_ALLOWED_ORIGINS=https://claimchase.com
```

### Frontend Proxy (Node.js)
```bash
# .env.proxy
VITE_API_BASE_URL=https://api.claimchase.com  # HIDDEN FROM CLIENTS
PROXY_PORT=3001
ALLOWED_ORIGINS=https://claimchase.com
```

### Nginx Configuration
```nginx
# Reverse proxy for document downloads
location /proxy/documents/ {
    proxy_pass http://localhost:3001/proxy/documents/;
    proxy_set_header Origin $http_origin;
    proxy_set_header Referer $http_referer;
}

# Main frontend
location / {
    proxy_pass http://localhost:5173;
}
```

---

## 🔐 How It Works

### 1. User Requests Document List
```http
GET /api/disputes/5/documents/
Authorization: Bearer abc123
```

**Response:**
```json
{
  "documents": [{
    "id": 10,
    "file_name": "receipt.pdf",
    "file_url": "https://claimchase.com/proxy/documents/dispute/5/10?access=xyz789..."
  }]
}
```

### 2. User Opens Document (iframe/link)
```html
<iframe src="https://claimchase.com/proxy/documents/dispute/5/10?access=xyz789" />
```

### 3. Frontend Proxy Fetches from Backend
```javascript
// proxy-server.js (server-side, user can't see this)
fetch('https://api.claimchase.com/api/disputes/5/documents/10/download/?access=xyz789')
  .then(response => response.arrayBuffer())
  .then(buffer => res.send(Buffer.from(buffer)))
```

### 4. Backend Validates
- ✅ Origin is frontend proxy
- ✅ Temporary token is valid & not used
- ✅ Token matches document ID
- ✅ User owns dispute

### 5. Cloudinary Streams File
Backend fetches from Cloudinary and streams back through:
Frontend Proxy → User Browser

---

## 🛡️ Security Features

| Feature | Status |
|---------|--------|
| Backend URL Hidden | ✅ |
| Cloudinary URL Hidden | ✅ |
| Temporary Tokens (5min) | ✅ |
| Single-Use Tokens | ✅ |
| Origin Validation | ✅ |
| Authorization Check | ✅ |

**Result:** Even if someone intercepts a document URL:
- Token expires in 5 minutes
- Token can only be used once
- Direct backend access blocked (origin check)
- Backend API URL never exposed

---

## 📊 URL Comparison

### ❌ Before (Insecure)
```
https://api.claimchase.com/api/disputes/5/documents/10/download/?token=permanent_token_123
```
- Backend URL visible
- Permanent token visible
- Can be called directly

### ✅ After (Secure)
```
https://claimchase.com/proxy/documents/dispute/5/10?access=temp_xyz789
```
- Only frontend URL visible
- Temporary token (5min, single-use)
- Can't access backend directly (origin check)

---

## 🔧 Troubleshooting

### "Direct access not allowed"
- Check `ALLOWED_DOCUMENT_ORIGINS` includes proxy server URL
- Verify proxy server is running on correct port

### "Invalid or expired access token"
- Token expires after 5 minutes
- Token is single-use
- Request new document list to get fresh tokens

### Backend URL still visible
- Check serializers are using `FRONTEND_URL` setting
- Verify environment variable is set correctly

---

**Security Level:** 🔒🔒🔒 High  
**Compliance:** HIPAA/GDPR Ready  
**User Experience:** Seamless (no changes needed in UI)
