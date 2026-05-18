"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import type { ApiSmokeRecord } from "@/lib/api-smoke-records";

type SmokeAsset = {
  url: string;
  label: string;
};

type ModalState =
  | { kind: "image"; record: ApiSmokeRecord; asset: SmokeAsset }
  | { kind: "details"; record: ApiSmokeRecord }
  | null;

function formatSmokeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "时间未知";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));
}

function formatSmokeDuration(value: number | undefined) {
  if (!Number.isFinite(value) || typeof value !== "number") return "-";
  if (value < 1000) return `${value}ms`;
  return `${(value / 1000).toFixed(value < 10_000 ? 1 : 0)}s`;
}

function formatSmokeJson(value: unknown) {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value === "string") return value;

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function readSmokeRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function resolveSmokeAssetUrl(baseUrl: string, value: unknown) {
  if (typeof value !== "string" || value.length === 0) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  if (value.startsWith("/")) return `${baseUrl.replace(/\/+$/, "")}${value}`;
  return value;
}

function getSmokeImageAssets(record: ApiSmokeRecord) {
  const taskResponse = readSmokeRecord(record.taskResponse);
  const outputPayload = readSmokeRecord(taskResponse?.output_payload);
  const assets = Array.isArray(outputPayload?.assets) ? outputPayload.assets : [];

  return assets
    .map((asset, index) => {
      const item = readSmokeRecord(asset);
      const url = resolveSmokeAssetUrl(record.baseUrl, item?.url);
      const mimeType = typeof item?.mimeType === "string" ? item.mimeType : "";
      const type = typeof item?.type === "string" ? item.type : "";
      if (!url || (type && type !== "image") || (mimeType && !mimeType.startsWith("image/"))) {
        return null;
      }
      return {
        url,
        label: `image ${index + 1}`,
      };
    })
    .filter((asset): asset is SmokeAsset => Boolean(asset));
}

