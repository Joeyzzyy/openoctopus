import http from "node:http";
import assert from "node:assert/strict";
import test from "node:test";
import { GeminiDirectImageAdapter } from "./gemini-direct-image.js";

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

function adapterInput(baseUrl: string) {
  return {
    requestId: "request-1",
    publicModelSlug: "gemini-public",
    upstreamModelSlug: "veo-3.0-generate-preview",
    provider: {
      slug: "gemini-direct",
      baseUrl,
      config: null,
      secret: "test-api-key",
    },
  };
}

test("submits Veo video requests with predictLongRunning", async () => {
  const adapter = new GeminiDirectImageAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ name: "models/veo-3.0-generate-preview/operations/op-1" }));
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        ...adapterInput(baseUrl),
        capability: "video_generation",
        prompt: "A quiet octopus reading in a library",
        input: {
          durationSeconds: 8,
          aspectRatio: "16:9",
          image: {
            bytesBase64Encoded: "abc123",
            mimeType: "image/png",
          },
        },
      });

      assert.equal(result.mode, "async");
      assert.equal(result.upstreamTaskId, "models/veo-3.0-generate-preview/operations/op-1");
      assert.equal(captured[0]?.method, "POST");
      assert.equal(
        captured[0]?.url,
        "/v1beta/models/veo-3.0-generate-preview:predictLongRunning"
      );
      assert.equal(captured[0]?.headers["x-goog-api-key"], "test-api-key");
      assert.deepEqual(captured[0]?.body, {
        instances: [
          {
            prompt: "A quiet octopus reading in a library",
            image: {
              bytesBase64Encoded: "abc123",
              mimeType: "image/png",
            },
          },
        ],
        parameters: {
          durationSeconds: 8,
          aspectRatio: "16:9",
        },
      });
    }
  );
});

test("polls Veo operations and extracts generated video uri", async () => {
  const adapter = new GeminiDirectImageAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          done: true,
          response: {
            generateVideoResponse: {
              generatedSamples: [
                {
                  video: {
                    uri: "https://generativelanguage.googleapis.com/v1beta/files/video-1:download",
                  },
                },
              ],
              generationParameters: {
                durationSeconds: 8,
              },
            },
          },
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.poll({
        upstreamTaskId: "models/veo-3.0-generate-preview/operations/op-1",
        provider: {
          slug: "gemini-direct",
          baseUrl,
          config: null,
          secret: "test-api-key",
        },
      });

      assert.equal(result.done, true);
      assert.equal(result.success, true);
      assert.deepEqual(result.output.assets, [
        {
          url: "https://generativelanguage.googleapis.com/v1beta/files/video-1:download",
          type: "video",
          durationSeconds: 8,
        },
      ]);
      assert.equal(result.output.durationSeconds, 8);
      assert.equal(captured[0]?.method, "GET");
      assert.equal(captured[0]?.url, "/v1beta/models/veo-3.0-generate-preview/operations/op-1");
      assert.equal(captured[0]?.headers["x-goog-api-key"], "test-api-key");
    }
  );
});

test("reports pending Veo operations as not done", async () => {
  const adapter = new GeminiDirectImageAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ done: false }));
    },
    async (baseUrl) => {
      const result = await adapter.poll({
        upstreamTaskId: "models/veo-3.0-generate-preview/operations/op-1",
        provider: {
          slug: "gemini-direct",
          baseUrl,
          config: null,
          secret: "test-api-key",
        },
      });

      assert.deepEqual(result, {
        done: false,
        pollAfterSeconds: 10,
        raw: { done: false },
      });
    }
  );
});

test("surfaces Veo operation errors from poll responses", async () => {
  const adapter = new GeminiDirectImageAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          done: true,
          error: {
            status: "FAILED_PRECONDITION",
            message: "Prompt was rejected",
          },
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.poll({
        upstreamTaskId: "/models/veo-3.0-generate-preview/operations/op-1",
        provider: {
          slug: "gemini-direct",
          baseUrl,
          config: null,
          secret: "test-api-key",
        },
      });

      assert.equal(result.done, true);
      assert.equal(result.success, false);
      assert.equal(result.errorCode, "FAILED_PRECONDITION");
      assert.equal(result.errorMessage, "Prompt was rejected");
      assert.equal(captured[0]?.url, "/v1beta/models/veo-3.0-generate-preview/operations/op-1");
    }
  );
});

test("keeps Gemini image generation path synchronous", async () => {
  const adapter = new GeminiDirectImageAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          responseId: "image-response-1",
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "aW1hZ2U=",
                    },
                  },
                ],
              },
            },
          ],
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        ...adapterInput(baseUrl),
        capability: "image_generation",
        upstreamModelSlug: "gemini-2.5-flash-image",
        prompt: "Draw a blue octopus",
        input: {},
      });

      assert.equal(result.mode, "sync");
      assert.equal(result.upstreamRequestId, "image-response-1");
      assert.deepEqual(result.output.assets, [
        {
          url: "data:image/png;base64,aW1hZ2U=",
          type: "image",
        },
      ]);
      assert.equal(
        captured[0]?.url,
        "/v1beta/models/gemini-2.5-flash-image:generateContent?key=test-api-key"
      );
    }
  );
});
