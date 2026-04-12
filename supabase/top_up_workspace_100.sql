-- Top up the workspace behind one user email by $100.00.
-- Replace the email below, then run this in Supabase SQL editor.

with target as (
  select workspace_members.workspace_id
  from public.profiles
  join public.workspace_members
    on workspace_members.user_id = profiles.id
  where profiles.email = 'zhuyuejoey@gmail.com'
  order by
    case workspace_members.role
      when 'owner' then 1
      when 'admin' then 2
      when 'billing' then 3
      else 9
    end,
    workspace_members.created_at asc
  limit 1
),
current_balance as (
  select
    target.workspace_id,
    coalesce(sum(wallet_transactions.amount_delta), 0)::numeric(12, 2) as balance
  from target
  left join public.wallet_transactions
    on wallet_transactions.workspace_id = target.workspace_id
  group by target.workspace_id
)
insert into public.wallet_transactions (
  workspace_id,
  entry_type,
  amount_delta,
  balance_after,
  description,
  metadata
)
select
  workspace_id,
  'topup',
  100.00,
  balance + 100.00,
  'Manual $100 top-up for OpenOctopus Tools testing',
  jsonb_build_object(
    'source', 'manual_sql',
    'reason', 'enable api smoke test',
    'amount_usd', 100.00
  )
from current_balance
returning id, workspace_id, amount_delta, balance_after, description, created_at;
