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
  label = "Active",
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
        <div className="text-sm text-black/55">Existing public models</div>
        <ManagementDialog
          trigger={
            <button type="button">
              <ModalButton>
                <Plus className="size-3.5" />
                Add public model
              </ModalButton>
            </button>
          }
          title="Add Public Model"
          description="Create a new customer-facing model entry without mixing it into the record list."
        >
          {({ close }) => (
          <ManagedDialogForm action={createSupportedModel} close={close}>
            <FormField label="Provider Label" name="provider" defaultValue="OpenOctopus" required />
            <FormField label="Public Model Slug" name="modelSlug" defaultValue="openoctopus/gemini-image" required />
            <FormField label="Display Name" name="displayName" defaultValue="Gemini Image" required />
            <FormSelect
              label="Modality"
              name="modality"
              options={[
                { value: "image", label: "Image" },
                { value: "video", label: "Video" },
                { value: "audio", label: "Audio" },
              ]}
            />
            <FormSelect
              label="Capability"
              name="capability"
              options={[...capabilityOptions]}
              defaultValue="image_generation"
            />
            <BillingConfigEditor
              initialValue={'{"billingMode":"hybrid","currency":"USD","charges":{"perImage":0.039,"inputTextTokensPerMillion":0.30}}'}
            />
            <ActiveCheckbox name="active" defaultChecked />
            <div className="flex justify-end">
              <SubmitButton label="Create public model" />
            </div>
          </ManagedDialogForm>
          )}
        </ManagementDialog>
      </div>

      {models.length > 0 ? (
        models.map((model) => (
          <div key={model.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                    {model.modality}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                    {model.active ? "active" : "inactive"}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{model.display_name}</p>
                <p className="mt-1 text-xs text-black/50">{model.model_slug}</p>
                <p className="mt-1 text-xs text-black/50">billing: {model.billingSummary}</p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      Edit
                    </ModalButton>
                  </button>
                }
                title={`Edit ${model.display_name}`}
                description="Edit this existing public model in a dedicated modal."
              >
                {({ close }) => (
                <ManagedDialogForm action={updateSupportedModelDetails} close={close}>
                  <input type="hidden" name="supportedModelId" value={model.id} />
                  <FormField label="Provider Label" name="provider" defaultValue={model.provider} required />
                  <FormField label="Public Model Slug" name="modelSlug" defaultValue={model.model_slug} required />
                  <FormField label="Display Name" name="displayName" defaultValue={model.display_name} required />
                  <FormSelect
                    label="Modality"
                    name="modality"
                    defaultValue={model.modality}
                    options={[
                      { value: "image", label: "Image" },
                      { value: "video", label: "Video" },
                      { value: "audio", label: "Audio" },
                    ]}
                  />
                  <FormSelect
                    label="Capability"
                    name="capability"
                    defaultValue={model.capability ?? "image_generation"}
                    options={[...capabilityOptions]}
                  />
                  <BillingConfigEditor initialValue={model.billingConfigText} />
                  <ActiveCheckbox name="active" defaultChecked={model.active} />
                  <div className="flex justify-end">
                    <SubmitButton label="Save public model" />
                  </div>
                </ManagedDialogForm>
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Provider label: {model.provider}
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Implementations: {model.activeProviderModelCount}/{model.providerModelCount} active
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Created: {model.createdLabel}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">No public models yet</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Create a public capability first, for example openoctopus/gemini-image.
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
        <div className="text-sm text-black/55">Existing providers</div>
        <ManagementDialog
          trigger={
            <button type="button">
              <ModalButton>
                <Plus className="size-3.5" />
                Add provider
              </ModalButton>
            </button>
          }
          title="Add Provider"
          description="Create a new upstream provider in its own modal."
        >
          {({ close }) => (
          <ManagedDialogForm action={createProvider} close={close}>
            <FormField label="Name" name="name" defaultValue={selectedTemplate?.provider.name} required />
            <FormField label="Slug" name="slug" defaultValue={selectedTemplate?.provider.slug} required />
            <FormSelect
              label="Kind"
              name="kind"
              defaultValue={selectedTemplate?.provider.kind}
              options={[...providerKindOptions]}
            />
            <FormField label="Base URL" name="baseUrl" defaultValue={selectedTemplate?.provider.baseUrl} />
            <FormSelect
              label="Status"
              name="status"
              defaultValue={selectedTemplate?.provider.status ?? "healthy"}
              options={[...providerStatusOptions]}
            />
            <FormField label="Regions" name="regions" defaultValue={selectedTemplate?.provider.regions} />
            <FormTextArea label="Config JSON" name="config" defaultValue={selectedTemplate?.provider.config ?? "{}"} />
            <div className="flex justify-end">
              <SubmitButton label="Create provider" />
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
                    {provider.kind}
                  </span>
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#f1eee6] px-2 text-[11px] text-[#6f5b27]">
                    {provider.status}
                  </span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{provider.name}</p>
                <p className="mt-1 text-xs text-black/50">{provider.slug}</p>
                <p className="mt-1 text-xs text-black/50">{provider.base_url ?? "No base URL"}</p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      Edit
                    </ModalButton>
                  </button>
                }
                title={`Edit ${provider.name}`}
                description="Update this provider in a dedicated modal."
              >
                {({ close }) => (
                <ManagedDialogForm action={updateProvider} close={close}>
                  <input type="hidden" name="providerId" value={provider.id} />
                  <FormField label="Name" name="name" defaultValue={provider.name} required />
                  <FormField label="Slug" name="slug" defaultValue={provider.slug} required />
                  <FormSelect label="Kind" name="kind" defaultValue={provider.kind} options={[...providerKindOptions]} />
                  <FormField label="Base URL" name="baseUrl" defaultValue={provider.base_url ?? ""} />
                  <FormSelect label="Status" name="status" defaultValue={provider.status} options={[...providerStatusOptions]} />
                  <FormField label="Regions" name="regions" defaultValue={(provider.regions ?? []).join(", ")} />
                  <FormTextArea label="Config JSON" name="config" defaultValue={provider.configText} />
                  <div className="flex justify-end">
                    <SubmitButton label="Save provider" />
                  </div>
                </ManagedDialogForm>
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-2 text-xs text-black/55 sm:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Regions: {provider.regionsLabel}
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Models: {provider.activeModelCount}/{provider.modelCount} active
              </div>
              <div className="rounded-sm border border-black/8 bg-white px-3 py-2">
                Credentials: {provider.credentialCount}
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">No providers yet</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Start by adding your first real upstream provider.
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
        <div className="text-sm text-black/55">Existing credentials</div>
        <ManagementDialog
          trigger={
            <button type="button" disabled={!hasProviders}>
              <ModalButton>
                <Plus className="size-3.5" />
                Add credential
              </ModalButton>
            </button>
          }
          title="Add Provider Credential"
          description="Create a new credential in a separate modal instead of inside the list."
        >
          {({ close }) => (
          <ManagedDialogForm action={createProviderCredential} close={close}>
            <FormSelect
              label="Provider"
              name="providerId"
              disabled={!hasProviders}
              options={
                hasProviders
                  ? providers.map((item) => ({ value: item.id, label: `${item.name} (${item.slug})` }))
                  : [{ value: "", label: "Add a provider first" }]
              }
            />
            <FormField label="Label" name="label" defaultValue={selectedTemplate?.credential.label} required disabled={!hasProviders} />
            <FormField label="Secret" name="secret" type="password" required disabled={!hasProviders} />
            <FormField label="Reference" name="secretRef" defaultValue={selectedTemplate?.credential.secretRef} disabled={!hasProviders} />
            <FormField label="Environment" name="environment" defaultValue={selectedTemplate?.credential.environment} required disabled={!hasProviders} />
            <FormTextArea label="Notes" name="notes" defaultValue={selectedTemplate?.credential.notes} disabled={!hasProviders} />
            <FormTextArea label="Metadata JSON" name="metadata" defaultValue={selectedTemplate?.credential.metadata ?? "{}"} disabled={!hasProviders} />
            <ActiveCheckbox name="isActive" defaultChecked disabled={!hasProviders} />
            <div className="flex justify-end">
              <SubmitButton label="Create credential" disabled={!hasProviders} />
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
                      active
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm font-medium text-black">{credential.label}</p>
                <p className="mt-1 text-xs text-black/50">
                  {credential.providerName} · {credential.secretMask}
                </p>
                {credential.secret_ref ? (
                  <p className="mt-1 text-xs text-black/50">reference: {credential.secret_ref}</p>
                ) : null}
                <p className="mt-1 text-xs text-black/50">
                  secret updated: {credential.secretUpdatedLabel}
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
                        Edit
                      </ModalButton>
                    </button>
                  }
                title={`Edit ${credential.label}`}
                description="Edit this existing credential in a modal."
              >
                  {({ close }) => (
                  <ManagedDialogForm action={updateProviderCredentialDetails} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <FormField label="Label" name="label" defaultValue={credential.label} required />
                    <FormField label="Reference" name="secretRef" defaultValue={credential.secret_ref ?? ""} />
                    <FormField label="Environment" name="environment" defaultValue={credential.environment} required />
                    <FormTextArea label="Notes" name="notes" defaultValue={credential.notes ?? ""} />
                    <FormTextArea label="Metadata JSON" name="metadata" defaultValue={credential.metadataText} />
                    <ActiveCheckbox name="isActive" defaultChecked={credential.is_active} />
                    <div className="flex justify-end">
                      <SubmitButton label="Save credential" />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>

                <ManagementDialog
                  trigger={
                    <button type="button">
                      <ModalButton tone="secondary">Rotate secret</ModalButton>
                    </button>
                  }
                  title={`Rotate Secret: ${credential.label}`}
                  description="Secret rotation is separated from metadata editing so operators do not confuse the two."
                >
                  {({ close }) => (
                  <ManagedDialogForm action={rotateProviderCredentialSecret} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <FormField label="New Secret" name="secret" type="password" required />
                    <FormField label="Reference" name="secretRef" defaultValue={credential.secret_ref ?? ""} />
                    <div className="flex justify-end">
                      <SubmitButton label="Rotate secret" />
                    </div>
                  </ManagedDialogForm>
                  )}
                </ManagementDialog>

                <ManagementDialog
                  trigger={
                    <button type="button" disabled={credential.is_active}>
                      <ModalButton tone="secondary">Delete</ModalButton>
                    </button>
                  }
                  title={`Delete ${credential.label}`}
                  description="Confirm deletion for this inactive credential."
                >
                  {({ close }) => (
                  <ManagedDialogForm action={deleteProviderCredential} close={close}>
                    <input type="hidden" name="credentialId" value={credential.id} />
                    <div className="rounded-sm border border-[#f0d5d0] bg-[#fff5f3] px-4 py-3 text-sm text-[#8d4336]">
                      This action permanently removes the credential record. Active credentials must be deactivated first.
                    </div>
                    <div className="flex justify-end">
                      <SubmitButton
                        label="Delete credential"
                        pendingLabel="Deleting..."
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
                  This is a legacy external reference only. Rotate it before sending live traffic.
                </p>
              </div>
            ) : null}
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">No credentials yet</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Once you add a provider, record the real secret reference here.
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
        <div className="text-sm text-black/55">Existing provider models</div>
        <ManagementDialog
          trigger={
            <button type="button" disabled={!hasProviders || !hasSupportedModels}>
              <ModalButton>
                <Plus className="size-3.5" />
                Add provider model
              </ModalButton>
            </button>
          }
          title="Add Provider Model"
          description="Map a public model to a concrete upstream implementation in a separate modal."
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

      {providerModels.length > 0 ? (
        providerModels.map((item) => (
          <div key={item.id} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex h-6 items-center rounded-sm bg-[#e8f0ff] px-2 text-[11px] text-[#355fb4]">
                    {item.capability}
                  </span>
                  <span className="text-sm font-medium text-black">{item.providerName}</span>
                </div>
                <p className="mt-3 text-sm font-medium text-black">{item.public_model_slug}</p>
                <p className="mt-1 text-xs text-black/50">public model: {item.supportedModelName}</p>
                <p className="mt-1 text-xs text-black/50">upstream: {item.upstream_model_slug}</p>
              </div>

              <ManagementDialog
                trigger={
                  <button type="button">
                    <ModalButton tone="secondary">
                      <Pencil className="size-3.5" />
                      Edit
                    </ModalButton>
                  </button>
                }
                title={`Edit ${item.upstream_model_slug}`}
                description="Edit this existing provider model in a dedicated modal."
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
                    submitLabel="Save provider model"
                    className="grid gap-4"
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 grid gap-3 text-xs text-black/55 xl:grid-cols-3">
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">Pricing</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.pricingText}</pre>
              </div>
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">Input schema</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.inputSchemaText}</pre>
              </div>
              <div className="rounded-sm border border-black/8 bg-white p-3">
                <p className="text-[11px] tracking-[0.35px] text-black/45">Output schema</p>
                <pre className="mt-2 overflow-x-auto whitespace-pre-wrap">{item.outputSchemaText}</pre>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">No provider models yet</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            After creating a provider, add the real upstream model IDs here.
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
        <div className="text-sm text-black/55">Existing routes</div>
        <ManagementDialog
          trigger={
            <button type="button" disabled={!hasProviderModels || !hasSupportedModels}>
              <ModalButton>
                <Plus className="size-3.5" />
                Add route
              </ModalButton>
            </button>
          }
          title="Add Routing Rule"
          description="Create a new route in a modal instead of mixing it with live route records."
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
                      Edit
                    </ModalButton>
                  </button>
                }
                title={`Edit Route: ${rule.public_model_slug}`}
                description="Edit this existing route in a dedicated modal."
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
                    submitLabel="Save route"
                    className="grid gap-4"
                    onSuccess={close}
                  />
                )}
              </ManagementDialog>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-black/52">
              <span>Primary: {rule.primaryLabel}</span>
              <span>Fallback: {rule.fallbackLabel}</span>
            </div>
          </div>
        ))
      ) : (
        <div className="rounded-sm border border-dashed border-black/12 bg-[#faf9f6] px-4 py-6">
          <p className="text-sm font-medium text-black">No routes yet</p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
            Create routes only after you have at least one real provider model.
          </p>
        </div>
      )}
    </div>
  );
}
