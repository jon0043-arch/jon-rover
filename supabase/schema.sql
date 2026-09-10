create extension if not exists pgcrypto;

create table if not exists public.jon_rover_leads (
  id uuid primary key default gen_random_uuid(),
  session_id text unique not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  name text,
  phone text,
  email text,
  status text not null default 'new' check (status in ('new','contacted','appointment','sold','lost')),
  lead_score integer not null default 0,
  last_request text,
  transcript jsonb not null default '[]'::jsonb,
  notes text,
  assigned_to text default 'Jon'
);

create index if not exists jon_rover_leads_status_idx on public.jon_rover_leads(status);
create index if not exists jon_rover_leads_score_idx on public.jon_rover_leads(lead_score desc);
create index if not exists jon_rover_leads_last_seen_idx on public.jon_rover_leads(last_seen_at desc);

alter table public.jon_rover_leads enable row level security;

-- Keep browser access closed. Server-side writes use SUPABASE_SERVICE_ROLE_KEY.
