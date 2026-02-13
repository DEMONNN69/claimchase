# ClaimChase Deployment Guide

## 📋 Quick Start for Testing (10 minutes)

**What you'll deploy:**
1. ☁️ **PostgreSQL Database** → Render (Free)
2. 🐍 **Django Backend API** → Render/Railway (Free)
3. ⚛️ **React Frontend + Proxy Server** → Render/Railway (Free)
4. 📦 **Cloudinary** → Already external (no deployment needed)

**Cache:** Using Django's default local memory cache (no Redis needed for testing)

**Result:** 
- Frontend URL: `https://claimchase-test.onrender.com` (PUBLIC)
- Backend URL: `https://claimchase-api-test.onrender.com` (HIDDEN)
- Database: Internal connection (secured)

**Total Cost: $0/month** (Free tier with limitations)

**→ Jump to:** [Step-by-Step Testing Deployment](#-testing-environment-free)

---

## 🏗️ Architecture Overview

### Development (Local)
```
┌─────────────────────────────────────────────────────────┐
│                   User Browser                          │
│                  localhost:8080                         │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend (Vite Dev Server)                              │
│  localhost:8080                                         │
│  ├─ Routes /proxy/documents/* → localhost:3001         │
│  └─ Serves React app                                    │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  Proxy Server (Node.js/Express)                          │
│  localhost:3001                                         │
│  └─ Fetches docs from backend, hides backend URL        │
└─────────────┬───────────────────────────────────────────┘
              │ (Server-to-Server)
              ↓
┌─────────────────────────────────────────────────────────┐
│  Backend (Django)                                        │
│  localhost:8000 (HIDDEN from browser)                   │
│  └─ Validates origin, checks tokens, fetches from cloud │
└─────────────┬───────────────────────────────────────────┘
              │
              ↓
┌─────────────────────────────────────────────────────────┐
│  External Services                                       │
│  ├─ PostgreSQL (localhost:5432)                         │
│  └─ Cloudinary (cloud storage)                          │
└─────────────────────────────────────────────────────────┘
```

**Note:** Redis removed - using Django's local memory cache for development

### Production/Testing (Deployed)
```
┌─────────────────────────────────────────────────────────┐
│                   User Browser                          │
│              claimchase-test.onrender.com               │
└─────────────┬───────────────────────────────────────────┘
              │ HTTPS
              ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend Server (Single Deployment)                     │
│  claimchase-test.onrender.com                           │
│  ├─ Serves static React build (dist/)                   │
│  └─ Proxy endpoint: /proxy/documents/*                  │
│     (Node.js server.js handles both)                    │
└─────────────┬───────────────────────────────────────────┘
              │ Internal HTTPS (Server-to-Server)
              ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Server (Separate Deployment)                    │
│  claimchase-api-test.onrender.com (HIDDEN)              │
│  └─ Django API + Origin validation                      │
└─────────────┬───────────────────────────────────────────┘
              │ Internal Network
              ↓
┌─────────────────────────────────────────────────────────┐
│  └─ PostgreSQL: claimchase-db-test (internal URL only)  │
└─────────────────────────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Cloudinary (External SaaS)                              │
│  └─ File storage (already configured)                   │
└─────────────────────────────────────────────────────────┘
```

**Cache:** Django's local memory cache (sufficient for single-server deployment)───────────────────────────────────────────────────────┘
```

**Key Security Points:**
- ✅ Backend URL NEVER exposed to browser
- ✅ Proxy runs on same server as frontend (single deployment)
- ✅ Origin validation blocks direct backend access
- ✅ Temporary tokens stored in local cache (15-minute expiry)deployment)
- ✅ Origin validation blocks direct backend access

---

## 🆓 Testing Environment (FREE)

### Deployment Option A: Render (All-in-One)
**3 services:**
1. **PostgreSQL Database** (Render - Free tier)
2. **Backend API** (Render - Free tier)
3. **Frontend + Proxy** (Render - Free tier) ← **Single deployment**

**Time Required:** ~15-20 minutes  
**Cost:** $0/month (with limitations)

### Deployment Option B: Vercel + Render (Recommended) ⭐
**3 services:**
1. **PostgreSQL Database** (Neon DB - Free tier) ← **You're using this**
2. **Backend API** (Render - Free tier) ← **You're using this**
3. **Frontend** (Vercel - Free tier) ← **You're using this**
4. **Proxy** (Vercel Serverless Function - Free tier) ← **Same deployment as frontend**

**Time Required:** ~10 minutes (you already have 1-3 deployed)  
**Cost:** $0/month (with better performance)

**Why Vercel + Render is better:**
- ✅ Faster frontend (Vercel's global CDN)
- ✅ Simpler proxy setup (Vercel serverless functions)
- ✅ Better cold start times
- ✅ More generous free tier limits

**Cache:** Django's built-in local memory cache (no separate service needed)

### Step-by-Step Deployment Guide

---

## 🚀 OPTION B: Vercel + Render Deployment (Recommended)

**Perfect for your current setup! You already have Backend on Render and Database on Neon.**

### Architecture Overview

```
Browser → Vercel (Frontend + Proxy Serverless Function) → Render (Backend) → Neon (Database)
          ↑                                                ↑
          PUBLIC URL                                      HIDDEN URL
```

**Security Flow:**
1. Browser loads React app from Vercel (e.g., `claimchase.vercel.app`)
2. When viewing documents, browser calls Vercel serverless function: `/api/proxy-documents?...`
3. Serverless function (running on Vercel) fetches from backend on Render
4. Backend URL NEVER exposed to browser ✅

---

### STEP 1: Setup Vercel Proxy (Document Security)

**1.1 Create Vercel Serverless Function**

The file already exists in your project: `frontend/api/proxy-documents.js`

This serverless function will:
- Run on Vercel's edge network (fast, globally distributed)
- Hide your Render backend URL from browsers
- Proxy document downloads securely

**1.2 Configure Vercel Environment Variables**

Go to your Vercel dashboard → Your Project → Settings → Environment Variables

Add:
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

Replace `your-backend.onrender.com` with your actual Render backend URL.

**1.3 Deploy to Vercel**

```bash
cd c:\Users\Harsh tiwari\Desktop\claimchase

# Commit the serverless function
git add frontend/api/proxy-documents.js
git commit -m "Add Vercel serverless proxy for document security"
git push origin main
```

Vercel will auto-deploy (takes ~1-2 minutes).

---

### STEP 2: Update Backend CORS Settings

Your backend on Render needs to allow requests from Vercel.

**2.1 Go to Render Dashboard**
- Navigate to your backend service
- Go to **Environment** tab

**2.2 Update Environment Variables**

Update or add these:
```env
# Frontend URL (your Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app

# CORS Origins (allow Vercel)
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app

# CSRF Trusted Origins
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://your-backend.onrender.com

# Allowed Hosts
ALLOWED_HOSTS=.onrender.com,.vercel.app

# Document Origin Validation (important for proxy security)
ALLOWED_DOCUMENT_ORIGINS=https://your-app.vercel.app
```

**2.3 Save and Redeploy**

Click **Save Changes**. Render will auto-redeploy (~2-3 minutes).

---

### STEP 3: Test Your Proxy Setup

**3.1 Test Frontend Access**

Visit your Vercel URL: `https://your-app.vercel.app`
- Should load React app ✅
- Login should work ✅

**3.2 Test Proxy Function (if using backend documents)**

If you're storing documents in Django backend (not Cloudinary), test the proxy:

```bash
# Get a temporary access token from your backend
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-backend.onrender.com/api/cases/1/documents/1/download-url/

# Response will include a token like: abc123xyz

# Try accessing via Vercel proxy
curl "https://your-app.vercel.app/api/proxy-documents?type=case&disputeId=1&docId=1&access=abc123xyz"
# Should return the document ✅

# Try accessing backend directly (should fail)
curl "https://your-backend.onrender.com/api/cases/1/documents/1/download/?access=abc123xyz"
# Should return 404 or 403 ✅ (backend blocks direct access)
```

**3.3 Test in Browser**

1. Login to your app
2. Create a case/dispute
3. Upload a document
4. Click to view document
5. **Check Network tab in browser:**
   - ✅ Should see: `your-app.vercel.app/api/proxy-documents?...`
   - ❌ Should NOT see: `your-backend.onrender.com`

---

### STEP 4: Optional - Custom Domain

**4.1 Add Custom Domain to Vercel**

Vercel Dashboard → Your Project → Settings → Domains
- Add domain: `claimchase.com` and `www.claimchase.com`
- Vercel provides DNS instructions
- SSL certificate auto-provisioned

**4.2 Update Backend CORS**

After adding custom domain, update backend env vars:
```env
FRONTEND_URL=https://claimchase.com
CORS_ALLOWED_ORIGINS=https://claimchase.com,https://www.claimchase.com
CSRF_TRUSTED_ORIGINS=https://claimchase.com,https://www.claimchase.com
ALLOWED_DOCUMENT_ORIGINS=https://claimchase.com,https://www.claimchase.com
```

---

### Configuration Summary

**Vercel (Frontend + Proxy):**
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
NODE_ENV=production
```

**Render (Backend):**
```env
DATABASE_URL=postgresql://... (from Neon)
FRONTEND_URL=https://your-app.vercel.app
CORS_ALLOWED_ORIGINS=https://your-app.vercel.app
CSRF_TRUSTED_ORIGINS=https://your-app.vercel.app,https://your-backend.onrender.com
ALLOWED_HOSTS=.onrender.com,.vercel.app
ALLOWED_DOCUMENT_ORIGINS=https://your-app.vercel.app
SECRET_KEY=your-secret-key-here
DEBUG=False
DJANGO_SETTINGS_MODULE=claimchase.settings.prod

# Cloudinary (already configured)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

**Neon DB (Database):**
- No configuration needed - already connected via DATABASE_URL

---

### 🎉 Done! Your Deployment is Complete

**What you have now:**
- ✅ **Frontend:** Vercel (fast global CDN)
- ✅ **Proxy:** Vercel Serverless Function (secure document access)
- ✅ **Backend:** Render (hidden from browsers)
- ✅ **Database:** Neon PostgreSQL (free 0.5 GB)
- ✅ **Storage:** Cloudinary (documents/images)

**URLs to share:**
- ✅ Share: `https://your-app.vercel.app`
- ❌ NEVER share: Backend Render URL (it's hidden)

**Cost:** $0/month on free tiers

**Performance:**
- Frontend: Fast (Vercel CDN)
- Backend: Cold starts after 15 min inactivity (~30s)
- Database: Always active (Neon)

---

## 🚀 OPTION A: Render Only Deployment (Alternative)

#### **STEP 1: Setup Cloudinary (Skip if already done)**

1. Go to [cloudinary.com](https://cloudinary.com) and sign up (free)
2. Dashboard → Settings → Access Keys
3. Copy:
   - Cloud Name
   - API Key
   - API Secret
4. Keep these handy for backend environment variables

---

#### **STEP 2: Create Render Account**

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for auto-deploy)
3. Authorize Render to access your repository
4. You'll be on the Render Dashboard

---

#### **STEP 3: Deploy PostgreSQL Database**

1. **Render Dashboard** → **New** → **PostgreSQL**
2. Configure:
   - **Name:** `claimchase-db-test`
   - **Database:** `claimchase`
   - **User:** `claimchase_user` (auto-generated)
   - **Region:** Oregon (US West) or closest to you
   - **Plan:** **Free** ⭐
3. Click **Create Database**
4. Wait 2-3 minutes for provisioning
5. ✅ **COPY THIS:** 
   - Internal Database URL: `postgresql://claimchase_user:xxxxx@dpg-xxxxx-a/claimchase`
   - ⚠️ Use **Internal** URL, not External (faster, free)
6. Save this URL - you'll need it for backend deployment

**What this provides:**
- PostgreSQL 15 database
- 256 MB RAM, 1 GB storage
- Automatic backups
- Internal network (secure)

---

#### **STEP 5: Prepare Backend Code**

**On your local machine:**

```bash
# Navigate to backend directory
cd c:\Users\Harsh tiwari\Desktop\claimchase\backend

# Create requirements.txt (if not exists or update)
pip freeze > requirements.txt

# Ensure gunicorn is included
echo "" >> requirements.txt
echo "gunicorn==21.2.0" >> requirements.txt
```

**Create `backend/build.sh` for Render build:**

```bash
#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files
python manage.py collectstatic --no-input

# Run migrations
python manage.py migrate
```

Make it executable:
```bash
chmod +x build.sh
```

**Commit and push to GitHub:**
```bash
git add requirements.txt build.sh
git commit -m "Prepare backend for Render deployment"
git push origin main
```

---

#### **STEP 6: Deploy Backend API**

1. **Render Dashboard** → **New** → **Web Service**
2. **Connect Repository:**
   - Select your GitHub repository
   - Click **Connect**
3. **Configure Web Service:**
   - **Name:** `claimchase-api-test`
   - **Region:** Same as database (Oregon/US West)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** **Python 3**
   - **Build Command:** `./build.sh`
   - **Start Command:** `gunicorn claimchase.wsgi:application --bind 0.0.0.0:$PORT`
   - **Plan:** **Free** ⭐

4. **Environment Variables** (Click "Advanced" → "Add Environment Variable"):
   ```env
   DJANGO_SETTINGS_MODULE=claimchase.settings.production
   SECRET_KEY=django-insecure-CHANGE_THIS_TO_RANDOM_50_CHARS
   DEBUG=False
   ALLOWED_HOSTS=.onrender.com
   5
   DATABASE_URL=<paste-internal-postgres-url-from-step-3>
   REDIS_URL=<paste-internal-redis-url-from-step-4>
   
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-cloud-name>
   CLOUDINARY_API_KEY=<your-cloudinary-api-key>
   CLOUDINARY_API_SECRET=<your-cloudinary-api-secret>
   
   FRONTEND_URL=https://claimchase-test.onrender.com
   CORS_ALLOWED_ORIGINS=https://claimchase-test.onrender.com
   ```
   
   **Generate SECRET_KEY:**
   ```bash
   python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
   ```

5. Click **Create Web Service**
6. **First deploy takes 5-10 minutes** (installing dependencies, migrations)
7. Watch logs - should see:
   ```
   Installing dependencies...
   Collecting static files...
   Running migrations...
   ```
8. ✅ **COPY THIS:** Backend URL (e.g., `claimchase-api-test.onrender.com`)
9. **Test:** Visit `https://claimchase-api-test.onrender.com/admin/`
   - Should see Django admin login

**What this provides:**
- Django REST API running on Python 3.11
- Connected to PostgreSQL and Redis
- Auto-deploys on git push
- Free SSL certificate
- ⚠️ Spins down after 15 min inactivity (cold starts ~30s)

---

#### **STEP 7: Prepare Frontend Code**

**Create `frontend/server.js` (production server with proxy):**

```javascript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;
const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';

// CORS for all origins (
- Uses local memory cache for temporary tokens (15 min expiry)
- Auto-deploys on git push
- Free SSL certificate
- ⚠️ Spins down after 15 min inactivity (cold starts ~30s)

---

#### **STEP 6
// Document proxy endpoint - CRITICAL for security
app.get('/proxy/documents/:type/:disputeId/:docId', async (req, res) => {
  try {
    const { type, disputeId, docId } = req.params;
    const { access } = req.query;

    if (!access) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Validate type
    if (!['case', 'dispute'].includes(type)) {
      return res.status(400).json({ error: 'Invalid document type' });
    }

    // Construct backend URL
    const endpoint = type === 'case' ? 'cases' : 'disputes';
    const backendUrl = `${BACKEND_URL}/api/${endpoint}/${disputeId}/documents/${docId}/download/?access=${access}`;

    console.log(`Proxying document request: ${backendUrl}`);

    // Fetch from backend (server-to-server, backend URL hidden from client)
    const response = await fetch(backendUrl, {
      headers: {
        'Origin': `https://${req.hostname}`,
        'Referer': `https://${req.hostname}/`,
      }
    });

    if (!response.ok) {
      console.error(`Backend returned ${response.status}`);
      return res.status(response.status).json({ 
        error: response.status === 404 ? 'Document not found' : 'Access denied' 
      });
    }

    // Get headers from backend
    const contentType = response.headers.get('content-type') || 'application/pdf';
    const contentDisposition = response.headers.get('content-disposition') || 'inline';
    const contentLength = response.headers.get('content-length');

    // Set response headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', contentDisposition);
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    // Stream file content
    const buffer = await response.arrayBuffer();
    res.send(Buffer.from(buffer));

  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Failed to load document' });
  }
});

