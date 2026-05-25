-- Per-user notifications for KizunaVN.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  source varchar(20) not null check (source in ('employees', 'admins')),
  subject_id uuid not null,
  topic varchar(50) not null,
  title text not null,
  content text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.user_notifications disable row level security;

create index if not exists idx_user_notifications_subject_created on public.user_notifications(source, subject_id, created_at desc);
create index if not exists idx_user_notifications_unread on public.user_notifications(source, subject_id, is_read);

comment on table public.user_notifications is 'Thong bao rieng cho tung account';