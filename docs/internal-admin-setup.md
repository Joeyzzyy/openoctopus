# Internal Admin Setup

The internal control plane lives at `/internal`.

## What grants access

Access is based on the existing `workspace_members` role.

- `owner` can access `/internal`
- `admin` can access `/internal`
- other roles are blocked

There is no separate "admin workspace" type right now. The internal dashboard uses your normal workspace membership and checks whether your role is `owner` or `admin`.

## How the first admin account works

When a user signs up, the trigger in `supabase/dashboard_bootstrap.sql` creates:

- a `profiles` row
- a `workspaces` row
- a `workspace_members` row with role `owner`

That means the first user who signs up through this project automatically becomes an internal admin for their own workspace and can open `/internal`.

## Required database setup

Run these SQL files in order in Supabase:

1. `supabase/dashboard_bootstrap.sql`
2. `supabase/orchestration_bootstrap.sql`
3. `supabase/provider_credentials_encrypted_secrets.sql` if your project was bootstrapped before encrypted provider-secret storage was added

The second file now includes the internal admin tables:

- `provider_credentials`
- `admin_audit_logs`

## Required environment variables

The web app expects:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `INTERNAL_SECRET_ENCRYPTION_KEY`

The gateway worker also needs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SECRET_ENCRYPTION_KEY`

The encryption key must match between the web app and the worker. Admin-entered provider secrets are encrypted in `/internal` and decrypted only inside the worker at request time.

## How to enter the admin dashboard

1. Start the Next.js app.
2. Open the sign-in page and authenticate.
3. Make sure your user has a `workspace_members` row with role `owner` or `admin`.
4. Open `/internal`.

Example local URL:

`http://localhost:3000/internal`

## If your user is blocked

Check whether your user is missing a workspace membership or has the wrong role.

Example fix in SQL:

```sql
update public.workspace_members
set role = 'admin'
where user_id = '<your-user-id>';
```

Or set the role to `owner` if this is the primary operator account.

## Recommended first-run flow

1. Create or sign in with the operator account.
2. Verify it owns a workspace.
3. Open `/internal`.
4. Add providers.
5. Add provider credentials with the real upstream secret. The secret is encrypted before storage and only shown later as a masked value.
6. Add provider models.
7. Add routing rules.
8. Verify requests and audit logs appear.
