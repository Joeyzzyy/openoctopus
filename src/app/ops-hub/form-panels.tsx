"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  createProviderModel,
  createRoutingRule,
  generateProviderModelDraftFromSource,
} from "./actions";
import { SubmitButton } from "./submit-button";

type SupportedModelOption = {
  id: string;
  modelSlug: string;
  displayName: string;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation" | null;
  billingConfigText?: string;
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
type ProviderModelRootTab = "manage" | "source-doc";

type ProviderModelOption = {
  id: string;
  supportedModelId: string | null;
  supportedModelName: string;
  providerName: string;
  upstreamModelSlug: string;
  capability: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation";
};

type BillingFormState = {
  currency: string;
  outputPriceMode: string;
  chargePerRequest: boolean;
  chargePerImage: boolean;
  chargePerVideo: boolean;
  chargePerSecond: boolean;
  chargeCombinationPrices: boolean;
  chargeInputTokens: boolean;
  chargeOutputTokens: boolean;
  costPerRequest: string;
  costPerImage: string;
  costPerVideo: string;
  costPerSecond: string;
  inputCostPerMillion: string;
  outputCostPerMillion: string;
  resolutionMultipliersJson: string;
  qualityMultipliersJson: string;
  combinationPricesJson: string;
  booleanSurchargesJson: string;
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
  resultPath: string;
  taskIdPath: string;
  statusPath: string;
  resultUrlPath: string;
  resultTextPath: string;
  submitBodyTemplate: string;
  docRequestExampleJson: string;
  docSubmitResponseExampleJson: string;
  docNormalizedOutputExampleJson: string;
  docSourceUrl: string;
  docReadmeMarkdown: string;
};

type SchemaFieldState = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  description: string;
  example: string;
  exposedToCustomer: boolean;
  enumValues: string[];
  minimum: string;
  maximum: string;
  step: string;
  maxItems: string;
};

function templateExecutionPreset(slug?: string): Partial<ExecutionConfigFormState> {
  if (slug === "sync-json-v1") {
    return {
      mode: "sync",
      submitPath: "/v1beta/models/{upstreamModel}:generateContent",
      pollPath: "",
      resultPath: "",
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
      docSourceUrl: "",
      docReadmeMarkdown: "",
    };
  }
  if (slug === "upload-async-poll-v1") {
    return {
      mode: "async",
      submitPath: "/v1/models/{upstreamModel}:generate",
      pollPath: "/v1/operations/{taskId}",
      resultPath: "",
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
    resultPath: "",
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

const ASPECT_RATIO_CANDIDATES = [
  "1:1",
  "16:9",
  "9:16",
  "4:3",
  "3:4",
  "3:2",
  "2:3",
  "5:4",
  "4:5",
  "21:9",
];

const RESOLUTION_CANDIDATES = [
  "480p",
  "720p",
  "1080p",
  "1440p",
  "2160p",
  "0.5k",
  "1k",
  "2k",
  "3k",
  "4k",
];
const SIZE_CANDIDATES = ["1024*1024", "1024*1536", "1536*1024"];
const QUALITY_CANDIDATES = ["medium", "low", "high"];
const DURATION_CANDIDATES = Array.from({ length: 60 }, (_, index) => String(index + 1));
const VIDEO_RESOLUTION_CANDIDATES = ["480p", "720p", "1080p"];
const VIDEO_DURATION_CANDIDATES = ["5", "10", "15"];
const VIDEO_REFERENCE_VIDEO_CANDIDATES = [
  { value: "false", label: "无参考视频" },
  { value: "true", label: "有参考视频" },
];
const VIDEO_AUDIO_CANDIDATES = [
  { value: "false", label: "无音频" },
  { value: "true", label: "有音频" },
];
const DETAIL_LEVEL_CANDIDATES = ["low", "medium", "high"];
const OUTPUT_FORMAT_CANDIDATES = ["png", "jpeg", "webp"];
const BACKGROUND_CANDIDATES = ["auto", "transparent", "opaque"];
const BOOLEAN_SURCHARGE_CANDIDATES = [
  "enable_web_search",
  "enable_image_search",
  "hasAudio",
];

const README_MARKDOWN_PROMPT = `Generate a clean SEO-friendly README in RAW MARKDOWN SOURCE format.

Requirements:
- Output raw markdown source only
- The entire response MUST be wrapped inside a single quadruple-backtick markdown code block
- Do not output any explanation before or after the markdown
- Do not use HTML
- Preserve proper markdown syntax exactly as written
- Use exactly one H1 title
- Use H2 sections with ##
- Use H3 subsections only when necessary
- Keep the tone factual, concise, and product-oriented
- Do not mention competitors
- Do not include placeholder text

Structure:
# <Model Name>

> Short SEO summary

## Overview

## Why it looks great

## Limits and Performance

## Pricing

### Billing Rule

## How to Use

## Input Parameters

## Output Format

## Pro tips for best quality

## Note`;

function randomFieldId() {
  return Math.random().toString(36).slice(2, 10);
}

function normalizeEnumValues(values: string[]) {
  return Array.from(
    new Set(values.map((item) => item.trim()).filter((item) => item.length > 0))
  );
}

function isResolutionFieldName(value: string) {
  return value.trim().toLowerCase() === "resolution";
}

function isSizeFieldName(value: string) {
  return value.trim().toLowerCase() === "size";
}

function isQualityFieldName(value: string) {
  return value.trim().toLowerCase() === "quality";
}

function isDurationFieldName(value: string) {
  return value.trim().toLowerCase() === "duration";
}

function isDetailLevelFieldName(value: string) {
  return value.trim().toLowerCase() === "detail_level";
}

function isOutputFormatFieldName(value: string) {
  return value.trim().toLowerCase() === "output_format";
}

function isBackgroundFieldName(value: string) {
  return value.trim().toLowerCase() === "background";
}

function defaultEnumValuesForKnownInputField(fieldName: string) {
  const normalized = fieldName.trim().toLowerCase();
  if (normalized === "resolution") {
    return RESOLUTION_CANDIDATES;
  }
  if (normalized === "quality") {
    return ["medium", "low", "high"];
  }
  if (normalized === "duration") {
    return DURATION_CANDIDATES;
  }
  if (normalized === "detail_level") {
    return DETAIL_LEVEL_CANDIDATES;
  }
  if (normalized === "output_format") {
    return ["png", "jpeg", "webp"];
  }
  if (normalized === "size") {
    return ["1024*1024", "1024*1536", "1536*1024"];
  }
  if (normalized === "background") {
    return ["auto", "transparent", "opaque"];
  }
  return [];
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
        const parsedEnumValues = normalizeEnumValues(
          Array.isArray(row.enum) ? row.enum.filter((item): item is string => typeof item === "string") : []
        );
        const fallbackEnumValues =
          key === "params" && parsedEnumValues.length === 0
            ? defaultEnumValuesForKnownInputField(name)
            : [];
        const minimum =
          row.minimum !== undefined && row.minimum !== null
            ? String(row.minimum)
            : row.min !== undefined && row.min !== null
              ? String(row.min)
              : "";
        const maximum =
          row.maximum !== undefined && row.maximum !== null
            ? String(row.maximum)
            : row.max !== undefined && row.max !== null
              ? String(row.max)
              : "";
        const step = row.step !== undefined && row.step !== null ? String(row.step) : "";
        const maxItems =
          row.maxItems !== undefined && row.maxItems !== null
            ? String(row.maxItems)
            : row.max_items !== undefined && row.max_items !== null
              ? String(row.max_items)
              : "";
        const normalizedName = name.trim().toLowerCase();
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
          enumValues: parsedEnumValues.length > 0 ? parsedEnumValues : fallbackEnumValues,
          minimum: minimum || (key === "params" && normalizedName === "duration" ? "1" : ""),
          maximum: maximum || (key === "params" && normalizedName === "duration" ? "60" : ""),
          step: step || (key === "params" && normalizedName === "duration" ? "1" : ""),
          maxItems,
        } satisfies SchemaFieldState;
      })
      .filter((row): row is SchemaFieldState => Boolean(row));
  } catch {
    return [] as SchemaFieldState[];
  }
}

function readJsonRecord(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function parseOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalInteger(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function isReferenceAssetFieldName(value: string) {
  const normalized = value.trim().toLowerCase();
  return [
    "reference_image",
    "reference_images",
    "reference_video",
    "reference_videos",
    "reference_audio",
    "reference_audios",
  ].includes(normalized);
}

function hasPositivePricingCharge(pricingText: string) {
  const pricing = readJsonRecord(pricingText);
  if (!pricing) return false;
  const charges =
    pricing.charges && typeof pricing.charges === "object" && !Array.isArray(pricing.charges)
      ? (pricing.charges as Record<string, unknown>)
      : {};
  const parameterPrices =
    pricing.parameterPrices && typeof pricing.parameterPrices === "object" && !Array.isArray(pricing.parameterPrices)
      ? (pricing.parameterPrices as Record<string, unknown>)
      : {};
  const combinationPrices =
    parameterPrices.combinations &&
    typeof parameterPrices.combinations === "object" &&
    !Array.isArray(parameterPrices.combinations)
      ? (parameterPrices.combinations as Record<string, unknown>)
      : {};
  return [...Object.values(charges), ...Object.values(combinationPrices)].some((value) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  });
}

function getSchemaRequiredWarnings(
  schemaText: string,
  key: "params" | "fields",
  label: string
) {
  const schema = readJsonRecord(schemaText);
  const rows = Array.isArray(schema?.[key]) ? (schema[key] as unknown[]) : [];
  const warnings: string[] = [];

  if (rows.length === 0) {
    return [`${label}至少需要 1 条记录`];
  }

  rows.forEach((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      warnings.push(`${label}第 ${index + 1} 条格式无效`);
      return;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.name !== "string" || row.name.trim().length === 0) {
      warnings.push(`${label}第 ${index + 1} 条缺少 name`);
    }
    if (typeof row.type !== "string" || row.type.trim().length === 0) {
      warnings.push(`${label}第 ${index + 1} 条缺少 type`);
    }
  });

  return warnings;
}

