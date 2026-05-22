import { readdir, readFile } from "node:fs/promises";
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
const suitesBasePath = path.join(process.cwd(), "tests/api-smoke");

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

export type ApiSmokeCoverageSummary = {
  caseModels: string[];
  recordedModels: string[];
  statsByModel: Record<
    string,
    {
      totalRuns: number;
      successRuns: number;
    }
  >;
  latestByModel: Record<
    string,
    {
      success: boolean;
      startedAt: string;
      completedAt: string;
      caseId: string;
      suite: string;
      script: string;
    }
  >;
};

async function getSmokeCaseModels() {
  try {
    const suiteEntries = await readdir(suitesBasePath, { withFileTypes: true });
    const caseModels = new Set<string>();

    for (const entry of suiteEntries) {
      if (!entry.isDirectory() || ["lib", "reports", "scripts"].includes(entry.name)) {
        continue;
      }

      const casesPath = path.join(suitesBasePath, entry.name, "cases");
      let files: string[] = [];
      try {
        files = await readdir(casesPath);
      } catch (error) {
        if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
          continue;
        }
        throw error;
      }

      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await readFile(path.join(casesPath, file), "utf8");
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const item of parsed) {
          if (
            item &&
            typeof item === "object" &&
            !Array.isArray(item) &&
            typeof (item as { model?: unknown }).model === "string"
          ) {
            caseModels.add((item as { model: string }).model);
          }
        }
      }
    }

    return Array.from(caseModels).sort((a, b) => a.localeCompare(b, "en-US"));
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
}

export async function getApiSmokeCoverageSummary(): Promise<ApiSmokeCoverageSummary> {
  const [records, caseModels] = await Promise.all([getApiSmokeRecords(1000), getSmokeCaseModels()]);
  const recordedModels = new Set<string>();
  const statsByModel = new Map<
    string,
    {
      totalRuns: number;
      successRuns: number;
    }
  >();
  const latestByModel = new Map<
    string,
    {
      success: boolean;
      startedAt: string;
      completedAt: string;
      caseId: string;
      suite: string;
      script: string;
    }
  >();

  for (const record of records) {
    recordedModels.add(record.model);
    const nextStats = statsByModel.get(record.model) ?? { totalRuns: 0, successRuns: 0 };
    nextStats.totalRuns += 1;
    if (record.success) {
      nextStats.successRuns += 1;
    }
    statsByModel.set(record.model, nextStats);
    const existing = latestByModel.get(record.model);
    if (!existing || new Date(record.completedAt).getTime() > new Date(existing.completedAt).getTime()) {
      latestByModel.set(record.model, {
        success: record.success,
        startedAt: record.startedAt,
        completedAt: record.completedAt,
        caseId: record.caseId,
        suite: record.suite,
        script: record.script,
      });
    }
  }

  return {
    caseModels,
    recordedModels: Array.from(recordedModels).sort((a, b) => a.localeCompare(b, "en-US")),
    statsByModel: Object.fromEntries(statsByModel),
    latestByModel: Object.fromEntries(latestByModel),
  };
}
