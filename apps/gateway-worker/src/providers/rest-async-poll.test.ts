import http from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import { RestAsyncPollAdapter } from "./rest-async-poll.js";

type CapturedRequest = {
  method: string | undefined;
  url: string | undefined;
  headers: http.IncomingHttpHeaders;
  body: unknown;
};

function readRequestBody(request: http.IncomingMessage) {
  return new Promise<unknown>((resolve, reject) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    request.on("error", reject);
    request.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      resolve(text.length > 0 ? JSON.parse(text) : null);
    });
  });
}

async function withJsonServer<T>(
  handler: (
    request: http.IncomingMessage,
    response: http.ServerResponse,
    body: unknown
  ) => void | Promise<void>,
  run: (baseUrl: string, captured: CapturedRequest[]) => Promise<T>
) {
  const captured: CapturedRequest[] = [];
  const server = http.createServer(async (request, response) => {
    try {
      const body = await readRequestBody(request);
      captured.push({
        method: request.method,
        url: request.url,
        headers: request.headers,
        body,
      });
      await handler(request, response, body);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: String(error) }));
    }
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address === "object");

  try {
    return await run(`http://127.0.0.1:${address.port}`, captured);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test("poll fetches resultPath when completed status has no asset", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (request, response) => {
      if (request.url === "/api/v3/predictions/pred-123") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ id: "pred-123", status: "completed" }));
        return;
      }
      if (request.url === "/api/v3/predictions/pred-123/result") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(
          JSON.stringify({
            id: "pred-123",
            outputs: ["https://cdn.example.com/images/pred-123.png"],
          })
        );
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
    },
    async (baseUrl, captured) => {
      const result = await adapter.poll({
        requestId: "00000000-0000-4000-8000-000000000001",
        upstreamTaskId: "pred-123",
        provider: {
          slug: "wavespeed",
          baseUrl,
          secret: "ws-key",
          config: {
            executionConfig: {
              mode: "async",
              authType: "bearer",
              authHeaderName: "Authorization",
              authHeaderPrefix: "Bearer",
              pollPath: "/api/v3/predictions/{taskId}",
              resultPath: "/api/v3/predictions/{taskId}/result",
              statusPath: "status",
              resultUrlPath: "outputs.0",
            },
          },
        },
      });

      assert.equal(result.done, true);
      assert.equal(result.success, true);
      assert.deepEqual(result.output.assets, [
        { url: "https://cdn.example.com/images/pred-123.png", type: "image" },
      ]);
      assert.equal(captured[0]?.method, "GET");
      assert.equal(captured[0]?.url, "/api/v3/predictions/pred-123");
      assert.equal(captured[1]?.method, "GET");
      assert.equal(captured[1]?.url, "/api/v3/predictions/pred-123/result");
      assert.equal(captured[0]?.headers.authorization, "Bearer ws-key");
      assert.equal(captured[1]?.headers.authorization, "Bearer ws-key");
    }
  );
});
