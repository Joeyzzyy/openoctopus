-- OpenOctopus dashboard bootstrap for Supabase
-- Run this in Supabase SQL editor in one pass.

create extension if not exists pgcrypto;
create extension if not exists citext;

create type public.workspace_role as enum ('owner', 'admin', 'billing', 'developer', 'viewer');
create type public.api_key_status as enum ('active', 'warning', 'paused', 'revoked');
create type public.ledger_entry_type as enum ('topup', 'usage', 'refund', 'adjustment');
create type public.budget_scope as enum ('workspace', 'api_key', 'model');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  workspace_id uuid;
  base_slug text;
  derived_slug text;
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  base_slug := lower(
    regexp_replace(
      coalesce(split_part(new.email, '@', 1), 'workspace'),
      '[^a-z0-9]+',
      '-',
      'g'
    )
  );

  derived_slug := trim(both '-' from base_slug);

  if derived_slug is null or derived_slug = '' then
    derived_slug := 'workspace';
  end if;

  derived_slug := left(derived_slug, 40) || '-' || left(replace(new.id::text, '-', ''), 8);

  insert into public.workspaces (
    name,
    slug,
    owner_user_id,
    monthly_budget
  )
  values (
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'OpenOctopus Workspace'),
    derived_slug,
    new.id,
    0
  )
  returning id into workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email citext unique,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug citext not null unique,
  currency text not null default 'USD',
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  monthly_budget numeric(12,2) not null default 0,
  alert_thresholds integer[] not null default array[50, 80, 100],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.workspace_role not null default 'viewer',
  created_at timestamptz not null default timezone('utc', now()),
  primary key (workspace_id, user_id)
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  entry_type public.ledger_entry_type not null,
  amount_delta numeric(12,2) not null,
  balance_after numeric(12,2),
  description text not null,
  reference_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.supported_models (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  model_slug text not null unique,
  display_name text not null,
  modality text not null,
  billing_config jsonb not null default '{"billingMode":"hybrid","currency":"USD","charges":{"perRequest":0.01}}'::jsonb,
  unit_label text not null,
  default_unit_cost numeric(12,6) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.supported_models
  add column if not exists billing_config jsonb not null default '{"billingMode":"hybrid","currency":"USD","charges":{"perRequest":0.01}}'::jsonb;

update public.supported_models
set billing_config = case
  when unit_label = 'image' then jsonb_build_object(
    'billingMode', 'hybrid',
    'currency', 'USD',
    'charges', jsonb_build_object('perImage', default_unit_cost)
  )
  when unit_label = 'video' then jsonb_build_object(
    'billingMode', 'hybrid',
    'currency', 'USD',
    'charges', jsonb_build_object('perVideo', default_unit_cost)
  )
  when unit_label = 'second' then jsonb_build_object(
    'billingMode', 'hybrid',
    'currency', 'USD',
    'charges', jsonb_build_object('perSecond', default_unit_cost)
  )
  else jsonb_build_object(
    'billingMode', 'hybrid',
    'currency', 'USD',
    'charges', jsonb_build_object('perRequest', greatest(default_unit_cost, 0.01))
  )
end
where billing_config is null
   or billing_config = '{}'::jsonb
   or not (billing_config ? 'billingMode');

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null unique,
  secret_hash text not null,
  environment text not null default 'Production',
  status public.api_key_status not null default 'active',
  monthly_budget numeric(12,2),
  hard_limit boolean not null default false,
  expires_at timestamptz,
  last_used_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.budget_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  scope public.budget_scope not null,
  api_key_id uuid references public.api_keys(id) on delete cascade,
  model_id uuid references public.supported_models(id) on delete cascade,
  monthly_limit numeric(12,2) not null,
  alert_thresholds integer[] not null default array[50, 80, 100],
  hard_stop boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint budget_scope_target_check check (
    (scope = 'workspace' and api_key_id is null and model_id is null) or
    (scope = 'api_key' and api_key_id is not null and model_id is null) or
    (scope = 'model' and model_id is not null)
  )
);

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  model_id uuid references public.supported_models(id) on delete set null,
  external_request_id text unique,
  endpoint text not null,
  request_count integer not null default 1,
  input_units numeric(18,4) not null default 0,
  output_units numeric(18,4) not null default 0,
  total_cost numeric(12,6) not null default 0,
  customer_charge numeric(12,6) not null default 0,
  provider_cost numeric(12,6) not null default 0,
  gross_profit numeric(12,6) not null default 0,
  status_code integer,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_workspace_members_user on public.workspace_members(user_id);
create index if not exists idx_wallet_transactions_workspace_created on public.wallet_transactions(workspace_id, created_at desc);
create index if not exists idx_api_keys_workspace_status on public.api_keys(workspace_id, status);
create index if not exists idx_budget_rules_workspace_scope on public.budget_rules(workspace_id, scope);
create index if not exists idx_usage_events_workspace_created on public.usage_events(workspace_id, created_at desc);
create index if not exists idx_usage_events_api_key_created on public.usage_events(api_key_id, created_at desc);
create index if not exists idx_usage_events_model_created on public.usage_events(model_id, created_at desc);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

