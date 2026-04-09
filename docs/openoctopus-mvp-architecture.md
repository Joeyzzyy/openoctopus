# OpenOctopus MVP Architecture

## Control plane

Keep the current Next.js app as the control plane:

- marketing site
- authentication
- dashboard
- api key management
- budget policies
- usage and wallet visibility

## Data plane

Use a separate gateway/worker service for:

- request intake
- queueing
- provider routing
- upstream polling
- result persistence
- billing writes

## Storage split

- Supabase Postgres: business truth
- Supabase Queues: request execution queue
- Supabase Storage: generated files

## Current MVP

- 2 WaveSpeed APIs
- 1 third-party API
- 1 public model layer
- 1 request table
- 1 routing table
- 1 asset table

## First milestone

1. Apply `supabase/dashboard_bootstrap.sql`
2. Apply `supabase/orchestration_bootstrap.sql`
3. Run the Next.js dashboard
4. Start `gateway-worker`
5. Create one active route per public model
6. Test:
   - create task
   - queue task
   - write request status
   - fetch task status
