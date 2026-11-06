-- Student Skill Tracking Dashboard
-- Run this entire file in Supabase Dashboard > SQL Editor.
-- Uses Supabase Auth identities; no passwords are stored in these tables.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  category text not null check (category in ('Programming', 'Web Development', 'Data & AI', 'Tools', 'Communication', 'Teamwork', 'Leadership', 'Problem Solving', 'Other')),
  current_level text not null check (current_level in ('Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert')),
  target_level text not null check (target_level in ('Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert')),
  notes text not null default '' check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.skill_progress (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid not null references public.skills(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null check (level in ('Beginner', 'Elementary', 'Intermediate', 'Advanced', 'Expert')),
  note text not null default '' check (char_length(note) <= 500),
  recorded_at timestamptz not null default now()
);

create index if not exists skills_user_updated_idx on public.skills(user_id, updated_at desc);
create index if not exists skills_user_category_idx on public.skills(user_id, category);
create index if not exists progress_skill_recorded_idx on public.skill_progress(skill_id, recorded_at desc);
create index if not exists progress_user_recorded_idx on public.skill_progress(user_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), 'Student'))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists auth_user_profile_created on auth.users;
create trigger auth_user_profile_created
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
drop trigger if exists skills_set_updated_at on public.skills;
create trigger skills_set_updated_at before update on public.skills
for each row execute procedure public.set_updated_at();

create or replace function public.record_skill_progress()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.skill_progress(skill_id, user_id, level, note)
    values (new.id, new.user_id, new.current_level, coalesce(new.notes, ''));
  elsif new.current_level is distinct from old.current_level then
    insert into public.skill_progress(skill_id, user_id, level, note)
    values (new.id, new.user_id, new.current_level, coalesce(new.notes, ''));
  end if;
  return new;
end;
$$;

drop trigger if exists skills_record_progress on public.skills;
create trigger skills_record_progress after insert or update on public.skills
for each row execute procedure public.record_skill_progress();

alter table public.profiles enable row level security;
alter table public.skills enable row level security;
alter table public.skill_progress enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

drop policy if exists "Users manage own skills" on public.skills;
create policy "Users manage own skills" on public.skills for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "Users read own progress" on public.skill_progress;
create policy "Users read own progress" on public.skill_progress for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "Users add own progress" on public.skill_progress;
create policy "Users add own progress" on public.skill_progress for insert to authenticated with check ((select auth.uid()) = user_id);

-- Note: the browser never receives a service-role key. The backend verifies the
-- Supabase access token and forwards it to PostgreSQL through the Supabase client,
-- so auth.uid() and these RLS policies scope records to the signed-in student.
