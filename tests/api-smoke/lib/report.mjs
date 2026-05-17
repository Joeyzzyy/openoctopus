import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const historyPath = path.resolve(__dirname, "../reports/history.json");
const latestPath = path.resolve(__dirname, "../reports/latest.json");
const maxHistoryRecords = 500;

async function readHistory() {
  try {
    const raw = await readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
}

export async function writeSmokeReport(records) {
  await mkdir(path.dirname(historyPath), { recursive: true });
  const history = await readHistory();
  const nextHistory = [...records, ...history].slice(0, maxHistoryRecords);
  await writeFile(historyPath, `${JSON.stringify(nextHistory, null, 2)}\n`);
  await writeFile(latestPath, `${JSON.stringify(records, null, 2)}\n`);
}

export function printSummary(records) {
  const passed = records.filter((record) => record.success).length;
  const failed = records.length - passed;

  console.table(
    records.map((record) => ({
      api: record.api,
      case: record.caseId,
      model: record.model,
      success: record.success,
      status: record.finalStatus || record.submitStatus || "unknown",
      latencyMs: record.latencyMs,
      error: record.errorMessage || "",
    }))
  );

  console.log(`API smoke complete: ${passed}/${records.length} passed, ${failed} failed.`);

  console.log("\nAPI smoke responses:");
  for (const record of records) {
    console.log(
      JSON.stringify(
        {
          caseId: record.caseId,
          model: record.model,
          success: record.success,
          submitStatus: record.submitStatus,
          taskId: record.taskId,
          finalStatus: record.finalStatus,
          errorMessage: record.errorMessage,
          requestUrl: record.requestUrl ?? null,
          requestPayload: record.requestPayload ?? null,
          submitResponse: record.submitResponse ?? null,
          pollUrl: record.pollUrl ?? null,
          taskResponse: record.taskResponse ?? null,
        },
        null,
        2
      )
    );
  }
}
