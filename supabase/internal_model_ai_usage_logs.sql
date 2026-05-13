create table if not exists public.internal_model_ai_usage_logs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null references public.workspaces(id) on delete set null,
  actor_user_id uuid null references auth.users(id) on delete set null,
  source_url text not null,
  model text not null default 'gemini-2.5-pro',
  status text not null check (status in ('succeeded', 'failed')),
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost_usd numeric(12,8) not null default 0,
  latency_ms integer not null default 0,
  error_message text null,
  result_payload jsonb null,
  raw_response jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists idx_internal_model_ai_usage_logs_created_at
  on public.internal_model_ai_usage_logs(created_at desc);

create index if not exists idx_internal_model_ai_usage_logs_workspace
  on public.internal_model_ai_usage_logs(workspace_id, created_at desc);
