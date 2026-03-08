# Docker Setup Guide for ClaimChase

This guide gives you every file you need to create and every command to run.  
**You create the files yourself** by copying the content below.  
No files are auto-generated — you stay in full control.

---

## Step 1 — Create the folder structure

Run these in PowerShell from the project root (`claimchase/`):

```powershell
New-Item -ItemType Directory -Force -Path docker/nginx
New-Item -ItemType Directory -Force -Path docker/backend
```

---

## Step 2 — Create `backend/Dockerfile`

Create the file at `backend/Dockerfile` with this content:

```dockerfile
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

COPY ../docker/backend/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/entrypoint.sh"]
```

---

## Step 3 — Create `docker/backend/entrypoint.sh`

Create the file at `docker/backend/entrypoint.sh` with this content:

```bash
#!/bin/bash
set -e

echo "Running migrations..."
python manage.py migrate --noinput

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn claimchase.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile -
```

---

## Step 4 — Create `frontend/Dockerfile`

Create the file at `frontend/Dockerfile` with this content:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ---- Proxy server stage ----
FROM node:20-slim AS proxy

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --prod --frozen-lockfile

COPY proxy-server.js ./

EXPOSE 3001
CMD ["node", "proxy-server.js"]
```

---

## Step 5 — Create `docker/nginx/default.conf`

Create the file at `docker/nginx/default.conf` with this content:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;

    # Serve React SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy document downloads to the Node proxy server
    location /api/proxy-documents {
        proxy_pass http://proxy:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
    }

    # Proxy all other /api/ calls to Django
    location /api/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Proxy /admin/ to Django
    location /admin/ {
        proxy_pass http://backend:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Serve Django static files
    location /static/ {
        proxy_pass http://backend:8000;
    }
}
```

---

## Step 6 — Create `docker/nginx/Dockerfile`

Create the file at `docker/nginx/Dockerfile` with this content:

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY frontend/ .
RUN pnpm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

---

## Step 7 — Create `docker-compose.yml`

Create the file at the project root (`claimchase/docker-compose.yml`) with this content:

```yaml
version: '3.9'

services:

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    restart: unless-stopped
    env_file:
      - .env.production
    expose:
      - "8000"
    volumes:
      - static_files:/app/staticfiles
    depends_on: []

  proxy:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: proxy
    restart: unless-stopped
    environment:
      - VITE_API_BASE_URL=http://backend:8000
      - ALLOWED_ORIGINS=${FRONTEND_URL}
      - PROXY_PUBLIC_ORIGIN=${FRONTEND_URL}
    expose:
      - "3001"
    depends_on:
      - backend

  web:
    build:
      context: .
      dockerfile: docker/nginx/Dockerfile
    restart: unless-stopped
    ports:
      - "80:80"
    depends_on:
      - backend
      - proxy

volumes:
  static_files:
```

---

## Step 8 — Create `.env.production`

Create the file at the project root (`claimchase/.env.production`) with this content.  
**Fill in all values before deploying.**

```env
# Django
DJANGO_SETTINGS_MODULE=claimchase.settings.prod
SECRET_KEY=your-very-long-random-secret-key-here
DEBUG=False
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Your public domain (no trailing slash)
FRONTEND_URL=https://yourdomain.com

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@your-neon-host/dbname?sslmode=require

# Cloudinary
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Google / Gmail OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/gmail/callback/
GMAIL_PUBSUB_TOPIC=projects/your-project/topics/your-topic

# CORS / CSRF
CORS_ALLOWED_ORIGINS=https://yourdomain.com
CSRF_TRUSTED_ORIGINS=https://yourdomain.com
```

> **Security:** Add `.env.production` to `.gitignore` immediately. Never commit it.

---

## Step 9 — Add `.env.production` to `.gitignore`

Run in PowerShell from the project root:

```powershell
Add-Content .gitignore "`n.env.production"
```

---

## Step 10 — Build and run

Run these from the project root (`claimchase/`):

```powershell
# First time — build all images
docker compose build

# Start all containers
docker compose up -d

# Watch logs (Ctrl+C to stop watching, containers keep running)
docker compose logs -f

# Check all containers are up
docker compose ps
```

---

## Step 11 — On the VPS (after SSH in)

```bash
# Install Docker (Ubuntu/Debian)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Clone your repo
git clone https://github.com/yourusername/claimchase.git
cd claimchase

# Copy your .env.production to the VPS (run this on your LOCAL machine)
# scp .env.production user@your-vps-ip:/home/user/claimchase/.env.production

# Build and start
docker compose build
docker compose up -d
```

---

## Useful commands after deployment

```powershell
# Run Django management commands inside the container
docker compose exec backend python manage.py createsuperuser
docker compose exec backend python manage.py migrate

# Rebuild after code changes
docker compose build backend
docker compose up -d backend

# Stop everything
docker compose down

# Stop and remove volumes (DESTRUCTIVE - only if needed)
docker compose down -v
```

---

## File structure after completing all steps

```
claimchase/
├── docker-compose.yml          ← Step 7
├── .env.production             ← Step 8
├── backend/
│   └── Dockerfile              ← Step 2
├── frontend/
│   └── Dockerfile              ← Step 4
└── docker/
    ├── backend/
    │   └── entrypoint.sh       ← Step 3
    └── nginx/
        ├── Dockerfile          ← Step 6
        └── default.conf        ← Step 5
```
