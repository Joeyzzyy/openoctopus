# Ops Hub Setup

The internal control plane lives at `/ops-hub`.

## What grants access

Access is based on Supabase authentication plus an email allowlist.

- The user must be signed in.
- The signed-in email must be listed in `INTERNAL_ADMIN_EMAILS`.
- If `INTERNAL_ADMIN_EMAILS` is not configured, only `zhuyuejoey@gmail.com` is allowed.

The old fixed password cookie is no longer used for the internal dashboard.

## How the first admin account works

When a user signs up, the trigger in `supabase/dashboard_bootstrap.sql` still creates:

- a `profiles` row
- a `workspaces` row
- a `workspace_members` row with role `owner`

That workspace bootstrap does not grant Ops Hub access by itself. Ops Hub access is granted only by the email allowlist.

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
- `INTERNAL_ADMIN_EMAILS` optional, comma-separated. Defaults to `zhuyuejoey@gmail.com`.

The gateway worker also needs:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SECRET_ENCRYPTION_KEY`

The encryption key must match between the web app and the worker. Admin-entered provider secrets are encrypted in `/ops-hub` and decrypted only inside the worker at request time.

## How to enter Ops Hub

1. Start the Next.js app.
2. Open the sign-in page and authenticate.
3. Make sure your signed-in email is allowed by `INTERNAL_ADMIN_EMAILS`.
4. Open `/ops-hub`.

Example local URL:

`http://localhost:3000/ops-hub`

## If your user is blocked

Check the signed-in Supabase user email and the `INTERNAL_ADMIN_EMAILS` environment variable.

## Recommended first-run flow

1. Create or sign in with the operator account.
2. Verify the operator email is allowed.
3. Open `/ops-hub`.
4. Add providers.
5. Add provider credentials with the real upstream secret. The secret is encrypted before storage and only shown later as a masked value.
6. Add provider models.
7. Add routing rules.
8. Verify requests and audit logs appear.
