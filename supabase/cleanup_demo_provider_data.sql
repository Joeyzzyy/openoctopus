-- Remove previously seeded demo provider/routing data.
-- Run this once if earlier bootstrap versions inserted sample upstreams.

delete from public.routing_rules
where public_model_slug in (
  'openoctopus/seedream-4.5',
  'openoctopus/kling-v3-motion',
  'openoctopus/flux-kontext-edit'
);

delete from public.provider_credentials
where provider_id in (
  select id
  from public.providers
  where slug in ('wavespeed-images', 'wavespeed-video', 'partner-provider-a')
);

delete from public.provider_models
where public_model_slug in (
  'openoctopus/seedream-4.5',
  'openoctopus/kling-v3-motion',
  'openoctopus/flux-kontext-edit'
)
or provider_id in (
  select id
  from public.providers
  where slug in ('wavespeed-images', 'wavespeed-video', 'partner-provider-a')
);

delete from public.providers
where slug in ('wavespeed-images', 'wavespeed-video', 'partner-provider-a');

delete from public.supported_models
where model_slug in (
  'openoctopus/seedream-4.5',
  'openoctopus/kling-v3-motion',
  'openoctopus/flux-kontext-edit',
  'seedream-v4-5',
  'kling-v3-motion-control',
  'nano-banana-2',
  'infinitetalk',
  'flux-kontext'
);
