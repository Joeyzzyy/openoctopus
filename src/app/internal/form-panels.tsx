"use client";

import { useEffect, useState } from "react";
import { createProviderModel, createRoutingRule } from "./actions";
import { SubmitButton } from "./submit-button";

type SupportedModelOption = {
  id: string;
  modelSlug: string;
  displayName: string;
  capability: "image_generation" | "image_edit" | "video_generation" | null;
};

type ProviderOption = {
  id: string;
  name: string;
  slug: string;
};

type ProviderModelOption = {
  id: string;
  supportedModelId: string | null;
  supportedModelName: string;
  providerName: string;
  upstreamModelSlug: string;
  capability: "image_generation" | "image_edit" | "video_generation";
};

type BillingMode =
  | "per_request"
  | "per_image"
  | "per_video"
  | "per_second"
  | "per_million_tokens";

type BillingFormState = {
  billingMode: BillingMode;
  currency: string;
  costPerRequest: string;
  costPerImage: string;
  costPerVideo: string;
  costPerSecond: string;
  inputCostPerMillion: string;
  outputCostPerMillion: string;
};

const billingModeOptions: Array<{ value: BillingMode; label: string; help: string }> = [
  {
    value: "per_image",
    label: "Per image",
    help: "Charge once for each generated image asset.",
  },
  {
    value: "per_video",
    label: "Per video",
    help: "Charge once for each generated video asset.",
  },
  {
    value: "per_request",
    label: "Per request",
    help: "Charge a fixed amount for each successful request.",
  },
  {
    value: "per_second",
    label: "Per second",
    help: "Charge by generated duration in seconds.",
  },
  {
    value: "per_million_tokens",
    label: "Per 1M tokens",
    help: "Charge text models by input and output token usage.",
  },
];

function parseBillingFormState(initialValue?: string): BillingFormState {
  const fallback: BillingFormState = {
    billingMode: "per_image",
    currency: "USD",
    costPerRequest: "0.04",
    costPerImage: "0.04",
    costPerVideo: "0.8",
    costPerSecond: "0.05",
    inputCostPerMillion: "0.5",
    outputCostPerMillion: "1.5",
  };

  if (!initialValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(initialValue) as Record<string, unknown>;
    const billingMode = typeof parsed.billingMode === "string" ? parsed.billingMode : fallback.billingMode;
    if (!billingModeOptions.some((item) => item.value === billingMode)) {
      return fallback;
    }

    return {
      ...fallback,
      billingMode: billingMode as BillingMode,
      currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
      costPerRequest: String(parsed.costPerRequest ?? fallback.costPerRequest),
      costPerImage: String(parsed.costPerImage ?? fallback.costPerImage),
      costPerVideo: String(parsed.costPerVideo ?? fallback.costPerVideo),
      costPerSecond: String(parsed.costPerSecond ?? fallback.costPerSecond),
      inputCostPerMillion: String(parsed.inputCostPerMillion ?? fallback.inputCostPerMillion),
      outputCostPerMillion: String(parsed.outputCostPerMillion ?? fallback.outputCostPerMillion),
    };
  } catch {
    return fallback;
  }
}

function buildBillingConfigValue(state: BillingFormState) {
  const base = {
    billingMode: state.billingMode,
    currency: state.currency.trim() || "USD",
  };

  switch (state.billingMode) {
    case "per_request":
      return JSON.stringify({ ...base, costPerRequest: Number(state.costPerRequest) });
    case "per_image":
      return JSON.stringify({ ...base, costPerImage: Number(state.costPerImage) });
    case "per_video":
      return JSON.stringify({ ...base, costPerVideo: Number(state.costPerVideo) });
    case "per_second":
      return JSON.stringify({ ...base, costPerSecond: Number(state.costPerSecond) });
    case "per_million_tokens":
      return JSON.stringify({
        ...base,
        inputCostPerMillion: Number(state.inputCostPerMillion),
        outputCostPerMillion: Number(state.outputCostPerMillion),
      });
  }
}

function FieldHint({
  help,
  example,
}: {
  help?: string;
  example?: string;
}) {
  return (
    <>
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
      {example ? (
        <span className="mt-1 block text-xs leading-5 text-black/40">
          Example: <code className="rounded bg-black/[0.04] px-1 py-0.5 text-[11px]">{example}</code>
        </span>
      ) : null}
    </>
  );
}

function capabilityLabel(value: SupportedModelOption["capability"]) {
  if (value === "image_generation") return "image_generation";
  if (value === "image_edit") return "image_edit";
  if (value === "video_generation") return "video_generation";
  return "unknown";
}

function BillingNumberField({
  label,
  value,
  onChange,
  help,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">{label}</span>
      <input
        type="number"
        min="0.000001"
        step="0.000001"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
        className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20"
      />
      {help ? <span className="mt-2 block text-xs leading-5 text-black/50">{help}</span> : null}
    </label>
  );
}

