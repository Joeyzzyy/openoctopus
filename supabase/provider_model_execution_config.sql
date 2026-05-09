alter table public.provider_models
  add column if not exists execution_template text,
  add column if not exists execution_config jsonb not null default '{}'::jsonb;

create index if not exists idx_provider_models_execution_template
  on public.provider_models(execution_template);
