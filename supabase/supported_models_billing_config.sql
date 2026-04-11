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
