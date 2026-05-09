-- Ensure display_name column exists (safe for repeated runs).
alter table if exists public.worker_templates
  add column if not exists display_name text;

-- Normalize existing rows: fill empty display_name with slug.
update public.worker_templates
set display_name = coalesce(nullif(trim(display_name), ''), slug)
where display_name is null or trim(display_name) = '';

alter table if exists public.worker_templates
  alter column display_name set default '任务轮询（提交后查询）';

-- 1) 同步返回（无需轮询）
insert into public.worker_templates (display_name, slug, config, active)
values (
  '即时返回（无需轮询）',
  'sync-json-v1',
  '{"mode":"sync","resultUrlPath":"data.0.url","resultValueType":"url"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;

-- 1.1) Azure 图片 base64 返回（无需轮询）
insert into public.worker_templates (display_name, slug, config, active)
values (
  'Azure 图片（base64 即时返回）',
  'azure-image-base64-v1',
  '{"mode":"sync","authType":"header","authHeaderName":"api-key","authHeaderPrefix":"","resultUrlPath":"data.0.b64_json","resultValueType":"base64","resultMimeType":"image/png"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;

-- 1.2) 图片 URL 即时返回（无需轮询）
insert into public.worker_templates (display_name, slug, config, active)
values (
  '图片 URL（即时返回）',
  'image-url-sync-v1',
  '{"mode":"sync","resultUrlPath":"data.0.url","resultValueType":"url"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;

-- 2) 任务轮询（提交后查询）: map existing rest-async-poll-v1
insert into public.worker_templates (display_name, slug, config, active)
values (
  '任务轮询（提交后查询）',
  'rest-async-poll-v1',
  '{"submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;

-- 2.1) 图片 URL 轮询返回（提交后查询）
insert into public.worker_templates (display_name, slug, config, active)
values (
  '图片 URL（任务轮询）',
  'image-url-async-v1',
  '{"mode":"async","submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl","resultValueType":"url"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;

-- 3) 先上传素材，再任务轮询
insert into public.worker_templates (display_name, slug, config, active)
values (
  '先上传素材，再任务轮询',
  'upload-async-poll-v1',
  '{"uploadPath":"/v1/files:upload","submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl"}'::jsonb,
  true
)
on conflict (slug) do update
set display_name = excluded.display_name,
    active = true;
