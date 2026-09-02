# Advibe — System Architecture (`architecture.md`)

This document provides the comprehensive technical architecture, component diagrams, data flows, and sequence diagrams for the **Advibe** AI Investor Discovery & Relationship Operating System.

---

## 1. High-Level System Architecture Diagram

```mermaid
flowchart TB
    subgraph ClientLayer ["Client Layer (React 18 + Vite)"]
        UI["Advibe Web Application (App.jsx)"]
        Shader["WebThreads WebGL2 Shader (ogl)"]
        Modals["Interactive Modals (Intake, Matches, Drafts, CRM)"]
        Tokens["Design System & CSS Tokens"]
    end

    subgraph APILayer ["API & Gateway Layer (FastAPI)"]
        Router["FastAPI App (main.py)"]
        AuthMiddleware["Supabase JWT Auth & HMAC Validator"]
        IntakeRoute["/api/v1/intake"]
        MatchRoute["/api/v1/match/{id}"]
        OutreachRoute["/api/v1/outreach/draft & /send"]
        WebhookRoute["/api/v1/webhook/reply"]
        CampaignRoute["/api/v1/campaigns/{id}"]
    end

    subgraph ServiceLayer ["Service & Intelligence Engine"]
        AIService["AI Service (Google Gemini LLM)"]
        RuleEngine["Data Service (Multi-Factor Matcher)"]
        OutreachEngine["Outreach Service (Resend Dispatcher)"]
        SentimentClassifier["Inbound Sentiment Classifier"]
    end

    subgraph DataLayer ["Persistence & Security Layer (Supabase Postgres)"]
        DB[(PostgreSQL 15+)]
        RLS["Row Level Security (RLS) Policies"]
        CompaniesTbl[("companies")]
        InvestorsTbl[("investors")]
        PeopleTbl[("people")]
        FitScoresTbl[("fit_scores")]
        OutreachTbl[("outreach_messages")]
        CampaignsTbl[("campaigns")]
    end

    subgraph ExternalServices ["External Services"]
        GeminiAPI["Google Gemini API (1.5 Flash / Pro)"]
        ResendAPI["Resend Email API"]
        EmailProviders["Investor Inboxes / SMTP"]
    end

    %% Client to API
    UI --> Router
    Modals --> Router

    %% Router to Routes
    Router --> AuthMiddleware
    AuthMiddleware --> IntakeRoute
    AuthMiddleware --> MatchRoute
    AuthMiddleware --> OutreachRoute
    AuthMiddleware --> WebhookRoute
    AuthMiddleware --> CampaignRoute

    %% Routes to Services
    IntakeRoute --> AIService
    MatchRoute --> RuleEngine
    MatchRoute --> AIService
    OutreachRoute --> AIService
    OutreachRoute --> OutreachEngine
    WebhookRoute --> SentimentClassifier
    CampaignRoute --> DB

    %% Services to External & Data
    AIService --> GeminiAPI
    RuleEngine --> DB
    AIService --> DB
    OutreachEngine --> ResendAPI
    ResendAPI --> EmailProviders
    EmailProviders -.-> WebhookRoute
    SentimentClassifier --> DB

    %% Data Layer
    DB --- RLS
    RLS --- CompaniesTbl
    RLS --- InvestorsTbl
    RLS --- PeopleTbl
    RLS --- FitScoresTbl
    RLS --- OutreachTbl
    RLS --- CampaignsTbl
```

---

## 2. Layer-by-Layer Architectural Breakdown

### 2.1 Client Layer (React 18 + Vite)
- **Framework**: React 18 with functional components and hooks (`useState`, `useEffect`, `useRef`).
- **Interactive Background**: `WebThreads.jsx` compiles a custom WebGL2 `#version 300 es` GLSL fragment shader rendering interactive sine threads that converge on user cursor coordinates.
- **State Flow**:
  - Modal overlay visibility state (`intake`, `matches`, `drafts`, `how`, `faqs`, `pricing`, `demo`).
  - Active company profile & raise metadata.
  - Multi-selection partner checkbox arrays.
  - Live draft editing state with human approval triggers.

### 2.2 API & Gateway Layer (FastAPI)
- **Entrypoint**: `backend/main.py` mounting modular APIRouters under `/api/v1`.
- **Authentication**: `app/core/auth.py` validating Supabase Bearer JWT tokens with tenant `user_id` injection into request dependencies (`Depends(get_current_user)`).
- **Validation**: Pydantic v2 domain schemas validating request bodies, query params, and JSON responses.
- **Structured Telemetry**: JSON loggers tracing `request_id`, execution duration, and endpoint latency.

