"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
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

type WorkerTemplateOption = {
  id: string;
  displayName: string;
  slug: string;
};

type ExecutionConfigPresetOption = {
  id: string;
  label: string;
  executionTemplate: string;
  executionConfigText: string;
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

type ExecutionConfigFormState = {
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
  submitBodyTemplate: string;
};

type SchemaFieldState = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
  exposedToCustomer: boolean;
};

function templateExecutionPreset(slug?: string): Partial<ExecutionConfigFormState> {
  if (slug === "sync-json-v1") {
    return {
      mode: "sync",
      submitPath: "/v1beta/models/{upstreamModel}:generateContent",
      pollPath: "",
      taskIdPath: "responseId",
      statusPath: "",
      resultUrlPath: "candidates.0.content.parts.0.inlineData.data",
      resultValueType: "base64",
      resultMimeType: "image/png",
      authType: "query",
      authQueryParam: "key",
      submitBodyTemplate:
        '{\n  "contents": [\n    {\n      "parts": [\n        {\n          "text": "{{prompt}}"\n        }\n      ]\n    }\n  ],\n  "generationConfig": {\n    "responseModalities": ["IMAGE"]\n  }\n}',
    };
  }
  if (slug === "upload-async-poll-v1") {
    return {
      mode: "async",
      submitPath: "/v1/models/{upstreamModel}:generate",
      pollPath: "/v1/operations/{taskId}",
      taskIdPath: "name",
      statusPath: "done",
      resultUrlPath: "response.outputUrl",
      resultValueType: "url",
      resultMimeType: "image/png",
    };
  }
  return {
    mode: "async",
    submitPath: "/v1/models/{upstreamModel}:generate",
    pollPath: "/v1/operations/{taskId}",
    taskIdPath: "name",
    statusPath: "done",
    resultUrlPath: "response.outputUrl",
    resultValueType: "url",
    resultMimeType: "image/png",
  };
}

function randomFieldId() {
  return Math.random().toString(36).slice(2, 10);
}

function parseSchemaFieldsFromText(schemaText: string, key: "params" | "fields") {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    const raw = parsed[key];
    if (!Array.isArray(raw)) {
      return [] as SchemaFieldState[];
    }
    return raw
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          return null;
        }
        const row = item as Record<string, unknown>;
        const name = typeof row.name === "string" ? row.name.trim() : "";
        if (!name) {
          return null;
        }
        return {
          id: randomFieldId(),
          name,
          type: typeof row.type === "string" ? row.type : "",
          required: Boolean(row.required),
          description: typeof row.description === "string" ? row.description : "",
          example: row.example !== undefined && row.example !== null ? String(row.example) : "",
          exposedToCustomer:
            typeof row.exposedToCustomer === "boolean"
              ? row.exposedToCustomer
              : typeof row.customerVisible === "boolean"
                ? row.customerVisible
                : true,
        } satisfies SchemaFieldState;
      })
      .filter((row): row is SchemaFieldState => Boolean(row));
  } catch {
    return [] as SchemaFieldState[];
  }
}

function parseOfficialDocUrl(schemaText: string) {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    return typeof parsed.officialDocUrl === "string" ? parsed.officialDocUrl : "";
  } catch {
    return "";
  }
}

