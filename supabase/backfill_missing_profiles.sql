-- Backfill profiles for legacy auth users that were created before the signup
-- trigger was fixed, or while the trigger failed.
insert into public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
select
  users.id,
  users.email,
  coalesce(
    nullif(users.raw_user_meta_data ->> 'full_name', ''),
    nullif(users.raw_user_meta_data ->> 'name', ''),
    split_part(users.email, '@', 1)
  ) as full_name,
  nullif(users.raw_user_meta_data ->> 'avatar_url', '') as avatar_url,
  coalesce(users.created_at, timezone('utc'::text, now())) as created_at,
  timezone('utc'::text, now()) as updated_at
from auth.users
left join public.profiles on profiles.id = users.id
where profiles.id is null
  and users.email is not null;
