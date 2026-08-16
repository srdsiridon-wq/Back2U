ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'school_admin';
ALTER TYPE public.claim_state ADD VALUE IF NOT EXISTS 'reviewing';
ALTER TYPE public.claim_state ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE public.claim_state ADD VALUE IF NOT EXISTS 'returned';