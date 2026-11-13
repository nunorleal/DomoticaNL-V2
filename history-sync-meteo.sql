begin;

alter table public.casa_energy_history
  add column if not exists meteo_activity jsonb,
  add column if not exists meteo_activity_at timestamptz;
grant select (meteo_activity, meteo_activity_at) on public.casa_energy_history to authenticated;

create or replace function public.casa_reset_meteo_activity_on_writer_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.meteo_activity := null;
  new.meteo_activity_at := null;
  return new;
end;
$$;
revoke all on function public.casa_reset_meteo_activity_on_writer_change() from public, anon, authenticated;

create or replace trigger casa_reset_meteo_activity_on_writer_change
  before update of writer_key on public.casa_energy_history
  for each row when (new.writer_key is not null and new.writer_key is distinct from old.writer_key)
  execute function public.casa_reset_meteo_activity_on_writer_change();

-- Keep the energy-only RPC available for existing app versions.
create or replace function public.casa_publish_energy_and_activity(
  p_house text, p_writer uuid, p_reading_at bigint, p_snapshot jsonb, p_activity jsonb
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if jsonb_typeof(p_activity) is distinct from 'array'
     or octet_length(p_activity::text) > 8192 then
    raise exception 'Invalid activity snapshot' using errcode = '22023';
  end if;
  if jsonb_array_length(p_activity) > 17 then
    raise exception 'Too many activity rows' using errcode = '22023';
  end if;

  result := public.casa_publish_energy_history(p_house, p_writer, p_reading_at, p_snapshot);
  if result in ('saved', 'unchanged') then
    update public.casa_energy_history
      set meteo_activity = p_activity, meteo_activity_at = clock_timestamp()
      where owner_id = auth.uid() and house = p_house and writer_key = p_writer
        and writer_expires_at > clock_timestamp();
  end if;
  return result;
end;
$$;
revoke all on function public.casa_publish_energy_and_activity(text, uuid, bigint, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.casa_publish_energy_and_activity(text, uuid, bigint, jsonb, jsonb)
  to authenticated;

commit;
