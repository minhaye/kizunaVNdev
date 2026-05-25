-- Admin user management and post moderation support for KizunaVN.
-- Run this file in Supabase SQL Editor before using approve/reject actions.

alter table public.employees
  add column if not exists team varchar(100);

alter table public.employees
  add column if not exists status varchar(20) not null default 'active';

alter table public.employees
  drop constraint if exists employees_status_check;

alter table public.employees
  add constraint employees_status_check
  check (status in ('active', 'pending'));

alter table public.posts
  add column if not exists status varchar(20) not null default 'pending';

alter table public.posts
  drop constraint if exists posts_status_check;

alter table public.posts
  add constraint posts_status_check
  check (status in ('pending', 'published', 'rejected'));

create index if not exists idx_posts_status_created_at
  on public.posts(status, created_at desc);
