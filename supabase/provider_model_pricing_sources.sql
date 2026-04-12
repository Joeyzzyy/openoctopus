alter table public.provider_models
  add column if not exists pricing_source_url text,
  add column if not exists pricing_source_note text,
  add column if not exists pricing_source_evidence jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'provider_models_pricing_source_evidence_is_array'
  ) then
    alter table public.provider_models
      add constraint provider_models_pricing_source_evidence_is_array
      check (jsonb_typeof(pricing_source_evidence) = 'array');
  end if;
end;
$$;

insert into storage.buckets (id, name, public)
values ('provider-pricing-evidence', 'provider-pricing-evidence', false)
on conflict (id) do nothing;
