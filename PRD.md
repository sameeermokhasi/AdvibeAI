# Advibe — Product Requirements Document (PRD)

| Document Version | 1.0.0 |
|---|---|
| **Author** | Product & Engineering Team |
| **Status** | Approved / In Development |
| **Target Launch** | Q3 2026 |

---

## 1. Executive Summary & Problem Statement

### 1.1 The Problem
Fundraising founders today face two broken, disconnected workflows:
1. **Discovery Tools (e.g., static databases like Crunchbase or basic 8Raise clones)**: Provide static lists of funds without partner-level context, live conviction scoring, or understanding of the founder's specific thesis.
2. **Outreach & CRM Tools (e.g., cold email blast platforms)**: Treat venture outreach like high-volume sales spam, burning investor relationships, damaging founder reputations, and yielding $< 2\%$ reply rates.

### 1.2 The Solution
**Advibe** merges **Investor Discovery + Relationship Outreach** into a single cohesive Operating System. It ingests the founder's pitch deck, discovers high-conviction institutional funds, resolves the exact decision-making partner, drafts hyper-personalized first-touch notes, enforces **strict human-in-the-loop review before sending**, and classifies inbound replies to book partner meetings automatically.

---

## 2. Target User Personas

| Persona | Description | Primary Pain Point | Core Need in Advibe |
|---|---|---|---|
| **Early-Stage Founder (Pre-Seed / Seed)** | First or second-time founder raising \$500k – \$3M. Limited VC network. | Doesn't know which specific partners at Tier-1/2 funds actively invest in their niche. | Fast thesis extraction, ranked matches with partner email addresses, warm intro discovery. |
| **Growth Founder (Series A / B)** | Experienced operator raising \$5M – \$25M with revenue traction. | High opportunity cost of manual email drafting and pipeline tracking across 100+ funds. | Automated dual-factor scoring, multi-channel review queue, AI reply classifier. |
| **Solo GP / Syndicate Lead** | Emerging manager raising capital for SPVs or micro-funds. | Needs institutional data validation, check size feasibility, and LP relationship mapping. | Clean CRM tracking, SEC-compliant outreach safeguards, verified partner databases. |

---

## 3. Product Vision & Value Proposition

Advibe unifies the fundraising lifecycle into 4 continuous steps:

```
[1. Ingest Deck & Context] ──► [2. Dual-Factor Match] ──► [3. Human-in-the-Loop Review] ──► [4. Closed-Loop CRM]
  (Gemini 1.5 Analysis)          (Rule + LLM Conviction)    (Strict Non-Spam Approval)      (Auto-Classify Replies)
```

---

## 4. Functional Requirements

### 4.1 Module 1: AI Context & Intake Engine (P0)
- **FR-1.1**: The system must accept company pitch deck summaries, website URLs, or raw text descriptions.
- **FR-1.2**: Using Groq (`llama-3.3-70b-versatile`) with automatic OpenRouter fallback, the engine must extract:
  - `company_name`: Official legal or operating name.
  - `stage`: Current fundraising stage (`Pre-Seed`, `Seed`, `Series A`, `Series B`, `Growth`).
  - `sector`: Primary and secondary market categories (`Fintech`, `AI/ML`, `B2B SaaS`, `Healthtech`, `Climate`, etc.).
  - `geography`: Primary operating and target investor regions (`US`, `India`, `Europe`, `Global`).
  - `check_size_min` & `check_size_max`: Target round amount.
  - `thesis_summary`: 2-3 sentence synthesized investment thesis.
- **FR-1.3**: The user must be able to review, edit, and confirm extracted metadata before triggering matching.

### 4.2 Module 2: Dual-Factor Match Engine & Partner Resolution (P0)
- **FR-2.1**: The system must filter and rank institutional investor firm records (100 fully sourced tier-1 & regional VC firms in current dataset with explicit provenance in `DATA_SOURCES.md`, designed to scale to 50,000+ in production) using multi-factor rule scoring:
  - Stage Alignment (Weight: 30%)
  - Sector Overlap (Weight: 35%)
  - Geography Focus (Weight: 20%)
  - Check Size Feasibility (Weight: 15%)
- **FR-2.2**: The top candidate firms must be evaluated by Groq / OpenRouter LLMs for qualitative conviction fit ($0.0 - 1.0$).
- **FR-2.3**: Composite fit score formula:
  $$\text{Fit Score} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Score})$$
