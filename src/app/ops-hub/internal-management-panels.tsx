"use client";
import { Fragment, useEffect, useState, useTransition } from "react";
import { BadgeCheck, CircleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { deriveLegacyBillingFields, parseBillingConfig } from "@/lib/billing-config";
import {
  createModelVendor,
  createProvider,
  createProviderAssetStorageCredential,
  deleteProvider,
  deleteProviderAssetStorageCredential,
  createProviderCredential,
  createProviderModel,
  createSupportedModel,
  deleteStaticModelTypeOption,
  deleteSupportedModel,
  deleteModelVendor,
  deleteProviderCredential,
  deleteProviderModel,
  deleteRoutingRule,
  createRoutingRule,
  rotateProviderCredentialSecret,
  rotateProviderAssetStorageCredentialSecret,
  upsertGatewayErrorDefinition,
  upsertStaticModelTypeOption,
  updateProvider,
  updateProviderAssetStorageCredential,
  updateProviderCredentialDetails,
  updateProviderCredentialState,
  updateProviderModelDetails,
  updateRoutingRule,
  updateSupportedModelDetails,
  updateSupportedModelState,
} from "./actions";
import {
  BillingConfigEditor,
  CreateProviderModelForm,
  CreateRoutingRuleForm,
} from "./form-panels";
import { SubmitButton } from "./submit-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type CapabilityOption = { value: string; label: string };
type ProviderStatusOption = { value: string; label: string };
type PaginationSummary = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

type SupportedModelSummary = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  modality: "image" | "video" | "audio" | "text";
  capability:
    | "image_generation"
    | "image_edit"
    | "image_recognition"
    | "document_analysis"
    | "text_generation"
    | "video_generation"
    | null;
  active: boolean;
  createdLabel: string;
  billingConfigText: string;
  billingSummary: string;
  allowContinuousOperations: boolean;
  providerModelCount: number;
  activeProviderModelCount: number;
};

type ModelVendorSummary = {
  id: string;
  name: string;
  active: boolean;
  sort_order: number | null;
  createdLabel: string;
};

type WorkerTemplateSummary = {
  id: string;
  display_name: string;
  slug: string;
  config: Record<string, unknown> | null;
  active: boolean;
  createdLabel: string;
};

type GatewayErrorDefinitionSummary = {
  id: string;
  code: string;
  category: string;
  httpStatus: number;
  publicMessage: string;
  retryable: boolean;
  active: boolean;
  sortOrder: number;
  operatorNotes: string | null;
  createdLabel: string;
  updatedLabel: string;
};

type StaticModelTypeOptionSummary = {
  id: string;
  value: string;
  label: string;
  active: boolean;
  sortOrder: number;
  createdLabel: string;
  updatedLabel: string;
};

function normalizeCapabilityForModality(
  modality: SupportedModelSummary["modality"],
  capability: NonNullable<SupportedModelSummary["capability"]>
) {
  if (modality === "video") {
    return "video_generation";
  }

  if (modality === "text") {
    return "text_generation";
  }

  if (modality === "image") {
    return capability === "video_generation" ? "image_generation" : capability;
  }

  return capability;
}

function normalizeModalityForCapability(
  capability: NonNullable<SupportedModelSummary["capability"]>,
  modality: SupportedModelSummary["modality"]
) {
  if (capability === "video_generation") {
    return "video";
  }

  if (capability === "text_generation") {
    return "text";
  }

  if (capability === "document_analysis") {
    return "text";
  }

  if (modality === "video") {
    return "image";
  }

  return modality;
}

type ProviderSummary = {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  status: "healthy" | "degraded" | "offline";
  regionsLabel: string;
  regions: string[] | null;
  credentialCount: number;
  assetStorageCredentialCount?: number;
  modelCount: number;
  activeModelCount: number;
  configText: string;
  runtimeDiagnostics: string[];
};


type ProviderCredentialSummary = {
  id: string;
  provider_id: string;
  providerName: string;
  label: string;
  secretMask: string;
  secretSourceLabel: string;
  secret_source: string;
  secret_ref: string | null;
  environment: string;
  notes: string | null;
  metadataText: string;
  is_active: boolean;
  secretUpdatedLabel: string;
  hasEncryptedSecretMaterial: boolean;
  runtimeDiagnostics: string[];
};

type ProviderAssetStorageCredentialSummary = {
  id: string;
  provider_id: string;
  providerName: string;
  providerSlug: string;
  label: string;
  storage_provider: "aliyun-oss" | "tencent-cos";
  bucket: string;
  region: string | null;
  endpoint: string | null;
  public_base_url: string | null;
  accessKeyIdMask: string;
  accessKeySecretMask: string;
  secretUpdatedLabel: string;
  notes: string | null;
  metadataText: string;
  is_active: boolean;
};

type ProviderModelSummary = {
  id: string;
  provider_id: string;
  providerName: string;
  providerSlug: string;
  supported_model_id: string | null;
  supportedModelName: string;
  public_model_slug: string;
  upstream_model_slug: string;
  capability:
    | "image_generation"
    | "image_edit"
    | "image_recognition"
    | "document_analysis"
    | "text_generation"
    | "video_generation";
  active: boolean;
  pricingText: string;
  pricingSummary: string;
  pricingSourceUrl: string | null;
  pricingSourceNote: string | null;
  pricingSourceEvidence: Array<{
    type?: string;
    path?: string | null;
    label?: string;
    uploadedAt?: string;
    signedUrl?: string | null;
  }>;
  executionTemplate: string;
  executionConfigText: string;
  inputSchemaText: string;
  outputSchemaText: string;
  showcaseAssets: Array<{
    id: string;
    kind: "cover" | "gallery" | "playground_input";
    publicUrl: string;
    storageBucket: string;
    storagePath: string;
    altText: string | null;
    sortOrder: number;
  }>;
  runtimeDiagnostics: string[];
};

const FACE_PLAYGROUND_INPUT_MARKER = "[[playground_input:face_image]]";

function isPrimaryPlaygroundInputAsset(asset: ProviderModelSummary["showcaseAssets"][number]) {
  return asset.kind === "playground_input";
}

function isFacePlaygroundInputAsset(asset: ProviderModelSummary["showcaseAssets"][number]) {
  return asset.kind === "gallery" && asset.altText?.startsWith(FACE_PLAYGROUND_INPUT_MARKER);
}

function stripFacePlaygroundPrompt(value: string | null) {
  if (!value?.startsWith(FACE_PLAYGROUND_INPUT_MARKER)) return value ?? "";
  return value.slice(FACE_PLAYGROUND_INPUT_MARKER.length).trim();
}

function buildProviderModelPreset(mapping: ProviderModelSummary) {
  return {
    id: mapping.id,
    label: `${mapping.supportedModelName} / ${mapping.providerName} / ${mapping.upstream_model_slug}`,
    executionTemplate: mapping.executionTemplate,
    executionConfigText: mapping.executionConfigText,
    supportedModelSlug: mapping.public_model_slug,
    providerId: mapping.provider_id,
    upstreamModelSlug: mapping.upstream_model_slug,
    pricingText: mapping.pricingText,
    inputSchemaText: mapping.inputSchemaText,
    outputSchemaText: mapping.outputSchemaText,
    active: mapping.active,
  };
}

type RoutingRuleSummary = {
  id: string;
  supportedModelId: string | null;
  public_model_slug: string;
  capability:
    | "image_generation"
    | "image_edit"
    | "image_recognition"
    | "document_analysis"
    | "text_generation"
    | "video_generation";
  primary_provider_model_id: string;
  fallback_provider_model_id: string | null;
  route_strategy: string;
  active: boolean;
  scopeLabel: string;
  primaryLabel: string;
  fallbackLabel: string;
  runtimeDiagnostics: string[];
};

type InternalModelAiUsageLogSummary = {
  id: string;
  workspace_id: string | null;
  actor_user_id: string | null;
  source_url: string;
  model: string;
  status: "succeeded" | "failed";
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  latencyMs: number;
  error_message: string | null;
  created_at: string;
  createdLabel: string;
};

const formInputClassName =
  "h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formTextAreaClassName =
  "w-full rounded-md border border-[#BAE6FD] bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formSelectClassName =
  "h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

function formatCurrency(value: number) {
  const absValue = Math.abs(value);
  const fractionDigits = absValue > 0 && absValue < 0.1 ? 6 : 2;

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function readComparableUnitCost(configText: string) {
  try {
    const config = parseBillingConfig(JSON.parse(configText));
    return deriveLegacyBillingFields(config);
  } catch {
    return null;
  }
}

function readSchemaDocUrl(schemaText: string) {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    const candidates = [
      parsed.officialDocUrl,
      parsed.docUrl,
      parsed.docsUrl,
      parsed.sourceUrl,
    ];
    const url = candidates.find((item) => typeof item === "string" && item.trim().length > 0);
    return typeof url === "string" ? url.trim() : null;
  } catch {
    return null;
  }
}

function summarizeInputSchema(schemaText: string) {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    const params = Array.isArray(parsed.params) ? parsed.params : null;
    if (params) {
      return `参数 ${params.length} 项`;
    }
    const properties =
      parsed.properties && typeof parsed.properties === "object" && !Array.isArray(parsed.properties)
        ? Object.keys(parsed.properties as Record<string, unknown>).length
        : 0;
    return properties > 0 ? `参数 ${properties} 项` : "已配置";
  } catch {
    return "格式无效";
  }
}

function readModelTypeFromBillingConfig(configText: string) {
  return readBillingConfigMetadataField(configText, "modelType");
}

function readBillingConfigMetadataField(configText: string, key: string) {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>;
    const metadata =
      parsed.metadata && typeof parsed.metadata === "object" && !Array.isArray(parsed.metadata)
        ? (parsed.metadata as Record<string, unknown>)
        : null;
    return typeof metadata?.[key] === "string" ? String(metadata[key]) : "";
  } catch {
    return "";
  }
}

function readBillingConfigMetadataBooleanField(configText: string, key: string) {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>;
    const metadata =
      parsed.metadata && typeof parsed.metadata === "object" && !Array.isArray(parsed.metadata)
        ? (parsed.metadata as Record<string, unknown>)
        : null;
    return metadata?.[key] === true || metadata?.[key] === "true";
  } catch {
    return false;
  }
}

function readReadmeMarkdownFromExecutionConfig(configText: string) {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>;
    const doc =
      parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc)
        ? (parsed.doc as Record<string, unknown>)
        : null;
    return typeof doc?.readmeMarkdown === "string" ? doc.readmeMarkdown.trim() : "";
  } catch {
    return "";
  }
}

function readSeoCoverage(configText: string) {
  const title = readBillingConfigMetadataField(configText, "seoTitle").trim();
  const description = readBillingConfigMetadataField(configText, "seoDescription").trim();
  const keywords = readBillingConfigMetadataField(configText, "seoKeywords").trim();
  const completedCount = [title, description, keywords].filter(Boolean).length;

  return {
    hasTitle: title.length > 0,
    hasDescription: description.length > 0,
    hasKeywords: keywords.length > 0,
    completedCount,
    isComplete: completedCount === 3,
  };
}

function readProviderModelContentCoverage(model: ProviderModelSummary) {
  const coverCount = model.showcaseAssets.filter((asset) => asset.kind === "cover").length;
  const galleryCount = model.showcaseAssets.filter((asset) => asset.kind === "gallery").length;
  const playgroundInputCount = model.showcaseAssets.filter((asset) => asset.kind === "playground_input").length;
  const readmeMarkdown = readReadmeMarkdownFromExecutionConfig(model.executionConfigText);

  return {
    hasCover: coverCount > 0,
    hasGallery: galleryCount > 0,
    galleryCount,
    hasPlaygroundInput: playgroundInputCount > 0,
    hasReadme: readmeMarkdown.length > 0,
  };
}

