"use client";

import { useMemo, useState } from "react";

type ValidationResult = {
  ok: boolean;
  checks: Array<{ label: string; passed: boolean; detail: string }>;
};

const defaultRequestExample = `{
  "model": "openoctopus/your-image-model",
  "prompt": "a product photo of a ceramic mug on a wooden table",
  "input": {
    "size": "1024x1024"
  }
}`;

const defaultTaskResponseExample = `{
  "id": "task_id",
  "status": "succeeded",
  "capability": "image_generation",
  "output_payload": {
    "format": "openoctopus.image.output.v1",
    "assets": [
      {
        "id": "0",
        "index": 0,
        "type": "image",
        "url": "https://example.com/image.png",
        "mimeType": "image/png"
      }
    ]
  }
}`;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequestBody(value: unknown): ValidationResult {
  const checks: ValidationResult["checks"] = [];
  const root = isRecord(value) ? value : null;

  checks.push({
    label: "JSON object",
    passed: root !== null,
    detail: root ? "Request body is a JSON object." : "Request body must be a JSON object.",
  });

  const model = root?.model;
  checks.push({
    label: "model",
    passed: typeof model === "string" && model.trim().length > 0,
    detail:
      typeof model === "string" && model.trim().length > 0
        ? `model = ${model}`
        : "`model` must be a non-empty string public model slug.",
  });

  const prompt = root?.prompt;
  checks.push({
    label: "prompt",
    passed: prompt === undefined || typeof prompt === "string",
    detail:
      prompt === undefined || typeof prompt === "string"
        ? "prompt is optional and valid."
        : "`prompt` must be a string when provided.",
  });

  const input = root?.input;
  checks.push({
    label: "input",
    passed: input === undefined || isRecord(input),
    detail:
      input === undefined || isRecord(input)
        ? "input is optional and can carry model-specific params."
        : "`input` must be a JSON object when provided.",
  });

  return {
    ok: checks.every((check) => check.passed),
    checks,
  };
}

function validateTaskResponse(value: unknown): ValidationResult {
  const checks: ValidationResult["checks"] = [];
  const root = isRecord(value) ? value : null;

  checks.push({
    label: "JSON object",
    passed: root !== null,
    detail: root ? "Response is a JSON object." : "Response must be a JSON object.",
  });

  const status = root?.status;
  checks.push({
    label: "status",
    passed: status === "succeeded",
    detail:
      status === "succeeded"
        ? "status is succeeded."
        : `status must be "succeeded" for final image contract validation (current: ${String(status)})`,
  });

  const capability = root?.capability;
  checks.push({
    label: "capability",
    passed: capability === "image_generation" || capability === "image_edit",
    detail:
      capability === "image_generation" || capability === "image_edit"
        ? `capability = ${String(capability)}`
        : `capability should be image_generation or image_edit (current: ${String(capability)})`,
  });

  const outputPayload = isRecord(root?.output_payload) ? root?.output_payload : null;
  checks.push({
    label: "output_payload",
    passed: outputPayload !== null,
    detail: outputPayload ? "output_payload exists." : "output_payload is missing.",
  });

  const format = outputPayload?.format;
  checks.push({
    label: "output_payload.format",
    passed: format === "openoctopus.image.output.v1",
    detail:
      format === "openoctopus.image.output.v1"
        ? "format is correct."
        : `format must be "openoctopus.image.output.v1" (current: ${String(format)})`,
  });

  const assets = Array.isArray(outputPayload?.assets) ? outputPayload.assets : [];
  checks.push({
    label: "output_payload.assets",
    passed: assets.length > 0,
    detail:
      assets.length > 0 ? `assets count = ${assets.length}` : "assets must be a non-empty array.",
  });

  const firstAsset = assets.length > 0 && isRecord(assets[0]) ? assets[0] : null;
  checks.push({
    label: "assets[0].type",
    passed: firstAsset?.type === "image",
    detail:
      firstAsset?.type === "image"
        ? "assets[0].type is image."
        : `assets[0].type must be "image" (current: ${String(firstAsset?.type)})`,
  });

  const url = firstAsset?.url;
  const validUrl =
    typeof url === "string" &&
    (url.startsWith("https://") ||
      url.startsWith("http://") ||
      url.startsWith("data:image/") ||
      url.startsWith("/v1/files/"));
  checks.push({
    label: "assets[0].url",
    passed: validUrl,
    detail: validUrl
      ? "assets[0].url is a supported image URL form."
      : "assets[0].url must be one of https/http, data:image/... or /v1/files/...",
  });

  return {
    ok: checks.every((check) => check.passed),
    checks,
  };
}

