# Imagen 4: POST /v1/images/generations

Model: Imagen 4  
Public Model: `openoctopus/imagen-4`  
Capability: `image_generation`  
Request Mode: Asynchronous Polling

## Step 1 · Create Request

```bash
curl -X POST https://api.openoctopus.com/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ooq_your_api_key" \
  -d '{
  "model": "openoctopus/imagen-4",
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
  "model": "openoctopus/imagen-4",
  "prompt": "a premium octopus mascot, orange and black, clean background",
  "input": {
    "aspect_ratio": "1:1",
    "resolution": "1k",
    "num_images": 1,
    "negative_prompt": "low quality, blurry",
    "seed": 0,
    "enable_base64_output": false
  }
}
```

## Submit Response Example

```json
{
  "id": "00000000-0000-0000-0000-000000000000",
  "status": "queued",
  "model": "openoctopus/imagen-4"
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
      "id": "example",
      "model": "example",
      "outputs": "example",
      "status": "example",
      "urls": "example",
      "created_at": "example",
      "has_nsfw_contents": "example"
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
    "enum": ["1:1", "9:16", "16:9", "4:3", "3:4"],
    "description": "The aspect ratio of the generated media. Default: \"1:1\"."
  },
  {
    "name": "resolution",
    "type": "string",
    "required": false,
    "example": "1k",
    "enum": ["1k", "2k"],
    "description": "The target resolution of the generated media. Default: \"1k\"."
  },
  {
    "name": "num_images",
    "type": "integer",
    "required": false,
    "example": "1",
    "description": "The number of images to generate. Default: 1. Range: 1 to 4."
  },
  {
    "name": "negative_prompt",
    "type": "string",
    "required": false,
    "description": "The negative prompt for the generation."
  },
  {
    "name": "seed",
    "type": "integer",
    "required": false,
    "example": "0",
    "description": "The random seed to use for the generation."
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
