## OpenOctopus Monorepo

This repository is a lightweight monorepo for the OpenOctopus MVP.

## Structure

```text
.
├── apps/
│   └── gateway-worker/      # Fastify worker for orchestration and provider routing
├── docs/                    # Architecture and implementation notes
├── src/                     # Next.js marketing site + dashboard control plane
├── supabase/                # SQL bootstrap files
└── package.json             # Root workspace and web app scripts
```

## Apps

- Root app: Next.js web app for the landing site, auth, and dashboard
- `apps/gateway-worker`: worker service for request intake, queueing, routing, polling, and billing writes

## Install

```bash
npm install
```

## Development

Run the web app:

```bash
npm run dev:web
```

Run the worker:

```bash
npm run dev:worker
```

## Build

Build the web app:

```bash
npm run build:web
```

Build the worker:

```bash
npm run build:worker
```

Build both:

```bash
npm run build:all
```

## Deployment split

- Deploy the root app to Vercel
- Deploy `apps/gateway-worker` to Railway or Render
- Use Supabase for Postgres, Auth, Storage, and Queues

## Supabase bootstrap order

Run these SQL files in order:

1. `supabase/dashboard_bootstrap.sql`
2. `supabase/orchestration_bootstrap.sql`
3. `supabase/queue_rpc_wrappers.sql`

## Notes

- This repo uses a practical monorepo layout without moving the current Next.js app into `apps/web`.
- The root app remains the control plane.
- `apps/gateway-worker` is the data plane.
