-- Password reset requests table for KizunaVN demo authentication
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.password_reset_requests (
  id uuid primary key default gen_random_uuid(),
  email varchar(100) not null,
  account_type varchar(20) not null check (account_type in ('employee', 'admin')),
  otp_hash text not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  verified_at timestamptz,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.password_reset_requests disable row level security;

create index if not exists idx_password_reset_requests_email on public.password_reset_requests(email);
create index if not exists idx_password_reset_requests_account_type on public.password_reset_requests(account_type);
create index if not exists idx_password_reset_requests_expires_at on public.password_reset_requests(expires_at);

comment on table public.password_reset_requests is 'Yeu cau dat lai mat khau bang OTP';