create extension if not exists pgcrypto;

create table if not exists public.jon_rover_leads (
  id uuid primary key default gen_random_uuid(), session_id text unique not null,
  created_at timestamptz not null default now(), last_seen_at timestamptz not null default now(),
  name text, phone text, email text,
  status text not null default 'new' check (status in ('new','contacted','qualified','appointment','working','sold','lost','nurture')),
  lead_score integer not null default 0, temperature text default 'cold' check (temperature in ('cold','warm','hot')),
  source text default 'jonrover.com', assigned_to text default 'Jon',
  last_request text, summary text, next_best_action text, next_action_at timestamptz,
  budget_min integer, budget_max integer, desired_models text[] default '{}', desired_exterior text[] default '{}', desired_interior text[] default '{}',
  wants_new boolean, wants_used boolean, needs_third_row boolean, trade_in boolean, timeframe text,
  transcript jsonb not null default '[]'::jsonb, notes text
);
create index if not exists jon_rover_leads_status_idx on public.jon_rover_leads(status);
create index if not exists jon_rover_leads_score_idx on public.jon_rover_leads(lead_score desc);
create index if not exists jon_rover_leads_last_seen_idx on public.jon_rover_leads(last_seen_at desc);
create index if not exists jon_rover_leads_next_action_idx on public.jon_rover_leads(next_action_at);

create table if not exists public.crm_activities (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.jon_rover_leads(id) on delete cascade,
 created_at timestamptz default now(), type text not null, title text, body text, metadata jsonb default '{}'::jsonb
);
create index if not exists crm_activities_lead_idx on public.crm_activities(lead_id,created_at desc);

create table if not exists public.crm_vehicle_interest (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.jon_rover_leads(id) on delete cascade,
 vin text not null, title text, stock text, action text not null default 'viewed', score integer default 0,
 first_seen_at timestamptz default now(), last_seen_at timestamptz default now(), metadata jsonb default '{}'::jsonb,
 unique(lead_id,vin,action)
);

create table if not exists public.crm_tasks (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.jon_rover_leads(id) on delete cascade,
 created_at timestamptz default now(), due_at timestamptz, completed_at timestamptz,
 title text not null, priority text default 'normal' check(priority in ('low','normal','high','urgent')), owner text default 'Jon', ai_generated boolean default false
);
create index if not exists crm_tasks_due_idx on public.crm_tasks(completed_at,due_at);

create table if not exists public.crm_appointments (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.jon_rover_leads(id) on delete cascade,
 starts_at timestamptz not null, ends_at timestamptz, status text default 'scheduled', vehicle_vin text, notes text, created_at timestamptz default now()
);

create table if not exists public.crm_inventory_matches (
 id uuid primary key default gen_random_uuid(), lead_id uuid references public.jon_rover_leads(id) on delete cascade,
 vin text not null, match_score integer not null, reason text, notified_at timestamptz, created_at timestamptz default now(), unique(lead_id,vin)
);

alter table public.jon_rover_leads enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_vehicle_interest enable row level security;
alter table public.crm_tasks enable row level security;
alter table public.crm_appointments enable row level security;
alter table public.crm_inventory_matches enable row level security;
-- Browser access stays closed. CRM endpoints use SUPABASE_SERVICE_ROLE_KEY.
