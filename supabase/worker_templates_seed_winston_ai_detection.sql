insert into public.worker_templates (display_name, slug, config, active)
values (
  'Winston AI Detection',
  'winston-ai-detection-v1',
  '{
    "mode": "sync",
    "submitPath": "/v2/ai-content-detection",
    "authType": "bearer",
    "defaultVersion": "4.14",
    "defaultLanguage": "auto",
    "defaultSentences": true
  }'::jsonb,
  true
)
on conflict (slug) do update
set
  display_name = excluded.display_name,
  config = excluded.config,
  active = true;