function StatusPill({
  label,
  ok,
}: {
  label: string;
  ok: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        ok
          ? "border-[#9CC9A5] bg-[#EAF7ED] text-[#2F7A3E]"
          : "border-[#EBC7BF] bg-[#FFF4F1] text-[#A14B3B]"
      }`}
    >
      {label}
    </span>
  );
}

function buildModelTypeSelectOptions(
  modelTypeOptions: StaticModelTypeOptionSummary[],
  extraValues: string[] = []
) {
  const merged = new Map<string, string>();
  merged.set("", "未分类");

  for (const option of modelTypeOptions) {
    if (!option.active) continue;
    const value = option.value.trim();
    if (!value) continue;
    merged.set(value, option.label.trim() || value);
  }

  for (const value of extraValues) {
    const normalized = value.trim();
    if (!normalized || merged.has(normalized)) continue;
    merged.set(normalized, normalized);
  }

  return Array.from(merged.entries()).map(([value, label]) => ({ value, label }));
}

function readTemplateMode(config: Record<string, unknown> | null) {
  const mode = typeof config?.mode === "string" ? config.mode.trim() : "";
  if (mode === "sync" || mode === "sync-json-v1") {
    return "同步返回";
  }
  if (mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1") {
    return "任务轮询";
  }
  const hasPollPath = typeof config?.pollPath === "string" && config.pollPath.trim().length > 0;
  return hasPollPath ? "任务轮询" : "同步返回";
}

function normalizeTemplateDisplayName(slug: string, displayName?: string | null) {
  const name = (displayName ?? "").trim();
  if (name && name !== slug) {
    return name;
  }
  if (slug === "sync-json-v1") {
    return "同步返回（即时结果）";
  }
  if (slug === "rest-async-poll-v1") {
    return "任务轮询（提交后查询）";
  }
  if (slug === "upload-async-poll-v1") {
    return "上传素材后轮询（异步）";
  }
  return slug;
}

function readTemplateConfigDiagnostics(config: Record<string, unknown> | null) {
  const diagnostics: string[] = [];
  const submitPath = typeof config?.submitPath === "string" ? config.submitPath.trim() : "";
  const pollPath = typeof config?.pollPath === "string" ? config.pollPath.trim() : "";
  const taskIdPath = typeof config?.taskIdPath === "string" ? config.taskIdPath.trim() : "";
  const resultUrlPath = typeof config?.resultUrlPath === "string" ? config.resultUrlPath.trim() : "";
  const resultTextPath = typeof config?.resultTextPath === "string" ? config.resultTextPath.trim() : "";
  const capability = typeof config?.capability === "string" ? config.capability.trim() : "";
  const statusPath = typeof config?.statusPath === "string" ? config.statusPath.trim() : "";
  const resultValueType = typeof config?.resultValueType === "string" ? config.resultValueType.trim() : "";
  const resultMimeType = typeof config?.resultMimeType === "string" ? config.resultMimeType.trim() : "";
  const mode = typeof config?.mode === "string" ? config.mode.trim() : "";
  const isAsyncMode =
    mode === "async" || mode === "async-poll" || mode === "rest-async-poll-v1" || Boolean(pollPath);
  if (!submitPath) diagnostics.push("缺少 submitPath");
  if (isAsyncMode && !taskIdPath) diagnostics.push("缺少 taskIdPath");
  if (capability === "image_recognition" || capability === "text_generation") {
    if (!resultTextPath) diagnostics.push("缺少 resultTextPath");
  } else if (capability === "document_analysis") {
    // Document analysis returns status/score objects rather than text or asset URLs.
  } else if (!resultUrlPath) {
    diagnostics.push("缺少 resultUrlPath");
  }
  if (pollPath && !statusPath) diagnostics.push("已配置 pollPath 但缺少 statusPath");
  if (resultValueType && resultValueType !== "url" && resultValueType !== "base64") {
    diagnostics.push("resultValueType 仅支持 url 或 base64");
  }
  if (resultValueType === "base64" && !resultMimeType) {
    diagnostics.push("resultValueType=base64 时建议配置 resultMimeType");
  }
  return diagnostics;
}

type WorkerTemplateConfigState = {
  mode: string;
  authType: string;
  authHeaderName: string;
  authHeaderPrefix: string;
  authQueryParam: string;
  resultValueType: string;
  resultMimeType: string;
  submitPath: string;
  pollPath: string;
  resultPath: string;
  taskIdPath: string;
  statusPath: string;
  resultUrlPath: string;
};

function buildWorkerTemplateConfigState(config: Record<string, unknown> | null): WorkerTemplateConfigState {
  return {
    mode: typeof config?.mode === "string" ? config.mode : "auto",
    authType: typeof config?.authType === "string" ? config.authType : "bearer",
    authHeaderName: typeof config?.authHeaderName === "string" ? config.authHeaderName : "Authorization",
    authHeaderPrefix: typeof config?.authHeaderPrefix === "string" ? config.authHeaderPrefix : "Bearer",
    authQueryParam: typeof config?.authQueryParam === "string" ? config.authQueryParam : "key",
    resultValueType: typeof config?.resultValueType === "string" ? config.resultValueType : "url",
    resultMimeType: typeof config?.resultMimeType === "string" ? config.resultMimeType : "image/png",
    submitPath: typeof config?.submitPath === "string" ? config.submitPath : "",
    pollPath: typeof config?.pollPath === "string" ? config.pollPath : "",
    resultPath: typeof config?.resultPath === "string" ? config.resultPath : "",
    taskIdPath: typeof config?.taskIdPath === "string" ? config.taskIdPath : "id",
    statusPath: typeof config?.statusPath === "string" ? config.statusPath : "",
    resultUrlPath: typeof config?.resultUrlPath === "string" ? config.resultUrlPath : "result.url",
  };
}

function buildWorkerTemplateConfigValue(state: WorkerTemplateConfigState) {
  const result: Record<string, string> = {};
  if (state.mode.trim()) result.mode = state.mode.trim();
  if (state.authType.trim()) result.authType = state.authType.trim();
  if (state.authHeaderName.trim()) result.authHeaderName = state.authHeaderName.trim();
  if (state.authHeaderPrefix.trim()) result.authHeaderPrefix = state.authHeaderPrefix.trim();
  if (state.authQueryParam.trim()) result.authQueryParam = state.authQueryParam.trim();
  if (state.resultValueType.trim()) result.resultValueType = state.resultValueType.trim();
  if (state.resultMimeType.trim()) result.resultMimeType = state.resultMimeType.trim();
  if (state.submitPath.trim()) result.submitPath = state.submitPath.trim();
  if (state.pollPath.trim()) result.pollPath = state.pollPath.trim();
  if (state.resultPath.trim()) result.resultPath = state.resultPath.trim();
  if (state.taskIdPath.trim()) result.taskIdPath = state.taskIdPath.trim();
  if (state.statusPath.trim()) result.statusPath = state.statusPath.trim();
  if (state.resultUrlPath.trim()) result.resultUrlPath = state.resultUrlPath.trim();
  return JSON.stringify(result);
}

function WorkerTemplateConfigEditor({
  initialConfig,
  hiddenFieldName = "config",
}: {
  initialConfig: Record<string, unknown> | null;
  hiddenFieldName?: string;
}) {
  const [state, setState] = useState<WorkerTemplateConfigState>(() =>
    buildWorkerTemplateConfigState(initialConfig)
  );
  useEffect(() => {
    setState(buildWorkerTemplateConfigState(initialConfig));
  }, [initialConfig]);
  const configValue = buildWorkerTemplateConfigValue(state);
  const isAsyncMode =
    state.mode === "async" ||
    state.mode === "async-poll" ||
    state.mode === "rest-async-poll-v1" ||
    state.mode === "auto";

  return (
    <div className="grid gap-3">
      <input type="hidden" name={hiddenFieldName} value={configValue} />
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">调用模式</span>
        <select
          name="templateMode"
          value={state.mode}
          onChange={(event) =>
            setState((current) => ({ ...current, mode: event.target.value }))
          }
          className={formSelectClassName}
        >
          <option value="auto">自动判断（推荐）</option>
          <option value="sync">同步返回</option>
          <option value="async">任务轮询</option>
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">鉴权方式</span>
        <select
          name="templateAuthType"
          value={state.authType}
          onChange={(event) =>
            setState((current) => ({ ...current, authType: event.target.value }))
          }
          className={formSelectClassName}
        >
          <option value="bearer">Bearer Header</option>
          <option value="header">自定义 Header</option>
          <option value="query">Query 参数</option>
        </select>
      </label>
      {state.authType === "query" ? (
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">鉴权 Query 参数名</span>
          <input
            name="templateAuthQueryParam"
            value={state.authQueryParam}
            onChange={(event) =>
              setState((current) => ({ ...current, authQueryParam: event.target.value }))
            }
            placeholder="key"
            className={formInputClassName}
          />
        </label>
      ) : (
        <>
          <label className="block">
            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">鉴权 Header 名</span>
            <input
              name="templateAuthHeaderName"
              value={state.authHeaderName}
              onChange={(event) =>
                setState((current) => ({ ...current, authHeaderName: event.target.value }))
              }
              placeholder={state.authType === "bearer" ? "Authorization" : "x-api-key"}
              className={formInputClassName}
            />
          </label>
          {state.authType === "bearer" ? (
            <label className="block">
              <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">鉴权前缀</span>
              <input
                name="templateAuthHeaderPrefix"
                value={state.authHeaderPrefix}
                onChange={(event) =>
                  setState((current) => ({ ...current, authHeaderPrefix: event.target.value }))
                }
                placeholder="Bearer"
                className={formInputClassName}
              />
            </label>
          ) : null}
        </>
      )}
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
          提交路径 submitPath
        </span>
        <input
          name="templateSubmitPath"
          value={state.submitPath}
          onChange={(event) =>
            setState((current) => ({ ...current, submitPath: event.target.value }))
          }
          placeholder="/v1/tasks"
          className={formInputClassName}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
          任务 ID 路径 taskIdPath
        </span>
        <input
          name="templateTaskIdPath"
          value={state.taskIdPath}
          onChange={(event) =>
            setState((current) => ({ ...current, taskIdPath: event.target.value }))
          }
          placeholder="id"
          className={formInputClassName}
        />
      </label>
      {isAsyncMode ? (
        <>
          <label className="block">
            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
              轮询路径 pollPath
            </span>
            <input
              name="templatePollPath"
              value={state.pollPath}
              onChange={(event) =>
                setState((current) => ({ ...current, pollPath: event.target.value }))
              }
              placeholder="/v1/tasks/{taskId}"
              className={formInputClassName}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
              状态路径 statusPath
            </span>
            <input
              name="templateStatusPath"
              value={state.statusPath}
              onChange={(event) =>
                setState((current) => ({ ...current, statusPath: event.target.value }))
              }
              placeholder="status"
              className={formInputClassName}
            />
          </label>
          <label className="block md:col-span-2">
            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
              结果查询路径 resultPath（可选）
            </span>
            <input
              name="templateResultPath"
              value={state.resultPath}
              onChange={(event) =>
                setState((current) => ({ ...current, resultPath: event.target.value }))
              }
              placeholder="/api/v3/predictions/{taskId}/result"
              className={formInputClassName}
            />
          </label>
        </>
      ) : null}
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
          结果字段路径（JSON path）resultUrlPath
        </span>
        <input
          name="templateResultUrlPath"
          value={state.resultUrlPath}
          onChange={(event) =>
            setState((current) => ({ ...current, resultUrlPath: event.target.value }))
          }
          placeholder="例如 data.outputs.0 / response.outputUrl"
          className={formInputClassName}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">结果值类型</span>
        <select
          name="templateResultValueType"
          value={state.resultValueType}
          onChange={(event) =>
            setState((current) => ({ ...current, resultValueType: event.target.value }))
          }
          className={formSelectClassName}
        >
          <option value="url">URL</option>
          <option value="base64">Base64</option>
        </select>
      </label>
      {state.resultValueType === "base64" ? (
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Base64 MIME 类型</span>
          <input
            name="templateResultMimeType"
            value={state.resultMimeType}
            onChange={(event) =>
              setState((current) => ({ ...current, resultMimeType: event.target.value }))
            }
            placeholder="image/png"
            className={formInputClassName}
          />
        </label>
      ) : null}
      <div className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
        <p className="text-[11px] text-black/55">配置 JSON 预览（自动生成）</p>
        <pre className="mt-2 max-h-44 overflow-auto whitespace-pre-wrap break-all text-xs text-black/65">
          {configValue}
        </pre>
      </div>
    </div>
  );
}

function RuntimeDiagnostics({
  diagnostics,
}: {
  diagnostics: string[];
}) {
  if (diagnostics.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3">
      <div className="flex items-start gap-2">
        <CircleAlert className="mt-0.5 size-3.5 shrink-0 text-[#b54432]" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#8d4336]">运行时诊断</p>
          <div className="mt-2 grid gap-2">
            {diagnostics.map((message) => (
              <p key={message} className="text-xs leading-5 text-[#b54432]">
                {message}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

type ProviderTemplate = {
  provider: {
    name?: string;
    slug?: string;
    kind?: string;
    baseUrl?: string;
    status?: string;
    regions?: string;
    config?: string;
  };
  credential: {
    label?: string;
    secretRef?: string;
    environment?: string;
    notes?: string;
    metadata?: string;
  };
  providerModel: {
    upstreamModelSlug?: string;
    pricing?: string;
  };
  route: {
    routeStrategy?: string;
    workspaceScope?: string;
  };
};

function ModalButton({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "secondary" | "primary";
}) {
  return (
    <span
      className={
        tone === "secondary"
          ? "inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-[#E0F2FE]"
          : "inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-[#111827] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0B1220]"
      }
    >
      {children}
    </span>
  );
}

function DialogFormSubmitButton({
  formId,
  label = "保存供应商模型",
  pendingLabel = "保存中...",
}: {
  formId: string;
  label?: string;
  pendingLabel?: string;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [resetTimer, setResetTimer] = useState<number | null>(null);

  return (
    <button
      type="button"
      disabled={submitting}
      aria-busy={submitting}
      onClick={() => {
        const form = document.getElementById(formId);
        if (!(form instanceof HTMLFormElement)) {
          return;
        }
        if (!form.reportValidity()) {
          return;
        }
        setSubmitting(true);
        form.requestSubmit();
        if (resetTimer !== null) {
          window.clearTimeout(resetTimer);
        }
        const timer = window.setTimeout(() => {
          setSubmitting(false);
          setResetTimer(null);
        }, 2500);
        setResetTimer(timer);
      }}
      className="inline-flex h-9 cursor-pointer items-center justify-center rounded-md bg-[#111827] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0B1220] disabled:cursor-not-allowed disabled:bg-black/15 disabled:text-black/35"
    >
      {submitting ? pendingLabel : label}
    </button>
  );
}

function ManagementDialog({
  trigger,
  title,
  description,
  headerActions,
  disabled = false,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  headerActions?: React.ReactNode;
  disabled?: boolean;
  children: React.ReactNode | ((controls: { close: () => void; openVersion: number }) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);
  const [openVersion, setOpenVersion] = useState(0);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setOpenVersion((current) => current + 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
      <DialogTrigger disabled={disabled}>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden rounded-2xl border border-[#BAE6FD] bg-[#F8FCFF] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] [&>button]:hidden sm:max-w-5xl">
        <DialogHeader className="border-b border-[#BAE6FD] px-5 pb-4 pt-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DialogTitle className="font-medium text-black">{title}</DialogTitle>
              {description ? (
                <DialogDescription className="text-black/55">
                  {description}
                </DialogDescription>
              ) : null}
            </div>
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                {headerActions}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-[#7DD3FC]/45 bg-white text-black transition-colors hover:bg-[#E0F2FE]"
                  aria-label="Close dialog"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-5">
          {typeof children === "function"
            ? (children as (controls: { close: () => void; openVersion: number }) => React.ReactNode)({
                close: () => setOpen(false),
                openVersion,
              })
            : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ManagedDialogForm({
  action,
  className = "grid gap-4",
  close,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const [, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          try {
            await action(formData);
            close();
          } catch (error) {
            const message = error instanceof Error ? error.message : "操作失败，请重试。";
            toast.error(message);
          }
        });
      }}
      className={className}
    >
      {children}
    </form>
  );
}

function FormField({
  label,
  name,
  defaultValue,
  placeholder,
  required = false,
  disabled = false,
  help,
  type = "text",
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  help?: string;
  type?: "text" | "password";
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={formInputClassName}
      />
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
    </label>
  );
}

function FormTextArea({
  label,
  name,
  defaultValue,
  placeholder,
  disabled = false,
  help,
  className,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  help?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <textarea
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
        className={formTextAreaClassName}
      />
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
    </label>
  );
}

function SupportedModelDetailsForm({
  model,
  vendorOptions,
  capabilityOptions,
  modelTypeOptions,
  providerModelMappings,
  close,
}: {
  model: SupportedModelSummary;
  vendorOptions: Array<{ value: string; label: string }>;
  capabilityOptions: readonly CapabilityOption[];
  modelTypeOptions: StaticModelTypeOptionSummary[];
  providerModelMappings: ProviderModelSummary[];
  close: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"basic" | "pricing">("basic");
  const [pricingSeed, setPricingSeed] = useState(model.billingConfigText);
  const [modality, setModality] = useState<SupportedModelSummary["modality"]>(model.modality);
  const [capability, setCapability] = useState(model.capability ?? "image_generation");
  const modelTypeSelectOptions = buildModelTypeSelectOptions(modelTypeOptions, [
    readModelTypeFromBillingConfig(model.billingConfigText),
  ]);

  return (
    <ManagedDialogForm action={updateSupportedModelDetails} close={close} className="grid gap-4">
      <input type="hidden" name="supportedModelId" value={model.id} />
      <input type="hidden" name="active" value="true" />
      <div className="grid items-start gap-3 md:grid-cols-[180px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-1.5">
          <nav className="space-y-1">
            {[
              { key: "basic" as const, label: "基础信息" },
              { key: "pricing" as const, label: "售价" },
            ].map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors ${
                    active ? "bg-black text-white" : "text-black/68 hover:bg-black/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>
        <div className="space-y-3">
          <div className={activeTab === "basic" ? "grid gap-4 md:grid-cols-2" : "hidden"}>
            <FormSelect label="模型厂商（内部分类）" name="provider" defaultValue={model.provider} options={vendorOptions} />
            <FormField label="可售模型 Slug" name="modelSlug" defaultValue={model.model_slug} required />
            <FormField label="显示名称" name="displayName" defaultValue={model.display_name} required />
            <FormField
              label="SEO Title"
              name="seoTitle"
              defaultValue={readBillingConfigMetadataField(model.billingConfigText, "seoTitle")}
              placeholder="例如：Imagen 3 by Google | Pricing, Prompt Guide & API"
              help="可选。用于模型详情页 title、OG 和 Twitter 标题。"
              className="md:col-span-2"
            />
            <FormTextArea
              label="SEO Description"
              name="seoDescription"
              defaultValue={readBillingConfigMetadataField(model.billingConfigText, "seoDescription")}
              placeholder="用于搜索摘要和分享描述。建议 120-180 字符。"
              help="会自动同步为模型介绍文案。"
              className="md:col-span-2"
            />
            <FormTextArea
              label="SEO Keywords"
              name="seoKeywords"
              defaultValue={readBillingConfigMetadataField(model.billingConfigText, "seoKeywords")}
              placeholder="一行或逗号分隔一个关键词，例如 imagen 3, google image model, text to image api"
              help="可选。会写入 metadata keywords 和结构化数据。"
              className="md:col-span-2"
            />
            <FormSelect
              label="类型"
              name="modelType"
              defaultValue={readModelTypeFromBillingConfig(model.billingConfigText)}
              options={modelTypeSelectOptions}
            />
            <FormSelect
              label="模态"
              name="modality"
              value={modality}
              onChange={(value) => {
                const nextModality = value as SupportedModelSummary["modality"];
                setModality(nextModality);
                setCapability((current) =>
                  normalizeCapabilityForModality(nextModality, current)
                );
              }}
              options={[
                { value: "image", label: "图片" },
                { value: "video", label: "视频" },
                { value: "audio", label: "音频" },
                { value: "text", label: "文本" },
              ]}
            />
            <FormSelect
              label="能力类型"
              name="capability"
              value={capability}
              onChange={(value) => {
                const nextCapability =
                  value as NonNullable<SupportedModelSummary["capability"]>;
                setCapability(nextCapability);
                setModality((current) =>
                  normalizeModalityForCapability(nextCapability, current)
                );
              }}
              options={[...capabilityOptions]}
            />
            <ActiveCheckbox
              name="allowContinuousOperations"
              defaultChecked={model.allowContinuousOperations}
              label="允许连续操作（在 Playground 复用当前用户该模型下的历史图片）"
            />
          </div>
          <div className={activeTab === "pricing" ? "" : "hidden"}>
            <div className="mb-3 rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
              <p className="text-[11px] tracking-[0.35px] text-black/60">已配置映射成本参考</p>
              {providerModelMappings.length > 0 ? (
                <div className="mt-2 space-y-1.5">
                  {providerModelMappings.map((mapping) => (
                    <div
                      key={mapping.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-[#DDF4FF] bg-white px-2.5 py-1.5 text-xs"
                    >
                      <span className="min-w-0 truncate text-black/65">
                        {mapping.providerName} / {mapping.upstream_model_slug}
                      </span>
                      <span className="ml-auto shrink-0 font-medium text-black/75">{mapping.pricingSummary}</span>
                      <button
                        type="button"
                        onClick={() => setPricingSeed(mapping.pricingText)}
                        className="shrink-0 rounded-md border border-[#BAE6FD] bg-white px-2 py-1 text-[11px] font-medium text-black/65 hover:bg-[#E0F2FE]"
                      >
                        同步到售价
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-black/45">当前可售模型还没有供应商映射成本配置。</p>
              )}
            </div>
            <BillingConfigEditor initialValue={pricingSeed} capability={capability} />
          </div>
        </div>
      </div>
      <div className="flex justify-end">
        <SubmitButton label="保存可售模型" />
      </div>
    </ManagedDialogForm>
  );
}

function FormSelect({
  label,
  name,
  options,
  defaultValue,
  value,
  onChange,
  disabled = false,
  help,
  className,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  help?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (event) => onChange(event.target.value) : undefined}
        disabled={disabled}
        className={formSelectClassName}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
    </label>
  );
}

function ActiveCheckbox({
  name,
  defaultChecked,
  label = "启用",
  disabled = false,
}: {
  name: string;
  defaultChecked: boolean;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center gap-3 rounded-md border border-[#BAE6FD] bg-white px-3 py-3 text-sm text-black/72">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        disabled={disabled}
        className="size-4 rounded border-black/20 bg-white accent-black"
      />
      {label}
    </label>
  );
}

export function PublicModelsPanel({
  models,
  modelPagination,
  modelSearch = "",
  modelTypeFilter = "all",
  modelStatusFilter = "all",
  providerModels = [],
  routingRules = [],
  providers = [],
  workerTemplates = [],
  modelVendors = [],
  modelTypeOptions = [],
  capabilityOptions,
  headerAction,
}: {
  models: SupportedModelSummary[];
  modelPagination?: PaginationSummary;
  modelSearch?: string;
  modelTypeFilter?: string;
  modelStatusFilter?: "all" | "active" | "inactive";
  providerModels?: ProviderModelSummary[];
  routingRules?: RoutingRuleSummary[];
  providers?: ProviderSummary[];
  workerTemplates?: WorkerTemplateSummary[];
  modelVendors?: ModelVendorSummary[];
  modelTypeOptions?: StaticModelTypeOptionSummary[];
  capabilityOptions: readonly CapabilityOption[];
  headerAction?: React.ReactNode;
}) {
  const activeModelTypeFilter = modelTypeFilter;
  const activeStatusFilter = modelStatusFilter;
  const activeModelSearch = modelSearch.trim();
  const safeModelVendors = Array.isArray(modelVendors) ? modelVendors : [];
  const safeProviderModels = Array.isArray(providerModels) ? providerModels : [];
  const safeRoutingRules = Array.isArray(routingRules) ? routingRules : [];
  const safeProviders = Array.isArray(providers) ? providers : [];
  const safeWorkerTemplates = Array.isArray(workerTemplates) ? workerTemplates : [];
  const safeModelTypeOptions = Array.isArray(modelTypeOptions) ? modelTypeOptions : [];
  const vendorSuggestions = Array.from(
    new Set([
      ...safeModelVendors.map((item) => item.name),
      ...models.map((item) => item.provider),
    ])
  )
    .filter((name) => name.trim().toLowerCase() !== "openoctopus")
    .sort((a, b) => a.localeCompare(b, "en-US"));
  const vendorOptions = vendorSuggestions.map((name) => ({ value: name, label: name }));
  const providerOptions = safeProviders.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
  }));
  const workerTemplateOptions = (safeWorkerTemplates.length > 0
    ? safeWorkerTemplates.map((item) => ({ slug: item.slug, displayName: item.display_name }))
    : Array.from(new Set(safeProviderModels.map((item) => item.executionTemplate)))
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => ({ slug, displayName: slug }))).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "zh-CN")
  );
  const supportedModelOptions = models.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
    billingConfigText: item.billingConfigText,
  }));
  const executionConfigPresets = safeProviderModels.map(buildProviderModelPreset);
  const providerModelsBySupportedModelId = safeProviderModels.reduce((map, item) => {
    if (!item.supported_model_id) {
      return map;
    }
    const list = map.get(item.supported_model_id) ?? [];
    list.push(item);
    map.set(item.supported_model_id, list);
    return map;
  }, new Map<string, ProviderModelSummary[]>());
  const modalityLabel = (value: SupportedModelSummary["modality"]) => {
    if (value === "image") return "图片";
    if (value === "video") return "视频";
    if (value === "audio") return "音频";
    return "文本";
  };
  const capabilityLabel = (value: SupportedModelSummary["capability"]) => {
    if (value === "image_generation") return "图片生成";
    if (value === "image_edit") return "图片编辑";
    if (value === "image_recognition") return "图片识别";
    if (value === "document_analysis") return "文档分析";
    if (value === "text_generation") return "对话生成";
    if (value === "video_generation") return "视频生成";
    return "未设置";
  };
  const groupedSupportedModels = models.reduce((map, model) => {
    const modelType = readModelTypeFromBillingConfig(model.billingConfigText).trim() || "uncategorized";
    const list = map.get(modelType) ?? [];
    list.push(model);
    map.set(modelType, list);
    return map;
  }, new Map<string, SupportedModelSummary[]>());
  const configuredModelTypeOrder = safeModelTypeOptions
    .filter((item) => item.active)
    .map((item) => item.value.trim())
    .filter(Boolean);
  const orderedCategories = [
    ...configuredModelTypeOrder,
    ...Array.from(groupedSupportedModels.keys()).filter(
      (key) => key !== "uncategorized" && !configuredModelTypeOrder.includes(key)
    ),
    "uncategorized",
  ].filter((key, index, arr) => arr.indexOf(key) === index);
  const modelGroups = orderedCategories
    .map((category) => ({
      category,
      models: groupedSupportedModels.get(category) ?? [],
    }))
    .filter((entry) => entry.models.length > 0);
  const modelCategoryLabel = (value: string) => (value === "uncategorized" ? "未分类" : value);
  const modelTypeFilterOptions = [
    { value: "all", label: "全部类型" },
    ...buildModelTypeSelectOptions(
      safeModelTypeOptions,
      Array.from(groupedSupportedModels.keys()).filter((key) => key !== "uncategorized")
    ).filter((item) => item.value),
  ];
  const visibleModelGroups =
    activeModelTypeFilter === "all"
      ? modelGroups
      : modelGroups.filter((group) => group.category === activeModelTypeFilter);
  const visibleModelGroupsWithStatus = visibleModelGroups
    .map((group) => ({
      ...group,
      models:
        activeStatusFilter === "all"
          ? group.models
          : group.models.filter((model) =>
              activeStatusFilter === "active" ? model.active : !model.active
            ),
    }))
    .filter((group) => group.models.length > 0);
  const modelPage = modelPagination?.page ?? 1;
  const modelTotalPages = modelPagination?.totalPages ?? 1;
  const modelTotalCount = modelPagination?.totalCount ?? models.length;
  const modelPageSize = modelPagination?.pageSize ?? 10;
  const modelPageStart = modelTotalCount === 0 ? 0 : (modelPage - 1) * modelPageSize + 1;
  const modelPageEnd = Math.min(modelPage * modelPageSize, modelTotalCount);
  const getModelHref = (input: { page?: number; modelType?: string; status?: string }) => {
    const params = new URLSearchParams();
    params.set("tab", "public-models");
    if ((input.page ?? 1) > 1) params.set("modelPage", String(input.page));
    if (activeModelSearch) params.set("modelSearch", activeModelSearch);
    if (input.modelType && input.modelType !== "all") params.set("modelType", input.modelType);
    if (input.status && input.status !== "all") params.set("modelStatus", input.status);
    return `/ops-hub?${params.toString()}`;
  };

  return (
    <div className="space-y-3">
      {models.length > 0 ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-[#BAE6FD] bg-white p-2.5">
            <form method="get" action="/ops-hub" className="flex flex-wrap items-end gap-2">
              <input type="hidden" name="tab" value="public-models" />
              <label className="grid gap-1">
                <span className="text-[11px] tracking-[0.25px] text-black/55">按名称搜索</span>
                <input
                  type="text"
                  name="modelSearch"
                  defaultValue={activeModelSearch}
                  placeholder="搜索名称或 slug"
                  className="h-9 min-w-[220px] rounded-md border border-[#BAE6FD] bg-[#F8FCFF] px-3 text-xs text-black/75 placeholder:text-black/35"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] tracking-[0.25px] text-black/55">按类型筛选</span>
                <select
                  name="modelType"
                  defaultValue={activeModelTypeFilter}
                  className="h-9 min-w-[180px] rounded-md border border-[#BAE6FD] bg-[#F8FCFF] px-3 text-xs text-black/75"
                >
                  {modelTypeFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1">
                <span className="text-[11px] tracking-[0.25px] text-black/55">按状态筛选</span>
                <select
                  name="modelStatus"
                  defaultValue={activeStatusFilter}
                  className="h-9 min-w-[148px] rounded-md border border-[#BAE6FD] bg-[#F8FCFF] px-3 text-xs text-black/75"
                >
                  <option value="all">全部状态</option>
                  <option value="active">已启用</option>
                  <option value="inactive">已停用</option>
                </select>
              </label>
              <button
                type="submit"
                className="inline-flex h-9 items-center justify-center rounded-md border border-black/[0.12] bg-white px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
              >
                应用
              </button>
              {headerAction}
              {(activeModelSearch || activeModelTypeFilter !== "all" || activeStatusFilter !== "all") ? (
                <a
                  href={getModelHref({ page: 1, modelType: "all", status: "all" })}
                  className="inline-flex h-9 items-center justify-center rounded-md px-2 text-xs text-black/45 hover:text-black/70"
                >
                  重置
                </a>
              ) : null}
            </form>
          </div>
          {visibleModelGroupsWithStatus.map((group) => (
            <section key={group.category} className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-2.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex rounded-full border border-[#BAE6FD] bg-white px-2 py-0.5 text-[11px] font-medium text-black/75">
                  {modelCategoryLabel(group.category)}
                </span>
                <span className="text-[11px] text-black/50">{group.models.length} models</span>
              </div>
              <div className="space-y-3">
          {group.models.map((model) => {
            const mappings = providerModelsBySupportedModelId.get(model.id) ?? [];
            const modelType = readModelTypeFromBillingConfig(model.billingConfigText);
            const seoCoverage = readSeoCoverage(model.billingConfigText);
            const modelRoutingRules = safeRoutingRules.filter((rule) => rule.supportedModelId === model.id);
            const activeRoutingRule =
              modelRoutingRules.find((rule) => rule.active && rule.scopeLabel.includes("全局")) ??
              modelRoutingRules.find((rule) => rule.active) ??
              modelRoutingRules[0] ??
              null;
            const hasRouting = Boolean(activeRoutingRule?.primary_provider_model_id);
            return (
              <section key={model.id} className="rounded-xl border border-[#DDF4FF] bg-white p-2.5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <h3 className="text-sm font-semibold text-black">{model.display_name}</h3>
                      <span className="font-mono text-[11px] text-black/45">{model.model_slug}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-black/58">
                      {model.provider} · {modalityLabel(model.modality)} ·{" "}
                      {model.capability ? capabilityLabel(model.capability) : "-"}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-1 text-[11px]">
                      {modelType ? (
                        <span className="rounded border border-black/[0.1] bg-[#F8FCFF] px-1.5 py-0.5 text-black/62">
                          类型：{modelType}
                        </span>
                      ) : null}
                      <span className="rounded border border-black/[0.1] bg-[#F8FCFF] px-1.5 py-0.5 text-black/58">
                        添加时间：{model.createdLabel}
                      </span>
                      <span className="rounded border border-black/[0.1] bg-[#F8FCFF] px-1.5 py-0.5 text-black/65">
                        {model.billingSummary}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <StatusPill
                        label={seoCoverage.isComplete ? "SEO complete" : `SEO ${seoCoverage.completedCount}/3`}
                        ok={seoCoverage.isComplete}
                      />
                      <StatusPill
                        label={
                          hasRouting
                            ? `Routing ${activeRoutingRule?.fallback_provider_model_id ? "主备" : "仅主路由"}`
                            : "Routing missing"
                        }
                        ok={hasRouting}
                      />
                      <StatusPill label="Title" ok={seoCoverage.hasTitle} />
                      <StatusPill label="Description" ok={seoCoverage.hasDescription} />
                      <StatusPill label="Keywords" ok={seoCoverage.hasKeywords} />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <form action={updateSupportedModelState}>
                      <input type="hidden" name="supportedModelId" value={model.id} />
                      <input type="hidden" name="active" value={model.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`inline-flex h-7 min-w-[64px] items-center justify-center rounded-md border px-2 text-[11px] font-medium transition-colors ${
                          model.active
                            ? "border-[#9CC9A5] bg-[#EAF7ED] text-[#2F7A3E] hover:bg-[#def0e3]"
                            : "border-black/[0.14] bg-[#F0F9FF] text-black/70 hover:bg-[#E0F2FE]"
                        }`}
                      >
                        {model.active ? "停用" : "启用"}
                      </button>
                    </form>
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                      title={`编辑 ${model.display_name}`}
                      description="在独立弹窗中编辑这个可售模型。"
                    >
                      {({ close }) => (
                        <SupportedModelDetailsForm
                          key={model.id}
                          model={model}
                          vendorOptions={vendorOptions}
                          capabilityOptions={capabilityOptions}
                          modelTypeOptions={safeModelTypeOptions}
                          providerModelMappings={mappings}
                          close={close}
                        />
                      )}
                    </ManagementDialog>
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary">配置路由</ModalButton>}
                      title={`配置路由：${model.display_name}`}
                      description="为当前可售模型设置主路由和回退路由。"
                    >
                      {({ close }) => (
                        mappings.length === 0 ? (
                          <div className="rounded-xl border border-[#EBC7BF] bg-[#FFF4F1] px-4 py-3 text-xs leading-6 text-[#A14B3B]">
                            当前可售模型还没有可用的供应商模型映射，请先在“编辑可售模型”里添加映射，再配置路由。
                          </div>
                        ) : (
                          <CreateRoutingRuleForm
                            action={activeRoutingRule ? updateRoutingRule : createRoutingRule}
                            routingRuleId={activeRoutingRule?.id}
                            supportedModels={supportedModelOptions}
                            providerModels={safeProviderModels.map((item) => ({
                              id: item.id,
                              providerName: item.providerName,
                              supportedModelName: item.supportedModelName,
                              upstreamModelSlug: item.upstream_model_slug,
                              capability: item.capability,
                              supportedModelId: item.supported_model_id ?? "",
                            }))}
                            defaultSupportedModelId={model.id}
                            defaultPrimaryProviderModelId={activeRoutingRule?.primary_provider_model_id}
                            defaultFallbackProviderModelId={activeRoutingRule?.fallback_provider_model_id ?? ""}
                            defaultStrategy={activeRoutingRule?.route_strategy ?? "primary_only"}
                            defaultWorkspaceScope={
                              activeRoutingRule?.scopeLabel.includes("工作区") ? "workspace" : "global"
                            }
                            defaultActive={activeRoutingRule?.active ?? true}
                            allowWorkspaceScope={false}
                            lockSupportedModel
                            submitLabel={activeRoutingRule ? "保存路由" : "创建路由"}
                            onSuccess={close}
                            disabled={false}
                          />
                        )
                      )}
                    </ManagementDialog>
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary">删除</ModalButton>}
                      title={`删除 ${model.display_name}`}
                      description="确认删除这个可售模型。"
                    >
                      {({ close }) => (
                        <ManagedDialogForm action={deleteSupportedModel} close={close}>
                          <input type="hidden" name="supportedModelId" value={model.id} />
                          <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                            删除后不可恢复。若该模型仍有关联的供应商模型映射或路由配置，系统会阻止删除。
                          </div>
                          <div className="flex justify-end">
                            <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                          </div>
                        </ManagedDialogForm>
                      )}
                    </ManagementDialog>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-[#DDF4FF] bg-[#F8FCFF] p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[11px] font-medium tracking-[0.25px] text-black/55">供应商供应模型列表</p>
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary">新建模型映射</ModalButton>}
                      disabled={!safeProviders.length}
                      title={`新建映射：${model.display_name}`}
                      description="为当前可售模型新增供应商供应模型映射。"
                      headerActions={
                        <DialogFormSubmitButton formId={`provider-model-form-create-for-${model.id}`} />
                      }
                    >
                      {({ close, openVersion }) => (
                        <CreateProviderModelForm
                          key={`create-provider-model-form-${model.id}-${openVersion}`}
                          action={createProviderModel}
                          supportedModels={supportedModelOptions}
                          providers={providerOptions}
                          workerTemplates={workerTemplateOptions.map((item) => ({
                            id: item.slug,
                            displayName: item.displayName,
                            slug: item.slug,
                          }))}
                          executionConfigPresets={executionConfigPresets}
                          defaultSupportedModelSlug={model.model_slug}
                          formId={`provider-model-form-create-for-${model.id}`}
                          showSubmitButton={false}
                          className="grid gap-4"
                          onSuccess={close}
                          disabled={false}
                        />
                      )}
                    </ManagementDialog>
                  </div>
                  {mappings.length === 0 ? (
                    <p className="text-xs text-black/45">暂无映射</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border border-[#DDF4FF] bg-white">
                      <table className="min-w-[760px] w-full text-[11px]">
                        <thead>
                          <tr className="border-b border-[#DDF4FF] bg-[#F8FCFF] text-black/45">
                            <th className="px-2 py-1 text-left font-medium">供应商</th>
                            <th className="px-2 py-1 text-left font-medium">上游模型</th>
                            <th className="px-2 py-1 text-left font-medium">内容状态</th>
                            <th className="px-2 py-1 text-left font-medium">成本</th>
                            <th className="px-2 py-1 text-left font-medium">状态</th>
                            <th className="px-2 py-1 text-left font-medium">操作</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mappings.map((mapping) => {
                            const contentCoverage = readProviderModelContentCoverage(mapping);
                            return (
                            <tr key={mapping.id} className="border-b border-black/[0.05] last:border-b-0">
                              <td className="px-2 py-1 text-black/75">{mapping.providerName}</td>
                              <td className="px-2 py-1 font-mono text-black/70">{mapping.upstream_model_slug}</td>
                              <td className="px-2 py-1">
                                <div className="flex min-w-[210px] flex-wrap gap-1">
                                  <StatusPill label="封面" ok={contentCoverage.hasCover} />
                                  <StatusPill
                                    label={contentCoverage.hasGallery ? `素材图 ${contentCoverage.galleryCount}` : "素材图"}
                                    ok={contentCoverage.hasGallery}
                                  />
                                  <StatusPill label="Playground 示例" ok={contentCoverage.hasPlaygroundInput} />
                                  <StatusPill label="README" ok={contentCoverage.hasReadme} />
                                </div>
                              </td>
                              <td className="px-2 py-1 text-black/70">{mapping.pricingSummary}</td>
                              <td className="px-2 py-1 text-black/60">{mapping.active ? "已启用" : "未启用"}</td>
                              <td className="px-2 py-1">
                                <div className="flex items-center gap-2">
                                  <ManagementDialog
                                    trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                                    title={`编辑映射 ${mapping.supportedModelName} / ${mapping.providerName}`}
                                    description=" "
                                    headerActions={
                                      <DialogFormSubmitButton formId={`provider-model-form-${mapping.id}`} />
                                    }
                                  >
                                    {({ close }) => (
                                      <CreateProviderModelForm
                                        action={updateProviderModelDetails}
                                        providerModelId={mapping.id}
                                        supportedModels={supportedModelOptions}
                                        providers={providerOptions}
                                        workerTemplates={workerTemplateOptions.map((item) => ({
                                          id: item.slug,
                                          displayName: item.displayName,
                                          slug: item.slug,
                                        }))}
                                        executionConfigPresets={executionConfigPresets.filter(
                                          (preset) => preset.id !== mapping.id
                                        )}
                                        defaultSupportedModelSlug={mapping.public_model_slug}
                                        defaultProviderId={mapping.provider_id}
                                        defaultUpstreamModelSlug={mapping.upstream_model_slug}
                                        defaultPricing={mapping.pricingText}
                                        defaultInputSchema={mapping.inputSchemaText}
                                        defaultOutputSchema={mapping.outputSchemaText}
                                        defaultExecutionTemplate={mapping.executionTemplate}
                                        defaultExecutionConfig={mapping.executionConfigText}
                                        defaultActive={mapping.active}
                                        defaultShowcaseCoverUrl={
                                          mapping.showcaseAssets.find((asset) => asset.kind === "cover")?.publicUrl ?? null
                                        }
                                        defaultPlaygroundInputUrl={
                                          mapping.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.publicUrl ?? null
                                        }
                                        defaultFacePlaygroundInputUrl={
                                          mapping.showcaseAssets.find(isFacePlaygroundInputAsset)?.publicUrl ?? null
                                        }
                                        defaultShowcaseCoverAssetId={
                                          mapping.showcaseAssets.find((asset) => asset.kind === "cover")?.id
                                        }
                                        defaultPlaygroundInputAssetId={
                                          mapping.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.id
                                        }
                                        defaultFacePlaygroundInputAssetId={
                                          mapping.showcaseAssets.find(isFacePlaygroundInputAsset)?.id
                                        }
                                        defaultShowcaseCoverPrompt={
                                          mapping.showcaseAssets.find((asset) => asset.kind === "cover")?.altText ?? ""
                                        }
                                        defaultPlaygroundInputPrompt={
                                          mapping.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.altText ?? ""
                                        }
                                        defaultFacePlaygroundInputPrompt={
                                          stripFacePlaygroundPrompt(mapping.showcaseAssets.find(isFacePlaygroundInputAsset)?.altText ?? null)
                                        }
                                        defaultShowcaseGalleryUrls={
                                          mapping.showcaseAssets
                                            .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                            .map((asset) => asset.publicUrl)
                                        }
                                        defaultShowcaseGalleryAssetIds={
                                          mapping.showcaseAssets
                                            .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                            .map((asset) => asset.id)
                                        }
                                        defaultShowcaseGalleryPrompts={
                                          mapping.showcaseAssets
                                            .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                            .map((asset) => asset.altText ?? "")
                                        }
                                        formId={`provider-model-form-${mapping.id}`}
                                        showSubmitButton={false}
                                        className="grid gap-4"
                                        onSuccess={close}
                                        disabled={false}
                                      />
                                    )}
                                  </ManagementDialog>
                                  <ManagementDialog
                                    trigger={<ModalButton tone="secondary">删除</ModalButton>}
                                    title={`删除映射 ${mapping.supportedModelName} / ${mapping.providerName}`}
                                    description="确认删除该模型映射。删除后不可恢复。"
                                  >
                                    {({ close }) => (
                                      <ManagedDialogForm action={deleteProviderModel} close={close}>
                                        <input type="hidden" name="providerModelId" value={mapping.id} />
                                        <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                                          删除后，该可售模型到供应商模型的映射将失效。若仍被路由引用会阻止删除。
                                        </div>
                                        <div className="flex justify-end">
                                          <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                                        </div>
                                      </ManagedDialogForm>
                                    )}
                                  </ManagementDialog>
                                </div>
                              </td>
                            </tr>
                          )})}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </section>
            );
          })}
              </div>
            </section>
          ))}
          {visibleModelGroupsWithStatus.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6 text-sm text-black/55">
              当前筛选下没有可售模型。
            </div>
          ) : null}
          <div className="flex items-center justify-between rounded-2xl border border-[#DDF4FF] bg-white px-4 py-3">
            <p className="text-xs text-black/45">
              Showing {modelPageStart}-{modelPageEnd} of {modelTotalCount}
            </p>
            <div className="flex items-center gap-2">
              <a
                aria-disabled={modelPage <= 1}
                href={getModelHref({
                  page: Math.max(1, modelPage - 1),
                  modelType: activeModelTypeFilter,
                  status: activeStatusFilter,
                })}
                className={`h-8 rounded-md border border-[#BAE6FD] bg-white px-3 py-2 text-xs text-black/65 ${
                  modelPage <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[#E0F2FE]"
                }`}
              >
                Previous
              </a>
              <a
                aria-disabled={modelPage >= modelTotalPages}
                href={getModelHref({
                  page: Math.min(modelTotalPages, modelPage + 1),
                  modelType: activeModelTypeFilter,
                  status: activeStatusFilter,
                })}
                className={`h-8 rounded-md border border-[#BAE6FD] bg-white px-3 py-2 text-xs text-black/65 ${
                  modelPage >= modelTotalPages ? "pointer-events-none opacity-40" : "hover:bg-[#E0F2FE]"
                }`}
              >
                Next
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有可售模型</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            先创建一个可售模型，例如 `openoctopus/gemini-2.5-flash-image`。
          </p>
        </div>
      )}
    </div>
  );
}

export function ModelVendorsPanel({
  models,
  modelVendors = [],
}: {
  models: SupportedModelSummary[];
  modelVendors?: ModelVendorSummary[];
}) {
  const safeModelVendors = Array.isArray(modelVendors) ? modelVendors : [];
  const vendorRowMap = new Map<
    string,
    { id: string; name: string; createdLabel: string; deletable: boolean }
  >();

  for (const vendor of safeModelVendors) {
    vendorRowMap.set(vendor.name.toLowerCase(), {
      id: vendor.id,
      name: vendor.name,
      createdLabel: vendor.createdLabel,
      deletable: true,
    });
  }

  for (const model of models) {
    const normalized = model.provider.trim();
    if (!normalized || normalized.toLowerCase() === "openoctopus") {
      continue;
    }

    const key = normalized.toLowerCase();
    if (!vendorRowMap.has(key)) {
      vendorRowMap.set(key, {
        id: `derived-${key}`,
        name: normalized,
        createdLabel: "-",
        deletable: false,
      });
    }
  }

  const vendorRows = Array.from(vendorRowMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "en-US")
  );

  return (
    <div className="space-y-4">
      {vendorRows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">模型厂商</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">创建时间</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-sm text-black">{vendor.name}</td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">{vendor.createdLabel}</td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                    {!vendor.deletable ? (
                      <span className="text-xs text-black/35">-</span>
                    ) : (
                      <ManagementDialog
                        trigger={<ModalButton tone="secondary">删除</ModalButton>}
                        title={`删除 ${vendor.name}`}
                        description="确认删除该模型厂商名称。"
                      >
                        {({ close }) => (
                          <ManagedDialogForm action={deleteModelVendor} close={close}>
                            <input type="hidden" name="vendorId" value={vendor.id} />
                            <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                              删除后无法恢复。
                            </div>
                            <div className="flex justify-end">
                              <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                            </div>
                          </ManagedDialogForm>
                        )}
                      </ManagementDialog>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有模型厂商</p>
        </div>
      )}
    </div>
  );
}

export function CreateModelVendorButton() {
  return (
    <ManagementDialog
      trigger={<ModalButton>新建</ModalButton>}
      title="新建模型厂商"
      description=" "
    >
      {({ close }) => (
        <ManagedDialogForm action={createModelVendor} close={close}>
          <FormField
            label="厂商名称"
            name="name"
            required
            help="例如 Google、OpenAI、Anthropic。"
          />
          <div className="flex justify-end">
            <SubmitButton label="创建模型厂商" />
          </div>
        </ManagedDialogForm>
      )}
    </ManagementDialog>
  );
}

export function CreateSupportedModelButton({
  capabilityOptions,
  modelTypeOptions = [],
  modelVendors = [],
  models = [],
}: {
  capabilityOptions: readonly CapabilityOption[];
  modelTypeOptions?: StaticModelTypeOptionSummary[];
  modelVendors?: ModelVendorSummary[];
  models?: SupportedModelSummary[];
}) {
  const safeModelTypeOptions = Array.isArray(modelTypeOptions) ? modelTypeOptions : [];
  const safeModelVendors = Array.isArray(modelVendors) ? modelVendors : [];
  const safeModels = Array.isArray(models) ? models : [];
  const vendorNames = Array.from(
    new Set([
      ...safeModelVendors.map((item) => item.name),
      ...safeModels.map((item) => item.provider),
    ])
  )
    .map((item) => item.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "en-US"));
  const vendorOptions =
    vendorNames.length > 0
      ? vendorNames.map((name) => ({ value: name, label: name }))
      : [{ value: "Google", label: "Google" }];
  const cloneCandidates = safeModels;
  const defaultBillingTemplate = '{"billingMode":"hybrid","currency":"USD","charges":{"perImage":0.039,"inputTextTokensPerMillion":0.30}}';
  const modelTypeSelectOptions = buildModelTypeSelectOptions(safeModelTypeOptions, [
    "text-to-image",
    ...safeModels.map((item) => readModelTypeFromBillingConfig(item.billingConfigText)),
  ]);
  const [sourceModelId, setSourceModelId] = useState("");
  const [formSeed, setFormSeed] = useState(0);
  const [draftValues, setDraftValues] = useState(() => ({
    provider: "Google",
    modelSlug: "openoctopus/gemini-2.5-flash-image",
    displayName: "Gemini Image",
    seoTitle: "",
    seoDescription: "",
    seoKeywords: "",
    modelType: "text-to-image",
    allowContinuousOperations: false,
    modality: "image",
    capability: "image_generation",
    billingConfigText: defaultBillingTemplate,
  }));

  const applyCreateDraftFromSource = () => {
    const source = cloneCandidates.find((item) => item.id === sourceModelId);
    if (!source) return;
    setDraftValues({
      provider: source.provider,
      modelSlug: source.model_slug,
      displayName: source.display_name,
      seoTitle: readBillingConfigMetadataField(source.billingConfigText, "seoTitle"),
      seoDescription: readBillingConfigMetadataField(source.billingConfigText, "seoDescription"),
      seoKeywords: readBillingConfigMetadataField(source.billingConfigText, "seoKeywords"),
      modelType: readModelTypeFromBillingConfig(source.billingConfigText) || "text-to-image",
      allowContinuousOperations: readBillingConfigMetadataBooleanField(
        source.billingConfigText,
        "allowContinuousOperations"
      ),
      modality: source.modality,
      capability: source.capability ?? "image_generation",
      billingConfigText: source.billingConfigText || defaultBillingTemplate,
    });
    setFormSeed((current) => current + 1);
  };

  return (
    <ManagementDialog
      trigger={<ModalButton>新建</ModalButton>}
      title="新建可售模型"
      description="在独立弹窗中创建新的客户侧模型定义。"
    >
      {({ close }) => (
      <ManagedDialogForm key={`create-supported-model-${formSeed}`} action={createSupportedModel} close={close} className="grid gap-4 md:grid-cols-2">
        {cloneCandidates.length > 0 ? (
          <div className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3 md:col-span-2">
            <p className="mb-2 text-[11px] tracking-[0.35px] text-black/60">从其他可售模型一键套用资料</p>
            <div className="flex flex-col gap-2 md:flex-row md:items-center">
              <select
                value={sourceModelId}
                onChange={(event) => setSourceModelId(event.target.value)}
                className={formSelectClassName}
              >
                <option value="">请选择来源模型</option>
                {cloneCandidates.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.display_name} ({item.model_slug})
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyCreateDraftFromSource}
                disabled={!sourceModelId}
                className="inline-flex h-10 cursor-pointer items-center justify-center rounded-md border border-[#7DD3FC]/45 bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-[#E0F2FE] disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:text-black/35"
              >
                套用到新建表单
              </button>
            </div>
          </div>
        ) : null}
        <FormSelect
          label="模型厂商（内部分类）"
          name="provider"
          options={vendorOptions}
          defaultValue={draftValues.provider}
          help="用于内部分类和测算分组，例如 Google、OpenAI、Anthropic。"
        />
        <FormField label="可售模型 Slug" name="modelSlug" defaultValue={draftValues.modelSlug} required />
        <FormField label="显示名称" name="displayName" defaultValue={draftValues.displayName} required />
        <FormField
          label="SEO Title"
          name="seoTitle"
          defaultValue={draftValues.seoTitle}
          placeholder="例如：Gemini Image by Google | Pricing, Prompt Guide & API"
          help="可选。用于模型详情页 title、OG 和 Twitter 标题。"
          className="md:col-span-2"
        />
        <FormTextArea
          label="SEO Description"
          name="seoDescription"
          defaultValue={draftValues.seoDescription}
          placeholder="用于搜索摘要和分享描述。建议 120-180 字符。"
          help="会自动同步为模型介绍文案。"
          className="md:col-span-2"
        />
        <FormTextArea
          label="SEO Keywords"
          name="seoKeywords"
          defaultValue={draftValues.seoKeywords}
          placeholder="一行或逗号分隔一个关键词，例如 gemini image, google image api, text to image"
          help="可选。会写入 metadata keywords 和结构化数据。"
          className="md:col-span-2"
        />
        <FormSelect
          label="类型"
          name="modelType"
          options={modelTypeSelectOptions}
          defaultValue={draftValues.modelType}
        />
        <ActiveCheckbox
          name="allowContinuousOperations"
          defaultChecked={draftValues.allowContinuousOperations}
          label="允许连续操作（在 Playground 复用当前用户该模型下的历史图片）"
          disabled={false}
        />
        <FormSelect
          label="模态"
          name="modality"
          value={draftValues.modality}
          onChange={(value) =>
            setDraftValues((current) => {
              const nextModality = value as SupportedModelSummary["modality"];
              return {
                ...current,
                modality: nextModality,
                capability: normalizeCapabilityForModality(
                  nextModality,
                  current.capability as NonNullable<SupportedModelSummary["capability"]>
                ),
              };
            })
          }
          options={[
            { value: "image", label: "图片" },
            { value: "video", label: "视频" },
            { value: "audio", label: "音频" },
            { value: "text", label: "文本" },
          ]}
        />
        <FormSelect
          label="能力类型"
          name="capability"
          options={[...capabilityOptions]}
          value={draftValues.capability}
          onChange={(value) =>
            setDraftValues((current) => ({
              ...current,
              capability: value,
              modality: normalizeModalityForCapability(
                value as NonNullable<SupportedModelSummary["capability"]>,
                current.modality as SupportedModelSummary["modality"]
              ),
            }))
          }
        />
        <div className="md:col-span-2">
          <BillingConfigEditor
            key={`create-supported-model-billing-${formSeed}`}
            initialValue={draftValues.billingConfigText}
            capability={draftValues.capability as SupportedModelSummary["capability"]}
          />
        </div>
        <input type="hidden" name="active" value="true" />
        <div className="flex justify-end md:col-span-2">
          <SubmitButton label="创建可售模型" />
        </div>
      </ManagedDialogForm>
      )}
    </ManagementDialog>
  );
}

export function EconomicsPanel({
  supportedModels = [],
  providerModels = [],
  providers = [],
  workerTemplates = [],
}: {
  supportedModels?: SupportedModelSummary[] | null;
  providerModels?: ProviderModelSummary[] | null;
  providers?: ProviderSummary[] | null;
  workerTemplates?: WorkerTemplateSummary[] | null;
}) {
  const safeSupportedModels = Array.isArray(supportedModels) ? supportedModels : [];
  const safeProviderModels = Array.isArray(providerModels) ? providerModels : [];
  const safeProviders = Array.isArray(providers) ? providers : [];
  const safeWorkerTemplates = Array.isArray(workerTemplates) ? workerTemplates : [];
  const workerTemplateOptions = (safeWorkerTemplates.length > 0
    ? safeWorkerTemplates.map((item) => ({ slug: item.slug, displayName: item.display_name }))
    : Array.from(new Set(safeProviderModels.map((item) => item.executionTemplate)))
        .filter((slug): slug is string => Boolean(slug))
        .map((slug) => ({ slug, displayName: slug }))).sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "zh-CN")
  );
  const supportedModelById = new Map(safeSupportedModels.map((item) => [item.id, item]));
  const supportedModelOptions = safeSupportedModels.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
    billingConfigText: item.billingConfigText,
  }));
  const providerOptions = safeProviders.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
  }));
  const executionConfigPresets = safeProviderModels.map(buildProviderModelPreset);

  const rows = safeProviderModels
    .map((providerModel) => {
      const supportedModel = providerModel.supported_model_id
        ? supportedModelById.get(providerModel.supported_model_id) ?? null
        : null;
      if (!supportedModel) {
        return null;
      }

      const supportedUnit = readComparableUnitCost(supportedModel.billingConfigText);
      const providerUnit = readComparableUnitCost(providerModel.pricingText);
      const margin =
        supportedUnit && providerUnit && supportedUnit.unitLabel === providerUnit.unitLabel
          ? supportedUnit.defaultUnitCost - providerUnit.defaultUnitCost
          : null;

      return {
        providerModel,
        supportedModel,
        margin,
        providerName: providerModel.providerName,
        providerSlug: providerModel.providerSlug,
        vendor: supportedModel.provider?.trim() || "Unspecified",
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((a, b) => {
      const providerCompare = a.providerName.localeCompare(b.providerName, "en-US");
      if (providerCompare !== 0) {
        return providerCompare;
      }
      const vendorCompare = a.vendor.localeCompare(b.vendor, "en-US");
      if (vendorCompare !== 0) {
        return vendorCompare;
      }
      return a.supportedModel.model_slug.localeCompare(b.supportedModel.model_slug, "en-US");
    });

  const filteredRows = rows;
  const groupedByProvider = filteredRows.reduce(
    (acc, row) => {
      const providerKey = row.providerModel.provider_id;
      const providerEntry = acc.get(providerKey) ?? {
        providerName: row.providerName,
        providerSlug: row.providerSlug,
        vendors: new Map<string, typeof filteredRows>(),
      };
      const vendorRows = providerEntry.vendors.get(row.vendor) ?? [];
      vendorRows.push(row);
      providerEntry.vendors.set(row.vendor, vendorRows);
      acc.set(providerKey, providerEntry);
      return acc;
    },
    new Map<
      string,
      {
        providerName: string;
        providerSlug: string;
        vendors: Map<string, typeof filteredRows>;
      }
    >()
  );

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <>
          <div className="space-y-4">
            {Array.from(groupedByProvider.entries()).map(([providerId, providerGroup]) => (
              <section key={providerId} className="rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
                <div className="border-b border-[#BAE6FD] bg-[#E0F2FE] px-4 py-3 text-sm font-semibold text-[#0369A1]">
                  供应商：{providerGroup.providerName}
                </div>
                <div className="space-y-4 p-3">
                  {Array.from(providerGroup.vendors.entries()).map(([vendor, vendorRows]) => (
                    <div key={`${providerId}-${vendor}`} className="rounded-xl border border-[#DDF4FF]">
                      <div className="border-b border-[#DDF4FF] bg-[#F8FCFF] px-3 py-2 text-xs font-medium text-black/70">
                        模型公司：{vendor}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1860px] border-separate border-spacing-0 text-left text-sm">
                          <thead>
                            <tr className="text-xs text-black/50">
                              <th className="w-[290px] border-b border-[#BAE6FD] px-3 py-2.5">可售模型</th>
                              <th className="w-[290px] border-b border-[#BAE6FD] px-3 py-2.5">模型 Slug</th>
                              <th className="w-[140px] border-b border-[#BAE6FD] px-3 py-2.5">能力</th>
                              <th className="w-[210px] border-b border-[#BAE6FD] px-3 py-2.5">参数文档</th>
                              <th className="w-[240px] border-b border-[#BAE6FD] px-3 py-2.5">售价</th>
                              <th className="w-[290px] border-b border-[#BAE6FD] px-3 py-2.5">成本</th>
                              <th className="w-[130px] border-b border-[#BAE6FD] px-3 py-2.5">标准利润</th>
                              <th className="w-[130px] border-b border-[#BAE6FD] px-3 py-2.5">来源证据</th>
                              <th className="w-[110px] border-b border-[#BAE6FD] px-3 py-2.5">状态</th>
                              <th className="sticky right-0 z-10 w-[180px] border-b border-[#BAE6FD] bg-white px-3 py-2.5 shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.28)]">
                                操作
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorRows.map((row) => (
                              <tr key={row.providerModel.id}>
                                <td className="w-[290px] border-b border-[#DDF4FF] px-3 py-3 align-top">
                                  <p className="text-sm font-medium text-black">{row.supportedModel.display_name}</p>
                                </td>
                                <td className="w-[290px] border-b border-[#DDF4FF] px-3 py-3 align-top">
                                  <p className="font-mono text-xs text-black/70">{row.supportedModel.model_slug}</p>
                                </td>
                                <td className="w-[140px] border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                                  {row.providerModel.capability}
                                </td>
                                <td className="w-[210px] border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                                  <p>{summarizeInputSchema(row.providerModel.inputSchemaText)}</p>
                                  {readSchemaDocUrl(row.providerModel.inputSchemaText) ? (
                                    <a
                                      href={readSchemaDocUrl(row.providerModel.inputSchemaText) ?? ""}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-flex text-[11px] text-[#0369A1] underline-offset-2 hover:underline"
                                    >
                                      官方参数文档
                                    </a>
                                  ) : (
                                    <p className="mt-1 text-[11px] text-black/45">未填官方文档链接</p>
                                  )}
                                </td>
                                <td className="w-[240px] border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">{row.supportedModel.billingSummary}</td>
                                <td className="w-[290px] border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                                  <p>{row.providerModel.pricingSummary}</p>
                                </td>
                                <td className="w-[130px] border-b border-[#DDF4FF] px-3 py-3 align-top">
                                  {row.margin === null ? (
                                    <p className="text-xs text-black/45">口径不一致</p>
                                  ) : (
                                    <p className={`text-sm font-medium ${row.margin >= 0 ? "text-[#335D2D]" : "text-[#b54432]"}`}>
                                      {formatCurrency(row.margin)}
                                    </p>
                                  )}
                                </td>
                                <td className="w-[130px] border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                                  <p>来源字段已移除</p>
                                </td>
                                <td className="w-[110px] border-b border-[#DDF4FF] px-3 py-3 align-top">
                                  <span
                                    className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                                      row.providerModel.active
                                        ? "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]"
                                        : "border-[#BAE6FD] bg-[#F8FCFF] text-black/60"
                                    }`}
                                  >
                                    {row.providerModel.active ? "已启用" : "未启用"}
                                  </span>
                                </td>
                                <td className="sticky right-0 z-10 w-[180px] border-b border-[#DDF4FF] bg-white px-3 py-3 align-top shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.28)]">
                                  <div className="flex flex-wrap gap-2">
                              <ManagementDialog
                                trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                                title={`编辑 ${row.supportedModel.display_name} / ${row.providerModel.providerName}`}
                                description=" "
                                headerActions={
                                  <DialogFormSubmitButton formId={`provider-model-form-${row.providerModel.id}`} />
                                }
                              >
                                {({ close }) => (
                                  <CreateProviderModelForm
                                    action={updateProviderModelDetails}
                                    providerModelId={row.providerModel.id}
                                    supportedModels={supportedModelOptions}
                                    providers={providerOptions}
                                    workerTemplates={workerTemplateOptions.map((item) => ({
                                      id: item.slug,
                                      displayName: item.displayName,
                                      slug: item.slug,
                                    }))}
                                    executionConfigPresets={executionConfigPresets.filter((preset) => preset.id !== row.providerModel.id)}
                                    defaultSupportedModelSlug={row.supportedModel.model_slug}
                                    defaultProviderId={row.providerModel.provider_id}
                                    defaultUpstreamModelSlug={row.providerModel.upstream_model_slug}
                                    defaultPricing={row.providerModel.pricingText}
                                    defaultInputSchema={row.providerModel.inputSchemaText}
                                    defaultOutputSchema={row.providerModel.outputSchemaText}
                                    defaultExecutionTemplate={row.providerModel.executionTemplate}
                                    defaultExecutionConfig={row.providerModel.executionConfigText}
                                    defaultActive={row.providerModel.active}
                                    defaultShowcaseCoverUrl={
                                      row.providerModel.showcaseAssets.find((asset) => asset.kind === "cover")?.publicUrl ?? null
                                    }
                                    defaultPlaygroundInputUrl={
                                      row.providerModel.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.publicUrl ?? null
                                    }
                                    defaultFacePlaygroundInputUrl={
                                      row.providerModel.showcaseAssets.find(isFacePlaygroundInputAsset)?.publicUrl ?? null
                                    }
                                    defaultShowcaseCoverAssetId={
                                      row.providerModel.showcaseAssets.find((asset) => asset.kind === "cover")?.id
                                    }
                                    defaultPlaygroundInputAssetId={
                                      row.providerModel.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.id
                                    }
                                    defaultFacePlaygroundInputAssetId={
                                      row.providerModel.showcaseAssets.find(isFacePlaygroundInputAsset)?.id
                                    }
                                    defaultShowcaseCoverPrompt={
                                      row.providerModel.showcaseAssets.find((asset) => asset.kind === "cover")?.altText ?? ""
                                    }
                                    defaultPlaygroundInputPrompt={
                                      row.providerModel.showcaseAssets.find(isPrimaryPlaygroundInputAsset)?.altText ?? ""
                                    }
                                    defaultFacePlaygroundInputPrompt={
                                      stripFacePlaygroundPrompt(row.providerModel.showcaseAssets.find(isFacePlaygroundInputAsset)?.altText ?? null)
                                    }
                                    defaultShowcaseGalleryUrls={
                                      row.providerModel.showcaseAssets
                                        .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                        .map((asset) => asset.publicUrl)
                                    }
                                    defaultShowcaseGalleryAssetIds={
                                      row.providerModel.showcaseAssets
                                        .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                        .map((asset) => asset.id)
                                    }
                                    defaultShowcaseGalleryPrompts={
                                      row.providerModel.showcaseAssets
                                        .filter((asset) => asset.kind === "gallery" && !isFacePlaygroundInputAsset(asset))
                                        .map((asset) => asset.altText ?? "")
                                    }
                                    formId={`provider-model-form-${row.providerModel.id}`}
                                    showSubmitButton={false}
                                    className="grid gap-4"
                                    onSuccess={close}
                                    disabled={false}
                                  />
                                )}
                              </ManagementDialog>
                              <ManagementDialog
                                trigger={<ModalButton tone="secondary">删除</ModalButton>}
                                title={`删除 ${row.supportedModel.display_name} / ${row.providerModel.providerName}`}
                                description="确认删除该模型映射。删除后不可恢复。"
                              >
                                {({ close }) => (
                                  <ManagedDialogForm action={deleteProviderModel} close={close}>
                                    <input type="hidden" name="providerModelId" value={row.providerModel.id} />
                                    <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                                      删除后，该可售模型到供应商模型的映射将失效。若仍被路由引用会阻止删除。
                                    </div>
                                    <div className="flex justify-end">
                                      <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                                    </div>
                                  </ManagedDialogForm>
                                )}
                              </ManagementDialog>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有可售模型</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            先创建可售模型和供应商模型后，这里才会生成联动测算行。
          </p>
        </div>
      )}
    </div>
  );
}

