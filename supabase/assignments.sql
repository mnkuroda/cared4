-- Run in Supabase SQL Editor to enable helper day/time assignments.

create table if not exists public.assignments (
  id uuid primary key,
  household_id text not null references public.households (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  care_date date not null,
  care_time text not null,
  person_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists assignments_household_date_idx
  on public.assignments (household_id, care_date, care_time);

alter table public.assignments enable row level security;

grant select, insert, delete on public.assignments to anon, authenticated;

drop policy if exists "assignments_select" on public.assignments;
drop policy if exists "assignments_insert" on public.assignments;
drop policy if exists "assignments_delete" on public.assignments;
create policy "assignments_select" on public.assignments for select using (true);
create policy "assignments_insert" on public.assignments for insert with check (true);
create policy "assignments_delete" on public.assignments for delete using (true);
