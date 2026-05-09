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
  execution_template?: string | null;
  execution_config?: Record<string, unknown> | null;
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

function resolveProviderAdapterSlug(slug: string, adapterAliases?: Map<string, string>) {
  return adapterAliases?.get(slug) ?? slug;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function detectTemplateMode(config: Record<string, unknown>) {
  const mode = readString(config.mode);
  if (mode === "sync" || mode === "sync-json-v1") {
    return "sync";
  }
  if (mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1") {
    return "async";
  }
  return readString(config.pollPath).length > 0 ? "async" : "sync";
}

function validateTemplateConfig(config: Record<string, unknown>) {
  const diagnostics: string[] = [];
  if (readString(config.submitPath).length === 0) {
    diagnostics.push("模板配置缺少 submitPath。");
  }
  if (readString(config.taskIdPath).length === 0) {
    diagnostics.push("模板配置缺少 taskIdPath。");
  }
  if (readString(config.resultUrlPath).length === 0) {
    diagnostics.push("模板配置缺少 resultUrlPath。");
  }
  if (detectTemplateMode(config) === "async" && readString(config.pollPath).length === 0) {
    diagnostics.push("异步模板缺少 pollPath。");
  }
  return diagnostics;
}

export function getProviderRuntimeDiagnostics(input: {
  provider: RuntimeProvider;
  adapterAliases?: Map<string, string>;
  credentials: RuntimeCredential[];
  models: RuntimeProviderModel[];
}) {
  const diagnostics: string[] = [];
  const { provider, credentials, models } = input;
  const activeModels = models.filter((model) => model.active);

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
  adapterAliases?: Map<string, string>;
  credentials: RuntimeCredential[];
  workerTemplatesBySlug?: Map<string, { slug: string; config?: Record<string, unknown> | null }>;
}) {
  const diagnostics: string[] = [];
  const { providerModel, provider, supportedModel, adapterAliases, credentials } = input;

  if (!provider) {
    diagnostics.push("关联的供应商不存在。");
    return diagnostics;
  }

  const executionTemplate = (providerModel.execution_template ?? "").trim();
  if (executionTemplate.length > 0) {
    const workerTemplate = input.workerTemplatesBySlug?.get(executionTemplate) ?? null;
    if (!workerTemplate) {
      diagnostics.push(`执行模板 "${executionTemplate}" 在 API 调用格式配置中不存在。`);
    } else {
      const mergedConfig = {
        ...(workerTemplate.config && typeof workerTemplate.config === "object" ? workerTemplate.config : {}),
        ...(providerModel.execution_config && typeof providerModel.execution_config === "object"
          ? providerModel.execution_config
          : {}),
      };
      diagnostics.push(...validateTemplateConfig(mergedConfig));
    }
  } else {
    const resolvedProviderSlug = resolveProviderAdapterSlug(provider.slug, adapterAliases);
    diagnostics.push(
      `未设置执行模板，将回退使用供应商 slug "${resolvedProviderSlug}" 对应的模板。建议在模型映射里显式选择模板。`
    );
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
  adapterAliases?: Map<string, string>;
  credentialsByProviderId: Map<string, RuntimeCredential[]>;
  workerTemplatesBySlug?: Map<string, { slug: string; config?: Record<string, unknown> | null }>;
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
        adapterAliases: input.adapterAliases,
        workerTemplatesBySlug: input.workerTemplatesBySlug,
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
