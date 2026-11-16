begin;
create table if not exists public.casa_plant_preferences (
  owner_id uuid not null references auth.users(id) on delete cascade,
  house text not null check (house in ('t2', 'duplex')),
  setting text not null check (
    setting in ('shelly-disabled', 'environment-mode', 'screensaver-delay', 'banner-scale', 'weather-city', 'meteo-settings')
    or setting ~ '^room-name:[a-z0-9:-]{1,55}$'
  ),
  value jsonb not null check (octet_length(value::text) <= 8192 and (
    (setting = 'shelly-disabled' and jsonb_typeof(value) = 'array')
    or (setting = 'environment-mode' and value in ('"auto"', '"day"', '"night"'))
    or (setting = 'screensaver-delay' and value in ('0','15','30','60','120','300','600','900','1800'))
    or (setting = 'banner-scale' and value in ('60','65','70','75','80','85','90','95','100','105','110','115','120','125','130','135','140','145','150','155','160'))
    or (setting in ('weather-city', 'meteo-settings') and jsonb_typeof(value) = 'object')
    or (setting like 'room-name:%' and jsonb_typeof(value) = 'string')
  )),
  primary key (owner_id, house, setting)
);

alter table public.casa_plant_preferences enable row level security;
revoke all on public.casa_plant_preferences from public, anon, authenticated;
grant select, insert, update on public.casa_plant_preferences to authenticated;

do $policies$
begin
  if not exists (select from pg_policies where schemaname='public' and tablename='casa_plant_preferences' and policyname='plant_preferences_read_own') then
    create policy plant_preferences_read_own on public.casa_plant_preferences
      for select to authenticated using (owner_id = (select auth.uid()));
  end if;
  if not exists (select from pg_policies where schemaname='public' and tablename='casa_plant_preferences' and policyname='plant_preferences_insert_own') then
    create policy plant_preferences_insert_own on public.casa_plant_preferences
      for insert to authenticated with check (owner_id = (select auth.uid()));
  end if;
  if not exists (select from pg_policies where schemaname='public' and tablename='casa_plant_preferences' and policyname='plant_preferences_update_own') then
    create policy plant_preferences_update_own on public.casa_plant_preferences
      for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
  end if;
end;
$policies$;
commit;
