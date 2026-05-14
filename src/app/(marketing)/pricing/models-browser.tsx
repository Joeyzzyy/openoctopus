"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";

type ModelDocRow = {
  id: string;
  publicModel: string;
  displayName: string;
  capability: string;
  providerName: string;
  upstreamModelSlug: string;
  inputSchemaText: string;
  outputSchemaText: string;
  officialDocUrl: string | null;
  executionConfigText: string;
  requestExampleJson: string | null;
  submitResponseExampleJson: string | null;
  normalizedOutputExampleJson: string | null;
  modelTypeLabel: string;
  priceLabel: string;
  modelDescription: string;
};

type JsonSchemaField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean";
  required: boolean;
  description?: string;
  exposedToCustomer: boolean;
  enumValues?: string[];
};

type TaskStatus =
  | "idle"
  | "submitting"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

function formatPlaygroundError(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Submit failed";
  }
  const record = payload as Record<string, unknown>;
  const error =
    record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : null;
  const code = typeof error?.code === "string" ? error.code : "";
  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof record.error === "string"
        ? record.error
        : "Submit failed";
  const upstreamStatus =
    typeof record.upstreamStatus === "number" ? String(record.upstreamStatus) : "";
  const upstreamBody =
    record.upstreamBody && typeof record.upstreamBody === "object"
      ? JSON.stringify(record.upstreamBody)
      : typeof record.upstreamBody === "string"
        ? record.upstreamBody
        : "";

  return [code ? `[${code}]` : "", message, upstreamStatus ? `(status: ${upstreamStatus})` : "", upstreamBody ? `| upstream: ${upstreamBody}` : ""]
    .filter((part) => part.length > 0)
    .join(" ");
}

function formatDetailText(detail: unknown) {
  if (detail === null || detail === undefined) return "No detail";
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "submitting") return "Submitting";
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "succeeded") return "Succeeded";
  if (status === "failed") return "Failed";
  return "Idle";
}

function parseInputSchemaText(schemaText: string): JsonSchemaField[] {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    const record =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    const requiredList = Array.isArray(record.required)
      ? new Set(record.required.filter((v): v is string => typeof v === "string"))
      : new Set<string>();

    const fields: JsonSchemaField[] = [];

    const params =
      Array.isArray(record.params)
        ? record.params
        : record.input && typeof record.input === "object" && !Array.isArray(record.input) && Array.isArray((record.input as Record<string, unknown>).params)
          ? ((record.input as Record<string, unknown>).params as unknown[])
          : [];
    if (params.length > 0) {
      for (const item of params) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const row = item as Record<string, unknown>;
        const key = typeof row.name === "string" ? row.name.trim() : "";
        if (!key || key === "model") continue;
        const rawType = typeof row.type === "string" ? row.type : "string";
        const enumValues = Array.isArray(row.enum)
          ? row.enum.filter((v): v is string => typeof v === "string")
          : undefined;
        const normalizedType: JsonSchemaField["type"] =
          rawType === "number" || rawType === "integer"
            ? "number"
            : rawType === "boolean"
              ? "boolean"
              : "string";
        fields.push({
          key,
          label: key,
          type: normalizedType,
          required: Boolean(row.required),
          description: typeof row.description === "string" ? row.description : "",
          exposedToCustomer:
            typeof row.exposedToCustomer === "boolean"
              ? row.exposedToCustomer
              : typeof row.customerVisible === "boolean"
                ? row.customerVisible
                : true,
          enumValues: enumValues && enumValues.length > 0 ? enumValues : undefined,
        });
      }
      return fields;
    }

    const directProperties =
      record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
        ? (record.properties as Record<string, unknown>)
        : null;
    const nestedInputProperties =
      record.input &&
      typeof record.input === "object" &&
      !Array.isArray(record.input) &&
      (record.input as Record<string, unknown>).properties &&
      typeof (record.input as Record<string, unknown>).properties === "object" &&
      !Array.isArray((record.input as Record<string, unknown>).properties)
        ? ((record.input as Record<string, unknown>).properties as Record<string, unknown>)
        : null;

    const properties = directProperties ?? nestedInputProperties ?? {};
    for (const [key, value] of Object.entries(properties)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      if (key === "model") continue;
      const propertySchema = value as Record<string, unknown>;
      const rawType = propertySchema.type;
      const enumValues = Array.isArray(propertySchema.enum)
        ? propertySchema.enum.filter((v): v is string => typeof v === "string")
        : undefined;
      const normalizedType: JsonSchemaField["type"] =
        rawType === "number" || rawType === "integer"
          ? "number"
          : rawType === "boolean"
            ? "boolean"
            : "string";
      fields.push({
        key,
        label: key,
        type: normalizedType,
        required: requiredList.has(key),
        description:
          typeof propertySchema.description === "string" ? propertySchema.description : "",
        exposedToCustomer:
          typeof propertySchema.exposedToCustomer === "boolean"
            ? propertySchema.exposedToCustomer
            : typeof propertySchema.customerVisible === "boolean"
              ? propertySchema.customerVisible
              : true,
        enumValues: enumValues && enumValues.length > 0 ? enumValues : undefined,
      });
    }
    return fields;
  } catch {
    return [];
  }
}

