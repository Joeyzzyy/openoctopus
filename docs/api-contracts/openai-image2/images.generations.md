# OpenAI Image2: POST /v1/images/generations

Model: OpenAI Image2  
Public Model: `openoctopus/gpt-image-2-text-input`  
Capability: `image_generation`  
Request Mode: Asynchronous Polling

## Step 1 · Create Request

```bash
curl -X POST https://api.openoctopus.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ooq_your_api_key" \
  -d '{
  "model": "openoctopus/gpt-image-2-text-input",
  "prompt": "a premium octopus mascot, orange and black, clean background"
}'
```

## Step 2 · Poll Task Status

```bash
curl https://api.openoctopus.com/v1/tasks/task_id_from_previous_response \
  -H "Authorization: Bearer ooq_your_api_key"
```

Poll until `status` becomes `succeeded`, `failed`, or `cancelled`.

## Request Example

```json
{
  "model": "openoctopus/gpt-image-2-text-input",
  "prompt": "a premium octopus mascot, orange and black, clean background",
  "input": {
    "aspect_ratio": "1:1",
    "resolution": "1k",
    "quality": "medium",
    "output_format": "png",
    "enable_sync_mode": false,
    "enable_base64_output": false
  }
}
```

## Submit Response Example

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "queued",
  "model": "openoctopus/gpt-image-2-text-input"
}
```

## Final Output Example

```json
{
  "capability": "image_generation",
  "status": "succeeded",
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "assets": [
      {
        "type": "image",
        "url": "https://example.com/result.png",
        "mimeType": "image/png"
      }
    ],
    "raw": {
      "model": "example",
      "outputs": "example",
      "status": "example",
      "urls": "example",
      "created_at": "example",
      "has_nsfw_contents": "example",
      "id": "example"
    }
  }
}
```

## Input Schema

Standard fields:

```json
{
  "model": "public model slug (required)",
  "prompt": "user prompt (required)",
  "input": "provider-specific options (optional object)"
}
```

Provider extension params:

```json
[
  {
    "name": "aspect_ratio",
    "type": "string",
    "required": false,
    "example": "1:1",
    "enum": ["1:1", "3:2", "2:3", "4:3", "16:9", "9:16", "3:4", "5:4", "21:9"],
    "description": "The aspect ratio of the generated image."
  },
  {
    "name": "resolution",
    "type": "string",
    "required": false,
    "example": "1k",
    "enum": ["1k", "2k", "4k"],
    "description": "The resolution of the output image. Default: \"1k\"."
  },
  {
    "name": "quality",
    "type": "string",
    "required": false,
    "example": "medium",
    "enum": ["medium", "low", "high"],
    "description": "The quality of the generated image. Higher quality costs more."
  },
  {
    "name": "output_format",
    "type": "string",
    "required": false,
    "example": "png",
    "enum": ["png", "jpeg", "webp"],
    "description": "The format of the output image."
  },
  {
    "name": "enable_sync_mode",
    "type": "boolean",
    "required": false,
    "example": "false",
    "description": "If set to true, the function will wait for the result to be generated and uploaded before returning the response."
  },
  {
    "name": "enable_base64_output",
    "type": "boolean",
    "required": false,
    "example": "false",
    "description": "If enabled, the output will be encoded into a BASE64 string instead of a URL."
  }
]
```

## Error Handling

When `task.status=failed`, use `error.code` and only retry when `retryable=true`.

`output_payload.raw` is optional debug data sanitized by OpenOctopus, not an upstream passthrough contract.
