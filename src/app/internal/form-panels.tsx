"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  createProviderModel,
  createRoutingRule,
  generateProviderModelDraftFromUrl,
} from "./actions";
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
  docRequestExampleJson: string;
  docSubmitResponseExampleJson: string;
  docNormalizedOutputExampleJson: string;
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
      docRequestExampleJson: "",
      docSubmitResponseExampleJson: "",
      docNormalizedOutputExampleJson: "",
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

function executionTemplateLabelZh(slug: string) {
  if (slug === "rest-async-poll-v1") return "标准异步轮询";
  if (slug === "upload-async-poll-v1") return "上传后异步轮询";
  if (slug === "sync-json-v1") return "同步返回";
  return "自定义调用协议";
}

const SCHEMA_FIELD_TYPE_OPTIONS = [
  "string",
  "number",
  "integer",
  "boolean",
  "array",
  "object",
  "url",
  "base64",
];

function buildSchemaAiPromptTemplate(keyName: "params" | "fields") {
  if (keyName === "params") {
    return [
      "你是 API 文档结构化助手。请把我提供的模型文档整理为“输入参数导入 JSON”，严格按以下规则输出：",
      "1) 只输出 JSON，不要任何解释、Markdown、代码块标记。",
      "2) 顶层必须是对象，包含：officialDocUrl, params。",
      "3) params 必须是数组；每个元素包含：name, type, required, description, example, exposedToCustomer。",
      "4) required 必须是 true/false 布尔值。",
      "5) exposedToCustomer 必须是 true/false 布尔值。",
      "6) type 仅可使用：string, number, integer, boolean, array, object, url, base64。",
      "7) example 统一输出为字符串。",
      "8) 字段名保持上游原文，不要擅自改名。",
      "",
      "输出格式示例：",
      '{',
      '  "officialDocUrl": "https://example.com/docs",',
      '  "params": [',
      '    {',
      '      "name": "prompt",',
      '      "type": "string",',
      '      "required": true,',
      '      "description": "Text prompt for generation.",',
      '      "example": "A cinematic portrait...",',
      '      "exposedToCustomer": true',
      "    }",
      "  ]",
      "}",
    ].join("\n");
  }

  return [
    "你是 API 文档结构化助手。请把我提供的模型文档整理为“输出参数导入 JSON”，严格按以下规则输出：",
    "1) 只输出 JSON，不要任何解释、Markdown、代码块标记。",
    "2) 顶层必须是对象，包含：officialDocUrl, fields。",
    "3) fields 必须是数组；每个元素包含：name, type, description, example, exposedToCustomer。",
    "4) exposedToCustomer 必须是 true/false 布尔值。",
    "5) type 仅可使用：string, number, integer, boolean, array, object, url, base64。",
    "6) example 统一输出为字符串。",
    "7) 字段名保持上游原文，不要擅自改名。",
    "",
    "输出格式示例：",
    "{",
    '  "officialDocUrl": "https://example.com/docs",',
    '  "fields": [',
    "    {",
    '      "name": "outputs",',
    '      "type": "array",',
    '      "description": "Generated asset URLs.",',
    '      "example": "[\\"https://cdn.example.com/a.png\\"]",',
    '      "exposedToCustomer": true',
    "    }",
    "  ]",
    "}",
  ].join("\n");
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
  seedSchemaText,
  includeRequired,
  disabled,
}: {
  name: "inputSchema" | "outputSchema";
  keyName: "params" | "fields";
  defaultSchemaText: string;
  seedSchemaText?: string;
  includeRequired: boolean;
  disabled: boolean;
}) {
  const [officialDocUrl, setOfficialDocUrl] = useState(() => parseOfficialDocUrl(defaultSchemaText));
  const [rows, setRows] = useState<SchemaFieldState[]>(() =>
    parseSchemaFieldsFromText(defaultSchemaText, keyName)
  );
  const [importJsonText, setImportJsonText] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SchemaFieldState>({
    id: "",
    name: "",
    type: "string",
    required: false,
    description: "",
    example: "",
    exposedToCustomer: true,
  });

  useEffect(() => {
    setOfficialDocUrl(parseOfficialDocUrl(defaultSchemaText));
    setRows(parseSchemaFieldsFromText(defaultSchemaText, keyName));
  }, [defaultSchemaText, keyName]);

  useEffect(() => {
    if (!seedSchemaText || !seedSchemaText.trim()) {
      return;
    }
    setOfficialDocUrl(parseOfficialDocUrl(seedSchemaText));
    setRows(parseSchemaFieldsFromText(seedSchemaText, keyName));
  }, [keyName, seedSchemaText]);

  const openCreateEditor = () => {
    setEditingId(null);
    setDraft({
      id: randomFieldId(),
      name: "",
      type: "string",
      required: false,
      description: "",
      example: "",
      exposedToCustomer: true,
    });
    setEditorOpen(true);
  };

  const openEditEditor = (row: SchemaFieldState) => {
    setEditingId(row.id);
    setDraft({ ...row });
    setEditorOpen(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) {
      toast.error("请先填写参数名");
      return;
    }
    if (editingId) {
      setRows((current) => current.map((row) => (row.id === editingId ? { ...draft, name: draft.name.trim() } : row)));
    } else {
      setRows((current) => [...current, { ...draft, name: draft.name.trim() }]);
    }
    setEditorOpen(false);
  };

  const removeRow = (id: string) => {
    setRows((current) => current.filter((row) => row.id !== id));
  };

  const importFromJson = () => {
    const raw = importJsonText.trim();
    if (!raw) {
      toast.error("请先粘贴 JSON");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const importedUrl =
        typeof parsed.officialDocUrl === "string" ? parsed.officialDocUrl.trim() : "";
      const targetRows = parsed[keyName];
      if (!Array.isArray(targetRows)) {
        toast.error(`JSON 格式不正确，缺少 ${keyName} 数组`);
        return;
      }

      const normalized = targetRows
        .map((item) => {
          if (!item || typeof item !== "object" || Array.isArray(item)) return null;
          const row = item as Record<string, unknown>;
          const name = typeof row.name === "string" ? row.name.trim() : "";
          if (!name) return null;
          return {
            id: randomFieldId(),
            name,
            type: typeof row.type === "string" ? row.type : "string",
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

      if (normalized.length === 0) {
        toast.error("没有可导入的字段，请检查 name 是否填写");
        return;
      }

      setRows(normalized);
      if (importedUrl) setOfficialDocUrl(importedUrl);
      toast.success(`已导入 ${normalized.length} 个字段`);
    } catch {
      toast.error("JSON 解析失败，请检查格式");
    }
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

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openCreateEditor}
          disabled={disabled}
          className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-black/[0.03] disabled:opacity-50"
        >
          添加字段
        </button>
        <span className="text-[11px] text-black/45">{rows.length} 个字段</span>
      </div>

      <label className="block">
        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">官方文档链接</span>
        <input
          value={officialDocUrl}
          onChange={(event) => setOfficialDocUrl(event.target.value)}
          disabled={disabled}
          className={formInputClassName}
          placeholder="https://provider-docs.example.com/..."
        />
      </label>

      <div className="rounded-md border border-black/[0.08] bg-[#FCFCFA] p-2.5">
        <p className="mb-2 text-[11px] tracking-[0.35px] text-black/60">粘贴 JSON 一键导入字段</p>
        <textarea
          value={importJsonText}
          onChange={(event) => setImportJsonText(event.target.value)}
          disabled={disabled}
          rows={5}
          className={formTextAreaClassName}
          placeholder={`{\n  "officialDocUrl": "https://example.com/docs",\n  "${keyName}": [\n    { "name": "prompt", "type": "string", "description": "...", "example": "...", "exposedToCustomer": true }\n  ]\n}`}
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={importFromJson}
            disabled={disabled}
            className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-black/[0.03] disabled:opacity-50"
          >
            导入 JSON
          </button>
        </div>
      </div>

      <div className="rounded-md border border-black/[0.08] bg-[#FCFCFA] p-2.5">
        <p className="mb-2 text-[11px] tracking-[0.35px] text-black/60">AI 提示词模板（可复制给其他 AI）</p>
        <textarea
          value={buildSchemaAiPromptTemplate(keyName)}
          readOnly
          rows={10}
          className={`${formTextAreaClassName} text-xs`}
        />
      </div>

      <div className="rounded-md border border-black/[0.08] bg-[#FCFCFA] px-2 py-1.5 text-[11px] text-black/55">
        建议填写：参数名、类型、说明、示例。`必填` 表示调用时必须提供；`对外开放` 表示该字段会展示给客户。
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-xs text-black/45">暂无字段，点击“添加字段”开始配置。</p> : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-black/[0.08] bg-[#FCFCFA] p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-black">{row.name}</p>
                <p className="mt-0.5 text-xs text-black/55">{row.type || "未填写类型"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditEditor(row)}
                  disabled={disabled}
                  className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-black/[0.04] disabled:opacity-50"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  disabled={disabled}
                  className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-black/[0.04] disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-black/65">{row.description || "未填写说明"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-black/55">
              <span className="rounded border border-black/[0.08] bg-white px-2 py-0.5">示例：{row.example || "-"}</span>
              {includeRequired ? (
                <span className="rounded border border-black/[0.08] bg-white px-2 py-0.5">
                  必填：{row.required ? "是" : "否"}
                </span>
              ) : null}
              <span className="rounded border border-black/[0.08] bg-white px-2 py-0.5">
                对外开放：{row.exposedToCustomer ? "是" : "否"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl border border-black/[0.08] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">{editingId ? "编辑字段" : "新增字段"}</h4>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-black/[0.04]"
              >
                关闭
              </button>
            </div>
            <div className="grid gap-2 md:grid-cols-2">
              <input
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                disabled={disabled}
                className={`${formInputClassName} h-9 text-xs`}
                placeholder="参数名，如 size"
              />
              <select
                value={draft.type}
                onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                disabled={disabled}
                className={`${formSelectClassName} h-9 text-xs`}
              >
                <option value="">请选择类型</option>
                {SCHEMA_FIELD_TYPE_OPTIONS.map((typeOption) => (
                  <option key={typeOption} value={typeOption}>
                    {typeOption}
                  </option>
                ))}
              </select>
              <input
                value={draft.example}
                onChange={(event) => setDraft((current) => ({ ...current, example: event.target.value }))}
                disabled={disabled}
                className={`${formInputClassName} h-9 text-xs md:col-span-2`}
                placeholder="示例值"
              />
              <textarea
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                disabled={disabled}
                className={`${formTextAreaClassName} text-xs md:col-span-2`}
                rows={3}
                placeholder="字段说明"
              />
              {includeRequired ? (
                <label className="inline-flex items-center gap-2 text-xs text-black/70">
                  <input
                    type="checkbox"
                    checked={draft.required}
                    onChange={(event) => setDraft((current) => ({ ...current, required: event.target.checked }))}
                    className="size-3.5"
                  />
                  必填（客户调用时必须传）
                </label>
              ) : null}
              <label className="inline-flex items-center gap-2 text-xs text-black/70">
                <input
                  type="checkbox"
                  checked={draft.exposedToCustomer}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, exposedToCustomer: event.target.checked }))
                  }
                  className="size-3.5"
                />
                对外开放（在 Dashboard 文档展示）
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-black/[0.03]"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveDraft}
                className="h-8 rounded-md border border-black bg-black px-3 text-xs text-white hover:bg-black/90"
              >
                保存字段
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <details className="rounded-md border border-black/[0.08] bg-[#FCFCFA] p-2">
        <summary className="cursor-pointer text-[11px] text-black/60">JSON 预览</summary>
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
    docRequestExampleJson: "",
    docSubmitResponseExampleJson: "",
    docNormalizedOutputExampleJson: "",
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
      docRequestExampleJson:
        parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc) && typeof (parsed.doc as Record<string, unknown>).requestExampleJson === "string"
          ? ((parsed.doc as Record<string, unknown>).requestExampleJson as string)
          : fallback.docRequestExampleJson,
      docSubmitResponseExampleJson:
        parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc) && typeof (parsed.doc as Record<string, unknown>).submitResponseExampleJson === "string"
          ? ((parsed.doc as Record<string, unknown>).submitResponseExampleJson as string)
          : fallback.docSubmitResponseExampleJson,
      docNormalizedOutputExampleJson:
        parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc) && typeof (parsed.doc as Record<string, unknown>).normalizedOutputExampleJson === "string"
          ? ((parsed.doc as Record<string, unknown>).normalizedOutputExampleJson as string)
          : fallback.docNormalizedOutputExampleJson,
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
  const doc: Record<string, unknown> = {
    requestExampleJson: state.docRequestExampleJson.trim() || undefined,
    submitResponseExampleJson: state.docSubmitResponseExampleJson.trim() || undefined,
    normalizedOutputExampleJson: state.docNormalizedOutputExampleJson.trim() || undefined,
  };
  result.doc = doc;
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
  const inputMethod = state.chargeInputTokens
    ? "input_tokens"
    : state.chargePerRequest
      ? "per_request"
      : "none";
  const outputMethod = state.chargeOutputTokens
    ? "output_tokens"
    : state.chargePerImage
      ? "per_image"
      : state.chargePerVideo
        ? "per_video"
        : state.chargePerSecond
          ? "per_second"
          : "none";

  const applyInputMethod = (method: string) => {
    setState((current) => ({
      ...current,
      chargeInputTokens: method === "input_tokens",
      chargePerRequest: method === "per_request",
    }));
  };

  const applyOutputMethod = (method: string) => {
    setState((current) => ({
      ...current,
      chargeOutputTokens: method === "output_tokens",
      chargePerImage: method === "per_image",
      chargePerVideo: method === "per_video",
      chargePerSecond: method === "per_second",
    }));
  };

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
          <p className="text-[11px] tracking-[0.35px] text-black/45">成本计费维度</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-black/[0.08] bg-white p-2.5">
              <p className="mb-2 text-[11px] font-medium text-black/55">输入成本</p>
              <select
                value={inputMethod}
                onChange={(event) => applyInputMethod(event.target.value)}
                className={formSelectClassName}
              >
                <option value="none">不计费</option>
                <option value="per_request">按请求</option>
                <option value="input_tokens">按输入 Token（每百万）</option>
              </select>
            </div>
            <div className="rounded-lg border border-black/[0.08] bg-white p-2.5">
              <p className="mb-2 text-[11px] font-medium text-black/55">输出成本</p>
              <select
                value={outputMethod}
                onChange={(event) => applyOutputMethod(event.target.value)}
                className={formSelectClassName}
              >
                <option value="none">不计费</option>
                <option value="per_image">按图片</option>
                <option value="per_video">按视频</option>
                <option value="per_second">按秒</option>
                <option value="output_tokens">按输出 Token（每百万）</option>
              </select>
            </div>
          </div>
          <FieldHint help={componentHint} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {inputMethod === "per_request" ? (
          <BillingNumberField
            label="输入成本金额（每次请求）"
            value={state.costPerRequest}
            onChange={(value) => setState((current) => ({ ...current, costPerRequest: value }))}
          />
        ) : null}
        {inputMethod === "input_tokens" ? (
          <BillingNumberField
            label="输入成本金额（每百万输入 Token）"
            value={state.inputCostPerMillion}
            onChange={(value) => setState((current) => ({ ...current, inputCostPerMillion: value }))}
          />
        ) : null}
        {outputMethod === "per_image" ? (
          <BillingNumberField
            label="输出成本金额（每张图片）"
            value={state.costPerImage}
            onChange={(value) => setState((current) => ({ ...current, costPerImage: value }))}
          />
        ) : null}
        {outputMethod === "per_video" ? (
          <BillingNumberField
            label="输出成本金额（每个视频）"
            value={state.costPerVideo}
            onChange={(value) => setState((current) => ({ ...current, costPerVideo: value }))}
          />
        ) : null}
        {outputMethod === "per_second" ? (
          <BillingNumberField
            label="输出成本金额（每秒）"
            value={state.costPerSecond}
            onChange={(value) => setState((current) => ({ ...current, costPerSecond: value }))}
            help="后台任务会从请求参数或供应商返回结果中读取时长。"
          />
        ) : null}
        {outputMethod === "output_tokens" ? (
          <BillingNumberField
            label="输出成本金额（每百万输出 Token）"
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
  formId,
  showSubmitButton = true,
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
  formId?: string;
  showSubmitButton?: boolean;
}) {
  type ProviderModelFormTab =
    | "basic"
    | "protocol"
    | "input-params"
    | "output-params"
    | "doc-examples"
    | "cost";
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
  const [upstreamModelSlug, setUpstreamModelSlug] = useState(defaultUpstreamModelSlug ?? "");
  const [pricingSourceUrlState, setPricingSourceUrlState] = useState(defaultPricingSourceUrl ?? "");
  const [pricingSourceNoteState, setPricingSourceNoteState] = useState(defaultPricingSourceNote ?? "");
  const [autofillSourceUrl, setAutofillSourceUrl] = useState("");
  const [autofillSummary, setAutofillSummary] = useState("");
  const [seedInputSchemaText, setSeedInputSchemaText] = useState("");
  const [seedOutputSchemaText, setSeedOutputSchemaText] = useState("");
  const [isAutofilling, startAutofillTransition] = useTransition();
  const executionConfigValue = buildExecutionConfigValue(executionConfigState);
  const templateIsAsync =
    executionTemplate === "rest-async-poll-v1" || executionTemplate === "upload-async-poll-v1";
  const isAsyncMode = executionConfigState.mode === "async" || (executionConfigState.mode === "auto" && templateIsAsync);
  const [activeTab, setActiveTab] = useState<ProviderModelFormTab>("basic");
  const contentContainerRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<ProviderModelFormTab, HTMLDivElement | null>>({
    basic: null,
    protocol: null,
    "input-params": null,
    "output-params": null,
    "doc-examples": null,
    cost: null,
  });
  const tabItems = useMemo(
    () => [
      { key: "basic" as const, label: "基本信息" },
      { key: "protocol" as const, label: "调用协议配置" },
      { key: "input-params" as const, label: "输入参数" },
      { key: "output-params" as const, label: "输出参数" },
      { key: "doc-examples" as const, label: "示例配置" },
      { key: "cost" as const, label: "供应商成本配置" },
    ],
    []
  );

  useEffect(() => {
    setExecutionTemplate(defaultExecutionTemplate);
    setSelectedPresetId("");
    setExecutionConfigState(parseExecutionConfigState(defaultExecutionConfig));
    setUpstreamModelSlug(defaultUpstreamModelSlug ?? "");
    setPricingSourceUrlState(defaultPricingSourceUrl ?? "");
    setPricingSourceNoteState(defaultPricingSourceNote ?? "");
    setAutofillSourceUrl("");
    setAutofillSummary("");
    setSeedInputSchemaText("");
    setSeedOutputSchemaText("");
  }, [
    defaultExecutionConfig,
    defaultExecutionTemplate,
    defaultPricingSourceNote,
    defaultPricingSourceUrl,
    defaultUpstreamModelSlug,
  ]);

  const runAutofillFromUrl = () => {
    const sourceUrl = autofillSourceUrl.trim();
    if (!sourceUrl) {
      toast.error("请先输入文档 URL");
      return;
    }

    startAutofillTransition(async () => {
      try {
        const result = await generateProviderModelDraftFromUrl({ sourceUrl });
        setUpstreamModelSlug(result.upstreamModelSlug ?? "");
        setExecutionTemplate(result.executionTemplate || "rest-async-poll-v1");
        setExecutionConfigState(parseExecutionConfigState(result.executionConfigText || "{}"));
        setSeedInputSchemaText(result.inputSchemaText || "{}");
        setSeedOutputSchemaText(result.outputSchemaText || "{}");
        setPricingSourceUrlState(result.pricingSourceUrl ?? "");
        setPricingSourceNoteState(result.pricingSourceNote ?? "");
        setAutofillSummary(result.summary ?? "");
        toast.success("已完成自动解析并填充");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "自动填充失败");
      }
    });
  };

  return (
    <form
      id={formId}
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
      <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-2">
          <nav className="space-y-1">
            {tabItems.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    const section = sectionRefs.current[tab.key];
                    if (section) {
                      section.scrollIntoView({ behavior: "smooth", block: "start" });
                    }
                  }}
                  className={`flex w-full cursor-pointer items-center rounded-md px-3 py-2 text-left text-xs font-medium transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "text-black/68 hover:bg-black/[0.05]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <div
          ref={contentContainerRef}
          className="max-h-[72vh] space-y-4 overflow-y-auto pr-1"
        >
        <div
          ref={(node) => {
            sectionRefs.current.basic = node;
          }}
          className="grid gap-3 md:grid-cols-2"
        >
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">文档 URL 自动填充</span>
          <div className="flex items-center gap-2">
            <input
              value={autofillSourceUrl}
              onChange={(event) => setAutofillSourceUrl(event.target.value)}
              placeholder="https://provider-docs.example.com/model-api"
              disabled={disabled || isAutofilling}
              className={formInputClassName}
            />
            <button
              type="button"
              onClick={runAutofillFromUrl}
              disabled={disabled || isAutofilling}
              className="inline-flex h-10 shrink-0 cursor-pointer items-center rounded-md bg-black px-3 text-xs font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/45"
            >
              {isAutofilling ? "解析中..." : "AI 自动填充"}
            </button>
          </div>
          <FieldHint help="读取文档并自动填充调用协议、入参/出参、示例与来源说明（仅 internal 使用）。" />
          {autofillSummary ? (
            <p className="mt-2 rounded-md border border-black/[0.08] bg-[#FCFCFA] px-2.5 py-2 text-xs text-black/65">
              {autofillSummary}
            </p>
          ) : null}
        </label>

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
            value={upstreamModelSlug}
            onChange={(event) => setUpstreamModelSlug(event.target.value)}
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

        <div
          ref={(node) => {
            sectionRefs.current.protocol = node;
          }}
          className="grid gap-3 md:grid-cols-2"
        >
        <div className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">调用协议配置</span>
          <div className="rounded-2xl border border-black/[0.08] bg-white p-4 shadow-sm">
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <label className="block">
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
                      {executionTemplateLabelZh(item.slug)}
                    </option>
                  ))}
                </select>
              </label>
              {executionConfigPresets.length > 0 ? (
                <label className="block">
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
            </div>
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
            </div>
          </div>
        </div>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.cost = node;
          }}
          className="grid gap-3 md:grid-cols-2"
        >
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
            value={pricingSourceUrlState}
            onChange={(event) => setPricingSourceUrlState(event.target.value)}
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
            value={pricingSourceNoteState}
            onChange={(event) => setPricingSourceNoteState(event.target.value)}
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

        <div
          ref={(node) => {
            sectionRefs.current["input-params"] = node;
          }}
          className=""
        >
          <div className="block">
            <SchemaFieldEditor
              name="inputSchema"
              keyName="params"
              defaultSchemaText={defaultInputSchema}
              seedSchemaText={seedInputSchemaText}
              includeRequired
              disabled={disabled}
            />
            <label className="mt-3 block">
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
            </label>
          </div>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current["output-params"] = node;
          }}
          className=""
        >
          <div className="block">
            <SchemaFieldEditor
              name="outputSchema"
              keyName="fields"
              defaultSchemaText={defaultOutputSchema}
              seedSchemaText={seedOutputSchemaText}
              includeRequired={false}
              disabled={disabled}
            />
          </div>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current["doc-examples"] = node;
          }}
          className=""
        >
          <div className="block rounded-xl border border-black/[0.08] bg-[#FCFCFA] p-3">
            <p className="mb-2 text-[11px] tracking-[0.35px] text-black/60">文档示例配置（用于 Dashboard API Quickstart）</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">请求示例 JSON</span>
                <textarea
                  value={executionConfigState.docRequestExampleJson}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({ ...current, docRequestExampleJson: event.target.value }))
                  }
                  disabled={disabled}
                  className={formTextAreaClassName}
                  rows={5}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">提交响应示例 JSON</span>
                <textarea
                  value={executionConfigState.docSubmitResponseExampleJson}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      docSubmitResponseExampleJson: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  className={formTextAreaClassName}
                  rows={4}
                />
              </label>
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">统一输出示例 JSON</span>
                <textarea
                  value={executionConfigState.docNormalizedOutputExampleJson}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      docNormalizedOutputExampleJson: event.target.value,
                    }))
                  }
                  disabled={disabled}
                  className={formTextAreaClassName}
                  rows={4}
                />
              </label>
            </div>
          </div>
        </div>
        </div>
      </div>
      {showSubmitButton ? (
        <div className="mt-4">
          <SubmitButton
            label={submitLabel}
            disabled={disabled || !selectedSupportedModel?.capability}
          />
        </div>
      ) : null}
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
