-- Provider adapter alias mapping (admin-configurable).
-- Run this once in Supabase SQL editor.

create table if not exists public.provider_adapter_aliases (
  id uuid primary key default gen_random_uuid(),
  alias_slug text not null unique,
  adapter_slug text not null,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint provider_adapter_aliases_slug_format_check
    check (alias_slug ~ '^[a-z0-9-]+$' and adapter_slug ~ '^[a-z0-9-]+$')
);

create index if not exists idx_provider_adapter_aliases_active
  on public.provider_adapter_aliases(active, alias_slug);

drop trigger if exists set_provider_adapter_aliases_updated_at on public.provider_adapter_aliases;
create trigger set_provider_adapter_aliases_updated_at
before update on public.provider_adapter_aliases
for each row execute function public.set_updated_at();
