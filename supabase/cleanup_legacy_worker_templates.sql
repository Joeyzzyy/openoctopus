-- Normalize legacy worker template slugs to the current protocol-based set.
-- Safe to run multiple times.

update public.provider_models
set execution_template = 'sync-json-v1'
where execution_template in ('azure-image-base64-v1', 'image-url-sync-v1');

update public.provider_models
set execution_template = 'rest-async-poll-v1'
where execution_template = 'image-url-async-v1';

delete from public.worker_templates
where slug in ('azure-image-base64-v1', 'image-url-sync-v1', 'image-url-async-v1');
