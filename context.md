# Advibe AI — Project Context & Architectural Blueprint

> **Notice for LLMs & AI Coding Agents:**  
> This file is the primary context reference for **Advibe AI**. When ingesting this document, assume full domain context of an **Autonomous Capital Raising & Investor Discovery Operating System** built for venture capital, private equity, and emerging fund managers.

---

## 1. Executive Overview

- **Project Name:** Advibe (Advibe AI)
- **Tagline:** *"Your raise, on autopilot."*
- **Domain:** AI-driven venture capital & private equity investor discovery, partner thesis matching, bespoke relationship outreach, and closed-loop investor pipeline management.
- **Repository Location:** `c:\Users\91807\OneDrive\Desktop\Advibe`
- **Primary Project Documentation:**
  - `PRD.md` — Product Requirements Document (Functional & Non-Functional Requirements)
  - `architecture.md` — System Architecture, ERD, and Multi-Provider Failover Design
  - `major project.docx` — Complete academic & technical major project report (B.M.S. College of Engineering)
  - `DATA_SOURCES.md` — Provenance of institutional investor datasets
  - `Investor list.xlsx` — Institutional venture capital catalog records

---

## 2. Core Problem & Solution

### The Problem
Fundraising founders, fund managers, and real estate operators face two broken, disconnected paradigms:
1. **Static, Expensive Databases** (*e.g., Crunchbase, PitchBook, basic directories*): Charge $15,000–$25,000/yr for passive data, lacking partner-level conviction modeling or actionable outreach workflows.
2. **Generic B2B Sales Spammers** (*e.g., Apollo, ZoomInfo, mass email blasters*): Treat venture outreach like high-volume commodity sales, burning investor relationships, damaging founder reputations, and yielding $<2\%$ reply rates.

### The Solution: Advibe AI
Advibe unifies investor discovery, partner-level conviction matching, bespoke first-touch drafting, human-in-the-loop governance, and closed-loop CRM tracking into a single cohesive operating system.

```
[1. Ingest Pitch Deck / Brief] ──► [2. Dual-Factor Match] ──► [3. Human-in-the-Loop Review] ──► [4. Closed-Loop Pulse CRM]
  (Groq / Llama-3.3 Extraction)       (Rule 40% + LLM 60%)       (Zero Autonomous Sending)        (Auto-Classify Replies)
```

---

## 3. Dedicated Capital Tracks

Advibe AI provides tailored discovery workflows across three distinct investment tracks:
1. **Venture Capital Track:** Pre-Seed to Series B technology startups seeking institutional venture capital partners.
2. **Real Estate Private Equity Track:** Commercial, multifamily, and debt sponsors seeking accredited LP capital and private equity real estate allocators.
3. **Limited Partner (LP) / Family Office Track:** Emerging fund managers, solo GPs, and syndicate leads raising fund commitments or SPV capital.

---

## 4. Key Functional Modules

### 4.1 AI Context & Intake Engine
- Accepts pitch deck PDFs, company URLs, or unstructured text briefs.
- Employs ultra-fast LLM inference (Groq `llama-3.3-70b-versatile` with OpenRouter fallback) to extract:
  - `company_name`, `stage`, `sector`, `geography`, `check_size_min/max`, and a concise 3-sentence synthesized `thesis_summary`.
- Founders review and confirm metadata before matching commences.

### 4.2 Dual-Factor Match Engine & Partner Resolution
- Evaluates candidate institutional investor records from a catalog of 100 to 450,000+ partner profiles.
- **Rule Score (40% Weight):** Stage alignment (30%), Sector overlap (35%), Geography (20%), Check size feasibility (15%).
- **LLM Conviction Score (60% Weight):** Qualitative thesis evaluation against partner portfolio history (0.0 to 1.0).
- **Composite Fit Formula:**
  $$\text{Fit Score} = (0.40 \times \text{Rule Score}) + (0.60 \times \text{LLM Score})$$
- Resolves matches down to individual decision-makers (Managing Partners, General Partners, Sector Leads) with verified emails and LinkedIn dossiers.

### 4.3 Twin Finder
- Discovers 10–15 comparable funded companies ("twins") based on a 1-sentence company description.
- Identifies which institutional funds led their rounds at the founder's current stage and verifies actively deploying partners.

### 4.4 Resolve (Bulk Firm-to-Partner Resolver)
- Ingests raw lists of firm names or spreadsheets.
- Automatically resolves entity names, identifies active decision-makers, filters out placement agents, and appends confirmed work emails.

### 4.5 ADDY AI — Autonomous Conversational Copilot
- Conversational fundraising strategist available 24/7.
- Queries live investor catalogs, provides objection-handling playbooks, evaluates raise readiness scores, and manages pipeline pacing.

### 4.6 Human-in-the-Loop Review Queue (Anti-Spam Security Invariant)
- **Zero Autonomous Sending Rule:** The platform strictly prohibits autonomous email dispatch.
- All AI-drafted first-touch letters are generated with `status='draft'`.
- Founders must explicitly review, personalize, and click approve before messages are dispatched via Resend API.

### 4.7 Closed-Loop Pulse CRM & Inbound Reply Classifier
- Inbound investor email responses are received via cryptographically signed webhooks (`/api/v1/webhook/reply`).
- NLP classifier categorizes responses into:
  - `meeting_requested` (Partner requested a calendar link or call)
  - `interested` (Requested full deck, data room, or traction metrics)
  - `not_interested` (Pass or out of current fund mandate)
  - `wrong_person` (Re-routed to another sector partner)
