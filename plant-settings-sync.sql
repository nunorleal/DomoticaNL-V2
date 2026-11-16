begin;

create table if not exists public.casa_plant_settings (
  owner_id uuid not null references auth.users(id) on delete cascade,
  house text not null check (house in ('t2', 'duplex')),
  setting text not null check (
    setting in ('room-labels', 'sensor-readings', 'energy-banner', 'ev-banner',
      'blind-banners', 'blind-bars', 'christmas-tree', 'heater', 'dehumidifier', 'cats')
    or (house = 't2' and setting = 'media-icons')
  ),
  shown boolean not null,
  primary key (owner_id, house, setting)
);

alter table public.casa_plant_settings enable row level security;
revoke all on public.casa_plant_settings from public, anon, authenticated;
grant select, insert, update on public.casa_plant_settings to authenticated;

drop policy if exists plant_settings_read_own on public.casa_plant_settings;
create policy plant_settings_read_own on public.casa_plant_settings
  for select to authenticated using (owner_id = (select auth.uid()));

drop policy if exists plant_settings_insert_own on public.casa_plant_settings;
create policy plant_settings_insert_own on public.casa_plant_settings
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists plant_settings_update_own on public.casa_plant_settings;
create policy plant_settings_update_own on public.casa_plant_settings
  for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

commit;
