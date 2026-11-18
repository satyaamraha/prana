-- Prana — Supabase schema for accounts + cross-device sync.
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run.

-- One row per user holding their practice data (sessions, personal bests,
-- programs, settings). The app merges it with each device's local copy.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint user_data_size check (pg_column_size(data) < 2000000)
);

alter table public.user_data enable row level security;

-- Signed-in users can only ever see and change their own row.
drop policy if exists "user_data select own" on public.user_data;
drop policy if exists "user_data insert own" on public.user_data;
drop policy if exists "user_data update own" on public.user_data;
drop policy if exists "user_data delete own" on public.user_data;
create policy "user_data select own" on public.user_data for select to authenticated using ((select auth.uid()) = user_id);
create policy "user_data insert own" on public.user_data for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "user_data update own" on public.user_data for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "user_data delete own" on public.user_data for delete to authenticated using ((select auth.uid()) = user_id);

revoke all on public.user_data from anon;
grant select, insert, update, delete on public.user_data to authenticated;

-- Server-side timestamp so devices can tell which copy is newer.
create or replace function public.user_data_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists user_data_touch on public.user_data;
create trigger user_data_touch before insert or update on public.user_data
for each row execute function public.user_data_touch();

-- Lets a signed-in user permanently delete their own account (and, via the
-- cascade above, their synced data). Callable only by that user.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
