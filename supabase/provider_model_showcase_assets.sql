create table if not exists public.provider_model_showcase_assets (
  id uuid primary key default gen_random_uuid(),
  provider_model_id uuid not null references public.provider_models(id) on delete cascade,
  asset_kind text not null check (asset_kind in ('cover', 'gallery')),
  storage_bucket text not null default 'model-showcase-assets',
  storage_path text not null,
  public_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists uniq_provider_model_showcase_cover
  on public.provider_model_showcase_assets(provider_model_id)
  where asset_kind = 'cover';

create index if not exists idx_provider_model_showcase_assets_order
  on public.provider_model_showcase_assets(provider_model_id, asset_kind, sort_order, created_at);

drop trigger if exists set_provider_model_showcase_assets_updated_at on public.provider_model_showcase_assets;
create trigger set_provider_model_showcase_assets_updated_at
before update on public.provider_model_showcase_assets
for each row execute function public.set_updated_at();

alter table public.provider_model_showcase_assets enable row level security;

drop policy if exists "provider_model_showcase_assets_read_all" on public.provider_model_showcase_assets;
create policy "provider_model_showcase_assets_read_all"
on public.provider_model_showcase_assets for select
using (true);

drop policy if exists "provider_model_showcase_assets_operator_write" on public.provider_model_showcase_assets;
create policy "provider_model_showcase_assets_operator_write"
on public.provider_model_showcase_assets for all
using (public.is_workspace_member(auth.uid()))
with check (public.is_workspace_member(auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'model-showcase-assets',
  'model-showcase-assets',
  true,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/gif'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read model showcase assets" on storage.objects;
create policy "Public read model showcase assets"
on storage.objects
for select
to public
using (bucket_id = 'model-showcase-assets');

drop policy if exists "Service role manage model showcase assets" on storage.objects;
create policy "Service role manage model showcase assets"
on storage.objects
for all
to service_role
using (bucket_id = 'model-showcase-assets')
with check (bucket_id = 'model-showcase-assets');