function SchemaFieldEditor({
  name,
  keyName,
  defaultSchemaText,
  seedSchemaText,
  includeRequired,
  disabled,
  onSchemaChange,
}: {
  name: "inputSchema" | "outputSchema";
  keyName: "params" | "fields";
  defaultSchemaText: string;
  seedSchemaText?: string;
  includeRequired: boolean;
  disabled: boolean;
  onSchemaChange?: (value: string) => void;
}) {
  const [rows, setRows] = useState<SchemaFieldState[]>(() =>
    parseSchemaFieldsFromText(defaultSchemaText, keyName)
  );
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
    enumValues: [],
    minimum: "",
    maximum: "",
    step: "",
    maxItems: "",
  });

  useEffect(() => {
    setRows(parseSchemaFieldsFromText(defaultSchemaText, keyName));
  }, [defaultSchemaText, keyName]);

  useEffect(() => {
    if (!seedSchemaText || !seedSchemaText.trim()) {
      return;
    }
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
      enumValues: [],
      minimum: "",
      maximum: "",
      step: "",
      maxItems: "",
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
    if (
      [draft.minimum, draft.maximum, draft.step].some((value) => {
        const trimmed = value.trim();
        return trimmed.length > 0 && !Number.isFinite(Number(trimmed));
      })
    ) {
      toast.error("最小值、最大值和阶梯值必须是数字");
      return;
    }
    if (draft.maxItems.trim().length > 0 && parseOptionalInteger(draft.maxItems) === undefined) {
      toast.error("最大数量必须是大于 0 的整数");
      return;
    }
    if (isReferenceAssetFieldName(draft.name) && parseOptionalInteger(draft.maxItems ?? "") === undefined) {
      toast.error("reference 图、视频、音频字段必须设置最大数量上限");
      return;
    }
    const nextEnumValues =
      keyName === "params" &&
      (isDetailLevelFieldName(draft.name) || isDurationFieldName(draft.name)) &&
      normalizeEnumValues(draft.enumValues).length === 0
        ? isDurationFieldName(draft.name)
          ? DURATION_CANDIDATES
          : DETAIL_LEVEL_CANDIDATES
        : normalizeEnumValues(draft.enumValues);
    const nextMinimum =
      isDurationFieldName(draft.name) && draft.minimum.trim().length === 0 ? "1" : draft.minimum.trim();
    const nextMaximum =
      isDurationFieldName(draft.name) && draft.maximum.trim().length === 0 ? "60" : draft.maximum.trim();
    const nextStep =
      isDurationFieldName(draft.name) && draft.step.trim().length === 0 ? "1" : draft.step.trim();
    const nextMaxItems = draft.maxItems.trim();
    if (editingId) {
      setRows((current) =>
        current.map((row) =>
          row.id === editingId
            ? {
                ...draft,
                name: draft.name.trim(),
                enumValues: nextEnumValues,
                minimum: nextMinimum,
                maximum: nextMaximum,
                step: nextStep,
                maxItems: nextMaxItems,
              }
            : row
        )
      );
    } else {
      setRows((current) => [
        ...current,
        {
          ...draft,
          name: draft.name.trim(),
          enumValues: nextEnumValues,
          minimum: nextMinimum,
          maximum: nextMaximum,
          step: nextStep,
          maxItems: nextMaxItems,
        },
      ]);
    }
    setEditorOpen(false);
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
      enumValues: normalizeEnumValues(row.enumValues),
      minimum: row.minimum.trim(),
      maximum: row.maximum.trim(),
      step: row.step.trim(),
      maxItems: row.maxItems.trim(),
    }))
    .filter((row) => row.name.length > 0);

  const schemaValue = JSON.stringify(
    {
      [keyName]: normalizedRows.map((row) => ({
        name: row.name,
        type: row.type || undefined,
        ...(includeRequired ? { required: row.required } : {}),
        description: row.description || undefined,
        example: row.example || undefined,
        exposedToCustomer: row.exposedToCustomer,
        enum: row.enumValues.length > 0 ? row.enumValues : undefined,
        minimum: parseOptionalNumber(row.minimum),
        maximum: parseOptionalNumber(row.maximum),
        step: parseOptionalNumber(row.step),
        maxItems: parseOptionalInteger(row.maxItems),
      })),
    },
    null,
    2
  );
  useEffect(() => {
    onSchemaChange?.(schemaValue);
  }, [onSchemaChange, schemaValue]);

  return (
    <div className="space-y-3 rounded-xl border border-[#BAE6FD] bg-white p-3">
      <input type="hidden" name={name} value={schemaValue} />

      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={openCreateEditor}
          disabled={disabled}
          className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-[#E0F2FE] disabled:opacity-50"
        >
          添加字段
        </button>
        <span className="text-[11px] text-black/45">{rows.length} 个字段</span>
      </div>

      <div className="space-y-2">
        {rows.length === 0 ? <p className="text-xs text-black/45">暂无字段，点击“添加字段”开始配置。</p> : null}
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border border-[#BAE6FD] bg-[#F8FCFF] p-3">
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
                  className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-[#E0F2FE] disabled:opacity-50"
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      const confirmed = window.confirm(`确认删除参数「${row.name}」吗？此操作不可撤销。`);
                      if (!confirmed) {
                        return;
                      }
                    }
                    removeRow(row.id);
                  }}
                  disabled={disabled}
                  className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-[#E0F2FE] disabled:opacity-50"
                >
                  删除
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-black/65">{row.description || "未填写说明"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-black/55">
              <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">示例：{row.example || "-"}</span>
              <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">
                可选值：{row.enumValues.length > 0 ? row.enumValues.join(", ") : "-"}
              </span>
              {row.minimum || row.maximum || row.step ? (
                <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">
                  范围：{row.minimum || "-"} - {row.maximum || "-"} · 阶梯：{row.step || "-"}
                </span>
              ) : null}
              {row.maxItems ? (
                <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">
                  最大数量：{row.maxItems}
                </span>
              ) : null}
              {includeRequired ? (
                <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">
                  必填：{row.required ? "是" : "否"}
                </span>
              ) : null}
              <span className="rounded border border-[#BAE6FD] bg-white px-2 py-0.5">
                对外开放：{row.exposedToCustomer ? "是" : "否"}
              </span>
            </div>
          </div>
        ))}
      </div>

      {editorOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#BAE6FD] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">{editingId ? "编辑字段" : "新增字段"}</h4>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-7 rounded border border-black/[0.1] px-2 text-[11px] text-black/60 hover:bg-[#E0F2FE]"
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
              {keyName === "params" && (draft.type === "number" || draft.type === "integer") ? (
                <div className="grid gap-2 md:col-span-2 md:grid-cols-3">
                  <input
                    value={draft.minimum}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, minimum: event.target.value }))
                    }
                    disabled={disabled}
                    className={`${formInputClassName} h-9 text-xs`}
                    placeholder="最小值，如 0"
                    inputMode="decimal"
                  />
                  <input
                    value={draft.maximum}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, maximum: event.target.value }))
                    }
                    disabled={disabled}
                    className={`${formInputClassName} h-9 text-xs`}
                    placeholder="最大值，如 10"
                    inputMode="decimal"
                  />
                  <input
                    value={draft.step}
                    onChange={(event) =>
                      setDraft((current) => ({ ...current, step: event.target.value }))
                    }
                    disabled={disabled}
                    className={`${formInputClassName} h-9 text-xs`}
                    placeholder="阶梯值，如 1 或 0.5"
                    inputMode="decimal"
                  />
                </div>
              ) : null}
              {keyName === "params" && (draft.type === "array" || isReferenceAssetFieldName(draft.name)) ? (
                <input
                  value={draft.maxItems}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, maxItems: event.target.value }))
                  }
                  disabled={disabled}
                  className={`${formInputClassName} h-9 text-xs md:col-span-2`}
                  placeholder={
                    isReferenceAssetFieldName(draft.name)
                      ? "最大数量，reference 字段必填，如 1 或 4"
                      : "最大数组数量，如 4"
                  }
                  inputMode="numeric"
                />
              ) : null}
              {!isResolutionFieldName(draft.name) &&
              !isQualityFieldName(draft.name) &&
              !isDurationFieldName(draft.name) &&
              !isDetailLevelFieldName(draft.name) &&
              !isOutputFormatFieldName(draft.name) &&
              !isSizeFieldName(draft.name) &&
              !isBackgroundFieldName(draft.name) ? (
                <input
                  value={draft.enumValues.join(", ")}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      enumValues: normalizeEnumValues(event.target.value.split(",")),
                    }))
                  }
                  disabled={disabled}
                  className={`${formInputClassName} h-9 text-xs md:col-span-2`}
                  placeholder='可选值（逗号分隔），如 1:1, 16:9, 9:16, 4:3, 3:4'
                />
              ) : null}
              {isResolutionFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">常用分辨率（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {RESOLUTION_CANDIDATES.map((resolution) => {
                      const checked = draft.enumValues.includes(resolution);
                      return (
                        <label key={resolution} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(resolution);
                                } else {
                                  set.delete(resolution);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {resolution}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isSizeFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">size 可选值（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {SIZE_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      return (
                        <label key={value} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isQualityFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">quality 可选值（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {QUALITY_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      return (
                        <label key={value} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isDurationFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] text-black/60">duration 可选值（秒，可多选）</p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            enumValues: DURATION_CANDIDATES,
                            minimum: current.minimum || "1",
                            maximum: current.maximum || "60",
                            step: current.step || "1",
                          }))
                        }
                        className="h-7 rounded border border-black/[0.1] bg-white px-2 text-[11px] text-black/60 hover:bg-[#E0F2FE]"
                      >
                        全选 1-60
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDraft((current) => ({
                            ...current,
                            enumValues: [],
                          }))
                        }
                        className="h-7 rounded border border-black/[0.1] bg-white px-2 text-[11px] text-black/60 hover:bg-[#E0F2FE]"
                      >
                        清空
                      </button>
                    </div>
                  </div>
                  <div className="grid max-h-52 grid-cols-4 gap-2 overflow-y-auto rounded-md border border-[#DDF4FF] bg-white p-2 sm:grid-cols-6 md:grid-cols-8">
                    {DURATION_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      return (
                        <label key={value} className="inline-flex items-center gap-1.5 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: DURATION_CANDIDATES.filter((item) => set.has(item)),
                                  minimum: current.minimum || "1",
                                  maximum: current.maximum || "60",
                                  step: current.step || "1",
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                  <FieldHint help="duration 默认建议做成非必填，并提供 1 到 60 秒可选项；前台 Playground 会按这里的枚举渲染下拉选择。" />
                </div>
              ) : null}
              {isDetailLevelFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">detail_level 可选值（低 / 中 / 高）</p>
                  <div className="grid grid-cols-3 gap-2">
                    {DETAIL_LEVEL_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      const label = value === "low" ? "低" : value === "medium" ? "中" : "高";
                      return (
                        <label key={value} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {label} <span className="text-black/40">({value})</span>
                        </label>
                      );
                    })}
                  </div>
                  <FieldHint help="如果不手动勾选，保存 detail_level 字段时会默认写入 low、medium、high 三个可选值。" />
                </div>
              ) : null}
              {isOutputFormatFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">output_format 可选值（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {OUTPUT_FORMAT_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      return (
                        <label key={value} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {isBackgroundFieldName(draft.name) ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">background 可选值（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {BACKGROUND_CANDIDATES.map((value) => {
                      const checked = draft.enumValues.includes(value);
                      return (
                        <label key={value} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(value);
                                } else {
                                  set.delete(value);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {value}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
              {draft.name.trim() === "aspect_ratio" ? (
                <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2.5 md:col-span-2">
                  <p className="mb-2 text-[11px] text-black/60">常用比例（可多选）</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {ASPECT_RATIO_CANDIDATES.map((ratio) => {
                      const checked = draft.enumValues.includes(ratio);
                      return (
                        <label key={ratio} className="inline-flex items-center gap-2 text-xs text-black/75">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) =>
                              setDraft((current) => {
                                const set = new Set(current.enumValues);
                                if (event.target.checked) {
                                  set.add(ratio);
                                } else {
                                  set.delete(ratio);
                                }
                                return {
                                  ...current,
                                  enumValues: Array.from(set),
                                };
                              })
                            }
                            className="size-3.5"
                          />
                          {ratio}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ) : null}
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
                展示给用户填写（工具页表单可见）
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="h-8 rounded-md border border-black/[0.1] bg-white px-3 text-xs text-black/72 hover:bg-[#E0F2FE]"
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

      <details className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2">
        <summary className="cursor-pointer text-[11px] text-black/60">JSON 预览</summary>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-[11px] text-black/70">
          {schemaValue}
        </pre>
      </details>
    </div>
  );
}

function buildDocExamplesFromSchemas(inputSchemaText: string, outputSchemaText: string) {
  const parseObj = (text: string) => {
    try {
      const parsed = JSON.parse(text) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  };
  const inputObj = parseObj(inputSchemaText);
  const outputObj = parseObj(outputSchemaText);
  const inputParams = Array.isArray(inputObj.params) ? (inputObj.params as Array<Record<string, unknown>>) : [];
  const outputFields = Array.isArray(outputObj.fields) ? (outputObj.fields as Array<Record<string, unknown>>) : [];
  const requestInput: Record<string, unknown> = {};
  for (const item of inputParams) {
    const name = typeof item.name === "string" ? item.name : "";
    if (!name || name === "model") continue;
    const example = item.example;
    if (example !== undefined) {
      requestInput[name] = example;
      continue;
    }
    const enumValues = Array.isArray(item.enum)
      ? item.enum.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      : [];
    if (enumValues.length > 0) {
      requestInput[name] = enumValues[0];
      continue;
    }
    const type = typeof item.type === "string" ? item.type : "string";
    requestInput[name] = type === "number" || type === "integer" ? 1 : type === "boolean" ? true : "example";
  }
  const requestExample = {
    model: "openoctopus/your-model",
    input: requestInput,
  };
  const submitResponseExample = {
    id: "00000000-0000-0000-0000-000000000000",
    status: "queued",
    model: "openoctopus/your-model",
  };
  const outputPayload: Record<string, unknown> = {
    format: "openoctopus.image.output.v1",
    assets: [
      {
        type: "image",
        url: "https://example.com/result.png",
        mimeType: "image/png",
      },
    ],
  };
  if (outputFields.length > 0) {
    outputPayload.raw = Object.fromEntries(
      outputFields
        .map((field) => (typeof field.name === "string" ? field.name : ""))
        .filter((name) => name.length > 0)
        .map((name) => [name, "example"])
    );
  }
  return {
    requestExampleJson: JSON.stringify(requestExample, null, 2),
    submitResponseExampleJson: JSON.stringify(submitResponseExample, null, 2),
    normalizedOutputExampleJson: JSON.stringify(
      {
        capability: "image_generation",
        status: "succeeded",
        output_payload: outputPayload,
      },
      null,
      2
    ),
  };
}

const formInputClassName =
  "h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formTextAreaClassName =
  "w-full rounded-md border border-[#BAE6FD] bg-white px-3 py-2.5 text-sm text-black outline-none transition-colors placeholder:text-black/30 focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const formSelectClassName =
  "h-10 w-full rounded-md border border-[#BAE6FD] bg-white px-3 text-sm text-black outline-none transition-colors focus:border-black/20 focus:bg-white disabled:bg-black/[0.03] disabled:text-black/35";

const panelSurfaceClassName = "rounded-2xl border border-[#BAE6FD] bg-[#F8FCFF] p-4 shadow-sm";

function parseBillingFormState(initialValue?: string): BillingFormState {
  const fallback: BillingFormState = {
    currency: "USD",
    outputPriceMode: "per_image",
    chargePerRequest: false,
    chargePerImage: true,
    chargePerVideo: false,
    chargePerSecond: false,
    chargeCombinationPrices: false,
    chargeInputTokens: false,
    chargeOutputTokens: false,
    costPerRequest: "0.04",
    costPerImage: "0.04",
    costPerVideo: "0.8",
    costPerSecond: "0.05",
    inputCostPerMillion: "0.5",
    outputCostPerMillion: "1.5",
    resolutionMultipliersJson: "{}",
    qualityMultipliersJson: "{}",
    combinationPricesJson: "{}",
    booleanSurchargesJson: "{}",
  };
  const emptyState = {
    ...fallback,
    outputPriceMode: "none",
    chargePerRequest: false,
    chargePerImage: false,
    chargePerVideo: false,
    chargePerSecond: false,
    chargeCombinationPrices: false,
    chargeInputTokens: false,
    chargeOutputTokens: false,
  };
  const hasPositiveCharge = (value: unknown) =>
    typeof value === "number"
      ? Number.isFinite(value) && value > 0
      : typeof value === "string" && Number.isFinite(Number(value)) && Number(value) > 0;

  if (!initialValue) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(initialValue) as Record<string, unknown>;
    if (parsed.billingMode === "hybrid" && parsed.charges && typeof parsed.charges === "object") {
      const charges = parsed.charges as Record<string, unknown>;
      const combinationPrices = readParameterPricesCombinations(parsed);
      const booleanSurcharges = readParameterPricesBooleanSurcharges(parsed);
      const hasCombinationPrices = Object.keys(combinationPrices).length > 0;
      const resolutionPrices = splitSingleDimensionPrices(combinationPrices, "resolution");
      const qualityPrices = splitSingleDimensionPrices(combinationPrices, "quality");
      const parameterMultipliers =
        parsed.parameterMultipliers &&
        typeof parsed.parameterMultipliers === "object" &&
        !Array.isArray(parsed.parameterMultipliers)
          ? (parsed.parameterMultipliers as Record<string, unknown>)
          : {};
      const resolutionMultipliers =
        parameterMultipliers.resolution &&
        typeof parameterMultipliers.resolution === "object" &&
        !Array.isArray(parameterMultipliers.resolution)
          ? parameterMultipliers.resolution
          : {};
      const qualityMultipliers =
        parameterMultipliers.quality &&
        typeof parameterMultipliers.quality === "object" &&
        !Array.isArray(parameterMultipliers.quality)
          ? parameterMultipliers.quality
          : {};
      const hasResolutionMultipliers = Object.keys(resolutionMultipliers).length > 0;
      const hasQualityMultipliers = Object.keys(qualityMultipliers).length > 0;
      return {
        ...fallback,
        currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
        outputPriceMode: hasCombinationPrices
          ? resolutionPrices
            ? "resolution_multiplier"
            : qualityPrices
              ? "quality_multiplier"
              : "combination_prices"
          : hasResolutionMultipliers && hasPositiveCharge(charges.perImage)
            ? "resolution_multiplier"
            : hasQualityMultipliers && hasPositiveCharge(charges.perImage)
              ? "quality_multiplier"
              : hasPositiveCharge(charges.perImage)
                ? "per_image"
                : hasPositiveCharge(charges.perVideo)
                  ? "per_video"
                  : hasPositiveCharge(charges.perSecond)
                    ? "per_second"
                    : hasPositiveCharge(charges.outputTextTokensPerMillion)
                      ? "output_tokens"
                      : "none",
        chargePerRequest: hasPositiveCharge(charges.perRequest),
        chargePerImage:
          !hasCombinationPrices &&
          !hasResolutionMultipliers &&
          !hasQualityMultipliers &&
          hasPositiveCharge(charges.perImage),
        chargePerVideo: !hasCombinationPrices && hasPositiveCharge(charges.perVideo),
        chargePerSecond: !hasCombinationPrices && hasPositiveCharge(charges.perSecond),
        chargeCombinationPrices: hasCombinationPrices || hasResolutionMultipliers || hasQualityMultipliers,
        chargeInputTokens: hasPositiveCharge(charges.inputTextTokensPerMillion),
        chargeOutputTokens: !hasCombinationPrices && hasPositiveCharge(charges.outputTextTokensPerMillion),
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
        resolutionMultipliersJson: JSON.stringify(resolutionPrices ?? resolutionMultipliers, null, 2),
        qualityMultipliersJson: JSON.stringify(qualityPrices ?? qualityMultipliers, null, 2),
        combinationPricesJson: JSON.stringify(
          Object.keys(combinationPrices).length > 0
            ? combinationPrices
            : buildLegacyCombinationPrices(parsed, fallback),
          null,
          2
        ),
        booleanSurchargesJson: JSON.stringify(booleanSurcharges, null, 2),
      };
    }

    if (!parsed.billingMode) {
      return {
        ...emptyState,
        currency: typeof parsed.currency === "string" ? parsed.currency : emptyState.currency,
      };
    }

    return {
      ...fallback,
      currency: typeof parsed.currency === "string" ? parsed.currency : fallback.currency,
      outputPriceMode:
        parsed.billingMode === "per_image"
          ? "per_image"
          : parsed.billingMode === "per_video"
            ? "per_video"
            : parsed.billingMode === "per_second"
              ? "per_second"
              : parsed.billingMode === "per_million_tokens" && hasPositiveCharge(parsed.outputCostPerMillion)
                ? "output_tokens"
                : "none",
      chargePerRequest: parsed.billingMode === "per_request" && hasPositiveCharge(parsed.costPerRequest ?? parsed.costPerUnit),
      chargePerImage: parsed.billingMode === "per_image" && hasPositiveCharge(parsed.costPerImage ?? parsed.costPerUnit),
      chargePerVideo: parsed.billingMode === "per_video" && hasPositiveCharge(parsed.costPerVideo ?? parsed.costPerUnit),
      chargePerSecond: parsed.billingMode === "per_second" && hasPositiveCharge(parsed.costPerSecond ?? parsed.costPerUnit),
      chargeCombinationPrices: fallback.chargeCombinationPrices,
      chargeInputTokens: parsed.billingMode === "per_million_tokens" && hasPositiveCharge(parsed.inputCostPerMillion),
      chargeOutputTokens: parsed.billingMode === "per_million_tokens" && hasPositiveCharge(parsed.outputCostPerMillion),
      costPerRequest: String(parsed.costPerRequest ?? parsed.costPerUnit ?? fallback.costPerRequest),
      costPerImage: String(parsed.costPerImage ?? parsed.costPerUnit ?? fallback.costPerImage),
      costPerVideo: String(parsed.costPerVideo ?? parsed.costPerUnit ?? fallback.costPerVideo),
      costPerSecond: String(parsed.costPerSecond ?? parsed.costPerUnit ?? fallback.costPerSecond),
      inputCostPerMillion: String(parsed.inputCostPerMillion ?? fallback.inputCostPerMillion),
      outputCostPerMillion: String(parsed.outputCostPerMillion ?? fallback.outputCostPerMillion),
      resolutionMultipliersJson: fallback.resolutionMultipliersJson,
      qualityMultipliersJson: fallback.qualityMultipliersJson,
      combinationPricesJson: fallback.combinationPricesJson,
      booleanSurchargesJson: fallback.booleanSurchargesJson,
    };
  } catch {
    return fallback;
  }
}

function safeParseLooseNumberMap(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .map(([key, raw]) => [key.trim(), typeof raw === "string" ? raw : String(raw)] as const)
        .filter(([key]) => key.length > 0)
    );
  } catch {
    return {};
  }
}

function safeParseNumberMap(value: string) {
  try {
    const parsed = safeParseLooseNumberMap(value);
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, raw]) => [key, Number(raw)] as const)
        .filter(([key, num]) => key.length > 0 && Number.isFinite(num) && num > 0)
    );
  } catch {
    return {};
  }
}

