import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { supabaseAdmin } from "../lib/supabase.js";
import { enqueueInferenceJob } from "../queue/runner.js";
import { createQueuedRequest } from "../services/request-service.js";

const imageRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

const videoRequestSchema = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1).optional(),
  input: z.record(z.string(), z.unknown()).default({}),
});

export async function registerTaskRoutes(app: FastifyInstance) {
  app.get("/v1/models", async () => {
    const { data, error } = await supabaseAdmin
      .from("provider_models")
      .select("id, public_model_slug, upstream_model_slug, capability, active, provider_id, providers(name, slug)")
      .eq("active", true)
      .order("public_model_slug", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const grouped = new Map<
      string,
      {
        id: string;
        model: string;
        capability: string;
        routes: Array<{ provider: string; providerSlug: string; upstreamModel: string }>;
      }
    >();

    for (const row of data ?? []) {
      const key = row.public_model_slug;
      const provider = Array.isArray(row.providers) ? row.providers[0] : row.providers;

      if (!grouped.has(key)) {
        grouped.set(key, {
          id: row.id,
          model: row.public_model_slug,
          capability: row.capability,
          routes: [],
        });
      }

      grouped.get(key)?.routes.push({
        provider: provider?.name ?? "Unknown provider",
        providerSlug: provider?.slug ?? "unknown",
        upstreamModel: row.upstream_model_slug,
      });
    }

    return {
      data: Array.from(grouped.values()),
    };
  });

  app.post("/v1/images/generations", async (request, reply) => {
    const parsed = imageRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";

    const queued = await createQueuedRequest({
      apiKey,
      endpoint: "/v1/images/generations",
      capability: "image_generation",
      model: parsed.model,
      prompt: parsed.prompt,
      input: parsed.input,
    });

    await enqueueInferenceJob({
      requestId: queued.requestId,
      workspaceId: queued.workspaceId,
      apiKeyId: queued.apiKeyId,
      providerSlug: queued.providerSlug,
      capability: "image_generation",
      model: parsed.model,
      endpoint: queued.endpoint,
      prompt: parsed.prompt,
      input: parsed.input,
    });

    return reply.code(202).send({
      id: queued.requestId,
      status: "queued",
    });
  });

  app.post("/v1/videos/generations", async (request, reply) => {
    const parsed = videoRequestSchema.parse(request.body);
    const authHeader = request.headers.authorization;
    const apiKey = authHeader?.replace(/^Bearer\s+/i, "") ?? "";

    const queued = await createQueuedRequest({
      apiKey,
      endpoint: "/v1/videos/generations",
      capability: "video_generation",
      model: parsed.model,
      prompt: parsed.prompt,
      input: parsed.input,
    });

    await enqueueInferenceJob({
      requestId: queued.requestId,
      workspaceId: queued.workspaceId,
      apiKeyId: queued.apiKeyId,
      providerSlug: queued.providerSlug,
      capability: "video_generation",
      model: parsed.model,
      endpoint: queued.endpoint,
      prompt: parsed.prompt,
      input: parsed.input,
    });

    return reply.code(202).send({
      id: queued.requestId,
      status: "queued",
    });
  });

  app.get("/v1/tasks/:id", async (request) => {
    const params = z.object({ id: z.string().uuid() }).parse(request.params);
    const { data, error } = await supabaseAdmin
      .from("inference_requests")
      .select("id, status, capability, public_model_slug, output_payload, error_code, error_message, created_at, completed_at")
      .eq("id", params.id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return {
        id: params.id,
        status: "not_found",
      };
    }

    return data;
  });
}
