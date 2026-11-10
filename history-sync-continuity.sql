begin;

-- Run after history-sync.sql. Existing rows begin tracking on their next save.
alter table public.casa_energy_history
  add column if not exists continuous_since timestamptz;
grant select (continuous_since) on public.casa_energy_history to authenticated;

create or replace function public.casa_track_energy_continuity()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.continuous_since := new.updated_at;
  elsif new.reading_at > old.reading_at then
    if old.continuous_since is null
       or new.updated_at - old.updated_at > interval '6 minutes' then
      new.continuous_since := new.updated_at;
    else
      new.continuous_since := old.continuous_since;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.casa_track_energy_continuity() from public, anon, authenticated;

drop trigger if exists casa_energy_history_continuity on public.casa_energy_history;
create trigger casa_energy_history_continuity
  before insert or update of reading_at on public.casa_energy_history
  for each row execute function public.casa_track_energy_continuity();

commit;
