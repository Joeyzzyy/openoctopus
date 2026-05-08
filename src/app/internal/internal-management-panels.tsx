"use client";
import { Fragment, useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, Pencil, Plus } from "lucide-react";
import { deriveLegacyBillingFields, parseBillingConfig } from "@/lib/billing-config";
import {
  createModelVendor,
  createProvider,
  createProviderCredential,
  createProviderAdapterAlias,
  createProviderModel,
  createSupportedModel,
  deleteModelVendor,
  deleteProviderCredential,
  deleteProviderAdapterAlias,
  rotateProviderCredentialSecret,
  updateModelEconomicsBundle,
  updateProvider,
  updateProviderCredentialDetails,
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

type ProviderAdapterAliasSummary = {
  id: string;
  alias_slug: string;
  adapter_slug: string;
  active: boolean;
  createdLabel: string;
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
          ? "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
          : "inline-flex h-9 cursor-pointer items-center gap-2 rounded-md bg-[#111827] px-3 text-xs font-medium text-white transition-colors hover:bg-[#0B1220]"
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
  description: string;
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
          <DialogDescription className="text-black/55">
            {description}
          </DialogDescription>
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

const compactFilterSelectClassName =
  "h-8 shrink-0 rounded-md border border-black/[0.08] bg-white px-2 text-xs text-black outline-none transition-colors focus:border-black/20 focus:bg-white";

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
  modelVendors = [],
  capabilityOptions,
}: {
  models: SupportedModelSummary[];
  modelVendors?: ModelVendorSummary[];
  capabilityOptions: readonly CapabilityOption[];
}) {
  const safeModelVendors = Array.isArray(modelVendors) ? modelVendors : [];
  const vendorSuggestions = Array.from(
    new Set([
      ...safeModelVendors.map((item) => item.name),
      ...models.map((item) => item.provider),
    ])
  )
    .filter((name) => name.trim().toLowerCase() !== "openoctopus")
    .sort((a, b) => a.localeCompare(b, "en-US"));
  const vendorOptions = vendorSuggestions.map((name) => ({ value: name, label: name }));

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
        <p className="text-xs font-medium text-black/75">模型厂商名称配置</p>
        <p className="mt-1 text-xs text-black/55">用于可售模型里的“模型厂商”字段（例如 Google / OpenAI / Anthropic）。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {vendorSuggestions.map((name) => (
            <span
              key={name}
              className="inline-flex h-7 items-center rounded-md border border-black/[0.08] bg-white px-2.5 text-xs text-black/70"
            >
              {name}
            </span>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={createModelVendor} className="flex items-center gap-2">
            <input
              name="name"
              required
              pattern="^(?!\\s*openoctopus\\s*$).+"
              placeholder="新增厂商名称"
              className="h-8 w-[180px] rounded-md border border-black/[0.08] bg-white px-2 text-xs text-black outline-none focus:border-black/20"
            />
            <SubmitButton label="新增" pendingLabel="新增中..." />
          </form>
          {safeModelVendors.map((vendor) => (
            <form key={vendor.id} action={deleteModelVendor}>
              <input type="hidden" name="vendorId" value={vendor.id} />
              <SubmitButton label={`删除 ${vendor.name}`} pendingLabel="删除中..." tone="danger" />
            </form>
          ))}
        </div>
      </div>

      {models.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs text-black/50">
                <th className="border-b border-black/[0.08] px-3 py-2.5">可售模型</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">厂商</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">模态/能力</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">计费</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">实现数量</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">创建时间</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">是否启用</th>
                <th className="border-b border-black/[0.08] px-3 py-2.5">操作</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id}>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                    <p className="text-sm font-medium text-black">{model.display_name}</p>
                    <p className="mt-1 text-xs text-black/50">{model.model_slug}</p>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{model.provider}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex h-6 items-center rounded-md border border-[#D8E4F8] bg-[#F3F7FF] px-2 text-[11px] text-[#355FB4]">
                        {model.modality === "image" ? "图片" : model.modality === "video" ? "视频" : "音频"}
                      </span>
                      <span className="inline-flex h-6 items-center rounded-md border border-black/[0.08] bg-[#FCFCFA] px-2 text-[11px] text-black/60">
                        {model.capability ?? "未设置"}
                      </span>
                    </div>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{model.billingSummary}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                    {model.activeProviderModelCount}/{model.providerModelCount}
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{model.createdLabel}</td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                    <form action={updateSupportedModelState}>
                      <input type="hidden" name="supportedModelId" value={model.id} />
                      <input type="hidden" name="active" value={model.active ? "false" : "true"} />
                      <button
                        type="submit"
                        className={`inline-flex h-7 w-[86px] items-center rounded-full border px-1 transition-colors ${
                          model.active
                            ? "border-[#D7EADB] bg-[#EDF8F0]"
                            : "border-black/[0.12] bg-[#F4F4F3]"
                        }`}
                        aria-label={model.active ? "停用模型" : "启用模型"}
                      >
                        <span
                          className={`h-5 rounded-full px-2 text-[11px] leading-5 transition-all ${
                            model.active
                              ? "ml-auto bg-[#335D2D] text-white"
                              : "mr-auto bg-[#6B7280] text-white"
                          }`}
                        >
                          {model.active ? "ON" : "OFF"}
                        </span>
                      </button>
                    </form>
                  </td>
                  <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                    <ManagementDialog
                      trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑</ModalButton>}
                      title={`编辑 ${model.display_name}`}
                      description="在独立弹窗中编辑这个可售模型。"
                    >
                      {({ close }) => (
                      <ManagedDialogForm action={updateSupportedModelDetails} close={close}>
                        <input type="hidden" name="supportedModelId" value={model.id} />
                        <input type="hidden" name="active" value={model.active ? "true" : "false"} />
                        <FormSelect
                          label="模型厂商（内部分类）"
                          name="provider"
                          defaultValue={model.provider}
                          options={vendorOptions}
                        />
                        <FormField label="可售模型 Slug" name="modelSlug" defaultValue={model.model_slug} required />
                        <FormField label="显示名称" name="displayName" defaultValue={model.display_name} required />
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
                  </td>
                </tr>
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

export function CreateSupportedModelButton({
  capabilityOptions,
}: {
  capabilityOptions: readonly CapabilityOption[];
}) {
  return (
    <ManagementDialog
      trigger={<ModalButton><Plus className="size-3.5" />新建</ModalButton>}
      title="新建可售模型"
      description="在独立弹窗中创建新的客户侧模型定义。"
    >
      {({ close }) => (
      <ManagedDialogForm action={createSupportedModel} close={close}>
        <FormField
          label="模型厂商（内部分类）"
          name="provider"
          defaultValue="Google"
          required
          help="用于内部分类和测算分组，例如 Google、OpenAI、Anthropic。"
        />
        <FormField label="可售模型 Slug" name="modelSlug" defaultValue="openoctopus/gemini-2.5-flash-image" required />
        <FormField label="显示名称" name="displayName" defaultValue="Gemini Image" required />
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
        <ActiveCheckbox name="active" defaultChecked />
        <div className="flex justify-end">
          <SubmitButton label="创建可售模型" />
        </div>
      </ManagedDialogForm>
      )}
    </ManagementDialog>
  );
}

export function EconomicsPanel({
  supportedModels,
  providerModels,
}: {
  supportedModels: SupportedModelSummary[];
  providerModels: ProviderModelSummary[];
}) {
  const supportedModelById = new Map(supportedModels.map((item) => [item.id, item]));

  const rows = providerModels
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

  const providerFilterOptions = Array.from(new Set(rows.map((row) => row.providerName))).sort((a, b) =>
    a.localeCompare(b, "en-US")
  );
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [capabilityFilter, setCapabilityFilter] = useState<string>("all");
  const [activeFilter, setActiveFilter] = useState<string>("all");

  const filteredRows = rows.filter((row) => {
    if (providerFilter !== "all" && row.providerName !== providerFilter) {
      return false;
    }
    if (capabilityFilter !== "all" && row.providerModel.capability !== capabilityFilter) {
      return false;
    }
    if (activeFilter === "active" && !row.providerModel.active) {
      return false;
    }
    if (activeFilter === "inactive" && row.providerModel.active) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {rows.length > 0 ? (
        <>
          <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-2">
            <select
              value={providerFilter}
              onChange={(event) => setProviderFilter(event.target.value)}
              className={compactFilterSelectClassName + " w-[132px]"}
            >
              <option value="all">全部供应商</option>
              {providerFilterOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <select
              value={capabilityFilter}
              onChange={(event) => setCapabilityFilter(event.target.value)}
              className={compactFilterSelectClassName + " w-[122px]"}
            >
              <option value="all">全部能力</option>
              <option value="image_generation">image_generation</option>
              <option value="image_edit">image_edit</option>
              <option value="video_generation">video_generation</option>
            </select>

            <select
              value={activeFilter}
              onChange={(event) => setActiveFilter(event.target.value)}
              className={compactFilterSelectClassName + " w-[100px]"}
            >
              <option value="all">全部状态</option>
              <option value="active">已启用</option>
              <option value="inactive">未启用</option>
            </select>

            <span className="ml-auto shrink-0 px-2 text-xs text-black/50">结果：{filteredRows.length} 条</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-black/[0.08] bg-white shadow-sm">
            <table className="min-w-[2360px] border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr className="text-xs text-black/50">
                  <th className="w-[230px] border-b border-black/[0.08] px-3 py-2.5">分类</th>
                  <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">可售模型</th>
                  <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">上游模型</th>
                  <th className="w-[150px] border-b border-black/[0.08] px-3 py-2.5">能力</th>
                  <th className="w-[240px] border-b border-black/[0.08] px-3 py-2.5">售价</th>
                  <th className="w-[290px] border-b border-black/[0.08] px-3 py-2.5">成本</th>
                  <th className="w-[140px] border-b border-black/[0.08] px-3 py-2.5">标准利润</th>
                  <th className="w-[140px] border-b border-black/[0.08] px-3 py-2.5">来源证据</th>
                  <th className="w-[120px] border-b border-black/[0.08] px-3 py-2.5">状态</th>
                  <th className="sticky right-0 z-10 w-[180px] border-b border-black/[0.08] bg-white px-3 py-2.5 shadow-[-8px_0_12px_-10px_rgba(17,24,39,0.28)]">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.length > 0 ? (
                  filteredRows.map((row, index) => {
                    const prev = filteredRows[index - 1] ?? null;
                    const providerChanged = !prev || prev.providerName !== row.providerName;
                    const vendorChanged = providerChanged || prev.vendor !== row.vendor;

                    return (
                      <Fragment key={`row-group-${row.providerModel.id}`}>
                        {providerChanged ? (
                          <tr key={`provider-${row.providerModel.id}`}>
                            <td colSpan={10} className="border-b border-black/[0.06] bg-[#F3F7FF] px-3 py-2.5 text-sm font-semibold text-[#355FB4]">
                              供应商：{row.providerName} · {row.providerSlug}
                            </td>
                          </tr>
                        ) : null}
                        {vendorChanged ? (
                          <tr key={`vendor-${row.providerModel.id}`}>
                            <td colSpan={10} className="border-b border-black/[0.06] bg-[#FCFCFA] px-3 py-2 text-xs font-medium text-black/70">
                              模型公司：{row.vendor}
                            </td>
                          </tr>
                        ) : null}
                        <tr key={row.providerModel.id}>
                          <td className="w-[230px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/55">
                            {row.providerName}
                            <br />
                            {row.vendor}
                          </td>
                          <td className="w-[290px] border-b border-black/[0.06] px-3 py-3 align-top">
                            <p className="text-sm font-medium text-black">{row.supportedModel.display_name}</p>
                            <p className="mt-1 text-xs text-black/50">{row.supportedModel.model_slug}</p>
                          </td>
                          <td className="w-[290px] border-b border-black/[0.06] px-3 py-3 align-top">
                            <p className="text-sm text-black">{row.providerModel.upstream_model_slug}</p>
                            <p className="mt-1 text-xs text-black/50">{row.providerModel.public_model_slug}</p>
                          </td>
                          <td className="w-[150px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{row.providerModel.capability}</td>
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
                          <td className="w-[140px] border-b border-black/[0.06] px-3 py-3 align-top">
                            {row.margin === null ? (
                              <p className="text-xs text-black/45">口径不一致</p>
                            ) : (
                              <p className={`text-sm font-medium ${row.margin >= 0 ? "text-[#335D2D]" : "text-[#b54432]"}`}>
                                {formatCurrency(row.margin)}
                              </p>
                            )}
                          </td>
                          <td className="w-[140px] border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                            <p>截图：{row.providerModel.pricingSourceEvidence.length}</p>
                            <p className="mt-1">备注：{row.providerModel.pricingSourceNote ? "有" : "无"}</p>
                          </td>
                          <td className="w-[120px] border-b border-black/[0.06] px-3 py-3 align-top">
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
                            <ManagementDialog
                              trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑联动</ModalButton>}
                              title={`编辑联动：${row.supportedModel.display_name} / ${row.providerModel.providerName}`}
                              description="在一个表单内同时编辑可售模型售价与供应商模型成本。"
                            >
                              {({ close }) => (
                                <ManagedDialogForm action={updateModelEconomicsBundle} close={close}>
                                  <input type="hidden" name="supportedModelId" value={row.supportedModel.id} />
                                  <input type="hidden" name="providerModelId" value={row.providerModel.id} />
                                  <input
                                    type="hidden"
                                    name="pricingSourceEvidence"
                                    value={JSON.stringify(row.providerModel.pricingSourceEvidence)}
                                  />
                                  <div className="grid gap-4">
                                    <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5 text-xs text-black/55">
                                      可售模型：{row.supportedModel.model_slug}
                                      <br />
                                      供应商模型：{row.providerModel.providerName} / {row.providerModel.upstream_model_slug}
                                    </div>
                                    <div>
                                      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">可售模型售价配置</span>
                                      <BillingConfigEditor
                                        name="supportedBillingConfig"
                                        initialValue={row.supportedModel.billingConfigText}
                                        componentHint="用户可见售价配置。"
                                        generatedLabel="生成的用户售价计费配置"
                                      />
                                    </div>
                                    <div>
                                      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">供应商成本配置</span>
                                      <BillingConfigEditor
                                        name="providerPricing"
                                        initialValue={row.providerModel.pricingText}
                                        componentHint="供应商真实成本配置。"
                                        generatedLabel="生成的供应商成本计费配置"
                                      />
                                    </div>
                                    <FormField
                                      label="官方成本价格链接"
                                      name="pricingSourceUrl"
                                      type="text"
                                      defaultValue={row.providerModel.pricingSourceUrl ?? ""}
                                    />
                                    <FormTextArea
                                      label="成本说明备注"
                                      name="pricingSourceNote"
                                      defaultValue={row.providerModel.pricingSourceNote ?? ""}
                                    />
                                    <label className="block">
                                      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">价格证据截图</span>
                                      <input
                                        type="file"
                                        name="pricingSourceEvidenceFile"
                                        accept="image/png,image/jpeg,image/webp"
                                        className="block w-full rounded-md border border-black/[0.08] bg-white px-3 py-2 text-sm text-black file:mr-3 file:rounded-md file:border-0 file:bg-[#111827] file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
                                      />
                                    </label>
                                    <div className="flex justify-end">
                                      <SubmitButton label="保存联动价格" />
                                    </div>
                                  </div>
                                </ManagedDialogForm>
                              )}
                            </ManagementDialog>
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={10} className="px-3 py-8 text-center text-sm text-black/55">
                      当前筛选条件下没有结果。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
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

export function CreateProviderModelMappingButton({
  supportedModels,
  providers,
}: {
  supportedModels: SupportedModelSummary[];
  providers: ProviderSummary[];
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

  return (
    <ManagementDialog
      trigger={<ModalButton><Plus className="size-3.5" />新建供应商模型映射</ModalButton>}
      disabled={!hasProviders || !hasSupportedModels}
      title="新建供应商模型映射"
      description="在总表内直接新增可售模型与供应商模型的映射关系。"
    >
      {({ close }) => (
        <CreateProviderModelForm
          action={createProviderModel}
          supportedModels={supportedModelOptions}
          providers={providerOptions}
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
  providerAdapterAliases = [],
  providerStatusOptions,
}: {
  providers: ProviderSummary[];
  credentials: ProviderCredentialSummary[];
  providerAdapterAliases?: ProviderAdapterAliasSummary[];
  providerStatusOptions: readonly ProviderStatusOption[];
}) {
  const safeProviderAdapterAliases = Array.isArray(providerAdapterAliases) ? providerAdapterAliases : [];
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
      <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] p-3">
        <p className="text-xs font-medium text-black/75">Provider Adapter Slug 映射</p>
        <p className="mt-1 text-xs text-black/55">
          管理员可配置 alias slug 到 worker adapter slug 的映射，例如 gemini-images -&gt; gemini-direct。
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <form action={createProviderAdapterAlias} className="flex flex-wrap items-center gap-2">
            <input
              name="aliasSlug"
              required
              pattern="^[a-z0-9-]+$"
              placeholder="alias slug"
              className="h-8 w-[170px] rounded-md border border-black/[0.08] bg-white px-2 text-xs text-black outline-none focus:border-black/20"
            />
            <input
              name="adapterSlug"
              required
              pattern="^[a-z0-9-]+$"
              placeholder="adapter slug"
              className="h-8 w-[170px] rounded-md border border-black/[0.08] bg-white px-2 text-xs text-black outline-none focus:border-black/20"
            />
            <SubmitButton label="新增映射" pendingLabel="新增中..." />
          </form>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {safeProviderAdapterAliases.length > 0 ? (
            safeProviderAdapterAliases.map((alias) => (
              <form key={alias.id} action={deleteProviderAdapterAlias} className="inline-flex items-center gap-2 rounded-md border border-black/[0.08] bg-white px-2 py-1">
                <input type="hidden" name="aliasId" value={alias.id} />
                <span className="text-xs text-black/70">
                  {alias.alias_slug} -&gt; {alias.adapter_slug}
                </span>
                <SubmitButton label="删除" pendingLabel="删除中..." tone="danger" />
              </form>
            ))
          ) : (
            <p className="text-xs text-black/45">暂无自定义映射</p>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商</div>
        <ManagementDialog
          trigger={<ModalButton><Plus className="size-3.5" />新建供应商</ModalButton>}
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
      </div>

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
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                      <p className="text-sm font-medium text-black">{provider.name}</p>
                      <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                      <RuntimeDiagnostics diagnostics={provider.runtimeDiagnostics} />
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                      <p className="max-w-[320px] break-all text-xs text-black/60">{provider.base_url ?? "未填写"}</p>
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                      <span className={`inline-flex h-6 items-center rounded-md border px-2 text-[11px] ${statusToneClassName(provider.status)}`}>
                        {provider.status === "healthy" ? "健康" : provider.status === "degraded" ? "降级" : "离线"}
                      </span>
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{provider.regionsLabel}</td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">
                      {provider.activeModelCount}/{provider.modelCount}
                    </td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top text-xs text-black/60">{provider.credentialCount}</td>
                    <td className="border-b border-black/[0.06] px-3 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑</ModalButton>}
                          title={`编辑 ${provider.name}`}
                          description="在独立弹窗中编辑这个供应商。"
                        >
                          {({ close }) => (
                            <ManagedDialogForm action={updateProvider} close={close}>
                              <input type="hidden" name="providerId" value={provider.id} />
                              <FormField label="名称" name="name" defaultValue={provider.name} required />
                              <FormField label="Slug" name="slug" defaultValue={provider.slug} required />
                              <FormField label="基础 URL" name="baseUrl" defaultValue={provider.base_url ?? ""} />
                              <FormSelect label="状态" name="status" defaultValue={provider.status} options={[...providerStatusOptions]} />
                              <FormField label="区域" name="regions" defaultValue={(provider.regions ?? []).join(", ")} />
                              <FormTextArea label="配置 JSON" name="config" defaultValue={provider.configText} />
                              <div className="flex justify-end">
                                <SubmitButton label="保存供应商" />
                              </div>
                            </ManagedDialogForm>
                          )}
                        </ManagementDialog>
                        <ManagementDialog
                          trigger={<ModalButton tone="secondary"><Plus className="size-3.5" />管理密钥</ModalButton>}
                          title={`管理供应商密钥：${provider.name}`}
                          description="在弹窗里新增、编辑、轮换或删除这个供应商的密钥。"
                        >
                          <CredentialsPanel credentials={providerCredentials} providers={[provider]} selectedTemplate={null} />
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
          trigger={<ModalButton><Plus className="size-3.5" />新建供应商密钥</ModalButton>}
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
                <ManagementDialog
                  trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑</ModalButton>}
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
  selectedTemplate,
}: {
  providerModels: ProviderModelSummary[];
  providers: ProviderSummary[];
  supportedModels: SupportedModelSummary[];
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商模型</div>
        <ManagementDialog
          trigger={<ModalButton><Plus className="size-3.5" />新建供应商模型</ModalButton>}
          disabled={!hasProviders || !hasSupportedModels}
          title="新建供应商模型"
          description="在独立弹窗中，把可售模型映射到某个供应商的具体模型。"
        >
          {({ close }) => (
            <CreateProviderModelForm
              supportedModels={supportedModelOptions}
              providers={providerOptions}
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
                trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑</ModalButton>}
                title={`编辑 ${item.upstream_model_slug}`}
                description="在独立弹窗中编辑这个供应商模型。"
              >
                {({ close }) => (
                  <CreateProviderModelForm
                    action={updateProviderModelDetails}
                    providerModelId={item.id}
                    supportedModels={supportedModelOptions}
                    providers={providerOptions}
                    defaultSupportedModelSlug={item.public_model_slug}
                    defaultProviderId={item.provider_id}
                    defaultUpstreamModelSlug={item.upstream_model_slug}
                    defaultPricing={item.pricingText}
                    defaultPricingSourceUrl={item.pricingSourceUrl ?? undefined}
                    defaultPricingSourceNote={item.pricingSourceNote ?? undefined}
                    defaultPricingSourceEvidence={JSON.stringify(item.pricingSourceEvidence)}
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
  selectedTemplate,
}: {
  routingRules: RoutingRuleSummary[];
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
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有路由</div>
        <ManagementDialog
          trigger={<ModalButton><Plus className="size-3.5" />新建路由</ModalButton>}
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
              onSuccess={close}
            />
          )}
        </ManagementDialog>
      </div>

      {routingRules.length > 0 ? (
        routingRules.map((rule) => (
          <div key={rule.id} className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-black/45">
                  <span>{rule.scopeLabel}</span>
                  <span>•</span>
                  <span>{rule.capability}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{rule.public_model_slug}</p>
              </div>

              <ManagementDialog
                trigger={<ModalButton tone="secondary"><Pencil className="size-3.5" />编辑</ModalButton>}
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
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-black/52">
              <span>主路由：{rule.primaryLabel}</span>
              <span>回退路由：{rule.fallbackLabel}</span>
            </div>
            <RuntimeDiagnostics diagnostics={rule.runtimeDiagnostics} />
          </div>
        ))
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
