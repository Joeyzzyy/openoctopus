-- Unified public error definitions for customer-facing API responses.
-- Run this on existing environments before using the internal error-definition panel.

create table if not exists public.gateway_error_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  category text not null default 'system',
  http_status integer not null default 500 check (http_status between 100 and 599),
  public_message text not null,
  retryable boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 100,
  operator_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_gateway_error_definitions_active_sort
  on public.gateway_error_definitions(active, sort_order, code);

drop trigger if exists set_gateway_error_definitions_updated_at on public.gateway_error_definitions;
create trigger set_gateway_error_definitions_updated_at
before update on public.gateway_error_definitions
for each row execute function public.set_updated_at();

alter table public.gateway_error_definitions enable row level security;

insert into public.gateway_error_definitions (
  code,
  category,
  http_status,
  public_message,
  retryable,
  active,
  sort_order,
  operator_notes
)
values
  ('invalid_request', 'validation', 400, 'The request payload is invalid. Check the required fields and try again.', false, true, 10, 'Used for malformed JSON, schema validation failures, or unsupported request parameters.'),
  ('unauthorized', 'auth', 401, 'Authentication is required for this request.', false, true, 20, 'Use when the caller is not signed in for first-party routes.'),
  ('invalid_api_key', 'auth', 401, 'The API key is invalid or inactive.', false, true, 30, 'Customer-facing API key rejection.'),
  ('insufficient_balance', 'billing', 402, 'Your wallet balance is insufficient. Please top up and try again.', false, true, 40, 'Customer needs to recharge before retrying.'),
  ('model_not_available', 'routing', 404, 'The requested model is currently unavailable.', false, true, 50, 'Public model does not exist, is inactive, or has no active route.'),
  ('task_not_found', 'task', 404, 'The requested task could not be found.', false, true, 60, 'Task polling requested an unknown task id.'),
  ('file_not_found', 'asset', 404, 'The requested generated file is not available.', false, true, 70, 'Generated asset is missing or cannot be proxied.'),
  ('provider_offline', 'upstream', 503, 'The selected model is temporarily unavailable. Please retry later.', true, true, 80, 'Configured provider is marked offline internally.'),
  ('provider_model_inactive', 'routing', 503, 'The selected model is temporarily unavailable. Please retry later.', true, true, 90, 'Resolved route points to an inactive provider model.'),
  ('provider_credential_missing', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 100, 'No active credential exists for the resolved provider.'),
  ('provider_credential_incomplete', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 110, 'Credential exists but encrypted material is incomplete.'),
  ('provider_credential_unusable', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 120, 'Credential selection failed due to runtime constraints.'),
  ('provider_credential_legacy', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 130, 'Legacy non-encrypted credential reference still in use.'),
  ('provider_credential_unavailable', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 140, 'Provider secret could not be loaded when submitting, polling, or proxying files.'),
  ('provider_credential_decrypt_failed', 'system', 503, 'The service is temporarily unavailable for this model. Please retry later.', true, true, 150, 'Credential decryption failed at runtime.'),
  ('model_billing_not_configured', 'system', 503, 'The selected model is temporarily unavailable. Please retry later.', false, true, 160, 'Supported model is missing valid customer billing config.'),
  ('provider_pricing_not_configured', 'system', 503, 'The selected model is temporarily unavailable. Please retry later.', false, true, 170, 'Provider model is missing valid internal cost config.'),
  ('database_operation_failed', 'system', 503, 'The service could not access required internal records. Please retry later.', true, true, 175, 'Database reads or writes required to resolve a request failed unexpectedly.'),
  ('billing_resolution_failed', 'system', 503, 'The selected model pricing could not be evaluated. Please retry later.', true, true, 176, 'Customer or provider pricing could not be resolved from model billing configuration.'),
  ('request_record_write_failed', 'system', 503, 'The request could not be recorded internally. Please retry later.', true, true, 177, 'The gateway could not persist the initial inference request record.'),
  ('api_key_touch_failed', 'system', 503, 'The request was accepted but internal key tracking failed. Please retry later.', true, true, 178, 'The gateway failed to update API key last-used metadata after authentication.'),
  ('queue_unavailable', 'system', 503, 'The internal job queue is temporarily unavailable. Please retry later.', true, true, 179, 'The gateway accepted the request but could not enqueue it for asynchronous execution.'),
  ('provider_submit_failed', 'upstream', 502, 'The generation provider could not accept the request. Please retry shortly.', true, true, 180, 'Submit phase failed while calling the upstream provider.'),
  ('provider_poll_failed', 'upstream', 502, 'The generation provider could not complete the request. Please retry shortly.', true, true, 190, 'Polling phase failed while checking upstream task state.'),
  ('upstream_failed', 'upstream', 502, 'The generation provider failed to complete the request. Please retry shortly.', true, true, 200, 'Upstream reported a terminal failure state.'),
  ('content_policy_violation', 'safety', 400, 'The prompt or image was rejected by the provider safety policy. Please adjust the content and try again.', false, true, 205, 'Provider rejected the prompt or input image due to safety or sensitive-content policy, e.g. Wavespeed code 1200.'),
  ('upstream_timeout', 'upstream', 504, 'The generation request timed out. Please retry shortly.', true, true, 210, 'Upstream task exceeded the polling timeout window.'),
  ('upstream_result_missing', 'upstream', 502, 'The generation provider returned an incomplete result. Please retry shortly.', true, true, 220, 'Provider response did not contain the expected final output payload.'),
  ('video_output_missing', 'upstream', 502, 'The generation provider returned an incomplete result. Please retry shortly.', true, true, 230, 'Provider reported success but video output assets were missing.'),
  ('service_unavailable', 'system', 503, 'The service is temporarily unavailable. Please retry later.', true, true, 240, 'Gateway could not reach a required internal dependency.'),
  ('internal_error', 'system', 500, 'The service encountered an unexpected error. Please retry later.', true, true, 250, 'Catch-all fallback for uncategorized internal failures.')
on conflict (code) do update
set
  category = excluded.category,
  http_status = excluded.http_status,
  public_message = excluded.public_message,
  retryable = excluded.retryable,
  active = excluded.active,
  sort_order = excluded.sort_order,
  operator_notes = excluded.operator_notes;
