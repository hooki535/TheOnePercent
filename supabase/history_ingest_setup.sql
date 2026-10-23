-- Read-only quota accounting for the server uploader. No browser access.
create or replace function public.history_storage_usage() returns jsonb
language sql stable security definer set search_path=''
as $$select jsonb_build_object(
 'storage_bytes',(select coalesce(sum((metadata->>'size')::bigint),0) from storage.objects),
 'storage_objects',(select count(*) from storage.objects where bucket_id='market-history'),
 'history_chunks',(select count(*) from public.history_chunks),
 'published_chunks',(select count(*) from public.history_chunks where published),
 'latest_candle',(select max(last_utc) from public.history_chunks)
)$$;
revoke all on function public.history_storage_usage() from public,anon,authenticated;
grant execute on function public.history_storage_usage() to service_role;

create or replace function public.history_inventory(source_provider text,source_symbol text) returns jsonb
language sql stable security definer set search_path=''
as $$select coalesce(jsonb_agg(x),'[]'::jsonb) from
 (select distinct month,timeframe from public.history_chunks
 where provider=source_provider and symbol=source_symbol) x$$;
revoke all on function public.history_inventory(text,text) from public,anon,authenticated;
grant execute on function public.history_inventory(text,text) to service_role;

create or replace function public.history_chunk_hashes() returns jsonb
language sql stable security definer set search_path=''
as $$select coalesce(jsonb_agg(sha256),'[]'::jsonb) from public.history_chunks$$;
revoke all on function public.history_chunk_hashes() from public,anon,authenticated;
grant execute on function public.history_chunk_hashes() to service_role;
