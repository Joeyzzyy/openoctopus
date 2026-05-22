begin;

create table if not exists public.static_model_type_options (
  id uuid primary key default gen_random_uuid(),
  value text not null unique,
  label text not null,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_static_model_type_options_active_sort
  on public.static_model_type_options (active, sort_order, value);

drop trigger if exists set_static_model_type_options_updated_at on public.static_model_type_options;
create trigger set_static_model_type_options_updated_at
before update on public.static_model_type_options
for each row execute function public.set_updated_at();

alter table public.static_model_type_options enable row level security;

insert into public.static_model_type_options (value, label, active, sort_order)
values
  ('text-to-video', 'text-to-video', true, 10),
  ('text-to-image', 'text-to-image', true, 20),
  ('lora-support', 'lora-support', true, 30),
  ('image-to-video', 'image-to-video', true, 40),
  ('image-to-image', 'image-to-image', true, 50),
  ('image-to-3d', 'image-to-3d', true, 60),
  ('video-dubbing', 'video-dubbing', true, 70),
  ('training', 'training', true, 80),
  ('video-to-video', 'video-to-video', true, 90),
  ('upscaler', 'upscaler', true, 100),
  ('video-effects', 'video-effects', true, 110),
  ('image-effects', 'image-effects', true, 120),
  ('portrait-transfer', 'portrait-transfer', true, 130),
  ('text-to-audio', 'text-to-audio', true, 140),
  ('ai-remover', 'ai-remover', true, 150),
  ('digital-human', 'digital-human', true, 160),
  ('motion-control', 'motion-control', true, 170),
  ('content-moderation', 'content-moderation', true, 180),
  ('llm', 'llm', true, 190),
  ('video-to-text', 'video-to-text', true, 200),
  ('image-to-text', 'image-to-text', true, 210),
  ('image-to-prompt', 'image-to-prompt', true, 220),
  ('speech-to-text', 'speech-to-text', true, 230),
  ('audio-to-audio', 'audio-to-audio', true, 240),
  ('video-extend', 'video-extend', true, 250),
  ('text-to-3d', 'text-to-3d', true, 260),
  ('video-to-audio', 'video-to-audio', true, 270)
on conflict (value) do update
set
  label = excluded.label,
  active = excluded.active,
  sort_order = excluded.sort_order;

commit;
