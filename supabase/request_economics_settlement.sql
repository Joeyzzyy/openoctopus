alter table public.inference_requests
  add column if not exists estimated_customer_charge numeric(12,6) not null default 0,
  add column if not exists actual_customer_charge numeric(12,6) not null default 0,
  add column if not exists estimated_provider_cost numeric(12,6) not null default 0,
  add column if not exists actual_provider_cost numeric(12,6) not null default 0,
  add column if not exists estimated_profit numeric(12,6) not null default 0,
  add column if not exists actual_profit numeric(12,6) not null default 0;

alter table public.usage_events
  add column if not exists customer_charge numeric(12,6) not null default 0,
  add column if not exists provider_cost numeric(12,6) not null default 0,
  add column if not exists gross_profit numeric(12,6) not null default 0;

update public.inference_requests
set
  estimated_customer_charge = coalesce(estimated_customer_charge, estimated_cost, 0),
  actual_customer_charge = coalesce(actual_customer_charge, actual_cost, 0),
  estimated_profit = coalesce(estimated_profit, estimated_customer_charge - estimated_provider_cost, 0),
  actual_profit = coalesce(actual_profit, actual_customer_charge - actual_provider_cost, 0)
where true;

update public.usage_events
set
  customer_charge = coalesce(customer_charge, total_cost, 0),
  gross_profit = coalesce(gross_profit, customer_charge - provider_cost, 0)
where true;

create or replace function public.record_request_settlement(
  p_workspace_id uuid,
  p_api_key_id uuid,
  p_model_id uuid,
  p_external_request_id text,
  p_endpoint text,
  p_request_count integer,
  p_input_units numeric,
  p_output_units numeric,
  p_customer_charge numeric,
  p_provider_cost numeric,
  p_status_code integer,
  p_metadata jsonb default '{}'::jsonb
)
returns public.usage_events
language plpgsql
security definer
set search_path = public
as $$
declare
  inserted_event public.usage_events;
  running_balance numeric(12,2);
begin
  insert into public.usage_events (
    workspace_id,
    api_key_id,
    model_id,
    external_request_id,
    endpoint,
    request_count,
    input_units,
    output_units,
    total_cost,
    customer_charge,
    provider_cost,
    gross_profit,
    status_code,
    metadata
  )
  values (
    p_workspace_id,
    p_api_key_id,
    p_model_id,
    p_external_request_id,
    p_endpoint,
    coalesce(p_request_count, 1),
    coalesce(p_input_units, 0),
    coalesce(p_output_units, 0),
    coalesce(p_customer_charge, 0),
    coalesce(p_customer_charge, 0),
    coalesce(p_provider_cost, 0),
    coalesce(p_customer_charge, 0) - coalesce(p_provider_cost, 0),
    p_status_code,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (external_request_id) do update
  set
    endpoint = excluded.endpoint,
    request_count = excluded.request_count,
    input_units = excluded.input_units,
    output_units = excluded.output_units,
    total_cost = excluded.total_cost,
    customer_charge = excluded.customer_charge,
    provider_cost = excluded.provider_cost,
    gross_profit = excluded.gross_profit,
    status_code = excluded.status_code,
    metadata = excluded.metadata
  returning * into inserted_event;

  select coalesce(sum(amount_delta), 0)::numeric(12,2)
  into running_balance
  from public.wallet_transactions
  where workspace_id = p_workspace_id;

  if coalesce(p_customer_charge, 0) > 0 and not exists (
    select 1
    from public.wallet_transactions
    where reference_id = inserted_event.id
      and entry_type = 'usage'
  ) then
    running_balance := running_balance - coalesce(p_customer_charge, 0)::numeric(12,2);

    insert into public.wallet_transactions (
      workspace_id,
      entry_type,
      amount_delta,
      balance_after,
      description,
      reference_id,
      metadata
    )
    values (
      p_workspace_id,
      'usage',
      -coalesce(p_customer_charge, 0)::numeric(12,2),
      running_balance,
      'Model usage settlement',
      inserted_event.id,
      jsonb_build_object(
        'api_key_id', p_api_key_id,
        'model_id', p_model_id,
        'endpoint', p_endpoint,
        'customer_charge', coalesce(p_customer_charge, 0),
        'provider_cost', coalesce(p_provider_cost, 0),
        'gross_profit', coalesce(p_customer_charge, 0) - coalesce(p_provider_cost, 0)
      )
    );
  end if;

  update public.api_keys
  set last_used_at = timezone('utc', now())
  where id = p_api_key_id;

  return inserted_event;
end;
$$;
