const REFERENCE_ASSET_FIELD_NAMES = new Set([
  "reference_image",
  "reference_images",
  "reference_video",
  "reference_videos",
  "reference_audio",
  "reference_audios",
]);

function readSchemaParams(inputSchema: unknown) {
  if (!inputSchema || typeof inputSchema !== "object" || Array.isArray(inputSchema)) {
    return [] as Record<string, unknown>[];
  }
  const record = inputSchema as Record<string, unknown>;
  return Array.isArray(record.params)
    ? record.params.filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === "object" && !Array.isArray(item)
      )
    : [];
}

function readPositiveInteger(value: unknown) {
  const numeric =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : Number.NaN;
  return Number.isInteger(numeric) && numeric > 0 ? numeric : null;
}

function countReferenceItems(value: unknown) {
  if (value === undefined || value === null || value === "") return 0;
  return Array.isArray(value) ? value.length : 1;
}

export function validateReferenceAssetLimits(inputSchema: unknown, input: Record<string, unknown>) {
  const errors: string[] = [];
  const params = readSchemaParams(inputSchema);

  for (const fieldName of REFERENCE_ASSET_FIELD_NAMES) {
    const value = input[fieldName];
    const itemCount = countReferenceItems(value);
    if (itemCount === 0) {
      continue;
    }
    const schemaField = params.find((item) => {
      const name = typeof item.name === "string" ? item.name.trim().toLowerCase() : "";
      return name === fieldName;
    });
    const limit = readPositiveInteger(schemaField?.maxItems ?? schemaField?.max_items);
    if (limit !== null && itemCount > limit) {
      errors.push(`${fieldName} accepts at most ${limit} item(s) for this model`);
    }
  }

  return errors;
}