export function BillingConfigEditor({
  name = "billingConfig",
  initialValue,
}: {
  name?: string;
  initialValue?: string;
}) {
  const [state, setState] = useState(() => parseBillingFormState(initialValue));
  const selectedMode = billingModeOptions.find((item) => item.value === state.billingMode) ?? billingModeOptions[0];
  const hiddenValue = buildBillingConfigValue(state);

  return (
    <div className="rounded-sm border border-black/8 bg-white p-3">
      <input type="hidden" name={name} value={hiddenValue} />
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px]">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Billing Mode</span>
          <select
            value={state.billingMode}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                billingMode: event.target.value as BillingMode,
              }))
            }
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20"
          >
            {billingModeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FieldHint help={selectedMode.help} />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Currency</span>
          <input
            value={state.currency}
            onChange={(event) =>
              setState((current) => ({
                ...current,
                currency: event.target.value.toUpperCase(),
              }))
            }
            required
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20"
          />
        </label>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {state.billingMode === "per_request" ? (
          <BillingNumberField
            label="Cost Per Request"
            value={state.costPerRequest}
            onChange={(value) => setState((current) => ({ ...current, costPerRequest: value }))}
          />
        ) : null}
        {state.billingMode === "per_image" ? (
          <BillingNumberField
            label="Cost Per Image"
            value={state.costPerImage}
            onChange={(value) => setState((current) => ({ ...current, costPerImage: value }))}
          />
        ) : null}
        {state.billingMode === "per_video" ? (
          <BillingNumberField
            label="Cost Per Video"
            value={state.costPerVideo}
            onChange={(value) => setState((current) => ({ ...current, costPerVideo: value }))}
          />
        ) : null}
        {state.billingMode === "per_second" ? (
          <BillingNumberField
            label="Cost Per Second"
            value={state.costPerSecond}
            onChange={(value) => setState((current) => ({ ...current, costPerSecond: value }))}
            help="Worker reads duration from request input or provider output."
          />
        ) : null}
        {state.billingMode === "per_million_tokens" ? (
          <>
            <BillingNumberField
              label="Input Cost Per 1M Tokens"
              value={state.inputCostPerMillion}
              onChange={(value) => setState((current) => ({ ...current, inputCostPerMillion: value }))}
            />
            <BillingNumberField
              label="Output Cost Per 1M Tokens"
              value={state.outputCostPerMillion}
              onChange={(value) => setState((current) => ({ ...current, outputCostPerMillion: value }))}
            />
          </>
        ) : null}
      </div>

      <div className="mt-3 rounded-sm bg-[#faf9f6] px-3 py-2">
        <p className="text-[11px] tracking-[0.35px] text-black/45">Generated billing config</p>
        <code className="mt-1 block break-all text-xs leading-5 text-black/55">{hiddenValue}</code>
      </div>
    </div>
  );
}

export function CreateProviderModelForm({
  supportedModels,
  providers,
  defaultSupportedModelSlug,
  defaultUpstreamModelSlug,
  defaultPricing,
  defaultInputSchema,
  defaultOutputSchema,
  disabled,
}: {
  supportedModels: SupportedModelOption[];
  providers: ProviderOption[];
  defaultSupportedModelSlug?: string;
  defaultUpstreamModelSlug?: string;
  defaultPricing?: string;
  defaultInputSchema?: string;
  defaultOutputSchema?: string;
  disabled: boolean;
}) {
  const fallbackSupportedModelId = supportedModels[0]?.id ?? "";
  const templateSupportedModelId =
    supportedModels.find((item) => item.modelSlug === defaultSupportedModelSlug)?.id ??
    fallbackSupportedModelId;
  const [supportedModelId, setSupportedModelId] = useState(templateSupportedModelId);

  useEffect(() => {
    setSupportedModelId(templateSupportedModelId);
  }, [templateSupportedModelId]);

  const selectedSupportedModel =
    supportedModels.find((item) => item.id === supportedModelId) ?? null;

  return (
    <form action={createProviderModel} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Public Model</span>
          <select
            name="supportedModelId"
            value={supportedModelId}
            onChange={(event) => setSupportedModelId(event.target.value)}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            {supportedModels.length > 0 ? (
              supportedModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} ({item.modelSlug})
                </option>
              ))
            ) : (
              <option value="">Add a public model first</option>
            )}
          </select>
          <FieldHint
            help="Choose the customer-facing capability this provider model implements. Capability is inferred from the selected public model."
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Provider</span>
          <select
            name="providerId"
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            {providers.length > 0 ? (
              providers.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.slug})
                </option>
              ))
            ) : (
              <option value="">Add a provider first</option>
            )}
          </select>
          <FieldHint help="Choose which provider exposes this upstream model." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Capability</span>
          <input
            value={capabilityLabel(selectedSupportedModel?.capability ?? null)}
            readOnly
            className="h-9 w-full rounded-sm border border-black/10 bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
          />
          <input
            type="hidden"
            name="capability"
            value={selectedSupportedModel?.capability ?? ""}
          />
          <FieldHint help="Locked to the selected public model so image and video implementations cannot be mixed." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Upstream Model Slug</span>
          <input
            name="upstreamModelSlug"
            defaultValue={defaultUpstreamModelSlug}
            placeholder="gemini-2.5-flash-image"
            required
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="Real upstream model identifier required by the provider API."
            example="gemini-2.5-flash-image"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Pricing JSON</span>
          <textarea
            name="pricing"
            rows={4}
            defaultValue={defaultPricing ?? "{}"}
            disabled={disabled}
            className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="Optional internal cost and billing metadata for this provider model."
            example='{"billingMode":"per_image","costPerUnit":0.04,"currency":"USD"}'
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Input Schema JSON</span>
          <textarea
            name="inputSchema"
            rows={4}
            defaultValue={defaultInputSchema ?? "{}"}
            disabled={disabled}
            className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="Optional description of accepted request fields."
            example='{"prompt":{"type":"string","required":true},"size":{"type":"string"}}'
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Output Schema JSON</span>
          <textarea
            name="outputSchema"
            rows={4}
            defaultValue={defaultOutputSchema ?? "{}"}
            disabled={disabled}
            className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="Optional description of the normalized output structure."
            example='{"images":{"type":"array"},"mimeType":{"type":"string"}}'
          />
        </label>

        <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
          <input
            type="checkbox"
            name="active"
            defaultChecked
            disabled={disabled}
            className="size-4 rounded border-black/20 bg-white accent-black"
          />
          Active on create
        </label>
      </div>

      <div className="mt-4">
        <SubmitButton
          label="Add provider model"
          disabled={disabled || !selectedSupportedModel?.capability}
        />
      </div>
    </form>
  );
}

