alter table public.provider_credentials
  alter column secret_ref drop not null;

alter table public.provider_credentials
  add column if not exists secret_ciphertext text,
  add column if not exists secret_iv text,
  add column if not exists secret_auth_tag text,
  add column if not exists secret_mask text,
  add column if not exists secret_source text not null default 'internal_encrypted',
  add column if not exists secret_key_version integer not null default 1,
  add column if not exists secret_last_updated_at timestamptz not null default timezone('utc', now());

update public.provider_credentials
set
  secret_source = case
    when secret_ciphertext is not null then 'internal_encrypted'
    else 'external_ref'
  end,
  secret_mask = case
    when secret_mask is not null then secret_mask
    when secret_ref is not null then '[legacy external secret reference]'
    else secret_mask
  end,
  secret_last_updated_at = coalesce(secret_last_updated_at, updated_at, created_at, timezone('utc', now()))
where
  secret_source is distinct from case
    when secret_ciphertext is not null then 'internal_encrypted'
    else 'external_ref'
  end
  or secret_mask is null
  or secret_last_updated_at is null;
