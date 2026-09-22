# STAT-GAP AI — Production & Demonstration Deployment Guide

## 1. Overview

STAT-GAP AI is architected as a modern, decoupled web application:
- **Frontend**: React 19 + TypeScript + Vite, served as static assets via Nginx or CDN.
- **Backend**: FastAPI (Python 3.10+) asynchronous API server.
- **Persistence**: PostgreSQL 15+ with `pgvector` extension (with SQLite fallback for local test environments).
- **Integration**: Pluggable adapter layer for iGOT Karmayogi civil service training records.

---

## 2. System Prerequisites

- **Python**: 3.10, 3.11, 3.12, 3.13, or 3.14
- **Node.js**: 18.x, 20.x, or 22.x (npm 9+)
- **Database**: PostgreSQL 15+ with `pgvector` (production) or SQLite 3.35+ (local prototype)
- **Memory**: Minimum 2 GB RAM (4 GB recommended for LLM embeddings and knowledge graph caching)

---

## 3. Quickstart (Demonstration / Evaluation Mode)

In demo mode, STAT-GAP AI operates with mock embeddings, mock LLM explanations, and deterministic Mock-iGOT adapters:

### Step 1: Clone and Configure Environment
```bash
git clone https://github.com/mospi/statgapai.git
cd statgapai

# Set minimal environment variables
export ENVIRONMENT="development"
export JWT_SECRET_KEY="production-quality-secure-key-at-least-32-characters-long"
export EMBEDDING_PROVIDER="mock"
export LLM_PROVIDER="mock"
export IGOT_MODE="mock"
export RATE_LIMIT_ENABLED="true"
```

### Step 2: Set Up Backend
```bash
python -m venv backend/.venv
source backend/.venv/bin/activate  # On Windows: backend\.venv\Scripts\activate
pip install -r backend/requirements.txt

# Run migrations and seed data
alembic -c backend/alembic.ini upgrade head
python backend/scripts/seed_assessment_bank.py

# Launch FastAPI server
uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Step 3: Set Up Frontend
```bash
npm install
npm run build   # Or npm run dev for live development
```

---

## 4. Database Setup (Docker Compose with pgvector)

STAT-GAP AI requires PostgreSQL 16 with the official `pgvector` extension enabled for semantic knowledge retrieval. Use `pgvector/pgvector:pg16` in `docker-compose.yml`:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: statgapai_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: statgapai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d statgapai"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Start the container and run database migrations:
```bash
docker compose up -d postgres
alembic -c backend/alembic.ini upgrade head
python backend/scripts/seed_data.py
python backend/scripts/seed_assessment_bank.py
```

---

## 5. Production Deployment (Docker Architecture)

### 4.1 Production Environment Configuration (`.env.production`)
```ini
ENVIRONMENT=production
JWT_SECRET_KEY=a-64-character-cryptographically-random-string-generated-via-openssl
DATABASE_URL=postgresql://statgap_user:StrongPassword@postgres:5432/statgap_db
GEMINI_API_KEY=your-production-google-gemini-api-key
EMBEDDING_PROVIDER=gemini
LLM_PROVIDER=gemini
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=120
IGOT_MODE=authorized
IGOT_API_BASE_URL=https://api.igotkarmayogi.gov.in
IGOT_CLIENT_ID=official-client-id
IGOT_CLIENT_SECRET=official-client-secret
```

### 4.2 Production Dockerfile (Backend)
```dockerfile
FROM python:3.11-slim AS backend
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && \
    rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ backend/
COPY alembic.ini .

EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### 4.3 Production Dockerfile (Frontend)
```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 5. Health, Readiness, and Observability Checks

The platform exposes two standard container orchestration endpoints:

- **Liveness Probe**: `GET /api/health`
  - Returns `{"status": "ok", "service": "stat-gap-ai-backend"}`
  - Indicates HTTP server process responsiveness.

- **Readiness Probe**: `GET /api/readiness`
  - Performs active database connectivity query (`SELECT 1`).
  - Returns `200 OK` with `{"status": "ready", "database": "connected"}` if the database pool is operational.
  - Returns `503 Service Unavailable` if database queries fail.

---

## 6. Zero-Downtime Database Migration Protocol

When deploying schema updates:
1. Verify pending SQL migration:
   ```bash
   alembic -c backend/alembic.ini upgrade head --sql
   ```
2. Apply migration against PostgreSQL:
   ```bash
   alembic -c backend/alembic.ini upgrade head
   ```
3. Restart application workers with rolling deployment.
