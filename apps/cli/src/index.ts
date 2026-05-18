#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { stat, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

type Config = {
  apiBase: string;
  apiKey?: string;
  defaultTimeoutMs: number;
  pollIntervalMs: number;
};

type ManifestParam = {
  name: string;
  cliFlag?: string;
  type: string;
  required?: boolean;
  enum?: string[];
  format?: string;
  description?: string;
};

type ManifestModel = {
  model: string;
  displayName: string;
  provider?: string;
  capability: string;
  endpoint: string;
  requestMode: "sync" | "async_polling";
  inputSchema?: { params?: ManifestParam[] };
  output?: { type?: string };
  pricing?: unknown;
};

type Manifest = {
  version: string;
  models: ManifestModel[];
};

type ParsedArgs = {
  positionals: string[];
  flags: Record<string, string | boolean | string[]>;
};

const DEFAULT_CONFIG: Config = {
  apiBase: "https://api.openoctopus.com",
  defaultTimeoutMs: 10 * 60 * 1000,
  pollIntervalMs: 1800,
};

function configPath() {
  if (process.env.OPENOCTOPUS_CONFIG) return process.env.OPENOCTOPUS_CONFIG;
  if (platform() === "darwin") {
    return `${homedir()}/Library/Application Support/openoctopus/config.json`;
  }
  if (platform() === "win32") {
    return `${process.env.APPDATA ?? homedir()}/OpenOctopus/config.json`;
  }
  return `${process.env.XDG_CONFIG_HOME ?? `${homedir()}/.config`}/openoctopus/config.json`;
}

function loadConfig(): Config {
  const path = configPath();
  const envApiKey = process.env.OPENOCTOPUS_API_KEY?.trim();
  const envApiBase = process.env.OPENOCTOPUS_API_BASE_URL?.trim();
  if (!existsSync(path)) {
    return {
      ...DEFAULT_CONFIG,
      ...(envApiBase ? { apiBase: envApiBase } : {}),
      ...(envApiKey ? { apiKey: envApiKey } : {}),
    };
  }
  try {
    const parsed = JSON.parse(readFileSync(path, "utf8")) as Partial<Config>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      ...(envApiBase ? { apiBase: envApiBase } : {}),
      ...(envApiKey ? { apiKey: envApiKey } : {}),
    };
  } catch {
    return {
      ...DEFAULT_CONFIG,
      ...(envApiBase ? { apiBase: envApiBase } : {}),
      ...(envApiKey ? { apiKey: envApiKey } : {}),
    };
  }
}

function saveConfig(config: Config) {
  const path = configPath();
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(config, null, 2));
}

function parseArgs(argv: string[]): ParsedArgs {
  const positionals: string[] = [];
  const flags: Record<string, string | boolean | string[]> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i] ?? "";
    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }
    const raw = token.slice(2);
    const [rawKey, inlineValue] = raw.split(/=(.*)/s).filter(Boolean);
    const key = rawKey ?? "";
    const next = argv[i + 1];
    const value =
      inlineValue !== undefined
        ? inlineValue
        : next && !next.startsWith("--")
          ? (i += 1, next)
          : true;
    const existing = flags[key];
    if (existing === undefined) {
      flags[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(String(value));
    } else {
      flags[key] = [String(existing), String(value)];
    }
  }
  return { positionals, flags };
}

function readFlag(flags: ParsedArgs["flags"], name: string) {
  const value = flags[name];
  if (Array.isArray(value)) return value[value.length - 1];
  if (value === true) return "true";
  return typeof value === "string" ? value : undefined;
}

function hasFlag(flags: ParsedArgs["flags"], name: string) {
  return flags[name] !== undefined;
}

function requireApiKey(config: Config) {
  const key = config.apiKey?.trim();
  if (!key) {
    throw new Error("Missing API key. Run `ooct auth login` or set OPENOCTOPUS_API_KEY.");
  }
  return key;
}

