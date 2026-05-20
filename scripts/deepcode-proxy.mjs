import http from "node:http";
import { randomUUID } from "node:crypto";

const PORT = Number(process.env.PORT || 8787);
const UPSTREAM_BASE_URL = process.env.UPSTREAM_BASE_URL || "https://api.deepseek.com";
const UPSTREAM_API_KEY = process.env.UPSTREAM_API_KEY || "";
const MASK_HEADERS = new Set(["authorization", "x-api-key"]);

function maskHeaderValue(name, value) {
  if (!value) return value;
  if (!MASK_HEADERS.has(name.toLowerCase())) return value;
  if (value.length <= 12) return "[masked]";
  return `${value.slice(0, 8)}...[masked]...${value.slice(-4)}`;
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function summarizeBody(text) {
  const parsed = safeJsonParse(text);
  if (!parsed) return text;
  return parsed;
}

function printLogBlock(title, payload) {
  console.log(`\n=== ${title} ===`);
  if (typeof payload === "string") {
    console.log(payload);
    return;
  }
  console.log(JSON.stringify(payload, null, 2));
}

function collectRequestBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function buildUpstreamHeaders(originalHeaders) {
  const headers = new Headers();
  for (const [key, value] of Object.entries(originalHeaders)) {
    if (value == null) continue;
    if (["host", "content-length"].includes(key.toLowerCase())) continue;
    if (Array.isArray(value)) {
      headers.set(key, value.join(", "));
    } else {
      headers.set(key, value);
    }
  }

  if (UPSTREAM_API_KEY) {
    headers.set("Authorization", `Bearer ${UPSTREAM_API_KEY}`);
  }

  return headers;
}

const server = http.createServer(async (req, res) => {
  const requestId = randomUUID().slice(0, 8);
  const method = req.method || "GET";
  const path = req.url || "/";

  try {
    const rawBody = await collectRequestBody(req);
    const bodyText = rawBody.toString("utf8");
    const upstreamUrl = new URL(path, UPSTREAM_BASE_URL).toString();
    const requestHeaders = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value)
          ? value.map((item) => maskHeaderValue(key, item))
          : maskHeaderValue(key, value || ""),
      ]),
    );

    printLogBlock(`DeepCode Request ${requestId}`, {
      method,
      path,
      upstreamUrl,
      headers: requestHeaders,
      body: bodyText ? summarizeBody(bodyText) : null,
    });

    const upstreamResponse = await fetch(upstreamUrl, {
      method,
      headers: buildUpstreamHeaders(req.headers),
      body: ["GET", "HEAD"].includes(method) ? undefined : rawBody,
      duplex: "half",
    });

    const responseHeaders = Object.fromEntries(upstreamResponse.headers.entries());
    const contentType = upstreamResponse.headers.get("content-type") || "";
    const isStream =
      contentType.includes("text/event-stream") ||
      upstreamResponse.headers.get("transfer-encoding") === "chunked";

    printLogBlock(`DeepCode Response ${requestId}`, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
      stream: isStream,
    });

    res.writeHead(
      upstreamResponse.status,
      Object.fromEntries(upstreamResponse.headers.entries()),
    );

    if (!upstreamResponse.body) {
      res.end();
      return;
    }

    if (isStream) {
      const reader = upstreamResponse.body.getReader();
      const decoder = new TextDecoder();
      let preview = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = Buffer.from(value);
        res.write(chunk);

        if (preview.length < 4000) {
          preview += decoder.decode(value, { stream: true });
        }
      }

      if (preview) {
        printLogBlock(`DeepCode Stream Preview ${requestId}`, preview.slice(0, 4000));
      }

      res.end();
      return;
    }

    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());
    res.end(responseBuffer);

    const responseText = responseBuffer.toString("utf8");
    if (responseText) {
      printLogBlock(`DeepCode Response Body ${requestId}`, summarizeBody(responseText));
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    printLogBlock(`DeepCode Proxy Error ${requestId}`, { method, path, message });
    res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message } }));
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(
    `DeepCode proxy listening on http://127.0.0.1:${PORT} -> ${UPSTREAM_BASE_URL}`,
  );
  if (!UPSTREAM_API_KEY) {
    console.log("Warning: UPSTREAM_API_KEY is empty. Upstream requests may fail.");
  }
});