export function CreateRoutingRuleForm({
  supportedModels,
  providerModels,
  defaultStrategy,
  defaultWorkspaceScope,
  disabled,
}: {
  supportedModels: SupportedModelOption[];
  providerModels: ProviderModelOption[];
  defaultStrategy?: string;
  defaultWorkspaceScope?: string;
  disabled: boolean;
}) {
  const initialSupportedModelId = supportedModels[0]?.id ?? "";
  const [supportedModelId, setSupportedModelId] = useState(initialSupportedModelId);

  useEffect(() => {
    setSupportedModelId(initialSupportedModelId);
  }, [initialSupportedModelId]);

  const selectedSupportedModel =
    supportedModels.find((item) => item.id === supportedModelId) ?? null;
  const filteredProviderModels = providerModels.filter(
    (item) =>
      item.supportedModelId === supportedModelId &&
      item.capability === selectedSupportedModel?.capability
  );

  return (
    <form action={createRoutingRule} className="rounded-sm border border-black/10 bg-[#faf9f6] p-4">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Public Model</span>
          <select
            name="supportedModelId"
            value={supportedModelId}
            onChange={(event) => setSupportedModelId(event.target.value)}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            {supportedModels.length > 0 ? (
              supportedModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} ({item.modelSlug})
                </option>
              ))
            ) : (
              <option value="">Add a public model first</option>
            )}
          </select>
          <FieldHint help="Select the customer-facing capability that should go online." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Capability</span>
          <input
            value={capabilityLabel(selectedSupportedModel?.capability ?? null)}
            readOnly
            className="h-9 w-full rounded-sm border border-black/10 bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
          />
          <input
            type="hidden"
            name="capability"
            value={selectedSupportedModel?.capability ?? ""}
          />
          <FieldHint help="Locked to the selected public model." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Primary Provider Model</span>
          <select
            name="primaryProviderModelId"
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            {filteredProviderModels.length > 0 ? (
              filteredProviderModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.supportedModelName} / {item.providerName} / {item.upstreamModelSlug}
                </option>
              ))
            ) : (
              <option value="">No compatible provider models yet</option>
            )}
          </select>
          <FieldHint help="Only implementations that belong to this public model and capability are shown." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Fallback Provider Model</span>
          <select
            name="fallbackProviderModelId"
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            <option value="">No fallback</option>
            {filteredProviderModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.supportedModelName} / {item.providerName} / {item.upstreamModelSlug}
              </option>
            ))}
          </select>
          <FieldHint help="Optional backup implementation from the same public model." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Scope</span>
          <select
            name="workspaceScope"
            defaultValue={defaultWorkspaceScope}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            <option value="workspace">Workspace override</option>
            <option value="global">Global route</option>
          </select>
          <FieldHint help="Global route affects platform defaults. Workspace override is only for one workspace." />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Strategy</span>
          <select
            name="routeStrategy"
            defaultValue={defaultStrategy}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            <option value="primary_then_fallback">primary_then_fallback</option>
            <option value="primary_only">primary_only</option>
            <option value="manual_failover">manual_failover</option>
            <option value="route_by_capability_tag">route_by_capability_tag</option>
          </select>
          <FieldHint help="Use primary_only when only one implementation exists. Use primary_then_fallback when you have a real backup." />
        </label>

        <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
          <input
            type="checkbox"
            name="active"
            defaultChecked
            disabled={disabled}
            className="size-4 rounded border-black/20 bg-white accent-black"
          />
          Active on create
        </label>
      </div>

      <div className="mt-4">
        <SubmitButton
          label="Add routing rule"
          disabled={disabled || !selectedSupportedModel?.capability || filteredProviderModels.length === 0}
        />
      </div>
    </form>
  );
}