export function WorkerTemplatesPanel({
  workerTemplates = [],
  providerModels,
}: {
  workerTemplates?: WorkerTemplateSummary[];
  providerModels: ProviderModelSummary[];
}) {
  const inUseMap = providerModels.reduce((map, item) => {
    const key = item.executionTemplate?.trim() || "未设置";
    const current = map.get(key) ?? { providerModelCount: 0, providers: new Set<string>() };
    current.providerModelCount += 1;
    current.providers.add(item.providerName);
    map.set(key, current);
    return map;
  }, new Map<string, { providerModelCount: number; providers: Set<string> }>());

  const rows = workerTemplates
    .map((item) => {
      const relatedModels = providerModels
        .filter((model) => (model.executionTemplate?.trim() || "") === item.slug)
        .map((model) => ({
          publicModelSlug: model.public_model_slug,
          upstreamModelSlug: model.upstream_model_slug,
        }))
        .sort((a, b) => a.publicModelSlug.localeCompare(b.publicModelSlug, "en-US"));
      const use = inUseMap.get(item.slug) ?? { providerModelCount: 0, providers: new Set<string>() };
      return {
        ...item,
        displayName: normalizeTemplateDisplayName(item.slug, item.display_name),
        providerModelCount: use.providerModelCount,
        providerCount: use.providers.size,
        providersLabel: Array.from(use.providers).sort((a, b) => a.localeCompare(b, "en-US")).join(" / "),
        modeLabel: readTemplateMode(item.config),
        configDiagnostics: readTemplateConfigDiagnostics(item.config),
        configText: JSON.stringify(item.config ?? {}, null, 2),
        relatedModels,
      };
    })
    .sort((a, b) => a.displayName.localeCompare(b.displayName, "zh-CN"));

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-[1020px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="w-[16%] border-b border-[#BAE6FD] px-3 py-2.5">显示名称</th>
                <th className="w-[16%] border-b border-[#BAE6FD] px-3 py-2.5">模板标识</th>
                <th className="w-[18%] border-b border-[#BAE6FD] px-3 py-2.5">模式说明</th>
                <th className="w-[16%] border-b border-[#BAE6FD] px-3 py-2.5">可售模型</th>
                <th className="w-[16%] border-b border-[#BAE6FD] px-3 py-2.5">上游模型</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-sm text-black">
                    <p>{row.displayName}</p>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/55">
                    {row.slug}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs">
                    <p className="font-medium text-black/72">{row.modeLabel}</p>
                    <p className="mt-1 text-black/60">
                      {row.modeLabel === "任务轮询" ? "提交后轮询获取结果" : "请求成功后直接返回结果"}
                    </p>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {row.relatedModels.length > 0 ? (
                      <div className="space-y-1">
                        {row.relatedModels.map((item) => (
                          <p key={`${row.id}-${item.publicModelSlug}`}>{item.publicModelSlug}</p>
                        ))}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {row.relatedModels.length > 0 ? (
                      <div className="space-y-1">
                        {row.relatedModels.map((item) => (
                          <p key={`${row.id}-${item.upstreamModelSlug}`}>{item.upstreamModelSlug}</p>
                        ))}
                      </div>
                    ) : (
                      <span>-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有可用模板</p>
        </div>
      )}

    </div>
  );
}

export function GatewayErrorDefinitionsPanel({
  definitions,
}: {
  definitions: GatewayErrorDefinitionSummary[];
}) {
  const rows = [...definitions].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code, "en-US")
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#BAE6FD] bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-medium text-black">统一错误码维护</p>
          <p className="mt-1 text-xs leading-5 text-black/55">
            所有对外 API 异常都应返回这里维护的错误码与文案，避免暴露上游供应商或内部系统细节。
          </p>
        </div>
        <ManagementDialog
          trigger={<ModalButton tone="primary">新增错误码</ModalButton>}
          title="新增错误码定义"
          description="新增或覆盖一个对外错误码的状态码、文案和重试策略。"
        >
          {({ close }) => (
            <ManagedDialogForm action={upsertGatewayErrorDefinition} close={close}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="错误码" name="code" required placeholder="provider_submit_failed" />
                <FormField label="分类" name="category" required placeholder="upstream" />
                <FormField label="HTTP 状态码" name="httpStatus" required placeholder="502" />
                <FormField label="排序" name="sortOrder" required placeholder="180" />
              </div>
              <FormTextArea
                label="对外提示文案"
                name="publicMessage"
                defaultValue="The generation provider could not accept the request. Please retry shortly."
              />
              <FormTextArea
                label="内部备注"
                name="operatorNotes"
                placeholder="给运营/研发的说明，不会返回给客户。"
              />
              <div className="grid gap-3 md:grid-cols-2">
                <ActiveCheckbox name="retryable" defaultChecked={true} label="允许提示可重试" />
                <ActiveCheckbox name="active" defaultChecked={true} label="启用此定义" />
              </div>
              <div className="flex justify-end">
                <SubmitButton label="保存错误码" />
              </div>
            </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-[1280px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="w-[16%] border-b border-[#BAE6FD] px-3 py-2.5">错误码</th>
                <th className="w-[10%] border-b border-[#BAE6FD] px-3 py-2.5">分类</th>
                <th className="w-[7%] border-b border-[#BAE6FD] px-3 py-2.5">状态码</th>
                <th className="w-[25%] border-b border-[#BAE6FD] px-3 py-2.5">对外文案</th>
                <th className="w-[8%] border-b border-[#BAE6FD] px-3 py-2.5">重试</th>
                <th className="w-[8%] border-b border-[#BAE6FD] px-3 py-2.5">启用</th>
                <th className="w-[8%] border-b border-[#BAE6FD] px-3 py-2.5">排序</th>
                <th className="w-[12%] border-b border-[#BAE6FD] px-3 py-2.5">更新时间</th>
                <th className="w-[6%] border-b border-[#BAE6FD] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top">
                    <p className="font-mono text-xs text-black">{row.code}</p>
                    {row.operatorNotes ? (
                      <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-black/50">
                        {row.operatorNotes}
                      </p>
                    ) : null}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/65">
                    {row.category}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/65">
                    {row.httpStatus}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs leading-5 text-black/72">
                    {row.publicMessage}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/65">
                    {row.retryable ? "是" : "否"}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/65">
                    {row.active ? "启用" : "停用"}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/65">
                    {row.sortOrder}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/50">
                    <p>{row.updatedLabel}</p>
                    <p className="mt-1">创建于 {row.createdLabel}</p>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top">
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                      title={`编辑错误码 ${row.code}`}
                      description="修改对外错误码的状态码、文案、启用状态与重试策略。"
                    >
                      {({ close }) => (
                        <ManagedDialogForm action={upsertGatewayErrorDefinition} close={close}>
                          <input type="hidden" name="definitionId" value={row.id} />
                          <div className="grid gap-4 md:grid-cols-2">
                            <FormField label="错误码" name="code" required defaultValue={row.code} />
                            <FormField label="分类" name="category" required defaultValue={row.category} />
                            <FormField
                              label="HTTP 状态码"
                              name="httpStatus"
                              required
                              defaultValue={String(row.httpStatus)}
                            />
                            <FormField
                              label="排序"
                              name="sortOrder"
                              required
                              defaultValue={String(row.sortOrder)}
                            />
                          </div>
                          <FormTextArea
                            label="对外提示文案"
                            name="publicMessage"
                            defaultValue={row.publicMessage}
                          />
                          <FormTextArea
                            label="内部备注"
                            name="operatorNotes"
                            defaultValue={row.operatorNotes ?? ""}
                          />
                          <div className="grid gap-3 md:grid-cols-2">
                            <ActiveCheckbox name="retryable" defaultChecked={row.retryable} label="允许提示可重试" />
                            <ActiveCheckbox name="active" defaultChecked={row.active} label="启用此定义" />
                          </div>
                          <div className="flex justify-end">
                            <SubmitButton label="保存错误码" />
                          </div>
                        </ManagedDialogForm>
                      )}
                    </ManagementDialog>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有错误码定义</p>
        </div>
      )}
    </div>
  );
}

export function ModelTypeOptionsPanel({
  modelTypeOptions,
}: {
  modelTypeOptions: StaticModelTypeOptionSummary[];
}) {
  const rows = [...modelTypeOptions].sort(
    (a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label, "zh-CN")
  );

  return (
    <div className="space-y-4">
      <div>
        <ManagementDialog
          trigger={<ModalButton tone="primary">新增类型</ModalButton>}
          title="新增模型类型选项"
          description="新增一个可售模型类型选项，值会写入 supported_models.billing_config.metadata.modelType。"
        >
          {({ close }) => (
            <ManagedDialogForm action={upsertStaticModelTypeOption} close={close}>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="值" name="value" required placeholder="text-to-image" />
                <FormField label="展示名" name="label" required placeholder="Text to Image" />
                <FormField label="排序" name="sortOrder" required placeholder="100" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <ActiveCheckbox name="active" defaultChecked={true} label="启用此选项" />
              </div>
              <div className="flex justify-end">
                <SubmitButton label="保存类型" />
              </div>
            </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {rows.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">展示名</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">值</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">状态</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">排序</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">更新时间</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-sm text-black">
                    {row.label}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top font-mono text-xs text-black/60">
                    {row.value}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                    {row.active ? "启用" : "停用"}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/60">
                    {row.sortOrder}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top text-xs text-black/50">
                    <p>{row.updatedLabel}</p>
                    <p className="mt-1">创建于 {row.createdLabel}</p>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <form action={upsertStaticModelTypeOption}>
                        <input type="hidden" name="optionId" value={row.id} />
                        <input type="hidden" name="value" value={row.value} />
                        <input type="hidden" name="label" value={row.label} />
                        <input type="hidden" name="sortOrder" value={String(row.sortOrder)} />
                        <input type="hidden" name="active" value={row.active ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`inline-flex h-9 min-w-[64px] items-center justify-center rounded-md border px-3 text-xs font-medium transition-colors ${
                            row.active
                              ? "border-[#9CC9A5] bg-[#EAF7ED] text-[#2F7A3E] hover:bg-[#def0e3]"
                              : "border-black/[0.14] bg-[#F0F9FF] text-black/70 hover:bg-[#E0F2FE]"
                          }`}
                        >
                          {row.active ? "停用" : "启用"}
                        </button>
                      </form>
                      <ManagementDialog
                        trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                        title={`编辑模型类型 ${row.label}`}
                        description="修改类型值、展示名、排序和启用状态。"
                      >
                        {({ close }) => (
                          <ManagedDialogForm action={upsertStaticModelTypeOption} close={close}>
                            <input type="hidden" name="optionId" value={row.id} />
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField label="值" name="value" required defaultValue={row.value} />
                              <FormField label="展示名" name="label" required defaultValue={row.label} />
                              <FormField
                                label="排序"
                                name="sortOrder"
                                required
                                defaultValue={String(row.sortOrder)}
                              />
                            </div>
                            <div className="grid gap-3 md:grid-cols-2">
                              <ActiveCheckbox name="active" defaultChecked={row.active} label="启用此选项" />
                            </div>
                            <div className="flex justify-end">
                              <SubmitButton label="保存类型" />
                            </div>
                          </ManagedDialogForm>
                        )}
                      </ManagementDialog>

                      <ManagementDialog
                        trigger={<ModalButton tone="secondary">删除</ModalButton>}
                        title={`删除模型类型 ${row.label}`}
                        description="确认删除这个模型类型选项。若仍被可售模型使用，将阻止删除。"
                      >
                        {({ close }) => (
                          <ManagedDialogForm action={deleteStaticModelTypeOption} close={close}>
                            <input type="hidden" name="optionId" value={row.id} />
                            <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                              删除后，这个类型不会再出现在可售模型下拉和筛选中。
                            </div>
                            <div className="flex justify-end">
                              <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                            </div>
                          </ManagedDialogForm>
                        )}
                      </ManagementDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有模型类型选项</p>
        </div>
      )}
    </div>
  );
}

export function ProvidersPanel({
  providers,
  credentials,
  assetStorageCredentials,
  providerStatusOptions,
}: {
  providers: ProviderSummary[];
  credentials: ProviderCredentialSummary[];
  assetStorageCredentials: ProviderAssetStorageCredentialSummary[];
  providerStatusOptions: readonly ProviderStatusOption[];
}) {
  const statusToneClassName = (status: ProviderSummary["status"]) => {
    if (status === "healthy") {
      return "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]";
    }
    if (status === "degraded") {
      return "border-[#BAE6FD] bg-[#E0F2FE] text-[#0369A1]";
    }
    return "border-[#F1D2CC] bg-[#FFF7F5] text-[#8D4336]";
  };

  return (
    <div className="space-y-4">
      {providers.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">供应商</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">基础 URL</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">状态</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">区域</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">模型</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">密钥数</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => {
                const providerCredentials = credentials.filter((item) => item.provider_id === provider.id);
                const providerAssetStorageCredentials = assetStorageCredentials.filter((item) => item.provider_id === provider.id);

                return (
                <tr key={provider.id}>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                      <p className="text-sm font-medium text-black">{provider.name}</p>
                      <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                      <RuntimeDiagnostics diagnostics={provider.runtimeDiagnostics} />
                    </td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                      <p className="max-w-[320px] break-all text-xs text-black/60">{provider.base_url ?? "未填写"}</p>
                    </td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                      <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${statusToneClassName(provider.status)}`}>
                        {provider.status === "healthy" ? "健康" : provider.status === "degraded" ? "降级" : "离线"}
                      </span>
                    </td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">{provider.regionsLabel}</td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                      {provider.activeModelCount}/{provider.modelCount}
                    </td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">{provider.credentialCount}</td>
                    <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                          title="编辑"
                        >
                          {({ close }) => (
                            <ManagedDialogForm action={updateProvider} close={close}>
                              <input type="hidden" name="providerId" value={provider.id} />
                              <FormField label="名称" name="name" defaultValue={provider.name} required />
                              <FormField label="Slug" name="slug" defaultValue={provider.slug} required />
                              <FormField label="基础 URL" name="baseUrl" defaultValue={provider.base_url ?? ""} />
                              <FormSelect label="状态" name="status" defaultValue={provider.status} options={[...providerStatusOptions]} />
                              <FormField label="区域" name="regions" defaultValue={(provider.regions ?? []).join(", ")} />
                              <div className="flex justify-end">
                                <SubmitButton label="保存供应商" />
                              </div>
                            </ManagedDialogForm>
                          )}
                        </ManagementDialog>
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary">管理密钥</ModalButton>}
                          title="密钥管理"
                          description="在弹窗里新增、编辑、轮换或删除这个供应商的密钥。"
                        >
                          <CredentialsPanel credentials={providerCredentials} providers={[provider]} selectedTemplate={null} />
                        </ManagementDialog>
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary">资产存储</ModalButton>}
                          title="资产存储凭证"
                          description="管理这个供应商下用于模型输入和输出资产缓存的云存储凭证。"
                        >
                          <AssetStorageCredentialsPanel credentials={providerAssetStorageCredentials} providers={[provider]} />
                        </ManagementDialog>
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary">删除</ModalButton>}
                          title={`删除 ${provider.name}`}
                          description="确认删除该供应商。若仍有关联模型或密钥将阻止删除。"
                        >
                          {({ close }) => (
                            <ManagedDialogForm action={deleteProvider} close={close}>
                              <input type="hidden" name="providerId" value={provider.id} />
                              <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                                删除后无法恢复。建议先确认该供应商下没有模型和密钥。
                              </div>
                              <div className="flex justify-end">
                                <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                              </div>
                            </ManagedDialogForm>
                          )}
                        </ManagementDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有供应商</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            从这里开始录入第一个真实上游供应商。
          </p>
        </div>
      )}

    </div>
  );
}

export function CreateProviderButton({
  providerStatusOptions,
}: {
  providerStatusOptions: readonly ProviderStatusOption[];
}) {
  return (
    <ManagementDialog
      trigger={<ModalButton>新建供应商</ModalButton>}
      title="新建供应商"
      description="在独立弹窗中创建新的上游供应商。"
    >
      {({ close }) => (
        <ManagedDialogForm action={createProvider} close={close}>
          <FormField label="名称" name="name" required />
          <FormField label="Slug" name="slug" required />
          <FormField label="基础 URL" name="baseUrl" />
          <FormSelect
            label="状态"
            name="status"
            defaultValue="healthy"
            options={[...providerStatusOptions]}
          />
          <FormField label="区域" name="regions" />
          <FormTextArea label="配置 JSON" name="config" defaultValue="{}" />
          <div className="flex justify-end">
            <SubmitButton label="创建供应商" />
          </div>
        </ManagedDialogForm>
      )}
    </ManagementDialog>
  );
}

export function CredentialsPanel({
  credentials,
  providers,
  selectedTemplate,
}: {
  credentials: ProviderCredentialSummary[];
  providers: ProviderSummary[];
  selectedTemplate: ProviderTemplate | null;
}) {
  const hasProviders = providers.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商密钥</div>
        <ManagementDialog
          trigger={<ModalButton>新建供应商密钥</ModalButton>}
          disabled={!hasProviders}
          title="新建供应商密钥"
          description="在独立弹窗中创建新的供应商密钥，不直接嵌在列表里编辑。"
        >
          {({ close }) => (
          <ManagedDialogForm action={createProviderCredential} close={close}>
            <FormSelect
              label="供应商"
              name="providerId"
              disabled={!hasProviders}
              options={
                hasProviders
                  ? providers.map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` }))
                  : [{ value: "", label: "请先创建供应商" }]
              }
            />
            <FormField label="名称" name="label" defaultValue={selectedTemplate?.credential.label} required disabled={!hasProviders} />
            <FormField label="密钥" name="secret" type="password" required disabled={!hasProviders} />
            <FormField label="引用说明" name="secretRef" defaultValue={selectedTemplate?.credential.secretRef} disabled={!hasProviders} />
            <FormField label="环境" name="environment" defaultValue={selectedTemplate?.credential.environment} required disabled={!hasProviders} />
            <FormTextArea label="备注" name="notes" defaultValue={selectedTemplate?.credential.notes} disabled={!hasProviders} />
            <FormTextArea label="Metadata JSON" name="metadata" defaultValue={selectedTemplate?.credential.metadata ?? "{}"} disabled={!hasProviders} />
            <ActiveCheckbox name="isActive" defaultChecked disabled={!hasProviders} label="启用" />
            <div className="flex justify-end">
              <SubmitButton label="创建供应商密钥" disabled={!hasProviders} />
            </div>
          </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {credentials.length > 0 ? (
        credentials.map((credential) => (
          <div key={credential.id} className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md border border-[#BAE6FD] bg-[#E0F2FE] px-2 text-[11px] text-[#0369A1]">
                    {credential.environment}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-md border border-[#BAE6FD] bg-[#E0F2FE] px-2 text-[11px] text-[#0369A1]">
                    {credential.secretSourceLabel}
                  </span>
                  {credential.is_active ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[#D7EADB] bg-[#EDF8F0] px-2 text-[11px] text-[#335D2D]">
                      <BadgeCheck className="size-3" />
                      已启用
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-black">{credential.label}</p>
                <p className="mt-1 text-xs text-black/50">
                  {credential.providerName} · {credential.secretMask}
                </p>
                {credential.secret_ref ? (
                  <p className="mt-1 text-xs text-black/50">引用：{credential.secret_ref}</p>
                ) : null}
                <p className="mt-1 text-xs text-black/50">
                  密钥更新时间：{credential.secretUpdatedLabel}
                </p>
                {credential.notes ? (
                  <p className="mt-2 text-xs leading-5 text-black/55">{credential.notes}</p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <form action={updateProviderCredentialState}>
                  <input type="hidden" name="credentialId" value={credential.id} />
                  <input type="hidden" name="isActive" value={credential.is_active ? "false" : "true"} />
                  <button
                    type="submit"
                    className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-[#BAE6FD] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-[#E0F2FE]"
                  >
                    {credential.is_active ? "停用" : "启用"}
                  </button>
                </form>
                <ManagementDialog
                  trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                title={`编辑 ${credential.label}`}
                description="在弹窗中编辑这个已有供应商密钥。"
              >
                  {({ close }) => (
                  <ManagedDialogForm action={updateProviderCredentialDetails} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <FormField label="名称" name="label" defaultValue={credential.label} required />
                    <FormField label="引用说明" name="secretRef" defaultValue={credential.secret_ref ?? ""} />
                    <FormField label="环境" name="environment" defaultValue={credential.environment} required />
                    <FormTextArea label="备注" name="notes" defaultValue={credential.notes ?? ""} />
                    <FormTextArea label="Metadata JSON" name="metadata" defaultValue={credential.metadataText} />
                    <ActiveCheckbox name="isActive" defaultChecked={credential.is_active} label="启用" />
                    <div className="flex justify-end">
                      <SubmitButton label="保存供应商密钥" />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>

                <ManagementDialog
                  trigger={<ModalButton tone="secondary">轮换密钥</ModalButton>}
                  title={`轮换密钥：${credential.label}`}
                  description="将密钥轮换与元数据编辑拆开，避免操作员混淆。"
                >
                  {({ close }) => (
                  <ManagedDialogForm action={rotateProviderCredentialSecret} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <FormField label="新密钥" name="secret" type="password" required />
                    <FormField label="引用说明" name="secretRef" defaultValue={credential.secret_ref ?? ""} />
                    <div className="flex justify-end">
                      <SubmitButton label="提交轮换" />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>

                <ManagementDialog
                  trigger={<ModalButton tone="secondary">删除</ModalButton>}
                  title={`删除 ${credential.label}`}
                  description="确认是否删除这个供应商密钥。"
                >
                  {({ close }) => (
                  <ManagedDialogForm action={deleteProviderCredential} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                      这个操作会永久删除供应商密钥记录，删除后无法恢复。
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton
                        label="删除供应商密钥"
                        pendingLabel="删除中..."
                        tone="danger"
                      />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>
              </div>
            </div>

            {credential.secret_source !== "internal_encrypted" ? (
              <div className="mt-4 flex items-center gap-1.5 bg-[#ffe7e3] px-3 py-2.5">
                <CircleAlert className="size-3.5 shrink-0 text-[#b54432]" />
                <p className="text-xs leading-[1.35] text-[#b54432]">
                  当前还是旧的外部引用形式。正式放量前应先完成密钥轮换。
                </p>
              </div>
            ) : null}
            <RuntimeDiagnostics diagnostics={credential.runtimeDiagnostics} />
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有供应商密钥</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            创建供应商后，在这里登记真实的密钥引用。
          </p>
        </div>
      )}
    </div>
  );
}

export function AssetStorageCredentialsPanel({
  credentials,
  providers,
}: {
  credentials: ProviderAssetStorageCredentialSummary[];
  providers: ProviderSummary[];
}) {
  const hasProviders = providers.length > 0;
  const providerOptions = hasProviders
    ? providers.map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` }))
    : [{ value: "", label: "请先创建供应商" }];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有资产存储凭证</div>
        <ManagementDialog
          trigger={<ModalButton>新建资产存储</ModalButton>}
          disabled={!hasProviders}
          title="新建资产存储"
          description="密钥会加密保存，模型配置只引用这条存储凭证。"
        >
          {({ close }) => (
            <ManagedDialogForm action={createProviderAssetStorageCredential} close={close}>
              <FormSelect label="供应商" name="providerId" options={providerOptions} disabled={!hasProviders} />
              <FormField label="名称" name="label" required disabled={!hasProviders} />
              <FormSelect
                label="存储类型"
                name="storageProvider"
                defaultValue="aliyun-oss"
                options={[{ value: "aliyun-oss", label: "Aliyun OSS" }, { value: "tencent-cos", label: "Tencent COS" }]}
                disabled={!hasProviders}
              />
              <FormField label="Bucket" name="bucket" required disabled={!hasProviders} />
              <FormField label="Region" name="region" placeholder="oss-cn-shanghai" disabled={!hasProviders} />
              <FormField label="Endpoint" name="endpoint" placeholder="https://oss-cn-shanghai.aliyuncs.com" disabled={!hasProviders} />
              <FormField label="Public Base URL" name="publicBaseUrl" placeholder="https://bucket.oss-cn-shanghai.aliyuncs.com" disabled={!hasProviders} />
              <FormField label="Access Key ID" name="accessKeyId" type="password" required disabled={!hasProviders} />
              <FormField label="Access Key Secret" name="accessKeySecret" type="password" required disabled={!hasProviders} />
              <FormTextArea label="备注" name="notes" disabled={!hasProviders} />
              <FormTextArea label="Metadata JSON" name="metadata" defaultValue="{}" disabled={!hasProviders} />
              <ActiveCheckbox name="isActive" defaultChecked disabled={!hasProviders} label="启用" />
              <div className="flex justify-end">
                <SubmitButton label="创建资产存储" disabled={!hasProviders} />
              </div>
            </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {credentials.length > 0 ? (
        credentials.map((credential) => (
          <div key={credential.id} className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md border border-[#BAE6FD] bg-[#E0F2FE] px-2 text-[11px] text-[#0369A1]">
                    {credential.storage_provider}
                  </span>
                  {credential.is_active ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-md border border-[#D7EADB] bg-[#EDF8F0] px-2 text-[11px] text-[#335D2D]">
                      <BadgeCheck className="size-3" />
                      已启用
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-black">{credential.label}</p>
                <p className="mt-1 text-xs text-black/50">{credential.providerName} · {credential.bucket}</p>
                <p className="mt-1 max-w-[520px] break-all text-xs text-black/50">
                  {credential.endpoint ?? "未填 endpoint"} · {credential.public_base_url ?? "未填 public URL"}
                </p>
                <p className="mt-1 max-w-[520px] break-all text-xs text-black/50">
                  Credential ID: <span className="select-all font-mono text-black/65">{credential.id}</span>
                </p>
                <p className="mt-1 text-xs text-black/50">
                  Key: {credential.accessKeyIdMask} / {credential.accessKeySecretMask}
                </p>
                <p className="mt-1 text-xs text-black/50">密钥更新时间：{credential.secretUpdatedLabel}</p>
                {credential.notes ? <p className="mt-2 text-xs leading-5 text-black/55">{credential.notes}</p> : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <ManagementDialog trigger={<ModalButton tone="secondary">编辑</ModalButton>} title={`编辑 ${credential.label}`}>
                  {({ close }) => (
                    <ManagedDialogForm action={updateProviderAssetStorageCredential} close={close}>
                      <input type="hidden" name="credentialId" value={credential.id} />
                      <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] px-3 py-2">
                        <p className="text-[11px] tracking-[0.35px] text-black/45">Credential ID</p>
                        <p className="mt-1 select-all break-all font-mono text-xs text-black/65">{credential.id}</p>
                      </div>
                      <FormField label="名称" name="label" defaultValue={credential.label} required />
                      <FormSelect
                        label="存储类型"
                        name="storageProvider"
                        defaultValue={credential.storage_provider}
                        options={[{ value: "aliyun-oss", label: "Aliyun OSS" }, { value: "tencent-cos", label: "Tencent COS" }]}
                      />
                      <FormField label="Bucket" name="bucket" defaultValue={credential.bucket} required />
                      <FormField label="Region" name="region" defaultValue={credential.region ?? ""} />
                      <FormField label="Endpoint" name="endpoint" defaultValue={credential.endpoint ?? ""} />
                      <FormField label="Public Base URL" name="publicBaseUrl" defaultValue={credential.public_base_url ?? ""} />
                      <FormTextArea label="备注" name="notes" defaultValue={credential.notes ?? ""} />
                      <FormTextArea label="Metadata JSON" name="metadata" defaultValue={credential.metadataText} />
                      <ActiveCheckbox name="isActive" defaultChecked={credential.is_active} label="启用" />
                      <div className="flex justify-end">
                        <SubmitButton label="保存资产存储" />
                      </div>
                    </ManagedDialogForm>
                  )}
                </ManagementDialog>
                <ManagementDialog trigger={<ModalButton tone="secondary">轮换密钥</ModalButton>} title={`轮换密钥：${credential.label}`}>
                  {({ close }) => (
                    <ManagedDialogForm action={rotateProviderAssetStorageCredentialSecret} close={close}>
                      <input type="hidden" name="credentialId" value={credential.id} />
                      <FormField label="Access Key ID" name="accessKeyId" type="password" required />
                      <FormField label="Access Key Secret" name="accessKeySecret" type="password" required />
                      <div className="flex justify-end">
                        <SubmitButton label="提交轮换" />
                      </div>
                    </ManagedDialogForm>
                  )}
                </ManagementDialog>
                <ManagementDialog trigger={<ModalButton tone="secondary">删除</ModalButton>} title={`删除 ${credential.label}`}>
                  {({ close }) => (
                    <ManagedDialogForm action={deleteProviderAssetStorageCredential} close={close}>
                      <input type="hidden" name="credentialId" value={credential.id} />
                      <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                        删除后引用这条凭证的模型会无法使用对应私有存储。
                      </div>
                      <div className="flex justify-end">
                        <SubmitButton label="删除资产存储" pendingLabel="删除中..." tone="danger" />
                      </div>
                    </ManagedDialogForm>
                  )}
                </ManagementDialog>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有资产存储凭证</p>
        </div>
      )}
    </div>
  );
}

export function ModelsPanel({
  providerModels,
  providers,
  supportedModels,
  workerTemplates,
  selectedTemplate,
}: {
  providerModels: ProviderModelSummary[];
  providers: ProviderSummary[];
  supportedModels: SupportedModelSummary[];
  workerTemplates: WorkerTemplateSummary[];
  selectedTemplate: ProviderTemplate | null;
}) {
  const hasProviders = providers.length > 0;
  const hasSupportedModels = supportedModels.length > 0;

  const supportedModelOptions = supportedModels.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
    billingConfigText: item.billingConfigText,
  }));

  const providerOptions = providers.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
  }));
  const workerTemplateOptions = workerTemplates.map((item) => ({
    id: item.id,
    displayName: item.display_name,
    slug: item.slug,
  }));
  const executionConfigPresets = providerModels.map(buildProviderModelPreset);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商模型</div>
        <ManagementDialog
          trigger={<ModalButton>新建供应商模型</ModalButton>}
          disabled={!hasProviders || !hasSupportedModels}
          title="新建供应商模型"
          description="在独立弹窗中，把可售模型映射到某个供应商的具体模型。"
          headerActions={
            <DialogFormSubmitButton formId="provider-model-form-create-models" />
          }
        >
          {({ close, openVersion }) => (
            <CreateProviderModelForm
              key={`create-provider-model-form-models-tab-${openVersion}`}
              supportedModels={supportedModelOptions}
              providers={providerOptions}
              workerTemplates={workerTemplateOptions}
              executionConfigPresets={executionConfigPresets}
              defaultSupportedModelSlug="openoctopus/gemini-2.5-flash-image"
              defaultUpstreamModelSlug={selectedTemplate?.providerModel.upstreamModelSlug}
              defaultPricing={selectedTemplate?.providerModel.pricing}
              formId="provider-model-form-create-models"
              showSubmitButton={false}
              disabled={!hasProviders || !hasSupportedModels}
              className="grid gap-4"
              onSuccess={close}
            />
          )}
        </ManagementDialog>
      </div>

      <div className="rounded-2xl border border-[#BAE6FD] bg-[#F0F9FF] px-4 py-3 text-sm text-[#0369A1] shadow-sm">
        这里维护的是供应商真实成本和供应商模型，不是用户售价。用户售价请去“可售模型”里改。
      </div>

      {providerModels.length > 0 ? (
        providerModels.map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md border border-[#BAE6FD] bg-[#E0F2FE] px-2 text-[11px] text-[#0369A1]">
                    {item.capability === "image_generation" ? "图片生成" : item.capability === "image_edit" ? "图片编辑" : item.capability === "image_recognition" ? "图片识别" : item.capability === "document_analysis" ? "文档分析" : item.capability === "text_generation" ? "对话生成" : "视频生成"}
                  </span>
                  <span className="text-sm font-medium text-black">{item.providerName}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{item.public_model_slug}</p>
                <p className="mt-1 text-xs text-black/50">可售模型：{item.supportedModelName}</p>
                <p className="mt-1 text-xs text-black/50">上游模型：{item.upstream_model_slug}</p>
                <p className="mt-1 text-xs text-[#8a5b12]">
                  这里的价格 = 供应商成本；用户售价不在这里改。
                </p>
              </div>

              <ManagementDialog
                trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                title={`编辑 ${item.upstream_model_slug}`}
                description="在独立弹窗中编辑这个供应商模型。"
                headerActions={
                  <DialogFormSubmitButton formId={`provider-model-form-models-${item.id}`} />
                }
              >
                {({ close }) => (
                  <CreateProviderModelForm
                    action={updateProviderModelDetails}
                    providerModelId={item.id}
                    supportedModels={supportedModelOptions}
                    providers={providerOptions}
                    workerTemplates={workerTemplateOptions}
                    executionConfigPresets={executionConfigPresets.filter((preset) => preset.id !== item.id)}
                    defaultSupportedModelSlug={item.public_model_slug}
                    defaultProviderId={item.provider_id}
                    defaultUpstreamModelSlug={item.upstream_model_slug}
                    defaultPricing={item.pricingText}
                    defaultInputSchema={item.inputSchemaText}
                    defaultOutputSchema={item.outputSchemaText}
                    defaultExecutionTemplate={item.executionTemplate}
                    defaultExecutionConfig={item.executionConfigText}
                    defaultActive={item.active}
                    formId={`provider-model-form-models-${item.id}`}
                    showSubmitButton={false}
                    disabled={!hasProviders || !hasSupportedModels}
                    className="grid gap-4"
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-black/55 xl:grid-cols-3">
              <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">成本配置</p>
                <p className="mt-2 text-sm font-medium text-black">{item.pricingSummary}</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap">{item.pricingText}</pre>
              </div>
              <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">成本来源字段</p>
                <p className="mt-2 text-sm text-black/45">已移除</p>
              </div>
              <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">证据字段</p>
                <p className="mt-2 text-sm text-black/45">已移除</p>
              </div>
            </div>
            <RuntimeDiagnostics diagnostics={item.runtimeDiagnostics} />
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有供应商模型</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            创建供应商后，在这里补齐真实上游模型标识和成本配置。
          </p>
        </div>
      )}
    </div>
  );
}

export function InternalModelAiUsageLogsPanel({
  logs,
  pagination,
}: {
  logs: InternalModelAiUsageLogSummary[];
  pagination?: PaginationSummary;
}) {
  const totalCost = logs.reduce((sum, row) => sum + Number(row.estimatedCostUsd ?? 0), 0);
  const succeeded = logs.filter((row) => row.status === "succeeded").length;
  const failed = logs.filter((row) => row.status === "failed").length;
  const page = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? 1;
  const totalCount = pagination?.totalCount ?? logs.length;
  const pageSize = pagination?.pageSize ?? 10;
  const pageStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const pageEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-[#BAE6FD] bg-white p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/45">总调用次数</p>
          <p className="mt-1 text-lg font-semibold text-black">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-[#BAE6FD] bg-white p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/45">成功 / 失败</p>
          <p className="mt-1 text-lg font-semibold text-black">{succeeded} / {failed}</p>
        </div>
        <div className="rounded-xl border border-[#BAE6FD] bg-white p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/45">估算成本（USD）</p>
          <p className="mt-1 text-lg font-semibold text-black">${totalCost.toFixed(6)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
        <table className="min-w-[1180px] border-separate border-spacing-0 text-left text-sm">
          <thead>
            <tr className="text-xs text-black/50">
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">时间</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">状态</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">模型</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">来源 URL</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">Tokens (In/Out/Total)</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">延迟</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">估算成本</th>
              <th className="border-b border-[#BAE6FD] px-3 py-2.5">错误信息</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-black/45">
                  暂无内部 AI 消费记录
                </td>
              </tr>
            ) : (
              logs.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5 text-xs text-black/65">{row.createdLabel}</td>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5">
                    <span
                      className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                        row.status === "succeeded"
                          ? "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]"
                          : "border-[#F1D2CC] bg-[#FFF7F5] text-[#8D4336]"
                      }`}
                    >
                      {row.status === "succeeded" ? "成功" : "失败"}
                    </span>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5 text-xs text-black/65">{row.model}</td>
                  <td className="max-w-[360px] border-b border-[#DDF4FF] px-3 py-2.5">
                    <a
                      href={row.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="line-clamp-2 text-xs text-[#355fb4] underline-offset-2 hover:underline"
                    >
                      {row.source_url}
                    </a>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5 font-mono text-xs text-black/65">
                    {row.inputTokens} / {row.outputTokens} / {row.totalTokens}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5 text-xs text-black/65">{row.latencyMs} ms</td>
                  <td className="border-b border-[#DDF4FF] px-3 py-2.5 text-xs text-black/65">
                    ${Number(row.estimatedCostUsd ?? 0).toFixed(6)}
                  </td>
                  <td className="max-w-[340px] break-all border-b border-[#DDF4FF] px-3 py-2.5 text-xs text-[#8D4336]">
                    {row.error_message ?? "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-[#DDF4FF] bg-white px-4 py-3">
        <p className="text-xs text-black/45">
          Showing {pageStart}-{pageEnd} of {totalCount}
        </p>
        <div className="flex items-center gap-2">
          <a
            aria-disabled={page <= 1}
            href={`/ops-hub?tab=internal-model-ai-usage-logs&aiUsagePage=${Math.max(1, page - 1)}`}
            className={`h-8 rounded-md border border-[#BAE6FD] bg-white px-3 py-2 text-xs text-black/65 ${
              page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-[#E0F2FE]"
            }`}
          >
            Previous
          </a>
          <a
            aria-disabled={page >= totalPages}
            href={`/ops-hub?tab=internal-model-ai-usage-logs&aiUsagePage=${Math.min(totalPages, page + 1)}`}
            className={`h-8 rounded-md border border-[#BAE6FD] bg-white px-3 py-2 text-xs text-black/65 ${
              page >= totalPages ? "pointer-events-none opacity-40" : "hover:bg-[#E0F2FE]"
            }`}
          >
            Next
          </a>
        </div>
      </div>
    </div>
  );
}

export function RoutesPanel({
  routingRules,
  providerModels,
  supportedModels,
}: {
  routingRules: RoutingRuleSummary[];
  providerModels: ProviderModelSummary[];
  supportedModels: SupportedModelSummary[];
}) {
  const hasProviderModels = providerModels.length > 0;
  const hasSupportedModels = supportedModels.length > 0;
  const supportedModelOptions = supportedModels.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
    billingConfigText: item.billingConfigText,
  }));
  const providerModelOptions = providerModels.map((item) => ({
    id: item.id,
    supportedModelId: item.supported_model_id,
    supportedModelName: item.supportedModelName,
    providerName: item.providerName,
    upstreamModelSlug: item.upstream_model_slug,
    capability: item.capability,
  }));

  return (
    <div className="space-y-4">
      {routingRules.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[#BAE6FD] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">可售模型</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">能力</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">范围</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">主路由</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">回退路由</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">策略</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">状态</th>
                <th className="border-b border-[#BAE6FD] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {routingRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                    <p className="text-sm font-medium text-black">{rule.public_model_slug}</p>
                    <RuntimeDiagnostics diagnostics={rule.runtimeDiagnostics} />
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.capability}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.scopeLabel}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.primaryLabel}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.fallbackLabel}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.route_strategy}
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                    <span
                      className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                        rule.active
                          ? "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]"
                          : "border-[#BAE6FD] bg-[#F8FCFF] text-black/60"
                      } whitespace-nowrap`}
                    >
                      {rule.active ? "已启用" : "未启用"}
                    </span>
                  </td>
                  <td className="border-b border-[#DDF4FF] px-3 py-3 align-middle">
                    <div className="flex flex-wrap gap-2">
                      <ManagementDialog
                        trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                        title={`编辑路由：${rule.public_model_slug}`}
                        description="在独立弹窗中编辑这个路由。"
                      >
                        {({ close }) => (
                          <CreateRoutingRuleForm
                            action={updateRoutingRule}
                            routingRuleId={rule.id}
                            supportedModels={supportedModelOptions}
                            providerModels={providerModelOptions}
                            defaultSupportedModelId={rule.supportedModelId ?? undefined}
                            defaultPrimaryProviderModelId={rule.primary_provider_model_id}
                            defaultFallbackProviderModelId={rule.fallback_provider_model_id ?? ""}
                            defaultStrategy={rule.route_strategy}
                            defaultWorkspaceScope={rule.scopeLabel}
                            defaultActive={rule.active}
                            disabled={!hasProviderModels || !hasSupportedModels}
                            submitLabel="保存路由"
                            className="grid gap-4"
                            allowWorkspaceScope={false}
                            onSuccess={close}
                          />
                        )}
                      </ManagementDialog>
                      <ManagementDialog
                        trigger={<ModalButton tone="secondary">删除</ModalButton>}
                        title={`删除路由：${rule.public_model_slug}`}
                        description="确认删除该路由规则。删除后不可恢复。"
                      >
                        {({ close }) => (
                          <ManagedDialogForm action={deleteRoutingRule} close={close}>
                            <input type="hidden" name="routingRuleId" value={rule.id} />
                            <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                              删除后该模型将失去这条路由规则。
                            </div>
                            <div className="flex justify-end">
                              <SubmitButton label="确认删除" pendingLabel="删除中..." tone="danger" />
                            </div>
                          </ManagedDialogForm>
                        )}
                      </ManagementDialog>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有路由</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            至少要先有一个真实供应商模型，才能创建路由。
          </p>
        </div>
      )}
    </div>
  );
}

export function CreateRoutingRuleButton({
  providerModels,
  supportedModels,
  selectedTemplate,
}: {
  providerModels: ProviderModelSummary[];
  supportedModels: SupportedModelSummary[];
  selectedTemplate: ProviderTemplate | null;
}) {
  const hasProviderModels = providerModels.length > 0;
  const hasSupportedModels = supportedModels.length > 0;
  const supportedModelOptions = supportedModels.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
    billingConfigText: item.billingConfigText,
  }));
  const providerModelOptions = providerModels.map((item) => ({
    id: item.id,
    supportedModelId: item.supported_model_id,
    supportedModelName: item.supportedModelName,
    providerName: item.providerName,
    upstreamModelSlug: item.upstream_model_slug,
    capability: item.capability,
  }));

  return (
    <ManagementDialog
      trigger={<ModalButton>新建路由</ModalButton>}
      disabled={!hasProviderModels || !hasSupportedModels}
      title="新建路由规则"
      description="在弹窗中创建新路由，避免与现有线上路由记录混在一起。"
    >
      {({ close }) => (
        <CreateRoutingRuleForm
          supportedModels={supportedModelOptions}
          providerModels={providerModelOptions}
          defaultStrategy={selectedTemplate?.route.routeStrategy}
          defaultWorkspaceScope={selectedTemplate?.route.workspaceScope}
          disabled={!hasProviderModels || !hasSupportedModels}
          className="grid gap-4"
          allowWorkspaceScope={false}
          onSuccess={close}
        />
      )}
    </ManagementDialog>
  );
}