// Serve static files from dist
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Frontend + Proxy server running on port ${PORT}`);
  console.log(`🔒 Backend URL: ${BACKEND_URL} (hidden from clients)`);
});
```

**Update `frontend/package.json` scripts:**

```json
{
  "scripts": {
    "dev": "vite",
    "dev:proxy": "node proxy-server.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run dev:proxy\"",
    "build": "vite build",
    "start": "node server.js",
    "preview": "vite preview"
  }
}
```

**Ensure `package.json` has required dependencies:**

```json
{
  "dependencies": {
    // ... your existing dependencies
    "express": "^4.18.2",
    "cors": "^2.8.5"
  }
}
```

**Commit and push:**

```bash
cd frontend
git add server.js package.json
git commit -m "Add production server with proxy"
git push origin main
```

---

#### **STEP 8: Deploy Frontend + Proxy Server**

1. **Render Dashboard** → **New** → **Web Service**
2. **Connect Repository:**
   - Select your GitHub repository
   - Click **Connect**
3. **Configure Web Service:**
   - **Name:** `claimchase-test`
   - **Region:** Same as backend (Oregon/US West)
   - **Branch:** `main`
   - **Root Directory:** `frontend`
   - **Runtime:** **Node**
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start`
   - **Plan:** **Free** ⭐

4. **Environment Variables:**
   ```env
   NODE_ENV=production
   VITE_API_BASE_URL=https://claimchase-api-test.onrender.com
   ```

5. Click **Create Web Service**
6. **First d7ploy takes 3-5 minutes** (npm install, vite build)
7. Watch logs - should see:
   ```
   Installing dependencies...
   Building Vite app...
   🚀 Frontend + Proxy server running on port 10000
   ```
8. ✅ **YOUR APP IS LIVE:** `https://claimchase-test.onrender.com`

