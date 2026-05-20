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

test("poll classifies Wavespeed sensitive-content failures", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          code: 200,
          data: {
            id: "bc6c2345fa9f4b76bc956a7fbf933cc5",
            code: 1200,
            error: "Content flagged as potentially sensitive. Please try different prompts or images.",
            status: "failed",
            outputs: [],
          },
          message: "success",
        })
      );
    },
    async (baseUrl) => {
      const result = await adapter.poll({
        requestId: "00000000-0000-4000-8000-000000000002",
        upstreamTaskId: "bc6c2345fa9f4b76bc956a7fbf933cc5",
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
              pollPath: "/api/v3/predictions/{taskId}/result",
              statusPath: "data.status",
              resultUrlPath: "data.outputs.0",
            },
          },
        },
      });

      assert.equal(result.done, true);
      assert.equal(result.success, false);
      assert.equal(result.errorCode, "content_policy_violation");
      assert.equal(
        result.errorMessage,
        "Content flagged as potentially sensitive. Please try different prompts or images."
      );
    }
  );
});

test("submit preserves array values for exact mustache template placeholders", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "chatcmpl-123",
          choices: [
            {
              message: {
                content: "hello back",
              },
            },
          ],
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        requestId: "00000000-0000-4000-8000-000000000003",
        capability: "text_generation",
        publicModelSlug: "openoctopus/deepseek-v4-pro",
        upstreamModelSlug: "deepseek-v4-pro",
        input: {
          messages: [{ role: "user", content: "123" }],
        },
        provider: {
          slug: "rest-async-poll-v1",
          baseUrl,
          secret: "ds-key",
          config: {
            executionConfig: {
              mode: "sync",
              authType: "bearer",
              authHeaderName: "Authorization",
              authHeaderPrefix: "Bearer",
              submitPath: "/chat/completions",
              taskIdPath: "id",
              resultTextPath: "choices.0.message.content",
              submitBodyTemplate: {
                model: "{{upstreamModel}}",
                messages: "{{messages}}",
                stream: false,
              },
            },
          },
        },
      });

      assert.equal(result.mode, "sync");
      assert.deepEqual(captured[0]?.body, {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "123" }],
        stream: false,
      });
    }
  );
});

test("submit omits optional exact mustache placeholders when values are missing", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          id: "chatcmpl-456",
          choices: [
            {
              message: {
                content: "hello again",
              },
            },
          ],
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        requestId: "00000000-0000-4000-8000-000000000004",
        capability: "text_generation",
        publicModelSlug: "openoctopus/deepseek-v4-pro",
        upstreamModelSlug: "deepseek-v4-pro",
        input: {
          messages: [{ role: "user", content: "follow-up" }],
        },
        provider: {
          slug: "rest-async-poll-v1",
          baseUrl,
          secret: "ds-key",
          config: {
            executionConfig: {
              mode: "sync",
              authType: "bearer",
              authHeaderName: "Authorization",
              authHeaderPrefix: "Bearer",
              submitPath: "/chat/completions",
              taskIdPath: "id",
              resultTextPath: "choices.0.message.content",
              submitBodyTemplate: {
                model: "{{upstreamModel}}",
                messages: "{{messages}}",
                max_tokens: "{{max_tokens}}",
                temperature: "{{temperature}}",
                stream: false,
              },
            },
          },
        },
      });

      assert.equal(result.mode, "sync");
      assert.deepEqual(captured[0]?.body, {
        model: "deepseek-v4-pro",
        messages: [{ role: "user", content: "follow-up" }],
        stream: false,
      });
    }
  );
});

test("submit compiles OpenAI-style chat messages into Gemini generateContent payload", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Gemini says hi" }],
              },
            },
          ],
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        requestId: "00000000-0000-4000-8000-000000000005",
        capability: "text_generation",
        publicModelSlug: "openoctopus/google/gemini-2.5-flash",
        upstreamModelSlug: "gemini-2.5-flash",
        input: {
          messages: [
            { role: "system", content: "You are concise." },
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there" },
            { role: "user", content: "How does AI work?" },
          ],
          temperature: "0.8",
          max_tokens: "512",
        },
        provider: {
          slug: "rest-async-poll-v1",
          baseUrl,
          secret: "gemini-key",
          config: {
            executionConfig: {
              mode: "sync",
              authType: "header",
              authHeaderName: "x-goog-api-key",
              authHeaderPrefix: "",
              submitPath: "/v1beta/models/{upstreamModel}:generateContent",
              resultTextPath: "candidates.0.content.parts.0.text",
              messageFormat: "gemini-generate-content",
            },
          },
        },
      });

      assert.equal(result.mode, "sync");
      assert.deepEqual(captured[0]?.body, {
        model: "gemini-2.5-flash",
        system_instruction: {
          parts: [{ text: "You are concise." }],
        },
        contents: [
          { role: "user", parts: [{ text: "Hello" }] },
          { role: "model", parts: [{ text: "Hi there" }] },
          { role: "user", parts: [{ text: "How does AI work?" }] },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 512,
        },
      });
      assert.equal(captured[0]?.headers["x-goog-api-key"], "gemini-key");
    }
  );
});

test("submit exposes Gemini compiled contents and system_instruction to submitBodyTemplate", async () => {
  const adapter = new RestAsyncPollAdapter();

  await withJsonServer(
    (_request, response) => {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: "Templated Gemini reply" }],
              },
            },
          ],
        })
      );
    },
    async (baseUrl, captured) => {
      const result = await adapter.submit({
        requestId: "00000000-0000-4000-8000-000000000006",
        capability: "text_generation",
        publicModelSlug: "openoctopus/google/gemini-2.5-pro",
        upstreamModelSlug: "gemini-2.5-pro",
        input: {
          messages: [
            { role: "system", content: "Act like a tutor." },
            { role: "user", content: "Explain transformers." },
          ],
        },
        provider: {
          slug: "rest-async-poll-v1",
          baseUrl,
          secret: "gemini-key",
          config: {
            executionConfig: {
              mode: "sync",
              authType: "header",
              authHeaderName: "x-goog-api-key",
              authHeaderPrefix: "",
              submitPath: "/v1beta/models/{upstreamModel}:generateContent",
              resultTextPath: "candidates.0.content.parts.0.text",
              messageFormat: "gemini-generate-content",
              submitBodyTemplate: {
                contents: "{{contents}}",
                system_instruction: "{{system_instruction}}",
              },
            },
          },
        },
      });

      assert.equal(result.mode, "sync");
      assert.deepEqual(captured[0]?.body, {
        contents: [{ role: "user", parts: [{ text: "Explain transformers." }] }],
        system_instruction: {
          parts: [{ text: "Act like a tutor." }],
        },
      });
    }
  );
});
