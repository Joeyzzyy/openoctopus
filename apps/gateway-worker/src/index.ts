import Fastify from "fastify";
import { env } from "./config.js";
import {
  processNextInferenceJob,
  processNextPollingJob,
  queueRpcAvailable,
} from "./queue/runner.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerTaskRoutes } from "./routes/tasks.js";

const app = Fastify({
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      env.NODE_ENV === "production"
        ? undefined
        : {
            target: "pino-pretty",
          },
  },
});

await registerHealthRoute(app);
await registerTaskRoutes(app);

const queueEnabled = await queueRpcAvailable();

if (queueEnabled) {
  const poller = setInterval(async () => {
    try {
      await processNextInferenceJob();
    } catch (error) {
      app.log.error(error);
    }
  }, 2000);

  poller.unref();

  const statusPoller = setInterval(async () => {
    try {
      await processNextPollingJob();
    } catch (error) {
      app.log.error(error);
    }
  }, 4000);

  statusPoller.unref();
} else {
  app.log.warn(
    "Supabase queue RPC wrappers are unavailable. Run supabase/queue_rpc_wrappers.sql to enable the worker loop."
  );
}

await app.listen({
  port: env.PORT,
  host: "0.0.0.0",
});

app.log.info(`gateway-worker listening on :${env.PORT}`);
