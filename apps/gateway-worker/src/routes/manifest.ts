import type { FastifyInstance } from "fastify";
import { supabaseAdmin } from "../lib/supabase.js";

function endpointForCapability(capability: string) {
  if (capability === "image_edit") return "/v1/images/edits";
  if (capability === "image_recognition") return "/v1/images/recognitions";
  if (capability === "video_generation") return "/v1/videos/generations";
  return "/v1/images/generations";
}

function outputTypeForCapability(capability: string) {
  if (capability === "image_recognition") return "text";
  if (capability === "video_generation") return "video";
  return "image";
}

function cliFlagForParam(name: string) {
  return name.trim().replace(/_/g, "-");
}

function normalizeInputSchema(inputSchema: unknown) {
  if (!inputSchema || typeof inputSchema !== "object" || Array.isArray(inputSchema)) {
    return { params: [] };
  }
  const record = inputSchema as Record<string, unknown>;
  const params = Array.isArray(record.params) ? record.params : [];
  return {
    params: params
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object" && !Array.isArray(item))
      .map((item) => {
        const name = typeof item.name === "string" ? item.name : "";
        const type = typeof item.type === "string" ? item.type : "string";
        const normalizedName = name.trim();
        const isFileLike =
          normalizedName === "image" ||
          normalizedName === "images" ||
          normalizedName === "video" ||
          normalizedName === "videos" ||
          normalizedName === "audio" ||
          normalizedName === "audios" ||
          normalizedName.endsWith("_image") ||
          normalizedName.endsWith("_images") ||
          normalizedName.endsWith("_video") ||
          normalizedName.endsWith("_videos") ||
          normalizedName.endsWith("_audio") ||
          normalizedName.endsWith("_audios") ||
          normalizedName.endsWith("_file") ||
          normalizedName.endsWith("_files");
        return {
          name: normalizedName,
          cliFlag: cliFlagForParam(normalizedName),
          type,
          required: item.required === true,
          description: typeof item.description === "string" ? item.description : "",
          ...(Array.isArray(item.enum) ? { enum: item.enum.filter((value) => typeof value === "string") } : {}),
          ...(typeof item.minimum === "number" ? { minimum: item.minimum } : {}),
          ...(typeof item.maximum === "number" ? { maximum: item.maximum } : {}),
          ...(typeof item.step === "number" ? { step: item.step } : {}),
          ...(typeof item.maxItems === "number" ? { maxItems: item.maxItems } : {}),
          ...(isFileLike ? { format: "file_url_or_file" } : {}),
        };
      })
      .filter((item) => item.name.length > 0),
  };
}

function requestModeForConfig(executionConfig: unknown) {
  if (!executionConfig || typeof executionConfig !== "object" || Array.isArray(executionConfig)) {
    return "async_polling";
  }
  const config = executionConfig as Record<string, unknown>;
  const mode = typeof config.mode === "string" ? config.mode : "";
  if (mode === "sync" || mode === "sync-json-v1") return "sync";
  return "async_polling";
}

export async function registerManifestRoutes(app: FastifyInstance) {
  app.get("/v1/model-manifest", async () => {
    const [{ data: supportedRows, error: supportedError }, { data: providerRows, error: providerError }, { data: routeRows, error: routeError }] = await Promise.all([
      supabaseAdmin
        .from("supported_models")
        .select("id, provider, model_slug, display_name, capability, billing_config, active, created_at")
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("provider_models")
        .select("id, supported_model_id, public_model_slug, upstream_model_slug, capability, input_schema, output_schema, execution_config, active")
        .eq("active", true)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("routing_rules")
        .select("public_model_slug, capability, primary_provider_model_id, active")
        .eq("active", true),
    ]);

    if (supportedError) throw new Error(supportedError.message);
    if (providerError) throw new Error(providerError.message);
    if (routeError) throw new Error(routeError.message);

    const providerById = new Map((providerRows ?? []).map((row) => [row.id, row]));
    const routedProviderIds = new Set((routeRows ?? []).map((row) => row.primary_provider_model_id));

    const models = (supportedRows ?? []).flatMap((supported) => {
      const route = (routeRows ?? []).find(
        (row) =>
          row.public_model_slug === supported.model_slug &&
          row.capability === supported.capability
      );
      const provider =
        (route?.primary_provider_model_id ? providerById.get(route.primary_provider_model_id) : null) ??
        (providerRows ?? []).find(
          (row) =>
            row.supported_model_id === supported.id &&
            row.capability === supported.capability &&
            routedProviderIds.has(row.id)
        ) ??
        null;
      if (!provider) return [];

      const capability = provider.capability ?? supported.capability ?? "image_generation";
      const executionConfig =
        provider.execution_config && typeof provider.execution_config === "object"
          ? (provider.execution_config as Record<string, unknown>)
          : {};
      const doc = executionConfig.doc && typeof executionConfig.doc === "object" && !Array.isArray(executionConfig.doc)
        ? executionConfig.doc as Record<string, unknown>
        : {};
      const model = {
        model: supported.model_slug,
        displayName: supported.display_name,
        provider: supported.provider,
        capability,
        endpoint: endpointForCapability(capability),
        requestMode: requestModeForConfig(executionConfig),
        inputSchema: normalizeInputSchema(provider.input_schema),
        outputSchema: provider.output_schema ?? {},
        output: { type: outputTypeForCapability(capability) },
        pricing: supported.billing_config ?? {},
        examples:
          typeof doc.requestExampleJson === "string"
            ? [{ title: "Request example", request: doc.requestExampleJson }]
            : [],
      };
      return [model];
    });

    return {
      version: new Date().toISOString(),
      models,
    };
  });

  app.get("/v1/models/*", async (request, reply) => {
    const params = request.params as Record<string, string | undefined>;
    const modelSlug = decodeURIComponent(params["*"] ?? "").trim();
    const manifest = await app.inject({ method: "GET", url: "/v1/model-manifest" });
    const payload = JSON.parse(manifest.body) as { models?: Array<{ model?: string }> };
    const model = (payload.models ?? []).find((item) => item.model === modelSlug);
    if (!model) {
      return reply.code(404).send({ error: { code: "model_not_available", message: "The requested model is currently unavailable.", retryable: false } });
    }
    return model;
  });
}
