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
alter table public.casa_energy_history enable row level security;
revoke all on public.casa_energy_history from public, anon, authenticated;
grant select (house, reading_at, snapshot, updated_at) on public.casa_energy_history to authenticated;

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
begin
  if caller is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if p_house is null or p_house not in ('t2', 'duplex')
     or p_writer is null or p_reading_at is null or p_reading_at <= 0
     or p_reading_at > extract(epoch from now()) * 1000 + 300000
     or p_snapshot ->> 'schemaVersion' is distinct from '1'
     or jsonb_typeof(p_snapshot -> 'entries') is distinct from 'object'
     or p_snapshot -> 'entries' = '{}'::jsonb
     or octet_length(p_snapshot::text) > 12582912 then
    raise exception 'Invalid history' using errcode = '22023';
  end if;

  insert into public.casa_energy_history as history
    (owner_id, house, writer_key, reading_at, snapshot)
    values (caller, p_house, p_writer, p_reading_at, p_snapshot)
  on conflict (owner_id, house) do update
    set writer_key = excluded.writer_key, snapshot = excluded.snapshot,
        reading_at = excluded.reading_at, updated_at = now()
    where (history.writer_key is null or history.writer_key = excluded.writer_key)
      and history.reading_at < excluded.reading_at;

  if found then
    return 'saved';
  end if;

  if exists (select 1 from public.casa_energy_history
    where owner_id = caller and house = p_house and writer_key = p_writer) then
    return 'unchanged';
  end if;
  return 'other_writer';
end;
$$;
revoke all on function public.casa_publish_energy_history(text, uuid, bigint, jsonb)
  from public, anon, authenticated;
grant execute on function public.casa_publish_energy_history(text, uuid, bigint, jsonb) to authenticated;

commit;
