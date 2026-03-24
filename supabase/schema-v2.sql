-- ============================================================
-- Customer Command Center — Schema v2
-- Run this in Supabase SQL Editor (safe to re-run)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Drop old tables (no data yet) ────────────────────────────
DROP TABLE IF EXISTS public.ai_insights CASCADE;
DROP TABLE IF EXISTS public.tasks CASCADE;
DROP TABLE IF EXISTS public.calls CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;

-- ── 1. Profiles ───────────────────────────────────────────────
CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  text,
  role       text NOT NULL DEFAULT 'staff'
               CHECK (role IN ('admin', 'staff', 'sales', 'agronomist', 'operations')),
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-create profile on signup / update
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data->>'role', 'staff')
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
    role      = COALESCE(EXCLUDED.role,      public.profiles.role);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing auth users
INSERT INTO public.profiles (id, full_name, role)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  COALESCE(raw_user_meta_data->>'role', 'staff')
FROM auth.users
ON CONFLICT (id) DO UPDATE SET
  full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
  role      = COALESCE(EXCLUDED.role,      public.profiles.role);

-- ── 2. Customers ──────────────────────────────────────────────
CREATE TABLE public.customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name             text NOT NULL,
  phone            text,
  region           text,
  type             text NOT NULL DEFAULT 'lead'
                     CHECK (type IN ('farmer', 'distributor', 'lead')),
  source           text,
  lead_score       text NOT NULL DEFAULT 'cold'
                     CHECK (lead_score IN ('hot', 'warm', 'cold')),
  next_action_date timestamptz,
  next_action_note text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── 3. Interactions (primary entity) ─────────────────────────
CREATE TABLE public.interactions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  staff_id    uuid NOT NULL REFERENCES auth.users(id),
  channel     text NOT NULL DEFAULT 'call'
                CHECK (channel IN ('call', 'whatsapp', 'sms', 'in_person')),
  direction   text NOT NULL DEFAULT 'outgoing'
                CHECK (direction IN ('incoming', 'outgoing')),
  content     text NOT NULL,
  outcome     text CHECK (outcome IN ('interested', 'not_interested', 'follow_up', 'closed')),
  duration    integer,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── 4. AI Insights ────────────────────────────────────────────
CREATE TABLE public.ai_insights (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id   uuid NOT NULL UNIQUE REFERENCES public.interactions(id) ON DELETE CASCADE,
  sentiment        text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  urgency          text NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
  category         text NOT NULL CHECK (category IN ('sales', 'support', 'logistics', 'partnership')),
  intent           text,
  suggested_action text NOT NULL
);

-- ── 5. Tasks ──────────────────────────────────────────────────
CREATE TABLE public.tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  interaction_id uuid REFERENCES public.interactions(id) ON DELETE SET NULL,
  assigned_to    uuid NOT NULL REFERENCES auth.users(id),
  title          text NOT NULL,
  description    text,
  due_date       timestamptz NOT NULL,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'in_progress', 'completed')),
  priority       text NOT NULL DEFAULT 'medium'
                   CHECK (priority IN ('low', 'medium', 'high')),
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX interactions_customer_id_idx  ON public.interactions(customer_id);
CREATE INDEX interactions_staff_id_idx     ON public.interactions(staff_id);
CREATE INDEX interactions_created_at_idx   ON public.interactions(created_at DESC);
CREATE INDEX customers_lead_score_idx      ON public.customers(lead_score);
CREATE INDEX customers_next_action_idx     ON public.customers(next_action_date);
CREATE INDEX tasks_assigned_to_idx         ON public.tasks(assigned_to);
CREATE INDEX tasks_status_idx              ON public.tasks(status);
CREATE INDEX tasks_due_date_idx            ON public.tasks(due_date);

-- ── Real-time ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.interactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
