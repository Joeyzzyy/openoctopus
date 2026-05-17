import { readFile } from "node:fs/promises";
import path from "node:path";

export type ApiSmokeRecord = {
  api: string;
  script: string;
  suite: string;
  caseId: string;
  model: string;
  endpoint: string;
  baseUrl: string;
  requestUrl?: string;
  requestPayload?: unknown;
  pollUrl?: string;
  keyPrefix: string;
  startedAt: string;
  completedAt: string;
  latencyMs: number;
  success: boolean;
  submitStatus?: number;
  taskId?: string;
  finalStatus?: string;
  assetCount?: number;
  submitResponse?: unknown;
  taskResponse?: unknown;
  errorMessage?: string;
};

const historyPath = path.join(process.cwd(), "tests/api-smoke/reports/history.json");

function isSmokeRecord(value: unknown): value is ApiSmokeRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.api === "string" &&
    typeof record.caseId === "string" &&
    typeof record.model === "string" &&
    typeof record.startedAt === "string" &&
    typeof record.completedAt === "string" &&
    typeof record.success === "boolean"
  );
}

export async function getApiSmokeRecords(limit = 100) {
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isSmokeRecord).slice(0, limit);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}
