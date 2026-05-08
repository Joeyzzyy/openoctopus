-- Atomic update for internal model economics matrix editing.
-- Run this in Supabase SQL editor before using updateModelEconomicsBundle action.

create or replace function public.admin_update_model_economics_bundle(
  p_supported_model_id uuid,
  p_provider_model_id uuid,
  p_supported_billing_config jsonb,
  p_supported_unit_label text,
  p_supported_default_unit_cost numeric,
  p_provider_pricing jsonb,
  p_pricing_source_url text default null,
  p_pricing_source_note text default null,
  p_pricing_source_evidence jsonb default '[]'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_supported_match boolean;
begin
  select exists(
    select 1
    from public.provider_models pm
    where pm.id = p_provider_model_id
      and pm.supported_model_id = p_supported_model_id
  )
  into v_supported_match;

  if not v_supported_match then
    raise exception 'Provider model % does not belong to supported model %',
      p_provider_model_id, p_supported_model_id;
  end if;

  update public.supported_models
  set
    billing_config = p_supported_billing_config,
    unit_label = p_supported_unit_label,
    default_unit_cost = p_supported_default_unit_cost
  where id = p_supported_model_id;

  if not found then
    raise exception 'Supported model % is missing', p_supported_model_id;
  end if;

  update public.provider_models
  set
    pricing = p_provider_pricing,
    pricing_source_url = p_pricing_source_url,
    pricing_source_note = p_pricing_source_note,
    pricing_source_evidence = p_pricing_source_evidence
  where id = p_provider_model_id;

  if not found then
    raise exception 'Provider model % is missing', p_provider_model_id;
  end if;
end;
$$;

revoke all on function public.admin_update_model_economics_bundle(
  uuid, uuid, jsonb, text, numeric, jsonb, text, text, jsonb
) from public;

grant execute on function public.admin_update_model_economics_bundle(
  uuid, uuid, jsonb, text, numeric, jsonb, text, text, jsonb
) to authenticated;
