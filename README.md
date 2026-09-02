# Advibe — AI Investor Discovery & Relationship Operating System

**Advibe** is an AI-powered Investor Intelligence & Outreach Operating System designed for high-growth founders raising capital. It merges intelligent investor discovery, thesis matching, relationship mapping, personalized message generation, and closed-loop CRM tracking into a unified, secure platform.

---

## 📚 Core Project Documentation

- **[Product Requirements Document (PRD.md)](file:///c:/Users/91807/OneDrive/Desktop/Advibe/PRD.md)**: Product vision, user personas, functional specifications (P0/P1/P2), and release roadmap.
- **[System Architecture (architecture.md)](file:///c:/Users/91807/OneDrive/Desktop/Advibe/architecture.md)**: High-level system architecture diagrams, layer-by-layer breakdown, database ERD, and end-to-end sequence diagrams.
- **[Engineering & Security Rules (rules.md)](file:///c:/Users/91807/OneDrive/Desktop/Advibe/rules.md)**: Non-negotiable anti-spam invariants, RLS tenant isolation, coding standards, and fit score formulas.
- **[Data Provenance & Audit Trail (DATA_SOURCES.md)](file:///c:/Users/91807/OneDrive/Desktop/Advibe/DATA_SOURCES.md)**: Sourced dataset methodology, verification status, and transparent email disclosures.
- **[OpenAPI 3.1.0 Contract (docs/openapi.yaml)](file:///c:/Users/91807/OneDrive/Desktop/Advibe/docs/openapi.yaml)**: Complete REST API specification.

---

## 🌟 Key Capabilities

1. **AI Context Engine**: Ingests pitch decks, websites, and founder narratives using Groq (Llama 3.3 70B) with OpenRouter fallback to construct structured raise profiles (stage, sector, check size, geography, thesis).
2. **Dual-Factor Match Engine**: Multi-factor rule prefiltering (Stage 30%, Sector 35%, Geo 20%, Check Size 15%) combined with LLM conviction scoring to rank high-conviction partners:
   $$\text{Fit Score} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Score})$$
3. **Decision Maker Mapping**: Resolves firm-level data down to specific partners, managing partners, and sector leads with verified emails and LinkedIn profiles.
4. **Human-in-the-Loop Safeguard**: Generates hyper-personalized, non-spammy first-touch outreach. **Strict Security Enforcement**: No message can be dispatched unless its status is explicitly set to `approved` by user action.
5. **Closed-Loop Feedback & Inbound Classifier**: Handles inbound webhook replies, classifies sentiment (`meeting_requested`, `interested`, `not_interested`, `wrong_person`), and updates the live relationship pipeline.
6. **State-of-the-Art Visual Aesthetics**: Single-viewport dark mode interface with liquid-metal glassmorphic pills, crisp typography (*Inter* & *Instrument Serif*), and an interactive **React Bits `WebThreads` WebGL2 shader background** responding to mouse movements.

---

## 📁 Repository Structure

```
Advibe/
├── frontend/                     # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── WebThreads.jsx    # React Bits WebGL2 glowing sine threads (ogl)
│   │   │   ├── WebThreads.css    # Canvas overlay styling
│   │   │   └── Modals.jsx        # AI Intake, Matches, Draft Review, CRM Pipeline
│   │   ├── App.jsx               # App shell: Header, Hero, Stats Footer, Modals
│   │   ├── index.css             # Design tokens, glassmorphism & responsive rules
│   │   └── main.jsx              # React 18 createRoot entrypoint
│   ├── index.html                # Vite HTML entrypoint with zero-white-flash styling
│   ├── vite.config.js            # Vite configuration (Port 3000)
│   ├── postcss.config.js         # Isolated PostCSS configuration
│   ├── package.json              # React 18, Vite, ogl, lucide-react dependencies
│   └── README.md                 # Frontend documentation
│
├── backend/                      # FastAPI Python Backend Service
│   ├── app/
│   │   ├── core/                 # Auth, Supabase clients, JSON logging, Config
│   │   │   ├── config.py         # Pydantic BaseSettings
│   │   │   ├── auth.py           # Supabase JWT & HMAC signature verification
│   │   │   ├── supabase.py       # User-authenticated & admin client factory
│   │   │   └── logging.py        # Structured JSON logger & telemetry
│   │   ├── models/               # Domain models & Pydantic v2 schemas
│   │   │   └── schemas.py        # Request/response validation schemas
│   │   ├── services/             # Core business logic
│   │   │   ├── ai_service.py     # Gemini LLM deck parser, scorer & drafter
│   │   │   ├── data_service.py   # Multi-factor rule prefiltering & ranking
│   │   │   └── outreach_service.py # Resend API dispatch & webhook handler
│   │   └── routes/               # API route controllers
│   │       ├── intake.py         # POST /api/v1/intake, GET /api/v1/companies/{id}
│   │       ├── match.py          # GET /api/v1/match/{company_id}
│   │       ├── outreach.py       # POST /api/v1/outreach/draft, /outreach/send
│   │       ├── webhook.py        # POST /api/v1/webhook/reply
│   │       └── campaigns.py      # GET /api/v1/campaigns/{company_id}
│   ├── main.py                   # FastAPI application entrypoint
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment variables template
│   └── README.md                 # Backend documentation
│
├── data/                         # Verified Seed Datasets (Public Provenance)
│   ├── investors_raw.csv         # 100 Tier-1 & Regional VC/Angel Firms with Source URLs
│   └── people_raw.csv            # 100 Verified Partners & Decision Makers
│
├── database/                     # Self-Hosted PostgreSQL 15 Data Layer
│   ├── migrations/               # Database migrations & RLS policies
│   │   └── 20260901000000_advibe_schema.sql
│   ├── scripts/                  # Seed generator scripts
│   │   └── build_seed.py         # CSV -> seed.sql compiler
│   ├── seed.sql                  # 100 sourced investor firms + 100 partners
│   └── README.md                 # Database setup & RLS guide
│
├── docs/                         # Specifications & Contracts
│   └── openapi.yaml              # Complete OpenAPI 3.1.0 specification
│
├── DATA_SOURCES.md               # Sourcing methodology, provenance & audit trail
├── PRD.md                        # Product Requirements Document
├── architecture.md               # System Architecture & Sequence Diagrams
├── rules.md                      # Engineering, Security & Anti-Spam Rules
└── README.md                     # Monorepo documentation
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite, Pure Vanilla CSS (Design Tokens, Glassmorphism), WebGL 2.0 GLSL Shaders (`ogl`), React Bits `WebThreads` |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, Uvicorn, PyJWT |
| **AI / LLM** | Google Gemini API (`gemini-1.5-flash`), Custom Structured Output Parsers |
| **Database** | Supabase Postgres 15+, Row Level Security (RLS), PostgreSQL Triggers, Enums, GIN Indexes |
| **Outreach & Telemetry** | Resend API, HMAC SHA256 Webhook Verification, Structured JSON Logging |
| **API Contract** | OpenAPI 3.1.0 Specification |

---

## 🚀 Step-by-Step Setup Guide

### 1. Database Configuration (Self-Hosted Docker Compose — 3 Commands)

To run the local PostgreSQL 15 database instance with automatic schema migration and seed data (20 VC funds + 24 partners):

```bash
# 1. Copy environment configuration
cp .env.example .env

# 2. Launch PostgreSQL 15 with Docker Compose (auto-runs migration + seed)
docker compose up -d

# 3. Verify tables and seed data
docker exec -it advibe-db psql -U advibe_user -d advibe -c "\dt"
```

*Alternatively, if deploying to Supabase, run [`database/migrations/20260901000000_advibe_schema.sql`](file:///c:/Users/91807/OneDrive/Desktop/Advibe/database/migrations/20260901000000_advibe_schema.sql) and [`database/seed.sql`](file:///c:/Users/91807/OneDrive/Desktop/Advibe/database/seed.sql) in the Supabase SQL Editor.*

### 2. Backend Configuration (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
```

Update your `.env` file with your credentials:
```env
DATABASE_URL="postgresql://advibe_user:advibe_password@localhost:5432/advibe"
GROQ_API_KEY="gsk_your_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"
OPENROUTER_API_KEY="sk-or-v1-your_openrouter_api_key_here"
OPENROUTER_MODEL="deepseek/deepseek-r1"
RESEND_API_KEY="re_your_resend_api_key"
```

Start the backend server:
```bash
uvicorn main:app --reload --port 8000
```
- **Interactive Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc UI**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

### 3. Frontend Web Application (React + Vite)
```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite development server
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/intake` | Parse pitch deck / website text via Gemini LLM & initialize raise profile |
| `GET` | `/api/v1/companies/{company_id}` | Retrieve company raise profile |
| `GET` | `/api/v1/match/{company_id}` | Generate ranked investor matches with fit scores & AI rationale |
| `POST` | `/api/v1/outreach/draft` | Generate tailored first-touch email drafts for selected partners |
| `POST` | `/api/v1/outreach/send` | Send approved message batches via Resend (strictly checks `status=approved`) |
| `POST` | `/api/v1/webhook/reply` | Inbound investor email reply webhook with HMAC verification & sentiment classification |
| `GET` | `/api/v1/campaigns/{company_id}` | Full CRM pipeline status, deliverability metrics, and conversation outcomes |

---

## 🎨 WebThreads Background Configuration

The live background utilizes the **React Bits `WebThreads`** WebGL2 shader with glowing sine threads that converge dynamically toward the user's cursor:

```jsx
<WebThreads
  color1="#000000"
  color2="#94a3b8"
  color3="#FFFFFF"
  speed={0.2}
  threadCount={6}
  frequency={5}
  spread={0.18}
  taper={1}
  position={0.5}
  fanMode="center"
  glow={0.016}
  falloff={0.67}
  thickness={1.1}
  brightness={0.6}
  opacity={1}
  mirror={false}
  shimmer={false}
  grain={true}
  grainIntensity={0}
  mouseInteraction={true}
  mouseStrength={0.29}
/>
```

---

## 🔒 Security & Privacy

- **Row Level Security (RLS)**: Enforced across all Supabase tables. Companies, drafts, and campaigns are isolated to the authenticated founder (`auth.uid()`).
- **Human-in-the-Loop Guarantee**: Messages cannot be sent autonomously or spam-blasted. Every message must transition from `draft` to `approved` before the dispatch engine executes.
- **Webhook HMAC Authentication**: Inbound reply payloads from email providers are cryptographically validated using SHA256 HMAC signatures.

---

## 📄 License
MIT License. Built for founders raising with conviction.