function stringifyLooseNumberMap(value: Record<string, string>) {
  const entries = Object.entries(value).sort((a, b) => a[0].localeCompare(b[0], "en-US"));
  return JSON.stringify(Object.fromEntries(entries), null, 2);
}

const COMBINATION_KEY_DIMENSION_ORDER = [
  "resolution",
  "duration",
  "quality",
  "hasReferenceVideos",
  "hasAudio",
] as const;

function sortCombinationDimensionEntries(entries: Array<[string, string]>) {
  return entries.sort(([leftKey], [rightKey]) => {
    const leftIndex = COMBINATION_KEY_DIMENSION_ORDER.indexOf(
      leftKey as (typeof COMBINATION_KEY_DIMENSION_ORDER)[number]
    );
    const rightIndex = COMBINATION_KEY_DIMENSION_ORDER.indexOf(
      rightKey as (typeof COMBINATION_KEY_DIMENSION_ORDER)[number]
    );

    if (leftIndex !== -1 || rightIndex !== -1) {
      if (leftIndex === -1) return 1;
      if (rightIndex === -1) return -1;
      return leftIndex - rightIndex;
    }

    return leftKey.localeCompare(rightKey, "en-US");
  });
}

function buildNamedCombinationKey(values: Record<string, string>) {
  const entries = sortCombinationDimensionEntries(
    Object.entries(values).filter(([, value]) => value.trim().length > 0)
  );

  return entries.map(([key, value]) => `${key}=${value.trim()}`).join("__");
}

function parseNamedCombinationKey(key: string) {
  if (!key.includes("=")) {
    return null;
  }

  const result: Record<string, string> = {};
  for (const part of key.split("__")) {
    const separatorIndex = part.indexOf("=");
    if (separatorIndex <= 0 || separatorIndex === part.length - 1) {
      return null;
    }

    const name = part.slice(0, separatorIndex).trim();
    const value = part.slice(separatorIndex + 1).trim();
    if (!name || !value) {
      return null;
    }
    result[name] = value;
  }

  return Object.keys(result).length > 0 ? result : null;
}

function buildCombinationKey(resolution: string, quality: string) {
  return `${resolution}__${quality}`;
}

function buildResolutionPriceKey(resolution: string) {
  return buildCombinationKey(resolution, "default");
}

function buildQualityPriceKey(quality: string) {
  return buildCombinationKey("default", quality);
}

function buildVideoCombinationKey(
  resolution: string,
  duration: string,
  hasReferenceVideos: "true" | "false",
  hasAudio: "true" | "false"
) {
  return buildNamedCombinationKey({
    resolution,
    duration,
    hasReferenceVideos,
    hasAudio,
  });
}

function readParameterPricesCombinations(parsed: Record<string, unknown>) {
  const parameterPrices =
    parsed.parameterPrices &&
    typeof parsed.parameterPrices === "object" &&
    !Array.isArray(parsed.parameterPrices)
      ? (parsed.parameterPrices as Record<string, unknown>)
      : null;
  const combinations =
    parameterPrices?.combinations &&
    typeof parameterPrices.combinations === "object" &&
    !Array.isArray(parameterPrices.combinations)
      ? (parameterPrices.combinations as Record<string, unknown>)
      : null;
  return combinations ?? {};
}

function splitSingleDimensionPrices(
  combinations: Record<string, unknown>,
  dimension: "resolution" | "quality"
) {
  const entries = Object.entries(combinations);
  const matches = entries.filter(([key]) =>
    dimension === "resolution"
      ? key.endsWith("__default")
      : key.startsWith("default__")
  );
  if (matches.length === 0 || matches.length !== entries.length) {
    return null;
  }
  return Object.fromEntries(
    matches.map(([key, value]) => [
      dimension === "resolution" ? key.replace(/__default$/, "") : key.replace(/^default__/, ""),
      value,
    ])
  );
}

function detectCombinationPricingVariant(combinations: Record<string, unknown>) {
  const values = Object.keys(combinations)
    .map((key) => parseNamedCombinationKey(key))
    .filter((item): item is Record<string, string> => Boolean(item));

  if (
    values.length > 0 &&
    values.every(
      (item) =>
        item.duration &&
        item.hasReferenceVideos &&
        item.resolution
    )
  ) {
    return "video";
  }

  return "image";
}

function readParameterPricesBooleanSurcharges(parsed: Record<string, unknown>) {
  const parameterPrices =
    parsed.parameterPrices &&
    typeof parsed.parameterPrices === "object" &&
    !Array.isArray(parsed.parameterPrices)
      ? (parsed.parameterPrices as Record<string, unknown>)
      : null;
  const booleanSurcharges =
    parameterPrices?.booleanSurcharges &&
    typeof parameterPrices.booleanSurcharges === "object" &&
    !Array.isArray(parameterPrices.booleanSurcharges)
      ? (parameterPrices.booleanSurcharges as Record<string, unknown>)
      : null;
  return booleanSurcharges ?? {};
}

