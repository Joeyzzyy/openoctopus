# OpenOctopus Private Model Upstream Integration Spec

This document describes the HTTP API contract required for integrating your private image-to-image model as an OpenOctopus upstream provider.

You will host your model on your own server and expose a public HTTP API. OpenOctopus will call your API as an upstream provider.

## 1. Required Server Info

Please provide:

- Public base URL, for example `https://your-domain.com` or `http://1.2.3.4:8000`
- Authentication method
- API key
- Model ID
- Expected average processing time
- Maximum task runtime
- Max input image size
- Supported input image formats, for example `png`, `jpeg`, `webp`
- Supported output image formats, for example `png`, `webp`
- Whether your model requires a mask image, a bounding box region, or both

## 2. Authentication

Every request from OpenOctopus will include:

```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

Your service should return `401` if the API key is missing or invalid.

## 3. Submit Task Endpoint

Use an asynchronous task API.

```http
POST /v1/tasks
```

Request body:

```json
{
  "model": "your-model-id",
  "input": {
    "image_url": "https://example.com/input.png",
    "mask_url": "https://example.com/mask.png",
    "region": {
      "type": "box",
      "x": 120,
      "y": 80,
      "width": 300,
      "height": 240
    },
    "prompt": "identify and enhance the marked area",
    "output_format": "webp"
  }
}
```

Field definitions:

| Field | Type | Required | Description |
|---|---:|---:|---|
| `model` | string | yes | Your internal model ID |
| `input.image_url` | string | yes | Publicly accessible input image URL |
| `input.mask_url` | string | no | Publicly accessible mask image URL. White area means selected area |
| `input.region` | object | no | User-selected image region |
| `input.region.type` | string | no | Usually `box` |
| `input.region.x` | number | no | Left coordinate in pixels |
| `input.region.y` | number | no | Top coordinate in pixels |
| `input.region.width` | number | no | Region width in pixels |
| `input.region.height` | number | no | Region height in pixels |
| `input.prompt` | string | no | Natural-language instruction |
| `input.output_format` | string | no | `png`, `jpeg`, or `webp` |

Please clearly tell us whether your model requires `mask_url`, `region`, or both.

Successful submit response:

HTTP status: `202`

```json
{
  "id": "task_abc123",
  "status": "queued"
}
```

Allowed submit statuses:

- `queued`
- `processing`

## 4. Poll Task Endpoint

```http
GET /v1/tasks/{id}
```

Processing response:

```json
{
  "id": "task_abc123",
  "status": "processing"
}
```

Allowed non-final statuses:

- `queued`
- `processing`

Success response:

```json
{
  "id": "task_abc123",
  "status": "succeeded",
  "output": {
    "assets": [
      {
        "type": "image",
        "url": "https://your-domain.com/files/task_abc123/output.webp",
        "mimeType": "image/webp"
      }
    ],
    "metadata": {
      "detected_label": "example label",
      "confidence": 0.93
    }
  }
}
```

Failed response:

```json
{
  "id": "task_abc123",
  "status": "failed",
  "error": {
    "code": "model_error",
    "message": "Human-readable error message"
  }
}
```

Allowed final statuses:

- `succeeded`
- `failed`

## 5. Output Requirements

Preferred output is a downloadable URL:

```json
{
  "type": "image",
  "url": "https://your-domain.com/files/task_abc123/output.webp",
  "mimeType": "image/webp"
}
```

Please make sure:

- The URL is publicly accessible by OpenOctopus.
- The URL remains valid for at least 24 hours.
- The HTTP response has the correct `Content-Type`.
- For WebP: `Content-Type: image/webp`
- For PNG: `Content-Type: image/png`

Base64 output is not preferred. Use base64 only if you cannot host result files.

If using base64, return:

```json
{
  "type": "image",
  "url": "data:image/png;base64,<BASE64_DATA>",
  "mimeType": "image/png"
}
```

## 6. Error Codes

Please use stable machine-readable error codes.

Recommended codes:

| Code | Meaning |
|---|---|
| `invalid_request` | Missing or invalid input |
| `unauthorized` | Invalid API key |
| `image_download_failed` | Could not download input image |
| `mask_invalid` | Mask or region is invalid |
| `model_error` | Model inference failed |
| `timeout` | Task timed out |
| `server_error` | Unexpected server error |

## 7. Timeout Expectations

Please provide:

- Average processing time
- P95 processing time
- Maximum allowed task runtime

OpenOctopus will poll your task endpoint every few seconds until the task reaches `succeeded` or `failed`.

## 8. Example cURL

Submit:

```bash
curl -X POST "https://your-domain.com/v1/tasks" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "your-model-id",
    "input": {
      "image_url": "https://example.com/input.png",
      "mask_url": "https://example.com/mask.png",
      "prompt": "identify the marked area",
      "output_format": "webp"
    }
  }'
```

Poll:

```bash
curl "https://your-domain.com/v1/tasks/task_abc123" \
  -H "Authorization: Bearer YOUR_API_KEY"
```

## 9. Information We Need From You

Please fill this out:

```yaml
provider_name:
base_url:
auth_header_name: Authorization
auth_header_value_format: Bearer <API_KEY>
api_key:
submit_endpoint: /v1/tasks
poll_endpoint: /v1/tasks/{id}
model_id:
average_runtime_seconds:
p95_runtime_seconds:
max_runtime_seconds:
input_requirements:
  requires_image_url: true
  requires_mask_url:
  requires_region:
  supported_input_formats:
  supported_output_formats:
input_schema:
  image_url:
    type: string
    required: true
  mask_url:
    type: string
    required: false
  region:
    type: object
    required: false
  prompt:
    type: string
    required: false
  output_format:
    type: string
    required: false
    enum: [png, jpeg, webp]
output_schema:
  assets:
    type: array
    item:
      type: image
      url: string
      mimeType: string
```

## 10. Notes

Asynchronous task APIs are strongly preferred. Image-to-image tasks may take from a few seconds to more than a minute, so a submit-and-poll API is more reliable than a single long-running synchronous request.

If you cannot support async tasks yet, please tell us. A synchronous endpoint can be considered for an initial test, but the production integration should use the async contract above.
