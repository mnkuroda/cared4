-- Run in Supabase SQL Editor to enable check-in photos.

alter table public.check_ins
  add column if not exists photo_url text;

insert into storage.buckets (id, name, public)
values ('care-photos', 'care-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "care_photos_select" on storage.objects;
drop policy if exists "care_photos_insert" on storage.objects;

create policy "care_photos_select"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'care-photos');

create policy "care_photos_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'care-photos');
