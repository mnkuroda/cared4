-- Run this once in the Supabase SQL Editor (Dashboard → SQL → New query).

create table if not exists public.households (
  id text primary key,
  name text not null,
  tasks jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.check_ins (
  id uuid primary key,
  household_id text not null references public.households (id) on delete cascade,
  person_name text not null,
  task text not null,
  note text not null default '',
  at timestamptz not null
);

create index if not exists check_ins_household_at_idx
  on public.check_ins (household_id, at desc);

create table if not exists public.trips (
  id uuid primary key,
  household_id text not null references public.households (id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  notes text not null default '',
  slots jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists trips_household_idx
  on public.trips (household_id, created_at desc);

alter table public.households enable row level security;
alter table public.check_ins enable row level security;
alter table public.trips enable row level security;

-- Share-link model: anyone with the household code can read/write.
-- Fine for a private pet-care helper link; not for sensitive data.

drop policy if exists "households_select" on public.households;
drop policy if exists "households_insert" on public.households;
drop policy if exists "households_update" on public.households;
create policy "households_select" on public.households for select using (true);
create policy "households_insert" on public.households for insert with check (true);
create policy "households_update" on public.households for update using (true) with check (true);

drop policy if exists "check_ins_select" on public.check_ins;
drop policy if exists "check_ins_insert" on public.check_ins;
create policy "check_ins_select" on public.check_ins for select using (true);
create policy "check_ins_insert" on public.check_ins for insert with check (true);

drop policy if exists "trips_select" on public.trips;
drop policy if exists "trips_insert" on public.trips;
drop policy if exists "trips_delete" on public.trips;
create policy "trips_select" on public.trips for select using (true);
create policy "trips_insert" on public.trips for insert with check (true);
create policy "trips_delete" on public.trips for delete using (true);
