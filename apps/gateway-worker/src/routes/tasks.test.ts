import assert from "node:assert/strict";
import test from "node:test";
import {
  chatRequestSchema,
  codingChatRequestSchema,
  consumeOpenAiChatSseBuffer,
  ensureOpenAiChatStreamOptions,
  imageRequestSchema,
  videoRequestSchema,
} from "./tasks.js";

test("image request schema allows omitted reference assets", () => {
  const parsed = imageRequestSchema.parse({
    model: "openoctopus/test-image",
    prompt: "draw an octopus",
    input: {},
  });

  assert.deepEqual(parsed.input, {});
});

test("video request schema allows omitted reference assets", () => {
  const parsed = videoRequestSchema.parse({
    model: "openoctopus/test-video",
    prompt: "make an octopus swim",
    input: {
      duration: 5,
      resolution: "720p",
    },
  });

  assert.equal(parsed.model, "openoctopus/test-video");
  assert.deepEqual(parsed.input, {
    duration: 5,
    resolution: "720p",
  });
});

test("video request schema accepts valid reference asset URLs", () => {
  const parsed = videoRequestSchema.parse({
    model: "openoctopus/test-video",
    prompt: "make an octopus swim",
    input: {
      reference_images: ["https://example.com/reference.png"],
      reference_videos: ["https://example.com/reference.mp4"],
      reference_audios: ["https://example.com/reference.mp3"],
    },
  });

  assert.equal((parsed.input.reference_videos as string[]).length, 1);
  assert.equal((parsed.input.reference_audios as string[]).length, 1);
});

test("video request schema rejects invalid reference video URLs only when provided", () => {
  assert.throws(
    () =>
      videoRequestSchema.parse({
        model: "openoctopus/test-video",
        prompt: "make an octopus swim",
        input: {
          reference_videos: ["not-a-url"],
        },
      }),
    /reference_videos must be a usable HTTP\(S\) asset URL/
  );
});

test("image request schema rejects invalid reference audio URLs only when provided", () => {
  assert.throws(
    () =>
      imageRequestSchema.parse({
        model: "openoctopus/test-image",
        prompt: "draw an octopus",
        input: {
          reference_audios: ["file:///tmp/local.mp3"],
        },
      }),
    /reference_audios must be a usable HTTP\(S\) asset URL/
  );
});

test("chat request schema accepts messages without prompt", () => {
  const parsed = chatRequestSchema.parse({
    model: "openoctopus/test-chat",
    messages: [
      {
        role: "user",
        content: "Summarize this API in one sentence.",
      },
    ],
    input: {},
  });

  assert.equal(parsed.model, "openoctopus/test-chat");
  assert.equal(parsed.messages?.length, 1);
});

test("chat request schema accepts messages nested under input for cli/playground compatibility", () => {
  const parsed = chatRequestSchema.parse({
    model: "openoctopus/test-chat",
    input: {
      messages: [
        {
          role: "user",
          content: "Explain polling in one sentence.",
        },
      ],
    },
  });

  assert.equal(Array.isArray(parsed.input.messages), true);
});

test("chat request schema coerces top-level plain string messages into a single user message", () => {
  const parsed = chatRequestSchema.parse({
    model: "openoctopus/test-chat",
    messages: "123" as unknown as Array<{ role: string; content: string }>,
    input: {},
  });

  const messages = parsed.messages as Array<{ role: string; content: string }>;
  assert.equal(messages.length, 1);
  assert.equal(messages[0]?.role, "user");
  assert.equal(messages[0]?.content, "123");
});

test("chat request schema requires prompt or messages", () => {
  assert.throws(
    () =>
      chatRequestSchema.parse({
        model: "openoctopus/test-chat",
        input: {},
      }),
    /prompt or messages is required/
  );
});

test("coding chat request schema preserves extra top-level OpenAI-compatible fields", () => {
  const parsed = codingChatRequestSchema.parse({
    model: "openoctopus/deepcode-test",
    messages: [
      {
        role: "user",
        content: "hello",
      },
    ],
    stream: true,
    tools: [{ type: "function", function: { name: "bash" } }],
    extra_body: { reasoning_effort: "max" },
  }) as Record<string, unknown>;

  assert.equal(parsed.model, "openoctopus/deepcode-test");
  assert.equal(parsed.stream, true);
  assert.equal(Array.isArray(parsed.tools), true);
  assert.deepEqual(parsed.extra_body, { reasoning_effort: "max" });
});

test("coding chat request schema preserves tool message compatibility fields", () => {
  const parsed = codingChatRequestSchema.parse({
    model: "openoctopus/deepcode-test",
    messages: [
      {
        role: "assistant",
        content: "",
        toolCalls: [
          {
            id: "call_123",
            type: "function",
            function: {
              name: "bash",
              arguments: "{\"cmd\":\"ls\"}",
            },
          },
        ],
      },
      {
        role: "tool",
        content: "ok",
        toolCallId: "call_123",
      },
    ],
  }) as {
    messages: Array<Record<string, unknown>>;
  };

  assert.deepEqual(parsed.messages[0]?.toolCalls, [
    {
      id: "call_123",
      type: "function",
      function: {
        name: "bash",
        arguments: "{\"cmd\":\"ls\"}",
      },
    },
  ]);
  assert.equal(parsed.messages[1]?.toolCallId, "call_123");
});

test("coding chat passthrough forces stream usage metadata", () => {
  const normalized = ensureOpenAiChatStreamOptions({
    model: "deepseek-v4-pro",
    stream: true,
    stream_options: {
      foo: "bar",
    },
  });

  assert.deepEqual(normalized.stream_options, {
    foo: "bar",
    include_usage: true,
  });
});

test("coding chat stream parser aggregates assistant text and usage from SSE chunks", () => {
  const summary = {
    upstreamRequestId: null,
    model: null,
    text: "",
    reasoningText: "",
    usage: null,
    finishReason: null,
    lastEvent: null,
  };

  let buffer = "";
  buffer = consumeOpenAiChatSseBuffer(
    buffer +
      'data: {"id":"abc","model":"deepseek-v4-pro","choices":[{"delta":{"reasoning_content":"Hello "}}]}\n\n' +
      'data: {"id":"abc","model":"deepseek-v4-pro","choices":[{"delta":{"content":"world"},"finish_reason":"stop"}],"usage":{"prompt_tokens":10,"completion_tokens":5}}\n\n' +
      "data: [DONE]\n\n",
    summary
  );

  assert.equal(buffer, "");
  assert.equal(summary.upstreamRequestId, "abc");
  assert.equal(summary.model, "deepseek-v4-pro");
  assert.equal(summary.reasoningText, "Hello ");
  assert.equal(summary.text, "world");
  assert.equal(summary.finishReason, "stop");
  assert.deepEqual(summary.usage, {
    prompt_tokens: 10,
    completion_tokens: 5,
  });
});
