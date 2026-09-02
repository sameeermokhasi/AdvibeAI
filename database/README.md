# Advibe — Database (Self-Hosted PostgreSQL 15 & Supabase)

Production schema, triggers, RLS policies, and seed scripts for the **Advibe** AI Investor Discovery & Relationship Operating System.

---

## 🚀 Quick Start with Docker Compose (3 Commands)

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start PostgreSQL 15 (auto-runs migration + seed data)
docker compose up -d

# 3. Verify tables and seed data
docker exec -it advibe-db psql -U advibe_user -d advibe -c "\dt"
```

---

## 🗄️ Relational Entities

1. `users`: Founder user accounts (`id`, `email`, `created_at`).
2. `companies`: Founder's raise profiles (`stage`, `sector`, `geography`, `check_size_min/max`, `thesis_summary`).
3. `investors`: Firm-level records (`aum`, `sector_focus`, `stage_focus`, `geography_focus`, `typical_check_min/max`, `website_url`).
4. `people`: Decision makers & partners at firms (`full_name`, `role_title`, `email`, `linkedin_url`, `is_decision_maker`, `verified`).
5. `fit_scores`: Multi-factor ranked scores per company-investor pair (0–100%, rule score, LLM score, thesis rationale).
6. `campaigns`: Grouped outreach batches and aggregate CRM conversion tracking.
7. `messages`: Tailored outreach messages with strict approval safeguards (`status='draft'|'approved'|'sent'|'failed'`).
8. `outcomes`: Closed-loop feedback (`meeting_requested`, `interested`, `not_interested`, `wrong_person`).

---

## 🔒 Row Level Security (RLS) in Self-Hosted PostgreSQL

The schema uses standard PostgreSQL RLS with a custom session-variable accessor function:

```sql
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Backend Session Wiring:
When the FastAPI backend validates a founder's JWT token, it sets the session variable before executing database queries within that transaction/connection:

```sql
SET LOCAL app.current_user_id = 'c1234567-0000-0000-0000-000000000001';
```

This guarantees that:
- Founders can only view and manage their own companies, campaigns, drafts, and fit scores.
- Investor firm profiles and partner decision makers remain universally readable.
- No multi-tenant data leak is possible.

---

## 🛠️ Management Commands

| Command | Action |
|---|---|
| `make db-up` / `npm run db-up` | Start PostgreSQL container in background |
| `make db-down` / `npm run db-down` | Stop PostgreSQL container |
| `make db-reset` / `npm run db-reset` | Wipe volume and re-run migration + seed from scratch |
| `make db-shell` / `npm run db-shell` | Open interactive `psql` shell in `advibe-db` container |
| `make db-logs` / `npm run db-logs` | View database container logs |

---

## 📊 Sourced Dataset & Build Pipeline

Advibe's seed data is 100% sourced from verifiable public disclosures and SEC Form ADV filings (detailed in [`DATA_SOURCES.md`](file:///c:/Users/91807/OneDrive/Desktop/Advibe/DATA_SOURCES.md)):
- **100 Institutional Firms** in `data/investors_raw.csv`
- **100 Listed Partners & Decision Makers** in `data/people_raw.csv`

To regenerate `database/seed.sql`:
```bash
python database/scripts/build_seed.py
```
