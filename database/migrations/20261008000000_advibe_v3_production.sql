-- Advibe PostgreSQL Migration V3: Production Hardening, HeyReach, Unlocks, Credit Ledger, Scheduled Jobs
-- Version: 20261008000000_advibe_v3_production.sql
-- Description:
-- 1. Drops obsolete addy_learnings table (Memory removed).
-- 2. Modifies watchlist to strictly support person contacts only (Saved Firms removed).
-- 3. Adds investor_unlocks table with UNIQUE(user_id, person_id) and RLS.
-- 4. Adds immutable credit_ledger table with RLS and trigger blocking UPDATE/DELETE.
-- 5. Adds scheduled_jobs table for in-process background worker with live status.
-- 6. Adds user_integrations table for encrypted HeyReach API storage with RLS.
-- 7. Adds commitments table for Fundraising Command Center aggregates.
-- 8. Adds conversation_history table for ADDY per-user persisted chat.
-- 9. Adds atomic PostgreSQL function perform_email_unlock() with row-level locking, idempotency, and credit debit.

-- 1. DROP OBSOLETE ADDY LEARNINGS (MEMORY REMOVED)
DROP TABLE IF EXISTS public.addy_learnings CASCADE;

-- 2. WATCHLIST CONSTRAINT (PEOPLE ONLY, REMOVE FIRMS)
-- Remove any firm watchlist rows if present
DELETE FROM public.watchlist WHERE item_type != 'person' OR person_id IS NULL;

ALTER TABLE public.watchlist
    DROP COLUMN IF EXISTS investor_id;

-- 3. INVESTOR UNLOCKS TABLE
CREATE TABLE IF NOT EXISTS public.investor_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    person_id UUID NOT NULL REFERENCES public.people(id) ON DELETE CASCADE,
    revealed_email TEXT NOT NULL,
    unlocked_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_user_person_unlock UNIQUE (user_id, person_id)
);

ALTER TABLE public.investor_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage their own unlocks"
    ON public.investor_unlocks
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE INDEX IF NOT EXISTS idx_investor_unlocks_user_person ON public.investor_unlocks(user_id, person_id);

-- 4. IMMUTABLE CREDIT LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    delta NUMERIC(10,2) NOT NULL,
    reason TEXT NOT NULL,
    ref_id TEXT,
    idempotency_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credit ledger"
    ON public.credit_ledger
    FOR SELECT
    USING (user_id = current_user_id());

CREATE POLICY "System can insert credit ledger entries"
    ON public.credit_ledger
    FOR INSERT
    WITH CHECK (user_id = current_user_id());

