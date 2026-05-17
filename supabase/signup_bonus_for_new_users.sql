-- Add a $1 system gift to every newly registered user's default workspace.
-- Run this in Supabase SQL editor. It replaces the auth.users signup trigger
-- function; existing users are not backfilled by this script.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_workspace_id uuid;
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
  returning id into v_workspace_id;

  insert into public.workspace_members (workspace_id, user_id, role)
  values (v_workspace_id, new.id, 'owner')
  on conflict (workspace_id, user_id) do nothing;

  insert into public.wallet_transactions (
    workspace_id,
    entry_type,
    amount_delta,
    balance_after,
    description,
    metadata,
    created_by
  )
  values (
    v_workspace_id,
    'adjustment',
    1.00,
    1.00,
    'System signup bonus · $1.00 credit',
    jsonb_build_object(
      'source', 'system_signup_bonus',
      'credit_type', 'system_gift',
      'reason', 'new_user_registration',
      'user_id', new.id
    ),
    null
  );

  return new;
end;
$$;
