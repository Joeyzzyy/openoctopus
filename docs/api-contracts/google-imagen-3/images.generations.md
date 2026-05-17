# Google Imagen 3: POST /v1/images/generations

Create an image generation task through the public OpenOctopus API.

## Auth

Use the same header a customer would use:

```http
Authorization: Bearer <OPENOCTOPUS_API_KEY>
Content-Type: application/json
```

Do not use internal routes, Supabase service role keys, or the playground proxy for smoke tests.

## Request

```http
POST https://api.openoctopus.com/v1/images/generations
```

```json
{
  "model": "openoctopus/google-imagen-3",
  "prompt": "a small orange octopus mascot on a clean white background"
}
```

## Submit Response

The API should accept the request and return a queued task.

```json
{
  "id": "task_uuid",
  "status": "queued"
}
```

## Follow-up

Poll the task endpoint until the task settles.

```http
GET https://api.openoctopus.com/v1/tasks/{id}
Authorization: Bearer <OPENOCTOPUS_API_KEY>
```

Expected final state for this smoke test: `succeeded`.
