-- Task reports (Ho-Ren-So) schema
create table if not exists public.task_reports (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null,
  sender_id uuid not null,
  report_type varchar(50) not null default 'daily',
  what_done text,
  what_next text,
  issues text,
  created_at timestamp with time zone default now()
);

comment on table public.task_reports is 'Bảng lưu các báo cáo tiến độ theo mẫu Ho-Ren-So';
comment on column public.task_reports.what_done is '何を実施したか / Những việc đã làm';
comment on column public.task_reports.what_next is '次に実施すること / Những việc tiếp theo';
comment on column public.task_reports.issues is '課題 / Vấn đề gặp phải';
