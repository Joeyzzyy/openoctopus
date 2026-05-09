import { GeminiDirectImageAdapter } from "./gemini-direct-image.js";
import type { ProviderAdapter } from "./types.js";
import { PartnerProviderAAdapter } from "./partner-provider-a.js";
import { RestAsyncPollAdapter } from "./rest-async-poll.js";
import { WaveSpeedImageAdapter } from "./wavespeed-image.js";
import { WaveSpeedVideoAdapter } from "./wavespeed-video.js";

const adapters: ProviderAdapter[] = [
  new GeminiDirectImageAdapter(),
  new GeminiDirectImageAdapter("gemini-veo"),
  new WaveSpeedImageAdapter(),
  new WaveSpeedVideoAdapter(),
  new PartnerProviderAAdapter(),
  new RestAsyncPollAdapter(),
];

export function getProviderAdapter(slug: string) {
  const normalizedSlug =
    slug === "wavespeed"
      ? "wavespeed-images"
      : slug === "gemini-images"
        ? "gemini-direct"
        : slug === "vertex-veo"
          ? "gemini-veo"
        : slug;
  const adapter = adapters.find((item) => item.slug === normalizedSlug);
  if (!adapter) {
    throw new Error(`Missing provider adapter for slug: ${slug}`);
  }

  return adapter;
}
