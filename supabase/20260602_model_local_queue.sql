create or replace function public.try_claim_queued_inference_request(
  p_request_id uuid,
  p_provider_model_id uuid,
  p_concurrency integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request record;
  v_running_count integer;
  v_earlier_count integer;
begin
  if p_concurrency is null or p_concurrency < 1 then
    p_concurrency := 1;
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_provider_model_id::text, 0));

  select id, status, provider_model_id, priority, queued_at
  into v_request
  from public.inference_requests
  where id = p_request_id
  for update;

  if not found then
    return false;
  end if;

  if v_request.status <> 'queued' or v_request.provider_model_id is distinct from p_provider_model_id then
    return false;
  end if;

  select count(*)
  into v_running_count
  from public.inference_requests
  where provider_model_id = p_provider_model_id
    and status = 'processing';

  if v_running_count >= p_concurrency then
    return false;
  end if;

  select count(*)
  into v_earlier_count
  from public.inference_requests
  where provider_model_id = p_provider_model_id
    and status = 'queued'
    and (
      priority < v_request.priority
      or (priority = v_request.priority and queued_at < v_request.queued_at)
      or (priority = v_request.priority and queued_at = v_request.queued_at and id < v_request.id)
    );

  if v_earlier_count > 0 then
    return false;
  end if;

  update public.inference_requests
  set
    status = 'processing',
    started_at = coalesce(started_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where id = p_request_id
    and status = 'queued';

  return found;
end;
$$;

create or replace function public.get_inference_queue_position(p_request_id uuid)
returns table(queue_position integer, queue_size integer)
language sql
stable
security definer
set search_path = public
as $$
  with current_request as (
    select id, provider_model_id, status, priority, queued_at
    from public.inference_requests
    where id = p_request_id
  ),
  queued_requests as (
    select r.id, r.priority, r.queued_at
    from public.inference_requests r
    join current_request c on c.provider_model_id = r.provider_model_id
    where r.status = 'queued'
  )
  select
    case
      when c.status = 'queued' then (
        select count(*)::integer + 1
        from queued_requests q
        where
          q.priority < c.priority
          or (q.priority = c.priority and q.queued_at < c.queued_at)
          or (q.priority = c.priority and q.queued_at = c.queued_at and q.id < c.id)
      )
      when c.status = 'processing' then 0
      else null
    end as queue_position,
    (select count(*)::integer from queued_requests) as queue_size
  from current_request c;
$$;
