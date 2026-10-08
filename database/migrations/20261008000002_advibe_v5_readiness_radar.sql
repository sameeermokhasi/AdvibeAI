-- Advibe PostgreSQL Migration V5: Raise Readiness Radar Evaluations
-- Version: 20261008000002_advibe_v5_readiness_radar.sql
-- Description:
-- 1. Adds workspace_id to companies if not present.
-- 2. Creates readiness_evaluations table for persisting multi-dimensional evaluations.
-- 3. Enables Row Level Security (RLS) on readiness_evaluations with user ownership policy.

ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.readiness_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    overall_score NUMERIC(5,2) NOT NULL,
    dimensions JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.readiness_evaluations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'readiness_evaluations' 
        AND policyname = 'Users can view and manage own readiness evaluations'
    ) THEN
        CREATE POLICY "Users can view and manage own readiness evaluations"
            ON public.readiness_evaluations
            USING (user_id = current_user_id())
            WITH CHECK (user_id = current_user_id());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_readiness_evaluations_workspace_id ON public.readiness_evaluations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_readiness_evaluations_company_id ON public.readiness_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_readiness_evaluations_user_id ON public.readiness_evaluations(user_id);
