-- Owner requested candle charts for visitors without account sign-in on 2026-11-16.
-- This publishes only recent market-candle chunks, never personal account rows.
-- No SECURITY DEFINER functions, anonymous writes, or private Storage access.
begin;

update public.history_sources
set website_display_approved = true,
    permission_reference = 'Site owner instruction, 2026-11-16: display stored market candles to website guests. This records owner publication authorization, not a provider licence.'
where provider in ('histdata','dukascopy') and not website_display_approved;

-- Choose one immutable version per month, then a bounded recent window:
-- two M1 months, four H1 months and twelve D1 months per available instrument.
with current_versions as (
 select distinct on (h.provider,h.symbol,h.timeframe,h.month)
 h.provider,h.symbol,h.timeframe,h.month,h.sha256
 from public.history_chunks h
 join public.history_chunk_payloads p using(object_path)
 join public.history_sources s using(provider)
 where s.website_display_approved
 order by h.provider,h.symbol,h.timeframe,h.month,h.last_utc desc,h.candle_count desc,h.created_at desc,h.sha256
), chosen as (
 select *,row_number() over(partition by provider,symbol,timeframe order by month desc) as rn
 from current_versions
)
update public.history_chunks h set published=true
from chosen c
where h.provider=c.provider and h.symbol=c.symbol and h.timeframe=c.timeframe
and h.month=c.month and h.sha256=c.sha256
and c.rn <= case c.timeframe when 'M1' then 2 when 'H1' then 4 else 12 end;

grant select on public.history_sources,public.history_chunks,public.history_chunk_payloads to anon;
create policy "Guest approved candle sources" on public.history_sources for select to anon
 using (website_display_approved);
create policy "Guest published candle chunks" on public.history_chunks for select to anon
 using (published and exists(select 1 from public.history_sources s
 where s.provider=history_chunks.provider and s.website_display_approved));
create policy "Guest published candle payloads" on public.history_chunk_payloads for select to anon
 using (exists(select 1 from public.history_chunks h join public.history_sources s using(provider)
 where h.object_path=history_chunk_payloads.object_path and h.published and s.website_display_approved));

grant execute on function public.history_catalog(),public.history_months(text,text,text),public.history_read_payload(text) to anon;
-- RLS stays enabled. Existing authenticated policies, user_data, profiles,
-- history_account_access, private files and upload/update-run permissions stay intact.
commit;
