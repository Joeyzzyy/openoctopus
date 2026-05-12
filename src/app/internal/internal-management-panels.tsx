"use client";
import { Fragment, useEffect, useState } from "react";
import { BadgeCheck, CircleAlert } from "lucide-react";
import { deriveLegacyBillingFields, parseBillingConfig } from "@/lib/billing-config";
import {
  createModelVendor,
  createProvider,
  deleteProvider,
  createProviderCredential,
  createProviderModel,
  createSupportedModel,
  deleteSupportedModel,
  deleteModelVendor,
  deleteProviderCredential,
  deleteProviderModel,
  deleteRoutingRule,
  rotateProviderCredentialSecret,
  updateProvider,
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
import { useFormStatus } from "react-dom";

type CapabilityOption = { value: string; label: string };
type ProviderStatusOption = { value: string; label: string };

type SupportedModelSummary = {
  id: string;
  provider: string;
  model_slug: string;
  display_name: string;
  modality: "image" | "video" | "audio";
  capability: "image_generation" | "image_edit" | "video_generation" | null;
  active: boolean;
  createdLabel: string;
  billingConfigText: string;
  billingSummary: string;
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

type ProviderSummary = {
  id: string;
  name: string;
  slug: string;
  base_url: string | null;
  status: "healthy" | "degraded" | "offline";
  regionsLabel: string;
  regions: string[] | null;
  credentialCount: number;
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

type ProviderModelSummary = {
  id: string;
  provider_id: string;
  providerName: string;
  providerSlug: string;
  supported_model_id: string | null;
  supportedModelName: string;
  public_model_slug: string;
  upstream_model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
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
  runtimeDiagnostics: string[];
};

type RoutingRuleSummary = {
  id: string;
  supportedModelId: string | null;
  public_model_slug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
  primary_provider_model_id: string;
  fallback_provider_model_id: string | null;
  route_strategy: string;
  active: boolean;
  scopeLabel: string;
  primaryLabel: string;
  fallbackLabel: string;
  runtimeDiagnostics: string[];
};

const formInputClassName =
  "h-10 w-full rounded-md border border-black/[0.08] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formTextAreaClassName =
  "w-full rounded-md border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formSelectClassName =
  "h-10 w-full rounded-md border border-black/[0.08] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

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

function readModelDescriptionFromBillingConfig(configText: string) {
  try {
    const parsed = JSON.parse(configText) as Record<string, unknown>;
    const metadata =
      parsed.metadata && typeof parsed.metadata === "object" && !Array.isArray(parsed.metadata)
        ? (parsed.metadata as Record<string, unknown>)
        : null;
    return typeof metadata?.modelDescription === "string" ? metadata.modelDescription : "";
  } catch {
    return "";
  }
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
  const statusPath = typeof config?.statusPath === "string" ? config.statusPath.trim() : "";
  const resultValueType = typeof config?.resultValueType === "string" ? config.resultValueType.trim() : "";
  const resultMimeType = typeof config?.resultMimeType === "string" ? config.resultMimeType.trim() : "";
  if (!submitPath) diagnostics.push("缺少 submitPath");
  if (!taskIdPath) diagnostics.push("缺少 taskIdPath");
  if (!resultUrlPath) diagnostics.push("缺少 resultUrlPath");
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
        </>
      ) : null}
      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
          结果 URL 路径 resultUrlPath
        </span>
        <input
          name="templateResultUrlPath"
          value={state.resultUrlPath}
          onChange={(event) =>
            setState((current) => ({ ...current, resultUrlPath: event.target.value }))
          }
          placeholder="result.url"
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
      <div className="rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-3">
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
  tone?: "default" | "secondary";
}) {
  return (
    <span
      className={
        tone === "secondary"
          ? "inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
          : "inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md bg-[#111827] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0B1220]"
      }
    >
      {children}
    </span>
  );
}

