update public.provider_models
set execution_config =
  coalesce(execution_config, '{}'::jsonb)
  || jsonb_build_object(
    'assetStorage',
    jsonb_build_object(
      'provider', 'supabase',
      'input', jsonb_build_object('bucket', 'generated-assets'),
      'output', jsonb_build_object('bucket', 'generated-assets'),
      'signedUrlTtlSeconds', 86400
    )
  )
where not (coalesce(execution_config, '{}'::jsonb) ? 'assetStorage');