function buildLegacyCombinationPrices(parsed: Record<string, unknown>, fallback: BillingFormState) {
  const charges =
    parsed.charges && typeof parsed.charges === "object" && !Array.isArray(parsed.charges)
      ? (parsed.charges as Record<string, unknown>)
      : {};
  const baseOutputPrice = Number(charges.perImage ?? charges.perVideo ?? fallback.costPerImage);
  if (!Number.isFinite(baseOutputPrice) || baseOutputPrice <= 0) {
    return {};
  }
  const parameterMultipliers =
    parsed.parameterMultipliers &&
    typeof parsed.parameterMultipliers === "object" &&
    !Array.isArray(parsed.parameterMultipliers)
      ? (parsed.parameterMultipliers as Record<string, unknown>)
      : {};
  const resolutionMultipliers =
    parameterMultipliers.resolution &&
    typeof parameterMultipliers.resolution === "object" &&
    !Array.isArray(parameterMultipliers.resolution)
      ? safeParseNumberMap(JSON.stringify(parameterMultipliers.resolution))
      : {};
  const qualityMultipliers =
    parameterMultipliers.quality &&
    typeof parameterMultipliers.quality === "object" &&
    !Array.isArray(parameterMultipliers.quality)
      ? safeParseNumberMap(JSON.stringify(parameterMultipliers.quality))
      : {};
  const resolutions = Object.keys(resolutionMultipliers);
  const qualities = Object.keys(qualityMultipliers);
  if (resolutions.length === 0 || qualities.length === 0) {
    return {};
  }
  return Object.fromEntries(
    resolutions.flatMap((resolution) =>
      qualities.map((quality) => [
        buildCombinationKey(resolution, quality),
        Number((baseOutputPrice * resolutionMultipliers[resolution] * qualityMultipliers[quality]).toFixed(8)),
      ])
    )
  );
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

  const resolutionPrices = safeParseNumberMap(state.resolutionMultipliersJson);
  const qualityPrices = safeParseNumberMap(state.qualityMultipliersJson);
  const explicitCombinationPrices = safeParseNumberMap(state.combinationPricesJson);
  const combinationPrices =
    state.outputPriceMode === "resolution_multiplier"
      ? Object.fromEntries(
          Object.entries(resolutionPrices).map(([resolution, price]) => [
            buildResolutionPriceKey(resolution),
            price,
          ])
        )
      : state.outputPriceMode === "quality_multiplier"
        ? Object.fromEntries(
            Object.entries(qualityPrices).map(([quality, price]) => [
              buildQualityPriceKey(quality),
              price,
            ])
          )
        : state.chargeCombinationPrices
          ? explicitCombinationPrices
          : {};
  const booleanSurcharges = safeParseNumberMap(state.booleanSurchargesJson);
  const parameterPrices: Record<string, Record<string, number>> = {};
  if (Object.keys(combinationPrices).length > 0) {
    parameterPrices.combinations = combinationPrices;
  }
  if (Object.keys(booleanSurcharges).length > 0) {
    parameterPrices.booleanSurcharges = booleanSurcharges;
  }

  return JSON.stringify({
    billingMode: "hybrid",
    currency: state.currency.trim() || "USD",
    charges,
    ...(Object.keys(parameterPrices).length > 0 ? { parameterPrices } : {}),
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
    resultPath: "",
    taskIdPath: "name",
    statusPath: "done",
    resultUrlPath: "response.outputUrl",
    resultTextPath: "",
    submitBodyTemplate: "",
    docRequestExampleJson: "",
    docSubmitResponseExampleJson: "",
    docNormalizedOutputExampleJson: "",
    docSourceUrl: "",
    docReadmeMarkdown: "",
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
      resultPath:
        typeof parsed.resultPath === "string" && parsed.resultPath.trim().length > 0
          ? parsed.resultPath
          : fallback.resultPath,
      taskIdPath:
        typeof parsed.taskIdPath === "string" && parsed.taskIdPath.trim().length > 0
          ? parsed.taskIdPath
          : fallback.taskIdPath,
      statusPath:
        typeof parsed.statusPath === "string" && parsed.statusPath.trim().length > 0
          ? parsed.statusPath
          : fallback.statusPath,
      resultUrlPath:
        typeof parsed.resultUrlPath === "string"
          ? parsed.resultUrlPath
          : fallback.resultUrlPath,
      resultTextPath:
        typeof parsed.resultTextPath === "string"
          ? parsed.resultTextPath
          : fallback.resultTextPath,
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
      docSourceUrl:
        parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc) && typeof (parsed.doc as Record<string, unknown>).sourceUrl === "string"
          ? ((parsed.doc as Record<string, unknown>).sourceUrl as string)
          : fallback.docSourceUrl,
      docReadmeMarkdown:
        parsed.doc && typeof parsed.doc === "object" && !Array.isArray(parsed.doc) && typeof (parsed.doc as Record<string, unknown>).readmeMarkdown === "string"
          ? ((parsed.doc as Record<string, unknown>).readmeMarkdown as string)
          : fallback.docReadmeMarkdown,
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
  };
  result.resultUrlPath = state.resultUrlPath.trim();
  const resultTextPath = (state.resultTextPath ?? "").trim();
  if (resultTextPath) {
    result.resultTextPath = resultTextPath;
  }
  if (shouldPersistAsyncFields) {
    result.pollPath = state.pollPath.trim();
    result.statusPath = state.statusPath.trim();
    if (state.resultPath.trim()) {
      result.resultPath = state.resultPath.trim();
    }
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
    sourceUrl: state.docSourceUrl.trim() || undefined,
    requestExampleJson: state.docRequestExampleJson.trim() || undefined,
    submitResponseExampleJson: state.docSubmitResponseExampleJson.trim() || undefined,
    normalizedOutputExampleJson: state.docNormalizedOutputExampleJson.trim() || undefined,
    readmeMarkdown: state.docReadmeMarkdown.trim() || undefined,
  };
  result.doc = doc;
  return JSON.stringify(result);
}

