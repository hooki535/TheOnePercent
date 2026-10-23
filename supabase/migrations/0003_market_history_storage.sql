-- Prepared migration; apply to the existing Supabase project as its owner.
-- Account records already use user_data + its owner-only RLS policies (0001).
-- Keep all candle files private until the source is approved for website display.
begin;

create table public.history_sources (
  provider text primary key,
  display_name text not null,
  website_display_approved boolean not null default false,
  permission_reference text,
  check (not website_display_approved or coalesce(length(trim(permission_reference)),0) > 0)
);

create table public.history_chunks (
  provider text not null references public.history_sources(provider),
  symbol text not null check (symbol ~ '^[A-Z0-9]{3,20}$'),
  timeframe text not null check (timeframe in ('M1','H1','D1')),
  month date not null check (extract(day from month) = 1),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  object_path text not null unique,
  candle_count integer not null check (candle_count > 0),
  first_utc timestamptz not null,
  last_utc timestamptz not null,
  bytes bigint not null check (bytes > 0 and bytes <= 50000000),
  published boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (provider,symbol,timeframe,month,sha256),
  check (last_utc >= first_utc),
  check (object_path = provider || '/' || symbol || '/' || timeframe || '/' ||
    to_char(month,'YYYY-MM') || '/' || sha256 || '.json.gz')
);
create unique index history_chunks_current on public.history_chunks
  (provider,symbol,timeframe,month) where published;
create index history_chunks_window on public.history_chunks
  (symbol,timeframe,first_utc,last_utc) where published;

create table public.history_update_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null references public.history_sources(provider),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('running','complete','failed','rate_limited')),
  details jsonb not null default '{}'::jsonb
);

alter table public.history_sources enable row level security;
alter table public.history_chunks enable row level security;
alter table public.history_update_runs enable row level security;
revoke all on public.history_sources,public.history_chunks,public.history_update_runs from anon,authenticated;
grant select on public.history_sources,public.history_chunks to authenticated;
grant all on public.history_sources,public.history_chunks,public.history_update_runs to service_role;
create policy "Approved history sources" on public.history_sources for select to authenticated
  using (website_display_approved);
create policy "Published approved history chunks" on public.history_chunks for select to authenticated
  using (published and exists (select 1 from public.history_sources s
    where s.provider=history_chunks.provider and s.website_display_approved));

insert into public.history_sources(provider,display_name) values
  ('histdata','HistData BID · source EST converted to UTC'),
  ('dukascopy','Dukascopy BID · US30 is USA30IDXUSD CFD');

insert into storage.buckets(id,name,public,file_size_limit)
  values ('market-history','market-history',false,50000000)
  on conflict (id) do nothing;
create policy "Read published approved market files" on storage.objects for select to authenticated
  using (bucket_id='market-history' and exists (
    select 1 from public.history_chunks h join public.history_sources s using(provider)
    where h.object_path=storage.objects.name and h.published and s.website_display_approved
  ));
-- No browser write policy. Uploads/metadata publication use server credentials.
commit;
