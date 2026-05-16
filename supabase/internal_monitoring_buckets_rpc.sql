-- Database-side aggregation for the internal monitoring overview.
-- This avoids loading raw inference request rows into the Next.js server.

create or replace function public.get_internal_monitoring_buckets(
  p_since timestamptz,
  p_interval text default 'hour',
  p_status text default 'all',
  p_model_slug text default null
)
returns table (
  public_model_slug text,
  status text,
  bucket_start timestamptz,
  total_count bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    inference_requests.public_model_slug,
    inference_requests.status,
    date_trunc(
      case
        when p_interval = 'minute' then 'minute'
        when p_interval = 'day' then 'day'
        else 'hour'
      end,
      inference_requests.created_at
    ) as bucket_start,
    count(*)::bigint as total_count
  from public.inference_requests
  where inference_requests.created_at >= p_since
    and (
      p_model_slug is null
      or p_model_slug = ''
      or inference_requests.public_model_slug = p_model_slug
    )
    and (
      p_status = 'all'
      or (p_status = 'inflight' and inference_requests.status::text in ('queued', 'submitted', 'processing'))
      or (p_status <> 'inflight' and inference_requests.status::text = p_status)
    )
  group by
    inference_requests.public_model_slug,
    inference_requests.status,
    bucket_start
  order by bucket_start asc;
$$;
