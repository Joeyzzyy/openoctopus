alter table public.provider_models
  drop constraint if exists provider_models_provider_id_upstream_model_slug_key;

alter table public.provider_models
  add constraint provider_models_provider_id_supported_model_id_upstream_model_slug_key
  unique (provider_id, supported_model_id, upstream_model_slug);
