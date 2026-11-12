begin;

alter table public.casa_energy_history add column if not exists daily_tariff jsonb;
grant select (daily_tariff) on public.casa_energy_history to authenticated;

create or replace function public.casa_publish_energy_activity_tariff(
  p_house text, p_writer uuid, p_reading_at bigint, p_snapshot jsonb,
  p_activity jsonb, p_tariff jsonb
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
  off_peak numeric;
  peak numeric;
  rates jsonb;
begin
  if jsonb_typeof(p_tariff -> 'offPeak') is distinct from 'number'
     or jsonb_typeof(p_tariff -> 'peak') is distinct from 'number' then
    raise exception 'Invalid daily tariff' using errcode = '22023';
  end if;
  off_peak := (p_tariff ->> 'offPeak')::numeric;
  peak := (p_tariff ->> 'peak')::numeric;
  if off_peak not between 0 and 100 or peak not between 0 and 100 then
    raise exception 'Invalid daily tariff' using errcode = '22023';
  end if;
  rates := jsonb_build_object('offPeak', off_peak, 'peak', peak);

  result := public.casa_publish_energy_and_activity(p_house, p_writer, p_reading_at, p_snapshot, p_activity);
  if result in ('saved', 'unchanged') then
    update public.casa_energy_history set daily_tariff = rates
      where owner_id = auth.uid() and house = p_house and writer_key = p_writer
        and writer_expires_at > clock_timestamp() and daily_tariff is distinct from rates;
  end if;
  return result;
end;
$$;
revoke all on function public.casa_publish_energy_activity_tariff(text, uuid, bigint, jsonb, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.casa_publish_energy_activity_tariff(text, uuid, bigint, jsonb, jsonb, jsonb)
  to authenticated;

commit;
