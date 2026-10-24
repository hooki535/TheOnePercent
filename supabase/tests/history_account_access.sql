begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.history_account_access limit 1),true);
set local role authenticated;
do $$ declare catalog jsonb; months jsonb; path text; payload text;
begin
 catalog:=public.history_catalog();
 if jsonb_array_length(catalog)<42 then raise exception 'Archive account cannot see forex/gold catalog';end if;
 months:=public.history_months('histdata','EURUSD','H1');
 if jsonb_array_length(months)<100 then raise exception 'Archive account cannot see historical months';end if;
 path:=months->0->>'object_path';payload:=public.history_read_payload(path);
 if payload is null or octet_length(decode(payload,'base64'))<>(months->0->>'bytes')::bigint then raise exception 'Archive payload read failed';end if;
 if has_table_privilege('authenticated','public.history_account_access','INSERT') or has_table_privilege('authenticated','public.history_chunk_payloads','UPDATE') then raise exception 'Browser has archive write access';end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub','ffffffff-ffff-4fff-8fff-ffffffffffff',true);
set local role authenticated;
do $$ begin
 if public.history_catalog()<>'[]'::jsonb then raise exception 'Unassigned account can see private catalog';end if;
 if exists(select 1 from public.history_chunk_payloads) then raise exception 'Unassigned account can read private payloads';end if;
 if exists(select 1 from public.history_account_access) then raise exception 'Unassigned account can see grants';end if;
 if has_function_privilege('anon','public.history_read_payload(text)','EXECUTE') or has_function_privilege('anon','public.history_catalog()','EXECUTE') then raise exception 'Anonymous archive access enabled';end if;
end $$;
reset role;
rollback;
