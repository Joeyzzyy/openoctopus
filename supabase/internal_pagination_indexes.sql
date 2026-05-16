-- Indexes for internal user management and request troubleshooting pagination.
-- Safe to run multiple times.

create extension if not exists pg_trgm with schema extensions;

set search_path = public, extensions;

create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

create index if not exists profiles_email_trgm_idx
  on public.profiles using gin ((email::text) gin_trgm_ops);

create index if not exists profiles_full_name_trgm_idx
  on public.profiles using gin (full_name gin_trgm_ops);

create index if not exists workspace_members_user_id_idx
  on public.workspace_members (user_id);

create index if not exists api_keys_workspace_created_at_idx
  on public.api_keys (workspace_id, created_at desc);

create index if not exists api_keys_created_by_created_at_idx
  on public.api_keys (created_by, created_at desc);

create index if not exists inference_requests_workspace_created_at_idx
  on public.inference_requests (workspace_id, created_at desc);

create index if not exists usage_events_external_request_id_idx
  on public.usage_events (external_request_id);

create index if not exists provider_attempts_request_created_at_idx
  on public.provider_attempts (request_id, created_at desc);

create index if not exists supported_models_created_at_idx
  on public.supported_models (created_at asc);

create index if not exists supported_models_model_type_idx
  on public.supported_models ((billing_config -> 'metadata' ->> 'modelType'));

create index if not exists supported_models_active_created_at_idx
  on public.supported_models (active, created_at asc);

create index if not exists provider_models_supported_model_created_at_idx
  on public.provider_models (supported_model_id, created_at asc);

create index if not exists provider_model_showcase_assets_provider_model_sort_idx
  on public.provider_model_showcase_assets (provider_model_id, sort_order asc, created_at asc);

create index if not exists internal_model_ai_usage_logs_created_at_idx
  on public.internal_model_ai_usage_logs (created_at desc);
