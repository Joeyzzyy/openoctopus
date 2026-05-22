#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getApiBaseUrl, getApiKey, getKeyPrefix } from "../lib/http-client.mjs";
import { printSummary, writeSmokeReport } from "../lib/report.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiName = "POST /v1/code/chat/completions";

function readArg(name, fallback = "") {
  const prefix = `--${name}=`;
  const inline = process.argv.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] || fallback : fallback;
}

async function readCases() {
  const suite = readArg("suite", "deepcode");
  const casePath = path.resolve(__dirname, `../${suite}/cases/code.chat.completions.json`);
  const raw = await readFile(casePath, "utf8");
  return { suite, cases: JSON.parse(raw) };
}

function parseSse(raw) {
  const events = [];
  for (const chunk of raw.split("\n\n")) {
    const trimmed = chunk.trim();
    if (!trimmed) continue;
    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const dataLines = lines
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (dataLines.length === 0) continue;
    const data = dataLines.join("\n");
    if (data === "[DONE]") {
      events.push({ done: true });
      continue;
    }
    try {
      events.push(JSON.parse(data));
    } catch {
      events.push({ raw: data });
    }
  }
  return events;
}

function summarizeStream(events) {
  let text = "";
  let usage = null;
  let doneSeen = false;

  for (const event of events) {
    if (event?.done) {
      doneSeen = true;
      continue;
    }
    if (event && typeof event === "object") {
      if (event.usage && typeof event.usage === "object") {
        usage = event.usage;
      }
      if (Array.isArray(event.choices)) {
        for (const choice of event.choices) {
          const delta = choice?.delta;
          if (delta && typeof delta.content === "string") {
            text += delta.content;
          }
        }
      }
    }
  }

  return { text: text.trim(), usage, doneSeen };
}

async function runCase({ smokeCase, apiKey, keyPrefix, baseUrl, suite }) {
  const startedAt = new Date();
  const startedMs = Date.now();
  let submitStatus;
  let submitResponseText = null;
  const requestUrl = `${baseUrl}${smokeCase.endpoint}`;
  const requestPayload = smokeCase.payload;
  const baseRecord = {
    api: apiName,
    script: "tests/api-smoke/scripts/code.chat.completions.mjs",
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
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(smokeCase.payload),
    });
    submitStatus = response.status;
    submitResponseText = await response.text();

    if (submitStatus !== smokeCase.expect?.submitStatus) {
      throw new Error(
        `Expected submit HTTP ${smokeCase.expect?.submitStatus}, received ${submitStatus}: ${submitResponseText}`
      );
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/event-stream")) {
      throw new Error(`Expected text/event-stream response, received ${contentType || "unknown"}`);
    }

    const events = parseSse(submitResponseText);
    const summary = summarizeStream(events);
    const minTextLength = Number(smokeCase.expect?.textLengthMin ?? 1);

    if (!summary.doneSeen) {
      throw new Error("Expected SSE stream to include [DONE] sentinel.");
    }

    if (summary.text.length < minTextLength) {
      throw new Error(`Expected at least ${minTextLength} characters of streamed text, received ${summary.text.length}`);
    }

    if (smokeCase.expect?.requireUsage && !summary.usage) {
      throw new Error("Expected streamed response to include usage payload.");
    }

    return {
      ...baseRecord,
      success: true,
      submitStatus,
      finalStatus: "stream_succeeded",
      outputTextLength: summary.text.length,
      submitResponse: {
        contentType,
        raw: submitResponseText,
        usage: summary.usage,
      },
      completedAt: new Date().toISOString(),
      latencyMs: Date.now() - startedMs,
    };
  } catch (error) {
    return {
      ...baseRecord,
      success: false,
      submitStatus,
      submitResponse: submitResponseText ? { raw: submitResponseText } : null,
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
