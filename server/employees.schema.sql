-- Employees table for KizunaVN demo authentication
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.employees (
  id uuid primary key default gen_random_uuid(),
  name varchar(100) not null,
  nationality varchar(10) not null check (nationality in ('vn', 'jp')),
  email varchar(100) not null unique,
  password varchar(100) not null,
  avatar_url text,
  role varchar(20) not null check (role in ('employee', 'leader')),
  status varchar(20) not null default 'active' check (status in ('active', 'inactive')),
  last_online timestamp
);

comment on table public.employees is 'Luu thong tin nhan vien';
comment on column public.employees.nationality is 'Quoc tich nhan vien: vn, jp';
comment on column public.employees.password is 'Demo only: plaintext password, khong dung cho production';
