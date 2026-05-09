alter table if exists public.worker_templates
  add column if not exists display_name text;

update public.worker_templates
set display_name = coalesce(nullif(trim(display_name), ''), slug)
where display_name is null or trim(display_name) = '';

alter table if exists public.worker_templates
  alter column display_name set default '任务轮询（提交后查询）';