function SmokeDetailBlock({
  title,
  value,
  copyId,
  copied,
  onCopy,
}: {
  title: string;
  value: unknown;
  copyId: string;
  copied: boolean;
  onCopy: (value: string, copyId: string) => void;
}) {
  const formattedValue = formatSmokeJson(value);

  return (
    <div className="min-w-0 rounded-lg border border-[#BAE6FD] bg-white px-3 py-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-medium uppercase tracking-[0.35px] text-black/45">
          {title}
        </p>
        <button
          type="button"
          onClick={() => onCopy(formattedValue, copyId)}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-[#BAE6FD] bg-white text-black/55 transition-colors hover:bg-[#E0F2FE] hover:text-black/75"
          aria-label={`复制 ${title}`}
          title={`复制 ${title}`}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="mt-1 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-5 text-black/72">
        {formattedValue}
      </pre>
    </div>
  );
}

function SmokeImageCell({
  record,
  onOpen,
}: {
  record: ApiSmokeRecord;
  onOpen: (asset: SmokeAsset) => void;
}) {
  const assets = getSmokeImageAssets(record);
  if (assets.length === 0) {
    return <span className="text-black/35">-</span>;
  }

  const firstAsset = assets[0];

  return (
    <button
      type="button"
      onClick={() => onOpen(firstAsset)}
      className="block rounded-md outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-black/25"
      title="查看图片"
    >
      <img
        src={firstAsset.url}
        alt={`${record.caseId} result`}
        className="h-14 w-14 rounded-md border border-[#BAE6FD] bg-[#F8FCFF] object-cover"
      />
    </button>
  );
}

function SmokeModal({
  modal,
  onClose,
}: {
  modal: ModalState;
  onClose: () => void;
}) {
  const [copiedBlock, setCopiedBlock] = useState<string | null>(null);

  if (!modal) return null;

  const record = modal.record;
  const handleCopy = async (value: string, copyId: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedBlock(copyId);
    window.setTimeout(() => setCopiedBlock(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-xl border border-[#BAE6FD] bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-3 border-b border-[#BAE6FD] px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-black">
              {modal.kind === "image" ? "Smoke 输出图片" : "Smoke 请求详情"}
            </p>
            <p className="mt-0.5 break-all text-xs text-black/50">
              {record.caseId} · {record.model}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#BAE6FD] bg-white text-lg leading-none text-black/60 hover:bg-[#E0F2FE]"
            aria-label="关闭"
          >
            ×
          </button>
        </div>

        {modal.kind === "image" ? (
          <div className="flex max-h-[calc(90vh-68px)] items-center justify-center overflow-auto bg-[#F0F9FF] p-4">
            <a href={modal.asset.url} target="_blank" rel="noreferrer">
              <img
                src={modal.asset.url}
                alt={`${record.caseId} enlarged result`}
                className="max-h-[78vh] max-w-full rounded-lg object-contain"
              />
            </a>
          </div>
        ) : (
          <div className="max-h-[calc(90vh-68px)] overflow-auto bg-[#F8FCFF] p-4">
            <div className="grid gap-3 lg:grid-cols-2">
              <SmokeDetailBlock
                title="Request URL"
                value={record.requestUrl ?? `${record.baseUrl}${record.endpoint}`}
                copyId="request-url"
                copied={copiedBlock === "request-url"}
                onCopy={handleCopy}
              />
              <SmokeDetailBlock
                title="Poll URL"
                value={record.pollUrl ?? (record.taskId ? `${record.baseUrl}/v1/tasks/${record.taskId}` : null)}
                copyId="poll-url"
                copied={copiedBlock === "poll-url"}
                onCopy={handleCopy}
              />
              <SmokeDetailBlock
                title="Request Payload"
                value={record.requestPayload ?? null}
                copyId="request-payload"
                copied={copiedBlock === "request-payload"}
                onCopy={handleCopy}
              />
              <SmokeDetailBlock
                title="Submit Response"
                value={record.submitResponse ?? null}
                copyId="submit-response"
                copied={copiedBlock === "submit-response"}
                onCopy={handleCopy}
              />
              <div className="lg:col-span-2">
                <SmokeDetailBlock
                  title="Task Response"
                  value={record.taskResponse ?? null}
                  copyId="task-response"
                  copied={copiedBlock === "task-response"}
                  onCopy={handleCopy}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function buildModelHealth(records: ApiSmokeRecord[]) {
  const grouped = new Map<string, ApiSmokeRecord[]>();
  for (const record of records) {
    const list = grouped.get(record.model) ?? [];
    list.push(record);
    grouped.set(record.model, list);
  }

  return Array.from(grouped.entries())
    .map(([model, modelRecords]) => ({
      model,
      records: modelRecords.slice(0, 10),
      latest: modelRecords[0] ?? null,
    }))
    .sort((a, b) => {
      const aTime = a.latest ? new Date(a.latest.completedAt).getTime() : 0;
      const bTime = b.latest ? new Date(b.latest.completedAt).getTime() : 0;
      return bTime - aTime || a.model.localeCompare(b.model);
    });
}

function ModelHealthOverview({ records }: { records: ApiSmokeRecord[] }) {
  const models = buildModelHealth(records);
  if (models.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {models.map((item) => {
        const passed = item.records.filter((record) => record.success).length;
        return (
          <div key={item.model} className="rounded-lg border border-[#BAE6FD] bg-white px-3 py-2">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-all font-mono text-[11px] font-medium text-black/70">
                {item.model}
              </p>
              <span className="shrink-0 text-[11px] text-black/45">
                {passed}/{item.records.length}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {item.records.map((record, index) => (
                <span
                  key={`${record.completedAt}-${index}`}
                  title={`${formatSmokeTimestamp(record.completedAt)} · ${record.success ? "通过" : "失败"}`}
                  className={`h-2.5 w-2.5 rounded-full ${
                    record.success ? "bg-[#20A35A]" : "bg-[#D64532]"
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ApiSmokePanel({ records }: { records: ApiSmokeRecord[] }) {
  const [modal, setModal] = useState<ModalState>(null);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#BAE6FD] bg-[#F8FCFF] p-3">
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <ModelHealthOverview records={records} />
          </div>
          <code className="rounded-md border border-[#BAE6FD] bg-white px-2 py-1 text-[11px] text-black/55">
            npm run smoke:images
          </code>
        </div>

        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-[#BAE6FD] bg-white">
            <table className="w-full min-w-[1120px] border-collapse text-left text-xs">
              <thead className="bg-[#F0F9FF] text-[11px] uppercase tracking-[0.35px] text-black/45">
                <tr>
                  <th className="px-3 py-2 font-medium">时间</th>
                  <th className="px-3 py-2 font-medium">结果</th>
                  <th className="px-3 py-2 font-medium">API</th>
                  <th className="px-3 py-2 font-medium">Case</th>
                  <th className="px-3 py-2 font-medium">模型</th>
                  <th className="px-3 py-2 font-medium">状态</th>
                  <th className="px-3 py-2 font-medium">图片</th>
                  <th className="px-3 py-2 font-medium">耗时</th>
                  <th className="px-3 py-2 font-medium">Key</th>
                  <th className="sticky right-0 z-10 whitespace-nowrap border-l border-[#DDF4FF] bg-[#F0F9FF] px-3 py-2 font-medium">详情</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record, index) => (
                  <tr key={`${record.completedAt}-${record.caseId}-${index}`} className="border-t border-[#DDF4FF] align-top">
                    <td className="whitespace-nowrap px-3 py-2 text-black/60">
                      {formatSmokeTimestamp(record.completedAt)}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex h-6 whitespace-nowrap items-center rounded-md border px-2 text-[11px] ${
                          record.success
                            ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
                            : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
                        }`}
                      >
                        {record.success ? "通过" : "失败"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-black/70">{record.api}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-black">{record.caseId}</p>
                      <p className="mt-0.5 text-black/42">{record.suite}</p>
                    </td>
                    <td className="break-all px-3 py-2 font-mono text-[11px] text-black/65">{record.model}</td>
                    <td className="px-3 py-2 text-black/60">
                      <p>{record.finalStatus ?? record.submitStatus ?? "unknown"}</p>
                      {record.taskId ? <p className="mt-0.5 font-mono text-[10px] text-black/35">{record.taskId}</p> : null}
                      {record.errorMessage ? (
                        <p className="mt-1 max-w-[280px] break-words text-[11px] leading-4 text-[#B54432]">
                          {record.errorMessage}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      <SmokeImageCell
                        record={record}
                        onOpen={(asset) => setModal({ kind: "image", record, asset })}
                      />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-black/60">
                      {formatSmokeDuration(record.latencyMs)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono text-[11px] text-black/45">
                      {record.keyPrefix}
                    </td>
                    <td className="sticky right-0 z-10 whitespace-nowrap border-l border-[#DDF4FF] bg-white px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setModal({ kind: "details", record })}
                        className="inline-flex h-7 whitespace-nowrap items-center rounded-md border border-black/[0.1] bg-white px-2.5 text-[11px] font-medium text-black/65 hover:bg-[#E0F2FE]"
                      >
                        详情
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-[#7DD3FC]/45 bg-[#F8FCFF] px-4 py-6">
            <p className="text-sm font-medium text-black">还没有 API smoke 记录</p>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55">
              在本地运行 OPENOCTOPUS_API_KEY=ooq_xxx npm run smoke:images 后，这里会显示脚本写入的连通性结果。
            </p>
          </div>
        )}
      </div>

      <SmokeModal modal={modal} onClose={() => setModal(null)} />
    </div>
  );
}
