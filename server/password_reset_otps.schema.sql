-- Password reset OTP table for KizunaVN
-- Run this in Supabase SQL Editor.

create table if not exists public.password_reset_otps (
  id uuid primary key default gen_random_uuid(),
  email varchar(100) not null unique,
  source varchar(20) not null check (source in ('employees', 'admins')),
  otp_hash text not null,
  otp_expires_at timestamptz not null,
  reset_token text,
  reset_expires_at timestamptz,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists password_reset_otps_reset_token_idx
  on public.password_reset_otps (reset_token);

comment on table public.password_reset_otps is 'Luu OTP va token dat lai mat khau';
