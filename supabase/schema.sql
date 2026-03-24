create extension if not exists pgcrypto;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  region text,
  source text,
  created_at timestamptz not null default now()
);

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  staff_id uuid not null,
  type text not null check (type in ('incoming', 'outgoing')),
  purpose text not null check (purpose in ('inquiry', 'complaint', 'order', 'follow-up')),
  summary text not null,
  outcome text not null check (outcome in ('interested', 'not_interested', 'follow_up', 'closed')),
  duration integer,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  related_call_id uuid references public.calls(id) on delete set null,
  assigned_to uuid not null,
  task text not null,
  due_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  call_id uuid not null unique references public.calls(id) on delete cascade,
  sentiment text not null check (sentiment in ('positive', 'neutral', 'negative')),
  urgency text not null check (urgency in ('low', 'medium', 'high')),
  category text not null check (category in ('sales', 'support', 'logistics', 'partnership')),
  suggested_action text not null
);

create index if not exists calls_customer_id_idx on public.calls(customer_id);
create index if not exists calls_staff_id_idx on public.calls(staff_id);
create index if not exists tasks_customer_id_idx on public.tasks(customer_id);
create index if not exists tasks_assigned_to_idx on public.tasks(assigned_to);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists ai_insights_urgency_idx on public.ai_insights(urgency);

alter publication supabase_realtime add table public.calls;
alter publication supabase_realtime add table public.tasks;

-- Example RLS shape for future auth wiring:
-- Admin can read everything. Staff can create calls and read/update only their own tasks.
-- Implement policy conditions against auth.uid() once staff_id / assigned_to maps to auth users.
