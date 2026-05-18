create table if not exists public.provider_capability_execution_configs (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  capability text not null check (capability in ('image_generation', 'image_edit', 'image_recognition', 'video_generation')),
  execution_template text not null,
  execution_config jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider_id, capability)
);

create index if not exists idx_provider_capability_execution_configs_provider
  on public.provider_capability_execution_configs(provider_id);

create index if not exists idx_provider_capability_execution_configs_template
  on public.provider_capability_execution_configs(execution_template);

drop trigger if exists set_provider_capability_execution_configs_updated_at
  on public.provider_capability_execution_configs;
create trigger set_provider_capability_execution_configs_updated_at
before update on public.provider_capability_execution_configs
for each row execute function public.set_updated_at();
