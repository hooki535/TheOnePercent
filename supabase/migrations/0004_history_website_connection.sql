-- Read-only personal archive access; publication approval is independent.
begin;
create table public.history_account_access (
 user_id uuid not null references auth.users(id) on delete cascade,
 provider text not null references public.history_sources(provider),
 granted_at timestamptz not null default now(),
 primary key(user_id,provider)
);
alter table public.history_account_access enable row level security;
revoke all on public.history_account_access from public,anon,authenticated;
grant select on public.history_account_access to authenticated;
grant all on public.history_account_access to service_role;
create policy "Read own archive access" on public.history_account_access for select to authenticated
 using(user_id=(select auth.uid()));
create policy "Read personal history sources" on public.history_sources for select to authenticated
 using(exists(select 1 from public.history_account_access a where a.provider=history_sources.provider and a.user_id=(select auth.uid())));
create policy "Read personal history metadata" on public.history_chunks for select to authenticated
 using(exists(select 1 from public.history_account_access a where a.provider=history_chunks.provider and a.user_id=(select auth.uid())));
create policy "Read personal history payloads" on public.history_chunk_payloads for select to authenticated
 using(exists(select 1 from public.history_chunks h join public.history_account_access a using(provider)
 where h.object_path=history_chunk_payloads.object_path and a.user_id=(select auth.uid())));

create function public.history_months(source_provider text,source_symbol text,source_timeframe text)
returns jsonb language sql stable security invoker set search_path=''
as $$
select coalesce(jsonb_agg(to_jsonb(x) order by x.month),'[]'::jsonb) from (
 select distinct on(h.month) h.provider,h.symbol,h.timeframe,h.month,h.sha256,h.object_path,
 h.candle_count,h.first_utc,h.last_utc,h.bytes
 from public.history_chunks h
 where h.provider=source_provider and h.symbol=source_symbol and h.timeframe=source_timeframe
 and exists(select 1 from public.history_chunk_payloads p where p.object_path=h.object_path)
 order by h.month,h.last_utc desc,h.candle_count desc,h.created_at desc,h.sha256
)x
$$;
create function public.history_catalog()
returns jsonb language sql stable security invoker set search_path=''
as $$
select coalesce(jsonb_agg(to_jsonb(x) order by x.provider,x.symbol,x.timeframe),'[]'::jsonb) from (
 select provider,symbol,timeframe,min(first_utc) first_utc,max(last_utc) last_utc,
 sum(candle_count) candle_count,count(*) months from (
  select distinct on(h.provider,h.symbol,h.timeframe,h.month)
  h.provider,h.symbol,h.timeframe,h.month,h.first_utc,h.last_utc,h.candle_count
  from public.history_chunks h
  where exists(select 1 from public.history_chunk_payloads p where p.object_path=h.object_path)
  order by h.provider,h.symbol,h.timeframe,h.month,h.last_utc desc,h.candle_count desc,h.created_at desc,h.sha256
 ) current_chunks group by provider,symbol,timeframe
)x
$$;
revoke all on function public.history_months(text,text,text),public.history_catalog() from public,anon;
grant execute on function public.history_months(text,text,text),public.history_catalog() to authenticated,service_role;
commit;
