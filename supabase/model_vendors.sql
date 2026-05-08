begin;

create table if not exists public.model_vendors (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_model_vendors_active_sort
  on public.model_vendors (active, sort_order, name);

insert into public.model_vendors (name, active, sort_order)
values
  ('Google', true, 10),
  ('OpenAI', true, 20),
  ('Anthropic', true, 30),
  ('Meta', true, 40),
  ('xAI', true, 50)
on conflict (name) do nothing;

commit;
