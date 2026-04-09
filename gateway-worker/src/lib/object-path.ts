export function getByPath(input: unknown, path: string): unknown {
  if (!path) {
    return undefined;
  }

  return path.split(".").reduce<unknown>((current, part) => {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(part);
      return Number.isInteger(index) ? current[index] : undefined;
    }

    if (typeof current === "object" && part in (current as Record<string, unknown>)) {
      return (current as Record<string, unknown>)[part];
    }

    return undefined;
  }, input);
}
