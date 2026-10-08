-- Advibe PostgreSQL Migration V6: Phone Verification & Anti-Abuse Sparks Ledger
-- Version: 20261008000003_advibe_v6_phone_verification.sql
-- Description:
-- 1. Adds phone and phone_verified_at to public.users with partial UNIQUE index on verified phone.
-- 2. Creates phone_verifications table for secure HMAC-hashed OTP lifecycle.
-- 3. Enables Row Level Security (RLS) on phone_verifications.

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ DEFAULT NULL;

-- One verified phone per account: stops multi-account credit farming
CREATE UNIQUE INDEX IF NOT EXISTS uq_users_verified_phone 
ON public.users(phone) 
WHERE phone_verified_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    phone TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    expires_at TIMESTAMPTZ NOT NULL,
    resend_available_at TIMESTAMPTZ NOT NULL,
    locked_until TIMESTAMPTZ DEFAULT NULL,
    used_at TIMESTAMPTZ DEFAULT NULL,
    ip_address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'phone_verifications' 
        AND policyname = 'Users can view and manage own phone verifications'
    ) THEN
        CREATE POLICY "Users can view and manage own phone verifications"
            ON public.phone_verifications
            USING (user_id = current_user_id())
            WITH CHECK (user_id = current_user_id());
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_id ON public.phone_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications(phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires_at ON public.phone_verifications(expires_at);
