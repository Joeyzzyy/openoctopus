import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import https from "node:https";
import { ProxyAgent } from "proxy-agent";

const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
const REQUEST_TIMEOUT_MS = (() => {
  const raw = process.env.UPSTREAM_REQUEST_TIMEOUT_MS;
  if (!raw) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_REQUEST_TIMEOUT_MS;
  }
  return Math.floor(parsed);
})();
const proxyConfigured = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
const proxyAgent = proxyConfigured ? new ProxyAgent() : null;

function truncateText(input: string, maxLength = 400) {
  if (input.length <= maxLength) {
    return input;
  }
  return `${input.slice(0, maxLength)}...`;
}

function redactUrl(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return rawUrl;
  }
}

function requestJson<TResponse>(
  url: string,
  options: {
    method: "GET" | "POST";
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }
): Promise<{ status: number; data: TResponse }> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = options.body ? JSON.stringify(options.body) : null;
    const transport = target.protocol === "https:" ? https : http;

    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: options.method,
        family: 4,
        timeout: REQUEST_TIMEOUT_MS,
        agent: proxyAgent ?? undefined,
        headers: {
          accept: "application/json",
          ...(payload ? { "content-type": "application/json" } : {}),
          ...(payload ? { "content-length": Buffer.byteLength(payload).toString() } : {}),
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on("end", () => {
          const text = Buffer.concat(chunks).toString("utf8");
          const status = res.statusCode ?? 500;
          const contentType = String(res.headers["content-type"] ?? "");
          const target = redactUrl(url);

          if (status < 200 || status >= 300) {
            reject(
              new Error(
                `Upstream ${options.method} failed with ${status} (${target}) content-type=${contentType || "unknown"} body=${truncateText(text)}`
              )
            );
            return;
          }

          try {
            const data = JSON.parse(text) as TResponse;

            resolve({ status, data });
          } catch {
            reject(
              new Error(
                `Upstream ${options.method} returned non-JSON response (${target}) content-type=${contentType || "unknown"} body=${truncateText(text)}`
              )
            );
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Upstream ${options.method} timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

function requestBuffer(
  url: string,
  options: {
    method: "GET" | "PUT";
    headers?: Record<string, string>;
    body?: Buffer;
  }
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  data: Buffer;
}> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = options.body ?? null;
    const transport = target.protocol === "https:" ? https : http;

    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: options.method,
        family: 4,
        timeout: REQUEST_TIMEOUT_MS,
        agent: proxyAgent ?? undefined,
        headers: {
          accept: "*/*",
          ...(payload ? { "content-length": Buffer.byteLength(payload).toString() } : {}),
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];

        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });

        res.on("end", () => {
          const status = res.statusCode ?? 500;
          const data = Buffer.concat(chunks);
          const target = redactUrl(url);
          if (status < 200 || status >= 300) {
            reject(
              new Error(
                `Upstream ${options.method} failed with ${status} (${target}) body=${truncateText(data.toString("utf8"))}`
              )
            );
            return;
          }

          resolve({
            status,
            headers: res.headers,
            data,
          });
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Upstream ${options.method} timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on("error", (error) => {
      reject(error);
    });

    if (payload) {
      req.write(payload);
    }

    req.end();
  });
}

export function postJson<TResponse>(
  url: string,
  options: {
    headers?: Record<string, string>;
    body: Record<string, unknown>;
  }
): Promise<{ status: number; data: TResponse }> {
  return requestJson<TResponse>(url, {
    method: "POST",
    headers: options.headers,
    body: options.body,
  });
}

export function postStream(
  url: string,
  options: {
    headers?: Record<string, string>;
    body: Record<string, unknown>;
  }
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  stream: IncomingMessage;
}> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    const payload = JSON.stringify(options.body);
    const transport = target.protocol === "https:" ? https : http;

    const req = transport.request(
      {
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port || undefined,
        path: `${target.pathname}${target.search}`,
        method: "POST",
        family: 4,
        timeout: REQUEST_TIMEOUT_MS,
        agent: proxyAgent ?? undefined,
        headers: {
          accept: "*/*",
          "content-type": "application/json",
          "content-length": Buffer.byteLength(payload).toString(),
          ...(options.headers ?? {}),
        },
      },
      (res) => {
        resolve({
          status: res.statusCode ?? 500,
          headers: res.headers,
          stream: res,
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(new Error(`Upstream POST timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(payload);
    req.end();
  });
}

export function getJson<TResponse>(
  url: string,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{ status: number; data: TResponse }> {
  return requestJson<TResponse>(url, {
    method: "GET",
    headers: options?.headers,
  });
}

export function getBuffer(
  url: string,
  options?: {
    headers?: Record<string, string>;
  }
) {
  return requestBuffer(url, {
    method: "GET",
    headers: options?.headers,
  });
}

export function putBuffer(
  url: string,
  options: {
    headers?: Record<string, string>;
    body: Buffer;
  }
) {
  return requestBuffer(url, {
    method: "PUT",
    headers: options.headers,
    body: options.body,
  });
}

export function getStream(
  url: string,
  options?: {
    headers?: Record<string, string>;
  }
): Promise<{
  status: number;
  headers: IncomingHttpHeaders;
  stream: IncomingMessage;
}> {
  const MAX_REDIRECTS = 5;

  const requestWithRedirect = (
    currentUrl: string,
    headers: Record<string, string>,
    redirectCount: number
  ): Promise<{
    status: number;
    headers: IncomingHttpHeaders;
    stream: IncomingMessage;
  }> =>
    new Promise((resolve, reject) => {
      const target = new URL(currentUrl);
      const transport = target.protocol === "https:" ? https : http;

      const req = transport.request(
        {
          protocol: target.protocol,
          hostname: target.hostname,
          port: target.port || undefined,
          path: `${target.pathname}${target.search}`,
          method: "GET",
          family: 4,
          timeout: REQUEST_TIMEOUT_MS,
          agent: proxyAgent ?? undefined,
          headers,
        },
        (res) => {
          const status = res.statusCode ?? 500;
          const location = res.headers.location;
          const shouldRedirect =
            [301, 302, 303, 307, 308].includes(status) &&
            typeof location === "string" &&
            location.length > 0;

          if (shouldRedirect) {
            if (redirectCount >= MAX_REDIRECTS) {
              res.resume();
              reject(new Error(`Upstream GET exceeded redirect limit (${MAX_REDIRECTS})`));
              return;
            }

            const nextUrl = new URL(location, target).toString();
            const nextTarget = new URL(nextUrl);
            const sameOrigin = nextTarget.origin === target.origin;

            // Avoid leaking provider keys across origins when following redirects.
            const nextHeaders = sameOrigin
              ? headers
              : {
                  accept: headers.accept ?? "*/*",
                  ...(headers.range ? { range: headers.range } : {}),
                };

            res.resume();
            requestWithRedirect(nextUrl, nextHeaders, redirectCount + 1)
              .then(resolve)
              .catch(reject);
            return;
          }

          resolve({
            status,
            headers: res.headers,
            stream: res,
          });
        }
      );

      req.on("timeout", () => {
        req.destroy(new Error(`Upstream GET timed out after ${REQUEST_TIMEOUT_MS}ms`));
      });

      req.on("error", (error) => {
        reject(error);
      });

      req.end();
    });

  return requestWithRedirect(
    url,
    {
      accept: "*/*",
      ...(options?.headers ?? {}),
    },
    0
  );
}