- Automatically updates live pipeline metrics and booked meeting schedules.

---

## 5. Technology Stack & Architecture

| Layer | Technologies & Tools | Implementation Details |
|---|---|---|
| **Backend** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2 | Async REST API, modular route handlers (`/api/v1/addy`, `/api/v1/match`, `/api/v1/outreach`, etc.) |
| **Database** | PostgreSQL (Supabase), SQLModel, SQLAlchemy | Multi-tenant Row Level Security (RLS), ACID transaction support, institutional catalog caching |
| **LLM Orchestration** | Groq LPU API, OpenRouter API fallback | Exponential backoff retry handler (`RateLimitError`, `APIConnectionError`), multi-model fallback (`llama-3.3-70b-versatile`, `qwen/qwen3.8-27b`) |
| **Frontend** | React 18, Vite, Framer Motion, Vanilla CSS | Single-page application, custom dark design system (`#000000`), zero layout-shift or white flashes |
| **3D Background** | `ThreeDMarqueeBackground.jsx` | Full-screen Aceternity 3D perspective canvas (`rotateX(55deg) rotateZ(-45deg)`), non-blocking pointer events, radial vignette |
| **Open Ecosystem** | Anthropic Model Context Protocol (MCP) | Native MCP server implementation for Claude Desktop / Claude Code, custom ChatGPT action manifests |
| **Security & Auth** | Supabase Auth, OAuth 2.0 (Google/LinkedIn), HMAC-SHA256 | Session persistence, token validation fast-paths in development, cryptographic webhook signature verification |

---

## 6. Business Model & Economics

- **Sparks Usage Currency:**
  - 1 Spark = 1 fully verified institutional partner contact with email, LinkedIn, and investment conviction dossier.
  - Sparks rollover monthly and never expire during an active subscription.
- **Subscription Tiers:**
  - **Free Trial:** $0/mo — 10 free Sparks, 25 free ADDY messages, full thesis extraction, catalog preview.
  - **Starter:** $79/mo — 50 Sparks/mo, partner resolution, first-touch drafting, Twin Finder.
  - **Pro (Autopilot):** $199/mo — 200 Sparks/mo, Pulse CRM sync, AI reply classifier, MCP Claude server access.
  - **Institutional:** $499/mo — 600 Sparks/mo, custom track creation, multi-seat workspace, dedicated curation.

---

## 7. Directory Map

```
Advibe/
├── context.md                    <-- THIS FILE (Primary LLM Project Context)
├── PRD.md                        <-- Product Requirements & Spec Invariants
├── architecture.md               <-- Technical Architecture & Schemas
├── major project.docx            <-- Academic & Technical Project Report
├── backend/
│   ├── main.py                   <-- FastAPI Application Entry Point
│   ├── app/
│   │   ├── core/
│   │   │   ├── auth.py           <-- Auth, Dev Sessions & JWT Verification
│   │   │   ├── config.py         <-- Settings & Environment Variables
│   │   │   ├── database.py       <-- Database Engine & Sessions
│   │   │   └── llm_client.py     <-- Multi-Provider LLM Client (Groq/OpenRouter)
│   │   ├── models/               <-- SQLModel ORM Table Definitions
│   │   └── routes/
│   │       ├── addy.py           <-- ADDY AI Conversational & Matching API
│   │       ├── match.py          <-- Dual-Factor Matching Endpoints
│   │       ├── outreach.py       <-- Review Queue & Dispatch Endpoints
│   │       ├── resolve.py        <-- Bulk Firm Resolver Endpoints
│   │       └── twin_finder.py    <-- Twin Finder Endpoints
├── frontend/
│   ├── src/
│   │   ├── App.jsx               <-- Application Shell & View Routing
│   │   ├── index.css             <-- Vanilla CSS Design Tokens
│   │   ├── components/
│   │   │   ├── LandingPage.jsx   <-- Public Landing Page
│   │   │   ├── ThreeDMarqueeBackground.jsx <-- Full-Screen 3D Marquee BG
│   │   │   ├── AddyChat.jsx      <-- ADDY AI Interactive Copilot
│   │   │   ├── DashboardView.jsx <-- Main Capital Pipeline Dashboard
│   │   │   ├── TwinFinderView.jsx<-- Twin Finder UI
│   │   │   └── ResolveView.jsx   <-- Resolve UI
│   │   └── lib/
│   │       ├── api.js            <-- Backend API Client Functions
│   │       └── supabase.js       <-- Supabase Client Configuration
```

---

## 8. Guidelines for AI Assistants & LLMs

1. **Maintain Domain Accuracy:** Always treat Advibe as a **capital raising and investor intelligence operating system**, never as a generic B2B sales lead generation or cold-calling tool.
2. **Preserve Security Invariants:** Enforce the **Zero Autonomous Sending** rule—messages must remain in draft state until approved by a human.
3. **Dual-Factor Matching:** Any matching feature must respect both the quantitative rule score (stage, sector, check size) and the qualitative LLM conviction score.
4. **Style Consistency:** The frontend uses **Vanilla CSS** and direct inline styling for performance and design fidelity; do not inject Tailwind CSS unless explicitly directed.