function SchemaFieldEditor({
  name,
  keyName,
  defaultSchemaText,
  includeRequired,
  disabled,
}: {
  name: "inputSchema" | "outputSchema";
  keyName: "params" | "fields";
  defaultSchemaText: string;
  includeRequired: boolean;
  disabled: boolean;
}) {
  const [officialDocUrl, setOfficialDocUrl] = useState(() => parseOfficialDocUrl(defaultSchemaText));
  const [rows, setRows] = useState<SchemaFieldState[]>(() =>
    parseSchemaFieldsFromText(defaultSchemaText, keyName)
  );

  useEffect(() => {
    setOfficialDocUrl(parseOfficialDocUrl(defaultSchemaText));
    setRows(parseSchemaFieldsFromText(defaultSchemaText, keyName));
  }, [defaultSchemaText, keyName]);

  const addRow = () => {
    setRows((current) => [
      ...current,
      {
        id: randomFieldId(),
        name: "",
        type: "",
        required: false,
        description: "",
        example: "",
        exposedToCustomer: true,
      },
    ]);
  };

  const updateRow = (id: string, updater: (row: SchemaFieldState) => SchemaFieldState) => {
    setRows((current) => current.map((row) => (row.id === id ? updater(row) : row)));
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const normalizedRows = rows
    .map((row) => ({
      name: row.name.trim(),
      type: row.type.trim(),
      required: row.required,
      description: row.description.trim(),
      example: row.example.trim(),
      exposedToCustomer: row.exposedToCustomer,
    }))
    .filter((row) => row.name.length > 0);

  const schemaValue = JSON.stringify(
    {
      officialDocUrl: officialDocUrl.trim(),
      [keyName]: normalizedRows.map((row) => ({
        name: row.name,
        type: row.type || undefined,
        ...(includeRequired ? { required: row.required } : {}),
        description: row.description || undefined,
        example: row.example || undefined,
        exposedToCustomer: row.exposedToCustomer,
      })),
    },
    null,
    2
  );

  return (
    <div className="space-y-3 rounded-xl border border-black/[0.08] bg-white p-3">
      <input type="hidden" name={name} value={schemaValue} />

      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Official Doc URL</span>
        <input
          value={officialDocUrl}
          onChange={(event) => setOfficialDocUrl(event.target.value)}
          disabled={disabled}
          className={formInputClassName}
          placeholder="https://provider-docs.example.com/..."
        />
      </label>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-2 md:grid-cols-12">
            <input
              value={row.name}
              onChange={(event) => updateRow(row.id, (current) => ({ ...current, name: event.target.value }))}
              disabled={disabled}
              className="md:col-span-2 h-9 rounded-md border border-black/[0.08] bg-white px-2 text-xs"
              placeholder="name"
            />
            <input
              value={row.type}
              onChange={(event) => updateRow(row.id, (current) => ({ ...current, type: event.target.value }))}
              disabled={disabled}
              className="md:col-span-2 h-9 rounded-md border border-black/[0.08] bg-white px-2 text-xs"
              placeholder="type"
            />
            <input
              value={row.description}
              onChange={(event) => updateRow(row.id, (current) => ({ ...current, description: event.target.value }))}
              disabled={disabled}
              className="md:col-span-4 h-9 rounded-md border border-black/[0.08] bg-white px-2 text-xs"
              placeholder="description"
            />
            <input
              value={row.example}
              onChange={(event) => updateRow(row.id, (current) => ({ ...current, example: event.target.value }))}
              disabled={disabled}
              className="md:col-span-2 h-9 rounded-md border border-black/[0.08] bg-white px-2 text-xs"
              placeholder="example"
            />
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              {includeRequired ? (
                <label className="inline-flex items-center gap-1 text-[11px] text-black/65">
                  <input
                    type="checkbox"
                    checked={row.required}
                    onChange={(event) =>
                      updateRow(row.id, (current) => ({ ...current, required: event.target.checked }))
                    }
                    disabled={disabled}
                    className="size-3.5"
                  />
                  Required
                </label>
              ) : null}
              <label className="inline-flex items-center gap-1 text-[11px] text-black/65">
                <input
                  type="checkbox"
                  checked={row.exposedToCustomer}
                  onChange={(event) =>
                    updateRow(row.id, (current) => ({
                      ...current,
                      exposedToCustomer: event.target.checked,
                    }))
                  }
                  disabled={disabled}
                  className="size-3.5"
                />
                Expose
              </label>
              <button
                type="button"
                onClick={() => removeRow(row.id)}
                disabled={disabled}
                className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-black/[0.04] disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={addRow}
          disabled={disabled}
          className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-black/[0.03] disabled:opacity-50"
        >
          Add Field
        </button>
        <span className="text-[11px] text-black/45">{rows.length} field(s)</span>
      </div>

      <details className="rounded-md border border-black/[0.08] bg-[#FCFCFA] p-2">
        <summary className="cursor-pointer text-[11px] text-black/60">JSON Preview</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-black/70">
          {schemaValue}
        </pre>
      </details>
    </div>
  );
}

const formInputClassName =
  "h-10 w-full rounded-md border border-black/[0.08] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formTextAreaClassName =
  "w-full rounded-md border border-black/[0.08] bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formSelectClassName =
  "h-10 w-full rounded-md border border-black/[0.08] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const panelSurfaceClassName = "rounded-2xl border border-black/[0.08] bg-[#FCFCFA] p-4 shadow-sm";

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

function parseExecutionConfigState(initialValue?: string): ExecutionConfigFormState {
  const fallback: ExecutionConfigFormState = {
    mode: "auto",
    authType: "bearer",
    authHeaderName: "Authorization",
    authHeaderPrefix: "Bearer",
    authQueryParam: "key",
    resultValueType: "url",
    resultMimeType: "image/png",
    submitPath: "/v1/models/{upstreamModel}:generate",
    pollPath: "/v1/operations/{taskId}",
    taskIdPath: "name",
    statusPath: "done",
    resultUrlPath: "response.outputUrl",
    submitBodyTemplate: "",
  };

  if (!initialValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(initialValue) as Record<string, unknown>;
    return {
      mode:
        typeof parsed.mode === "string" && parsed.mode.trim().length > 0
          ? parsed.mode
          : fallback.mode,
      authType:
        typeof parsed.authType === "string" && parsed.authType.trim().length > 0
          ? parsed.authType
          : fallback.authType,
      authHeaderName:
        typeof parsed.authHeaderName === "string" && parsed.authHeaderName.trim().length > 0
          ? parsed.authHeaderName
          : fallback.authHeaderName,
      authHeaderPrefix:
        typeof parsed.authHeaderPrefix === "string"
          ? parsed.authHeaderPrefix
          : fallback.authHeaderPrefix,
      authQueryParam:
        typeof parsed.authQueryParam === "string" && parsed.authQueryParam.trim().length > 0
          ? parsed.authQueryParam
          : fallback.authQueryParam,
      resultValueType:
        typeof parsed.resultValueType === "string" && parsed.resultValueType.trim().length > 0
          ? parsed.resultValueType
          : fallback.resultValueType,
      resultMimeType:
        typeof parsed.resultMimeType === "string" && parsed.resultMimeType.trim().length > 0
          ? parsed.resultMimeType
          : fallback.resultMimeType,
      submitPath:
        typeof parsed.submitPath === "string" && parsed.submitPath.trim().length > 0
          ? parsed.submitPath
          : fallback.submitPath,
      pollPath:
        typeof parsed.pollPath === "string" && parsed.pollPath.trim().length > 0
          ? parsed.pollPath
          : fallback.pollPath,
      taskIdPath:
        typeof parsed.taskIdPath === "string" && parsed.taskIdPath.trim().length > 0
          ? parsed.taskIdPath
          : fallback.taskIdPath,
      statusPath:
        typeof parsed.statusPath === "string" && parsed.statusPath.trim().length > 0
          ? parsed.statusPath
          : fallback.statusPath,
      resultUrlPath:
        typeof parsed.resultUrlPath === "string" && parsed.resultUrlPath.trim().length > 0
          ? parsed.resultUrlPath
          : fallback.resultUrlPath,
      submitBodyTemplate:
        typeof parsed.submitBodyTemplate === "string"
          ? parsed.submitBodyTemplate
          : parsed.submitBodyTemplate &&
              typeof parsed.submitBodyTemplate === "object" &&
              !Array.isArray(parsed.submitBodyTemplate)
            ? JSON.stringify(parsed.submitBodyTemplate, null, 2)
            : fallback.submitBodyTemplate,
    };
  } catch {
    return fallback;
  }
}

function buildExecutionConfigValue(state: ExecutionConfigFormState) {
  const normalizedMode = state.mode.trim();
  const shouldPersistAsyncFields = normalizedMode === "async";
  const result: Record<string, unknown> = {
    mode: normalizedMode,
    authType: state.authType.trim(),
    authHeaderName: state.authHeaderName.trim(),
    authHeaderPrefix: state.authHeaderPrefix.trim(),
    authQueryParam: state.authQueryParam.trim(),
    resultValueType: state.resultValueType.trim(),
    resultMimeType: state.resultMimeType.trim(),
    submitPath: state.submitPath.trim(),
    taskIdPath: state.taskIdPath.trim(),
    resultUrlPath: state.resultUrlPath.trim(),
  };
  if (shouldPersistAsyncFields) {
    result.pollPath = state.pollPath.trim();
    result.statusPath = state.statusPath.trim();
  }
  const submitBodyTemplateText = state.submitBodyTemplate.trim();
  if (submitBodyTemplateText) {
    try {
      result.submitBodyTemplate = JSON.parse(submitBodyTemplateText);
    } catch {
      result.submitBodyTemplate = submitBodyTemplateText;
    }
  }
  return JSON.stringify(result);
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
        className={formInputClassName}
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
    <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
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
            className={formInputClassName}
          />
        </label>

        <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-3">
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
                className="flex items-center gap-2 rounded-md border border-black/[0.08] bg-white px-3 py-2 text-sm text-black/72"
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

      <div className="mt-3 rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5">
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
  workerTemplates = [],
  executionConfigPresets = [],
  defaultSupportedModelSlug,
  defaultProviderId,
  defaultUpstreamModelSlug,
  defaultPricing,
  defaultPricingSourceUrl,
  defaultPricingSourceNote,
  defaultPricingSourceEvidence = "[]",
  defaultInputSchema = "{}",
  defaultOutputSchema = "{}",
  defaultExecutionTemplate = "rest-async-poll-v1",
  defaultExecutionConfig = '{"submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl"}',
  defaultActive = true,
  providerModelId,
  disabled,
  onSuccess,
  submitLabel = "添加供应商模型",
  className = panelSurfaceClassName,
}: {
  action?: (formData: FormData) => void | Promise<void>;
  supportedModels: SupportedModelOption[];
  providers: ProviderOption[];
  workerTemplates?: WorkerTemplateOption[];
  executionConfigPresets?: ExecutionConfigPresetOption[];
  defaultSupportedModelSlug?: string;
  defaultProviderId?: string;
  defaultUpstreamModelSlug?: string;
  defaultPricing?: string;
  defaultPricingSourceUrl?: string;
  defaultPricingSourceNote?: string;
  defaultPricingSourceEvidence?: string;
  defaultInputSchema?: string;
  defaultOutputSchema?: string;
  defaultExecutionTemplate?: string;
  defaultExecutionConfig?: string;
  defaultActive?: boolean;
  providerModelId?: string;
  disabled: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  className?: string;
}) {
  type ProviderModelFormTab = "basic" | "protocol" | "params" | "cost";
  type SchemaEditorTab = "input" | "output";
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
  const workerTemplateOptions =
    workerTemplates.length > 0
      ? workerTemplates
      : [{ id: "fallback", displayName: "任务轮询（提交后查询）", slug: defaultExecutionTemplate }];
  const [executionTemplate, setExecutionTemplate] = useState(defaultExecutionTemplate);
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [executionConfigState, setExecutionConfigState] = useState(() =>
    parseExecutionConfigState(defaultExecutionConfig)
  );
  const executionConfigValue = buildExecutionConfigValue(executionConfigState);
  const templateIsAsync =
    executionTemplate === "rest-async-poll-v1" || executionTemplate === "upload-async-poll-v1";
  const isAsyncMode = executionConfigState.mode === "async" || (executionConfigState.mode === "auto" && templateIsAsync);
  const [activeTab, setActiveTab] = useState<ProviderModelFormTab>("basic");
  const [schemaEditorTab, setSchemaEditorTab] = useState<SchemaEditorTab>("input");

  useEffect(() => {
    setExecutionTemplate(defaultExecutionTemplate);
    setSelectedPresetId("");
    setExecutionConfigState(parseExecutionConfigState(defaultExecutionConfig));
  }, [defaultExecutionConfig, defaultExecutionTemplate]);

  return (
    <form
      action={action}
      className={className}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const missing: string[] = [];

        const supportedModelValue = String(formData.get("supportedModelId") ?? "").trim();
        const providerValue = String(formData.get("providerId") ?? "").trim();
        const upstreamModelValue = String(formData.get("upstreamModelSlug") ?? "").trim();
        const capabilityValue = String(formData.get("capability") ?? "").trim();

        if (!supportedModelValue) {
          missing.push("可售模型");
        }
        if (!providerValue) {
          missing.push("供应商");
        }
        if (!upstreamModelValue) {
          missing.push("上游模型标识");
        }
        if (!capabilityValue) {
          missing.push("能力类型");
        }
        if (!executionConfigState.submitPath.trim()) {
          missing.push("submitPath");
        }
        if (!executionConfigState.taskIdPath.trim()) {
          missing.push("taskIdPath");
        }
        if (!executionConfigState.resultUrlPath.trim()) {
          missing.push("resultUrlPath");
        }
        if (isAsyncMode && !executionConfigState.pollPath.trim()) {
          missing.push("pollPath");
        }
        if (isAsyncMode && !executionConfigState.statusPath.trim()) {
          missing.push("statusPath");
        }

        if (missing.length > 0) {
          event.preventDefault();
          toast.error(`Missing required fields: ${missing.join(", ")}`);
          return;
        }

        setSubmitted(true);
      }}
    >
      <FormAutoClose submitted={submitted} onSuccess={onSuccess} />
      {providerModelId ? (
        <input type="hidden" name="providerModelId" value={providerModelId} />
      ) : null}
      <input type="hidden" name="pricingSourceEvidence" value={defaultPricingSourceEvidence} />
      <div className="mb-3 flex flex-wrap gap-2">
        {[
          { key: "basic", label: "基本信息" },
          { key: "protocol", label: "调用协议配置" },
          { key: "params", label: "提交参数" },
          { key: "cost", label: "供应商成本配置" },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as ProviderModelFormTab)}
              className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                active
                  ? "border-black bg-black text-white"
                  : "border-black/[0.12] bg-white text-black/70 hover:bg-black/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className={activeTab === "basic" ? "contents" : "hidden"}>
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">可售模型</span>
          <select
            name="supportedModelId"
            value={supportedModelId}
            onChange={(event) => setSupportedModelId(event.target.value)}
            disabled={disabled}
            className={formSelectClassName}
          >
            {supportedModels.length > 0 ? (
              supportedModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} ({item.modelSlug})
                </option>
              ))
            ) : (
              <option value="">请先创建可售模型</option>
            )}
          </select>
          <FieldHint
            help="选择这个供应商模型所实现的对外能力。能力类型会跟随所选可售模型自动推断。"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">供应商</span>
          <select
            name="providerId"
            defaultValue={defaultProviderId}
            disabled={disabled}
            className={formSelectClassName}
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
            className="h-10 w-full rounded-md border border-black/[0.08] bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
          />
          <input
            type="hidden"
            name="capability"
            value={selectedSupportedModel?.capability ?? ""}
          />
          <FieldHint help="这里跟随可售模型锁定，避免把图片和视频实现混在一起。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上游模型标识</span>
          <input
            name="upstreamModelSlug"
            defaultValue={defaultUpstreamModelSlug}
            placeholder="gemini-2.5-flash-image"
            required
            disabled={disabled}
            className={formInputClassName}
          />
          <FieldHint
            help="填写供应商 API 真实使用的模型标识。"
            example="gemini-2.5-flash-image"
          />
        </label>
        <input type="hidden" name="active" value="true" />
        </div>

        <div className={activeTab === "protocol" ? "contents" : "hidden"}>
        <div className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">调用协议配置</span>
          <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
            <label className="block mb-3">
              <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">API 调用格式配置</span>
              <select
                name="executionTemplate"
                value={executionTemplate}
                onChange={(event) => {
                  const nextTemplate = event.target.value;
                  setExecutionTemplate(nextTemplate);
                  const preset = templateExecutionPreset(nextTemplate);
                  setExecutionConfigState((current) => ({
                    ...current,
                    ...preset,
                  }));
                }}
                disabled={disabled}
                className={formSelectClassName}
              >
                {workerTemplateOptions.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.displayName} ({item.slug})
                  </option>
                ))}
              </select>
            </label>
            {executionConfigPresets.length > 0 ? (
              <label className="block mb-3">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">快速填充（复制已有模型）</span>
                <select
                  value={selectedPresetId}
                  onChange={(event) => {
                    const nextPresetId = event.target.value;
                    setSelectedPresetId(nextPresetId);
                    if (!nextPresetId) return;
                    const preset = executionConfigPresets.find((item) => item.id === nextPresetId);
                    if (!preset) return;
                    setExecutionTemplate(preset.executionTemplate);
                    setExecutionConfigState(parseExecutionConfigState(preset.executionConfigText));
                  }}
                  disabled={disabled}
                  className={formSelectClassName}
                >
                  <option value="">选择一个已配置模型并复制其调用协议</option>
                  {executionConfigPresets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <input type="hidden" name="executionConfig" value={executionConfigValue} />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">调用模式</span>
                <select
                  value={executionConfigState.mode}
                  onChange={(event) =>
                    setExecutionConfigState((current) => {
                      const nextMode = event.target.value;
                      if (nextMode === "sync") {
                        return {
                          ...current,
                          mode: nextMode,
                          pollPath: "",
                          statusPath: "",
                        };
                      }
                      return {
                        ...current,
                        mode: nextMode,
                      };
                    })
                  }
                  disabled={disabled}
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
                  value={executionConfigState.authType}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      authType: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  className={formSelectClassName}
                >
                  <option value="bearer">Bearer Header</option>
                  <option value="header">自定义 Header</option>
                  <option value="query">Query 参数</option>
                </select>
              </label>
              {executionConfigState.authType === "query" ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Query 参数名</span>
                  <input
                    value={executionConfigState.authQueryParam}
                    onChange={(event) =>
                      setExecutionConfigState((current) => ({
                        ...current,
                        authQueryParam: event.target.value,
                      }))
                    }
                    disabled={disabled}
                    className={formInputClassName}
                    placeholder="key"
                  />
                </label>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Header 名</span>
                    <input
                      value={executionConfigState.authHeaderName}
                      onChange={(event) =>
                        setExecutionConfigState((current) => ({
                          ...current,
                          authHeaderName: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className={formInputClassName}
                      placeholder={executionConfigState.authType === "bearer" ? "Authorization" : "x-api-key"}
                    />
                  </label>
                  {executionConfigState.authType === "bearer" ? (
                    <label className="block">
                      <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Header 前缀</span>
                      <input
                        value={executionConfigState.authHeaderPrefix}
                        onChange={(event) =>
                          setExecutionConfigState((current) => ({
                            ...current,
                            authHeaderPrefix: event.target.value,
                          }))
                        }
                        disabled={disabled}
                        className={formInputClassName}
                        placeholder="Bearer"
                      />
                    </label>
                  ) : null}
                </>
              )}
              <label className="block">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">提交路径 submitPath</span>
                <input
                  value={executionConfigState.submitPath}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      submitPath: event.target.value,
                    }))
                  }
                  required
                  disabled={disabled}
                  className={formInputClassName}
                  placeholder="/v1/models/{upstreamModel}:generate"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">任务 ID 路径 taskIdPath</span>
                <input
                  value={executionConfigState.taskIdPath}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      taskIdPath: event.target.value,
                    }))
                  }
                  required
                  disabled={disabled}
                  className={formInputClassName}
                  placeholder="name"
                />
              </label>
              {isAsyncMode ? (
                <>
                  <label className="block">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">轮询路径 pollPath</span>
                    <input
                      value={executionConfigState.pollPath}
                      onChange={(event) =>
                        setExecutionConfigState((current) => ({
                          ...current,
                          pollPath: event.target.value,
                        }))
                      }
                      required
                      disabled={disabled}
                      className={formInputClassName}
                      placeholder="/v1/operations/{taskId}"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">完成状态路径 statusPath</span>
                    <input
                      value={executionConfigState.statusPath}
                      onChange={(event) =>
                        setExecutionConfigState((current) => ({
                          ...current,
                          statusPath: event.target.value,
                        }))
                      }
                      required
                      disabled={disabled}
                      className={formInputClassName}
                      placeholder="done"
                    />
                  </label>
                </>
              ) : null}
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">结果 URL 路径 resultUrlPath</span>
                <input
                  value={executionConfigState.resultUrlPath}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      resultUrlPath: event.target.value,
                    }))
                  }
                  required
                  disabled={disabled}
                  className={formInputClassName}
                  placeholder="response.outputUrl"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">结果值类型</span>
                <select
                  value={executionConfigState.resultValueType}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      resultValueType: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  className={formSelectClassName}
                >
                  <option value="url">URL</option>
                  <option value="base64">Base64</option>
                </select>
              </label>
              {executionConfigState.resultValueType === "base64" ? (
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">Base64 MIME 类型</span>
                  <input
                    value={executionConfigState.resultMimeType}
                    onChange={(event) =>
                      setExecutionConfigState((current) => ({
                        ...current,
                        resultMimeType: event.target.value,
                      }))
                    }
                    disabled={disabled}
                    className={formInputClassName}
                    placeholder="image/png"
                  />
                </label>
              ) : null}
              <div className="rounded-xl border border-black/[0.06] bg-[#FCFCFA] px-3 py-2.5 md:col-span-2">
                <p className="text-[11px] tracking-[0.35px] text-black/45">将提交的协议参数 JSON</p>
                <code className="mt-1 block break-all text-xs leading-5 text-black/55">
                  {executionConfigValue}
                </code>
              </div>
              <FieldHint help="用表单填写后会自动组装成 JSON 入库，无需手写 JSON。这里配置的是调用协议参数，不是新增 worker 代码。" />
            </div>
          </div>
        </div>
        </div>

        <div className={activeTab === "cost" ? "contents" : "hidden"}>
        <div className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">供应商成本配置</span>
          <BillingConfigEditor
            name="pricing"
            initialValue={defaultPricing}
            componentHint="按供应商真实结算方式填写内部进货成本。这里决定 provider cost，不影响用户售价。"
            generatedLabel="生成的供应商计费配置"
          />
        </div>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">官方成本价格链接</span>
          <input
            name="pricingSourceUrl"
            type="url"
            defaultValue={defaultPricingSourceUrl}
            placeholder="https://ai.google.dev/gemini-api/docs/pricing"
            disabled={disabled}
            className={formInputClassName}
          />
          <FieldHint help="填写官方价格页、模型文档或公开结算说明链接，便于后续溯源。" />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">成本说明备注</span>
          <textarea
            name="pricingSourceNote"
            rows={3}
            defaultValue={defaultPricingSourceNote}
            disabled={disabled}
            className={formTextAreaClassName}
            placeholder="例如：Google 官方写明 image output 按 $30 / 1M output tokens，1024x1024 约等于 1290 output tokens。"
          />
        </label>

        <label className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">价格证据截图</span>
          <input
            type="file"
            name="pricingSourceEvidenceFile"
            accept="image/png,image/jpeg,image/webp"
            disabled={disabled}
            className="block w-full rounded-md border border-black/[0.08] bg-white px-3 py-2 text-sm text-black file:mr-3 file:rounded-md file:border-0 file:bg-[#111827] file:px-3 file:py-2 file:text-xs file:font-medium file:text-white"
          />
          <FieldHint help="可选，上传官方价格页截图。保存后会把文件路径记录到供应商模型里。" />
        </label>
        </div>

        <div className={activeTab === "params" ? "contents" : "hidden"}>
          <div className="block md:col-span-2">
            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上游参数文档配置</span>
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSchemaEditorTab("input")}
                className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                  schemaEditorTab === "input"
                    ? "border-black bg-black text-white"
                    : "border-black/[0.12] bg-white text-black/70 hover:bg-black/[0.03]"
                }`}
              >
                Input Params
              </button>
              <button
                type="button"
                onClick={() => setSchemaEditorTab("output")}
                className={`inline-flex h-8 items-center rounded-md border px-3 text-xs font-medium transition-colors ${
                  schemaEditorTab === "output"
                    ? "border-black bg-black text-white"
                    : "border-black/[0.12] bg-white text-black/70 hover:bg-black/[0.03]"
                }`}
              >
                Output Params
              </button>
            </div>
            <div className={schemaEditorTab === "input" ? "block" : "hidden"}>
              <label className="mb-3 block">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">提交 Body 模板（JSON）</span>
                <textarea
                  value={executionConfigState.submitBodyTemplate}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      submitBodyTemplate: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  className={formTextAreaClassName}
                  rows={8}
                  placeholder={'{\n  "contents": [\n    {\n      "parts": [\n        { "text": "{{prompt}}" }\n      ]\n    }\n  ]\n}'}
                />
                <FieldHint help="可选。用于把统一入参映射为上游真实请求体。支持变量：{{prompt}}、{{upstreamModel}}，以及 input 里的同名字段（如 {{size}}）。" />
              </label>
              <SchemaFieldEditor
                name="inputSchema"
                keyName="params"
                defaultSchemaText={defaultInputSchema}
                includeRequired
                disabled={disabled}
              />
            </div>
            <div className={schemaEditorTab === "output" ? "block" : "hidden"}>
              <SchemaFieldEditor
                name="outputSchema"
                keyName="fields"
                defaultSchemaText={defaultOutputSchema}
                includeRequired={false}
                disabled={disabled}
              />
            </div>
          </div>
        </div>
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
  className = panelSurfaceClassName,
  allowWorkspaceScope = true,
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
  allowWorkspaceScope?: boolean;
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
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">可售模型</span>
          <select
            name="supportedModelId"
            value={supportedModelId}
            onChange={(event) => setSupportedModelId(event.target.value)}
            disabled={disabled}
            className={formSelectClassName}
          >
            {supportedModels.length > 0 ? (
              supportedModels.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.displayName} ({item.modelSlug})
                </option>
              ))
            ) : (
              <option value="">请先创建可售模型</option>
            )}
          </select>
          <FieldHint help="选择要上线的客户侧能力入口。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">能力类型</span>
          <input
            value={capabilityLabel(selectedSupportedModel?.capability ?? null)}
            readOnly
            className="h-10 w-full rounded-md border border-black/[0.08] bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
          />
          <input
            type="hidden"
            name="capability"
            value={selectedSupportedModel?.capability ?? ""}
          />
          <FieldHint help="跟随所选可售模型自动锁定。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">主供应商模型</span>
          <select
            name="primaryProviderModelId"
            defaultValue={defaultPrimaryProviderModelId}
            disabled={disabled}
            className={formSelectClassName}
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
          <FieldHint help="这里只展示属于当前可售模型和能力类型的实现。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">回退供应商模型</span>
          <select
            name="fallbackProviderModelId"
            defaultValue={defaultFallbackProviderModelId}
            disabled={disabled}
            className={formSelectClassName}
          >
            <option value="">不设置回退</option>
            {filteredProviderModels.map((item) => (
              <option key={item.id} value={item.id}>
                {item.supportedModelName} / {item.providerName} / {item.upstreamModelSlug}
              </option>
            ))}
          </select>
          <FieldHint help="可选，必须来自同一个可售模型的备用实现。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">生效范围</span>
          <select
            name="workspaceScope"
            defaultValue={allowWorkspaceScope ? defaultWorkspaceScope : "global"}
            disabled={disabled || !allowWorkspaceScope}
            className={formSelectClassName}
          >
            <option value="global">全局默认路由</option>
            {allowWorkspaceScope ? <option value="workspace">当前工作区覆盖</option> : null}
          </select>
          <FieldHint
            help={
              allowWorkspaceScope
                ? "全局路由影响平台默认行为；工作区覆盖只影响当前空间。"
                : "当前访问模式仅允许维护全局默认路由。"
            }
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">路由策略</span>
          <select
            name="routeStrategy"
            defaultValue={defaultStrategy}
            disabled={disabled}
            className={formSelectClassName}
          >
            <option value="primary_then_fallback">primary_then_fallback</option>
            <option value="primary_only">primary_only</option>
            <option value="manual_failover">manual_failover</option>
            <option value="route_by_capability_tag">route_by_capability_tag</option>
          </select>
          <FieldHint help="只有一个实现时用 primary_only；有真实备用供应商时用 primary_then_fallback。" />
        </label>

        <label className="flex items-center gap-3 rounded-md border border-black/[0.08] bg-white px-3 py-3 text-sm text-black/72">
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
