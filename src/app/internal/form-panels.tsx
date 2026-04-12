"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
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

type BillingFormState = {
  currency: string;
  chargePerRequest: boolean;
  chargePerImage: boolean;
  chargePerVideo: boolean;
  chargePerSecond: boolean;
  chargeInputTokens: boolean;
  chargeOutputTokens: boolean;
  costPerRequest: string;
  costPerImage: string;
  costPerVideo: string;
  costPerSecond: string;
  inputCostPerMillion: string;
  outputCostPerMillion: string;
};

function parseBillingFormState(initialValue?: string): BillingFormState {
  const fallback: BillingFormState = {
    currency: "USD",
    chargePerRequest: false,
    chargePerImage: true,
    chargePerVideo: false,
    chargePerSecond: false,
    chargeInputTokens: false,
    chargeOutputTokens: false,
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
    if (parsed.billingMode === "hybrid" && parsed.charges && typeof parsed.charges === "object") {
      const charges = parsed.charges as Record<string, unknown>;
      return {
        ...fallback,
        currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
        chargePerRequest: charges.perRequest !== undefined,
        chargePerImage: charges.perImage !== undefined,
        chargePerVideo: charges.perVideo !== undefined,
        chargePerSecond: charges.perSecond !== undefined,
        chargeInputTokens: charges.inputTextTokensPerMillion !== undefined,
        chargeOutputTokens: charges.outputTextTokensPerMillion !== undefined,
        costPerRequest: String(charges.perRequest ?? fallback.costPerRequest),
        costPerImage: String(charges.perImage ?? fallback.costPerImage),
        costPerVideo: String(charges.perVideo ?? fallback.costPerVideo),
        costPerSecond: String(charges.perSecond ?? fallback.costPerSecond),
        inputCostPerMillion: String(
          charges.inputTextTokensPerMillion ?? fallback.inputCostPerMillion
        ),
        outputCostPerMillion: String(
          charges.outputTextTokensPerMillion ?? fallback.outputCostPerMillion
        ),
      };
    }

    return {
      ...fallback,
      currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
      chargePerRequest: parsed.billingMode === "per_request",
      chargePerImage: parsed.billingMode === "per_image",
      chargePerVideo: parsed.billingMode === "per_video",
      chargePerSecond: parsed.billingMode === "per_second",
      chargeInputTokens: parsed.billingMode === "per_million_tokens",
      chargeOutputTokens: parsed.billingMode === "per_million_tokens",
      costPerRequest: String(parsed.costPerRequest ?? parsed.costPerUnit ?? fallback.costPerRequest),
      costPerImage: String(parsed.costPerImage ?? parsed.costPerUnit ?? fallback.costPerImage),
      costPerVideo: String(parsed.costPerVideo ?? parsed.costPerUnit ?? fallback.costPerVideo),
      costPerSecond: String(parsed.costPerSecond ?? parsed.costPerUnit ?? fallback.costPerSecond),
      inputCostPerMillion: String(parsed.inputCostPerMillion ?? fallback.inputCostPerMillion),
      outputCostPerMillion: String(parsed.outputCostPerMillion ?? fallback.outputCostPerMillion),
    };
  } catch {
    return fallback;
  }
}

function buildBillingConfigValue(state: BillingFormState) {
  const charges: Record<string, number> = {};

  if (state.chargePerRequest) {
    charges.perRequest = Number(state.costPerRequest);
  }
  if (state.chargePerImage) {
    charges.perImage = Number(state.costPerImage);
  }
  if (state.chargePerVideo) {
    charges.perVideo = Number(state.costPerVideo);
  }
  if (state.chargePerSecond) {
    charges.perSecond = Number(state.costPerSecond);
  }
  if (state.chargeInputTokens) {
    charges.inputTextTokensPerMillion = Number(state.inputCostPerMillion);
  }
  if (state.chargeOutputTokens) {
    charges.outputTextTokensPerMillion = Number(state.outputCostPerMillion);
  }

  return JSON.stringify({
    billingMode: "hybrid",
    currency: state.currency.trim() || "USD",
    charges,
  });
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
          示例：<code className="rounded bg-black/[0.04] px-1 py-0.5 text-[11px]">{example}</code>
        </span>
      ) : null}
    </>
  );
}