export function ImageContractPlayground() {
  const [requestBodyText, setRequestBodyText] = useState(defaultRequestExample);
  const [taskResponseText, setTaskResponseText] = useState(defaultTaskResponseExample);

  const requestValidation = useMemo(() => {
    try {
      return validateRequestBody(JSON.parse(requestBodyText));
    } catch {
      return {
        ok: false,
        checks: [
          {
            label: "Request JSON parse",
            passed: false,
            detail: "Request body is not valid JSON.",
          },
        ],
      } as ValidationResult;
    }
  }, [requestBodyText]);

  const responseValidation = useMemo(() => {
    try {
      return validateTaskResponse(JSON.parse(taskResponseText));
    } catch {
      return {
        ok: false,
        checks: [
          {
            label: "Response JSON parse",
            passed: false,
            detail: "Task response is not valid JSON.",
          },
        ],
      } as ValidationResult;
    }
  }, [taskResponseText]);

  return (
    <section className="rounded-xl border border-[#BAE6FD] bg-white p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-black">图片输出契约 Playground</h3>
        <p className="mt-2 text-sm leading-6 text-black/60">
          粘贴图片请求体与任务返回体，实时校验是否符合统一输出契约。
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/55">请求体（POST /v1/images/generations）</p>
          <textarea
            value={requestBodyText}
            onChange={(event) => setRequestBodyText(event.target.value)}
            className="mt-2 h-64 w-full rounded-md border border-[#BAE6FD] bg-white p-3 font-mono text-xs text-black outline-none focus:border-black/20"
          />
          <div className="mt-3 space-y-2 text-xs">
            {requestValidation.checks.map((check) => (
              <div
                key={`req-${check.label}`}
                className={`rounded-md border px-2.5 py-2 ${
                  check.passed
                    ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
                    : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
                }`}
              >
                <p className="font-medium">{check.label}</p>
                <p className="mt-1">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#DDF4FF] bg-[#F8FCFF] p-3">
          <p className="text-[11px] tracking-[0.35px] text-black/55">返回体（GET /v1/tasks/:id）</p>
          <textarea
            value={taskResponseText}
            onChange={(event) => setTaskResponseText(event.target.value)}
            className="mt-2 h-64 w-full rounded-md border border-[#BAE6FD] bg-white p-3 font-mono text-xs text-black outline-none focus:border-black/20"
          />
          <div className="mt-3 space-y-2 text-xs">
            {responseValidation.checks.map((check) => (
              <div
                key={`resp-${check.label}`}
                className={`rounded-md border px-2.5 py-2 ${
                  check.passed
                    ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
                    : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
                }`}
              >
                <p className="font-medium">{check.label}</p>
                <p className="mt-1">{check.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs ${
            requestValidation.ok
              ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
              : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
          }`}
        >
          Request schema: {requestValidation.ok ? "PASS" : "FAIL"}
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs ${
            responseValidation.ok
              ? "border-[#D7EADB] bg-[#EDF8F0] text-[#1F6B3B]"
              : "border-[#F0D1CB] bg-[#FFF1EE] text-[#B54432]"
          }`}
        >
          Output contract: {responseValidation.ok ? "PASS" : "FAIL"}
        </span>
      </div>
    </section>
  );
}
