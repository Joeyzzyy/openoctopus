update public.provider_models pm
set execution_config =
  coalesce(pm.execution_config, '{}'::jsonb)
  || jsonb_build_object(
    'localQueue',
    coalesce(
      pm.execution_config -> 'localQueue',
      jsonb_build_object(
        'enabled', false,
        'concurrency', 1,
        'maxQueued', null
      )
    ),
    'upstreamQueue',
    coalesce(
      pm.execution_config -> 'upstreamQueue',
      jsonb_build_object('supported', true)
    ),
    'upstreamCancel',
    coalesce(
      pm.execution_config -> 'upstreamCancel',
      jsonb_build_object('supported', false)
    )
  ),
  updated_at = timezone('utc', now())
where exists (
  select 1
  from public.supported_models sm
  where sm.id = pm.supported_model_id
    and sm.active = true
)
and (
  pm.execution_config is null
  or not (pm.execution_config ? 'localQueue')
  or not (pm.execution_config ? 'upstreamQueue')
  or not (pm.execution_config ? 'upstreamCancel')
);
