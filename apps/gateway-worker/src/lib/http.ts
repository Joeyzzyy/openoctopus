export async function postJson<TResponse>(
  url: string,
  options: {
    headers?: Record<string, string>;
    body: Record<string, unknown>;
  }
): Promise<{ status: number; data: TResponse }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    body: JSON.stringify(options.body),
  });

  const data = (await response.json()) as TResponse;

  if (!response.ok) {
    throw new Error(`Upstream POST failed with ${response.status}`);
  }

  return { status: response.status, data };
}

export async function getJson<TResponse>(
  url: string,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ status: number; data: TResponse }> {
  const response = await fetch(url, {
    method: "GET",
    headers: options?.headers,
  });

  const data = (await response.json()) as TResponse;

  if (!response.ok) {
    throw new Error(`Upstream GET failed with ${response.status}`);
  }

  return { status: response.status, data };
}
