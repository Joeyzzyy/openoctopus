create table if not exists public.worker_templates (
  id uuid primary key default gen_random_uuid(),
  display_name text not null default '任务轮询（提交后查询）',
  slug text not null unique,
  config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_worker_templates_slug on public.worker_templates(slug);

insert into public.worker_templates (display_name, slug, config, active)
values (
  '任务轮询（提交后查询）',
  'rest-async-poll-v1',
  '{"submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl"}'::jsonb,
  true
)
on conflict (slug) do nothing;

insert into public.worker_templates (display_name, slug, config, active)
select distinct
  pm.execution_template,
  pm.execution_template,
  coalesce(pm.execution_config::jsonb, '{}'::jsonb),
  true
from public.provider_models pm
where pm.execution_template is not null
  and length(trim(pm.execution_template)) > 0
on conflict (slug) do nothing;
