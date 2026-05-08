begin;

alter table public.providers
  drop column if exists kind;

do $$
begin
  if exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'provider_kind'
  ) then
    drop type public.provider_kind;
  end if;
end $$;

commit;
