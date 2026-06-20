create table if not exists public.provider_asset_storage_credentials (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references public.providers(id) on delete cascade,
  label text not null,
  storage_provider text not null default 'aliyun-oss',
  bucket text not null,
  region text,
  endpoint text,
  public_base_url text,
  access_key_id_ciphertext text not null,
  access_key_id_iv text not null,
  access_key_id_auth_tag text not null,
  access_key_id_mask text not null,
  access_key_secret_ciphertext text not null,
  access_key_secret_iv text not null,
  access_key_secret_auth_tag text not null,
  access_key_secret_mask text not null,
  secret_key_version integer not null default 1,
  secret_last_updated_at timestamptz not null default timezone('utc', now()),
  is_active boolean not null default true,
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint provider_asset_storage_credentials_provider_check
    check (storage_provider in ('aliyun-oss', 'tencent-cos'))
);

create index if not exists idx_provider_asset_storage_credentials_provider
  on public.provider_asset_storage_credentials(provider_id, created_at desc);

drop trigger if exists set_provider_asset_storage_credentials_updated_at
  on public.provider_asset_storage_credentials;
create trigger set_provider_asset_storage_credentials_updated_at
before update on public.provider_asset_storage_credentials
for each row execute function public.set_updated_at();

alter table public.provider_asset_storage_credentials enable row level security;

drop policy if exists "provider_asset_storage_credentials_no_direct_api_access"
  on public.provider_asset_storage_credentials;
create policy "provider_asset_storage_credentials_no_direct_api_access"
on public.provider_asset_storage_credentials
for all
to authenticated, anon
using (false)
with check (false);
