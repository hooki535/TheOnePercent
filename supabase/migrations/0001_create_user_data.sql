create table if not exists public.user_data (
  user_id uuid not null default auth.uid(),
  key text not null check (char_length(key) <= 120),
  value text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

grant select, insert, update, delete on public.user_data to authenticated;

alter table public.user_data enable row level security;

drop policy if exists "Own data select" on public.user_data;
drop policy if exists "Own data insert" on public.user_data;
drop policy if exists "Own data update" on public.user_data;
drop policy if exists "Own data delete" on public.user_data;

create policy "Own data select"
  on public.user_data for select to authenticated
  using (auth.uid() = user_id);

create policy "Own data insert"
  on public.user_data for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Own data update"
  on public.user_data for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Own data delete"
  on public.user_data for delete to authenticated
  using (auth.uid() = user_id);
