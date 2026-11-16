begin;

create table if not exists public.casa_plant_positions (
  owner_id uuid not null references auth.users(id) on delete cascade,
  house text not null check (house in ('t2', 'duplex')),
  setting text not null check (setting in ('heater', 'dehumidifier', 'christmas-tree')),
  position jsonb not null check ((
    jsonb_typeof(position) = 'object'
    and jsonb_typeof(position -> 'room') = 'string'
    and length(position ->> 'room') between 1 and 64
    and jsonb_typeof(position -> 'x') = 'number'
    and jsonb_typeof(position -> 'y') = 'number'
    and (position -> 'x') between '0'::jsonb and '1600'::jsonb
    and (position -> 'y') between '0'::jsonb and '1600'::jsonb
    and position - array['room', 'x', 'y', 'floor'] = '{}'::jsonb
    and (
      (house = 't2' and not (position ? 'floor'))
      or (house = 'duplex' and jsonb_typeof(position -> 'floor') = 'string'
        and (position ->> 'floor') in ('-1', '3', '4'))
    )
  ) is true),
  primary key (owner_id, house, setting)
);

alter table public.casa_plant_positions enable row level security;
revoke all on public.casa_plant_positions from public, anon, authenticated;
grant select, insert, update on public.casa_plant_positions to authenticated;

do $policies$
begin
  if not exists (select from pg_policies where schemaname = 'public'
    and tablename = 'casa_plant_positions' and policyname = 'plant_positions_read_own') then
    create policy plant_positions_read_own on public.casa_plant_positions
      for select to authenticated using (owner_id = (select auth.uid()));
  end if;
  if not exists (select from pg_policies where schemaname = 'public'
    and tablename = 'casa_plant_positions' and policyname = 'plant_positions_insert_own') then
    create policy plant_positions_insert_own on public.casa_plant_positions
      for insert to authenticated with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select from pg_policies where schemaname = 'public'
    and tablename = 'casa_plant_positions' and policyname = 'plant_positions_update_own') then
    create policy plant_positions_update_own on public.casa_plant_positions
      for update to authenticated
      using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
end;
$policies$;

commit;
