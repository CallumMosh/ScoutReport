-- Run this in the Supabase SQL editor to create the dossiers table.

create table if not exists public.dossiers (
  id text primary key,
  name text not null,
  data jsonb not null,
  saved_at bigint not null,
  created_at timestamptz not null default now()
);

create index if not exists dossiers_saved_at_idx on public.dossiers (saved_at desc);

-- Row Level Security.
alter table public.dossiers enable row level security;

-- Personal single-user app: allow the anon key full access.
-- ⚠️ This makes the table readable/writable by anyone with your anon key.
-- For anything beyond personal use, add Supabase Auth and scope rows to auth.uid().
drop policy if exists "anon full access" on public.dossiers;
create policy "anon full access" on public.dossiers
  for all using (true) with check (true);
