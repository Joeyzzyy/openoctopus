alter table public.supported_models
  add column if not exists billing_config jsonb not null default '{"billingMode":"per_request","currency":"USD","costPerRequest":0}'::jsonb;

update public.supported_models
set billing_config = case
  when unit_label = 'image' then jsonb_build_object(
    'billingMode', 'per_image',
    'currency', 'USD',
    'costPerImage', default_unit_cost
  )
  when unit_label = 'video' then jsonb_build_object(
    'billingMode', 'per_video',
    'currency', 'USD',
    'costPerVideo', default_unit_cost
  )
  when unit_label = 'second' then jsonb_build_object(
    'billingMode', 'per_second',
    'currency', 'USD',
    'costPerSecond', default_unit_cost
  )
  else jsonb_build_object(
    'billingMode', 'per_request',
    'currency', 'USD',
    'costPerRequest', default_unit_cost
  )
end
where billing_config is null
   or billing_config = '{}'::jsonb
   or not (billing_config ? 'billingMode');