CREATE INDEX IF NOT EXISTS idx_credit_ledger_user ON public.credit_ledger(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON public.credit_ledger(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Trigger to prevent UPDATE or DELETE on credit_ledger (Strict Immutability)
CREATE OR REPLACE FUNCTION public.prevent_credit_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'credit_ledger is strictly immutable: UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_credit_ledger_mutation ON public.credit_ledger;
CREATE TRIGGER trg_prevent_credit_ledger_mutation
    BEFORE UPDATE OR DELETE ON public.credit_ledger
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_credit_ledger_mutation();

-- 5. SCHEDULED JOBS TABLE (In-Process Autopilot Worker)
CREATE TABLE IF NOT EXISTS public.scheduled_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    track TEXT NOT NULL DEFAULT 'venture',
    cadence TEXT NOT NULL DEFAULT 'weekly_monday',
    batch_size INT NOT NULL DEFAULT 25,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, paused, cancelled, failed
    last_run_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    run_count INT NOT NULL DEFAULT 0,
    last_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.scheduled_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own scheduled jobs"
    ON public.scheduled_jobs
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_status ON public.scheduled_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user ON public.scheduled_jobs(user_id);

-- 6. USER INTEGRATIONS (HeyReach encrypted at rest)
CREATE TABLE IF NOT EXISTS public.user_integrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'heyreach'
    api_key_encrypted TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'connected', -- 'connected', 'disconnected'
    account_info JSONB DEFAULT '{}',
    connected_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    CONSTRAINT uq_user_provider UNIQUE (user_id, provider)
);

ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own integrations"
    ON public.user_integrations
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- 7. COMMITMENTS TABLE (Fundraising Command Center)
CREATE TABLE IF NOT EXISTS public.commitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
    investor_name TEXT NOT NULL,
    amount NUMERIC(14,2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'soft_circle', -- verbal, soft_circle, term_sheet, committed, closed
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own commitments"
    ON public.commitments
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

-- 8. CONVERSATION HISTORY TABLE (ADDY Chat Persistence)
CREATE TABLE IF NOT EXISTS public.conversation_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL, -- 'user', 'assistant'
    content TEXT NOT NULL,
    step TEXT NOT NULL DEFAULT 'chat',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own conversation history"
    ON public.conversation_history
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE INDEX IF NOT EXISTS idx_conversation_history_user ON public.conversation_history(user_id, created_at);

-- 9. ATOMIC STORED PROCEDURE: perform_email_unlock
-- Handles:
-- - Row lock on user_subscriptions (FOR UPDATE)
-- - Existing unlock detection (idempotent, 0 cost)
-- - Idempotency key lookup in credit_ledger
-- - Sparks balance check (>= 1.0)
-- - Insert unlock, insert immutable ledger row, decrement balance
CREATE OR REPLACE FUNCTION public.perform_email_unlock(
    p_user_id UUID,
    p_person_id UUID,
    p_revealed_email TEXT,
    p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_existing_unlock RECORD;
    v_sub RECORD;
    v_new_balance NUMERIC(10,2);
    v_unlock_id UUID;
BEGIN
    -- 1. Check if already unlocked by this user
    SELECT id, revealed_email, unlocked_at INTO v_existing_unlock
    FROM public.investor_unlocks
    WHERE user_id = p_user_id AND person_id = p_person_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'already_unlocked', true,
            'revealed_email', v_existing_unlock.revealed_email,
            'sparks_charged', 0.0,
            'remaining_sparks', (SELECT COALESCE(sparks_balance, 0.0) FROM public.user_subscriptions WHERE user_id = p_user_id)
        );
    END IF;

    -- 2. Lock user subscription balance row
    SELECT id, sparks_balance INTO v_sub
    FROM public.user_subscriptions
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Initialize subscription row with default free trial balance if missing
        INSERT INTO public.user_subscriptions (user_id, plan_tier, sparks_balance, sparks_monthly_quota)
        VALUES (p_user_id, 'free_trial', 10.0, 10.0)
        RETURNING id, sparks_balance INTO v_sub;
    END IF;

    -- Check if idempotency key was already processed in credit_ledger
    IF p_idempotency_key IS NOT NULL THEN
        IF EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = p_user_id AND idempotency_key = p_idempotency_key) THEN
            -- Idempotency key was used; fetch the unlock
            SELECT revealed_email INTO v_existing_unlock
            FROM public.investor_unlocks
            WHERE user_id = p_user_id AND person_id = p_person_id;
            
            RETURN jsonb_build_object(
                'success', true,
                'already_unlocked', true,
                'revealed_email', COALESCE(v_existing_unlock.revealed_email, p_revealed_email),
                'sparks_charged', 0.0,
                'remaining_sparks', v_sub.sparks_balance
            );
        END IF;
    END IF;

    -- 3. Balance verification
    IF v_sub.sparks_balance < 1.0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'insufficient_sparks',
            'detail', 'Insufficient Sparks balance to unlock this email.',
            'remaining_sparks', v_sub.sparks_balance
        );
    END IF;

    -- 4. Insert unlock record
    v_unlock_id := gen_random_uuid();
    INSERT INTO public.investor_unlocks (id, user_id, person_id, revealed_email, unlocked_at)
    VALUES (v_unlock_id, p_user_id, p_person_id, p_revealed_email, NOW());

    -- 5. Decrement balance
    v_new_balance := v_sub.sparks_balance - 1.0;
    UPDATE public.user_subscriptions
    SET sparks_balance = v_new_balance, updated_at = NOW()
    WHERE user_id = p_user_id;

    -- 6. Insert immutable credit ledger entry
    INSERT INTO public.credit_ledger (user_id, delta, reason, ref_id, idempotency_key, created_at)
    VALUES (p_user_id, -1.0, 'email_unlock', p_person_id::text, p_idempotency_key, NOW());

    RETURN jsonb_build_object(
        'success', true,
        'already_unlocked', false,
        'revealed_email', p_revealed_email,
        'sparks_charged', 1.0,
        'remaining_sparks', v_new_balance
    );
END;
$$ LANGUAGE plpgsql;
