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

Final output uses the OpenOctopus asset contract:

```json
{
  "id": "task_uuid",
  "status": "succeeded",
  "capability": "image_generation",
  "public_model_slug": "openoctopus/google-imagen-3",
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "assets": [
      {
        "id": "0",
        "index": 0,
        "type": "image",
        "url": "https://api.openoctopus.com/v1/files/task_uuid/assets/0",
        "mimeType": "image/png"
      }
    ]
  }
}
```

OpenOctopus public responses expose stable generated assets through `output_payload.assets[]`. Upstream raw payloads, source URLs, and base64 bodies are internal implementation details and are not part of the public API contract.
