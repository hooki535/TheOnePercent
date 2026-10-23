-- The measured H1/D1 package is ~33 MB compressed, within the free database quota.
create table public.history_chunk_payloads (
 object_path text primary key references public.history_chunks(object_path),
 payload bytea not null check(octet_length(payload)>0 and octet_length(payload)<=50000000)
);
alter table public.history_chunk_payloads enable row level security;
revoke all on public.history_chunk_payloads from public,anon,authenticated;
grant all on public.history_chunk_payloads to service_role;
grant select on public.history_chunk_payloads to authenticated;
create policy "Read approved published payloads" on public.history_chunk_payloads for select to authenticated
 using(exists(select 1 from public.history_chunks h join public.history_sources s using(provider)
 where h.object_path=history_chunk_payloads.object_path and h.published and s.website_display_approved));

create or replace function public.history_storage_usage() returns jsonb
language sql stable security definer set search_path=''
as $$select jsonb_build_object(
 'storage_bytes',(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects),
 'storage_objects',(select count(*) from storage.objects where bucket_id='market-history'),
 'history_chunks',(select count(*) from public.history_chunks),
 'payload_chunks',(select count(*) from public.history_chunk_payloads),
 'payload_bytes',(select coalesce(sum(octet_length(payload)),0) from public.history_chunk_payloads),
 'database_bytes',pg_database_size(current_database()),
 'published_chunks',(select count(*) from public.history_chunks where published),
 'latest_candle',(select max(last_utc) from public.history_chunks)
)$$;
revoke all on function public.history_storage_usage() from public,anon,authenticated;
grant execute on function public.history_storage_usage() to service_role;

create or replace function public.history_chunk_hashes() returns jsonb
language sql stable security definer set search_path=''
as $$select coalesce(jsonb_agg(h.sha256),'[]'::jsonb) from public.history_chunks h
join public.history_chunk_payloads p using(object_path)$$;
revoke all on function public.history_chunk_hashes() from public,anon,authenticated;
grant execute on function public.history_chunk_hashes() to service_role;

create or replace function public.history_read_payload(object_key text) returns text
language sql stable security invoker set search_path=''
as $$select encode(payload,'base64') from public.history_chunk_payloads where object_path=object_key$$;
revoke all on function public.history_read_payload(text) from public,anon;
grant execute on function public.history_read_payload(text) to authenticated,service_role;

create or replace function public.history_store_batch(chunks jsonb) returns integer
language plpgsql security invoker set search_path=''
as $$declare item jsonb; m jsonb; data bytea; count_stored integer:=0;
begin
 if jsonb_typeof(chunks)<>'array' or jsonb_array_length(chunks)<1 or jsonb_array_length(chunks)>64 then raise exception 'Invalid batch';end if;
 perform pg_advisory_xact_lock(hashtext('history-store-batch'));
 if (select coalesce(sum(octet_length(payload)),0) from public.history_chunk_payloads)>300000000
 or pg_database_size(current_database())>425000000 then raise exception 'Free database safety allowance reached';end if;
 for item in select value from jsonb_array_elements(chunks) loop
  m:=item->'meta';data:=decode(item->>'data','base64');
  if octet_length(data)<>(m->>'bytes')::bigint then raise exception 'Payload size mismatch';end if;
  insert into public.history_chunks(provider,symbol,timeframe,month,sha256,object_path,candle_count,first_utc,last_utc,bytes,published)
  values(m->>'provider',m->>'symbol',m->>'timeframe',(m->>'month')::date,m->>'sha256',m->>'object_path',(m->>'candle_count')::integer,(m->>'first_utc')::timestamptz,(m->>'last_utc')::timestamptz,(m->>'bytes')::bigint,false)
  on conflict(provider,symbol,timeframe,month,sha256) do nothing;
  insert into public.history_chunk_payloads(object_path,payload) values(m->>'object_path',data) on conflict(object_path) do nothing;
  count_stored:=count_stored+1;
 end loop;
 if (select coalesce(sum(octet_length(payload)),0) from public.history_chunk_payloads)>300000000 then raise exception 'Free database safety allowance reached';end if;
 return count_stored;
end$$;
revoke all on function public.history_store_batch(jsonb) from public,anon,authenticated;
grant execute on function public.history_store_batch(jsonb) to service_role;
