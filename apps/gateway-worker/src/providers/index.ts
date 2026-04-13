import { GeminiDirectImageAdapter } from "./gemini-direct-image.js";
import type { ProviderAdapter } from "./types.js";
import { PartnerProviderAAdapter } from "./partner-provider-a.js";
import { WaveSpeedImageAdapter } from "./wavespeed-image.js";
import { WaveSpeedVideoAdapter } from "./wavespeed-video.js";

const adapters: ProviderAdapter[] = [
  new GeminiDirectImageAdapter(),
  new GeminiDirectImageAdapter("vertex-veo"),
  new WaveSpeedImageAdapter(),
  new WaveSpeedVideoAdapter(),
  new PartnerProviderAAdapter(),
];

export function getProviderAdapter(slug: string) {
  const adapter = adapters.find((item) => item.slug === slug);
  if (!adapter) {
    throw new Error(`Missing provider adapter for slug: ${slug}`);
  }

  return adapter;
}
