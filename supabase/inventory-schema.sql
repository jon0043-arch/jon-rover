create table if not exists public.inventory_vehicles (
  vin text primary key,
  title text not null,
  condition text,
  mileage integer,
  price integer,
  listing_url text not null,
  image_url text,
  stock text,
  exterior text,
  interior text,
  interior_family text,
  features jsonb default '[]'::jsonb,
  active boolean not null default true,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists inventory_active_idx on public.inventory_vehicles(active);
create index if not exists inventory_condition_idx on public.inventory_vehicles(condition);
create table if not exists public.inventory_sync_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  source_total integer,
  parsed_total integer,
  enriched_total integer,
  failed_total integer default 0,
  status text not null default 'running',
  notes text
);
