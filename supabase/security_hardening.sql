-- Security hardening patch for existing Supabase databases.
-- Run this after the bootstrap scripts on environments that already exist.

-- Ensure dashboard views run with the querying role's RLS context.
alter view if exists public.v_api_key_spend_summary
  set (security_invoker = true);

alter view if exists public.v_model_spend_summary
  set (security_invoker = true);

alter view if exists public.v_workspace_daily_spend
  set (security_invoker = true);

-- Lock down API-exposed tables that were created outside this repo's bootstrap.
-- Enabling RLS without user-facing policies keeps them inaccessible to anon/authenticated
-- while still allowing privileged service roles to operate.
alter table if exists public.credit_transactions enable row level security;
alter table if exists public.user_purchased_logs enable row level security;

drop policy if exists "credit_transactions_no_direct_api_access" on public.credit_transactions;
create policy "credit_transactions_no_direct_api_access"
on public.credit_transactions
for all
to authenticated, anon
using (false)
with check (false);

drop policy if exists "user_purchased_logs_no_direct_api_access" on public.user_purchased_logs;
create policy "user_purchased_logs_no_direct_api_access"
on public.user_purchased_logs
for all
to authenticated, anon
using (false)
with check (false);
