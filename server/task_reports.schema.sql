-- Task reports (HoRenSo) table for KizunaVN
-- Run this in Supabase SQL Editor.

create table if not exists public.task_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  sender_id uuid not null references public.employees(id) on delete cascade,
  report_type varchar(50) not null default 'daily',
  what_done text,            -- 報告 (Hōkoku / Report)
  what_next text,            -- 連絡 (Renraku / Inform)
  issues text,               -- 相談 (Sōdan / Consult)
  created_at timestamptz not null default now()
);

-- Server xử lý phân quyền, tắt RLS để anon key hoạt động được
alter table public.task_reports disable row level security;

create index if not exists idx_task_reports_task_id on public.task_reports(task_id);
create index if not exists idx_task_reports_sender_id on public.task_reports(sender_id);

comment on table public.task_reports is 'Báo cáo HoRenSo (報連相) cho từng task';
comment on column public.task_reports.what_done is '報告 (Hōkoku) - Báo cáo: những gì đã làm';
comment on column public.task_reports.what_next is '連絡 (Renraku) - Liên lạc: thông tin cần thông báo';
comment on column public.task_reports.issues is '相談 (Sōdan) - Tương đàm: vấn đề cần trao đổi';
