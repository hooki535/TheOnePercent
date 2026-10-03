-- Account profiles: one row per user, filled from sign-up details.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (username is null or username ~ '^[a-z0-9_]{3,24}$'),
  first_name text check (char_length(first_name) <= 80),
  middle_name text check (char_length(middle_name) <= 80),
  last_name text check (char_length(last_name) <= 80),
  phone text check (char_length(phone) <= 40),
  country text check (char_length(country) <= 80),
  currency text check (char_length(currency) <= 10),
  timezone text check (char_length(timezone) <= 64),
  dob date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "Own profile select" on public.profiles;
drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile select" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Own profile update" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Create the profile automatically when an account is created.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, username, first_name, middle_name, last_name, phone, country, currency, timezone, dob)
  values (
    new.id,
    nullif(lower(trim(m->>'username')), ''),
    m->>'first_name', m->>'middle_name', m->>'last_name',
    m->>'phone', m->>'country', m->>'currency', m->>'timezone',
    nullif(m->>'dob', '')::date
  );
  return new;
exception when unique_violation then
  raise exception 'username already taken';
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Lets the sign-up page check a username without exposing anyone's profile.
create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where username = lower(trim(name)));
$$;
grant execute on function public.username_available(text) to anon, authenticated;
