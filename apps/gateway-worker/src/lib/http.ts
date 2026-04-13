import http, { type IncomingHttpHeaders, type IncomingMessage } from "node:http";
import https from "node:https";
import { ProxyAgent } from "proxy-agent";

const REQUEST_TIMEOUT_MS = 30000;
const proxyConfigured = Boolean(process.env.HTTPS_PROXY || process.env.HTTP_PROXY);
const proxyAgent = proxyConfigured ? new ProxyAgent() : null;

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

          try {
            const data = JSON.parse(text) as TResponse;

            if (status < 200 || status >= 300) {
              reject(new Error(`Upstream ${options.method} failed with ${status}: ${text}`));
              return;
            }

            resolve({ status, data });
          } catch {
            reject(new Error(`Upstream ${options.method} returned non-JSON response: ${text}`));
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
  return new Promise((resolve, reject) => {
    const target = new URL(url);
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
        headers: {
          accept: "*/*",
          ...(options?.headers ?? {}),
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
      req.destroy(new Error(`Upstream GET timed out after ${REQUEST_TIMEOUT_MS}ms`));
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.end();
  });
}
