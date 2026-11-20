-- Prana — recorded / uploaded guided meditations (admin studio).
-- Run once in Supabase Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run. Requires schema.sql to have been run first.
--
-- BEFORE RUNNING: replace YOUR-EMAIL-HERE (at the bottom) with the email you
-- signed in to Prana with. That account becomes the admin who can record and
-- upload meditations. Sign in to Prana once before running, so the account exists.

-- ---------------------------------------------------------------------------
-- Admins: who may manage the meditation library. Only editable from this
-- dashboard (there are no insert/update/delete policies for app users).
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
drop policy if exists "admins read self" on public.admins;
create policy "admins read self" on public.admins for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- The library. Everyone can read published meditations; only admins can see
-- drafts or change anything.
-- ---------------------------------------------------------------------------
create table if not exists public.audio_meditations (
  id           uuid primary key default gen_random_uuid(),
  title        text not null check (char_length(title) between 1 and 120),
  description  text not null default '' check (char_length(description) <= 2000),
  guide        text not null default '' check (char_length(guide) <= 80),
  category     text not null default 'calm' check (category in ('calm', 'sleep', 'focus', 'anxiety', 'body', 'breath', 'morning')),
  duration_sec integer not null check (duration_sec between 1 and 14400),
  audio_path   text not null,
  mime         text not null default '',
  size_bytes   bigint not null default 0,
  published    boolean not null default false,
  created_by   uuid references auth.users (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.audio_meditations enable row level security;

drop policy if exists "audio read published" on public.audio_meditations;
drop policy if exists "audio admin insert" on public.audio_meditations;
drop policy if exists "audio admin update" on public.audio_meditations;
drop policy if exists "audio admin delete" on public.audio_meditations;
create policy "audio read published" on public.audio_meditations for select to anon, authenticated
  using (published or (select public.is_admin()));
create policy "audio admin insert" on public.audio_meditations for insert to authenticated
  with check ((select public.is_admin()));
create policy "audio admin update" on public.audio_meditations for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "audio admin delete" on public.audio_meditations for delete to authenticated
  using ((select public.is_admin()));

revoke all on public.audio_meditations from anon, authenticated;
grant select on public.audio_meditations to anon, authenticated;
grant insert, update, delete on public.audio_meditations to authenticated;

create or replace function public.audio_meditations_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists audio_meditations_touch on public.audio_meditations;
create trigger audio_meditations_touch before update on public.audio_meditations
for each row execute function public.audio_meditations_touch();

-- ---------------------------------------------------------------------------
-- Audio files: a public bucket (anyone can stream), only admins can write.
-- 50 MB per file ≈ 1h45 of voice at the 64 kbps the in-app recorder uses.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('meditations', 'meditations', true, 52428800,
        array['audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/x-m4a', 'audio/aac', 'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/webm', 'audio/ogg', 'audio/flac'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "meditation audio admin read" on storage.objects;
drop policy if exists "meditation audio admin insert" on storage.objects;
drop policy if exists "meditation audio admin update" on storage.objects;
drop policy if exists "meditation audio admin delete" on storage.objects;
create policy "meditation audio admin read" on storage.objects for select to authenticated
  using (bucket_id = 'meditations' and (select public.is_admin()));
create policy "meditation audio admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'meditations' and (select public.is_admin()));
create policy "meditation audio admin update" on storage.objects for update to authenticated
  using (bucket_id = 'meditations' and (select public.is_admin()));
create policy "meditation audio admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'meditations' and (select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Make yourself the admin (replace the email, keep the quotes).
-- ---------------------------------------------------------------------------
insert into public.admins (user_id)
select id from auth.users where lower(email) = lower('YOUR-EMAIL-HERE')
on conflict do nothing;

-- Should list your email. If it's empty, check the email above and that you've signed in to Prana.
select u.email as admin from public.admins a join auth.users u on u.id = a.user_id;
