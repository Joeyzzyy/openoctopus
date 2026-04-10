export const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "https://alluring-reflection-production-eafd.up.railway.app";

export const DEFAULT_QUICKSTART_MODEL = "openoctopus/seedream-4.5";

export function buildImageGenerationCurl(apiKey = "ooq_your_api_key") {
  return [
    `curl -X POST ${PUBLIC_API_BASE_URL}/v1/images/generations \\`,
    '  -H "Content-Type: application/json" \\',
    `  -H "Authorization: Bearer ${apiKey}" \\`,
    "  -d '{",
    `    "model": "${DEFAULT_QUICKSTART_MODEL}",`,
    '    "prompt": "a premium octopus mascot, orange and black, clean background"',
    "  }'",
  ].join("\n");
}

export function buildTaskStatusCurl(
  taskId = "task_id_from_previous_response",
  apiKey = "ooq_your_api_key"
) {
  return [
    `curl ${PUBLIC_API_BASE_URL}/v1/tasks/${taskId} \\`,
    `  -H "Authorization: Bearer ${apiKey}"`,
  ].join("\n");
}
