import "server-only";

import { ZodError } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

type GatewayErrorDefinition = {
  code: string;
  httpStatus: number;
  publicMessage: string;
  retryable: boolean;
};

const CACHE_TTL_MS = 60_000;

const DEFAULT_GATEWAY_ERROR_DEFINITIONS: GatewayErrorDefinition[] = [
  { code: "invalid_request", httpStatus: 400, publicMessage: "The request payload is invalid. Check the required fields and try again.", retryable: false },
  { code: "unauthorized", httpStatus: 401, publicMessage: "Authentication is required for this request.", retryable: false },
  { code: "invalid_api_key", httpStatus: 401, publicMessage: "The API key is invalid or inactive.", retryable: false },
  { code: "insufficient_balance", httpStatus: 402, publicMessage: "Your wallet balance is insufficient. Please top up and try again.", retryable: false },
  { code: "model_not_available", httpStatus: 404, publicMessage: "The requested model is currently unavailable.", retryable: false },
  { code: "task_not_found", httpStatus: 404, publicMessage: "The requested task could not be found.", retryable: false },
  { code: "file_not_found", httpStatus: 404, publicMessage: "The requested generated file is not available.", retryable: false },
  { code: "provider_submit_failed", httpStatus: 502, publicMessage: "The generation provider could not accept the request. Please retry shortly.", retryable: true },
  { code: "provider_poll_failed", httpStatus: 502, publicMessage: "The generation provider could not complete the request. Please retry shortly.", retryable: true },
  { code: "upstream_failed", httpStatus: 502, publicMessage: "The generation provider failed to complete the request. Please retry shortly.", retryable: true },
  { code: "content_policy_violation", httpStatus: 400, publicMessage: "The prompt or image was rejected by the provider safety policy. Please adjust the content and try again.", retryable: false },
  { code: "upstream_timeout", httpStatus: 504, publicMessage: "The generation request timed out. Please retry shortly.", retryable: true },
  { code: "upstream_result_missing", httpStatus: 502, publicMessage: "The generation provider returned an incomplete result. Please retry shortly.", retryable: true },
  { code: "service_unavailable", httpStatus: 503, publicMessage: "The service is temporarily unavailable. Please retry later.", retryable: true },
  { code: "internal_error", httpStatus: 500, publicMessage: "The service encountered an unexpected error. Please retry later.", retryable: true },
];

let cache: {
  expiresAt: number;
  byCode: Map<string, GatewayErrorDefinition>;
} | null = null;

function normalizeCode(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "internal_error";
  }
  const trimmed = value.trim().toLowerCase();
  return /^[a-z0-9_]+$/.test(trimmed) ? trimmed : "internal_error";
}

function buildDefaultMap() {
  return new Map(
    DEFAULT_GATEWAY_ERROR_DEFINITIONS.map((definition) => [definition.code, definition] as const)
  );
}

async function loadDefinitions() {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.byCode;
  }

  const byCode = buildDefaultMap();

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("gateway_error_definitions")
      .select("code, http_status, public_message, retryable, active")
      .eq("active", true);

    if (!error) {
      for (const row of data ?? []) {
        const code = normalizeCode(row.code);
        byCode.set(code, {
          code,
          httpStatus: Number(row.http_status ?? 500),
          publicMessage: row.public_message ?? "The service encountered an unexpected error. Please retry later.",
          retryable: row.retryable === true,
        });
      }
    }
  } catch {
    // Use built-in defaults when the backing table is unavailable.
  }

  cache = {
    expiresAt: Date.now() + CACHE_TTL_MS,
    byCode,
  };

  return byCode;
}

export async function resolveGatewayErrorDefinition(code: string | null | undefined) {
  const normalizedCode = normalizeCode(code);
  const definitions = await loadDefinitions();
  return definitions.get(normalizedCode) ?? definitions.get("internal_error")!;
}

export async function buildGatewayErrorResponse(input: {
  code?: string | null;
  statusCode?: number | null;
}) {
  const definition = await resolveGatewayErrorDefinition(input.code);
  return {
    statusCode: input.statusCode ?? definition.httpStatus,
    payload: {
      error: {
        code: definition.code,
        message: definition.publicMessage,
        retryable: definition.retryable,
      },
    },
  };
}

export function isGatewayValidationError(error: unknown) {
  return error instanceof ZodError;
}
