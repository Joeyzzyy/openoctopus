export const SUPPORTED_PROVIDER_ADAPTER_SLUGS = [
  "gemini-direct",
  "gemini-images",
  "vertex-veo",
  "wavespeed",
  "wavespeed-images",
  "wavespeed-video",
  "partner-provider-a",
] as const;

const supportedProviderAdapterSlugs = new Set<string>(SUPPORTED_PROVIDER_ADAPTER_SLUGS);

export type RuntimeProviderCredential = {
  id: string;
  secret_source: string;
  environment: string;
  is_active: boolean;
  has_encrypted_secret_material: boolean;
};

export function isSupportedProviderAdapterSlug(slug: string) {
  return supportedProviderAdapterSlugs.has(slug);
}

function isRunnableRuntimeCredential(credential: RuntimeProviderCredential) {
  return (
    credential.is_active &&
    credential.secret_source === "internal_encrypted" &&
    credential.has_encrypted_secret_material
  );
}

export function pickRuntimeCredential(credentials: RuntimeProviderCredential[]) {
  return (
    credentials.find(
      (credential) => isRunnableRuntimeCredential(credential) && credential.environment === "production"
    ) ??
    credentials.find((credential) => isRunnableRuntimeCredential(credential)) ??
    null
  );
}
