alter table public.inference_requests
add column if not exists request_source text not null default 'api';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'inference_requests_request_source_check'
  ) then
    alter table public.inference_requests
    add constraint inference_requests_request_source_check
    check (request_source in ('api', 'playground'));
  end if;
end $$;

create index if not exists idx_inference_requests_workspace_source_created
on public.inference_requests(workspace_id, request_source, created_at desc);
