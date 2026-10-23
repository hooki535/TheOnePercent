-- Isolated access checks: all fixture records are rolled back.
begin;
insert into public.user_data(user_id,key,value) values
 ('00000000-0000-4000-8000-000000000001','onepercent:rls-history-test','fixture A'),
 ('00000000-0000-4000-8000-000000000002','onepercent:rls-history-test','fixture B');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$
declare affected integer;
begin
 if (select count(*) from public.user_data where key='onepercent:rls-history-test') <> 1 then
   raise exception 'User isolation failed';
 end if;
 update public.user_data set value='forbidden' where key='onepercent:rls-history-test'
   and user_id='00000000-0000-4000-8000-000000000002';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-user update allowed';end if;
 delete from public.user_data where key='onepercent:rls-history-test'
   and user_id='00000000-0000-4000-8000-000000000002';
 get diagnostics affected=row_count;
 if affected<>0 then raise exception 'Cross-user deletion allowed';end if;
 begin
   insert into public.user_data(user_id,key,value) values
    ('00000000-0000-4000-8000-000000000002','onepercent:rls-history-insert','forbidden');
   raise exception 'Cross-user insert allowed';
 exception when insufficient_privilege then null;
 end;
 if exists(select 1 from public.history_sources where not website_display_approved) then
   raise exception 'Unapproved source visible';
 end if;
 begin
   update public.history_sources set website_display_approved=true;
   raise exception 'Browser source approval allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
set local role anon;
do $$begin
 begin
   if exists(select 1 from public.user_data where key='onepercent:rls-history-test') then
     raise exception 'Anonymous user records visible';
   end if;
 exception when insufficient_privilege then null;
 end;
 begin
   perform 1 from public.history_chunks limit 1;
   raise exception 'Anonymous history allowed';
 exception when insufficient_privilege then null;
 end;
end $$;
reset role;
rollback;
select 'Account isolation and history access checks passed; fixtures rolled back' as result;