- **FR-2.4**: The system must resolve the firm record to individual partner decision makers (`people` table), highlighting Managing Partners, General Partners, and Sector Leads.
- **FR-2.5**: Each match card must display fit percentage, AI rationale, and warm intro tag (`Decision Maker`, `Verified Partner`, `Active Deployer`).

### 4.3 Module 3: Human-in-the-Loop Outreach & Review Queue (P0)
- **FR-3.1**: The system must generate individualized first-touch email drafts referencing the target partner's recent investments and portfolio thesis.
- **FR-3.2 (Anti-Spam Security Invariant)**: **Zero Autonomous Sending**. Generated messages are stored with `status='draft'`.
- **FR-3.3**: The UI must provide an interactive review modal where founders can edit the subject line, body copy, and tone.
- **FR-3.4**: The dispatch endpoint (`/api/v1/outreach/send`) must reject any payload where `status != 'approved'`.
- **FR-3.5**: Approved messages are dispatched via Resend API with automated delivery timestamping.

### 4.4 Module 4: Closed-Loop CRM & Inbound Reply Classifier (P1)
- **FR-4.1**: Inbound reply webhook (`/api/v1/webhook/reply`) must receive and cryptographically verify investor email responses.
- **FR-4.2**: The AI classifier must categorize the response into:
  - `meeting_requested` (Positive - Partner requested calendar/call)
  - `interested` (Positive - Requested full deck or metrics)
  - `not_interested` (Negative - Pass / Out of mandate)
  - `wrong_person` (Neutral - Re-routed to another colleague)
- **FR-4.3**: The live dashboard must update aggregate metrics (Targeted Partners, Sent, Reply Rate %, Meetings Booked).

### 4.5 Module 5: UI & Visual Experience (P0)
- **FR-5.1**: Single-viewport dark-themed landing page (`#000000`) with zero initial white flash.
- **FR-5.2**: React Bits `WebThreads` interactive WebGL2 shader background responding in real time to mouse cursor coordinates.
- **FR-5.3**: Liquid-metal glassmorphic buttons with hover gleams and cubic-bezier entrance motion.
- **FR-5.4**: Responsive layout locking on desktop (`>= 901px`) and fluid drawer on mobile (`<= 900px`).

---

## 5. Non-Functional Requirements (NFRs)

| Category | Requirement | Target Metric |
|---|---|---|
| **Performance** | WebGL shader background frame rate | $\ge 60\text{ FPS}$ on standard GPUs |
| **Latency** | Match Engine generation for top 100 investors | $< 1.2\text{ seconds}$ |
| **Security** | Multi-tenant isolation | 100% PostgreSQL Row Level Security (RLS) enforcement |
| **Reliability** | Webhook verification | 100% cryptographic SHA256 HMAC signature validation |
| **Deliverability** | Outreach email inbox placement rate | $> 95\%$ via dedicated Resend domain reputation |
| **Compliance** | Anti-Spam laws | CAN-SPAM and GDPR one-click opt-out token integration |

---

## 6. Success Metrics & KPIs

1. **Investor Reply Rate**: Target $\ge 35\%$ average reply rate across founder campaigns (industry average is $< 3\%$).
2. **Meeting Booking Rate**: $\ge 15\%$ of dispatched conversations convert into introductory partner Zoom calls.
3. **Founder Time Saved**: Reduction in campaign preparation time from 30+ hours down to $< 15\text{ minutes}$.
4. **Match Conviction Accuracy**: $\ge 90\%$ founder approval rate on generated investor lists.

---

## 7. Product Release Roadmap

```
├── Phase 1: MVP Release (Completed)
│   ├── React 18 + Vite Frontend with WebThreads Background Shader
│   ├── FastAPI REST Gateway with Pydantic v2 validation
│   ├── Supabase PostgreSQL Schema with RLS and 20-fund Seed Dataset
│   └── Interactive Modal Suite (Intake, Matches, Drafts, Pipeline)
│
├── Phase 2: Production Integrations (Next Sprint)
│   ├── Live Groq (Llama 3.3 70B) & OpenRouter API Key Provisioning
│   ├── Live Resend SMTP Domain Verification
│   └── OAuth2 Google / LinkedIn Founder Login
│
└── Phase 3: Advanced Intelligence (Future Scope)
    ├── Automated SEC Form D & Crunchbase Daily Ingest
    ├── Calendar Sync (Google Calendar / Cal.com auto-scheduling)
    └── Lookalike Investor Recommendation Graph
```
