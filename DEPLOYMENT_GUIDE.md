# ClaimChase Deployment Guide

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      User Browser                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Frontend Domain: claimchase.com                        │
│  ├─ Vite React App (Port 5173)                          │
│  └─ Proxy Server (Port 3001) ← User sees this URL only  │
└────────────────────────┬────────────────────────────────┘
                         │ (Internal Server-to-Server)
                         ↓
┌─────────────────────────────────────────────────────────┐
│  Backend Domain: api.claimchase.com (HIDDEN)            │
│  └─ Django REST API (Port 8000)                         │
└────────────────────────┬────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────┐
│  External Services                                       │
│  ├─ PostgreSQL Database                                 │
│  ├─ Redis Cache (for temporary tokens)                  │
│  └─ Cloudinary (file storage)                           │
└─────────────────────────────────────────────────────────┘
```

**Key Points:**
- Frontend and Backend can be on same or separate servers
- Users NEVER see backend URL (hidden by proxy)
- Proxy server runs alongside frontend
- Backend validates requests from proxy only

---

## 🆓 Testing Environment (FREE)

### Option 1: Render (Recommended - Easiest)

#### **Step 1: Backend Deployment (Django + PostgreSQL)**

1. **Create account** at [render.com](https://render.com)

2. **Create PostgreSQL Database** (Free tier)
   - Dashboard → New → PostgreSQL
   - Name: `claimchase-db-test`
   - Plan: Free
   - Copy `Internal Database URL` (starts with `postgresql://`)

3. **Create Redis Instance** (Free tier)
   - Dashboard → New → Redis
   - Name: `claimchase-cache-test`
   - Plan: Free
   - Copy `Internal Redis URL`

4. **Prepare Backend for Deployment**
   ```bash
   cd backend
   
   # Create requirements.txt if not exists
   pip freeze > requirements.txt
   
   # Create Procfile
   echo "web: gunicorn claimchase.wsgi --bind 0.0.0.0:$PORT" > Procfile
   
   # Create runtime.txt
   echo "python-3.11.0" > runtime.txt
   ```

5. **Create Web Service for Backend**
   - Dashboard → New → Web Service
   - Connect your GitHub repo
   - Settings:
     - **Name:** `claimchase-api-test`
     - **Root Directory:** `backend`
     - **Build Command:** `pip install -r requirements.txt && python manage.py collectstatic --noinput && python manage.py migrate`
     - **Start Command:** `gunicorn claimchase.wsgi --bind 0.0.0.0:$PORT`
     - **Plan:** Free

6. **Configure Environment Variables** (in Render dashboard)
   ```env
   DJANGO_SETTINGS_MODULE=claimchase.settings.production
   SECRET_KEY=<generate-random-50-char-string>
   DEBUG=False
   ALLOWED_HOSTS=claimchase-api-test.onrender.com
   
   DATABASE_URL=<internal-postgres-url-from-step-2>
   REDIS_URL=<internal-redis-url-from-step-3>
   
   CLOUDINARY_CLOUD_NAME=<your-cloudinary-name>
   CLOUDINARY_API_KEY=<your-api-key>
   CLOUDINARY_API_SECRET=<your-api-secret>
   
   FRONTEND_URL=https://claimchase-test.onrender.com
   CORS_ALLOWED_ORIGINS=https://claimchase-test.onrender.com
   ```

7. **Deploy** - Render will auto-deploy
   - Backend URL: `https://claimchase-api-test.onrender.com`
   - ⚠️ **Keep this URL private** (don't share publicly)

#### **Step 2: Frontend Deployment (Vite + Proxy)**

1. **Prepare Frontend**
   ```bash
   cd frontend
   
   # Update package.json - add build script for proxy
   ```

2. **Add to package.json scripts:**
   ```json
   {
     "scripts": {
       "build": "vite build",
       "start": "node server.js"
     }
   }
   ```

3. **Create production server** at `frontend/server.js`:
   ```javascript
   import express from 'express';
   import cors from 'cors';
   import { fileURLToPath } from 'url';
   import { dirname, join } from 'path';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = dirname(__filename);
   
   const app = express();
   const PORT = process.env.PORT || 3000;
   const BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:8000';
   
   app.use(cors());
   
   // Proxy endpoint
   app.get('/proxy/documents/:type/:disputeId/:docId', async (req, res) => {
     try {
       const { type, disputeId, docId } = req.params;
       const { access } = req.query;
       
       const endpoint = type === 'dispute' ? 'disputes' : 'cases';
       const backendUrl = `${BACKEND_URL}/api/${endpoint}/${disputeId}/documents/${docId}/download/?access=${access}`;
       
       const response = await fetch(backendUrl, {
         headers: {
           'Origin': req.headers.origin || '',
           'Referer': req.headers.referer || ''
         }
       });
       
       if (!response.ok) {
         return res.status(response.status).send('File not found');
       }
       
       const contentType = response.headers.get('content-type');
       res.setHeader('Content-Type', contentType);
       
       const buffer = await response.arrayBuffer();
       res.send(Buffer.from(buffer));
     } catch (error) {
       console.error('Proxy error:', error);
       res.status(500).send('Error fetching document');
     }
   });
   
   // Serve static files
   app.use(express.static(join(__dirname, 'dist')));
   
   // SPA fallback
   app.get('*', (req, res) => {
     res.sendFile(join(__dirname, 'dist', 'index.html'));
   });
   
   app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```

4. **Create Web Service for Frontend**
   - Dashboard → New → Static Site
   - Settings:
     - **Name:** `claimchase-test`
     - **Root Directory:** `frontend`
     - **Build Command:** `npm install && npm run build`
     - **Start Command:** `node server.js`
     - **Plan:** Free

5. **Configure Environment Variables**
   ```env
   NODE_ENV=production
   VITE_API_BASE_URL=https://claimchase-api-test.onrender.com
   ```

6. **Deploy** - Frontend URL: `https://claimchase-test.onrender.com`

#### **Step 3: Update Backend with Frontend URL**

Go back to backend service → Environment Variables:
```env
FRONTEND_URL=https://claimchase-test.onrender.com
CORS_ALLOWED_ORIGINS=https://claimchase-test.onrender.com
ALLOWED_DOCUMENT_ORIGINS=https://claimchase-test.onrender.com
```

**Redeploy backend** to apply changes.

---

### Option 2: Railway (Alternative Free Option)

Similar steps to Render:
1. Sign up at [railway.app](https://railway.app)
2. Deploy PostgreSQL + Redis from templates
3. Deploy backend as Web Service
4. Deploy frontend as Static Site
5. Configure environment variables

**Free tier limits:**
- $5/month credit
- Sleep after inactivity
- 500 hours/month

---

### Option 3: Vercel (Frontend) + Render (Backend)

**Frontend on Vercel (Free):**
1. Sign up at [vercel.com](https://vercel.com)
2. Connect GitHub repo
3. Configure:
   - **Framework:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. Add `vercel.json` for proxy:
   ```json
   {
     "rewrites": [
       {
         "source": "/proxy/documents/:type/:disputeId/:docId",
         "destination": "/api/proxy-document?type=:type&disputeId=:disputeId&docId=:docId"
       }
     ]
   }
   ```
5. Create `frontend/api/proxy-document.js` (Vercel serverless function)

**Backend on Render:** Same as Option 1 above

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
