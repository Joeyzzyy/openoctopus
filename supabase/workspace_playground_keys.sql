create table if not exists public.workspace_playground_keys (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  api_key_id uuid not null references public.api_keys(id) on delete cascade,
  encrypted_secret text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (workspace_id)
);

create index if not exists idx_workspace_playground_keys_workspace
on public.workspace_playground_keys(workspace_id);

alter table public.workspace_playground_keys enable row level security;

drop policy if exists "workspace_playground_keys_member_read" on public.workspace_playground_keys;
create policy "workspace_playground_keys_member_read"
on public.workspace_playground_keys
for select
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_playground_keys.workspace_id
      and wm.user_id = auth.uid()
  )
);

drop policy if exists "workspace_playground_keys_admin_write" on public.workspace_playground_keys;
create policy "workspace_playground_keys_admin_write"
on public.workspace_playground_keys
for all
using (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_playground_keys.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'billing')
  )
)
with check (
  exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = workspace_playground_keys.workspace_id
      and wm.user_id = auth.uid()
      and wm.role in ('owner', 'admin', 'billing')
  )
);
