begin;

create table if not exists public.casa_energy_history (
  owner_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  house text not null check (house in ('t2', 'duplex')),
  writer_key uuid,
  reading_at bigint not null check (reading_at > 0),
  snapshot jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (owner_id, house)
);
alter table public.casa_energy_history add column if not exists writer_expires_at timestamptz;
update public.casa_energy_history
  set writer_expires_at = updated_at + interval '6 minutes'
  where writer_key is not null and writer_expires_at is null;
alter table public.casa_energy_history enable row level security;
revoke all on public.casa_energy_history from public, anon, authenticated;
grant select (house, reading_at, snapshot, updated_at, writer_expires_at) on public.casa_energy_history to authenticated;

drop policy if exists casa_energy_history_owner on public.casa_energy_history;
create policy casa_energy_history_owner on public.casa_energy_history
  for select to authenticated using (owner_id = (select auth.uid()));

create or replace function public.casa_publish_energy_history(
  p_house text, p_writer uuid, p_reading_at bigint, p_snapshot jsonb
) returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
  current_history public.casa_energy_history%rowtype;
  expires_at timestamptz;
  heartbeat boolean := p_reading_at is null and p_snapshot is null;
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_house is null or p_house not in ('t2', 'duplex')
     or p_writer is null or (not heartbeat and (p_reading_at is null or p_reading_at <= 0
     or p_reading_at > extract(epoch from now()) * 1000 + 300000
     or p_snapshot ->> 'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_snapshot -> 'entries') is distinct from 'object'
     or p_snapshot -> 'entries' = '{}'::jsonb
     or octet_length(p_snapshot::text) > 12582912)) then
    raise exception 'Invalid history' using errcode = '22023';
  end if;

  if not heartbeat then
    insert into public.casa_energy_history
      (owner_id, house, writer_key, writer_expires_at, reading_at, snapshot)
      values (caller, p_house, p_writer, clock_timestamp() + interval '6 minutes', p_reading_at, p_snapshot)
    on conflict (owner_id, house) do nothing;
    if found then
      return 'saved';
    end if;
  end if;

  select * into current_history from public.casa_energy_history
    where owner_id = caller and house = p_house for update;
  if not found then
    return 'unchanged';
  end if;
  expires_at := clock_timestamp() + interval '6 minutes';

  if current_history.writer_key is distinct from p_writer
     and current_history.writer_expires_at > clock_timestamp() then
    return 'other_writer';
  end if;

  if not heartbeat and p_reading_at > current_history.reading_at then
    update public.casa_energy_history
      set writer_key = p_writer, writer_expires_at = expires_at,
          snapshot = p_snapshot, reading_at = p_reading_at, updated_at = now()
      where owner_id = caller and house = p_house;
    return 'saved';
  end if;

  update public.casa_energy_history
    set writer_key = p_writer, writer_expires_at = expires_at
    where owner_id = caller and house = p_house;
  return 'unchanged';
end;
$$;
revoke all on function public.casa_publish_energy_history(text, uuid, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.casa_publish_energy_history(text, uuid, bigint, jsonb) to authenticated;

create or replace function public.casa_release_energy_writer(p_house text, p_writer uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.casa_energy_history
    set writer_key = null, writer_expires_at = null
    where owner_id = auth.uid() and house = p_house and writer_key = p_writer;
$$;
revoke all on function public.casa_release_energy_writer(text, uuid)
  from public, anon, authenticated;
grant execute on function public.casa_release_energy_writer(text, uuid) to authenticated;

commit;
