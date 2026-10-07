-- Advibe PostgreSQL Migration Schema V2: 8raise Full Parity
-- Version: 20260906000000_advibe_v2_parity.sql
-- Description: Adds raise tracks (Venture, Real Estate, Fund LP), Workspaces, Team Seats,
-- Sparks accounting, Twin Finder, Resolve, Scheduled Autopilot, ADDY memory/learnings,
-- Multi-touch outreach sequences, and Playbook library tables.

DO $$ BEGIN
    CREATE TYPE raise_track_enum AS ENUM ('venture', 'real_estate', 'fund_lp');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Alter companies and investors to support Tracks
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS track raise_track_enum NOT NULL DEFAULT 'venture';

ALTER TABLE public.investors
    ADD COLUMN IF NOT EXISTS track raise_track_enum NOT NULL DEFAULT 'venture',
    ADD COLUMN IF NOT EXISTS asset_classes TEXT[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS allocator_type TEXT;

-- 2. Workspaces & Team Seats
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    owner_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    monthly_sparks_cap INT DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 3. Sparks Accounting, Quotas & Subscriptions
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
    plan_tier TEXT NOT NULL DEFAULT 'free_trial', -- 'free_trial', 'solo', 'starter', 'growth', 'pro'
    billing_interval TEXT NOT NULL DEFAULT 'monthly', -- 'monthly', 'quarterly', 'annual'
    sparks_balance NUMERIC(10,2) NOT NULL DEFAULT 10.0,
    sparks_monthly_quota NUMERIC(10,2) NOT NULL DEFAULT 10.0,
    addy_messages_balance INT NOT NULL DEFAULT 25,
    playbook_claims_balance INT NOT NULL DEFAULT 1,
    discount_claimed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.sparks_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount NUMERIC(10,2) NOT NULL, -- negative for debit, positive for credit/topup
    action_type TEXT NOT NULL, -- 'search_investors', 'enrich_partner', 'enrich_firm', 'twin_finder_firm', 'topup', 'initial_grant'
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 4. Twin Finder: Lookalike Company Mapping & Investor Firms
CREATE TABLE IF NOT EXISTS public.comparable_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    prompt_brief TEXT NOT NULL,
    company_name TEXT NOT NULL,
    stage TEXT,
    sector TEXT,
    description TEXT,
    funding_amount TEXT,
    lead_investor_names TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.lookalike_firm_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comp_company_id UUID NOT NULL REFERENCES public.comparable_companies(id) ON DELETE CASCADE,
    firm_name TEXT NOT NULL,
    funded_stage TEXT NOT NULL,
    active_stage_check BOOLEAN NOT NULL DEFAULT true,
    fit_reason TEXT,
    approved BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 5. Resolve: Bulk Decision-Maker Enrichment
CREATE TABLE IF NOT EXISTS public.resolve_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    batch_name TEXT NOT NULL,
    total_firms INT NOT NULL DEFAULT 0,
    enriched_count INT NOT NULL DEFAULT 0,
    placement_agents_filtered INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed', -- 'processing', 'completed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.resolve_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.resolve_batches(id) ON DELETE CASCADE,
    firm_name TEXT NOT NULL,
    partner_name TEXT,
    role_title TEXT,
    verified_email TEXT,
    linkedin_url TEXT,
    is_placement_agent BOOLEAN NOT NULL DEFAULT false,
    aum NUMERIC,
    stage_focus TEXT[] NOT NULL DEFAULT '{}',
    sector_focus TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 6. Scheduled Autopilot Runs
CREATE TABLE IF NOT EXISTS public.scheduled_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    track raise_track_enum NOT NULL DEFAULT 'venture',
    frequency TEXT NOT NULL DEFAULT 'weekly', -- 'weekly'
    day_of_week TEXT NOT NULL DEFAULT 'Monday',
    time_of_day TEXT NOT NULL DEFAULT '09:00',
    batch_size INT NOT NULL DEFAULT 25,
    active BOOLEAN NOT NULL DEFAULT true,
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 7. ADDY Memory & Closed-Loop Learning
CREATE TABLE IF NOT EXISTS public.addy_learnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    segment_tag TEXT NOT NULL, -- e.g. 'corporate_vc', 'fintech_seed', 'family_office'
    reply_signal TEXT NOT NULL, -- 'interested', 'meeting_booked', 'not_interested'
    bias_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0, -- > 1.0 biases toward, < 1.0 downweights
    notes TEXT,
    learned_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 8. Multi-touch Outreach Sequences
CREATE TABLE IF NOT EXISTS public.outreach_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]',
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 9. Watchlist (Saved Leads & Firms) & Exclusions
CREATE TABLE IF NOT EXISTS public.watchlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL, -- 'investor', 'person'
    investor_id UUID REFERENCES public.investors(id) ON DELETE CASCADE,
    person_id UUID REFERENCES public.people(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.exclusion_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL, -- 'firm', 'person', 'domain'
    entity_value TEXT NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- 10. Playbook Resources & Claims
CREATE TABLE IF NOT EXISTS public.playbook_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL, -- 'Guide', 'Curated List', 'Template'
    description TEXT NOT NULL,
    is_guide BOOLEAN NOT NULL DEFAULT true,
    required_plan_tier TEXT NOT NULL DEFAULT 'free_trial',
    download_url TEXT,
    items_count INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.playbook_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES public.playbook_resources(id) ON DELETE CASCADE,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_user_resource UNIQUE (user_id, resource_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_investors_track ON public.investors(track);
CREATE INDEX IF NOT EXISTS idx_companies_track ON public.companies(track);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON public.user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sparks_ledger_user ON public.sparks_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_searches_active ON public.scheduled_searches(active);
CREATE INDEX IF NOT EXISTS idx_watchlist_user ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_exclusions_user ON public.exclusion_lists(user_id);

-- Seed Real Estate and Fund (LP) Track institutional investors
INSERT INTO public.investors (id, firm_name, fund_type, aum, stage_focus, sector_focus, geography_focus, typical_check_min, typical_check_max, website_url, source, track, asset_classes, allocator_type) VALUES
-- Real Estate Track
('a0000002-0000-0000-0000-000000000001', 'Brookfield Real Estate Partners', 'Real Estate PE', 260000000000, ARRAY['Value-Add', 'Opportunistic', 'Core Plus'], ARRAY['Multifamily', 'Commercial Office', 'Industrial & Logistics', 'Hospitality'], ARRAY['US', 'Europe', 'Global'], 10000000, 100000000, 'https://brookfield.com', 'SEC Form ADV 2026', 'real_estate', ARRAY['Multifamily', 'Industrial', 'Office'], NULL),
('a0000002-0000-0000-0000-000000000002', 'Starwood Capital Group', 'Real Estate PE', 115000000000, ARRAY['Opportunistic', 'Value-Add'], ARRAY['Multifamily', 'Industrial', 'Hospitality', 'Residential'], ARRAY['US', 'Europe'], 15000000, 80000000, 'https://starwoodcapital.com', 'SEC Form ADV 2026', 'real_estate', ARRAY['Multifamily', 'Hospitality', 'Residential'], NULL),
('a0000002-0000-0000-0000-000000000003', 'Blackstone Real Estate (BREP)', 'Real Estate PE', 330000000000, ARRAY['Core Plus', 'Opportunistic', 'Debt'], ARRAY['Logistics', 'Rental Housing', 'Data Centers', 'Life Sciences'], ARRAY['US', 'Europe', 'Asia', 'Global'], 25000000, 200000000, 'https://blackstone.com/real-estate', 'SEC Form ADV 2026', 'real_estate', ARRAY['Logistics', 'Multifamily', 'Data Centers'], NULL),
('a0000002-0000-0000-0000-000000000004', 'Prologis Ventures & Real Estate', 'REIT / PropTech', 190000000000, ARRAY['Core', 'Development', 'Seed'], ARRAY['Industrial Logistics', 'Supply Chain Tech', 'PropTech'], ARRAY['US', 'Europe', 'Global'], 5000000, 50000000, 'https://prologis.com', 'Public Disclosures 2026', 'real_estate', ARRAY['Industrial', 'Logistics', 'PropTech'], NULL),
('a0000002-0000-0000-0000-000000000005', 'EQT Exeter', 'Real Estate PE', 30000000000, ARRAY['Value-Add', 'Core Plus'], ARRAY['Industrial', 'Life Science', 'Multifamily', 'Suburban Office'], ARRAY['US', 'Europe'], 5000000, 40000000, 'https://eqtgroup.com', 'Public Disclosures 2026', 'real_estate', ARRAY['Industrial', 'Life Sciences', 'Multifamily'], NULL),

-- Fund (LP) Track (Institutional Allocators)
('a0000003-0000-0000-0000-000000000001', 'Yale Investments Office', 'Endowment', 41000000000, ARRAY['First-Time Funds', 'Emerging Managers', 'Fund II+'], ARRAY['Venture Capital', 'Private Equity', 'Real Assets'], ARRAY['US', 'Global'], 20000000, 100000000, 'https://investments.yale.edu', 'Annual Endowment Report 2026', 'fund_lp', '{}', 'University Endowment'),
('a0000003-0000-0000-0000-000000000002', 'Harvard Management Company (HMC)', 'Endowment', 50700000000, ARRAY['Emerging Managers', 'Anchor LP', 'Fund II+'], ARRAY['Private Equity', 'Venture Capital', 'Natural Resources'], ARRAY['US', 'Global'], 25000000, 150000000, 'https://hmc.harvard.edu', 'Annual Financial Report 2026', 'fund_lp', '{}', 'University Endowment'),
('a0000003-0000-0000-0000-000000000003', 'CalPERS (California Public Employees)', 'Pension Fund', 490000000000, ARRAY['Growth Equity', 'Mega Funds', 'Core Allocations'], ARRAY['Private Equity', 'Global Equity', 'Real Assets', 'Private Debt'], ARRAY['US', 'Global'], 50000000, 300000000, 'https://calpers.ca.gov', 'Public Board Disclosures 2026', 'fund_lp', '{}', 'Public Pension'),
('a0000003-0000-0000-0000-000000000004', 'Singapore GIC Sovereign Wealth', 'Sovereign Wealth Fund', 770000000000, ARRAY['Anchor LP', 'Direct Co-Invest', 'Venture Funds'], ARRAY['Tech VC', 'Growth Equity', 'Infrastructure', 'Real Estate'], ARRAY['Global', 'US', 'Asia'], 40000000, 250000000, 'https://gic.com.sg', 'Report on the Management of Government Reserves 2026', 'fund_lp', '{}', 'Sovereign Wealth'),
('a0000003-0000-0000-0000-000000000005', 'Horsley Bridge Partners', 'Fund of Funds', 15000000000, ARRAY['Seed VC', 'Early-Stage VC', 'Emerging Managers'], ARRAY['Technology', 'Life Sciences', 'Software'], ARRAY['US', 'Europe', 'Global'], 10000000, 50000000, 'https://horsleybridge.com', 'SEC Form ADV 2026', 'fund_lp', '{}', 'Fund of Funds')
ON CONFLICT (id) DO NOTHING;

-- Decision Makers for RE & LP tracks
INSERT INTO public.people (id, investor_id, full_name, role_title, email, linkedin_url, is_decision_maker, verified) VALUES
-- Real Estate partners
('b0000002-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'Brian Kingston', 'CEO & Managing Partner, Real Estate', 'brian.kingston@brookfield.com', 'https://linkedin.com/in/briankingston', true, true),
('b0000002-0000-0000-0000-000000000002', 'a0000002-0000-0000-0000-000000000002', 'Barry Sternlicht', 'Chairman & CEO', 'bsternlicht@starwood.com', 'https://linkedin.com/in/barrysternlicht', true, true),
('b0000002-0000-0000-0000-000000000003', 'a0000002-0000-0000-0000-000000000003', 'Kathleen McCarthy', 'Global Co-Head of Real Estate', 'kmccarthy@blackstone.com', 'https://linkedin.com/in/kathleenmccarthy', true, true),
('b0000002-0000-0000-0000-000000000004', 'a0000002-0000-0000-0000-000000000004', 'William O''Donnell', 'Managing Director, Prologis Ventures', 'wodonnell@prologis.com', 'https://linkedin.com/in/williamodonnell', true, true),
('b0000002-0000-0000-0000-000000000005', 'a0000002-0000-0000-0000-000000000005', 'Ward Fitzgerald', 'CEO, EQT Exeter', 'wfitzgerald@eqtexeter.com', 'https://linkedin.com/in/wardfitzgerald', true, true),

-- LP Allocators
('b0000003-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'Matthew Mendelsohn', 'Chief Investment Officer', 'investments@yale.edu', 'https://linkedin.com/in/matthewmendelsohn', true, true),
('b0000003-0000-0000-0000-000000000002', 'a0000003-0000-0000-0000-000000000002', 'N.P. Narvekar', 'CEO, Harvard Management Company', 'info@hmc.harvard.edu', 'https://linkedin.com/in/narvekar', true, true),
('b0000003-0000-0000-0000-000000000003', 'a0000003-0000-0000-0000-000000000003', 'Nicole Musicco', 'Chief Investment Officer', 'nicole.musicco@calpers.ca.gov', 'https://linkedin.com/in/nicolemusicco', true, true),
('b0000003-0000-0000-0000-000000000004', 'a0000003-0000-0000-0000-000000000004', 'Lim Chow Kiat', 'Chief Executive Officer', 'comms@gic.com.sg', 'https://linkedin.com/in/limchowkiat', true, true),
('b0000003-0000-0000-0000-000000000005', 'a0000003-0000-0000-0000-000000000005', 'Lance Cottrill', 'Managing Director', 'info@horsleybridge.com', 'https://linkedin.com/in/lancecottrill', true, true)
ON CONFLICT (id) DO NOTHING;

-- Seed Playbook Library resources
INSERT INTO public.playbook_resources (id, title, category, description, is_guide, required_plan_tier, download_url, items_count) VALUES
('c0000001-0000-0000-0000-000000000001', 'The 2026 Seed Round Playbook', 'Guide', 'Comprehensive step-by-step masterclass on valuation calibration, pitch deck structuring, and running competitive processes.', true, 'free_trial', '/playbooks/seed-round-playbook-2026.pdf', 24),
('c0000001-0000-0000-0000-000000000002', 'Top 100 Active AI & B2B SaaS Seed Lead Investors', 'Curated List', 'Verified contacts, typical check sizes ($750K-$3M), and investment criteria for tier-1 North American & European seed funds.', false, 'solo', '/playbooks/top-100-ai-seed-vcs.xlsx', 100),
('c0000001-0000-0000-0000-000000000003', 'Institutional LP Allocators Directory (Endowments & FoF)', 'Curated List', 'Direct contacts for 75+ university endowments, family offices, and sovereign allocators backing emerging managers and fund IIs.', false, 'starter', '/playbooks/institutional-lp-allocators-directory.xlsx', 75),
('c0000001-0000-0000-0000-000000000004', 'Real Estate Private Equity & Capital Sponsors Database', 'Curated List', 'Multifamily and commercial capital partners with active deployment allocations and asset class filters.', false, 'growth', '/playbooks/real-estate-capital-sponsors.xlsx', 120),
('c0000001-0000-0000-0000-000000000005', 'High-Converting Cold Outreach Sequence Templates', 'Guide', 'Proven 3-touch connection request and follow-up copy templates yielding >38% response rates from venture partners.', true, 'free_trial', '/playbooks/outreach-sequence-templates.pdf', 12)
ON CONFLICT (id) DO NOTHING;