function capabilityLabel(value: SupportedModelOption["capability"]) {
  if (value === "image_generation") return "图片生成";
  if (value === "image_edit") return "图片编辑";
  if (value === "video_generation") return "视频生成";
  return "未知";
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
  componentHint = "启用一个或多个计费维度。Gemini 2.5 Flash Image 通常按输入 token 和输出图片共同计费。",
  generatedLabel = "生成的计费配置",
}: {
  name?: string;
  initialValue?: string;
  componentHint?: string;
  generatedLabel?: string;
}) {
  const [state, setState] = useState(() => parseBillingFormState(initialValue));
  const hiddenValue = buildBillingConfigValue(state);

  return (
    <div className="rounded-sm border border-black/8 bg-white p-3">
      <input type="hidden" name={name} value={hiddenValue} />
      <div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)]">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">币种</span>
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

        <div className="rounded-sm border border-black/8 bg-[#faf9f6] px-3 py-3">
          <p className="text-[11px] tracking-[0.35px] text-black/45">计费组件</p>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            {[
              ["chargePerRequest", "按请求"],
              ["chargePerImage", "按图片"],
              ["chargePerVideo", "按视频"],
              ["chargePerSecond", "按秒"],
              ["chargeInputTokens", "输入 Token"],
              ["chargeOutputTokens", "输出 Token"],
            ].map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 rounded-sm border border-black/8 bg-white px-3 py-2 text-sm text-black/72"
              >
                <input
                  type="checkbox"
                  checked={Boolean(state[key as keyof BillingFormState])}
                  onChange={(event) =>
                    setState((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                  className="size-4 rounded border-black/20 bg-white accent-black"
                />
                {label}
              </label>
            ))}
          </div>
          <FieldHint help={componentHint} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {state.chargePerRequest ? (
          <BillingNumberField
            label="每次请求成本"
            value={state.costPerRequest}
            onChange={(value) => setState((current) => ({ ...current, costPerRequest: value }))}
          />
        ) : null}
        {state.chargePerImage ? (
          <BillingNumberField
            label="每张图片成本"
            value={state.costPerImage}
            onChange={(value) => setState((current) => ({ ...current, costPerImage: value }))}
          />
        ) : null}
        {state.chargePerVideo ? (
          <BillingNumberField
            label="每个视频成本"
            value={state.costPerVideo}
            onChange={(value) => setState((current) => ({ ...current, costPerVideo: value }))}
          />
        ) : null}
        {state.chargePerSecond ? (
          <BillingNumberField
            label="每秒成本"
            value={state.costPerSecond}
            onChange={(value) => setState((current) => ({ ...current, costPerSecond: value }))}
            help="后台任务会从请求参数或供应商返回结果中读取时长。"
          />
        ) : null}
        {state.chargeInputTokens ? (
          <>
            <BillingNumberField
              label="每百万输入 Token 成本"
              value={state.inputCostPerMillion}
              onChange={(value) => setState((current) => ({ ...current, inputCostPerMillion: value }))}
            />
          </>
        ) : null}
        {state.chargeOutputTokens ? (
          <BillingNumberField
            label="每百万输出 Token 成本"
            value={state.outputCostPerMillion}
            onChange={(value) => setState((current) => ({ ...current, outputCostPerMillion: value }))}
          />
        ) : null}
      </div>

      <div className="mt-3 rounded-sm bg-[#faf9f6] px-3 py-2">
        <p className="text-[11px] tracking-[0.35px] text-black/45">{generatedLabel}</p>
        <code className="mt-1 block break-all text-xs leading-5 text-black/55">{hiddenValue}</code>
      </div>
    </div>
  );
}

export function CreateProviderModelForm({
  action = createProviderModel,
  supportedModels,
  providers,
  defaultSupportedModelSlug,
  defaultProviderId,
  defaultUpstreamModelSlug,
  defaultPricing,
  defaultInputSchema,
  defaultOutputSchema,
  defaultActive = true,
  providerModelId,
  disabled,
  onSuccess,
  submitLabel = "添加供应商模型",
  className = "rounded-sm border border-black/10 bg-[#faf9f6] p-4",
}: {
  action?: (formData: FormData) => void | Promise<void>;
  supportedModels: SupportedModelOption[];
  providers: ProviderOption[];
  defaultSupportedModelSlug?: string;
  defaultProviderId?: string;
  defaultUpstreamModelSlug?: string;
  defaultPricing?: string;
  defaultInputSchema?: string;
  defaultOutputSchema?: string;
  defaultActive?: boolean;
  providerModelId?: string;
  disabled: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  className?: string;
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
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      action={action}
      className={className}
      onSubmit={() => {
        setSubmitted(true);
      }}
    >
      <FormAutoClose submitted={submitted} onSuccess={onSuccess} />
      {providerModelId ? (
        <input type="hidden" name="providerModelId" value={providerModelId} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">公共模型</span>
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
              <option value="">请先创建公共模型</option>
            )}
          </select>
          <FieldHint
            help="选择这个供应商模型所实现的对外能力。能力类型会跟随所选公共模型自动推断。"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">供应商</span>
          <select
            name="providerId"
            defaultValue={defaultProviderId}
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
              <option value="">请先创建供应商</option>
            )}
          </select>
          <FieldHint help="选择这个上游模型属于哪个供应商。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">能力类型</span>
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
          <FieldHint help="这里跟随公共模型锁定，避免把图片和视频实现混在一起。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上游模型标识</span>
          <input
            name="upstreamModelSlug"
            defaultValue={defaultUpstreamModelSlug}
            placeholder="gemini-2.5-flash-image"
            required
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="填写供应商 API 真实使用的模型标识。"
            example="gemini-2.5-flash-image"
          />
        </label>

        <div className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">供应商成本配置</span>
          <BillingConfigEditor
            name="pricing"
            initialValue={defaultPricing}
            componentHint="按供应商真实结算方式填写内部成本。这里决定请求的 provider cost。"
            generatedLabel="生成的供应商计费配置"
          />
        </div>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">输入 Schema JSON</span>
          <textarea
            name="inputSchema"
            rows={4}
            defaultValue={defaultInputSchema ?? "{}"}
            disabled={disabled}
            className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="可选，描述这个上游模型接收哪些请求字段。"
            example='{"prompt":{"type":"string","required":true},"size":{"type":"string"}}'
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">输出 Schema JSON</span>
          <textarea
            name="outputSchema"
            rows={4}
            defaultValue={defaultOutputSchema ?? "{}"}
            disabled={disabled}
            className="w-full rounded-sm border border-black/10 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          />
          <FieldHint
            help="可选，描述标准化后的输出结构。"
            example='{"images":{"type":"array"},"mimeType":{"type":"string"}}'
          />
        </label>

        <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaultActive}
            disabled={disabled}
            className="size-4 rounded border-black/20 bg-white accent-black"
          />
          启用
        </label>
      </div>

      <div className="mt-4">
        <SubmitButton
          label={submitLabel}
          disabled={disabled || !selectedSupportedModel?.capability}
        />
      </div>
    </form>
  );
}

