-- Advibe PostgreSQL Migration V4: Razorpay Payments & Billing History
-- Version: 20261008000001_advibe_v4_razorpay.sql
-- Description:
-- 1. Creates payments table for Razorpay checkouts with order_id, payment_id, status, amount_paise, and currency.
-- 2. Enforces UNIQUE(payment_id) constraint to guarantee idempotent ledger crediting.
-- 3. Enables Row Level Security (RLS) on payments table with user ownership policy.

CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    order_id TEXT NOT NULL,
    payment_id TEXT UNIQUE,
    amount_paise BIGINT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    status TEXT NOT NULL DEFAULT 'created', -- 'created', 'paid', 'failed'
    item_type TEXT NOT NULL, -- 'plan', 'sparks_pack'
    item_id TEXT NOT NULL,
    sparks_credited NUMERIC(10,2) DEFAULT 0.0,
    raw_response JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view and manage own payments"
    ON public.payments
    USING (user_id = current_user_id())
    WITH CHECK (user_id = current_user_id());

CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);
