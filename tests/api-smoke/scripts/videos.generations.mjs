#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiBaseUrl, getApiKey, getKeyPrefix, requestJson } from "../lib/http-client.mjs";
import { pollTask, TaskPollingError } from "../lib/polling.mjs";
import { printSummary, writeSmokeReport } from "../lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiName = "POST /v1/videos/generations";
const defaultVideoTimeoutMs = 300_000;

function readArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function readCases() {
  const suite = readArg("suite", "veo3-fast");
  const casePath = path.resolve(__dirname, `../${suite}/cases/videos.generations.json`);
  const raw = await readFile(casePath, "utf8");
  return { suite, cases: JSON.parse(raw) };
}

function countAssets(outputPayload) {
  if (!outputPayload || typeof outputPayload !== "object" || Array.isArray(outputPayload)) {
    return 0;
  }
  return Array.isArray(outputPayload.assets) ? outputPayload.assets.length : 0;
}

async function runCase({ smokeCase, apiKey, keyPrefix, baseUrl, suite }) {
  const startedAt = new Date();
  const startedMs = Date.now();
  let submitStatus;
  let taskId;
  let submitResponseJson = null;
  let taskResponseJson = null;
  const requestUrl = `${baseUrl}${smokeCase.endpoint}`;
  const requestPayload = smokeCase.payload;
  const baseRecord = {
    api: apiName,
    script: "tests/api-smoke/scripts/videos.generations.mjs",
    suite,
    caseId: smokeCase.id,
    model: smokeCase.model,
    endpoint: smokeCase.endpoint,
    baseUrl,
    requestUrl,
    requestPayload,
    keyPrefix,
    startedAt: startedAt.toISOString(),
  };

  try {
    const { response, json } = await requestJson({
      method: "POST",
      path: smokeCase.endpoint,
      body: smokeCase.payload,
      apiKey,
      baseUrl,
    });
    submitStatus = response.status;
    submitResponseJson = json;

    if (submitStatus !== smokeCase.expect?.submitStatus) {
      const message =
        json?.error?.message ||
        json?.message ||
        `Expected submit HTTP ${smokeCase.expect?.submitStatus}, received ${submitStatus}`;
      throw new Error(message);
    }

    taskId = typeof json?.id === "string" ? json.id : "";
    if (!taskId) {
      throw new Error("Submit response did not include a task id.");
    }

    const pollUrl = `${baseUrl}/v1/tasks/${taskId}`;
    const timeoutMs = Number(readArg("timeoutMs", smokeCase.expect?.timeoutMs ?? defaultVideoTimeoutMs));
    const task = await pollTask({ taskId, apiKey, baseUrl, timeoutMs });
    taskResponseJson = task;
    const finalStatus = typeof task?.status === "string" ? task.status : "unknown";
    const expectedFinalStatus = smokeCase.expect?.finalStatus || "succeeded";
    const assetCount = countAssets(task?.output_payload);

    if (finalStatus !== expectedFinalStatus) {
      throw new Error(
        task?.error_message || `Expected final status ${expectedFinalStatus}, received ${finalStatus}`
      );
    }

    const assetCountMin = Number(smokeCase.expect?.assetCountMin ?? 0);
    if (assetCount < assetCountMin) {
      throw new Error(`Expected at least ${assetCountMin} output assets, received ${assetCount}`);
    }

    return {
      ...baseRecord,
      success: true,
      submitStatus,
      taskId,
      finalStatus,
      assetCount,
      submitResponse: submitResponseJson,
      pollUrl,
      taskResponse: taskResponseJson,
      completedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedMs,
    };
  } catch (error) {
    if (error instanceof TaskPollingError) {
      taskResponseJson = error.responseJson;
    }

    return {
      ...baseRecord,
      success: false,
      submitStatus,
      taskId,
      submitResponse: submitResponseJson,
      pollUrl: taskId ? `${baseUrl}/v1/tasks/${taskId}` : undefined,
      taskResponse: taskResponseJson,
      errorMessage: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedMs,
    };
  }
}

async function main() {
  const apiKey = getApiKey();
  const keyPrefix = getKeyPrefix(apiKey);
  const baseUrl = getApiBaseUrl();
  const { suite, cases } = await readCases();
  const caseFilter = readArg("case");
  const modelFilter = readArg("model");
  const selectedCases = cases.filter((smokeCase) => {
    if (caseFilter && smokeCase.id !== caseFilter) return false;
    if (modelFilter && smokeCase.model !== modelFilter) return false;
    return true;
  });

  if (selectedCases.length === 0) {
    throw new Error("No smoke cases matched the provided filters.");
  }

  const records = [];
  for (const smokeCase of selectedCases) {
    records.push(await runCase({ smokeCase, apiKey, keyPrefix, baseUrl, suite }));
  }

  await writeSmokeReport(records);
  printSummary(records);

  if (records.some((record) => !record.success)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
