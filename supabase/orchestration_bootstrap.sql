-- OpenOctopus orchestration bootstrap for Supabase
-- Apply after dashboard_bootstrap.sql.
-- This adds the request orchestration layer used by the gateway/worker service.

create extension if not exists pgcrypto;
create extension if not exists pgmq;

do $$
begin
  if not exists (
    select 1 from pg_type where typname = 'provider_status'
  ) then
    create type public.provider_status as enum ('healthy', 'degraded', 'offline');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'provider_kind'
  ) then
    create type public.provider_kind as enum ('wavespeed', 'partner', 'custom');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'request_capability'
  ) then
    create type public.request_capability as enum ('image_generation', 'image_edit', 'video_generation');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'request_status'
  ) then
    create type public.request_status as enum ('queued', 'submitted', 'processing', 'succeeded', 'failed', 'cancelled');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'attempt_status'
  ) then
    create type public.attempt_status as enum ('pending', 'sent', 'processing', 'succeeded', 'failed');
  end if;

  if not exists (
    select 1 from pg_type where typname = 'asset_type'
  ) then
    create type public.asset_type as enum ('image', 'video', 'audio');
  end if;
end $$;

alter table public.supported_models
add column if not exists capability public.request_capability;

update public.supported_models
set capability = case
  when modality = 'image' then 'image_generation'::public.request_capability
  when modality = 'video' then 'video_generation'::public.request_capability
  else null
end
where capability is null;

create table if not exists public.providers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  kind public.provider_kind not null,
  base_url text,
  status public.provider_status not null default 'healthy',
  regions text[] not null default '{}',
  credentials_ref text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.provider_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  label text not null,
  secret_ref text,
  secret_ciphertext text,
  secret_iv text,
  secret_auth_tag text,
  secret_mask text,
  secret_source text not null default 'internal_encrypted',
  secret_key_version integer not null default 1,
  secret_last_updated_at timestamptz not null default timezone('utc', now()),
  environment text not null default 'production',
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.provider_credentials
  alter column secret_ref drop not null;

alter table public.provider_credentials
  add column if not exists secret_ciphertext text,
  add column if not exists secret_iv text,
  add column if not exists secret_auth_tag text,
  add column if not exists secret_mask text,
  add column if not exists secret_source text not null default 'internal_encrypted',
  add column if not exists secret_key_version integer not null default 1,
  add column if not exists secret_last_updated_at timestamptz not null default timezone('utc', now());

update public.provider_credentials
set
  secret_source = case
    when secret_ciphertext is not null then 'internal_encrypted'
    else 'external_ref'
  end,
  secret_mask = case
    when secret_mask is not null then secret_mask
    when secret_ref is not null then '[legacy external secret reference]'
    else secret_mask
  end,
  secret_last_updated_at = coalesce(secret_last_updated_at, updated_at, created_at, timezone('utc', now()))
where
  secret_source is distinct from case
    when secret_ciphertext is not null then 'internal_encrypted'
    else 'external_ref'
  end
  or secret_mask is null
  or secret_last_updated_at is null;

create table if not exists public.provider_models (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  supported_model_id uuid references public.supported_models(id) on delete set null,
  public_model_slug text not null,
  upstream_model_slug text not null,
  capability public.request_capability not null,
  active boolean not null default true,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  pricing jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (provider_id, upstream_model_slug)
);

create table if not exists public.routing_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  capability public.request_capability not null,
  public_model_slug text not null,
  primary_provider_model_id uuid not null references public.provider_models(id) on delete cascade,
  fallback_provider_model_id uuid references public.provider_models(id) on delete set null,
  route_strategy text not null default 'primary_then_fallback',
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.inference_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  capability public.request_capability not null,
  public_model_slug text not null,
  provider_id uuid references public.providers(id) on delete set null,
  provider_model_id uuid references public.provider_models(id) on delete set null,
  status public.request_status not null default 'queued',
  endpoint text not null,
  input_payload jsonb not null default '{}'::jsonb,
  normalized_params jsonb not null default '{}'::jsonb,
  output_payload jsonb not null default '{}'::jsonb,
  error_code text,
  error_message text,
  idempotency_key text,
  queue_name text not null default 'inference_jobs',
  priority smallint not null default 100,
  estimated_cost numeric(12,6) not null default 0,
  actual_cost numeric(12,6) not null default 0,
  queued_at timestamptz not null default timezone('utc', now()),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.provider_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.inference_requests(id) on delete cascade,
  provider_id uuid not null references public.providers(id) on delete cascade,
  provider_model_id uuid references public.provider_models(id) on delete set null,
  attempt_no integer not null default 1,
  status public.attempt_status not null default 'pending',
  upstream_request_id text,
  upstream_task_id text,
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  http_status integer,
  latency_ms integer,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (request_id, attempt_no)
);

create table if not exists public.generated_assets (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.inference_requests(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  asset_type public.asset_type not null,
  storage_bucket text,
  storage_path text,
  source_url text,
  mime_type text,
  size_bytes bigint,
  width integer,
  height integer,
  duration_ms integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.inference_requests(id) on delete cascade,
  target_url text not null,
  event_type text not null,
  status_code integer,
  response_body text,
  delivered_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  workspace_id uuid references public.workspaces(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  summary text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_provider_models_public_model on public.provider_models(public_model_slug, capability);
create index if not exists idx_provider_credentials_provider on public.provider_credentials(provider_id, created_at desc);
create index if not exists idx_routing_rules_workspace_model on public.routing_rules(workspace_id, public_model_slug, capability);
create index if not exists idx_inference_requests_workspace_created on public.inference_requests(workspace_id, created_at desc);
create index if not exists idx_inference_requests_status_created on public.inference_requests(status, created_at desc);
create index if not exists idx_inference_requests_api_key_created on public.inference_requests(api_key_id, created_at desc);
create index if not exists idx_provider_attempts_request_created on public.provider_attempts(request_id, created_at asc);
create index if not exists idx_generated_assets_request on public.generated_assets(request_id);
create index if not exists idx_admin_audit_logs_workspace_created on public.admin_audit_logs(workspace_id, created_at desc);

drop trigger if exists set_providers_updated_at on public.providers;
create trigger set_providers_updated_at
before update on public.providers
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_credentials_updated_at on public.provider_credentials;
create trigger set_provider_credentials_updated_at
before update on public.provider_credentials
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_models_updated_at on public.provider_models;
create trigger set_provider_models_updated_at
before update on public.provider_models
for each row execute function public.set_updated_at();

drop trigger if exists set_routing_rules_updated_at on public.routing_rules;
create trigger set_routing_rules_updated_at
before update on public.routing_rules
for each row execute function public.set_updated_at();

drop trigger if exists set_inference_requests_updated_at on public.inference_requests;
create trigger set_inference_requests_updated_at
before update on public.inference_requests
for each row execute function public.set_updated_at();

drop trigger if exists set_provider_attempts_updated_at on public.provider_attempts;
create trigger set_provider_attempts_updated_at
before update on public.provider_attempts
for each row execute function public.set_updated_at();

do $$
begin
  perform pgmq.create('inference_jobs');
exception when others then
  null;
end $$;

do $$
begin
  perform pgmq.create('inference_polling');
exception when others then
  null;
end $$;

-- Intentionally no provider/model/routing seed data here.
-- The internal admin dashboard is the source of truth for real provider onboarding.
