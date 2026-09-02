# 🚀 Advibe — How to Run

Complete setup guide to get Advibe running on your local machine.

---

## Prerequisites

Make sure you have the following installed:

| Tool | Version | Download |
|------|---------|----------|
| **Python** | 3.11+ | [python.org](https://www.python.org/downloads/) |
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |
| **Docker** *(optional)* | Latest | [docker.com](https://www.docker.com/) |

---

## 1. Clone the Repository

```bash
git clone https://github.com/your-username/advibe.git
cd advibe
```

---

## 2. Backend Setup (FastAPI + Python)

### 2.1 Create a Virtual Environment

```bash
cd backend
python -m venv venv
```

### 2.2 Activate the Virtual Environment

**Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```

**macOS / Linux:**
```bash
source venv/bin/activate
```

### 2.3 Install Dependencies

```bash
pip install -r requirements.txt
```

### 2.4 Configure Environment Variables

Create a `.env` file inside the `backend/` folder:

```bash
cp .env.example .env
```

Or create `backend/.env` manually with:

```env
# Advibe Environment Configuration
PROJECT_NAME="Advibe API"
VERSION="1.0.0"
ENVIRONMENT="development"

# Database (Docker PostgreSQL — optional, app works without it)
DATABASE_URL="postgresql://advibe_user:advibe_password@localhost:5432/advibe"

# Supabase (Optional — for cloud database & auth)
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_KEY="your-supabase-anon-public-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-admin-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret-min-32-chars-length"

# Groq LLM (Primary — free tier, ultra-fast inference)
# Get your key at: https://console.groq.com/keys
GROQ_API_KEY="your-groq-api-key-here"
GROQ_MODEL="llama-3.3-70b-versatile"

# OpenRouter LLM (Fallback — optional)
# Get your key at: https://openrouter.ai/keys
OPENROUTER_API_KEY="your-openrouter-key-here"
OPENROUTER_MODEL="deepseek/deepseek-r1"

# Resend Email API (Required for real email outreach)
# Get your key at: https://resend.com/api-keys
RESEND_API_KEY="your-resend-api-key-here"
RESEND_FROM_EMAIL="Your Name <outreach@yourdomain.com>"
RESEND_WEBHOOK_SECRET="whsec_your_webhook_secret"

# Security
CORS_ORIGINS=["*"]
INTAKE_RATE_LIMIT="10/minute"
SEND_RATE_LIMIT="30/minute"
```

> **Note:** The app works without Supabase, Docker, or OpenRouter. The only required key is **GROQ_API_KEY** for AI features. Without it, the app falls back to deterministic heuristic matching.

### 2.5 Start the Backend Server

```bash
uvicorn main:app --reload --port 8000
```

✅ Backend is now live at: **http://localhost:8000**
📄 API Docs (Swagger): **http://localhost:8000/docs**
📊 Metrics: **http://localhost:8000/metrics**

---

## 3. Frontend Setup (React + Vite)

Open a **new terminal** (keep the backend running):

```bash
cd frontend
npm install
npm run dev
```

✅ Frontend is now live at: **http://localhost:3000**

---

## 4. Database Setup (Optional)

The app works without a database — it loads investor data from CSV files in `data/`. But if you want full persistence with PostgreSQL:

### Option A: Docker (Recommended)

```bash
# From project root
docker compose up -d
```

This starts PostgreSQL 15, runs the migration schema, and seeds 100 VC funds + 100 partners automatically.

### Option B: Manual PostgreSQL

1. Install PostgreSQL 15+
2. Create a database called `advibe`
3. Run the migration:
   ```bash
   psql -U your_user -d advibe -f database/migrations/20260901000000_advibe_schema.sql
   ```
4. Seed the data:
   ```bash
   psql -U your_user -d advibe -f database/seed.sql
   ```
5. Update `DATABASE_URL` in `backend/.env`

---

## 5. Run Tests

```bash
cd backend
.\venv\Scripts\Activate.ps1    # Windows
# source venv/bin/activate     # macOS/Linux

python -m pytest -v
```

Expected output: **16 passed ✅**

---

## 6. Real Email Outreach Setup (Resend)

To send actual cold outreach emails:

### 6.1 Get a Resend API Key
1. Sign up at [resend.com](https://resend.com)
2. Go to **API Keys** → Create a new key
3. Add it to `backend/.env` as `RESEND_API_KEY`

### 6.2 Verify Your Sending Domain
1. In Resend dashboard → **Domains** → Add your domain
2. Add the DNS records (SPF, DKIM, DMARC) to your domain provider
3. Update `RESEND_FROM_EMAIL` in `.env` to use your verified domain

### 6.3 Test Mode (No Domain Required)
If you just want to test, use:
```env
RESEND_FROM_EMAIL="Advibe <onboarding@resend.dev>"
```
This sends emails only to your own Resend account email.

---

## 7. API Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/metrics` | Live operational metrics |
| `POST` | `/api/v1/intake` | Submit a company for analysis |
| `GET` | `/api/v1/companies/{id}` | Get company details |
| `GET` | `/api/v1/match/{id}` | Generate ranked investor matches |
| `POST` | `/api/v1/outreach/draft` | Generate AI outreach email drafts |
| `POST` | `/api/v1/outreach/send` | Send approved emails via Resend |
| `POST` | `/api/v1/webhook/reply` | Process inbound investor replies |
| `GET` | `/api/v1/campaigns/{id}` | View campaign pipeline & status |

---

## Project Structure

```
Advibe/
├── backend/                  # FastAPI Python backend
│   ├── app/
│   │   ├── core/             # Config, DB, auth, logging, metrics
│   │   ├── models/           # Pydantic schemas
│   │   ├── routes/           # API endpoints
│   │   └── services/         # AI, data, outreach services
│   ├── tests/                # Pytest test suite (16 tests)
│   ├── main.py               # FastAPI app entry point
│   ├── requirements.txt
│   └── .env                  # Environment variables (create this)
│
├── frontend/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.jsx           # Main application
│   │   ├── components/       # UI components & modals
│   │   ├── lib/              # Utilities
│   │   └── index.css         # Styling
│   └── package.json
│
├── data/                     # Seed datasets (CSV)
│   ├── investors_raw.csv     # 100 VC firms
│   └── people_raw.csv        # 100 decision makers
│
├── database/                 # PostgreSQL schema & seed
│   ├── migrations/           # SQL migration files
│   ├── scripts/              # Seed generator scripts
│   └── seed.sql              # Generated seed data
│
└── docker-compose.yml        # PostgreSQL container
```

---

## Troubleshooting

### ❌ `pytest` not recognized
Always run tests through the Python module runner inside the venv:
```bash
python -m pytest -v
```

### ❌ LLM calls failing
If you see "catching classes that do not inherit from BaseException", the Groq API key may be invalid or rate-limited. The app will automatically fall back to deterministic heuristic matching — everything still works.

### ❌ Database connection errors
This is expected if you haven't set up Docker/PostgreSQL. The app gracefully falls back to CSV data. No action needed.

### ❌ Resend emails not sending
- Make sure `RESEND_API_KEY` is set in `backend/.env`
- Verify your sending domain in the Resend dashboard
- For testing, use `onboarding@resend.dev` as the from address

---

## Quick Start (TL;DR)

```bash
# Terminal 1 — Backend
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
# Create .env with your GROQ_API_KEY
uvicorn main:app --reload --port 8000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev
```

Open **http://localhost:3000** and start raising 🚀
