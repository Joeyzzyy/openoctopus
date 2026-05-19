alter type public.request_capability add value if not exists 'text_generation';

do $$
begin
  if to_regclass('public.provider_capability_execution_configs') is not null then
    alter table public.provider_capability_execution_configs
    drop constraint if exists provider_capability_execution_configs_capability_check;

    alter table public.provider_capability_execution_configs
    add constraint provider_capability_execution_configs_capability_check
    check (capability in ('image_generation', 'image_edit', 'image_recognition', 'text_generation', 'video_generation'));
  end if;
end $$;