function buildAutofillPreviewPayload(input: {
  sourceText: string;
  data: {
    pricingText?: string | null;
    inputSchemaText?: string | null;
    outputSchemaText?: string | null;
    summary?: string | null;
  };
}) {
  const safeParse = (value?: string | null) => {
    if (!value || !value.trim()) return {};
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const pricing = safeParse(input.data.pricingText) as Record<string, unknown>;
  const inputSchema = safeParse(input.data.inputSchemaText) as Record<string, unknown>;
  const outputSchema = safeParse(input.data.outputSchemaText) as Record<string, unknown>;
  const inputParams = Array.isArray(inputSchema.params) ? (inputSchema.params as unknown[]) : [];
  const outputFields = Array.isArray(outputSchema.fields) ? (outputSchema.fields as unknown[]) : [];

  const pricingWarnings: string[] = [];
  const billingMode =
    typeof pricing.billingMode === "string" ? pricing.billingMode.trim() : "";
  const currency = typeof pricing.currency === "string" ? pricing.currency.trim() : "";
  const charges =
    pricing.charges && typeof pricing.charges === "object" && !Array.isArray(pricing.charges)
      ? (pricing.charges as Record<string, unknown>)
      : {};
  const chargeEntries = Object.entries(charges);
  const hasPositiveChargeEntry = chargeEntries.some(([, value]) => {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0;
  });
  const nonPositiveChargeKeys = chargeEntries
    .filter(([, value]) => {
      const numeric = Number(value);
      return Number.isFinite(numeric) && numeric <= 0;
    })
    .map(([key]) => key);
  if (!billingMode) {
    pricingWarnings.push("未识别到计费模式: pricing.billingMode");
  }
  if (!currency) {
    pricingWarnings.push("未识别到币种: pricing.currency");
  }
  if (!hasPositiveChargeEntry) {
    pricingWarnings.push("未识别到明确的大于 0 的供应商成本，请人工确认 pricing.charges");
  }
  if (nonPositiveChargeKeys.length > 0) {
    pricingWarnings.push(`识别到 0 或负数成本项（${nonPositiveChargeKeys.join(", ")}），不能作为有效供应商成本`);
  }

  const inputWarnings: string[] = [];
  if (inputParams.length === 0) {
    inputWarnings.push("未识别到任何输入参数: inputParams.params");
  }

  const outputWarnings: string[] = [];
  if (outputFields.length === 0) {
    outputWarnings.push("未识别到任何输出参数: outputParams.fields");
  }

  return {
    source: {
      contentLength: input.sourceText.length,
    },
    pricing: {
      billingMode,
      currency,
      charges,
    },
    inputParams: {
      params: inputParams,
    },
    outputParams: {
      fields: outputFields,
    },
    review: {
      pricing: {
        status: pricingWarnings.length === 0 ? "ok" : "needs_manual_check",
        warnings: pricingWarnings,
      },
      inputParams: {
        status: inputWarnings.length === 0 ? "ok" : "needs_manual_check",
        warnings: inputWarnings,
      },
      outputParams: {
        status: outputWarnings.length === 0 ? "ok" : "needs_manual_check",
        warnings: outputWarnings,
      },
    },
    summary: input.data.summary ?? "",
  };
}

type AutofillReviewBlock = {
  status: "ok" | "needs_manual_check";
  warnings: string[];
};

type AutofillReviewPayload = {
  pricing: AutofillReviewBlock;
  inputParams: AutofillReviewBlock;
  outputParams: AutofillReviewBlock;
};

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
  if (value === "image_recognition") return "图片识别";
  if (value === "text_generation") return "对话生成";
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

function ParameterMultiplierTable({
  title,
  valueLabel,
  candidates,
  values,
  onChange,
  help,
}: {
  title: string;
  valueLabel: string;
  candidates: string[];
  values: Record<string, string>;
  onChange: (key: string, value?: string) => void;
  help: string;
}) {
  return (
    <div className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
      <p className="text-[11px] tracking-[0.35px] text-black/60">{title}</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#DDF4FF] bg-white">
        <table className="w-full min-w-[360px] text-left text-xs">
          <thead className="bg-[#F8FCFF] text-black/45">
            <tr>
              <th className="px-2 py-2 font-medium">启用</th>
              <th className="px-2 py-2 font-medium">{valueLabel}</th>
              <th className="px-2 py-2 font-medium">单价</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const enabled = candidate in values;
              const inputValue = values[candidate] ?? "0.01";
              return (
                <tr key={candidate} className="border-t border-black/[0.05]">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => onChange(candidate, event.target.checked ? inputValue : undefined)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-black/70">{candidate}</td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={inputValue}
                      disabled={!enabled}
                      onChange={(event) => onChange(candidate, event.target.value)}
                      className="h-8 w-28 rounded-md border border-[#BAE6FD] bg-white px-2 text-xs text-black disabled:bg-black/[0.03] disabled:text-black/35"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FieldHint help={help} />
    </div>
  );
}

function BooleanSurchargeTable({
  values,
  onChange,
  capability,
}: {
  values: Record<string, string>;
  onChange: (key: string, value?: string) => void;
  capability?: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation" | null;
}) {
  const candidates = Array.from(new Set([...BOOLEAN_SURCHARGE_CANDIDATES, ...Object.keys(values)]));
  const labelForCandidate = (candidate: string) => {
    if (candidate === "hasAudio" && capability === "video_generation") {
      return "是否带音频";
    }

    return candidate;
  };

  return (
    <div className="mt-3 rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
      <p className="text-[11px] tracking-[0.35px] text-black/60">布尔参数附加费</p>
      <div className="mt-2 overflow-x-auto rounded-lg border border-[#DDF4FF] bg-white">
        <table className="w-full min-w-[460px] text-left text-xs">
          <thead className="bg-[#F8FCFF] text-black/45">
            <tr>
              <th className="px-2 py-2 font-medium">启用</th>
              <th className="px-2 py-2 font-medium">boolean 参数</th>
              <th className="px-2 py-2 font-medium">附加金额</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const enabled = candidate in values;
              const inputValue = values[candidate] ?? "0.01";
              return (
                <tr key={candidate} className="border-t border-black/[0.05]">
                  <td className="px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={enabled}
                      onChange={(event) => onChange(candidate, event.target.checked ? inputValue : undefined)}
                      className="size-3.5"
                    />
                  </td>
                  <td className="px-2 py-1.5 text-black/70">
                    {candidate === "hasAudio" && capability === "video_generation" ? (
                      <span>{labelForCandidate(candidate)} <span className="font-mono text-black/45">({candidate})</span></span>
                    ) : (
                      <span className="font-mono">{candidate}</span>
                    )}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      value={inputValue}
                      disabled={!enabled}
                      onChange={(event) => onChange(candidate, event.target.value)}
                      className="h-8 w-28 rounded-md border border-[#BAE6FD] bg-white px-2 text-xs text-black disabled:bg-black/[0.03] disabled:text-black/35"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <FieldHint
        help={
          capability === "video_generation"
            ? "当请求 input 里的对应 boolean 参数为 true 时，把这里配置的金额直接加到本次请求总价上。视频模型可用 hasAudio 作为带音频附加费。"
            : "当请求 input 里的对应 boolean 参数为 true 时，把这里配置的金额直接加到本次请求总价上。"
        }
      />
    </div>
  );
}

export function BillingConfigEditor({
  name = "billingConfig",
  initialValue,
  capability,
  componentHint = "启用一个或多个计费维度。Gemini 2.5 Flash Image 通常按输入 token 和输出图片共同计费。",
  generatedLabel = "生成的计费配置",
}: {
  name?: string;
  initialValue?: string;
  capability?: "image_generation" | "image_edit" | "image_recognition" | "text_generation" | "video_generation" | null;
  componentHint?: string;
  generatedLabel?: string;
}) {
  const [state, setState] = useState(() => parseBillingFormState(initialValue));
  useEffect(() => {
    setState(parseBillingFormState(initialValue));
  }, [initialValue]);
  const hiddenValue = buildBillingConfigValue(state);
  const resolutionMultiplierMap = safeParseLooseNumberMap(state.resolutionMultipliersJson);
  const qualityMultiplierMap = safeParseLooseNumberMap(state.qualityMultipliersJson);
  const combinationPriceMap = safeParseLooseNumberMap(state.combinationPricesJson);
  const booleanSurchargeMap = safeParseLooseNumberMap(state.booleanSurchargesJson);
  const combinationPricingVariant = detectCombinationPricingVariant(combinationPriceMap);
  const isVideoPricingEditor =
    capability === "video_generation" || combinationPricingVariant === "video";
  const inputMethod = state.chargeInputTokens
    ? "input_tokens"
    : "none";
  const outputMethod = state.chargeOutputTokens
    ? state.outputPriceMode || "output_tokens"
    : state.chargeCombinationPrices
      ? state.outputPriceMode || "combination_prices"
      : state.chargePerRequest
        ? "per_request"
      : state.chargePerImage
      ? state.outputPriceMode || "per_image"
      : state.chargePerVideo
        ? state.outputPriceMode || "per_video"
        : state.chargePerSecond
          ? state.outputPriceMode || "per_second"
          : "none";

  const applyInputMethod = (method: string) => {
    setState((current) => ({
      ...current,
      chargeInputTokens: method === "input_tokens",
    }));
  };

  const applyOutputMethod = (method: string) => {
    setState((current) => ({
      ...current,
      outputPriceMode: method,
      chargeOutputTokens: method === "output_tokens",
      chargeCombinationPrices: method === "combination_prices" || method === "resolution_multiplier" || method === "quality_multiplier",
      chargePerRequest: method === "per_request",
      chargePerImage: method === "per_image",
      chargePerVideo: method === "per_video",
      chargePerSecond: method === "per_second",
    }));
  };

  const updateCombinationPrice = (key: string, value?: string) => {
    const currentMap = safeParseLooseNumberMap(state.combinationPricesJson);
    if (value === undefined) {
      delete currentMap[key];
    } else {
      currentMap[key] = value;
    }
    const nextJson = stringifyLooseNumberMap(currentMap);
    setState((current) => ({ ...current, combinationPricesJson: nextJson }));
  };

  const updateResolutionMultiplier = (key: string, value?: string) => {
    const currentMap = safeParseLooseNumberMap(state.resolutionMultipliersJson);
    if (value === undefined) {
      delete currentMap[key];
    } else {
      currentMap[key] = value;
    }
    const nextJson = stringifyLooseNumberMap(currentMap);
    setState((current) => ({ ...current, resolutionMultipliersJson: nextJson }));
  };

  const updateQualityMultiplier = (key: string, value?: string) => {
    const currentMap = safeParseLooseNumberMap(state.qualityMultipliersJson);
    if (value === undefined) {
      delete currentMap[key];
    } else {
      currentMap[key] = value;
    }
    const nextJson = stringifyLooseNumberMap(currentMap);
    setState((current) => ({ ...current, qualityMultipliersJson: nextJson }));
  };

  const updateBooleanSurcharge = (key: string, value?: string) => {
    const currentMap = safeParseLooseNumberMap(state.booleanSurchargesJson);
    if (value === undefined) {
      delete currentMap[key];
    } else {
      currentMap[key] = value;
    }
    const nextJson = stringifyLooseNumberMap(currentMap);
    setState((current) => ({ ...current, booleanSurchargesJson: nextJson }));
  };

  return (
    <div className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
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

        <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] px-3 py-3">
          <p className="text-[11px] tracking-[0.35px] text-black/45">成本计费维度</p>
          <div className="mt-2 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[#BAE6FD] bg-white p-2.5">
              <p className="mb-2 text-[11px] font-medium text-black/55">输入成本</p>
              <select
                value={inputMethod}
                onChange={(event) => applyInputMethod(event.target.value)}
                className={formSelectClassName}
              >
                <option value="none">不计费</option>
                <option value="input_tokens">按输入 Token（每百万）</option>
              </select>
            </div>
            <div className="rounded-lg border border-[#BAE6FD] bg-white p-2.5">
              <p className="mb-2 text-[11px] font-medium text-black/55">输出成本</p>
              <select
                value={outputMethod}
                onChange={(event) => applyOutputMethod(event.target.value)}
                className={formSelectClassName}
              >
                <option value="none">不计费</option>
                <option value="per_request">按次 / 每次请求</option>
                <option value="per_image">按图片</option>
                <option value="resolution_multiplier">按 resolution 阶梯单价</option>
                <option value="quality_multiplier">按 quality 阶梯单价</option>
                <option value="per_video">按视频</option>
                <option value="combination_prices">
                  {isVideoPricingEditor
                    ? "按 resolution + duration + reference + audio 组合阶梯"
                    : "按 resolution + quality 组合阶梯"}
                </option>
                <option value="per_second">按秒</option>
                <option value="output_tokens">按输出 Token（每百万）</option>
              </select>
            </div>
          </div>
          <FieldHint help={componentHint} />
        </div>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {outputMethod === "per_request" ? (
          <BillingNumberField
            label="输出成本金额（每次请求）"
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

      {outputMethod === "combination_prices" ? (
      <div className="mt-3 rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/60">
          {isVideoPricingEditor
            ? "resolution + duration + reference videos + audio 组合阶梯单价"
            : "resolution + quality 组合阶梯单价"}
        </p>
        <div className="mt-2 overflow-x-auto rounded-lg border border-[#DDF4FF] bg-white">
          <table className="min-w-[560px] w-full text-left text-xs">
            <thead className="bg-[#F8FCFF] text-black/45">
              <tr>
                <th className="px-2 py-2 font-medium">启用</th>
                <th className="px-2 py-2 font-medium">resolution</th>
                <th className="px-2 py-2 font-medium">
                  {isVideoPricingEditor ? "duration" : "quality"}
                </th>
                {isVideoPricingEditor ? (
                  <>
                    <th className="px-2 py-2 font-medium">reference videos</th>
                    <th className="px-2 py-2 font-medium">audio</th>
                  </>
                ) : null}
                <th className="px-2 py-2 font-medium">输出单价</th>
              </tr>
            </thead>
            <tbody>
              {isVideoPricingEditor
                ? VIDEO_RESOLUTION_CANDIDATES.flatMap((resolution) =>
                    VIDEO_DURATION_CANDIDATES.flatMap((duration) =>
                      VIDEO_REFERENCE_VIDEO_CANDIDATES.flatMap(
                        ({ value: referenceValue, label: referenceLabel }) =>
                          VIDEO_AUDIO_CANDIDATES.map(({ value: audioValue, label: audioLabel }) => {
                            const key = buildVideoCombinationKey(
                              resolution,
                              duration,
                              referenceValue as "true" | "false",
                              audioValue as "true" | "false"
                            );
                            const enabled = key in combinationPriceMap;
                            const inputValue =
                              combinationPriceMap[key] ??
                              String(Number(state.costPerVideo || state.costPerImage || 1));
                            return (
                              <tr key={key} className="border-t border-black/[0.05]">
                                <td className="px-2 py-1.5">
                                  <input
                                    type="checkbox"
                                    checked={enabled}
                                    onChange={(event) =>
                                      updateCombinationPrice(
                                        key,
                                        event.target.checked ? inputValue : undefined
                                      )
                                    }
                                    className="size-3.5"
                                  />
                                </td>
                                <td className="px-2 py-1.5 text-black/70">{resolution}</td>
                                <td className="px-2 py-1.5 text-black/70">{duration}s</td>
                                <td className="px-2 py-1.5 text-black/70">{referenceLabel}</td>
                                <td className="px-2 py-1.5 text-black/70">{audioLabel}</td>
                                <td className="px-2 py-1.5">
                                  <input
                                    type="number"
                                    min="0.000001"
                                    step="0.000001"
                                    value={inputValue}
                                    disabled={!enabled}
                                    onChange={(event) => updateCombinationPrice(key, event.target.value)}
                                    className="h-8 w-28 rounded-md border border-[#BAE6FD] bg-white px-2 text-xs text-black disabled:bg-black/[0.03] disabled:text-black/35"
                                  />
                                </td>
                              </tr>
                            );
                          })
                      )
                    )
                  )
                : RESOLUTION_CANDIDATES.flatMap((resolution) =>
                    QUALITY_CANDIDATES.map((quality) => {
                      const key = buildCombinationKey(resolution, quality);
                      const enabled = key in combinationPriceMap;
                      const inputValue =
                        combinationPriceMap[key] ??
                        String(Number(state.costPerImage || state.costPerVideo || 1));
                      return (
                        <tr key={key} className="border-t border-black/[0.05]">
                          <td className="px-2 py-1.5">
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={(event) =>
                                updateCombinationPrice(
                                  key,
                                  event.target.checked ? inputValue : undefined
                                )
                              }
                              className="size-3.5"
                            />
                          </td>
                          <td className="px-2 py-1.5 text-black/70">{resolution}</td>
                          <td className="px-2 py-1.5 text-black/70">{quality}</td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min="0.000001"
                              step="0.000001"
                              value={inputValue}
                              disabled={!enabled}
                              onChange={(event) => updateCombinationPrice(key, event.target.value)}
                              className="h-8 w-28 rounded-md border border-[#BAE6FD] bg-white px-2 text-xs text-black disabled:bg-black/[0.03] disabled:text-black/35"
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
            </tbody>
          </table>
        </div>
        <FieldHint
          help={
            isVideoPricingEditor
              ? "选择组合阶梯计价后，基础 perVideo 不再参与输出计价；命中的 resolution + duration + hasReferenceVideos + hasAudio 组合会直接作为每个视频的输出单价。"
              : "选择组合阶梯计价后，基础 perImage/perVideo 不再参与输出计价；命中的 resolution + quality 组合会直接作为每张图片/每个视频的输出单价。"
          }
        />
      </div>
      ) : null}

      {outputMethod === "resolution_multiplier" || outputMethod === "quality_multiplier" ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {outputMethod === "resolution_multiplier" ? (
          <ParameterMultiplierTable
            title="单独 resolution 阶梯单价"
            valueLabel="resolution"
            candidates={RESOLUTION_CANDIDATES}
            values={resolutionMultiplierMap}
            onChange={updateResolutionMultiplier}
            help="直接填写该 resolution 的单张输出价格，例如 1k=0.07、2k=0.14、4k=0.24。"
          />
          ) : null}
          {outputMethod === "quality_multiplier" ? (
          <ParameterMultiplierTable
            title="单独 quality 阶梯单价"
            valueLabel="quality"
            candidates={QUALITY_CANDIDATES}
            values={qualityMultiplierMap}
            onChange={updateQualityMultiplier}
            help="直接填写该 quality 的单张输出价格，例如 low=0.03、medium=0.07、high=0.14。"
          />
          ) : null}
        </div>
      ) : null}

      <BooleanSurchargeTable
        values={booleanSurchargeMap}
        onChange={updateBooleanSurcharge}
        capability={capability}
      />

      <div className="mt-3 rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] px-3 py-2.5">
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
  defaultInputSchema = "{}",
  defaultOutputSchema = "{}",
  defaultExecutionTemplate = "rest-async-poll-v1",
  defaultExecutionConfig = '{"submitPath":"/v1/models/{upstreamModel}:generate","pollPath":"/v1/operations/{taskId}","taskIdPath":"name","statusPath":"done","resultUrlPath":"response.outputUrl"}',
  defaultActive = true,
  defaultShowcaseCoverUrl = null,
  defaultPlaygroundInputUrl = null,
  defaultFacePlaygroundInputUrl = null,
  defaultShowcaseGalleryUrls = [],
  defaultShowcaseCoverPrompt = "",
  defaultPlaygroundInputPrompt = "",
  defaultFacePlaygroundInputPrompt = "",
  defaultShowcaseGalleryPrompts = [],
  defaultShowcaseCoverAssetId,
  defaultPlaygroundInputAssetId,
  defaultFacePlaygroundInputAssetId,
  defaultShowcaseGalleryAssetIds = [],
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
  defaultInputSchema?: string;
  defaultOutputSchema?: string;
  defaultExecutionTemplate?: string;
  defaultExecutionConfig?: string;
  defaultActive?: boolean;
  defaultShowcaseCoverUrl?: string | null;
  defaultPlaygroundInputUrl?: string | null;
  defaultFacePlaygroundInputUrl?: string | null;
  defaultShowcaseGalleryUrls?: string[];
  defaultShowcaseCoverPrompt?: string;
  defaultPlaygroundInputPrompt?: string;
  defaultFacePlaygroundInputPrompt?: string;
  defaultShowcaseGalleryPrompts?: string[];
  defaultShowcaseCoverAssetId?: string;
  defaultPlaygroundInputAssetId?: string;
  defaultFacePlaygroundInputAssetId?: string;
  defaultShowcaseGalleryAssetIds?: string[];
  providerModelId?: string;
  disabled: boolean;
  onSuccess?: () => void;
  submitLabel?: string;
  className?: string;
  formId?: string;
  showSubmitButton?: boolean;
}) {
  type ProviderModelFormTab =
    | "ai-autofill"
    | "basic"
    | "protocol"
    | "input-params"
    | "output-params"
    | "doc-examples"
    | "readme-doc"
    | "showcase-assets"
    | "cost";
  const fallbackSupportedModelId = supportedModels[0]?.id ?? "";
  const templateSupportedModelId =
    supportedModels.find((item) => item.modelSlug === defaultSupportedModelSlug)?.id ??
    fallbackSupportedModelId;
  const [supportedModelId, setSupportedModelId] = useState(templateSupportedModelId);
  const [providerId, setProviderId] = useState(
    defaultProviderId && providers.some((item) => item.id === defaultProviderId)
      ? defaultProviderId
      : (providers[0]?.id ?? "")
  );

  useEffect(() => {
    setSupportedModelId(templateSupportedModelId);
  }, [templateSupportedModelId]);
  useEffect(() => {
    if (defaultProviderId && providers.some((item) => item.id === defaultProviderId)) {
      setProviderId(defaultProviderId);
      return;
    }
    setProviderId((current) => {
      if (current && providers.some((item) => item.id === current)) {
        return current;
      }
      return providers[0]?.id ?? "";
    });
  }, [defaultProviderId, providers]);

  const selectedSupportedModel =
    supportedModels.find((item) => item.id === supportedModelId) ?? null;
  const [submitted, setSubmitted] = useState(false);
  const workerTemplateOptions =
    workerTemplates.length > 0
      ? workerTemplates
      : [{ id: "fallback", displayName: "任务轮询（提交后查询）", slug: defaultExecutionTemplate }];
  const [executionTemplate, setExecutionTemplate] = useState(defaultExecutionTemplate);
  const [rootTab, setRootTab] = useState<ProviderModelRootTab>("manage");
  const [selectedPresetId, setSelectedPresetId] = useState("");
  const [executionConfigState, setExecutionConfigState] = useState(() =>
    parseExecutionConfigState(defaultExecutionConfig)
  );
  const [upstreamModelSlug, setUpstreamModelSlug] = useState(defaultUpstreamModelSlug ?? "");
  const [autofillSourceText, setAutofillSourceText] = useState("");
  const [autofillSummary, setAutofillSummary] = useState("");
  const [autofillPreviewJson, setAutofillPreviewJson] = useState("");
  const [autofillDebugRawOutput, setAutofillDebugRawOutput] = useState("");
  const [seedInputSchemaText, setSeedInputSchemaText] = useState("");
  const [seedOutputSchemaText, setSeedOutputSchemaText] = useState("");
  const [seedPricingText, setSeedPricingText] = useState(defaultPricing ?? "");
  const [currentInputSchemaText, setCurrentInputSchemaText] = useState(defaultInputSchema);
  const [currentOutputSchemaText, setCurrentOutputSchemaText] = useState(defaultOutputSchema);
  const [isAutofilling, startAutofillTransition] = useTransition();
  const executionConfigValue = buildExecutionConfigValue(executionConfigState);
  const templateIsAsync =
    executionTemplate === "rest-async-poll-v1" || executionTemplate === "upload-async-poll-v1";
  const isAsyncMode = executionConfigState.mode === "async" || (executionConfigState.mode === "auto" && templateIsAsync);
  const isTextOutputModel =
    selectedSupportedModel?.capability === "image_recognition" ||
    selectedSupportedModel?.capability === "text_generation";
  const [activeTab, setActiveTab] = useState<ProviderModelFormTab>("ai-autofill");
  void defaultActive;
  const [selectedCoverFileName, setSelectedCoverFileName] = useState("");
  const [selectedPlaygroundInputFileName, setSelectedPlaygroundInputFileName] = useState("");
  const [selectedFacePlaygroundInputFileName, setSelectedFacePlaygroundInputFileName] = useState("");
  const [selectedGalleryFileNames, setSelectedGalleryFileNames] = useState<string[]>([]);
  const galleryPromptPlaceholder = defaultShowcaseGalleryPrompts
    .map((prompt, index) => `${index + 1}. ${prompt}`)
    .join("\n");
  const sectionRefs = useRef<Record<ProviderModelFormTab, HTMLDivElement | null>>({
    "ai-autofill": null,
    basic: null,
    protocol: null,
    "input-params": null,
    "output-params": null,
    "doc-examples": null,
    "readme-doc": null,
    "showcase-assets": null,
    cost: null,
  });
  const tabItems = useMemo(
    () => [
      { key: "ai-autofill" as const, label: "AI 模型请求识别" },
      { key: "basic" as const, label: "基本信息" },
      { key: "protocol" as const, label: "调用协议配置" },
      { key: "input-params" as const, label: "输入参数" },
      { key: "output-params" as const, label: "输出参数" },
      { key: "doc-examples" as const, label: "示例配置" },
      { key: "readme-doc" as const, label: "README 文档配置" },
      { key: "showcase-assets" as const, label: "效果素材图" },
      { key: "cost" as const, label: "供应商成本配置" },
    ],
    []
  );

  useEffect(() => {
    setExecutionTemplate(defaultExecutionTemplate);
    setSelectedPresetId("");
    setExecutionConfigState(parseExecutionConfigState(defaultExecutionConfig));
    setUpstreamModelSlug(defaultUpstreamModelSlug ?? "");
    setAutofillSourceText("");
    setAutofillSummary("");
    setAutofillPreviewJson("");
    setAutofillDebugRawOutput("");
    setSeedInputSchemaText("");
    setSeedOutputSchemaText("");
    setSeedPricingText(defaultPricing ?? "");
    setCurrentInputSchemaText(defaultInputSchema);
    setCurrentOutputSchemaText(defaultOutputSchema);
  }, [
    defaultExecutionConfig,
    defaultExecutionTemplate,
    defaultUpstreamModelSlug,
    defaultPricing,
    defaultInputSchema,
    defaultOutputSchema,
  ]);

  const runAutofillFromUrl = () => {
    const sourceText = autofillSourceText.trim();
    if (!sourceText) {
      toast.error("请先粘贴文档内容");
      return;
    }

    startAutofillTransition(async () => {
      const result = await generateProviderModelDraftFromSource({
        sourceText,
      });
      if (!result.ok) {
        toast.error(result.error || "自动填充失败");
        setAutofillDebugRawOutput("debugRawOutput" in result && typeof result.debugRawOutput === "string" ? result.debugRawOutput : "");
        return;
      }
      setAutofillDebugRawOutput("");

      const payload = result.data;
      if (payload.pricingText && payload.pricingText.trim()) {
        setSeedPricingText(payload.pricingText);
      }
      setSeedInputSchemaText(payload.inputSchemaText || "{}");
      setSeedOutputSchemaText(payload.outputSchemaText || "{}");
      setAutofillSummary(payload.summary ?? "");
      setAutofillPreviewJson(
        JSON.stringify(
          buildAutofillPreviewPayload({
            sourceText,
            data: payload,
          }),
          null,
          2
        )
      );
      toast.success("已完成自动识别并填充");
      setActiveTab("cost");
    });
  };

  const autofillReview = useMemo<AutofillReviewPayload | null>(() => {
    if (!autofillPreviewJson.trim()) return null;
    try {
      const parsed = JSON.parse(autofillPreviewJson) as Record<string, unknown>;
      const reviewRaw =
        parsed.review && typeof parsed.review === "object" && !Array.isArray(parsed.review)
          ? (parsed.review as Record<string, unknown>)
          : null;
      if (!reviewRaw) return null;

      const normalizeBlock = (value: unknown): AutofillReviewBlock => {
        if (!value || typeof value !== "object" || Array.isArray(value)) {
          return { status: "needs_manual_check", warnings: ["缺少风险检查结果"] };
        }
        const block = value as Record<string, unknown>;
        const status = block.status === "ok" ? "ok" : "needs_manual_check";
        const warnings = Array.isArray(block.warnings)
          ? (block.warnings.filter((item): item is string => typeof item === "string") as string[])
          : [];
        return { status, warnings };
      };

      return {
        pricing: normalizeBlock(reviewRaw.pricing),
        inputParams: normalizeBlock(reviewRaw.inputParams),
        outputParams: normalizeBlock(reviewRaw.outputParams),
      };
    } catch {
      return null;
    }
  }, [autofillPreviewJson]);

  return (
    <form
      id={formId}
      action={action}
      className={className}
      onSubmit={(event) => {
        const formData = new FormData(event.currentTarget);
        const missing: string[] = [];
        let nextRootTab: ProviderModelRootTab | null = null;
        let nextActiveTab: ProviderModelFormTab | null = null;

        const upstreamModelValue = String(formData.get("upstreamModelSlug") ?? "").trim();
        if (!upstreamModelValue) {
          missing.push("上游模型标识");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (!executionConfigState.submitPath.trim()) {
          missing.push("submitPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (!executionConfigState.taskIdPath.trim()) {
          missing.push("taskIdPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (isTextOutputModel && !executionConfigState.resultTextPath.trim()) {
          missing.push("resultTextPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (!isTextOutputModel && !executionConfigState.resultUrlPath.trim()) {
          missing.push("resultUrlPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (isAsyncMode && !executionConfigState.pollPath.trim()) {
          missing.push("pollPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (isAsyncMode && !executionConfigState.statusPath.trim()) {
          missing.push("statusPath");
          nextRootTab ??= "manage";
          nextActiveTab ??= "basic";
        }
        if (rootTab === "source-doc" && !executionConfigState.docSourceUrl.trim()) {
          missing.push("原文档 URL");
          nextRootTab ??= "source-doc";
        }
        if (!hasPositivePricingCharge(String(formData.get("pricing") ?? ""))) {
          missing.push("供应商成本配置（至少 1 个大于 0 的成本项）");
          nextRootTab ??= "manage";
          nextActiveTab ??= "cost";
        }

        const inputWarnings = getSchemaRequiredWarnings(
          String(formData.get("inputSchema") ?? ""),
          "params",
          "输入参数"
        );
        if (inputWarnings.length > 0) {
          missing.push(...inputWarnings);
          nextRootTab ??= "manage";
          nextActiveTab ??= "input-params";
        }

        const outputWarnings = getSchemaRequiredWarnings(
          String(formData.get("outputSchema") ?? ""),
          "fields",
          "输出参数"
        );
        if (outputWarnings.length > 0) {
          missing.push(...outputWarnings);
          nextRootTab ??= "manage";
          nextActiveTab ??= "output-params";
        }

        if (missing.length > 0) {
          event.preventDefault();
          if (nextRootTab) {
            setRootTab(nextRootTab);
          }
          if (nextActiveTab) {
            setActiveTab(nextActiveTab);
          }
          toast.error(`请先补全必填项：${missing.slice(0, 4).join("、")}${missing.length > 4 ? "…" : ""}`);
          return;
        }

        setSubmitted(true);
      }}
    >
      <FormAutoClose submitted={submitted} onSuccess={onSuccess} />
      {providerModelId ? (
        <input type="hidden" name="providerModelId" value={providerModelId} />
      ) : null}
      <input type="hidden" name="supportedModelId" value={supportedModelId} />
      <input type="hidden" name="providerId" value={providerId} />
      <input
        type="hidden"
        name="capability"
        value={selectedSupportedModel?.capability ?? ""}
      />
      <input type="hidden" name="upstreamModelSlug" value={upstreamModelSlug} />
      {rootTab === "source-doc" ? (
        <>
          <input
            type="hidden"
            name="pricing"
            value={
              seedPricingText && seedPricingText.trim()
                ? seedPricingText
                : defaultPricing && defaultPricing.trim()
                  ? defaultPricing
                  : '{"billingMode":"hybrid","currency":"USD","charges":{}}'
            }
          />
          <input type="hidden" name="executionTemplate" value={executionTemplate} />
          <input type="hidden" name="executionConfig" value={executionConfigValue} />
          <input type="hidden" name="inputSchema" value={currentInputSchemaText || defaultInputSchema} />
          <input type="hidden" name="outputSchema" value={currentOutputSchemaText || defaultOutputSchema} />
        </>
      ) : null}
      <div className="mb-0.5 flex items-center gap-1">
        <button
          type="button"
          onClick={() => setRootTab("manage")}
          className={`inline-flex h-[26px] items-center rounded-md border px-2 text-[11px] font-medium ${
            rootTab === "manage" ? "border-black bg-black text-white" : "border-black/[0.1] bg-white text-black/70"
          }`}
        >
          信息管理
        </button>
        <button
          type="button"
          onClick={() => setRootTab("source-doc")}
          className={`inline-flex h-[26px] items-center rounded-md border px-2 text-[11px] font-medium ${
            rootTab === "source-doc" ? "border-black bg-black text-white" : "border-black/[0.1] bg-white text-black/70"
          }`}
        >
          原文档内容
        </button>
      </div>
      {rootTab === "source-doc" ? (
        <div className="space-y-2">
          <input
            value={executionConfigState.docSourceUrl}
            onChange={(event) =>
              setExecutionConfigState((current) => ({ ...current, docSourceUrl: event.target.value }))
            }
            disabled={disabled}
            className={formInputClassName}
            placeholder="https://provider-docs.example.com/model-doc"
          />
          <div className="h-[65vh] overflow-hidden rounded-lg border border-[#BAE6FD] bg-[#F8FCFF]">
            {executionConfigState.docSourceUrl.trim() ? (
              <iframe
                src={executionConfigState.docSourceUrl.trim()}
                title="Source documentation"
                className="h-full w-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-black/45">
                填写文档 URL 后可在这里直接查看原文档
              </div>
            )}
          </div>
        </div>
      ) : null}
      {rootTab === "manage" ? (
      <div className="grid items-start gap-3 lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="self-start rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-1.5">
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
                      section.scrollIntoView({ behavior: "auto", block: "start" });
                    }
                  }}
                  className={`flex w-full cursor-pointer items-center rounded-md px-2.5 py-1.5 text-left text-[11px] font-medium transition-colors ${
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

        <div className="space-y-3 pr-1">
        <div
          ref={(node) => {
            sectionRefs.current["ai-autofill"] = node;
          }}
          className={activeTab === "ai-autofill" ? "grid gap-2" : "hidden"}
        >
        <label className="block md:col-span-2">
          <span className="mb-1 block text-[11px] tracking-[0.35px] text-black/60">文档内容自动填充</span>
          <div className="mt-1.5 flex items-start gap-1.5">
            <textarea
              value={autofillSourceText}
              onChange={(event) => setAutofillSourceText(event.target.value)}
              placeholder="把上游文档整页内容粘贴到这里..."
              disabled={disabled || isAutofilling}
              className={formTextAreaClassName}
              rows={7}
            />
            <button
              type="button"
              onClick={runAutofillFromUrl}
              disabled={disabled || isAutofilling}
              className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-md bg-black px-2.5 text-[11px] font-medium text-white transition-colors hover:bg-black/90 disabled:cursor-not-allowed disabled:bg-black/20 disabled:text-black/45"
            >
              {isAutofilling ? "解析中..." : "AI 自动填充"}
            </button>
          </div>
          <FieldHint help="粘贴文档全文后自动填充输入参数、输出参数、供应商成本配置，并在识别结果里标注三大区域的人工检查建议。" />
          {autofillSummary ? (
            <p className="mt-1.5 rounded-md border border-[#BAE6FD] bg-[#F8FCFF] px-2 py-1.5 text-xs text-black/65">
              {autofillSummary}
            </p>
          ) : null}
          {autofillPreviewJson ? (
            <div className="mt-1.5 rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] tracking-[0.35px] text-black/60">识别结果 JSON（空字段表示未识别）</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(autofillPreviewJson);
                      toast.success("已复制识别结果 JSON");
                    } catch {
                      toast.error("复制失败，请重试");
                    }
                  }}
                  className="inline-flex h-7 cursor-pointer items-center rounded border border-black/[0.1] bg-white px-2 text-[11px] text-black/65 hover:bg-[#E0F2FE]"
                >
                  复制 JSON
                </button>
              </div>
              <pre className="max-h-[300px] overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-black/70">
                {autofillPreviewJson}
              </pre>
            </div>
          ) : null}
          {autofillReview ? (
            <div className="mt-1.5 rounded-md border border-[#BAE6FD] bg-white p-2">
              <p className="mb-1.5 text-[11px] tracking-[0.35px] text-black/60">风险检查结果（建议人工检查）</p>
              <div className="grid gap-2 md:grid-cols-3">
                {([
                  ["pricing", "供应商成本配置"],
                  ["inputParams", "输入参数"],
                  ["outputParams", "输出参数"],
                ] as const).map(([key, label]) => {
                  const block = autofillReview[key];
                  const ok = block.status === "ok";
                  return (
                    <div
                      key={key}
                      className={`rounded-md border p-1.5 ${
                        ok
                          ? "border-[#CFE7D4] bg-[#F3FBF5]"
                          : "border-[#F1D2CC] bg-[#FFF7F5]"
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-black/75">{label}</p>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] ${
                            ok ? "bg-[#D9F2DF] text-[#245C31]" : "bg-[#FDE2DC] text-[#8D4336]"
                          }`}
                        >
                          {ok ? "OK" : "需人工检查"}
                        </span>
                      </div>
                      {block.warnings.length > 0 ? (
                        <div className="space-y-1">
                          {block.warnings.map((warning) => (
                            <p key={warning} className="text-[11px] leading-4 text-black/70">
                              {warning}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] leading-4 text-black/55">未发现缺失项</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          {autofillDebugRawOutput ? (
            <div className="mt-1.5 rounded-md border border-[#F1D2CC] bg-[#FFF7F5] p-2">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-[11px] tracking-[0.35px] text-[#8D4336]">
                  原始返回内容（调试）
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(autofillDebugRawOutput);
                      toast.success("已复制原始调试内容");
                    } catch {
                      toast.error("复制失败，请重试");
                    }
                  }}
                  className="inline-flex h-7 cursor-pointer items-center rounded border border-black/[0.1] bg-white px-2 text-[11px] text-black/65 hover:bg-[#E0F2FE]"
                >
                  复制调试内容
                </button>
              </div>
              <pre className="max-h-[240px] overflow-auto whitespace-pre-wrap break-all text-[11px] leading-5 text-[#8D4336]">
                {autofillDebugRawOutput}
              </pre>
            </div>
          ) : null}
        </label>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.basic = node;
          }}
          className={activeTab === "basic" ? "grid gap-3 md:grid-cols-2" : "hidden"}
        >
        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">可售模型</span>
          <select
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
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
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
            className="h-10 w-full rounded-md border border-[#BAE6FD] bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
          />
          <FieldHint help="这里跟随可售模型锁定，避免把图片和视频实现混在一起。" />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上游模型 slug / 标识</span>
          <input
            value={upstreamModelSlug}
            onChange={(event) => setUpstreamModelSlug(event.target.value)}
            placeholder="google/imagen4-fast"
            disabled={disabled}
            className={formInputClassName}
          />
          <FieldHint
            help="填写供应商 API 真实使用的模型 slug。调用协议里的 {upstreamModel} 会用这里的值替换。"
            example="google/imagen4-fast"
          />
        </label>
        <input type="hidden" name="active" value="true" />
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.protocol = node;
          }}
          className={activeTab === "protocol" ? "grid gap-3 md:grid-cols-2" : "hidden"}
        >
        <div className="block md:col-span-2">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">调用协议配置</span>
          <div className="rounded-2xl border border-[#BAE6FD] bg-white p-4 shadow-sm">
            <div className="mb-3 grid gap-3 md:grid-cols-2">
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
                  disabled={disabled || executionConfigPresets.length === 0}
                  className={formSelectClassName}
                >
                  <option value="">
                    {executionConfigPresets.length > 0
                      ? "选择一个已配置模型并复制其调用协议"
                      : "暂无可复制的其他模型映射"}
                  </option>
                  {executionConfigPresets.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <FieldHint help="只复制调用协议模板和路径映射，不会覆盖当前上游模型 slug、输入参数、输出参数或成本配置。" />
              </label>
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
                          resultPath: "",
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
                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">
                      结果查询路径 resultPath（可选）
                    </span>
                    <input
                      value={executionConfigState.resultPath}
                      onChange={(event) =>
                        setExecutionConfigState((current) => ({
                          ...current,
                          resultPath: event.target.value,
                        }))
                      }
                      disabled={disabled}
                      className={formInputClassName}
                      placeholder="/api/v3/predictions/{taskId}/result"
                    />
                  </label>
                </>
              ) : null}
              <label className="block md:col-span-2">
                <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">结果字段路径（JSON path）resultUrlPath</span>
                <input
                  value={executionConfigState.resultUrlPath}
                  onChange={(event) =>
                    setExecutionConfigState((current) => ({
                      ...current,
                      resultUrlPath: event.target.value,
                    }))
                  }
                  required={!isTextOutputModel}
                  disabled={disabled}
                  className={formInputClassName}
                  placeholder="例如 data.outputs.0 / response.outputUrl"
                />
              </label>
              {isTextOutputModel ? (
                <label className="block md:col-span-2">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">文本结果字段路径（JSON path）resultTextPath</span>
                  <input
                    value={executionConfigState.resultTextPath}
                    onChange={(event) =>
                      setExecutionConfigState((current) => ({
                        ...current,
                        resultTextPath: event.target.value,
                      }))
                    }
                    required
                    disabled={disabled}
                    className={formInputClassName}
                    placeholder="例如 data.outputs.0 / data.caption / data.text"
                  />
                </label>
              ) : null}
              {isTextOutputModel ? null : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current.cost = node;
          }}
          className={activeTab === "cost" ? "grid gap-2.5" : "hidden"}
        >
        <div className="block">
          <div className="mb-1.5 flex items-center justify-between gap-3">
            <span className="block text-[11px] tracking-[0.35px] text-black/60">供应商成本配置</span>
            {selectedSupportedModel?.billingConfigText ? (
              <button
                type="button"
                onClick={() => {
                  setSeedPricingText(selectedSupportedModel.billingConfigText ?? "");
                  toast.success("已从当前可售模型售价同步");
                }}
                className="rounded-md border border-[#BAE6FD] bg-white px-2.5 py-1 text-[11px] font-medium text-black/65 hover:bg-[#E0F2FE]"
              >
                从可售模型售价同步
              </button>
            ) : null}
          </div>
          <BillingConfigEditor
            name="pricing"
            initialValue={seedPricingText || defaultPricing}
            capability={selectedSupportedModel?.capability ?? null}
            componentHint="按供应商真实结算方式填写内部进货成本。这里决定 provider cost，不影响用户售价。"
            generatedLabel="生成的供应商计费配置"
          />
        </div>

        </div>

        <div
          ref={(node) => {
            sectionRefs.current["input-params"] = node;
          }}
          className={activeTab === "input-params" ? "" : "hidden"}
        >
          <div className="block">
            <SchemaFieldEditor
              name="inputSchema"
              keyName="params"
              defaultSchemaText={defaultInputSchema}
              seedSchemaText={seedInputSchemaText}
              includeRequired
              disabled={disabled}
              onSchemaChange={setCurrentInputSchemaText}
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
          className={activeTab === "output-params" ? "" : "hidden"}
        >
          <div className="block">
            <SchemaFieldEditor
              name="outputSchema"
              keyName="fields"
              defaultSchemaText={defaultOutputSchema}
              seedSchemaText={seedOutputSchemaText}
              includeRequired={false}
              disabled={disabled}
              onSchemaChange={setCurrentOutputSchemaText}
            />
          </div>
        </div>

        <div
          ref={(node) => {
            sectionRefs.current["doc-examples"] = node;
          }}
          className={activeTab === "doc-examples" ? "" : "hidden"}
        >
          <div className="block rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] tracking-[0.35px] text-black/60">文档示例配置（用于 Dashboard API Quickstart）</p>
              <button
                type="button"
                onClick={() => {
                  const generated = buildDocExamplesFromSchemas(
                    currentInputSchemaText,
                    currentOutputSchemaText
                  );
                  setExecutionConfigState((current) => ({
                    ...current,
                    docRequestExampleJson: generated.requestExampleJson,
                    docSubmitResponseExampleJson: generated.submitResponseExampleJson,
                    docNormalizedOutputExampleJson: generated.normalizedOutputExampleJson,
                  }));
                  toast.success("已根据输入/输出参数生成示例 JSON");
                }}
                className="inline-flex h-7 items-center rounded border border-[#7DD3FC]/45 bg-white px-2 text-[11px] text-black/70 hover:bg-[#E0F2FE]"
              >
                一键生成示例 JSON
              </button>
            </div>
            <div className="grid gap-3">
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
        <div
          ref={(node) => {
            sectionRefs.current["readme-doc"] = node;
          }}
          className={activeTab === "readme-doc" ? "" : "hidden"}
        >
          <div className="grid gap-3">
            <label className="block">
              <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">README Markdown（工具页底部 SEO 内容）</span>
              <textarea
                value={executionConfigState.docReadmeMarkdown}
                onChange={(event) =>
                  setExecutionConfigState((current) => ({ ...current, docReadmeMarkdown: event.target.value }))
                }
                disabled={disabled}
                className={formTextAreaClassName}
                rows={16}
                placeholder={"# google/imagen4\n\n> Short model summary for SEO and user education.\n\n## Overview\n\n- **Endpoint**: `https://api.example.com/...`\n- **Model ID**: `google/imagen4`"}
              />
            </label>
            <div className="rounded-xl border border-[#BAE6FD] bg-white p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] tracking-[0.35px] text-black/60">README 生成提示词（复制给模型生成 markdown）</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(README_MARKDOWN_PROMPT);
                      toast.success("README 提示词已复制");
                    } catch {
                      toast.error("复制失败，请手动复制");
                    }
                  }}
                  className="inline-flex h-7 items-center rounded border border-[#7DD3FC]/45 bg-white px-2 text-[11px] text-black/70 hover:bg-[#E0F2FE]"
                >
                  复制提示词
                </button>
              </div>
              <textarea
                value={README_MARKDOWN_PROMPT}
                readOnly
                className={formTextAreaClassName}
                rows={18}
              />
            </div>
          </div>
        </div>
        <div
          ref={(node) => {
            sectionRefs.current["showcase-assets"] = node;
          }}
          className={activeTab === "showcase-assets" ? "" : "hidden"}
        >
          <div className="space-y-4 rounded-xl border border-[#BAE6FD] bg-white p-3">
            <p className="text-[11px] tracking-[0.35px] text-black/60">效果图素材（工具页封面与作品轮播）</p>

            <section className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-black/80">封面图区域</p>
                <span className="text-[11px] text-black/45">单张封面</span>
              </div>
              {defaultShowcaseCoverUrl ? (
                <div className="rounded-lg border border-[#BAE6FD] bg-white p-3">
                  <p className="mb-2 text-[11px] text-black/55">已上传封面</p>
                  {defaultShowcaseCoverAssetId ? (
                    <input type="hidden" name="existingShowcaseCoverAssetId" value={defaultShowcaseCoverAssetId} />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-[132px_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultShowcaseCoverUrl}
                      alt="Current model cover"
                      className="h-28 w-28 rounded-lg border border-[#BAE6FD] object-cover"
                    />
                    <div>
                      <label className="block">
                        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">封面提示词</span>
                        <textarea
                          name="existingShowcaseCoverPrompt"
                          defaultValue={defaultShowcaseCoverPrompt}
                          disabled={disabled}
                          className={formTextAreaClassName}
                          rows={4}
                          placeholder="给当前封面补充或修改提示词"
                        />
                      </label>
                      <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#B54432]">
                        <input type="checkbox" name="removeShowcaseCover" className="size-3.5" />
                        删除当前封面图
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#7DD3FC]/45 bg-white p-3 text-xs text-black/50">
                  暂无封面图
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上传封面（单张）</span>
                  <input
                    type="file"
                    name="showcaseCoverFile"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => setSelectedCoverFileName(event.target.files?.[0]?.name ?? "")}
                    className="block w-full text-xs text-black/65 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-black/90"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">新封面提示词</span>
                  <textarea
                    name="showcaseCoverPrompt"
                    defaultValue=""
                    disabled={disabled}
                    className={formTextAreaClassName}
                    rows={5}
                    placeholder="这张封面图对应的提示词，会在前台 hover 时展示并可复制。"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-black/80">Playground 示例输入图</p>
                <span className="text-[11px] text-black/45">图片编辑模型 demo 用</span>
              </div>
              {defaultPlaygroundInputUrl ? (
                <div className="rounded-lg border border-[#BAE6FD] bg-white p-3">
                  <p className="mb-2 text-[11px] text-black/55">已上传示例输入图</p>
                  {defaultPlaygroundInputAssetId ? (
                    <input type="hidden" name="existingPlaygroundInputAssetId" value={defaultPlaygroundInputAssetId} />
                  ) : null}
                  <div className="grid gap-3 md:grid-cols-[132px_1fr]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={defaultPlaygroundInputUrl}
                      alt="Current playground input"
                      className="h-28 w-28 rounded-lg border border-[#BAE6FD] object-cover"
                    />
                    <div>
                      <label className="block">
                        <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">示例说明</span>
                        <textarea
                          name="existingPlaygroundInputPrompt"
                          defaultValue={defaultPlaygroundInputPrompt}
                          disabled={disabled}
                          className={formTextAreaClassName}
                          rows={4}
                          placeholder="说明这张输入图适合怎么编辑"
                        />
                      </label>
                      <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#B54432]">
                        <input type="checkbox" name="removePlaygroundInput" className="size-3.5" />
                        删除当前示例输入图
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#7DD3FC]/45 bg-white p-3 text-xs text-black/50">
                  暂无 Playground 示例输入图
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上传示例输入图（单张）</span>
                  <input
                    type="file"
                    name="playgroundInputFile"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    onChange={(event) => setSelectedPlaygroundInputFileName(event.target.files?.[0]?.name ?? "")}
                    className="block w-full text-xs text-black/65 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-black/90"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">新示例说明</span>
                  <textarea
                    name="playgroundInputPrompt"
                    defaultValue=""
                    disabled={disabled}
                    className={formTextAreaClassName}
                    rows={5}
                    placeholder="例如：点击使用这张图片，再输入“把背景换成纯白摄影棚”。"
                  />
                </label>
              </div>

              <div className="mt-4 rounded-lg border border-[#BAE6FD] bg-white p-3">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-black/80">face_image 示例输入图</p>
                  <span className="text-[11px] text-black/45">搭配 face_image 字段自动填充</span>
                </div>
                {defaultFacePlaygroundInputUrl ? (
                  <div className="rounded-lg border border-[#BAE6FD] bg-[#F8FCFF] p-3">
                    <p className="mb-2 text-[11px] text-black/55">已上传 face_image 示例图</p>
                    {defaultFacePlaygroundInputAssetId ? (
                      <input type="hidden" name="existingFacePlaygroundInputAssetId" value={defaultFacePlaygroundInputAssetId} />
                    ) : null}
                    <div className="grid gap-3 md:grid-cols-[132px_1fr]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={defaultFacePlaygroundInputUrl}
                        alt="Current face_image playground input"
                        className="h-28 w-28 rounded-lg border border-[#BAE6FD] object-cover"
                      />
                      <div>
                        <label className="block">
                          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">face_image 示例说明</span>
                          <textarea
                            name="existingFacePlaygroundInputPrompt"
                            defaultValue={defaultFacePlaygroundInputPrompt}
                            disabled={disabled}
                            className={formTextAreaClassName}
                            rows={4}
                            placeholder="说明这张 face_image 适合怎么搭配主图使用"
                          />
                        </label>
                        <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#B54432]">
                          <input type="checkbox" name="removeFacePlaygroundInput" className="size-3.5" />
                          删除当前 face_image 示例图
                        </label>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] p-3 text-xs text-black/50">
                    暂无 face_image 示例输入图
                  </div>
                )}

                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上传 face_image 示例图（单张）</span>
                    <input
                      type="file"
                      name="facePlaygroundInputFile"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(event) => setSelectedFacePlaygroundInputFileName(event.target.files?.[0]?.name ?? "")}
                      className="block w-full text-xs text-black/65 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-black/90"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">新 face_image 示例说明</span>
                    <textarea
                      name="facePlaygroundInputPrompt"
                      defaultValue=""
                      disabled={disabled}
                      className={formTextAreaClassName}
                      rows={5}
                      placeholder="例如：这张图会自动填入 face_image，与主输入图搭配使用。"
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-black/80">作品素材区域</p>
                <span className="text-[11px] text-black/45">{defaultShowcaseGalleryUrls.length} 张已上传</span>
              </div>
              {defaultShowcaseGalleryUrls.length > 0 ? (
                <div className="space-y-2">
                  {defaultShowcaseGalleryUrls.map((url, index) => (
                    <div key={url} className="rounded-lg border border-[#BAE6FD] bg-white p-3">
                      {defaultShowcaseGalleryAssetIds[index] ? (
                        <input
                          type="hidden"
                          name="existingShowcaseGalleryAssetIds"
                          value={defaultShowcaseGalleryAssetIds[index]}
                        />
                      ) : null}
                      <p className="mb-2 text-[11px] text-black/45">作品图 {index + 1}</p>
                      <div className="grid gap-3 md:grid-cols-[110px_1fr]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt="Current showcase asset"
                          className="h-20 w-20 rounded-lg border border-[#BAE6FD] object-cover"
                        />
                        <div>
                          <label className="block">
                            <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">提示词</span>
                            <textarea
                              name="existingShowcaseGalleryPrompts"
                              defaultValue={defaultShowcaseGalleryPrompts[index] ?? ""}
                              disabled={disabled}
                              className={formTextAreaClassName}
                              rows={3}
                              placeholder="给这张作品图补充或修改提示词"
                            />
                          </label>
                          {defaultShowcaseGalleryAssetIds[index] ? (
                            <label className="mt-2 inline-flex items-center gap-2 text-xs text-[#B54432]">
                              <input
                                type="checkbox"
                                name="deleteShowcaseGalleryAssetIds"
                                value={defaultShowcaseGalleryAssetIds[index]}
                                className="size-3.5"
                              />
                              删除这张作品图
                            </label>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-[#7DD3FC]/45 bg-white p-3 text-xs text-black/50">
                  暂无作品素材图
                </div>
              )}

              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">上传作品图（可多张）</span>
                  <input
                    type="file"
                    name="showcaseGalleryFiles"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    onChange={(event) =>
                      setSelectedGalleryFileNames(Array.from(event.target.files ?? []).map((file) => file.name))
                    }
                    className="block w-full text-xs text-black/65 file:mr-3 file:rounded-md file:border-0 file:bg-black file:px-3 file:py-2 file:text-xs file:font-medium file:text-white hover:file:bg-black/90"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">作品图提示词（每行对应一张，按上传顺序）</span>
                  <textarea
                    name="showcaseGalleryPromptsText"
                    defaultValue=""
                    disabled={disabled}
                    className={formTextAreaClassName}
                    rows={6}
                    placeholder={
                      galleryPromptPlaceholder ||
                      "第 1 行对应第 1 张图，第 2 行对应第 2 张图。留空则该图片不展示提示词。"
                    }
                  />
                </label>
                <label className="inline-flex items-center gap-2 text-xs text-black/70">
                  <input type="checkbox" name="replaceShowcaseGallery" className="size-3.5" />
                  用新上传图片替换当前作品图
                </label>
              </div>
            </section>

            <div className="rounded-lg border border-[#BAE6FD] bg-[#F8FCFF] p-3">
              <p className="mb-2 text-[11px] text-black/55">本次待上传</p>
              <ShowcaseUploadStatus
                coverFileName={selectedCoverFileName}
                playgroundInputFileName={selectedPlaygroundInputFileName}
                facePlaygroundInputFileName={selectedFacePlaygroundInputFileName}
                galleryFileNames={selectedGalleryFileNames}
              />
            </div>
          </div>
        </div>
        </div>
      </div>
      ) : null}
      {showSubmitButton ? (
        <div className="mt-4">
          <SubmitButton
            label={submitLabel}
            pendingLabel={
              selectedCoverFileName || selectedPlaygroundInputFileName || selectedFacePlaygroundInputFileName || selectedGalleryFileNames.length > 0
                ? "上传并保存中..."
                : "保存中..."
            }
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
  lockSupportedModel = false,
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
  lockSupportedModel?: boolean;
}) {
  const initialSupportedModelId = defaultSupportedModelId ?? supportedModels[0]?.id ?? "";
  const [supportedModelId, setSupportedModelId] = useState(initialSupportedModelId);
  const [submitted, setSubmitted] = useState(false);
  void defaultActive;

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
          {lockSupportedModel ? (
            <>
              <input
                value={
                  selectedSupportedModel
                    ? `${selectedSupportedModel.displayName} (${selectedSupportedModel.modelSlug})`
                    : "请先创建可售模型"
                }
                readOnly
                className="h-10 w-full rounded-md border border-[#BAE6FD] bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
              />
              <input type="hidden" name="supportedModelId" value={supportedModelId} />
            </>
          ) : (
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
          )}
          <FieldHint help={lockSupportedModel ? "已绑定当前可售模型，不可在此弹窗切换。" : "选择要上线的客户侧能力入口。"} />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] tracking-[0.35px] text-black/60">能力类型</span>
          <input
            value={capabilityLabel(selectedSupportedModel?.capability ?? null)}
            readOnly
            className="h-10 w-full rounded-md border border-[#BAE6FD] bg-black/[0.03] px-3 text-sm text-black/60 outline-none"
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

        <input type="hidden" name="active" value="true" />
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
  successMessage = "保存成功",
}: {
  submitted: boolean;
  onSuccess?: () => void;
  successMessage?: string;
}) {
  const { pending } = useFormStatus();
  const handledRef = useRef(false);

  useEffect(() => {
    if (pending) {
      handledRef.current = false;
      return;
    }
    if (submitted && !handledRef.current) {
      handledRef.current = true;
      toast.success(successMessage);
      onSuccess?.();
    }
  }, [onSuccess, pending, submitted, successMessage]);

  return null;
}

function ShowcaseUploadStatus({
  coverFileName,
  playgroundInputFileName,
  facePlaygroundInputFileName,
  galleryFileNames,
}: {
  coverFileName: string;
  playgroundInputFileName: string;
  facePlaygroundInputFileName: string;
  galleryFileNames: string[];
}) {
  const { pending } = useFormStatus();
  const hasSelectedFiles =
    Boolean(coverFileName) ||
    Boolean(playgroundInputFileName) ||
    Boolean(facePlaygroundInputFileName) ||
    galleryFileNames.length > 0;

  if (pending && hasSelectedFiles) {
    return (
      <div className="rounded-xl border border-[#BAE6FD] bg-[#F0F9FF] px-3 py-2.5 text-xs leading-5 text-[#075985]">
        正在上传素材图并保存配置。当前提交流程会在完成后一次性返回，所以这里不显示百分比进度。
      </div>
    );
  }

  if (!hasSelectedFiles) {
    return (
      <div className="rounded-xl border border-[#BAE6FD] bg-[#F8FCFF] px-3 py-2.5 text-xs leading-5 text-black/55">
        图片会在点击保存后，随整张表单一起上传到 Supabase Storage；现在不是选中文件后立即上传。
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[#D8E8D9] bg-[#F3FBF4] px-3 py-2.5 text-xs leading-5 text-[#245C31]">
      已选择待上传素材：
      {coverFileName ? ` 封面 1 张（${coverFileName}）` : ""}
      {playgroundInputFileName ? ` Playground 示例 1 张（${playgroundInputFileName}）` : ""}
      {facePlaygroundInputFileName ? ` face_image 示例 1 张（${facePlaygroundInputFileName}）` : ""}
      {galleryFileNames.length > 0
        ? ` 作品图 ${galleryFileNames.length} 张（${galleryFileNames.join("、")}）`
        : ""}
      。点击保存后开始上传。
    </div>
  );
}
