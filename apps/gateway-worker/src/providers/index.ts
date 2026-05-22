import type { ProviderAdapter } from "./types.js";
import { GrammarlyAiDetectionAdapter } from "./grammarly-ai-detection.js";
import { RestAsyncPollAdapter } from "./rest-async-poll.js";
import { WinstonAiDetectionAdapter } from "./winston-ai-detection.js";

const genericHttpAdapter: ProviderAdapter = new RestAsyncPollAdapter();
const grammarlyAiDetectionAdapter: ProviderAdapter = new GrammarlyAiDetectionAdapter();
const winstonAiDetectionAdapter: ProviderAdapter = new WinstonAiDetectionAdapter();

export function getProviderAdapter(slug: string) {
  if (slug === "grammarly-ai-detection-v1") {
    return grammarlyAiDetectionAdapter;
  }
  if (slug === "winston-ai-detection-v1") {
    return winstonAiDetectionAdapter;
  }

  // Runtime execution is now fully template-driven from DB execution_template/config.
  // Most providers resolve to the same generic HTTP adapter implementation.
  return genericHttpAdapter;
}
