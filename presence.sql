begin;

create table public.casa_presence (
  owner_id uuid not null references auth.users(id) on delete cascade,
  house text not null check (house in ('t2', 'duplex')),
  kind text not null check (kind in ('layout', 'status')),
  value jsonb not null check (jsonb_typeof(value) = 'object' and octet_length(value::text) <= 1024),
  primary key (owner_id, house, kind)
);

alter table public.casa_presence enable row level security;
revoke all on public.casa_presence from public, anon, authenticated;
grant select, insert, update on public.casa_presence to authenticated;

create policy presence_read_own on public.casa_presence
  for select to authenticated using ((select auth.uid()) = owner_id);

create policy presence_insert_own on public.casa_presence
  for insert to authenticated with check ((select auth.uid()) = owner_id);

create policy presence_update_own on public.casa_presence
  for update to authenticated using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

commit;
