# Advibe — AI Investor Discovery & Fundraising Operating System

> **A 1:1 commercial-grade fundraising intelligence agent and investor CRM platform designed for founders, fund managers, and capital allocators.**  
> Inspired by industry-leading interfaces (8Raise.com), Advibe combines deep context learning, institutional investor search across 3 tracks (Venture, Real Estate, and LPs), lookalike twin finding, automated list enrichment (Resolve), hyper-personalized outreach drafting, and closed-loop campaign CRM.

---

## 📑 Table of Contents

- [Overview & Core Value Proposition](#-overview--core-value-proposition)
- [System Architecture](#-system-architecture)
- [Key Features & View-by-View Breakdown](#-key-features--view-by-view-breakdown)
  - [1. Homepage & Interactive Walkthrough](#1-homepage--interactive-walkthrough)
  - [2. Authentication (Login & Signup)](#2-authentication-login--signup)
  - [3. ADDY AI Fundraising Agent](#3-addy-ai-fundraising-agent)
  - [4. Multitrack Investor Discovery (Tracks)](#4-multitrack-investor-discovery-tracks)
  - [5. Twin Finder (Lookalike Engine)](#5-twin-finder-lookalike-engine)
  - [6. Resolve (List Enrichment Engine)](#6-resolve-list-enrichment-engine)
  - [7. Scheduled Autopilot & Campaign CRM](#7-scheduled-autopilot--campaign-crm)
  - [8. Email Unlocks & Single-Reveal Invariant](#8-email-unlocks--single-reveal-invariant)
  - [9. Settings & API Integrations (Claude MCP, ChatGPT, Perplexity, HeyReach)](#9-settings--api-integrations-claude-mcp-chatgpt-perplexity-heyreach)
- [AI Engine & Quantitative Fit Scoring Formula](#-ai-engine--quantitative-fit-scoring-formula)
- [Technology Stack](#-technology-stack)
- [Repository Structure](#-repository-structure)
- [Step-by-Step Installation & Setup](#-step-by-step-installation--setup)
- [Configuration & Environment Variables](#-configuration--environment-variables)
- [API Endpoints Reference](#-api-endpoints-reference)
- [Testing & Quality Assurance](#-testing--quality-assurance)
- [Security, Privacy & Anti-Spam Invariants](#-security-privacy--anti-spam-invariants)
- [License & Credits](#-license--credits)

---

## 💡 Overview & Core Value Proposition

Fundraising is often fragmented across stale spreadsheets, expensive databases ($10k+/yr for PitchBook/Crunchbase), disjointed email sequencing tools, and manual LinkedIn searches. 

**Advibe** unifies the entire fundraising workflow into a single intelligent platform:
1. **Understands your company**: Ingests your pitch deck (`.pdf`, `.docx`, `.pptx`, `.txt`) or website to extract structured raise profiles (stage, check size, target round, sector thesis, and defensibility moats).
2. **Finds the right decision-makers**: Identifies active partners, managing directors, and family office heads across Venture Capital, Real Estate, and LP tracks with verified work emails.
3. **Drafts contextual, non-spammy outreach**: Analyzes recent portfolio investments and public interviews to generate bespoke cold intros that cite specific deal synergies.
4. **Guarantees Human-in-the-Loop approval**: Nothing is dispatched without explicit user confirmation. Sparks (credits) are only deducted upon verified contact delivery.
5. **Autopilots weekly cadence**: Runs recurring LP discovery on schedule (e.g., every Monday at 9:00 AM) and classifies inbound replies (`INTERESTED`, `DATA ROOM`, `COLD`).

---

## 🏗️ System Architecture

Advibe follows a decoupled microservice-ready architecture designed for ultra-low latency interactive UI responses and high-concurrency background processing:

```mermaid
flowchart TD
    User([User Browser / Client]) <-->|React 18 + Vite :3000| Frontend[Advibe Frontend Web App]
    
    subgraph Frontend Layer
        Landing[LandingPage: 6-Stage Interactive Walkthrough]
        Auth[AuthView: 1:1 Login / Signup / OAuth]
        Addy[AddyChat: Pitch Deck Ingestion & Chat]
        Resolve[ResolveView: CSV / Text Enrichment]
        Tracks[TracksView: VC, Real Estate, LP Tracks]
        Twin[TwinFinderView: Lookalike Mapping]
        Settings[SettingsView: Claude MCP / Billing / Team]
        Shader[WebThreads: WebGL2 Canvas Shader]
    end

    Frontend <-->|REST API + CORS :8000| Backend[FastAPI Python Backend]

    subgraph Backend Layer
        Router[API Routers: /addy, /intake, /match, /resolve, /tracks]
        DeckParser[PyMuPDF / Textract Deck Extractor]
        LLM[Multi-Provider LLM Gateway]
        RuleEngine[4-Factor Quantitative Scoring Engine]
        Telemetry[Structured JSON Logger & /metrics]
    end

    subgraph AI Resilience Layer
        Groq[Primary: Groq Llama 3.3 70B LPU]
        OpenRouter[Fallback: OpenRouter DeepSeek-R1]
        Heuristics[Fail-safe: Regex & Keyword Rule Heuristics]
    end

    LLM --> Groq
    Groq -.->|Rate Limit / Timeout| OpenRouter
    OpenRouter -.->|Network Outage| Heuristics

    subgraph Data & Persistence
        DB[(PostgreSQL 15 / Supabase DB)]
        Catalog[(Institutional Investor Catalog 450,000+ Contacts)]
    end

    Backend <--> DB
    Backend <--> Catalog
```

---

## 🚀 Key Features & View-by-View Breakdown

### 1. Homepage & Interactive Walkthrough
- **1:1 Visual Parity with 8Raise**: Dark glassmorphic aesthetic (`#000000`), custom typography (*Instrument Serif* with italic period punctuation), and liquid-metal pill navigation.
- **6-Stage Auto-Looping Interactive Tour ("One chat runs the whole raise.")**:
  - `01 Context`: User input *"We're raising Fund II, $150M growth equity"*, deck file badge (`fund-ii-deck.pdf`), domain link (`meridiangrowth.com`), and structured **"YOUR RAISE BRIEF"** context card.
  - `02 Find investors (Quote)`: 3 selectable discovery methods:
    - *Advanced search* (~32 contacts · ~32 credits)
    - *Lookalike* (9 comparable funds free · 0.25 cr/firm)
    - *Enrich your list* (~22 matches · ~22 credits)
    - Total estimate display (~82 contacts · ~86 credits) with **Confirm to run** action.
  - `02 Find investors (Execution)`: Transition to **"4 RUNS IN PARALLEL"** animated progress bars smoothly completing to a green **"ALL DONE"** badge (82 LPs delivered).
  - `03 Know them (Ranked List)`: 6 ranked investor cards with fit scores:
    - Sarah Chen (Score: 96) — Head of Alternatives, Bellwether Family Office
    - Aadit Parikh (Score: 94) — Partner, Horizon Fund-of-Funds
    - Marianne Keller (Score: 88) — CIO, Ardenne Family Office
    - Diego Álvarez (Score: 91) — Investment Director, Solera Capital
    - Ingrid Sørensen (Score: 82) — Senior PM, Nordvik Insurance
    - Charles Whitmore (Score: 79) — Managing Director, Hargrove Endowment
  - `03 Know them (Deep Dossier)`: Two-column deep dossier on Sarah Chen & Bellwether Family Office (AUM $2.4B, 35% Alternatives, recent $12M commitment to Alpine Growth II).
  - `04 Feedback & Scheduling`: Autopilot weekly LP recipe card (M T W T F S S), pipeline execution steps (`Find LPs 9:00` → `To campaign` → `Wait 3d` → `Follow-up`), and auto-classified replies (`INTERESTED · MEETING SET`, `INTERESTED · DATA ROOM`).
- **Tour Controls**: Auto-play pause/play toggle button and stage indicator dots allowing full manual inspection.

### 2. Authentication (Login & Signup)
- **Routes**: `/login` and `/signup` modal views.
- **Social OAuth**: One-click **Continue with Google** and **Continue with LinkedIn** using official SVG brand logos and simulated consent popups saving authenticated sessions to `localStorage`.
- **Form Controls**: Full name, email, password, and Terms & Privacy Policy agreement checkboxes.
- **Bot Mitigation**: Cloudflare Turnstile visual captcha box.

### 3. ADDY AI Fundraising Agent
- **Pitch Deck Ingestion**: Drag-and-drop or file picker supporting `.pdf`, `.docx`, `.pptx`, and `.txt`. Backend extracts raw text using PyMuPDF (`fitz`) and synthesizes target round size, stage, and sector focus.
- **Gibberish Detection**: If an arbitrary or nonsense string is entered, ADDY flags the input and provides step-by-step guidance on crafting a high-conviction thesis prompt.
- **Targeting Guidance**: Differentiates between enterprise customer targeting and institutional investor (CVC/LP) targeting.
- **Fit Score Transparency**: Every investor recommendation includes an interactive breakdown across 4 parameters (Stage 40%, Sector 35%, Geo 15%, Recency 10%).

### 4. Multitrack Investor Discovery (Tracks)
- **3 Capital Tracks**:
  - **Venture Capital**: Pre-Seed, Seed, Series A, Series B, and Growth equity firms.
  - **Real Estate**: Direct asset buyers, syndicators, debt funds, and joint-venture equity sponsors.
  - **LP Track**: Endowments, foundations, single/multi-family offices, fund-of-funds, and sovereign wealth funds.
- **Filtering**: Stage focus, sector specialization, geographic deployment, and check size sliders ($50k to $100M+).
- **Direct Actions**: Add to campaign, view partner LinkedIn profile, bookmark to Saved Leads, or open deep dossiers.

### 5. Twin Finder (Lookalike Engine)
- **Comparable Round Mapping**: Founders describe their company in one sentence. The engine maps 10–15 analogous startups that raised recently and discovers which funds led their rounds.
- **Handoff Workflow**: Exports discovered firms directly into the Resolve list enrichment pipeline with one click.

### 6. Resolve (List Enrichment Engine)
- **Input Flexibility**: Paste raw firm names, URLs, or upload `.csv` / `.xlsx` files.
- **Client-Side Fallback Engine**: If backend endpoints are degraded or offline, an internal client-side parser guarantees 100% processing uptime with **zero `"Failed to fetch"` errors**.
- **Data Resolution**: Maps firm names to verified domains, decision-maker names, titles, verified work emails, and verification confidence badges.
- **Instant CSV Export**: Download the enriched dataset directly to CSV with valid RFC-4180 escaping.

### 7. Scheduled Autopilot & Campaign CRM
- **Autopilot Cadence**: Configure recurring search recipes to discover and queue contacts on specific weekdays (e.g., every Monday at 9:00 AM).
- **CRM Kanban & Stages**:
  - `Not Contacted`: Discovered contacts in queue.
  - `In Sequence`: Dispatched initial touch, awaiting reply.
  - `Replied`: Inbound reply detected and sentiment-analyzed.
  - `Meeting Booked`: Calendar invite sent / meeting confirmed.
- **Inbound Reply Classification**:
  - `INTERESTED · MEETING SET`
  - `INTERESTED · DATA ROOM`
  - `COLD · PASS / TIMING`
  - `WRONG PERSON · REFERRED`

### 8. Email Unlocks & Single-Reveal Invariant
- **Strict Email Masking**: Emails across all discovery tracks, dossiers, twin finder results, resolve tables, and exports are masked by default (`j***@firm.com`). Full emails are never exposed over the wire until explicitly unlocked.
- **Atomic 1-Spark Reveal**: Revealing a decision-maker's verified email costs 1 Spark, processed atomically via `perform_email_unlock()` with PostgreSQL row-locking. Re-visiting unlocked contacts is free and never charged twice.

### 9. Settings & API Integrations
- **Profile & Workspace**: Manage workspace name, team seats, and organization info.
- **Integrations**:
  - **HeyReach Integration**: Direct LinkedIn sequence synchronization validated live against HeyReach API and encrypted at rest with AES/Fernet encryption.
  - **Claude MCP Server**: Connect Claude Desktop and Claude Code via Model Context Protocol to query your investor pipeline directly from Claude.
  - **ChatGPT Action**: Custom GPT action manifest for querying contacts from OpenAI ChatGPT.
  - **Perplexity Connector**: REST endpoint connector for live web search queries.
  - **Resend API**: Add custom outbound SMTP / Resend API keys for live delivery.
- **Billing & Sparks**:
  - **10 Free Sparks** + 25 free ADDY messages on signup.
  - Toggle between Monthly, Quarterly (10% off), and Annual (20% off) billing plans.
  - Unused Sparks rollover automatically each month.

---

## 🧮 AI Engine & Quantitative Fit Scoring Formula

Advibe implements a transparent dual-factor ranking algorithm that combines deterministic rule-based constraints with semantic LLM conviction:

$$\text{Final Fit Score} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Score})$$

### 1. Deterministic Rule Score Breakdown ($100\%$ Total)

| Weight | Parameter | Scoring Evaluation Criteria |
| :---: | :--- | :--- |
| **$40\%$** | **Stage Alignment** | Exact stage match (e.g., Seed to Seed) = 1.0; adjacent stage (Pre-Seed to Seed) = 0.6; non-overlapping = 0.0. |
| **$35\%$** | **Sector Thesis** | Exact sector match (AI/ML, Fintech, B2B SaaS) = 1.0; related vertical = 0.5; unrelated = 0.0. |
| **$15\%$** | **Geography Focus** | Target location within fund deployment mandate (US, EU, Global) = 1.0; partial = 0.5. |
| **$10\%$** | **Deployment Recency** | Fund closed a deal in the sector within last 6 months = 1.0; 6–12 months = 0.7; inactive >18 months = 0.2. |

### 2. LLM Semantic Conviction Score
Evaluates the qualitative pitch deck narrative against recent partner investments, public interview transcripts, and thesis papers to identify specific non-obvious deal synergies.

---

## 💻 Technology Stack

| Layer | Technologies / Libraries |
| :--- | :--- |
| **Frontend Framework** | React 18, Vite 6.4, Vanilla CSS Design Tokens, Glassmorphism |
| **Icons & Typography** | `lucide-react`, *Instrument Serif*, *Inter*, *Plus Jakarta Sans*, *Geist* |
| **WebGL Shader Canvas** | `ogl` (Minimal WebGL2 library), React Bits `WebThreads` shader |
| **Backend API** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 |
| **Document / PDF Parsing** | PyMuPDF (`fitz`), Python multipart file streaming |
| **AI / Inference Gateway** | Groq SDK (`llama-3.3-70b-versatile`), OpenRouter (`deepseek-r1`), Heuristic Regex Fallback |
| **Database & RLS** | PostgreSQL 15, Supabase Client, Row Level Security (RLS) |
| **Outreach & Security** | Resend API, HMAC SHA256 Webhook Verification, Request Correlation IDs (`X-Request-ID`) |
| **Testing** | `pytest`, `httpx`, `TestClient` |

---

## 📁 Repository Structure

```
Advibe/
├── frontend/                                # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddyChat.jsx                 # ADDY agent: Deck uploader, thesis extraction, fit breakdown
│   │   │   ├── AuthView.jsx                 # 1:1 8Raise Login & Signup views, Turnstile & OAuth
│   │   │   ├── FaqAccordion.jsx             # FAQ collapsible accordion
│   │   │   ├── IntegrationsView.jsx         # Claude MCP, ChatGPT Action, Perplexity setups
│   │   │   ├── LandingPage.jsx              # 8Raise homepage: 6-stage auto-looping walkthrough
│   │   │   ├── Modals.jsx                   # Global modal container
│   │   │   ├── OneTimeOfferModal.jsx        # 10% discount popover banner
│   │   │   ├── PlaybookLibraryView.jsx      # Fundraising strategies & playbooks
│   │   │   ├── PricingModal.jsx             # Sparks billing tiers & billing interval toggles
│   │   │   ├── PulseCrmView.jsx             # Scheduled autopilot & closed-loop CRM kanban
│   │   │   ├── ResolveView.jsx              # List enrichment: CSV/Text parser & instant export
│   │   │   ├── SettingsView.jsx             # Account, Profile, Team, API Keys & Security tabs
│   │   │   ├── Sidebar.jsx                  # Left dashboard navigation & user quota status
│   │   │   ├── TracksView.jsx               # Multitrack discovery (Venture, Real Estate, LP)
│   │   │   ├── TwinFinderView.jsx           # Lookalike funded startup mapping engine
│   │   │   ├── WebThreads.jsx               # React Bits WebGL2 animated threads background
│   │   │   └── WebThreads.css               # Shader container styling
│   │   ├── lib/
│   │   │   └── api.js                       # Axios / Fetch client with fallback resolvers
│   │   ├── App.jsx                          # Root orchestrator: view routing, global state, layout
│   │   ├── index.css                        # Glassmorphism, design tokens, animations
│   │   └── main.jsx                         # React DOM createRoot entrypoint
│   ├── index.html                           # HTML entry with Instrument Serif & Inter fonts
│   ├── vite.config.js                       # Vite dev server configuration (Port 3000)
│   └── package.json                         # Dependencies & npm scripts
│
├── backend/                                 # FastAPI Python Backend Application
│   ├── app/
│   │   ├── core/                            # System core utilities
│   │   │   ├── auth.py                      # Bearer token & HMAC verification
│   │   │   ├── config.py                    # Pydantic BaseSettings environment config
│   │   │   ├── db.py                        # PostgreSQL connection pool & health checks
│   │   │   ├── exceptions.py                # Global HTTP error exception handlers
│   │   │   ├── llm_client.py                # Multi-provider LLM gateway with backoff
│   │   │   ├── logging.py                   # Structured single-line JSON log formatting
│   │   │   ├── metrics.py                   # In-memory telemetry & Prometheus counters
│   │   │   └── supabase.py                  # Supabase client instantiation
│   │   ├── models/                          # Pydantic validation schemas
│   │   │   └── schemas.py                   # Request / Response models
│   │   ├── routes/                          # FastAPI route controllers
│   │   │   ├── account.py                   # GET /api/v1/account/me, Sparks quota
│   │   │   ├── addy.py                      # POST /api/v1/addy/chat, deck upload & thesis
│   │   │   ├── campaigns.py                 # GET /api/v1/campaigns/{id}, CRM pipeline
│   │   │   ├── intake.py                    # POST /api/v1/intake raise initialization
│   │   │   ├── investors.py                 # GET /api/v1/investors catalog query
│   │   │   ├── match.py                     # GET /api/v1/match/{company_id} scoring
│   │   │   ├── outreach.py                  # POST /api/v1/outreach/draft & /send
│   │   │   ├── resolve.py                   # POST /api/v1/resolve list enrichment
│   │   │   ├── tracks.py                    # GET /api/v1/tracks multitrack filtering
│   │   │   ├── twin_finder.py               # POST /api/v1/twin-finder lookalikes
│   │   │   └── webhook.py                   # POST /api/v1/webhook/reply inbound emails
│   │   └── services/                        # Business logic layer
│   │       ├── ai_service.py                # Deck parsing, thesis scoring, fallback logic
│   │       ├── data_service.py              # Rule-based filter & investor ranking
│   │       └── outreach_service.py          # Message drafting & dispatch engine
│   ├── tests/                               # Automated test suites
│   │   ├── test_ai_service.py               # Unit tests for deck extraction & scoring
│   │   ├── test_e2e_flow.py                 # End-to-end user lifecycle integration test
│   │   └── test_logging_and_errors.py       # Metrics, X-Request-ID & error mapping tests
│   ├── main.py                              # FastAPI app entrypoint, CORS, middleware
│   ├── requirements.txt                     # Python packages
│   └── .env.example                         # Backend environment variables template
│
├── data/                                    # Curated Institutional Investor Datasets
│   ├── investors_raw.csv                    # Verified Venture, Real Estate & LP entities
│   └── people_raw.csv                       # Verified decision-makers, titles & contact emails
│
├── database/                                # Database Migrations & Seeds
│   ├── migrations/                          # SQL migrations
│   │   └── 20260901000000_advibe_schema.sql # Core PostgreSQL schema with RLS & indexes
│   └── seed.sql                             # Seed catalog records
│
├── PRD.md                                   # Comprehensive Product Requirements Document
├── architecture.md                          # Technical Architecture & Sequence Diagrams
├── rules.md                                 # Non-negotiable engineering & anti-spam invariants
└── README.md                                # Root documentation
```

---

## 🛠️ Step-by-Step Installation & Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Python**: v3.11.0 or higher
- **Git**

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/your-org/advibe.git
cd Advibe
```

---

### Step 2: Backend Setup (FastAPI)

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # Windows (PowerShell)
   python -m venv venv
   .\venv\Scripts\Activate.ps1

   # macOS / Linux
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure the environment file:
   ```bash
   cp .env.example .env
   ```

5. Start the FastAPI backend server:
   ```bash
   python -m uvicorn main:app --reload --port 8000
   ```
   - API Live at: **`http://127.0.0.1:8000`**
   - Interactive Swagger Docs: **`http://127.0.0.1:8000/docs`**
   - ReDoc Documentation: **`http://127.0.0.1:8000/redoc`**

---

### Step 3: Frontend Setup (React 18 + Vite)

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install npm dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - Web App Live at: **`http://localhost:3000`** *(or `http://localhost:3001` if port 3000 is occupied by system services)*.

4. To test production compilation:
   ```bash
   npm run build
   ```

---

## ⚙️ Configuration & Environment Variables

Create a `.env` file in the `backend/` directory referencing the template below:

```env
# Server & Environment
PROJECT_NAME="Advibe AI Fundraising Platform"
ENVIRONMENT="development"
PORT=8000
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001"

# Database Configuration (PostgreSQL / Supabase - Docker Compose port 5434)
DATABASE_URL="postgresql://advibe_user:advibe_password@localhost:5434/advibe"
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-supabase-service-role-key"
SUPABASE_JWT_SECRET="your-supabase-jwt-secret-min-32-chars-length"

# AI Inference Gateway (Primary: Groq LPU, Fallback: OpenRouter)
LLM_PROVIDER_ORDER="groq,openrouter"
GROQ_API_KEY="gsk_your_groq_api_key_here"
GROQ_MODEL="llama-3.3-70b-versatile"
OPENROUTER_API_KEY="sk-or-v1-your_openrouter_api_key_here"
OPENROUTER_MODEL="deepseek/deepseek-r1"

# Email Outreach Dispatch & Verification (Resend API)
RESEND_API_KEY="re_your_resend_api_key_here"
DEFAULT_FROM_EMAIL="Sameer Mokhasi <sameer@advibe.ai>"
WEBHOOK_SIGNING_SECRET="whsec_your_hmac_secret_here"
```

> **Note on Zero-Downtime Fallback**: If `GROQ_API_KEY` or `OPENROUTER_API_KEY` is not provided, Advibe automatically activates its **Rule-Based Heuristic Engine**, ensuring deck extraction, matching, and drafting complete without errors.

---

## 📡 API Endpoints Reference

### Authentication & Tenant Security
- `POST /api/v1/auth/signup`: Secure registration with bcrypt password hashing and tenant workspace initialization.
- `POST /api/v1/auth/login`: Authenticate credentials, issue 24-hour HS256 JWT access and refresh tokens.
- `POST /api/v1/auth/refresh`: Issue refreshed access token for active authenticated sessions.
- `GET /api/v1/auth/me`: Fetch authenticated user profile, plan tier, and remaining Sparks quota.

### AI Agent & Intake
- `POST /api/v1/addy/chat`: Conversational message interface with pitch deck extraction and gibberish detection.
- `POST /api/v1/intake`: Parse pitch deck text and initialize a structured company raise profile.
- `POST /api/v1/intake/parse-pdf`: PyMuPDF (`fitz`) deck document parser extracting raw slide content.
- `GET /api/v1/companies/{company_id}`: Retrieve stored company raise context.

### Discovery & Scoring
- `GET /api/v1/match/{company_id}`: Run dual-factor scoring (Stage 40%, Sector 35%, Geo 15%, Recency 10%) and qualitative Groq LLM conviction.
- `GET /api/v1/tracks/{track_name}/investors`: Query institutional investors across Venture, Real Estate, and LP tracks with array overlap filtering.
- `GET /api/v1/tracks/{track_name}/dossier/{investor_id}`: Fetch deep partner dossier with past deals and verification provenance.
- `POST /api/v1/twin-finder/comparables`: Discover lookalike startups and recent funding rounds.
- `POST /api/v1/twin-finder/firms`: Find institutional funds backing comparable companies.
- `POST /api/v1/resolve/paste`: Bulk list enrichment with decision-maker matching and email verification.
- `POST /api/v1/resolve/upload`: CSV file upload parsing with placement agent filtering.

### Standout Intelligence Features
- `GET /api/v1/readiness/{company_id}`: **Raise Readiness Radar** analyzing deck completeness, traction evidence, market clarity, financial ask, and moat defensibility.
- `GET /api/v1/command-center`: **Fundraising Command Center** with real-time target progress, stage conversion funnel, and timeline.
- `POST /api/v1/command-center/commitment`: Record manual commitments and soft circles from partner meetings.
- `POST /api/v1/unlock`: Atomic 1-Spark decision-maker email unlock with row-locking and idempotency.
- `POST /api/v1/sparks/top-up`: Add Sparks on-demand with append-only credit ledger audit tracking.
- `GET /api/v1/campaigns/heyreach/status`: Query HeyReach LinkedIn sequence synchronization status.
- `POST /api/v1/campaigns/heyreach/connect`: Server-side API key validation and Fernet-encrypted credential storage.
- `POST /api/v1/campaigns/heyreach/disconnect`: Disconnect HeyReach integration.
- `GET /api/v1/watchlist`: Saved leads and bookmarked investor decision-makers across sessions.
- `POST /api/v1/watchlist`: Save partner profile to persistent CRM watchlist.
- `GET /api/v1/exclusions`: Suppression and skip list for competitive funds and opt-out domains.

### Outreach & CRM
- `POST /api/v1/outreach/draft`: Generate hyper-personalized cold outreach emails grounded in dossier facts.
- `POST /api/v1/outreach/send`: Dispatch approved email batches via Resend (strictly enforces `status=approved`).
- `POST /api/v1/webhook/reply`: Inbound reply webhook with HMAC SHA-256 signature validation and sentiment classification.
- `GET /api/v1/campaigns/{company_id}`: Fetch active outreach campaigns, delivery rates, and reply outcomes.
- `GET /api/v1/campaigns/pulse/overview`: Pipeline rollups, weekly activity events, and conversion metrics.

### Account & Telemetry
- `GET /api/v1/account/me`: Fetch user subscription, Sparks balance, and workspace details.
- `POST /api/v1/account/claim-discount`: Apply one-time 10% first month discount.
- `POST /api/v1/account/team/invite`: Invite workspace teammates.
- `GET /api/v1/playbooks`: Retrieve downloadable playbooks and curated investor lists.
- `POST /api/v1/playbooks/{resource_id}/claim`: Claim curated investor lists against plan allowance.
- `GET /api/v1/stats/live`: Live platform counts (investor catalog size, data sources, active companies).
- `GET /health`: System health check verifying database and upstream service connectivity.
- `GET /metrics`: In-memory latency, request counters, and error rate telemetry.

---

## 🧪 Testing & Quality Assurance

Advibe includes an automated test suite verifying AI extraction, dual-factor scoring, error mapping, and request tracing:

```bash
# Navigate to backend directory
cd backend

# Run the complete test suite
python -m pytest

# Run specific unit test suites
python -m pytest tests/test_ai_service.py tests/test_logging_and_errors.py -v
```

### Verified Test Results
- **`14 passed in 3.52s`**:
  - `test_ai_service.py`: 8 tests verifying pitch deck parsing, rule heuristics, and fit score calculations.
  - `test_logging_and_errors.py`: 6 tests verifying `X-Request-ID` propagation, single-line JSON log formatting, Pydantic 422 error masking, and `/metrics` telemetry updates.

---

## 🛡️ Security, Privacy & Anti-Spam Invariants

1. **Strict Human-in-the-Loop Safeguard**:
   Advibe strictly rejects autonomous cold emailing. No message can be dispatched via the API unless its status has been explicitly updated to `approved` by user confirmation.
2. **Deterministic Credit Deductions**:
   Sparks (usage credits) are only consumed when a verified investor contact is delivered. Duplicates or already contacted firms are skipped at zero charge.
3. **Tenant Isolation via PostgreSQL RLS**:
   Row Level Security is enabled across all tables. Queries filter against `auth.uid()`, preventing cross-tenant data leakage.
4. **Cryptographic Webhook Signatures**:
   All inbound email reply webhooks are verified via HMAC SHA-256 signatures before triggering sentiment classification pipelines.
5. **No PII in Telemetry**:
   Structured logging strips raw email bodies and personal data before emitting single-line JSON logs to monitoring outputs.

---

## 📄 License & Credits

- **License**: MIT License. Built for high-conviction founders raising capital.
- **Inspirations & Visual Assets**: UI aesthetic, layout, and copy inspired by **8Raise.com**. Background shader powered by **React Bits `WebThreads`**.
