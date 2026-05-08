export const SUPPORTED_PROVIDER_ADAPTER_SLUGS = [
  "gemini-direct",
  "vertex-veo",
  "wavespeed",
  "wavespeed-images",
  "wavespeed-video",
  "partner-provider-a",
] as const;

const supportedProviderAdapterSlugs = new Set<string>(SUPPORTED_PROVIDER_ADAPTER_SLUGS);

export type RuntimeProvider = {
  id: string;
  name: string;
  slug: string;
  status: "healthy" | "degraded" | "offline";
};

export type RuntimeCredential = {
  id: string;
  label: string;
  provider_id: string;
  secret_source: string;
  environment: string;
  is_active: boolean;
  has_encrypted_secret_material: boolean;
};

export type RuntimeSupportedModel = {
  id: string;
  model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation" | null;
};

export type RuntimeProviderModel = {
  id: string;
  provider_id: string;
  supported_model_id: string | null;
  upstream_model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
  active: boolean;
};

export type RuntimeRoutingRule = {
  id: string;
  public_model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
  primary_provider_model_id: string;
  fallback_provider_model_id: string | null;
  active: boolean;
};

function isManagedRuntimeCredential(credential: RuntimeCredential) {
  return credential.secret_source === "internal_encrypted";
}

function isRunnableRuntimeCredential(credential: RuntimeCredential) {
  return credential.is_active && isManagedRuntimeCredential(credential) && credential.has_encrypted_secret_material;
}

function pickRunnableCredential(credentials: RuntimeCredential[]) {
  return (
    credentials.find(
      (credential) => isRunnableRuntimeCredential(credential) && credential.environment === "production"
    ) ??
    credentials.find((credential) => isRunnableRuntimeCredential(credential)) ??
    null
  );
}

export function isSupportedProviderAdapterSlug(slug: string) {
  return supportedProviderAdapterSlugs.has(slug);
}

export function getProviderRuntimeDiagnostics(input: {
  provider: RuntimeProvider;
  credentials: RuntimeCredential[];
  models: RuntimeProviderModel[];
}) {
  const diagnostics: string[] = [];
  const { provider, credentials, models } = input;
  const activeModels = models.filter((model) => model.active);

  if (!isSupportedProviderAdapterSlug(provider.slug)) {
    diagnostics.push(`Worker 未注册 provider adapter slug "${provider.slug}"。`);
  }

  if (provider.status === "offline" && activeModels.length > 0) {
    diagnostics.push("供应商状态为 offline，但仍有启用中的供应商模型。");
  }

  const activeCredentials = credentials.filter((credential) => credential.is_active);
  if (activeCredentials.length === 0 && activeModels.length > 0) {
    diagnostics.push("存在启用中的供应商模型，但没有启用中的供应商密钥。");
  }

  if (activeCredentials.some((credential) => credential.secret_source !== "internal_encrypted")) {
    diagnostics.push("当前启用的供应商密钥中仍有 legacy external ref，建议先轮换为 managed 密钥。");
  }

  if (activeCredentials.some((credential) => !credential.has_encrypted_secret_material)) {
    diagnostics.push("当前启用的供应商密钥缺少可解密的密文字段，worker 无法实际调用。");
  }

  if (activeModels.length > 0 && !pickRunnableCredential(activeCredentials)) {
    diagnostics.push("存在启用中的供应商模型，但没有可运行的 managed 供应商密钥。");
  }

  return diagnostics;
}

export function getProviderModelRuntimeDiagnostics(input: {
  providerModel: RuntimeProviderModel;
  provider: RuntimeProvider | null;
  supportedModel: RuntimeSupportedModel | null;
  credentials: RuntimeCredential[];
}) {
  const diagnostics: string[] = [];
  const { providerModel, provider, supportedModel, credentials } = input;

  if (!provider) {
    diagnostics.push("关联的供应商不存在。");
    return diagnostics;
  }

  if (!isSupportedProviderAdapterSlug(provider.slug)) {
    diagnostics.push(`供应商 slug "${provider.slug}" 没有对应的 worker adapter。`);
  }

  if (!supportedModel) {
    diagnostics.push("关联的可售模型不存在。");
  } else if (supportedModel.capability !== providerModel.capability) {
    diagnostics.push("供应商模型 capability 与可售模型 capability 不一致。");
  }

  if (!providerModel.active) {
    return diagnostics;
  }

  if (provider.status === "offline") {
    diagnostics.push("供应商当前是 offline，启用这个供应商模型后不会稳定可用。");
  }

  if (!pickRunnableCredential(credentials)) {
    diagnostics.push("这个供应商没有可运行的 managed 密钥，启用后 worker 无法调用。");
  }

  return diagnostics;
}

export function getRoutingRuleRuntimeDiagnostics(input: {
  routingRule: RuntimeRoutingRule;
  providerModelsById: Map<string, RuntimeProviderModel>;
  providersById: Map<string, RuntimeProvider>;
  supportedModelsById: Map<string, RuntimeSupportedModel>;
  credentialsByProviderId: Map<string, RuntimeCredential[]>;
}) {
  const diagnostics: string[] = [];
  const {
    routingRule,
    providerModelsById,
    providersById,
    supportedModelsById,
    credentialsByProviderId,
  } = input;

  const validateSelectedModel = (providerModelId: string, label: "主路由" | "回退路由") => {
    const providerModel = providerModelsById.get(providerModelId) ?? null;
    if (!providerModel) {
      diagnostics.push(`${label}指向的供应商模型不存在。`);
      return;
    }

    if (providerModel.capability !== routingRule.capability) {
      diagnostics.push(`${label} capability 与路由 capability 不一致。`);
    }

    if (!providerModel.active) {
      diagnostics.push(`${label}指向的供应商模型未启用。`);
    }

    const supportedModel = providerModel.supported_model_id
      ? supportedModelsById.get(providerModel.supported_model_id) ?? null
      : null;
    if (!supportedModel || supportedModel.model_slug !== routingRule.public_model_slug) {
      diagnostics.push(`${label}没有挂在当前路由对应的可售模型上。`);
    }

    const provider = providersById.get(providerModel.provider_id) ?? null;
    const credentials = credentialsByProviderId.get(providerModel.provider_id) ?? [];
    diagnostics.push(
      ...getProviderModelRuntimeDiagnostics({
        providerModel,
        provider,
        supportedModel,
        credentials,
      }).map((message) => `${label}${message}`)
    );
  };

  validateSelectedModel(routingRule.primary_provider_model_id, "主路由");

  if (routingRule.fallback_provider_model_id) {
    validateSelectedModel(routingRule.fallback_provider_model_id, "回退路由");
  }

  return diagnostics;
}
