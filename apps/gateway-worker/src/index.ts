import Fastify from "fastify";
import { env } from "./config.js";
import { isGatewayValidationError, sendGatewayError } from "./lib/gateway-errors.js";
import {
  processNextInferenceJob,
  processNextPollingJob,
  queueRpcAvailable,
  recoverStuckQueuedRequests,
  recoverStuckPollingRequests,
} from "./queue/runner.js";
import { registerHealthRoute } from "./routes/health.js";
import { registerFileRoutes } from "./routes/files.js";
import { registerManifestRoutes } from "./routes/manifest.js";
import { registerTaskRoutes } from "./routes/tasks.js";
import { registerUploadRoutes } from "./routes/uploads.js";

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

app.setErrorHandler(async (error, request, reply) => {
  request.log.error(error);

  if (isGatewayValidationError(error)) {
    return sendGatewayError(reply, {
      code: "invalid_request",
      statusCode: 400,
    });
  }

  return sendGatewayError(reply, {
    code: "internal_error",
    statusCode: 500,
  });
});

await registerHealthRoute(app);
await registerFileRoutes(app);
await registerManifestRoutes(app);
await registerUploadRoutes(app);
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

  const recoveryPoller = setInterval(async () => {
    try {
      const queuedRecovered = await recoverStuckQueuedRequests();
      if (queuedRecovered > 0) {
        app.log.warn({ recovered: queuedRecovered }, "Recovered stuck queued requests");
      }
      const recovered = await recoverStuckPollingRequests();
      if (recovered > 0) {
        app.log.warn({ recovered }, "Recovered stuck polling requests");
      }
    } catch (error) {
      app.log.error(error);
    }
  }, 15000);

  recoveryPoller.unref();
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
