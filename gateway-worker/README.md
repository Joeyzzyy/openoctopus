# OpenOctopus Gateway Worker

This service is the orchestration layer for provider routing, queue processing, and task lifecycle management.

## Recommended stack

- Runtime: Node.js 20+
- Framework: Fastify + TypeScript
- Queue: Supabase Queues (`pgmq`)
- Database: Supabase Postgres
- Asset storage: Supabase Storage
- Deployment target: Railway, Render, Fly.io, or any always-on container host

## Why this service exists

The Next.js app should remain the control plane:

- auth
- dashboard
- api key management
- budgets
- usage reporting

This service becomes the data plane:

- accept unified generation requests
- validate customer API keys
- create `inference_requests`
- enqueue work into Supabase Queues
- call upstream providers
- poll or receive upstream progress
- write `provider_attempts`, `generated_assets`, `usage_events`, `wallet_transactions`

## Initial MVP scope

- 2 WaveSpeed adapters
- 1 third-party adapter
- 1 unified task table
- 2 queues
  - `inference_jobs`
  - `inference_polling`

## Suggested folder structure

```text
gateway-worker/
  src/
    index.ts
    config.ts
    lib/
    providers/
    queue/
    routes/
    services/
```

## Local development

```bash
cd gateway-worker
npm install
npm run dev
```

## First endpoints

- `GET /health`
- `GET /v1/models`
- `POST /v1/images/generations`
- `POST /v1/videos/generations`
- `GET /v1/tasks/:id`

## WaveSpeed image adapter

The WaveSpeed image adapter now performs a real HTTP submit and a real polling flow.

You must configure the actual upstream contract with these environment variables:

- `WAVESPEED_BASE_URL`
- `WAVESPEED_IMAGE_SUBMIT_PATH`
- `WAVESPEED_IMAGE_STATUS_PATH`
- `WAVESPEED_IMAGE_API_KEY_HEADER`
- `WAVESPEED_IMAGE_API_KEY_PREFIX`
- `WAVESPEED_IMAGE_RESULT_URL_FIELD`
- `WAVESPEED_IMAGE_STATUS_FIELD`
- `WAVESPEED_IMAGE_TASK_ID_FIELD`
- `WAVESPEED_IMAGE_REQUEST_ID_FIELD`

This keeps the orchestration logic stable even if the real WaveSpeed response shape differs.

## Deployment

Recommended for MVP:

- Deploy this folder as a separate service on Railway or Render
- Keep one always-on process
- Expose port `8080`
- Set environment variables from `.env.example`
- Use the included `Dockerfile`, `railway.json`, or `render.yaml` as the starting point

For the first version, run API server and queue worker in the same process. It is simpler and enough for the current MVP.

Once volume grows, split into:

- `gateway-api`
- `gateway-worker`

## Core request flow

1. `POST /v1/images/generations` or `POST /v1/videos/generations`
2. validate OpenOctopus API key
3. select routing rule from Supabase
4. insert `inference_requests`
5. enqueue a message to `inference_jobs`
6. worker pops job and submits to provider adapter
7. write `provider_attempts`
8. if async, enqueue `inference_polling`
9. when done, persist `generated_assets`, `usage_events`, and `wallet_transactions`

## Notes

- This folder is scaffolded only. Dependencies are not installed automatically by the root app.
- Start with Supabase Queues. Add Redis later only if queue volume or scheduling complexity requires it.