**What this provides:**
- React frontend (built with Vite)
- Proxy server for document downloads
- Both running in single Node.js process
- Free SSL certificate
- Auto-deploys on git push
- ⚠️ Spins down after 15 min inactivity

---

#### **STEP 8: Update Backend with Frontend URL**

1. Go to **Backend Web Service** (`claimchase-api-test`)
2. **Environment** tab → Edit variables
3. **Update these:**
   ```env
   FRONTEND_URL=https://claimchase-test.onrender.com
   CORS_ALLOWED_ORIGINS=https://claimchase-test.onrender.com
   ```
4. Click **Save Changes**
5. **Backend will auto-redeploy** (~2 minutes)

---

#### **STEP 9: Test Your Deployment**

1. **Visit Frontend:** `https://claimchase-test.onrender.com`
   - Should see login page
   - First load may be slow (cold start)

2. **Test Login:**
   - Create superuser via backend shell:
     ```bash
     # In Render backend dashboard → Shell tab
     python manage.py createsuperuser
     ```
   - Login with credentials

3. **Test Document Upload:**
   - Go to consumer disputes
   - Create a dispute
   - Upload a document (PDF or image)
   - Should upload to Cloudinary

4. **Test Document Viewing (CRITICAL):**
   - Click on uploaded document
   - Should open in same tab
   - Check browser Network tab:
     - ✅ Should see: `claimchase-test.onrender.com/proxy/documents/...`
     - ❌ Should NOT see: `claimchase-api-test.onrender.com`
   - PDF should load successfully