function ManagementDialog({
  trigger,
  title,
  description,
  disabled = false,
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  disabled?: boolean;
  children: React.ReactNode | ((controls: { close: () => void }) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger disabled={disabled}>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-0 shadow-[0_30px_80px_rgba(17,24,39,0.12)] sm:max-w-3xl">
        <DialogHeader className="border-b border-black/[0.08] px-5 pb-4 pt-5">
          <DialogTitle className="font-medium text-black">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-black/55">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="px-5 pb-5 pt-5">
          {typeof children === "function"
            ? (children as (controls: { close: () => void }) => React.ReactNode)({
                close: () => setOpen(false),
              })
            : children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AutoCloseWatcher({
  submitted,
  close,
}: {
  submitted: boolean;
  close: () => void;
}) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (submitted && !pending) {
      close();
    }
  }, [close, pending, submitted]);

  return null;
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
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      action={action}
      className={className}
      onSubmit={() => {
        setSubmitted(true);
      }}
    >
      <AutoCloseWatcher submitted={submitted} close={close} />
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  help?: string;
  type?: "text" | "password";
}) {
  return (
    <label className="block">
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
}: {
  label: string;
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
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

function FormSelect({
  label,
  name,
  options,
  defaultValue,
  disabled = false,
  help,
}: {
  label: string;
  name: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  disabled?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
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
    <label className="flex items-center gap-3 rounded-md border border-black/[0.08] bg-white px-3 py-3 text-sm text-black/72">
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
  providerModels = [],
  providers = [],
  workerTemplates = [],
  modelVendors = [],
  capabilityOptions,
}: {
  models: SupportedModelSummary[];
  providerModels?: ProviderModelSummary[];
  providers?: ProviderSummary[];
  workerTemplates?: WorkerTemplateSummary[];
  modelVendors?: ModelVendorSummary[];
  capabilityOptions: readonly CapabilityOption[];
}) {
  const safeModelVendors = Array.isArray(modelVendors) ? modelVendors : [];
  const safeProviderModels = Array.isArray(providerModels) ? providerModels : [];
  const safeProviders = Array.isArray(providers) ? providers : [];
  const safeWorkerTemplates = Array.isArray(workerTemplates) ? workerTemplates : [];
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
  }));
  const executionConfigPresets = safeProviderModels.map((item) => ({
    id: item.id,
    label: `${item.supportedModelName} / ${item.providerName} / ${item.upstream_model_slug}`,
    executionTemplate: item.executionTemplate,
    executionConfigText: item.executionConfigText,
  }));
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
    return "音频";
  };
  const capabilityLabel = (value: SupportedModelSummary["capability"]) => {
    if (value === "image_generation") return "图片生成";
    if (value === "image_edit") return "图片编辑";
    if (value === "video_generation") return "视频生成";
    return "未设置";
  };

  return (
    <div className="space-y-4">
      {models.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.06] bg-white shadow-sm">
          <table className="min-w-[2160px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-[#FCFCFA] text-xs text-black/45">
                <th className="min-w-[220px] border-b border-black/[0.06] px-3 py-2.5">可售模型Slug</th>
                <th className="min-w-[140px] border-b border-black/[0.06] px-3 py-2.5">显示名称</th>
                <th className="min-w-[120px] border-b border-black/[0.06] px-3 py-2.5">厂商</th>
                <th className="min-w-[90px] border-b border-black/[0.06] px-3 py-2.5">模态</th>
                <th className="min-w-[120px] border-b border-black/[0.06] px-3 py-2.5">能力类型</th>
                <th className="min-w-[130px] border-b border-black/[0.06] px-3 py-2.5">添加时间</th>
                <th className="min-w-[200px] border-b border-black/[0.06] px-3 py-2.5">计费摘要</th>
                <th className="sticky right-0 z-10 min-w-[220px] border-b border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5 shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.16)]">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <Fragment key={model.id}>
                  <tr>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle font-mono text-xs text-black/72">{model.model_slug}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-sm font-medium text-black">{model.display_name}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-xs text-black/60">{model.provider}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-xs text-black/60">{modalityLabel(model.modality)}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-xs text-black/60">{model.capability ? capabilityLabel(model.capability) : "-"}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-xs text-black/60">{model.createdLabel}</td>
                    <td className="border-b border-black/[0.05] px-3 py-3 align-middle text-xs text-black/60">{model.billingSummary}</td>
                    <td className="sticky right-0 z-10 min-w-[220px] border-b border-black/[0.05] bg-white px-3 py-3 align-middle shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.16)]">
                      <div className="flex flex-wrap items-center gap-2">
                      <form action={updateSupportedModelState}>
                        <input type="hidden" name="supportedModelId" value={model.id} />
                        <input type="hidden" name="active" value={model.active ? "false" : "true"} />
                        <button
                          type="submit"
                          className={`inline-flex h-7 min-w-[64px] items-center justify-center rounded-md border px-2 text-[11px] font-medium transition-colors ${
                            model.active
                              ? "border-[#9CC9A5] bg-[#EAF7ED] text-[#2F7A3E] hover:bg-[#def0e3]"
                              : "border-black/[0.14] bg-[#F2F2F1] text-black/70 hover:bg-[#ebebea]"
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
                        <ManagedDialogForm action={updateSupportedModelDetails} close={close}>
                          <input type="hidden" name="supportedModelId" value={model.id} />
                          <input type="hidden" name="active" value="true" />
                          <FormSelect
                            label="模型厂商（内部分类）"
                            name="provider"
                            defaultValue={model.provider}
                            options={vendorOptions}
                          />
                          <FormField label="可售模型 Slug" name="modelSlug" defaultValue={model.model_slug} required />
                          <FormField label="显示名称" name="displayName" defaultValue={model.display_name} required />
                          <FormTextArea
                            label="模型介绍"
                            name="modelDescription"
                            defaultValue={readModelDescriptionFromBillingConfig(model.billingConfigText)}
                            placeholder="用于对外展示的模型简介，例如适用场景、风格、速度与质量特点。"
                            help="可选。会随模型配置保存。"
                          />
                          <FormSelect
                            label="模态"
                            name="modality"
                            defaultValue={model.modality}
                            options={[
                              { value: "image", label: "图片" },
                              { value: "video", label: "视频" },
                              { value: "audio", label: "音频" },
                            ]}
                          />
                          <FormSelect
                            label="能力类型"
                            name="capability"
                            defaultValue={model.capability ?? "image_generation"}
                            options={[...capabilityOptions]}
                          />
                          <BillingConfigEditor initialValue={model.billingConfigText} />
                          <div className="flex justify-end">
                            <SubmitButton label="保存可售模型" />
                          </div>
                        </ManagedDialogForm>
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
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={8} className="border-b border-black/[0.05] bg-[#FAFAF9] px-3 py-2.5">
                      {(() => {
                        const mappings = providerModelsBySupportedModelId.get(model.id) ?? [];
                        if (mappings.length === 0) {
                          return <p className="text-xs text-black/45">供应商模型映射：暂无</p>;
                        }
                        return (
                          <div className="overflow-x-auto rounded-md border border-black/[0.06] bg-white">
                            <table className="min-w-[760px] w-full text-[11px]">
                              <thead>
                                <tr className="border-b border-black/[0.06] bg-[#FCFCFA] text-black/45">
                                  <th className="px-2 py-1.5 text-left font-medium">供应商</th>
                                  <th className="px-2 py-1.5 text-left font-medium">上游模型</th>
                                  <th className="px-2 py-1.5 text-left font-medium">成本</th>
                                  <th className="px-2 py-1.5 text-left font-medium">状态</th>
                                  <th className="px-2 py-1.5 text-left font-medium">操作</th>
                                </tr>
                              </thead>
                              <tbody>
                                {mappings.map((mapping) => (
                                  <tr key={mapping.id} className="border-b border-black/[0.05] last:border-b-0">
                                    <td className="px-2 py-1.5 text-black/75">{mapping.providerName}</td>
                                    <td className="px-2 py-1.5 font-mono text-black/70">{mapping.upstream_model_slug}</td>
                                    <td className="px-2 py-1.5 text-black/70">{mapping.pricingSummary}</td>
                                    <td className="px-2 py-1.5 text-black/60">{mapping.active ? "已启用" : "未启用"}</td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-2">
                                        <ManagementDialog
                                          trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                                          title={`编辑映射 ${mapping.supportedModelName} / ${mapping.providerName}`}
                                          description=" "
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
                                              defaultPricingSourceUrl={mapping.pricingSourceUrl ?? undefined}
                                              defaultPricingSourceNote={mapping.pricingSourceNote ?? undefined}
                                              defaultPricingSourceEvidence={JSON.stringify(mapping.pricingSourceEvidence)}
                                              defaultInputSchema={mapping.inputSchemaText}
                                              defaultOutputSchema={mapping.outputSchemaText}
                                              defaultExecutionTemplate={mapping.executionTemplate}
                                              defaultExecutionConfig={mapping.executionConfigText}
                                              defaultActive={mapping.active}
                                              submitLabel="保存供应商模型"
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
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-black/[0.08] px-3 py-2.5">模型厂商</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">创建时间</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {vendorRows.map((vendor) => (
                <tr key={vendor.id}>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-sm text-black">{vendor.name}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{vendor.createdLabel}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
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
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
  modelVendors = [],
  models = [],
}: {
  capabilityOptions: readonly CapabilityOption[];
  modelVendors?: ModelVendorSummary[];
  models?: SupportedModelSummary[];
}) {
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

  return (
    <ManagementDialog
      trigger={<ModalButton>新建</ModalButton>}
      title="新建可售模型"
      description="在独立弹窗中创建新的客户侧模型定义。"
    >
      {({ close }) => (
      <ManagedDialogForm action={createSupportedModel} close={close}>
        <FormSelect
          label="模型厂商（内部分类）"
          name="provider"
          options={vendorOptions}
          defaultValue="Google"
          help="用于内部分类和测算分组，例如 Google、OpenAI、Anthropic。"
        />
        <FormField label="可售模型 Slug" name="modelSlug" defaultValue="openoctopus/gemini-2.5-flash-image" required />
        <FormField label="显示名称" name="displayName" defaultValue="Gemini Image" required />
        <FormTextArea
          label="模型介绍"
          name="modelDescription"
          placeholder="用于对外展示的模型简介，例如适用场景、风格、速度与质量特点。"
          help="可选。会随模型配置保存。"
        />
        <FormSelect
          label="模态"
          name="modality"
          options={[
            { value: "image", label: "图片" },
            { value: "video", label: "视频" },
            { value: "audio", label: "音频" },
          ]}
        />
        <FormSelect
          label="能力类型"
          name="capability"
          options={[...capabilityOptions]}
          defaultValue="image_generation"
        />
        <BillingConfigEditor
          initialValue={'{"billingMode":"hybrid","currency":"USD","charges":{"perImage":0.039,"inputTextTokensPerMillion":0.30}}'}
        />
        <input type="hidden" name="active" value="true" />
        <div className="flex justify-end">
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
  }));
  const providerOptions = safeProviders.map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
  }));
  const executionConfigPresets = safeProviderModels.map((item) => ({
    id: item.id,
    label: `${item.supportedModelName} / ${item.providerName} / ${item.upstream_model_slug}`,
    executionTemplate: item.executionTemplate,
    executionConfigText: item.executionConfigText,
  }));

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
              <section key={providerId} className="rounded-2xl border border-black/[0.08] bg-white shadow-sm">
                <div className="border-b border-black/[0.08] bg-[#F3F7FF] px-4 py-3 text-sm font-semibold text-[#355FB4]">
                  供应商：{providerGroup.providerName}
                </div>
                <div className="space-y-4 p-3">
                  {Array.from(providerGroup.vendors.entries()).map(([vendor, vendorRows]) => (
                    <div key={`${providerId}-${vendor}`} className="rounded-xl border border-black/[0.06]">
                      <div className="border-b border-black/[0.06] bg-[#FCFCFA] px-3 py-2 text-xs font-medium text-black/70">
                        模型公司：{vendor}
                      </div>
                      <div className="overflow-x-auto">
                        <table className="min-w-[1860px] border-separate border-spacing-0 text-left text-sm">
                          <thead>
                            <tr className="text-xs text-black/50">
                              <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">可售模型</th>
                              <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">模型 Slug</th>
                              <th className="w-[140px] border-b border-black/[0.08] px-3 py-2.5">能力</th>
                              <th className="w-[210px] border-b border-black/[0.08] px-3 py-2.5">参数文档</th>
                              <th className="w-[240px] border-b border-black/[0.08] px-3 py-2.5">售价</th>
                              <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">成本</th>
                              <th className="w-[130px] border-b border-black/[0.08] px-3 py-2.5">标准利润</th>
                              <th className="w-[130px] border-b border-black/[0.08] px-3 py-2.5">来源证据</th>
                              <th className="w-[110px] border-b border-black/[0.08] px-3 py-2.5">状态</th>
                              <th className="sticky right-0 z-10 w-[180px] border-b border-black/[0.08] bg-white px-3 py-2.5 shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.28)]">
                                操作
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {vendorRows.map((row) => (
                              <tr key={row.providerModel.id}>
                                <td className="w-[290px] border-b border-black/[0.06] px-3 py-3 align-top">
                                  <p className="text-sm font-medium text-black">{row.supportedModel.display_name}</p>
                                </td>
                                <td className="w-[290px] border-b border-black/[0.06] px-3 py-3 align-top">
                                  <p className="font-mono text-xs text-black/70">{row.supportedModel.model_slug}</p>
                                </td>
                                <td className="w-[140px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                                  {row.providerModel.capability}
                                </td>
                                <td className="w-[210px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                                  <p>{summarizeInputSchema(row.providerModel.inputSchemaText)}</p>
                                  {readSchemaDocUrl(row.providerModel.inputSchemaText) ? (
                                    <a
                                      href={readSchemaDocUrl(row.providerModel.inputSchemaText) ?? ""}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-flex text-[11px] text-[#355FB4] underline-offset-2 hover:underline"
                                    >
                                      官方参数文档
                                    </a>
                                  ) : (
                                    <p className="mt-1 text-[11px] text-black/45">未填官方文档链接</p>
                                  )}
                                </td>
                                <td className="w-[240px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{row.supportedModel.billingSummary}</td>
                                <td className="w-[290px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                                  <p>{row.providerModel.pricingSummary}</p>
                                  {row.providerModel.pricingSourceUrl ? (
                                    <a
                                      href={row.providerModel.pricingSourceUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="mt-1 inline-flex text-[11px] text-[#355FB4] underline-offset-2 hover:underline"
                                    >
                                      官方价格链接
                                    </a>
                                  ) : null}
                                </td>
                                <td className="w-[130px] border-b border-black/[0.06] px-3 py-3 align-top">
                                  {row.margin === null ? (
                                    <p className="text-xs text-black/45">口径不一致</p>
                                  ) : (
                                    <p className={`text-sm font-medium ${row.margin >= 0 ? "text-[#335D2D]" : "text-[#b54432]"}`}>
                                      {formatCurrency(row.margin)}
                                    </p>
                                  )}
                                </td>
                                <td className="w-[130px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                                  <p>截图：{row.providerModel.pricingSourceEvidence.length}</p>
                                  <p className="mt-1">备注：{row.providerModel.pricingSourceNote ? "有" : "无"}</p>
                                </td>
                                <td className="w-[110px] border-b border-black/[0.06] px-3 py-3 align-top">
                                  <span
                                    className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                                      row.providerModel.active
                                        ? "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]"
                                        : "border-black/[0.08] bg-[#FCFCFA] text-black/60"
                                    }`}
                                  >
                                    {row.providerModel.active ? "已启用" : "未启用"}
                                  </span>
                                </td>
                                <td className="sticky right-0 z-10 w-[180px] border-b border-black/[0.06] bg-white px-3 py-3 align-top shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.28)]">
                                  <div className="flex flex-wrap gap-2">
                              <ManagementDialog
                                trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                                title={`编辑 ${row.supportedModel.display_name} / ${row.providerModel.providerName}`}
                                description=" "
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
                                    defaultPricingSourceUrl={row.providerModel.pricingSourceUrl ?? undefined}
                                    defaultPricingSourceNote={row.providerModel.pricingSourceNote ?? undefined}
                                    defaultPricingSourceEvidence={JSON.stringify(row.providerModel.pricingSourceEvidence)}
                                    defaultInputSchema={row.providerModel.inputSchemaText}
                                    defaultOutputSchema={row.providerModel.outputSchemaText}
                                    defaultExecutionTemplate={row.providerModel.executionTemplate}
                                    defaultExecutionConfig={row.providerModel.executionConfigText}
                                    defaultActive={row.providerModel.active}
                                    submitLabel="保存供应商模型"
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
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-[1400px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="w-[16%] border-b border-black/[0.08] px-3 py-2.5">显示名称</th>
                <th className="w-[16%] border-b border-black/[0.08] px-3 py-2.5">模板标识</th>
                <th className="w-[8%] border-b border-black/[0.08] px-3 py-2.5">模式</th>
                <th className="w-[13%] border-b border-black/[0.08] px-3 py-2.5">说明</th>
                <th className="w-[16%] border-b border-black/[0.08] px-3 py-2.5">可售模型</th>
                <th className="w-[16%] border-b border-black/[0.08] px-3 py-2.5">上游模型</th>
                <th className="w-[15%] border-b border-black/[0.08] px-3 py-2.5">关联供应商</th>
                <th className="w-[10%] border-b border-black/[0.08] px-3 py-2.5">引用状态</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-sm text-black">
                    <p>{row.displayName}</p>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/55">
                    {row.slug}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/65">
                    {row.modeLabel}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs">
                    <span className="text-black/65">
                      {row.modeLabel === "任务轮询" ? "提交后轮询获取结果" : "请求成功后直接返回结果"}
                    </span>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
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
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
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
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{row.providersLabel}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {row.providerModelCount > 0 ? `${row.providerModelCount} 个模型` : "未引用"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有可用模板</p>
        </div>
      )}

    </div>
  );
}

