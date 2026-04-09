import type { FastifyInstance } from "fastify";

export async function registerHealthRoute(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      ok: true,
      service: "openoctopus-gateway-worker",
      timestamp: new Date().toISOString(),
    };
  });
}
