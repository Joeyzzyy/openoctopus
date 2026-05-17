import { requestJson } from "./http-client.mjs";

const DEFAULT_TIMEOUT_MS = 180_000;
const DEFAULT_INTERVAL_MS = 2_000;

export class TaskPollingError extends Error {
  constructor(message, responseJson) {
    super(message);
    this.name = "TaskPollingError";
    this.responseJson = responseJson;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function pollTask({ taskId, apiKey, baseUrl, timeoutMs = DEFAULT_TIMEOUT_MS, intervalMs = DEFAULT_INTERVAL_MS }) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const { response, json } = await requestJson({
      method: "GET",
      path: `/v1/tasks/${taskId}`,
      apiKey,
      baseUrl,
    });

    if (!response.ok) {
      throw new TaskPollingError(
        json?.error?.message || json?.message || `Task polling failed with HTTP ${response.status}`,
        json
      );
    }

    const status = typeof json?.status === "string" ? json.status : "unknown";
    if (status === "queued" || status === "submitted" || status === "processing") {
      await sleep(intervalMs);
      continue;
    }

    return json;
  }

  throw new TaskPollingError(`Task ${taskId} did not settle within ${timeoutMs}ms`, null);
}