### 2.3 Service & Intelligence Engine
- **AI Service (`ai_service.py` & `llm_client.py`)**:
  - **Multi-Provider Resilience**: Routes chat completions to **Groq** (`llama-3.3-70b-versatile`) as primary LPU provider and seamlessly falls through to **OpenRouter** (`deepseek/deepseek-r1`) upon 429 rate limits or outages with max 2 exponential backoff retries.
  - **Intake Parser (`extract_profile`)**: Extracts structured `IntakeProfile` parameters from raw pitch decks and website summaries with JSON mode and re-prompting.
  - **LLM Conviction Scorer (`score_conviction`)**: Generates qualitative alignment score ($0.0 - 1.0$) and a 2-3 sentence investment thesis rationale.
  - **Draft Synthesizer (`draft_outreach`)**: Composes contextual, high-signal first-touch emails referencing target partner sector focus and investment history.
  - **Fail-Safe Heuristic Layer**: Call-site deterministic fallbacks guarantee that intake, matching, and drafting never raise unhandled exceptions even during complete LLM network outages.
- **Multi-Factor Match Engine (`data_service.py`)**:
  - Executes deterministic SQL prefiltering using PostgreSQL array overlap operators (`&&`).
  - Calculates the weighted composite score:
    $$\text{Final Fit} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Score})$$
- **Outreach Service (`outreach_service.py`)**:
  - **Enforces Security Invariant**: Verifies `status == 'approved'` prior to calling Resend.
  - Updates campaign delivery metrics and logs message hashes.

### 2.4 Persistence & Security Layer (PostgreSQL 15 / Supabase)
- **Deployment Options**: Runs either as a self-hosted containerized database (`postgres:15-alpine` via `docker compose up -d`) or managed via Supabase.
- **RLS Isolation**: Scopes all tenant operations on `companies`, `fit_scores`, `messages`, and `campaigns` to `public.current_user_id() = user_id`.
  - In self-hosted Postgres, the FastAPI backend sets the session variable: `SET LOCAL app.current_user_id = '<user-uuid>'`.
  - In Supabase, fallback transparently accesses session settings.
- **GIN Indexing**: Indexes `stage_focus`, `sector_focus`, and `geography_focus` for sub-second filtering over 100+ sourced investor records in the current dataset (audited in `DATA_SOURCES.md`, designed to scale to 50,000+).
- **Data Integrity**: Foreign key cascades with automated `set_updated_at()` trigger execution on mutable records.

---

## 3. Database Entity-Relationship Diagram (ERD)

```mermaid
erDiagram
    users ||--o{ companies : "owns"
    companies ||--o{ fit_scores : "has"
    investors ||--o{ people : "employs"
    investors ||--o{ fit_scores : "evaluated_in"
    companies ||--o{ outreach_messages : "targets"
    people ||--o{ outreach_messages : "receives"
    companies ||--o{ campaigns : "tracks"
    campaigns ||--o{ outreach_messages : "contains"

    users {
        uuid id PK
        string email
        timestamptz created_at
    }

    companies {
        uuid id PK
        uuid user_id FK
        string name
        string website_url
        string deck_file_url
        string stage
        string sector
        string geography
        numeric check_size_min
        numeric check_size_max
        text thesis_summary
        timestamptz created_at
        timestamptz updated_at
    }

    investors {
        uuid id PK
        string firm_name
        string fund_type
        numeric aum
        text_array stage_focus
        text_array sector_focus
        text_array geography_focus
        numeric typical_check_min
        numeric typical_check_max
        string website_url
        string source
        timestamptz created_at
    }

    people {
        uuid id PK
        uuid investor_id FK
        string full_name
        string role_title
        string email
        string linkedin_url
        boolean is_decision_maker
        boolean verified
        timestamptz created_at
    }

    fit_scores {
        uuid id PK
        uuid company_id FK
        uuid investor_id FK
        numeric score
        numeric rule_score
        numeric llm_score
        text rationale
        timestamptz created_at
    }

    outreach_messages {
        uuid id PK
        uuid company_id FK
        uuid person_id FK
        uuid campaign_id FK
        string subject
        text body
        string channel
        string status
        timestamptz sent_at
        timestamptz opened_at
        timestamptz replied_at
        string reply_sentiment
        timestamptz created_at
    }

    campaigns {
        uuid id PK
        uuid company_id FK
        string name
        string status
        int total_targeted
        int total_sent
        int total_replies
        int total_meetings
        timestamptz created_at
    }
```

---

## 4. End-to-End Sequence Diagrams

### 4.1 Pitch Deck Intake & Thesis Extraction Flow

