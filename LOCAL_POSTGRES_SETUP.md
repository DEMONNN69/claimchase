# Local PostgreSQL Setup on VPS

Sets up a PostgreSQL container running alongside your app on the same VPS,
so you don't need an external database like Neon.

---

## Step 1 — Add PostgreSQL to docker-compose.yaml

Open `docker-compose.yaml` and add the `db` service and a volume.
Replace the entire file contents with this:

```yaml
services:

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: claimchase
      POSTGRES_USER: claimchase
      POSTGRES_PASSWORD: your-strong-db-password-here
    volumes:
      - postgres_data:/var/lib/postgresql/data
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U claimchase"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    restart: unless-stopped
    env_file:
      - .env.production
    expose:
      - "8000"
    volumes:
      - static_files:/app/staticfiles
    depends_on:
      db:
        condition: service_healthy

  proxy:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      target: proxy
    restart: unless-stopped
    env_file:
      - .env.production
    environment:
      - VITE_API_BASE_URL=http://backend:8000
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
  postgres_data:
  static_files:
```

> Choose a strong password and keep it — you'll need it in the next step.

---

## Step 2 — Update .env.production DATABASE_URL

On the VPS, edit `.env.production`:

```bash
nano /root/claimchase/.env.production
```

Change the `DATABASE_URL` line to point to the local `db` container.
Use `sslmode=disable` because this is an internal Docker network connection:

```env
DATABASE_URL=postgresql://claimchase:your-strong-db-password-here@db:5432/claimchase?sslmode=disable
```

The hostname `db` is the Docker Compose service name — containers on the same
Compose network resolve each other by service name automatically.

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 3 — Fix ssl_require in prod.py

The production settings have `ssl_require=True` which will reject the local
connection. Update `backend/claimchase/settings/prod.py` — change the
`DATABASES` block to read the `ssl_require` flag from the URL instead of
hardcoding it:

```python
DATABASES = {
    'default': dj_database_url.config(
        default=config('DATABASE_URL', default=''),
        conn_max_age=600,
        ssl_require=False
    )
}
```

`sslmode=disable` in the URL itself will correctly disable SSL.
For a Neon/external DB, use `sslmode=require` in the URL and keep `ssl_require=False` here.

---

## Step 4 — Commit and push from your local machine

```powershell
git add docker-compose.yaml backend/claimchase/settings/prod.py
git commit -m "Add local PostgreSQL service"
git push origin main
```

---

## Step 5 — Pull and start on the VPS

SSH into the VPS and run:

```bash
cd /root/claimchase

# Pull the updated compose file and prod.py
git pull origin main

# Build backend (prod.py changed) and start everything including db
docker compose build backend
docker compose up -d

# Check all 4 containers are running
docker compose ps
```

Expected output — all should show `running`:
```
NAME                    STATUS
claimchase-db-1         running
claimchase-backend-1    running
claimchase-proxy-1      running
claimchase-web-1        running
```

---

## Step 6 — Verify the database connection

```bash
# Watch backend startup (migrations should succeed now)
docker compose logs backend

# Check if tables were created
docker compose exec db psql -U claimchase -c "\dt"
```

You should see Django's tables listed (auth_user, django_migrations, etc.).

---

## Step 7 — Create the Django superuser

```bash
docker compose exec backend python manage.py createsuperuser
```

---

## Useful database commands

```bash
# Connect to the database directly
docker compose exec db psql -U claimchase

# Backup the database to a file
docker compose exec db pg_dump -U claimchase claimchase > backup_$(date +%Y%m%d).sql

# Restore from a backup
docker compose exec -T db psql -U claimchase claimchase < backup_20260101.sql

# View database size
docker compose exec db psql -U claimchase -c "SELECT pg_size_pretty(pg_database_size('claimchase'));"
```

---

## Data persistence

PostgreSQL data is stored in a Docker named volume `postgres_data`.
- `docker compose down` → data is **preserved**
- `docker compose down -v` → data is **deleted** (destructive, avoid unless resetting)

To back up before any risky operation:

```bash
docker compose exec db pg_dump -U claimchase claimchase > backup_before_change.sql
```