const ASPECT_RATIO_OPTIONS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

function isAspectRatioEnum(values?: string[]) {
  if (!values || values.length === 0) return false;
  return values.every((value) => /^\d+:\d+$/.test(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pickImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (
    text.startsWith("https://") ||
    text.startsWith("http://") ||
    text.startsWith("data:image/")
  ) {
    return text;
  }
  return null;
}

function extractImageUrls(output: unknown): string[] {
  if (!isRecord(output)) return [];
  const urls: string[] = [];
  const seen = new Set<string>();
  const pushUrl = (candidate: unknown) => {
    const resolved = pickImageUrl(candidate);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    urls.push(resolved);
  };

  const assets = Array.isArray(output.assets) ? output.assets : [];
  for (const item of assets) {
    if (!isRecord(item)) continue;
    if (item.type && item.type !== "image") continue;
    pushUrl(item.url);
  }

  if (urls.length === 0) {
    pushUrl(output.url);
  }

  return urls;
}

export function ModelsBrowser({
  rows,
  vendorOptions,
}: {
  rows: ModelDocRow[];
  vendorOptions: string[];
}) {
  const safeRows = rows.length > 0 ? rows : [];
  const providerModelCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of safeRows) {
      const key = (row.providerName?.trim() || "Other").toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [safeRows]);
  const rowsByProvider = useMemo(() => {
    const map = new Map<string, ModelDocRow[]>();
    for (const row of safeRows) {
      const key = row.providerName?.trim() || "Other";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en-US"));
  }, [safeRows]);

  const providerOptions = useMemo(() => {
    const modelProviders = rowsByProvider.map(([provider]) => provider);
    if (vendorOptions.length === 0) {
      return modelProviders;
    }

    const providerSet = new Set(modelProviders.map((item) => item.toLowerCase()));
    const intersection = vendorOptions.filter((item) =>
      providerSet.has(item.toLowerCase())
    );

    if (intersection.length > 0) {
      return intersection;
    }

    return modelProviders;
  }, [rowsByProvider, vendorOptions]);
  const selectableProviderOptions = useMemo(
    () =>
      providerOptions.filter(
        (provider) => (providerModelCountMap.get(provider.toLowerCase()) ?? 0) > 0
      ),
    [providerOptions, providerModelCountMap]
  );
  const [selectedProvider, setSelectedProvider] = useState<string>(selectableProviderOptions[0] ?? "");
  const visibleRows = useMemo(
    () =>
      safeRows.filter(
        (row) =>
          (row.providerName?.trim() || "Other").toLowerCase() ===
          selectedProvider.toLowerCase()
      ),
    [safeRows, selectedProvider]
  );
  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(
    visibleRows[0]?.publicModel ?? null
  );
  const effectiveModelSlug =
    selectedModelSlug && visibleRows.some((row) => row.publicModel === selectedModelSlug)
      ? selectedModelSlug
      : (visibleRows[0]?.publicModel ?? null);
  const selectedModel =
    visibleRows.find((row) => row.publicModel === effectiveModelSlug) ?? visibleRows[0] ?? null;

  const [mainTab, setMainTab] = useState<"playground" | "api">("playground");
  const [mountedTabs, setMountedTabs] = useState<Record<"playground" | "api", boolean>>({
    playground: true,
    api: false,
  });
  const [tabSkeleton, setTabSkeleton] = useState<"playground" | "api" | null>(null);
  const mountTimerRef = useRef<number | null>(null);
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [playgroundErrorDetail, setPlaygroundErrorDetail] = useState<unknown>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCopied, setDetailCopied] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<unknown>(null);
  const [playgroundForm, setPlaygroundForm] = useState<Record<string, string>>({});
  const playgroundImageUrls = useMemo(
    () => extractImageUrls(playgroundOutput),
    [playgroundOutput]
  );
  useEffect(() => {
    setPlaygroundForm({});
  }, [effectiveModelSlug]);
  const handleProviderChange = (nextProvider: string) => {
    setSelectedProvider(nextProvider);
    const nextRows = rowsByProvider.find(([provider]) => provider === nextProvider)?.[1] ?? [];
    setSelectedModelSlug(nextRows[0]?.publicModel ?? null);
  };

  const handleModelChange = (nextModelSlug: string | null) => {
    setSelectedModelSlug(nextModelSlug);
  };

  const handleMainTabChange = (tab: "playground" | "api") => {
    if (tab === mainTab) return;
    setMainTab(tab);
    if (mountedTabs[tab]) return;
    setTabSkeleton(tab);
    if (mountTimerRef.current !== null) {
      window.clearTimeout(mountTimerRef.current);
    }
    mountTimerRef.current = window.setTimeout(() => {
      setMountedTabs((current) => ({ ...current, [tab]: true }));
      setTabSkeleton((current) => (current === tab ? null : current));
      mountTimerRef.current = null;
    }, 30);
  };

  useEffect(() => {
    return () => {
      if (mountTimerRef.current !== null) {
        window.clearTimeout(mountTimerRef.current);
      }
    };
  }, []);

  const modelsByCapability = useMemo(() => {
    const map = new Map<string, ModelDocRow[]>();
    for (const row of visibleRows) {
      const key = row.capability?.trim() || "other";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en-US"));
  }, [visibleRows]);
  const capabilityTag = selectedModel?.modelTypeLabel || "uncategorized";
  const priceTag = selectedModel?.priceLabel || "";
  const modelSlugTail = selectedModel?.upstreamModelSlug || selectedModel?.publicModel || "model";
  const parsedFields = useMemo(
    () =>
      parseInputSchemaText(selectedModel?.inputSchemaText ?? "").filter(
        (field) => field.exposedToCustomer
      ),
    [selectedModel?.inputSchemaText]
  );
  const isSubmitting = taskStatus === "submitting" || taskStatus === "queued" || taskStatus === "processing";

  useEffect(() => {
    setPlaygroundForm((current) => {
      const next = { ...current };
      let changed = false;

      for (const field of parsedFields) {
        const existing = next[field.key];
        if (typeof existing === "string" && existing.trim().length > 0) continue;

        if (field.key === "aspect_ratio") {
          const defaultRatio =
            field.enumValues && field.enumValues.length > 0
              ? field.enumValues[0]
              : ASPECT_RATIO_OPTIONS[0];
          next[field.key] = defaultRatio;
          changed = true;
          continue;
        }

        if (field.enumValues && field.enumValues.length > 0) {
          next[field.key] = field.enumValues[0];
          changed = true;
          continue;
        }

        if (field.type === "boolean") {
          next[field.key] = "true";
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [parsedFields]);

  const inferEndpoint = (capability: string | null | undefined) =>
    capability?.includes("video") ? "/v1/videos/generations" : "/v1/images/generations";

  const submitPlayground = async () => {
    if (!selectedModel) return;
    setTaskStatus("submitting");
    setPlaygroundError(null);
    setPlaygroundErrorDetail(null);
    setDetailCopied(false);
    setResultCopied(false);
    setResultModalOpen(false);
    setPlaygroundOutput(null);
    setTaskId(null);

    let capturedErrorDetail: unknown = null;

    try {
      const inputPayload: Record<string, unknown> = {};
      let promptValue: string | undefined;

      for (const field of parsedFields) {
        const raw = playgroundForm[field.key];
        if ((raw ?? "").trim().length === 0) continue;
        if (field.key === "prompt") {
          promptValue = raw;
          continue;
        }
        if (field.type === "number") {
          const num = Number(raw);
          if (!Number.isNaN(num)) inputPayload[field.key] = num;
          continue;
        }
        if (field.type === "boolean") {
          inputPayload[field.key] = raw === "true";
          continue;
        }
        inputPayload[field.key] = raw;
      }

      const submitRes = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          endpoint: inferEndpoint(selectedModel.capability),
          model: selectedModel.publicModel,
          prompt: promptValue,
          input: inputPayload,
        }),
      });

      const submitJson = (await submitRes.json()) as {
        id?: string;
        status?: string;
        error?: { message?: string; code?: string } | string;
        upstreamStatus?: number;
        upstreamBody?: unknown;
        apiBase?: string;
        requestUrl?: string;
      };

      if (!submitRes.ok || !submitJson.id) {
        const hasPromptField = parsedFields.some((field) => field.key === "prompt");
        const browserProxyUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/playground`
            : "/api/playground";
        const inferredEndpoint = inferEndpoint(selectedModel.capability);
        const inferredApiBase =
          typeof submitJson.apiBase === "string" && submitJson.apiBase.length > 0
            ? submitJson.apiBase
            : PUBLIC_API_BASE_URL;
        const inferredRequestUrl =
          typeof submitJson.requestUrl === "string" && submitJson.requestUrl.length > 0
            ? submitJson.requestUrl
            : `${inferredApiBase}${inferredEndpoint}`;
        capturedErrorDetail = {
          stage: "submit",
          chain: {
            browserToProxy: {
              method: "POST",
              url: browserProxyUrl,
            },
            proxyToGateway: {
              method: "POST",
              apiBase: inferredApiBase,
              requestUrl: inferredRequestUrl,
            },
          },
          request: {
            endpoint: inferredEndpoint,
            model: selectedModel.publicModel,
            prompt: promptValue ?? "",
            hasPromptField,
            input: inputPayload,
          },
          submitHttpStatus: submitRes.status,
          response: submitJson,
        };
        throw new Error(formatPlaygroundError(submitJson));
      }

      setTaskId(submitJson.id);
      setTaskStatus("queued");

      const startedAt = Date.now();
      while (Date.now() - startedAt < 180000) {
        await new Promise((resolve) => setTimeout(resolve, 1800));
        const statusRes = await fetch("/api/playground", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "status",
            taskId: submitJson.id,
          }),
        });
        const statusJson = (await statusRes.json()) as {
          status?: string;
          output_payload?: unknown;
          error_message?: string;
          error?: { message?: string; code?: string } | string;
          upstreamStatus?: number;
          upstreamBody?: unknown;
        };

        if (!statusRes.ok) {
          capturedErrorDetail = {
            stage: "status",
            taskId: submitJson.id,
            response: statusJson,
          };
          throw new Error(formatPlaygroundError(statusJson));
        }

        if (statusJson.status === "queued" || statusJson.status === "processing") {
          setTaskStatus(statusJson.status);
          continue;
        }
        if (statusJson.status === "succeeded") {
          setTaskStatus("succeeded");
          setPlaygroundOutput(statusJson.output_payload ?? statusJson);
          return;
        }
        if (statusJson.status === "failed") {
          setTaskStatus("failed");
          setPlaygroundError(statusJson.error_message || "Generation failed");
          setPlaygroundErrorDetail({
            stage: "task_failed",
            taskId: submitJson.id,
            response: statusJson,
          });
          return;
        }
      }

      setTaskStatus("failed");
      setPlaygroundError("Playground request timeout, please retry.");
      setPlaygroundErrorDetail({
        stage: "timeout",
        taskId: submitJson.id,
      });
    } catch (error) {
      setTaskStatus("failed");
      setPlaygroundError(error instanceof Error ? error.message : "Submit failed");
      setPlaygroundErrorDetail(
        capturedErrorDetail ?? {
          stage: "client_exception",
          message: error instanceof Error ? error.message : "Submit failed",
        }
      );
    }
  };

  const copyErrorDetail = async () => {
    const text = formatDetailText(playgroundErrorDetail);
    try {
      await navigator.clipboard.writeText(text);
      setDetailCopied(true);
      setTimeout(() => setDetailCopied(false), 1500);
    } catch {
      setDetailCopied(false);
    }
  };

  const copyResultJson = async () => {
    const text = formatDetailText(playgroundOutput);
    try {
      await navigator.clipboard.writeText(text);
      setResultCopied(true);
      setTimeout(() => setResultCopied(false), 1500);
    } catch {
      setResultCopied(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-2.5">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium tracking-[0.2px] text-black/55">Model Vendor</span>
            <select
              value={selectedProvider}
              onChange={(event) => handleProviderChange(event.target.value)}
              className="h-11 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80"
            >
              {selectableProviderOptions.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium tracking-[0.2px] text-black/55">Model</span>
            <select
              value={effectiveModelSlug ?? visibleRows[0]?.publicModel ?? ""}
              onChange={(event) => handleModelChange(event.target.value || null)}
              className="h-11 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/85"
            >
              {modelsByCapability.map(([capability, models]) => (
                <optgroup key={capability} label={capability}>
                  {models.map((item) => (
                    <option key={item.publicModel} value={item.publicModel}>
                      {item.displayName}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
        <p className="text-sm leading-6 text-black/65">
          {selectedModel?.modelDescription || "No description is available for this model yet."}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex rounded-sm bg-[#F3F4F6] px-2 py-1 text-xs text-black/75">
            {capabilityTag}
          </span>
          {priceTag ? (
            <span className="inline-flex rounded-sm bg-[#EAF7ED] px-2 py-1 text-xs font-medium text-[#245C31]">
              {priceTag}
            </span>
          ) : null}
        </div>
      </div>

      <section className="rounded-2xl border border-black/[0.08] bg-white p-2.5 shadow-sm sm:p-3">
        <div className="mb-2 border-b border-black/[0.08] pb-1.5">
          <div className="flex items-center gap-1">
            {(["playground", "api"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleMainTabChange(tab)}
                className={`h-10 cursor-pointer rounded-none border-b-2 px-3 text-sm font-medium ${
                  tab === mainTab
                    ? "border-black text-black"
                    : "border-transparent text-black/55 hover:text-black"
                }`}
              >
                {tab === "api" ? "API" : "playground"}
              </button>
            ))}
          </div>
        </div>

        {mainTab === "playground" ? (
          tabSkeleton === "playground" || !mountedTabs.playground ? (
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-xl border border-black/[0.08] bg-white p-4">
                <div className="mb-3 h-4 w-20 animate-pulse rounded bg-black/[0.08]" />
                <div className="space-y-3">
                  <div className="h-16 animate-pulse rounded-md bg-black/[0.06]" />
                  <div className="h-16 animate-pulse rounded-md bg-black/[0.06]" />
                  <div className="h-16 animate-pulse rounded-md bg-black/[0.06]" />
                </div>
                <div className="mt-4 h-10 w-36 animate-pulse rounded-md bg-black/[0.08]" />
              </section>
              <section className="rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-4">
                <div className="mb-3 h-4 w-28 animate-pulse rounded bg-black/[0.08]" />
                <div className="min-h-[280px] animate-pulse rounded-md border border-black/[0.08] bg-white" />
              </section>
            </div>
          ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-black/[0.08] bg-white p-4">
              <div className="mb-3 text-sm font-medium text-black">Input</div>
              <div className="space-y-3">
                {parsedFields.length === 0 ? (
                  <p className="text-sm text-black/55">
                    No structured input schema found. You can still submit with default empty input.
                  </p>
                ) : (
                  parsedFields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs text-black/65">
                        {field.label}
                        {field.required ? <span className="pl-1 text-red-500">*</span> : null}
                      </span>
                      {field.description ? (
                        <p className="mb-1.5 text-[11px] leading-5 text-black/50">
                          {field.description}
                        </p>
                      ) : null}
                      {field.key === "aspect_ratio" || isAspectRatioEnum(field.enumValues) ? (
                        <select
                          disabled={isSubmitting}
                          value={
                            playgroundForm[field.key] ??
                            (field.enumValues && field.enumValues.length > 0
                              ? field.enumValues[0]
                              : ASPECT_RATIO_OPTIONS[0])
                          }
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {(field.enumValues && field.enumValues.length > 0
                            ? field.enumValues
                            : ASPECT_RATIO_OPTIONS
                          ).map((ratio) => (
                            <option key={ratio} value={ratio}>
                              {ratio}
                            </option>
                          ))}
                        </select>
                      ) : field.enumValues && field.enumValues.length > 0 ? (
                        <select
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? field.enumValues[0]}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {field.enumValues.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <select
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? "true"}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : field.key === "prompt" ? (
                        <textarea
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="min-h-[120px] w-full rounded-md border border-black/[0.1] bg-white px-3 py-2 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                          placeholder="Describe what to generate..."
                        />
                      ) : (
                        <input
                          disabled={isSubmitting}
                          type={field.type === "number" ? "number" : "text"}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                          placeholder={field.type === "number" ? "0" : `Enter ${field.label}`}
                        />
                      )}
                    </label>
                  ))
                )}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSubmitting || !selectedModel}
                  onClick={submitPlayground}
                  className="h-10 rounded-md bg-black px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {isSubmitting ? "Generating..." : `Generate ${priceTag ? `(${priceTag})` : ""}`}
                </button>
                {taskId ? <span className="text-xs text-black/45">Task: {taskId}</span> : null}
              </div>
            </section>

            <section className="flex min-h-[360px] flex-col rounded-xl border border-black/[0.08] bg-[#FAFAFA] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-black">Output</div>
                <div className="flex items-center gap-2">
                  {playgroundOutput ? (
                    <button
                      type="button"
                      onClick={() => setResultModalOpen(true)}
                      className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                    >
                      View result JSON
                    </button>
                  ) : null}
                  <div className="text-xs capitalize text-black/60">Status: {taskStatusLabel(taskStatus)}</div>
                </div>
              </div>
              {playgroundError ? (
                <div className="flex min-h-[280px] flex-1 items-center">
                  <div className="w-full">
                    <p className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {playgroundError}
                    </p>
                    {playgroundErrorDetail ? (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailModalOpen(true)}
                          className="text-xs text-black/55 underline underline-offset-2 hover:text-black"
                        >
                          Error Detail
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : isSubmitting ? (
                <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center rounded-md border border-black/[0.08] bg-white">
                  <span className="inline-flex size-7 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  <p className="mt-3 text-sm font-medium text-black">Generating...</p>
                  <p className="mt-1 text-xs text-black/55">{taskStatusLabel(taskStatus)}</p>
                </div>
              ) : playgroundOutput ? (
                <div className="space-y-3">
                  {playgroundImageUrls.length > 0 ? (
                    <div className="grid gap-2">
                      {playgroundImageUrls.map((src, index) => (
                        <Image
                          key={`${src}-${index}`}
                          src={src}
                          alt={`Generated result ${index + 1}`}
                          width={1024}
                          height={1024}
                          unoptimized
                          className="h-auto w-full rounded-md border border-black/[0.08] bg-white object-contain"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[280px] flex-1 items-center justify-center rounded-md border border-black/[0.08] bg-white px-4">
                  <p className="text-center text-sm text-black/55">
                    {`Submit ${modelSlugTail} to preview result here.`}
                  </p>
                </div>
              )}
            </section>
          </div>
          )
        ) : tabSkeleton === "api" || !mountedTabs.api ? (
          <div className="space-y-3 rounded-xl border border-black/[0.08] bg-white p-4">
            <div className="h-5 w-44 animate-pulse rounded bg-black/[0.08]" />
            <div className="h-10 animate-pulse rounded-md bg-black/[0.06]" />
            <div className="h-28 animate-pulse rounded-md bg-black/[0.06]" />
            <div className="h-28 animate-pulse rounded-md bg-black/[0.06]" />
          </div>
        ) : (
          <ApiQuickstartCard models={visibleRows} initialModel={effectiveModelSlug} />
        )}
      </section>

      {detailModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">Error Detail</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyErrorDetail}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  {detailCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded-md border border-black/[0.08] bg-[#FAFAFA] p-3 text-xs text-black/80">
              {formatDetailText(playgroundErrorDetail)}
            </pre>
          </div>
        </div>
      ) : null}

      {resultModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">Result JSON</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyResultJson}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  {resultCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded-md border border-black/[0.08] bg-[#FAFAFA] p-3 text-xs text-black/80">
              {formatDetailText(playgroundOutput)}
            </pre>
          </div>
        </div>
      ) : null}
    </section>
  );
}