```mermaid
sequenceDiagram
    autonumber
    actor Founder as Founder / User
    participant React as React Frontend (App.jsx)
    participant API as FastAPI Gateway (/api/v1/intake)
    participant Gemini as Google Gemini 1.5 API
    participant DB as Supabase PostgreSQL

    Founder->>React: Fill Intake Modal (Deck URL / Summary)
    React->>API: POST /api/v1/intake {name, website, deck_text}
    API->>Gemini: Parse raise parameters (Stage, Sector, Check, Thesis)
    Gemini-->>API: Return Structured JSON Metadata
    API->>DB: INSERT INTO companies (user_id, name, stage, sector, thesis_summary)
    DB-->>API: Return created company_id
    API-->>React: 201 Created {company_id, extracted_profile}
    React->>Founder: Transition to Matches View with live profile
```

### 4.2 Dual-Factor Investor Matching Flow

```mermaid
sequenceDiagram
    autonumber
    actor Founder as Founder / User
    participant React as React Frontend
    participant API as FastAPI Gateway (/api/v1/match/{id})
    participant DB as Supabase PostgreSQL
    participant Gemini as Google Gemini 1.5 API

    Founder->>React: Click "Matches" or complete Intake
    React->>API: GET /api/v1/match/{company_id}
    API->>DB: Query investors matching stage && sector && check_size
    DB-->>API: Return candidate firms + decision maker people
    loop For Each Candidate Firm
        API->>API: Compute Rule Score (Stage 30% + Sector 35% + Geo 20% + Check 15%)
        API->>Gemini: Evaluate Qualitative Thesis Fit
        Gemini-->>API: Return LLM Conviction Score + Rationale
        API->>API: Fit Score = (0.40 * Rule) + (0.60 * LLM)
        API->>DB: UPSERT INTO fit_scores (company_id, investor_id, score, rationale)
    end
    API-->>React: Return Ranked Matches List with Decision Makers
    React->>Founder: Display Match Cards with Fit % and Warm Path tags
```

### 4.3 Human-in-the-Loop Outreach & Dispatch Flow

```mermaid
sequenceDiagram
    autonumber
    actor Founder as Founder / User
    participant React as React Frontend
    participant API as FastAPI Gateway (/api/v1/outreach)
    participant Gemini as Google Gemini 1.5 API
    participant Resend as Resend Email Dispatcher
    participant DB as Supabase PostgreSQL

    Founder->>React: Select targeted partners -> Click "Generate Drafts"
    React->>API: POST /api/v1/outreach/draft {company_id, person_ids}
    loop For Each Selected Partner
        API->>Gemini: Draft hyper-personalized first touch email
        Gemini-->>API: Return Subject + Tailored Body
        API->>DB: INSERT INTO outreach_messages (status='draft', ...)
    end
    API-->>React: Return generated drafts
    React->>Founder: Display Draft Editor for Human Review
    Founder->>React: Edit copy -> Click "Approve & Launch Sequence"
    React->>API: POST /api/v1/outreach/send {message_ids, action='approve_and_send'}
    API->>DB: Verify status='approved' (Security Invariant Check)
    API->>Resend: Dispatch emails via Resend API
    Resend-->>API: Return 200 OK + message_id
    API->>DB: UPDATE outreach_messages SET status='sent', sent_at=now()
    API-->>React: 200 Success: Batch Dispatched
    React->>Founder: Display CRM Pipeline Confirmation
```

### 4.4 Inbound Reply Classification & Closed-Loop CRM Flow

```mermaid
sequenceDiagram
    autonumber
    actor Investor as Investor / Decision Maker
    participant Resend as Email Provider (Resend Webhook)
    participant API as FastAPI Gateway (/api/v1/webhook/reply)
    participant Gemini as Google Gemini 1.5 API
    participant DB as Supabase PostgreSQL
    participant React as React Frontend

    Investor->>Resend: Reply to outreach email ("Interested, let's schedule a call")
    Resend->>API: POST /api/v1/webhook/reply (HMAC Signed Webhook)
    API->>API: Cryptographically verify SHA256 HMAC signature
    API->>Gemini: Classify reply sentiment & intent
    Gemini-->>API: Intent: "meeting_requested", Confidence: 0.98
    API->>DB: UPDATE outreach_messages SET reply_sentiment='meeting_requested', replied_at=now()
    API->>DB: UPDATE campaigns SET total_replies += 1, total_meetings += 1
    API-->>Resend: 200 OK
    React->>API: GET /api/v1/campaigns/{company_id}
    API-->>React: Return updated CRM Pipeline metrics
    React->>React: Update Live CRM Dashboard metrics
```
