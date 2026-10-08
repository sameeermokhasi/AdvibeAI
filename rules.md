# Advibe — Engineering & Product Rules (`rules.md`)

This document establishes the architectural principles, security constraints, coding standards, and operational guidelines for developing and maintaining the **Advibe** platform.

---

## 1. Core Operating Principles

### 1.1 Anti-Spam & Human-in-the-Loop Constraint (Non-Negotiable)
> [!IMPORTANT]
> **Zero Autonomous Email Blasts**: Under no circumstances shall an outreach message be dispatched automatically upon generation. 
- Every message record in the database is created with status `draft`.
- The dispatch service (`/api/v1/outreach/send`) **MUST** strictly verify `status = 'approved'` before handing off payloads to the Resend API.
- Rejection of approval reverts the draft or removes it from the campaign queue.

### 1.2 Data Isolation & Row Level Security (RLS)
> [!CAUTION]
> **Strict Founder Tenant Isolation**: Founder pitch decks, theses, fit scores, and conversation drafts are proprietary intellectual property.
- All database queries from the API must execute under authenticated Supabase user context (`auth.uid()`).
- RLS policies must be explicitly tested for every table (`companies`, `fit_scores`, `outreach_messages`, `campaigns`, `investor_unlocks`, `credit_ledger`).
- Service role keys (`SUPABASE_SERVICE_ROLE_KEY`) are restricted exclusively to background workers, system webhooks, and seed scripts.

### 1.3 Email Masking & Single-Reveal Invariant (Non-Negotiable)
> [!IMPORTANT]
> **Zero Unmasked Email Leakage**: No endpoint shall ever expose a raw decision-maker email prior to explicit unlock.
- Emails across all catalog discovery tracks, dossiers, twin finder lookalikes, resolve lists, ADDY chat delivery, and CSV exports are strictly masked by default (`j***@firm.com`).
- Email reveal costs exactly 1 Spark, executed through the atomic PostgreSQL function `perform_email_unlock(p_user_id, p_person_id, p_revealed_email, p_idempotency_key)`.
- Row-locking (`FOR UPDATE`) on `user_subscriptions` prevents race conditions.
- Re-visiting unlocked contacts is strictly idempotent and costs 0 Sparks (never charges twice).
- LinkedIn profile lookups remain free and never consume Sparks.

### 1.4 HeyReach Integration Rules
- **Live Validation**: All user-submitted HeyReach API keys must be validated live against `https://api.heyreach.io/api/public/auth/CheckApiKey`.
- **Encryption at Rest**: API keys are encrypted at rest using Fernet symmetric encryption before storing in `user_integrations`.
- **Connected Redirect**: Connected outreach views provide a direct launch link to `https://app.heyreach.io` while maintaining local human-in-the-loop review.

### 1.5 Immutable Credit Ledger Integrity
- **Append-Only Accounting**: `credit_ledger` is protected by a PostgreSQL trigger (`trg_prevent_credit_ledger_mutation`) that blocks all `UPDATE` and `DELETE` operations.
- **Audit Equality**: The sum of all ledger entries (`SUM(delta)`) for a user must strictly equal `user_subscriptions.sparks_balance`.

---

## 2. Backend Engineering Rules (FastAPI / Python)

### 2.1 Code Structure & Architecture
- **Framework**: Python 3.11+ with FastAPI and Pydantic v2.
- **Layered Decoupling**:
  - `app/routes/`: Thin HTTP controllers handling validation, status codes, and route wiring.
  - `app/services/`: Pure business logic (`ai_service.py`, `data_service.py`, `outreach_service.py`).
  - `app/models/`: Pydantic models with explicit field descriptions and validation constraints.
  - `app/core/`: Configuration, logging, auth dependencies, and database client factories.
- **Type Safety**: 100% type hinting coverage across all function signatures and returns.

### 2.2 LLM Service & AI Prompting
- **Primary Provider**: Groq API (`llama-3.3-70b-versatile`) — Ultra-low latency LPU inference with JSON mode.
- **Secondary Fallback Provider**: OpenRouter API (`deepseek/deepseek-r1`) — Multi-provider redundancy ensuring 100% uptime when primary hits 429 rate limits.
- **Structured JSON Output**: All LLM calls pass `response_format={"type": "json_object"}` and parse via `json.loads` with automatic single re-prompt on parse failure.
- **Call-Site Fail-Safe Fallbacks**: If both Groq and OpenRouter fail, the service must degrade gracefully to deterministic regex/keyword heuristics (IntakeProfile naive extraction, `llm_score=None` rule evaluation, templated first-touch draft) rather than raising an unhandled exception.
- **Token Efficiency & Sanitization**: Decks and website extracts must be sanitized (HTML stripped) and capped to ~6000 characters before prompt injection.

### 2.3 Webhooks & Inbound Processing
- **Cryptographic Verification**: Inbound webhook endpoints (e.g., `/api/v1/webhook/reply`) must validate SHA256 HMAC signatures before processing payloads.
- **Idempotency**: All webhook events must check idempotency keys (`message_id` or `event_id`) to prevent duplicate CRM updates.

---

## 3. Frontend Engineering Rules (React 18 / Vite)

### 3.1 Technology & Tooling
- **Core**: React 18, Vite, ES Modules.
- **WebGL Background**: React Bits `WebThreads` shader implemented via `ogl` with hardware acceleration.
- **Styling**: Pure Vanilla CSS (`src/index.css`) with curated design tokens. No ad-hoc utility clutter.
- **Icons**: Lucide React for consistent vector iconography.

### 3.2 Visual & UX Standards
> [!TIP]
> **Zero Flash of White**: Pure `#000000` must be forced on `html, body` at the root stylesheet and inline attributes to prevent initial page-load flashes.
- **Responsive Viewport Locking**:
  - Desktop (`>= 901px`): Single-viewport locked interface without body scrollbars.
  - Mobile (`<= 900px`): Fluid scrollable layout with backdrop-blurred navigation drawer.
- **Micro-Animations**: All interactive buttons must utilize liquid-metal gradients with smooth hover gleams and cubic-bezier entrance motion.

---

## 4. Database & Postgres Rules (Supabase)

### 4.1 Schema Conventions
- **Naming**: `snake_case` for all tables, columns, indexes, and constraints.
- **Primary Keys**: UUIDv4 (`gen_random_uuid()`) for all relational entities.
- **Timestamps**: All tables must include `created_at TIMESTAMPTZ DEFAULT now()`. Tables with mutable records must include `updated_at` with automated update triggers.
- **Arrays & Normalization**: Stage, sector, and geography tags use PostgreSQL native `TEXT[]` with GIN indexing for fast intersection queries (`&&`).

### 4.2 Fit Score Calculation Formula
$$\text{Fit Score} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Conviction Score})$$
Where:
- $\text{Stage Alignment} = 30\%$
- $\text{Sector Overlap} = 35\%$
- $\text{Geography Alignment} = 20\%$
- $\text{Check Size Feasibility} = 15\%$

---

## 5. Security & Compliance Rules

1. **CAN-SPAM & GDPR Compliance**:
   - Every generated outreach email draft must include sender company physical address and an automated unsubscribe token mechanism.
2. **API Secret Management**:
   - Zero hardcoded secrets in version control. All secrets are loaded from `.env` via `Pydantic BaseSettings`.
3. **Structured Telemetry**:
   - Structured JSON logging for all API requests containing `request_id`, `timestamp`, `method`, `path`, `status_code`, and `duration_ms`.
