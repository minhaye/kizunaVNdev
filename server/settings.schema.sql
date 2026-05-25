-- Account settings and presence table for KizunaVN.
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.user_settings (
  id uuid primary key default gen_random_uuid(),
  source varchar(20) not null check (source in ('employees', 'admins')),
  subject_id uuid not null,
  theme_mode varchar(20) not null default 'light' check (theme_mode in ('light', 'dark')),
  message_task_notifications boolean not null default true,
  login_retention_days integer not null default 30 check (login_retention_days in (30, 60, 90)),
  show_active_status boolean not null default true,
  last_online timestamptz,
  updated_at timestamptz not null default now(),
  unique (source, subject_id)
);

alter table public.user_settings disable row level security;

create index if not exists idx_user_settings_source_subject on public.user_settings(source, subject_id);

comment on table public.user_settings is 'Cau hinh tai khoan va presence theo tung account';