async function requestJson<T>(config: Config, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(new URL(path, config.apiBase), {
    ...init,
    headers: {
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) {
    const message =
      payload?.error?.message ??
      payload?.error?.code ??
      payload?.message ??
      `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return payload as T;
}

async function fetchManifest(config: Config) {
  return requestJson<Manifest>(config, "/v1/model-manifest");
}

function printHelp() {
  console.log(`OpenOctopus CLI

Usage:
  ooct auth login
  ooct auth status
  ooct config get
  ooct config set api-base <url>
  ooct models
  ooct models search <query>
  ooct models inspect <model>
  ooct run <model> [dynamic options]
  ooct task get <task_id>
  ooct task wait <task_id>
  ooct uploads create <file>

Global flags:
  --api-base <url>       Override API base URL
  --json                 Print machine-readable JSON where supported
`);
}

async function authCommand(config: Config, args: ParsedArgs) {
  const action = args.positionals[1];
  if (action === "login") {
    const keyFromFlag = readFlag(args.flags, "api-key");
    let key = keyFromFlag;
    if (!key) {
      const rl = createInterface({ input, output });
      key = await rl.question("OpenOctopus API key: ");
      rl.close();
    }
    saveConfig({ ...config, apiKey: key.trim() });
    console.log("Authenticated.");
    return;
  }
  if (action === "logout") {
    const next = { ...config };
    delete next.apiKey;
    saveConfig(next);
    console.log("Logged out.");
    return;
  }
  if (action === "status") {
    console.log(config.apiKey ? "Authenticated." : "Not authenticated.");
    console.log(`API base: ${config.apiBase}`);
    return;
  }
  printHelp();
}

async function configCommand(config: Config, args: ParsedArgs) {
  const action = args.positionals[1];
  if (action === "get") {
    console.log(JSON.stringify({ ...config, apiKey: config.apiKey ? `${config.apiKey.slice(0, 8)}...` : undefined }, null, 2));
    return;
  }
  if (action === "set") {
    const key = args.positionals[2];
    const value = args.positionals[3];
    if (key === "api-base" && value) {
      saveConfig({ ...config, apiBase: value });
      console.log(`api-base set to ${value}`);
      return;
    }
  }
  printHelp();
}

function renderModels(models: ManifestModel[]) {
  const rows = models.map((model) => ({
    model: model.model,
    capability: model.capability,
    output: model.output?.type ?? "unknown",
  }));
  const modelWidth = Math.max("MODEL".length, ...rows.map((row) => row.model.length));
  const capWidth = Math.max("CAPABILITY".length, ...rows.map((row) => row.capability.length));
  console.log(`${"MODEL".padEnd(modelWidth)}  ${"CAPABILITY".padEnd(capWidth)}  OUTPUT`);
  for (const row of rows) {
    console.log(`${row.model.padEnd(modelWidth)}  ${row.capability.padEnd(capWidth)}  ${row.output}`);
  }
}

async function modelsCommand(config: Config, args: ParsedArgs) {
  const manifest = await fetchManifest(config);
  const action = args.positionals[1];
  if (!action) {
    renderModels(manifest.models);
    return;
  }
  if (action === "search") {
    const query = (args.positionals[2] ?? "").toLowerCase();
    renderModels(
      manifest.models.filter(
        (model) =>
          model.model.toLowerCase().includes(query) ||
          model.displayName.toLowerCase().includes(query) ||
          model.capability.toLowerCase().includes(query)
      )
    );
    return;
  }
  if (action === "inspect") {
    const slug = args.positionals[2];
    const model = manifest.models.find((item) => item.model === slug);
    if (!model) throw new Error(`Model not found: ${slug}`);
    console.log(JSON.stringify(model, null, 2));
    return;
  }
  printHelp();
}

function coerceValue(param: ManifestParam, value: string | boolean | string[]) {
  if (Array.isArray(value)) return value;
  if (param.type === "boolean") return value === true || value === "true";
  if (param.type === "integer" || param.type === "number") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`Invalid number for --${param.cliFlag ?? param.name}`);
    return parsed;
  }
  if (param.type === "array") {
    if (typeof value !== "string") return [];
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
  }
  return String(value);
}

function isLikelyFileParam(param: ManifestParam) {
  return param.format === "file_url_or_file" || param.format === "image_url_or_file";
}

function isRemoteAssetUrl(value: string) {
  return value.startsWith("http://") || value.startsWith("https://");
}

function mimeFromPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".mov")) return "video/quicktime";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  return "image/png";
}

async function resolveFileLikeValue(
  config: Config,
  param: ManifestParam,
  value: string | string[]
) {
  if (Array.isArray(value)) {
    const uploaded = await Promise.all(
      value.map(async (item) =>
        isRemoteAssetUrl(item) ? item : (await uploadFile(config, item, param.name)).url
      )
    );
    return uploaded;
  }
  if (isRemoteAssetUrl(value)) {
    return value;
  }
  const uploaded = await uploadFile(config, value, param.name);
  return uploaded.url;
}

async function uploadFile(config: Config, filePath: string, field = "file") {
  const apiKey = requireApiKey(config);
  const absolute = resolve(filePath);
  const fileStat = await stat(absolute);
  if (!fileStat.isFile()) throw new Error(`Not a file: ${filePath}`);
  const body = await readFile(absolute);
  const filename = basename(absolute);
  const response = await fetch(
    new URL(`/v1/uploads?filename=${encodeURIComponent(filename)}&field=${encodeURIComponent(field)}`, config.apiBase),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": mimeFromPath(filename),
      },
      body,
    }
  );
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message ?? "Upload failed");
  }
  return payload as { url: string; mimeType: string; name: string; size: number };
}

async function buildInput(config: Config, model: ManifestModel, flags: ParsedArgs["flags"]) {
  const inputPayload: Record<string, unknown> = {};
  const params = model.inputSchema?.params ?? [];
  let prompt: string | undefined = readFlag(flags, "prompt");
  for (const param of params) {
    const flag = param.cliFlag ?? param.name.replace(/_/g, "-");
    const raw = flags[flag] ?? flags[param.name];
    if (raw === undefined) {
      if (param.required) throw new Error(`Missing required option --${flag}`);
      continue;
    }
    let value = coerceValue(param, raw);
    if (
      isLikelyFileParam(param) &&
      (typeof value === "string" || (Array.isArray(value) && value.every((item) => typeof item === "string")))
    ) {
      value = await resolveFileLikeValue(config, param, value);
    }
    if (param.name === "prompt") {
      prompt = String(value);
    } else {
      inputPayload[param.name] = value;
    }
  }
  return { prompt, input: inputPayload };
}

async function submitTask(config: Config, model: ManifestModel, body: Record<string, unknown>) {
  const apiKey = requireApiKey(config);
  return requestJson<{ id: string; status: string }>(config, model.endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function getTask(config: Config, taskId: string) {
  const apiKey = requireApiKey(config);
  return requestJson<Record<string, unknown>>(config, `/v1/tasks/${encodeURIComponent(taskId)}`, {
    headers: {
      authorization: `Bearer ${apiKey}`,
    },
  });
}

async function waitForTask(config: Config, taskId: string, json: boolean) {
  const started = Date.now();
  while (Date.now() - started < config.defaultTimeoutMs) {
    const task = await getTask(config, taskId);
    const status = String(task.status ?? "");
    if (status === "queued" || status === "processing") {
      if (!json) process.stderr.write(`Waiting (${status})...\r`);
      await new Promise((resolve) => setTimeout(resolve, config.pollIntervalMs));
      continue;
    }
    if (!json) process.stderr.write(" ".repeat(40) + "\r");
    return task;
  }
  throw new Error(`Task timed out after ${config.defaultTimeoutMs}ms`);
}

function renderTaskResult(task: Record<string, unknown>, json: boolean) {
  if (json) {
    console.log(JSON.stringify(task, null, 2));
    return;
  }
  const outputPayload = task.output_payload && typeof task.output_payload === "object"
    ? task.output_payload as Record<string, unknown>
    : task;
  if (typeof outputPayload.text === "string") {
    console.log(outputPayload.text);
    return;
  }
  const assets = Array.isArray(outputPayload.assets) ? outputPayload.assets : [];
  if (assets.length > 0) {
    for (const asset of assets) {
      if (asset && typeof asset === "object" && "url" in asset) {
        console.log(String((asset as { url: unknown }).url));
      }
    }
    return;
  }
  console.log(JSON.stringify(outputPayload, null, 2));
}

async function downloadOutputs(task: Record<string, unknown>, outputPath: string) {
  const outputPayload = task.output_payload && typeof task.output_payload === "object"
    ? task.output_payload as Record<string, unknown>
    : task;
  const assets = Array.isArray(outputPayload.assets) ? outputPayload.assets : [];
  const first = assets.find((asset) => asset && typeof asset === "object" && typeof (asset as { url?: unknown }).url === "string") as { url: string } | undefined;
  if (!first) return;
  const response = await fetch(first.url);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  await writeFile(resolve(outputPath), Buffer.from(await response.arrayBuffer()));
}

async function runCommand(config: Config, args: ParsedArgs) {
  const modelSlug = args.positionals[1];
  if (!modelSlug) throw new Error("Usage: ooct run <model> [options]");
  const manifest = await fetchManifest(config);
  const model = manifest.models.find((item) => item.model === modelSlug);
  if (!model) throw new Error(`Model not found: ${modelSlug}`);
  const { prompt, input: inputPayload } = await buildInput(config, model, args.flags);
  const body: Record<string, unknown> = {
    model: model.model,
    input: inputPayload,
  };
  if (prompt && prompt.trim()) body.prompt = prompt;
  const submit = await submitTask(config, model, body);
  if (hasFlag(args.flags, "no-wait")) {
    if (hasFlag(args.flags, "json")) console.log(JSON.stringify(submit, null, 2));
    else console.log(submit.id);
    return;
  }
  const task = await waitForTask(config, submit.id, hasFlag(args.flags, "json"));
  const outputPath = readFlag(args.flags, "output");
  if (outputPath) {
    await downloadOutputs(task, outputPath);
  }
  renderTaskResult(task, hasFlag(args.flags, "json"));
}

async function taskCommand(config: Config, args: ParsedArgs) {
  const action = args.positionals[1];
  const taskId = args.positionals[2];
  if (!taskId) throw new Error("Usage: ooct task get <task_id> or ooct task wait <task_id>");
  const task = action === "wait"
    ? await waitForTask(config, taskId, hasFlag(args.flags, "json"))
    : await getTask(config, taskId);
  renderTaskResult(task, hasFlag(args.flags, "json"));
}

async function uploadsCommand(config: Config, args: ParsedArgs) {
  if (args.positionals[1] !== "create" || !args.positionals[2]) {
    throw new Error("Usage: ooct uploads create <file>");
  }
  const uploaded = await uploadFile(config, args.positionals[2], readFlag(args.flags, "field") ?? "file");
  if (hasFlag(args.flags, "json")) console.log(JSON.stringify(uploaded, null, 2));
  else console.log(uploaded.url);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  let config = loadConfig();
  const apiBase = readFlag(args.flags, "api-base");
  if (apiBase) config = { ...config, apiBase };
  const command = args.positionals[0];
  if (!command || command === "help" || hasFlag(args.flags, "help")) {
    printHelp();
    return;
  }
  if (command === "auth") return authCommand(config, args);
  if (command === "config") return configCommand(config, args);
  if (command === "models") return modelsCommand(config, args);
  if (command === "run") return runCommand(config, args);
  if (command === "task") return taskCommand(config, args);
  if (command === "uploads") return uploadsCommand(config, args);
  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