export function CreateProviderModelMappingButton({
  supportedModels,
  providers,
  workerTemplates,
  providerModels = [],
}: {
  supportedModels: SupportedModelSummary[];
  providers: ProviderSummary[];
  workerTemplates: WorkerTemplateSummary[];
  providerModels?: ProviderModelSummary[];
}) {
  const hasProviders = providers.length > 0;
  const hasSupportedModels = supportedModels.length > 0;
  const supportedModelOptions = supportedModels.map((item) => ({
    id: item.id,
    modelSlug: item.model_slug,
    displayName: item.display_name,
    capability: item.capability,
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
  const executionConfigPresets = providerModels.map((item) => ({
    id: item.id,
    label: `${item.supportedModelName} / ${item.providerName} / ${item.upstream_model_slug}`,
    executionTemplate: item.executionTemplate,
    executionConfigText: item.executionConfigText,
  }));

  return (
    <ManagementDialog
      trigger={<ModalButton>新建供应商模型映射</ModalButton>}
      disabled={!hasProviders || !hasSupportedModels}
      title="新建供应商模型映射"
      description="先选择可售模型与供应商，再填写执行协议配置和成本配置。"
    >
      {({ close }) => (
        <CreateProviderModelForm
          action={createProviderModel}
          supportedModels={supportedModelOptions}
          providers={providerOptions}
          workerTemplates={workerTemplateOptions}
          executionConfigPresets={executionConfigPresets}
          disabled={!hasProviders || !hasSupportedModels}
          className="grid gap-4"
          onSuccess={close}
        />
      )}
    </ManagementDialog>
  );
}

export function ProvidersPanel({
  providers,
  credentials,
  providerStatusOptions,
}: {
  providers: ProviderSummary[];
  credentials: ProviderCredentialSummary[];
  providerStatusOptions: readonly ProviderStatusOption[];
}) {
  const statusToneClassName = (status: ProviderSummary["status"]) => {
    if (status === "healthy") {
      return "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]";
    }
    if (status === "degraded") {
      return "border-[#F2E4BF] bg-[#FCF6E6] text-[#8B6A1A]";
    }
    return "border-[#F1D2CC] bg-[#FFF7F5] text-[#8D4336]";
  };

  return (
    <div className="space-y-4">
      {providers.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-black/[0.08] px-3 py-2.5">供应商</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">基础 URL</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">状态</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">区域</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">模型</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">密钥数</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {providers.map((provider) => {
                const providerCredentials = credentials.filter((item) => item.provider_id === provider.id);

                return (
                <tr key={provider.id}>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                      <p className="text-sm font-medium text-black">{provider.name}</p>
                      <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                      <RuntimeDiagnostics diagnostics={provider.runtimeDiagnostics} />
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                      <p className="max-w-[320px] break-all text-xs text-black/60">{provider.base_url ?? "未填写"}</p>
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                      <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${statusToneClassName(provider.status)}`}>
                        {provider.status === "healthy" ? "健康" : provider.status === "degraded" ? "降级" : "离线"}
                      </span>
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{provider.regionsLabel}</td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                      {provider.activeModelCount}/{provider.modelCount}
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">{provider.credentialCount}</td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                      <div className="flex flex-wrap gap-2">
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary">编辑</ModalButton>}
                          title="编辑"
                        >
                          {({ close }) => (
                            <ManagedDialogForm action={updateProvider} close={close}>
                              <input type="hidden" name="providerId" value={provider.id} />
                              <FormField label="名称" name="name" defaultValue={provider.name} required />
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
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
          <div key={credential.id} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md border border-[#E9E1CF] bg-[#F6F1E7] px-2 text-[11px] text-[#6F5B27]">
                    {credential.environment}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-md border border-[#D8E4F8] bg-[#F3F7FF] px-2 text-[11px] text-[#355FB4]">
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
                    className="inline-flex h-9 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
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
                  disabled={credential.is_active}
                  title={`删除 ${credential.label}`}
                  description="确认是否删除这个未启用的供应商密钥。"
                >
                  {({ close }) => (
                  <ManagedDialogForm action={deleteProviderCredential} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <div className="rounded-xl border border-[#F1D2CC] bg-[#FFF7F5] px-4 py-3 text-sm text-[#8D4336]">
                      这个操作会永久删除供应商密钥记录。必须先停用后才能删除。
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton
                        label="删除供应商密钥"
                        pendingLabel="删除中..."
                        disabled={credential.is_active}
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
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有供应商密钥</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            创建供应商后，在这里登记真实的密钥引用。
          </p>
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
  const executionConfigPresets = providerModels.map((item) => ({
    id: item.id,
    label: `${item.supportedModelName} / ${item.providerName} / ${item.upstream_model_slug}`,
    executionTemplate: item.executionTemplate,
    executionConfigText: item.executionConfigText,
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商模型</div>
        <ManagementDialog
          trigger={<ModalButton>新建供应商模型</ModalButton>}
          disabled={!hasProviders || !hasSupportedModels}
          title="新建供应商模型"
          description="在独立弹窗中，把可售模型映射到某个供应商的具体模型。"
        >
          {({ close }) => (
            <CreateProviderModelForm
              supportedModels={supportedModelOptions}
              providers={providerOptions}
              workerTemplates={workerTemplateOptions}
              executionConfigPresets={executionConfigPresets}
              defaultSupportedModelSlug="openoctopus/gemini-2.5-flash-image"
              defaultUpstreamModelSlug={selectedTemplate?.providerModel.upstreamModelSlug}
              defaultPricing={selectedTemplate?.providerModel.pricing}
              disabled={!hasProviders || !hasSupportedModels}
              className="grid gap-4"
              onSuccess={close}
            />
          )}
        </ManagementDialog>
      </div>

      <div className="rounded-2xl border border-[#F1DFC6] bg-[#FFF8EE] px-4 py-3 text-sm text-[#8A5B12] shadow-sm">
        这里维护的是供应商真实成本和供应商模型，不是用户售价。用户售价请去“可售模型”里改。
      </div>

      {providerModels.length > 0 ? (
        providerModels.map((item) => (
          <div key={item.id} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-md border border-[#D8E4F8] bg-[#F3F7FF] px-2 text-[11px] text-[#355FB4]">
                    {item.capability === "image_generation" ? "图片生成" : item.capability === "image_edit" ? "图片编辑" : "视频生成"}
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
                    defaultPricingSourceUrl={item.pricingSourceUrl ?? undefined}
                    defaultPricingSourceNote={item.pricingSourceNote ?? undefined}
                    defaultPricingSourceEvidence={JSON.stringify(item.pricingSourceEvidence)}
                    defaultInputSchema={item.inputSchemaText}
                    defaultOutputSchema={item.outputSchemaText}
                    defaultExecutionTemplate={item.executionTemplate}
                    defaultExecutionConfig={item.executionConfigText}
                    defaultActive={item.active}
                    disabled={!hasProviders || !hasSupportedModels}
                    submitLabel="保存供应商模型"
                    className="grid gap-4"
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-black/55 xl:grid-cols-3">
              <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">成本配置</p>
                <p className="mt-2 text-sm font-medium text-black">{item.pricingSummary}</p>
                <pre className="mt-3 overflow-x-auto whitespace-pre-wrap">{item.pricingText}</pre>
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">官方成本来源</p>
                {item.pricingSourceUrl ? (
                  <a
                    href={item.pricingSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-all text-sm text-[#355fb4] underline-offset-2 hover:underline"
                  >
                    {item.pricingSourceUrl}
                  </a>
                ) : (
                  <p className="mt-2 text-sm text-black/45">未填写来源链接</p>
                )}
                {item.pricingSourceNote ? (
                  <p className="mt-3 text-xs leading-5 text-black/58">{item.pricingSourceNote}</p>
                ) : null}
              </div>
              <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">价格证据</p>
                {item.pricingSourceEvidence.length > 0 ? (
                  <div className="mt-2 grid gap-2">
                    {item.pricingSourceEvidence.map((evidence, index) => (
                      <div
                        key={`${item.id}-evidence-${index}`}
                        className="rounded-md border border-black/[0.06] bg-white px-3 py-2"
                      >
                        {evidence.signedUrl ? (
                          <a
                            href={evidence.signedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm text-[#355fb4] underline-offset-2 hover:underline"
                          >
                            {evidence.label ?? `证据 ${index + 1}`}
                          </a>
                        ) : (
                          <p className="text-sm text-black">{evidence.label ?? `证据 ${index + 1}`}</p>
                        )}
                        {evidence.path ? (
                          <p className="mt-1 break-all text-xs text-black/50">{evidence.path}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-black/45">未上传证据图片</p>
                )}
              </div>
            </div>
            <RuntimeDiagnostics diagnostics={item.runtimeDiagnostics} />
          </div>
        ))
      ) : (
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有供应商模型</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            创建供应商后，在这里补齐真实上游模型标识和成本配置。
          </p>
        </div>
      )}
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
        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-black/[0.08] px-3 py-2.5">可售模型</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">能力</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">范围</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">主路由</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">回退路由</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">策略</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">状态</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {routingRules.map((rule) => (
                <tr key={rule.id}>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                    <p className="text-sm font-medium text-black">{rule.public_model_slug}</p>
                    <RuntimeDiagnostics diagnostics={rule.runtimeDiagnostics} />
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.capability}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.scopeLabel}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.primaryLabel}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.fallbackLabel}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle text-xs text-black/60">
                    {rule.route_strategy}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
                    <span
                      className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${
                        rule.active
                          ? "border-[#D7EADB] bg-[#EDF8F0] text-[#335D2D]"
                          : "border-black/[0.08] bg-[#FCFCFA] text-black/60"
                      } whitespace-nowrap`}
                    >
                      {rule.active ? "已启用" : "未启用"}
                    </span>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-middle">
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
        <div className="rounded-2xl border border-dashed border-black/[0.12] bg-[#FCFCFA] px-4 py-6">
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
