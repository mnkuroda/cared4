-- Run this in Supabase SQL Editor if create/join household fails with
-- "permission denied for table ...".

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.households to anon, authenticated;
grant select, insert on public.check_ins to anon, authenticated;
grant select, insert, delete on public.trips to anon, authenticated;
