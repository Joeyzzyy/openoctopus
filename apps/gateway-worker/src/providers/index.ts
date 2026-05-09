import type { ProviderAdapter } from "./types.js";
import { RestAsyncPollAdapter } from "./rest-async-poll.js";
const genericHttpAdapter: ProviderAdapter = new RestAsyncPollAdapter();

export function getProviderAdapter(_slug: string) {
  // Runtime execution is now fully template-driven from DB execution_template/config.
  // Any slug resolves to the same generic HTTP adapter implementation.
  return genericHttpAdapter;
}
