import assert from "node:assert/strict";
import test from "node:test";
import { validateReferenceAssetLimits } from "./reference-asset-limits.js";

test("allows omitted reference assets when schema defines limits", () => {
  const errors = validateReferenceAssetLimits(
    {
      params: [
        { name: "reference_images", type: "array", maxItems: 2 },
        { name: "reference_videos", type: "array", maxItems: 1 },
        { name: "reference_audios", type: "array", maxItems: 1 },
      ],
    },
    {}
  );

  assert.deepEqual(errors, []);
});

test("rejects reference assets that exceed configured maxItems", () => {
  const errors = validateReferenceAssetLimits(
    {
      params: [
        { name: "reference_images", type: "array", maxItems: 2 },
        { name: "reference_videos", type: "array", maxItems: 1 },
      ],
    },
    {
      reference_images: [
        "https://example.com/1.png",
        "https://example.com/2.png",
        "https://example.com/3.png",
      ],
      reference_videos: [
        "https://example.com/1.mp4",
        "https://example.com/2.mp4",
      ],
    }
  );

  assert.deepEqual(errors, [
    "reference_images accepts at most 2 item(s) for this model",
    "reference_videos accepts at most 1 item(s) for this model",
  ]);
});

test("treats a single scalar reference asset as one item", () => {
  const errors = validateReferenceAssetLimits(
    {
      params: [{ name: "reference_audio", type: "string", maxItems: 1 }],
    },
    {
      reference_audio: "https://example.com/reference.mp3",
    }
  );

  assert.deepEqual(errors, []);
});

