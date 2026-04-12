create or replace function public.clear_request_records_for_api_key(
  p_workspace_id uuid,
  p_api_key_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_wallet_count integer := 0;
  deleted_usage_count integer := 0;
  deleted_request_count integer := 0;
begin
  if not public.is_workspace_admin(p_workspace_id) then
    raise exception 'insufficient permissions';
  end if;

  if not exists (
    select 1
    from public.api_keys
    where id = p_api_key_id
      and workspace_id = p_workspace_id
  ) then
    raise exception 'api key does not belong to workspace';
  end if;

  -- Delete wallet usage settlements tied to this key's usage events before deleting the events.
  with target_usage as (
    select id
    from public.usage_events
    where workspace_id = p_workspace_id
      and api_key_id = p_api_key_id
  ),
  deleted_wallet as (
    delete from public.wallet_transactions
    where workspace_id = p_workspace_id
      and entry_type = 'usage'
      and reference_id in (select id from target_usage)
    returning id
  ),
  deleted_usage as (
    delete from public.usage_events
    where id in (select id from target_usage)
    returning id
  )
  select
    (select count(*) from deleted_wallet),
    (select count(*) from deleted_usage)
  into deleted_wallet_count, deleted_usage_count;

  delete from public.inference_requests
  where workspace_id = p_workspace_id
    and api_key_id = p_api_key_id;

  get diagnostics deleted_request_count = row_count;

  with recalculated_balances as (
    select
      id,
      sum(amount_delta) over (
        order by created_at asc, id asc
        rows between unbounded preceding and current row
      )::numeric(12,2) as balance_after
    from public.wallet_transactions
    where workspace_id = p_workspace_id
  )
  update public.wallet_transactions as wt
  set balance_after = rb.balance_after
  from recalculated_balances as rb
  where wt.id = rb.id
    and wt.balance_after is distinct from rb.balance_after;

  return jsonb_build_object(
    'deleted_wallet_transactions', deleted_wallet_count,
    'deleted_usage_events', deleted_usage_count,
    'deleted_inference_requests', deleted_request_count,
    'wallet_transactions_preserved', false
  );
end;
$$;

revoke all on function public.clear_request_records_for_api_key(uuid, uuid) from public;
grant execute on function public.clear_request_records_for_api_key(uuid, uuid) to authenticated;
