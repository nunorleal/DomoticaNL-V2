begin;

create table public.casa_presence_photos (
  owner_id uuid not null references auth.users(id) on delete cascade,
  house text not null check (house in ('t2', 'duplex')),
  slot smallint not null check (slot between 0 and 2),
  revision uuid not null,
  photo text check (
    octet_length(photo) <= 48000 and photo ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+=*$'
  ),
  primary key (owner_id, house, slot)
);

alter table public.casa_presence_photos enable row level security;
revoke all on public.casa_presence_photos from public, anon, authenticated;
grant select, insert, update on public.casa_presence_photos to authenticated;

create policy presence_photos_read_own on public.casa_presence_photos
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy presence_photos_insert_own on public.casa_presence_photos
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy presence_photos_update_own on public.casa_presence_photos
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