drop trigger if exists set_workspaces_updated_at on public.workspaces;
create trigger set_workspaces_updated_at
before update on public.workspaces
for each row execute function public.set_updated_at();

drop trigger if exists set_api_keys_updated_at on public.api_keys;
create trigger set_api_keys_updated_at
before update on public.api_keys
for each row execute function public.set_updated_at();

drop trigger if exists set_budget_rules_updated_at on public.budget_rules;
create trigger set_budget_rules_updated_at
before update on public.budget_rules
for each row execute function public.set_updated_at();

create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'billing')
  );
$$;

create or replace function public.is_operator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin')
  );
$$;

create or replace view public.v_api_key_spend_summary as
select
  k.id as api_key_id,
  k.workspace_id,
  k.name,
  k.key_prefix,
  k.status,
  k.environment,
  k.monthly_budget,
  coalesce(sum(case when date_trunc('month', u.created_at) = date_trunc('month', timezone('utc', now())) then u.total_cost else 0 end), 0)::numeric(12,2) as current_month_spend,
  coalesce(sum(case when date_trunc('month', u.created_at) = date_trunc('month', timezone('utc', now())) then u.request_count else 0 end), 0) as current_month_requests,
  max(u.created_at) as last_event_at
from public.api_keys k
left join public.usage_events u on u.api_key_id = k.id
group by k.id;

create or replace view public.v_model_spend_summary as
select
  u.workspace_id,
  m.id as model_id,
  m.display_name,
  m.provider,
  count(*) as request_rows,
  sum(u.request_count) as total_requests,
  sum(u.total_cost)::numeric(12,2) as total_spend
from public.usage_events u
join public.supported_models m on m.id = u.model_id
where date_trunc('month', u.created_at) = date_trunc('month', timezone('utc', now()))
group by u.workspace_id, m.id, m.display_name, m.provider;

create or replace view public.v_workspace_daily_spend as
select
  u.workspace_id,
  date_trunc('day', u.created_at)::date as usage_day,
  sum(u.total_cost)::numeric(12,2) as total_spend,
  sum(u.request_count) as total_requests
from public.usage_events u
group by u.workspace_id, date_trunc('day', u.created_at)::date;

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
  returning * into inserted_event;

  select coalesce(sum(amount_delta), 0)::numeric(12,2)
  into running_balance
  from public.wallet_transactions
  where workspace_id = p_workspace_id;

  if coalesce(p_customer_charge, 0) > 0 then
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

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.api_keys enable row level security;
alter table public.budget_rules enable row level security;
alter table public.usage_events enable row level security;
alter table public.supported_models enable row level security;

drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
using (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles for update
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "workspaces_member_read" on public.workspaces;
create policy "workspaces_member_read"
on public.workspaces for select
using (public.is_workspace_member(id));

drop policy if exists "workspaces_admin_write" on public.workspaces;
create policy "workspaces_admin_write"
on public.workspaces for all
using (public.is_workspace_admin(id))
with check (public.is_workspace_admin(id));

drop policy if exists "workspace_members_member_read" on public.workspace_members;
create policy "workspace_members_member_read"
on public.workspace_members for select
using (user_id = auth.uid());

drop policy if exists "workspace_members_admin_write" on public.workspace_members;
create policy "workspace_members_admin_write"
on public.workspace_members for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "wallet_transactions_member_read" on public.wallet_transactions;
create policy "wallet_transactions_member_read"
on public.wallet_transactions for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "wallet_transactions_admin_write" on public.wallet_transactions;
create policy "wallet_transactions_admin_write"
on public.wallet_transactions for insert
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "api_keys_member_read" on public.api_keys;
create policy "api_keys_member_read"
on public.api_keys for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "api_keys_admin_write" on public.api_keys;
create policy "api_keys_admin_write"
on public.api_keys for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "budget_rules_member_read" on public.budget_rules;
create policy "budget_rules_member_read"
on public.budget_rules for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "budget_rules_admin_write" on public.budget_rules;
create policy "budget_rules_admin_write"
on public.budget_rules for all
using (public.is_workspace_admin(workspace_id))
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "usage_events_member_read" on public.usage_events;
create policy "usage_events_member_read"
on public.usage_events for select
using (public.is_workspace_member(workspace_id));

drop policy if exists "usage_events_service_insert" on public.usage_events;
create policy "usage_events_service_insert"
on public.usage_events for insert
with check (public.is_workspace_admin(workspace_id));

drop policy if exists "supported_models_read_all" on public.supported_models;
create policy "supported_models_read_all"
on public.supported_models for select
using (true);

drop policy if exists "supported_models_operator_write" on public.supported_models;
create policy "supported_models_operator_write"
on public.supported_models for all
using (public.is_operator())
with check (public.is_operator());

-- Intentionally no supported model seed data here.
-- Internal admins should create real public models in /internal.