export function CreateRoutingRuleForm({
  action = createRoutingRule,
  supportedModels,
  providerModels,
  defaultSupportedModelId,
  defaultPrimaryProviderModelId,
  defaultFallbackProviderModelId,
  defaultStrategy,
  defaultWorkspaceScope,
  defaultActive = true,
  routingRuleId,
  disabled,
  onSuccess,
  submitLabel = "添加路由规则",
  className = "rounded-sm border border-black/10 bg-[#faf9f6] p-4",
}: {
  action?: (formData: FormData) => void | Promise<void>;
  supportedModels: SupportedModelOption[];
  providerModels: ProviderModelOption[];
  defaultSupportedModelId?: string;
  defaultPrimaryProviderModelId?: string;
  defaultFallbackProviderModelId?: string;
  defaultStrategy?: string;
  defaultWorkspaceScope?: string;
  defaultActive?: boolean;
  routingRuleId?: string;
  disabled: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  const initialSupportedModelId = defaultSupportedModelId ?? supportedModels[0]?.id ?? "";
  const [supportedModelId, setSupportedModelId] = useState(initialSupportedModelId);
  const [submitted, setSubmitted] = useState(false);

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
    <form
      action={action}
      className={className}
      onSubmit={() => {
        setSubmitted(true);
      }}
    >
      <FormAutoClose submitted={submitted} onSuccess={onSuccess} />
      {routingRuleId ? (
        <input type="hidden" name="routingRuleId" value={routingRuleId} />
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">公共模型</span>
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
              <option value="">请先创建公共模型</option>
            )}
          </select>
          <FieldHint help="选择要上线的客户侧能力入口。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">能力类型</span>
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
          <FieldHint help="跟随所选公共模型自动锁定。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">主供应商模型</span>
          <select
            name="primaryProviderModelId"
            defaultValue={defaultPrimaryProviderModelId}
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
              <option value="">暂无兼容的供应商模型</option>
            )}
          </select>
          <FieldHint help="这里只展示属于当前公共模型和能力类型的实现。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">回退供应商模型</span>
          <select
            name="fallbackProviderModelId"
            defaultValue={defaultFallbackProviderModelId}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            <option value="">不设置回退</option>
            {filteredProviderModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.supportedModelName} / {item.providerName} / {item.upstreamModelSlug}
              </option>
            ))}
          </select>
          <FieldHint help="可选，必须来自同一个公共模型的备用实现。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">生效范围</span>
          <select
            name="workspaceScope"
            defaultValue={defaultWorkspaceScope}
            disabled={disabled}
            className="h-9 w-full rounded-sm border border-black/10 bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 disabled:bg-black/[0.03] disabled:text-black/35"
          >
            <option value="workspace">当前工作区覆盖</option>
            <option value="global">全局默认路由</option>
          </select>
          <FieldHint help="全局路由影响平台默认行为；工作区覆盖只影响当前空间。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">路由策略</span>
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
          <FieldHint help="只有一个实现时用 primary_only；有真实备用供应商时用 primary_then_fallback。" />
        </label>

        <label className="flex items-center gap-3 rounded-sm border border-black/10 bg-white px-3 py-3 text-sm text-black/72">
          <input
            type="checkbox"
            name="active"
            defaultChecked={defaultActive}
            disabled={disabled}
            className="size-4 rounded border-black/20 bg-white accent-black"
          />
          启用
        </label>
      </div>

      <div className="mt-4">
        <SubmitButton
          label={submitLabel}
          disabled={disabled || !selectedSupportedModel?.capability || filteredProviderModels.length === 0}
        />
      </div>
    </form>
  );
}

function FormAutoClose({
  submitted,
  onSuccess,
}: {
  submitted: boolean;
  onSuccess?: () => void;
}) {
  const { pending } = useFormStatus();

  useEffect(() => {
    if (submitted && !pending && onSuccess) {
      onSuccess();
    }
  }, [onSuccess, pending, submitted]);

  return null;
}
