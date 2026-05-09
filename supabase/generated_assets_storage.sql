-- Create a private bucket for cached generated assets (videos/images).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated-assets',
  'generated-assets',
  false,
  5368709120,
  array[
    'video/mp4',
    'video/webm',
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/octet-stream'
  ]
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role can fully manage objects in this bucket.
drop policy if exists "Service role manage generated assets" on storage.objects;
create policy "Service role manage generated assets"
on storage.objects
for all
to service_role
using (bucket_id = 'generated-assets')
with check (bucket_id = 'generated-assets');

