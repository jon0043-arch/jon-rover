alter table public.inventory_vehicles add column if not exists year integer;
alter table public.inventory_vehicles add column if not exists make text;
alter table public.inventory_vehicles add column if not exists model text;
alter table public.inventory_vehicles add column if not exists trim text;

create index if not exists inventory_vehicles_make_idx on public.inventory_vehicles(make);
create index if not exists inventory_vehicles_model_idx on public.inventory_vehicles(model);
