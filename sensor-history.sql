begin;
create table public.casa_sensor_history (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 house text not null check (house in ('t2','duplex')),
 sensor text not null check (length(sensor) between 1 and 400),
 period text not null check (period in ('hour','day')),
 bucket bigint not null check (bucket >= 0),
 last_at bigint not null check (last_at >= bucket-3600000),
 value jsonb not null check (jsonb_typeof(value)='object' and octet_length(value::text)<=4096),
 updated_at timestamptz not null default clock_timestamp(),
 unique(owner_id,house,sensor,period,bucket)
);
alter table public.casa_sensor_history enable row level security;
revoke all on public.casa_sensor_history from public,anon,authenticated;
grant select,insert,update,delete on public.casa_sensor_history to authenticated;
create policy sensor_history_own on public.casa_sensor_history for all to authenticated
 using ((select auth.uid())=owner_id) with check ((select auth.uid())=owner_id);
create index sensor_history_recent on public.casa_sensor_history(owner_id,house,updated_at);
create or replace function public.casa_write_sensor_history(p_house text,p_rows jsonb)
returns void language plpgsql security invoker set search_path=public as $$
begin
 if auth.uid() is null or p_house not in ('t2','duplex') or jsonb_typeof(p_rows)<>'array' or jsonb_array_length(p_rows)>100 then
  raise exception 'Invalid sensor history batch';
 end if;
 insert into public.casa_sensor_history(owner_id,house,sensor,period,bucket,last_at,value)
 select auth.uid(),p_house,item->>'sensor',item->>'period',(item->>'time')::bigint,(item->>'lastAt')::bigint,item
 from jsonb_array_elements(p_rows) item
 on conflict(owner_id,house,sensor,period,bucket) do update
 set last_at=excluded.last_at,value=excluded.value,updated_at=clock_timestamp()
 where excluded.last_at>=casa_sensor_history.last_at;
end;
$$;
revoke all on function public.casa_write_sensor_history(text,jsonb) from public,anon;
grant execute on function public.casa_write_sensor_history(text,jsonb) to authenticated;
commit;
