import { ZodError } from "zod";
import { supabaseAdmin } from "./supabase.js";

type GatewayErrorDefinition = {
  code: string;
  category: string;
  httpStatus: number;
  publicMessage: string;
  retryable: boolean;
  active: boolean;
  sortOrder: number;
  operatorNotes: string | null;
};

const CACHE_TTL_MS = 60_000;

const DEFAULT_GATEWAY_ERROR_DEFINITIONS: GatewayErrorDefinition[] = [
  {
    code: "invalid_request",
    category: "validation",
    httpStatus: 400,
    publicMessage: "The request payload is invalid. Check the required fields and try again.",
    retryable: false,
    active: true,
    sortOrder: 10,
    operatorNotes: null,
  },
  {
    code: "unauthorized",
    category: "auth",
    httpStatus: 401,
    publicMessage: "Authentication is required for this request.",
    retryable: false,
    active: true,
    sortOrder: 20,
    operatorNotes: null,
  },
  {
    code: "invalid_api_key",
    category: "auth",
    httpStatus: 401,
    publicMessage: "The API key is invalid or inactive.",
    retryable: false,
    active: true,
    sortOrder: 30,
    operatorNotes: null,
  },
  {
    code: "insufficient_balance",
    category: "billing",
    httpStatus: 402,
    publicMessage: "Your wallet balance is insufficient. Please top up and try again.",
    retryable: false,
    active: true,
    sortOrder: 40,
    operatorNotes: null,
  },
  {
    code: "model_not_available",
    category: "routing",
    httpStatus: 404,
    publicMessage: "The requested model is currently unavailable.",
    retryable: false,
    active: true,
    sortOrder: 50,
    operatorNotes: null,
  },
  {
    code: "task_not_found",
    category: "task",
    httpStatus: 404,
    publicMessage: "The requested task could not be found.",
    retryable: false,
    active: true,
    sortOrder: 60,
    operatorNotes: null,
  },
  {
    code: "file_not_found",
    category: "asset",
    httpStatus: 404,
    publicMessage: "The requested generated file is not available.",
    retryable: false,
    active: true,
    sortOrder: 70,
    operatorNotes: null,
  },
  {
    code: "provider_offline",
    category: "upstream",
    httpStatus: 503,
    publicMessage: "The selected model is temporarily unavailable. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 80,
    operatorNotes: null,
  },
  {
    code: "provider_model_inactive",
    category: "routing",
    httpStatus: 503,
    publicMessage: "The selected model is temporarily unavailable. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 90,
    operatorNotes: null,
  },
  {
    code: "provider_credential_missing",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 100,
    operatorNotes: null,
  },
  {
    code: "provider_credential_incomplete",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 110,
    operatorNotes: null,
  },
  {
    code: "provider_credential_unusable",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 120,
    operatorNotes: null,
  },
  {
    code: "provider_credential_legacy",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 130,
    operatorNotes: null,
  },
  {
    code: "provider_credential_unavailable",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 140,
    operatorNotes: null,
  },
  {
    code: "provider_credential_decrypt_failed",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable for this model. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 150,
    operatorNotes: null,
  },
  {
    code: "model_billing_not_configured",
    category: "system",
    httpStatus: 503,
    publicMessage: "The selected model is temporarily unavailable. Please retry later.",
    retryable: false,
    active: true,
    sortOrder: 160,
    operatorNotes: null,
  },
  {
    code: "provider_pricing_not_configured",
    category: "system",
    httpStatus: 503,
    publicMessage: "The selected model is temporarily unavailable. Please retry later.",
    retryable: false,
    active: true,
    sortOrder: 170,
    operatorNotes: null,
  },
  {
    code: "database_operation_failed",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service could not access required internal records. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 175,
    operatorNotes: null,
  },
  {
    code: "billing_resolution_failed",
    category: "system",
    httpStatus: 503,
    publicMessage: "The selected model pricing could not be evaluated. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 176,
    operatorNotes: null,
  },
  {
    code: "request_record_write_failed",
    category: "system",
    httpStatus: 503,
    publicMessage: "The request could not be recorded internally. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 177,
    operatorNotes: null,
  },
  {
    code: "api_key_touch_failed",
    category: "system",
    httpStatus: 503,
    publicMessage: "The request was accepted but internal key tracking failed. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 178,
    operatorNotes: null,
  },
  {
    code: "queue_unavailable",
    category: "system",
    httpStatus: 503,
    publicMessage: "The internal job queue is temporarily unavailable. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 179,
    operatorNotes: null,
  },
  {
    code: "provider_submit_failed",
    category: "upstream",
    httpStatus: 502,
    publicMessage: "The generation provider could not accept the request. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 180,
    operatorNotes: null,
  },
  {
    code: "provider_poll_failed",
    category: "upstream",
    httpStatus: 502,
    publicMessage: "The generation provider could not complete the request. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 190,
    operatorNotes: null,
  },
  {
    code: "upstream_failed",
    category: "upstream",
    httpStatus: 502,
    publicMessage: "The generation provider failed to complete the request. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 200,
    operatorNotes: null,
  },
  {
    code: "content_policy_violation",
    category: "safety",
    httpStatus: 400,
    publicMessage: "The prompt or image was rejected by the provider safety policy. Please adjust the content and try again.",
    retryable: false,
    active: true,
    sortOrder: 205,
    operatorNotes: null,
  },
  {
    code: "upstream_timeout",
    category: "upstream",
    httpStatus: 504,
    publicMessage: "The generation request timed out. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 210,
    operatorNotes: null,
  },
  {
    code: "upstream_result_missing",
    category: "upstream",
    httpStatus: 502,
    publicMessage: "The generation provider returned an incomplete result. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 220,
    operatorNotes: null,
  },
  {
    code: "video_output_missing",
    category: "upstream",
    httpStatus: 502,
    publicMessage: "The generation provider returned an incomplete result. Please retry shortly.",
    retryable: true,
    active: true,
    sortOrder: 230,
    operatorNotes: null,
  },
  {
    code: "service_unavailable",
    category: "system",
    httpStatus: 503,
    publicMessage: "The service is temporarily unavailable. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 240,
    operatorNotes: null,
  },
  {
    code: "internal_error",
    category: "system",
    httpStatus: 500,
    publicMessage: "The service encountered an unexpected error. Please retry later.",
    retryable: true,
    active: true,
    sortOrder: 250,
    operatorNotes: null,
  },
];

