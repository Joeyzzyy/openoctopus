"use client";
import { useEffect, useState } from "react";
import { BadgeCheck, CircleAlert, Pencil, Plus } from "lucide-react";
import {
  createProvider,
  createProviderCredential,
  createSupportedModel,
  deleteProviderCredential,
  rotateProviderCredentialSecret,
  updateProvider,
  updateProviderCredentialDetails,
  updateProviderModelDetails,
  updateRoutingRule,
  updateSupportedModelDetails,
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
type ProviderKindOption = { value: string; label: string };

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

type ProviderSummary = {
  id: string;
  name: string;
  slug: string;
  kind: "wavespeed" | "partner" | "custom";
  base_url: string | null;
  status: "healthy" | "degraded" | "offline";
  regionsLabel: string;
  regions: string[] | null;
  credentialCount: number;
  modelCount: number;
  activeModelCount: number;
  configText: string;
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
  inputSchemaText: string;
  outputSchemaText: string;
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
};

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
    inputSchema?: string;
    outputSchema?: string;
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
          ? "inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm border border-black/10 bg-white px-3 text-xs font-medium text-black/72 transition-colors hover:bg-black/[0.03]"
          : "inline-flex h-9 cursor-pointer items-center gap-2 rounded-sm bg-black px-3 text-xs font-medium text-white transition-colors hover:bg-black/88"
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
  children,
}: {
  trigger: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode | ((controls: { close: () => void }) => React.ReactNode);
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto rounded-sm border border-black/10 bg-[#f7f6f1] p-0 shadow-[0_30px_80px_rgba(17,17,17,0.14)] sm:max-w-3xl">
        <DialogHeader className="border-b border-black/10 px-5 pb-4 pt-5">
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
        className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
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
        className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
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
        className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
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
    <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
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
  capabilityOptions,
}: {
  models: SupportedModelSummary[];
  capabilityOptions: readonly CapabilityOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有公共模型</div>
        <ManagementDialog
          trigger={
            <button type="button">
              <ModalButton>
                <Plus className="size-3.5" />
                新建公共模型
              </ModalButton>
            </button>
          }
          title="新建公共模型"
          description="在独立弹窗中创建新的客户侧模型定义。"
        >
          {({ close }) => (
          <ManagedDialogForm action={createSupportedModel} close={close}>
            <FormField label="提供方名称" name="provider" defaultValue="OpenOctopus" required />
            <FormField label="公共模型 Slug" name="modelSlug" defaultValue="openoctopus/gemini-image" required />
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
              <SubmitButton label="创建公共模型" />
            </div>
          </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      <div className="rounded-sm border border-[#d8e4f8] bg-[#f2f7ff] px-4 py-3 text-sm text-[#274a86]">
        这里维护的是用户看到的模型入口和用户售价。不要在这里填写供应商成本。
      </div>

      {models.length > 0 ? (
        models.map((model) => (
          <div key={model.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                    {model.modality === "image" ? "图片" : model.modality === "video" ? "视频" : "音频"}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                    {model.active ? "已启用" : "未启用"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{model.display_name}</p>
                <p className="mt-1 text-xs text-black/50">{model.model_slug}</p>
                <p className="mt-1 text-xs text-black/50">计费：{model.billingSummary}</p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      编辑
                    </ModalButton>
                  </button>
                }
                title={`编辑 ${model.display_name}`}
                description="在独立弹窗中编辑这个公共模型。"
              >
                {({ close }) => (
                <ManagedDialogForm action={updateSupportedModelDetails} close={close}>
                  <input type="hidden" name="supportedModelId" value={model.id} />
                  <FormField label="提供方名称" name="provider" defaultValue={model.provider} required />
                  <FormField label="公共模型 Slug" name="modelSlug" defaultValue={model.model_slug} required />
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
                  <ActiveCheckbox name="active" defaultChecked={model.active} />
                  <div className="flex justify-end">
                    <SubmitButton label="保存公共模型" />
                  </div>
                </ManagedDialogForm>
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                提供方名称：{model.provider}
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                实现数量：{model.activeProviderModelCount}/{model.providerModelCount} 已启用
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                创建时间：{model.createdLabel}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有公共模型</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            先创建一个公共能力入口，例如 `openoctopus/gemini-image`。
          </p>
        </div>
      )}
    </div>
  );
}

export function ProvidersPanel({
  providers,
  providerKindOptions,
  providerStatusOptions,
  selectedTemplate,
}: {
  providers: ProviderSummary[];
  providerKindOptions: readonly ProviderKindOption[];
  providerStatusOptions: readonly ProviderStatusOption[];
  selectedTemplate: ProviderTemplate | null;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-black/55">已有供应商</div>
        <ManagementDialog
          trigger={
            <button type="button">
              <ModalButton>
                <Plus className="size-3.5" />
                新建供应商
              </ModalButton>
            </button>
          }
          title="新建供应商"
          description="在独立弹窗中创建新的上游供应商。"
        >
          {({ close }) => (
          <ManagedDialogForm action={createProvider} close={close}>
            <FormField label="名称" name="name" defaultValue={selectedTemplate?.provider.name} required />
            <FormField label="Slug" name="slug" defaultValue={selectedTemplate?.provider.slug} required />
            <FormSelect
              label="类型"
              name="kind"
              defaultValue={selectedTemplate?.provider.kind}
              options={[...providerKindOptions]}
            />
            <FormField label="基础 URL" name="baseUrl" defaultValue={selectedTemplate?.provider.baseUrl} />
            <FormSelect
              label="状态"
              name="status"
              defaultValue={selectedTemplate?.provider.status ?? "healthy"}
              options={[...providerStatusOptions]}
            />
            <FormField label="区域" name="regions" defaultValue={selectedTemplate?.provider.regions} />
            <FormTextArea label="配置 JSON" name="config" defaultValue={selectedTemplate?.provider.config ?? "{}"} />
            <div className="flex justify-end">
              <SubmitButton label="创建供应商" />
            </div>
          </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {providers.length > 0 ? (
        providers.map((provider) => (
          <div key={provider.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#eef3ea] px-2 text-[11px] text-[#335d2d]">
                    {provider.kind === "wavespeed" ? "WaveSpeed" : provider.kind === "partner" ? "合作方" : "自定义"}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                    {provider.status === "healthy" ? "健康" : provider.status === "degraded" ? "降级" : "离线"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{provider.name}</p>
                <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                <p className="mt-1 text-xs text-black/50">{provider.base_url ?? "未填写基础 URL"}</p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      编辑
                    </ModalButton>
                  </button>
                }
                title={`编辑 ${provider.name}`}
                description="在独立弹窗中编辑这个供应商。"
              >
                {({ close }) => (
                <ManagedDialogForm action={updateProvider} close={close}>
                  <input type="hidden" name="providerId" value={provider.id} />
                  <FormField label="名称" name="name" defaultValue={provider.name} required />
                  <FormField label="Slug" name="slug" defaultValue={provider.slug} required />
                  <FormSelect label="类型" name="kind" defaultValue={provider.kind} options={[...providerKindOptions]} />
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
            </div>

            <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                区域：{provider.regionsLabel}
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                模型：{provider.activeModelCount}/{provider.modelCount} 已启用
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                凭证：{provider.credentialCount}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
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
        <div className="text-sm text-black/55">已有凭证</div>
        <ManagementDialog
          trigger={
            <button type="button" disabled={!hasProviders}>
              <ModalButton>
                <Plus className="size-3.5" />
                新建凭证
              </ModalButton>
            </button>
          }
          title="新建供应商凭证"
          description="在独立弹窗中创建新的凭证，不直接嵌在列表里编辑。"
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
              <SubmitButton label="创建凭证" disabled={!hasProviders} />
            </div>
          </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {credentials.length > 0 ? (
        credentials.map((credential) => (
          <div key={credential.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                    {credential.environment}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                    {credential.secretSourceLabel}
                  </span>
                  {credential.is_active ? (
                    <span className="inline-flex h-6 items-center gap-1 rounded-sm bg-[#eef3ea] px-2 text-[11px] text-[#335d2d]">
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
                  trigger={
                    <button type="button">
                      <ModalButton tone="secondary">
                        <Pencil className="size-3.5" />
                        编辑
                      </ModalButton>
                    </button>
                  }
                title={`编辑 ${credential.label}`}
                description="在弹窗中编辑这个已有凭证。"
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
                      <SubmitButton label="保存凭证" />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>

                <ManagementDialog
                  trigger={
                    <button type="button">
                      <ModalButton tone="secondary">轮换密钥</ModalButton>
                    </button>
                  }
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
                  trigger={
                    <button type="button" disabled={credential.is_active}>
                      <ModalButton tone="secondary">删除</ModalButton>
                    </button>
                  }
                  title={`删除 ${credential.label}`}
                  description="确认是否删除这个未启用的凭证。"
                >
                  {({ close }) => (
                  <ManagedDialogForm action={deleteProviderCredential} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <div className="rounded-sm border border-[#f0d5d0] bg-[#fff5f3] px-4 py-3 text-sm text-[#8d4336]">
                      这个操作会永久删除凭证记录。必须先停用后才能删除。
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton
                        label="删除凭证"
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
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有凭证</p>
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
        <div className="text-sm text-black/55">已有上游实现</div>
        <ManagementDialog
          trigger={
            <button type="button" disabled={!hasProviders || !hasSupportedModels}>
              <ModalButton>
                <Plus className="size-3.5" />
                新建上游实现
              </ModalButton>
            </button>
          }
          title="新建上游实现"
          description="在独立弹窗中，把公共模型映射到某个供应商的具体上游实现。"
        >
          {({ close }) => (
            <CreateProviderModelForm
              supportedModels={supportedModelOptions}
              providers={providerOptions}
              defaultSupportedModelSlug="openoctopus/gemini-image"
              defaultUpstreamModelSlug={selectedTemplate?.providerModel.upstreamModelSlug}
              defaultPricing={selectedTemplate?.providerModel.pricing}
              defaultInputSchema={selectedTemplate?.providerModel.inputSchema}
              defaultOutputSchema={selectedTemplate?.providerModel.outputSchema}
              disabled={!hasProviders || !hasSupportedModels}
              className="grid gap-4"
              onSuccess={close}
            />
          )}
        </ManagementDialog>
      </div>

      <div className="rounded-sm border border-[#f1dfc6] bg-[#fff8ee] px-4 py-3 text-sm text-[#8a5b12]">
        这里维护的是供应商真实成本和上游实现，不是用户售价。用户售价请去“公共模型”里改。
      </div>

      {providerModels.length > 0 ? (
        providerModels.map((item) => (
          <div key={item.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                    {item.capability === "image_generation" ? "图片生成" : item.capability === "image_edit" ? "图片编辑" : "视频生成"}
                  </span>
                  <span className="text-sm font-medium text-black">{item.providerName}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{item.public_model_slug}</p>
                <p className="mt-1 text-xs text-black/50">公共模型：{item.supportedModelName}</p>
                <p className="mt-1 text-xs text-black/50">上游模型：{item.upstream_model_slug}</p>
                <p className="mt-1 text-xs text-[#8a5b12]">
                  这里的价格 = 供应商成本；用户售价不在这里改。
                </p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      编辑
                    </ModalButton>
                  </button>
                }
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
                    defaultInputSchema={item.inputSchemaText}
                    defaultOutputSchema={item.outputSchemaText}
                    defaultActive={item.active}
                    disabled={!hasProviders || !hasSupportedModels}
                    submitLabel="保存上游实现"
                    className="grid gap-4"
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-black/55 xl:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">成本配置</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.pricingText}</pre>
              </div>
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">输入 Schema</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.inputSchemaText}</pre>
              </div>
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">输出 Schema</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.outputSchemaText}</pre>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有上游实现</p>
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
          trigger={
            <button type="button" disabled={!hasProviderModels || !hasSupportedModels}>
              <ModalButton>
                <Plus className="size-3.5" />
                新建路由
              </ModalButton>
            </button>
          }
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
          <div key={rule.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
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
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      编辑
                    </ModalButton>
                  </button>
                }
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
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">还没有路由</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            至少要先有一个真实供应商模型，才能创建路由。
          </p>
        </div>
      )}
    </div>
  );
}
