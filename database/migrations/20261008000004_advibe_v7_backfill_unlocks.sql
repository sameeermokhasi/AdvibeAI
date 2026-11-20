-- Advibe V7 Migration: Backfill Investor Unlocks from Credit Ledger Debits
-- Ensures all historical debits for email unlocks have corresponding investor_unlocks rows.

INSERT INTO public.investor_unlocks (id, user_id, person_id, revealed_email, unlocked_at)
SELECT 
    gen_random_uuid(),
    c.user_id,
    c.ref_id::uuid,
    COALESCE(p.email, 'partner.' || substr(c.ref_id, 1, 8) || '@fund.com'),
    c.created_at
FROM public.credit_ledger c
JOIN public.people p ON c.ref_id = p.id::text
LEFT JOIN public.investor_unlocks u ON c.user_id = u.user_id AND c.ref_id::uuid = u.person_id
WHERE c.delta < 0 
  AND c.reason = 'email_unlock'
  AND u.id IS NULL
ON CONFLICT (user_id, person_id) DO NOTHING;

-- Grant initial free trial 10 Sparks to users who signed up but never had grants or debits
UPDATE public.user_subscriptions s
SET sparks_balance = 10.0
FROM public.users u
WHERE s.user_id = u.id 
  AND s.sparks_balance = 0.0 
  AND NOT EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = u.id AND delta < 0);

INSERT INTO public.credit_ledger (id, user_id, delta, reason, ref_id, idempotency_key, created_at)
SELECT gen_random_uuid(), u.id, 10.0, 'signup_welcome_grant', 'signup', 'welcome_' || u.id::text, NOW()
FROM public.users u
JOIN public.user_subscriptions s ON u.id = s.user_id
WHERE s.sparks_balance = 10.0
  AND NOT EXISTS (SELECT 1 FROM public.credit_ledger WHERE user_id = u.id AND reason = 'signup_welcome_grant')
ON CONFLICT DO NOTHING;
