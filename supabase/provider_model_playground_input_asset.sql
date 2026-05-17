alter table public.provider_model_showcase_assets
  drop constraint if exists provider_model_showcase_assets_asset_kind_check;

alter table public.provider_model_showcase_assets
  add constraint provider_model_showcase_assets_asset_kind_check
  check (asset_kind in ('cover', 'gallery', 'playground_input'));

create unique index if not exists uniq_provider_model_showcase_playground_input
  on public.provider_model_showcase_assets(provider_model_id)
  where asset_kind = 'playground_input';
