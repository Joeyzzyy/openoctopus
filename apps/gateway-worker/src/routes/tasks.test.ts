import assert from "node:assert/strict";
import test from "node:test";
import {
  chatRequestSchema,
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