5. **Test Backend is Hidden:**
   - Try accessing: `https://claimchase-api-test.onrender.com/api/disputes/1/documents/1/download/?access=fake-token`
   - ✅ Should get: 404 "Direct access not allowed"

---

### 🎉 Success! Your Test Deployment is Complete

**You now have:**
- ✅ Frontend: `https://claimchase-test.onrender.com` (PUBLIC)
- ✅ Backend: `https://claimchase-api-test.onrender.com` (HIDDEN)
- ✅ Database: PostgreSQL (internal network)
- ✅ Cache: Django local memory cache (built-in)
- ✅ Storage: Cloudinary (external)
- ✅ Security: Backend URL hidden, origin validation, temporary tokens

**Free Tier Limitations:**
- ⚠️ Services sleep after 15 min inactivity (30s cold start)
- ⚠️ 750 hours/month runtime
- ⚠️ PostgreSQL: 256 MB RAM, 1 GB storage
- ⚠️ Local cache clears on restart (tokens expire)
- ⚠️ Bandwidth limits apply

**Deployment URLs to Share:**
- Share: `https://claimchase-test.onrender.com`  
- **DO NOT** share: Backend URL (it's hidden anyway)

------

### Alternative: Railway (If Render doesn't work)

**Similar to Render but with $5/month credit:**

1. Sign up at [railway.app](https://railway.app)
2. Create PostgreSQL from template
3. Deploy backend: Connect GitHub → Select backend folder
4. Deploy frontend: Connect GitHub → Select frontend folder
5. Configure environment variables (same as above, no Redis needed)

**Free tier:** $5 credit/month, 500 hours runtime

---

### Alternative: Vercel (Frontend) + Render (Backend)

**Vercel for frontend (better performance):**

1. Sign up at [vercel.com](https://vercel.com)
2. Import GitHub repository
3. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add `vercel.json`:
   ```json
   {
     "rewrites": [
       {
         "source": "/proxy/documents/:type/:disputeId/:docId",
         "destination": "/api/proxy"
       }
     ]
   }
   ```
5. Create `frontend/api/proxy.js` (Vercel serverless function):
   ```javascript
   export default async function handler(req, res) {
     const { type, disputeId, docId } = req.query;
     const { access } = req.query;
     const backend = process.env.VITE_API_BASE_URL;
     const endpoint = type === 'case' ? 'cases' : 'disputes';
     const url = `${backend}/api/${endpoint}/${disputeId}/documents/${docId}/download/?access=${access}`;
     
     const response = await fetch(url, {
       headers: {
         'Origin': req.headers.origin,
         'Referer': req.headers.referer
       }
     });
     
     const buffer = await response.arrayBuffer();
     res.setHeader('Content-Type', response.headers.get('content-type'));
     res.send(Buffer.from(buffer));
   }
   ```

**Backend still on Render** (steps 1-6 above)

---

## 🚀 Production Environment (Paid/Commercial)

### Option 1: DigitalOcean App Platform (Recommended)

#### **Cost Estimate:**
- **Backend:** $12/month (Basic)
- **Database:** $15/month (Basic PostgreSQL)
- **Redis:** $15/month (Basic)
- **Frontend:** $5/month (Static Site)
- **Total:** ~$47/month

#### **Deployment Steps:**

1. **Create DigitalOcean Account**
   - Sign up at [digitalocean.com](https://digitalocean.com)
   - Add payment method

2. **Create Managed PostgreSQL**
   - Databases → Create → PostgreSQL
   - **Plan:** Basic ($15/month)
   - **Region:** Choose closest to users
   - Copy connection details

3. **Create Managed Redis**
   - Databases → Create → Redis
   - **Plan:** Basic ($15/month)
   - Copy connection URL

4. **Create App for Backend**
   - Apps → Create App → GitHub
   - Select repository → `backend` folder
   - **Type:** Web Service
   - **Plan:** Basic ($12/month)
   - **Build Command:**
     ```bash
     pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate
     ```
   - **Run Command:**
     ```bash
     gunicorn claimchase.wsgi --workers 2 --bind 0.0.0.0:8080
     ```

5. **Configure Backend Environment**
   ```env
   DJANGO_SETTINGS_MODULE=claimchase.settings.production
   SECRET_KEY=<generate-strong-key>
   DEBUG=False
   ALLOWED_HOSTS=claimchase-api-xyz123.ondigitalocean.app
   
   DATABASE_URL=${db.DATABASE_URL}
   REDIS_URL=${redis.DATABASE_URL}
   
   CLOUDINARY_CLOUD_NAME=<your-cloud>
   CLOUDINARY_API_KEY=<your-key>
   CLOUDINARY_API_SECRET=<your-secret>
   
   FRONTEND_URL=https://claimchase.com
   CORS_ALLOWED_ORIGINS=https://claimchase.com,https://www.claimchase.com
   ```

6. **Add Custom Domain for Backend**
   - Settings → Domains → Add Domain
   - Domain: `api.claimchase.com`
   - Add CNAME record in your DNS:
     ```
     CNAME  api  claimchase-api-xyz123.ondigitalocean.app
     ```
   - DigitalOcean auto-provisions SSL certificate

7. **Create App for Frontend**
   - Apps → Create App → GitHub
   - Select repository → `frontend` folder
   - **Type:** Static Site
   - **Build Command:** `npm install && npm run build`
   - **Output Directory:** `dist`
   - **Plan:** $5/month

8. **Configure Frontend Environment**
   ```env
   NODE_ENV=production
   VITE_API_BASE_URL=https://api.claimchase.com
   ```

9. **Add Custom Domain for Frontend**
   - Settings → Domains → Add Domain
   - Domains: `claimchase.com` and `www.claimchase.com`
   - Add DNS records:
     ```
     A      @    <digitalocean-ip>
     CNAME  www  claimchase-xyz123.ondigitalocean.app
     ```

10. **Update Backend with Production Frontend URL**
    - Go to backend app → Environment Variables
    - Update:
      ```env
      FRONTEND_URL=https://claimchase.com
      ALLOWED_HOSTS=api.claimchase.com
      ```
    - Redeploy backend

---

### Option 2: AWS (EC2 + RDS)

#### **Cost Estimate:**
- **EC2 t3.small:** $15/month (backend)
- **EC2 t3.micro:** $8/month (frontend + proxy)
- **RDS PostgreSQL:** $25/month
- **ElastiCache Redis:** $15/month
- **Load Balancer:** $18/month
- **Total:** ~$81/month

#### **Deployment Steps:**

1. **Setup VPC and Security Groups**
   - Create VPC with public/private subnets
   - Security group for backend (port 8000, only from frontend)
   - Security group for frontend (port 80, 443)

2. **Deploy RDS PostgreSQL**
   - RDS → Create Database → PostgreSQL
   - Instance: db.t3.micro
   - Storage: 20GB
   - Multi-AZ: No (for cost saving)

3. **Deploy ElastiCache Redis**
   - ElastiCache → Create → Redis
   - Node type: cache.t3.micro

4. **Deploy Backend on EC2**
   ```bash
   # SSH into EC2 instance
   sudo apt update
   sudo apt install python3-pip nginx postgresql-client redis-tools
   
   # Clone repo
   git clone <your-repo>
   cd claimchase/backend
   
   # Create virtual environment
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt gunicorn
   
   # Configure environment
   nano .env
   # Add all production settings
   
   # Run migrations
   python manage.py migrate
   python manage.py collectstatic
   
   # Setup systemd service
   sudo nano /etc/systemd/system/claimchase.service
   ```

   **systemd service file:**
   ```ini
   [Unit]
   Description=ClaimChase Django API
   After=network.target
   
   [Service]
   User=ubuntu
   Group=ubuntu
   WorkingDirectory=/home/ubuntu/claimchase/backend
   Environment="PATH=/home/ubuntu/claimchase/backend/venv/bin"
   ExecStart=/home/ubuntu/claimchase/backend/venv/bin/gunicorn \
             --workers 3 \
             --bind 0.0.0.0:8000 \
             claimchase.wsgi:application
   
   [Install]
   WantedBy=multi-user.target
   ```

   ```bash
   sudo systemctl enable claimchase
   sudo systemctl start claimchase
   ```

5. **Setup Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name api.claimchase.com;
       
       location / {
           proxy_pass http://localhost:8000;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

6. **Deploy Frontend + Proxy on EC2**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt install nodejs
   
   # Clone and build
   cd claimchase/frontend
   npm install
   npm run build
   
   # Setup PM2 for process management
   npm install -g pm2
   pm2 start server.js --name claimchase-frontend
   pm2 startup
   pm2 save
   ```

7. **Setup SSL with Let's Encrypt**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d claimchase.com -d www.claimchase.com -d api.claimchase.com
   ```

---

### Option 3: Docker + Kubernetes (Advanced)

For high-traffic production environments:

1. **Containerize Applications**
   ```dockerfile
   # backend/Dockerfile
   FROM python:3.11-slim
   WORKDIR /app
   COPY requirements.txt .
   RUN pip install -r requirements.txt
   COPY . .
   CMD ["gunicorn", "claimchase.wsgi", "--bind", "0.0.0.0:8000"]
   ```

   ```dockerfile
   # frontend/Dockerfile
   FROM node:20-alpine AS build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build
   
   FROM node:20-alpine
   WORKDIR /app
   COPY --from=build /app/dist ./dist
   COPY server.js .
   CMD ["node", "server.js"]
   ```

2. **Deploy to Kubernetes (GKE, EKS, or AKS)**
3. **Setup Ingress Controller**
4. **Configure Auto-scaling**

---

## 🔒 Security Checklist

### Testing Environment
- [ ] Environment variables set correctly
- [ ] DEBUG=False in production settings
- [ ] HTTPS enabled (Render provides free SSL)
- [ ] Cloudinary credentials secured
- [ ] Database not publicly accessible
- [ ] CORS configured properly

### Production Environment
- [ ] Strong SECRET_KEY (50+ random characters)
- [ ] All traffic over HTTPS
- [ ] Database in private subnet
- [ ] Redis password protected
- [ ] Rate limiting enabled
- [ ] ALLOWED_HOSTS restricted
- [ ] Security headers configured
- [ ] Regular backups enabled
- [ ] Monitoring/logging setup
- [ ] Firewall rules configured

---

## 📊 Performance Optimization

### Backend
- Use Gunicorn with 2-4 workers per CPU core
- Enable Redis caching for temporary tokens
- Database connection pooling
- Optimize Django queries (select_related, prefetch_related)

### Frontend
- Build optimization: `vite build`
- Enable gzip compression
- CDN for static assets (Cloudinary handles this)
- Lazy loading for routes

### Proxy Server
- Connection pooling for backend requests
- Response streaming (already implemented)
- Error handling and retries

---

## 🧪 Testing Deployment

### After Deployment Checklist

1. **Test Backend Health**
   ```bash
   curl https://api.claimchase.com/health/
   ```

2. **Test Authentication**
   - Login as user
   - Check JWT token generation
   - Verify permissions

3. **Test Document Upload**
   - Upload PDF to dispute/case
   - Verify Cloudinary storage

4. **Test Document Access (Critical)**
   ```bash
   # Get document list (should return proxy URLs)
   curl -H "Authorization: Bearer <token>" \
        https://claimchase.com/api/disputes/1/documents/
   
   # Should return URL like:
   # https://claimchase.com/proxy/documents/dispute/1/5?access=xyz123
   ```

5. **Test Proxy Download**
   - Click document link in browser
   - Verify PDF loads
   - Check Network tab: should only see claimchase.com, NOT api.claimchase.com

6. **Test Direct Backend Access (Should Fail)**
   ```bash
   # Try accessing backend directly - should get 404
   curl https://api.claimchase.com/api/disputes/1/documents/5/download/?access=xyz123
   # Response: 404 - Direct access not allowed
   ```

7. **Test Token Expiry**
   - Get document URL
   - Wait 6 minutes
   - Try accessing - should fail

8. **Test Token Single-Use**
   - Get document URL
   - Access once (success)
   - Try same URL again (should fail)

---

## 🔄 CI/CD Setup (Optional)

### GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST https://api.render.com/deploy/srv-xxx?key=${{ secrets.RENDER_DEPLOY_KEY }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          curl -X POST https://api.render.com/deploy/srv-yyy?key=${{ secrets.RENDER_DEPLOY_KEY }}
```

---

## 📈 Monitoring

### Free Tools
- **Sentry:** Error tracking (free tier)
- **Uptime Robot:** Uptime monitoring (free tier)
- **Google Analytics:** User analytics

### Production Tools
- **New Relic:** Application performance monitoring
- **Datadog:** Infrastructure monitoring
- **CloudWatch (AWS):** Logs and metrics

---

## 💡 Cost Comparison Summary

| Platform | Testing (Free) | Production |
|----------|---------------|------------|
| **Render** | Free (with limits) | $47/month |
| **Railway** | $5 credit/month | $50/month |
| **DigitalOcean** | N/A | $47/month |
| **AWS** | 12-month free tier | $81/month |
| **Heroku** | N/A | $57/month |

**Recommendation:**
- **Testing:** Render (easiest, truly free)
- **Production (Small):** DigitalOcean App Platform (best value)
- **Production (Scale):** AWS or GCP with Kubernetes

---

## 🆘 Troubleshooting

### "Direct access not allowed"
- Check ALLOWED_DOCUMENT_ORIGINS includes frontend URL
- Verify proxy server is setting Origin header

### "Invalid or expired access token"
- Check Redis is running
- Verify REDIS_URL environment variable
- Token expires after 5 minutes - request new URL

### "502 Bad Gateway"
- Backend service not running
- Check backend logs
- Verify DATABASE_URL connection

### Documents not loading
- Check FRONTEND_URL in backend matches actual frontend domain
- Verify proxy server is running alongside frontend
- Check browser console for errors

---

## 📝 Quick Deploy Commands

### Testing on Render
```bash
# 1. Create Render account
# 2. Connect GitHub repo
# 3. Create PostgreSQL + Redis + 2 Web Services (backend + frontend)
# 4. Configure environment variables
# Done! Your app is live.
```

### Production on DigitalOcean
```bash
# 1. Create account, add payment method
# 2. Create managed database + Redis
# 3. Create 2 apps (backend + frontend)
# 4. Add custom domains
# 5. Configure DNS
# Done! Professional production setup.
```

---

**Need help?** Check the main [DOCUMENT_SECURITY.md](DOCUMENT_SECURITY.md) for architecture details.
