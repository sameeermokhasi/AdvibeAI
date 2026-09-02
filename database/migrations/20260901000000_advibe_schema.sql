-- Advibe PostgreSQL Migration Schema
-- Version: 20260901000000_advibe_schema.sql
-- Description: Complete schema for Advibe AI Investor Discovery & Relationship OS (Self-Hosted PostgreSQL 15+)

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing types if re-running
DO $$ BEGIN
    CREATE TYPE campaign_status_enum AS ENUM ('draft', 'active', 'paused', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_channel_enum AS ENUM ('email', 'linkedin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status_enum AS ENUM ('draft', 'approved', 'sent', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE outcome_type_enum AS ENUM ('no_reply', 'replied', 'interested', 'not_interested', 'meeting_requested', 'wrong_person');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Helper function to retrieve the current authenticated user ID in standard PostgreSQL.
-- The FastAPI backend sets this session variable per-request after JWT validation via:
--   SET LOCAL app.current_user_id = '<user-uuid>';
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_user_id', true), '')::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger helper function for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. USERS (Founder accounts)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 2. COMPANIES (One per user's raise)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    website_url TEXT,
    deck_file_url TEXT,
    stage TEXT,
    sector TEXT,
    geography TEXT,
    check_size_min NUMERIC,
    check_size_max NUMERIC,
    thesis_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

DROP TRIGGER IF EXISTS tr_companies_updated_at ON public.companies;
CREATE TRIGGER tr_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. INVESTORS (Firm-level record)
CREATE TABLE IF NOT EXISTS public.investors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_name TEXT NOT NULL,
    fund_type TEXT,
    aum NUMERIC,
    stage_focus TEXT[] NOT NULL DEFAULT '{}',
    sector_focus TEXT[] NOT NULL DEFAULT '{}',
    geography_focus TEXT[] NOT NULL DEFAULT '{}',
    typical_check_min NUMERIC,
    typical_check_max NUMERIC,
    website_url TEXT,
    source TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. PEOPLE (Individuals/partners at a firm)
CREATE TABLE IF NOT EXISTS public.people (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role_title TEXT,
    email TEXT,
    linkedin_url TEXT,
    is_decision_maker BOOLEAN NOT NULL DEFAULT false,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. FIT_SCORES (Per company-investor pair)
CREATE TABLE IF NOT EXISTS public.fit_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    fit_score NUMERIC(5,2) NOT NULL CHECK (fit_score >= 0 AND fit_score <= 100),
    rationale TEXT,
    rule_based_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (rule_based_score >= 0 AND rule_based_score <= 100),
    llm_adjusted_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (llm_adjusted_score >= 0 AND llm_adjusted_score <= 100),
    computed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_company_investor_fit UNIQUE (company_id, investor_id)
);

-- 6. CAMPAIGNS (An outreach batch)
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    status campaign_status_enum NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

DROP TRIGGER IF EXISTS tr_campaigns_updated_at ON public.campaigns;
CREATE TRIGGER tr_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 7. MESSAGES (Individual outreach messages)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    channel message_channel_enum NOT NULL DEFAULT 'email',
    subject TEXT,
    body TEXT NOT NULL,
    status message_status_enum NOT NULL DEFAULT 'draft',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. OUTCOMES (Replies and results)
CREATE TABLE IF NOT EXISTS public.outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
    outcome_type outcome_type_enum NOT NULL,
    reply_text TEXT,
    classified_by_llm BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- INDEXES (Foreign keys, performance, and ranked match queries)
CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies(user_id);
CREATE INDEX IF NOT EXISTS idx_people_investor_id ON public.people(investor_id);
CREATE INDEX IF NOT EXISTS idx_people_email ON public.people(email);
CREATE INDEX IF NOT EXISTS idx_fit_scores_company_id ON public.fit_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_fit_scores_investor_id ON public.fit_scores(investor_id);
CREATE INDEX IF NOT EXISTS idx_fit_scores_company_ranked ON public.fit_scores(company_id, fit_score DESC);
CREATE INDEX IF NOT EXISTS idx_campaigns_company_id ON public.campaigns(company_id);
CREATE INDEX IF NOT EXISTS idx_messages_campaign_id ON public.messages(campaign_id);
CREATE INDEX IF NOT EXISTS idx_messages_person_id ON public.messages(person_id);
CREATE INDEX IF NOT EXISTS idx_messages_status ON public.messages(status);
CREATE INDEX IF NOT EXISTS idx_outcomes_message_id ON public.outcomes(message_id);
CREATE INDEX IF NOT EXISTS idx_outcomes_type ON public.outcomes(outcome_type);

-- GIN Indexes for array filtering in Match Engine
CREATE INDEX IF NOT EXISTS idx_investors_stage_focus ON public.investors USING GIN(stage_focus);
CREATE INDEX IF NOT EXISTS idx_investors_sector_focus ON public.investors USING GIN(sector_focus);
CREATE INDEX IF NOT EXISTS idx_investors_geography_focus ON public.investors USING GIN(geography_focus);

-- ROW LEVEL SECURITY (RLS) POLICIES

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fit_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outcomes ENABLE ROW LEVEL SECURITY;

-- 1. Users Policy
CREATE POLICY "Users can view and update own profile"
    ON public.users
    FOR ALL
    USING (public.current_user_id() = id)
    WITH CHECK (public.current_user_id() = id);

-- 2. Companies Policy (User owns company)
CREATE POLICY "Users can manage their own companies"
    ON public.companies
    FOR ALL
    USING (public.current_user_id() = user_id)
    WITH CHECK (public.current_user_id() = user_id);

-- 3. Investors & People Policy (Universally readable by founders)
CREATE POLICY "Anyone can view investors"
    ON public.investors
    FOR SELECT
    USING (true);

CREATE POLICY "Anyone can view people"
    ON public.people
    FOR SELECT
    USING (true);

-- 4. Fit Scores Policy (Scoped through company ownership)
CREATE POLICY "Users can view and manage fit scores for their companies"
    ON public.fit_scores
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = fit_scores.company_id
            AND c.user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = fit_scores.company_id
            AND c.user_id = public.current_user_id()
        )
    );

-- 5. Campaigns Policy (Scoped through company ownership)
CREATE POLICY "Users can view and manage campaigns for their companies"
    ON public.campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = campaigns.company_id
            AND c.user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = campaigns.company_id
            AND c.user_id = public.current_user_id()
        )
    );

-- 6. Messages Policy (Scoped through campaign -> company ownership)
CREATE POLICY "Users can view and manage messages for their campaigns"
    ON public.messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.companies comp ON c.company_id = comp.id
            WHERE c.id = messages.campaign_id
            AND comp.user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.campaigns c
            JOIN public.companies comp ON c.company_id = comp.id
            WHERE c.id = messages.campaign_id
            AND comp.user_id = public.current_user_id()
        )
    );

-- 7. Outcomes Policy (Scoped through message -> campaign -> company ownership)
CREATE POLICY "Users can view and manage outcomes for their messages"
    ON public.outcomes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.campaigns c ON m.campaign_id = c.id
            JOIN public.companies comp ON c.company_id = comp.id
            WHERE m.id = outcomes.message_id
            AND comp.user_id = public.current_user_id()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.messages m
            JOIN public.campaigns c ON m.campaign_id = c.id
            JOIN public.companies comp ON c.company_id = comp.id
            WHERE m.id = outcomes.message_id
            AND comp.user_id = public.current_user_id()
        )
    );