let cache: {
  expiresAt: number;
  byCode: Map<string, GatewayErrorDefinition>;
} | null = null;

function buildDefaultMap() {
  return new Map(
    DEFAULT_GATEWAY_ERROR_DEFINITIONS.map((definition) => [definition.code, definition] as const)
  );
}

function normalizeCode(value: string | null | undefined) {
  if (typeof value !== "string") {
    return "internal_error";
  }
  const trimmed = value.trim().toLowerCase();
  return /^[a-z0-9_]+$/.test(trimmed) ? trimmed : "internal_error";
}

async function loadDefinitions() {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.byCode;
  }

  const byCode = buildDefaultMap();

  try {
    const { data, error } = await supabaseAdmin
      .from("gateway_error_definitions")
      .select("code, category, http_status, public_message, retryable, active, sort_order, operator_notes")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("code", { ascending: true });

    if (!error) {
      for (const row of data ?? []) {
        const code = normalizeCode(row.code);
        byCode.set(code, {
          code,
          category: row.category ?? "system",
          httpStatus: Number(row.http_status ?? 500),
          publicMessage: row.public_message ?? "The service encountered an unexpected error. Please retry later.",
          retryable: row.retryable === true,
          active: row.active === true,
          sortOrder: Number(row.sort_order ?? 100),
          operatorNotes: typeof row.operator_notes === "string" ? row.operator_notes : null,
        });
      }
    }
  } catch {
    // Fall back to the in-code defaults when the table is unavailable.
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
    error: {
      code: definition.code,
      message: definition.publicMessage,
      retryable: definition.retryable,
    },
  };
}

export async function sendGatewayError(
  reply: { code: (statusCode: number) => { send: (body: unknown) => unknown } },
  input: {
    code?: string | null;
    statusCode?: number | null;
  }
) {
  const response = await buildGatewayErrorResponse(input);
  return reply.code(response.statusCode).send({
    error: response.error,
  });
}

export function isGatewayValidationError(error: unknown) {
  return error instanceof ZodError;
}
