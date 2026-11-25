begin;
create table public.casa_presence_history (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 house text not null check (house in ('t2','duplex')),
 person integer not null check (person between 0 and 2),
 date date not null,
 last_at bigint not null check (last_at>=0),
 value jsonb not null check (jsonb_typeof(value)='object' and octet_length(value::text)<=2048),
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,house,person,date)
);
alter table public.casa_presence_history enable row level security;
revoke all on public.casa_presence_history from public,anon,authenticated;
grant select,insert,update,delete on public.casa_presence_history to authenticated;
create policy presence_history_own on public.casa_presence_history for all to authenticated
 using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create index presence_history_recent on public.casa_presence_history(owner_id,house,updated_at);
create function public.casa_write_presence_history(p_house text,p_rows jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or p_house not in ('t2','duplex') or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then raise exception 'Invalid presence history batch'; end if;
 if exists(select 1 from jsonb_array_elements(p_rows) item where
  (item->>'homeMs')::bigint<0 or (item->>'awayMs')::bigint<0 or (item->>'unknownMs')::bigint<0 or
  (item->>'homeMs')::bigint+(item->>'awayMs')::bigint+(item->>'unknownMs')::bigint>93600000) then raise exception 'Invalid presence duration'; end if;
 insert into public.casa_presence_history(owner_id,house,person,date,last_at,value)
 select auth.uid(),p_house,(item->>'person')::integer,(item->>'date')::date,(item->>'lastAt')::bigint,item from jsonb_array_elements(p_rows) item
 on conflict(owner_id,house,person,date) do update set last_at=excluded.last_at,value=excluded.value,updated_at=clock_timestamp()
 where excluded.last_at>casa_presence_history.last_at;
end;
$$;
revoke all on function public.casa_write_presence_history(text,jsonb) from public,anon;
grant execute on function public.casa_write_presence_history(text,jsonb) to authenticated;
commit;
