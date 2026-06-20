create or replace view public.v_workspace_wallet_summary
with (security_invoker = true) as
select
  workspace_id,
  coalesce(sum(amount_delta), 0)::numeric(12,2) as balance,
  coalesce(
    sum(amount_delta) filter (
      where entry_type = 'topup' and amount_delta > 0
    ),
    0
  )::numeric(12,2) as topup,
  coalesce(
    sum(amount_delta) filter (
      where entry_type <> 'topup' and amount_delta > 0
    ),
    0
  )::numeric(12,2) as system_credit,
  coalesce(
    abs(
      sum(amount_delta) filter (
        where amount_delta < 0
      )
    ),
    0
  )::numeric(12,2) as usage
from public.wallet_transactions
group by workspace_id;
