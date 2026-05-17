"use client";

import type { ReactNode } from "react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleHelp, Copy, Download, X } from "lucide-react";
import type { GatewayErrorDocRow, ModelDocRow } from "../models/data";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";

type JsonSchemaField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description?: string;
  exposedToCustomer: boolean;
  enumValues?: string[];
};

type PlaygroundUpload = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
};

type TaskStatus =
  | "idle"
  | "submitting"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

type MarkdownBlock =
  | { type: "heading"; level: 1 | 2 | 3; text: string }
  | { type: "blockquote"; text: string }
  | { type: "list"; items: string[] }
  | { type: "ordered-list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "code"; code: string; language: string }
  | { type: "paragraph"; text: string };

const ALLOWED_README_TAGS = new Set([
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "strong",
  "em",
  "code",
  "pre",
  "blockquote",
  "a",
  "br",
]);

const IMPLIED_SECTION_TITLES = [
  "Overview",
  "Why it looks great",
  "Limits and Performance",
  "API Information",
  "Input Schema",
  "Output Schema",
  "Usage Examples",
  "Pricing",
  "Billing Rule",
  "How to Use",
  "Pro tips for best quality",
  "More Versions",
  "Additional Resources",
  "Documentation",
  "Note",
] as const;

function formatPlaygroundError(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return "Submit failed";
  }
  const record = payload as Record<string, unknown>;
  const error =
    record.error && typeof record.error === "object" && !Array.isArray(record.error)
      ? (record.error as Record<string, unknown>)
      : null;
  const code = typeof error?.code === "string" ? error.code : "";
  const message =
    typeof error?.message === "string"
      ? error.message
      : typeof record.error === "string"
        ? record.error
        : "Submit failed";
  const upstreamStatus =
    typeof record.upstreamStatus === "number" ? String(record.upstreamStatus) : "";
  const upstreamBody =
    record.upstreamBody && typeof record.upstreamBody === "object"
      ? JSON.stringify(record.upstreamBody)
      : typeof record.upstreamBody === "string"
        ? record.upstreamBody
        : "";

  return [code ? `[${code}]` : "", message, upstreamStatus ? `(status: ${upstreamStatus})` : "", upstreamBody ? `| upstream: ${upstreamBody}` : ""]
    .filter((part) => part.length > 0)
    .join(" ");
}

function formatDetailText(detail: unknown) {
  if (detail === null || detail === undefined) return "No detail";
  if (typeof detail === "string") return detail;
  try {
    return JSON.stringify(detail, null, 2);
  } catch {
    return String(detail);
  }
}

function taskStatusLabel(status: TaskStatus) {
  if (status === "submitting") return "Submitting";
  if (status === "queued") return "Queued";
  if (status === "processing") return "Processing";
  if (status === "succeeded") return "Succeeded";
  if (status === "failed") return "Failed";
  return "Idle";
}

function decodeHtmlEntities(text: string) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const source = decodeHtmlEntities(text);
  const pattern = /(\[([^\]]+)\]\((https?:\/\/[^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*)/g;
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }
    if (match[2] && match[3]) {
      nodes.push(
        <a
          key={`${keyPrefix}-${match.index}`}
          href={match[3]}
          target="_blank"
          rel="noreferrer"
          className="text-[#9A4F18] underline underline-offset-4"
        >
          {match[2]}
        </a>
      );
    } else if (match[4]) {
      nodes.push(
        <code
          key={`${keyPrefix}-${match.index}`}
          className="rounded bg-black/[0.05] px-1 py-0.5 text-[0.95em] text-black"
        >
          {decodeHtmlEntities(match[4])}
        </code>
      );
    } else if (match[5]) {
      nodes.push(
        <strong key={`${keyPrefix}-${match.index}`} className="font-semibold text-black">
          {decodeHtmlEntities(match[5])}
        </strong>
      );
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes;
}

function looksLikeHtmlDocument(text: string) {
  return /^\s*<[^>]+>/.test(text);
}

function sanitizeReadmeHtml(html: string) {
  let sanitized = html;

  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, "");
  sanitized = sanitized.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  sanitized = sanitized.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, "");

  sanitized = sanitized.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (full, rawTag, rawAttrs) => {
    const tag = String(rawTag).toLowerCase();
    const safeTag = tag === "h1" ? "h2" : tag;
    if (!ALLOWED_README_TAGS.has(tag)) {
      return "";
    }

    const isClosing = full.startsWith("</");
    if (isClosing) {
      return `</${safeTag}>`;
    }

    if (safeTag === "a") {
      const hrefMatch = String(rawAttrs).match(/\shref=(["'])(.*?)\1/i);
      const href = hrefMatch?.[2]?.trim() ?? "";
      const safeHref = /^https?:\/\//i.test(href) ? href : "";
      return safeHref
        ? `<a href="${safeHref}" target="_blank" rel="noreferrer">`
        : "<a>";
    }

    if (safeTag === "br") {
      return "<br />";
    }

    return `<${safeTag}>`;
  });

  return sanitized.trim();
}

function HtmlReadme({ html }: { html: string }) {
  const sanitizedHtml = useMemo(() => sanitizeReadmeHtml(html), [html]);

  if (!sanitizedHtml) return null;

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">README</h2>
        <p className="mt-1 text-sm text-black/55">
          Supplemental model documentation for search indexing and user context.
        </p>
      </div>
      <article
        className="readme-html space-y-4 text-[15px] leading-7 text-black/75 [&_a]:text-[#9A4F18] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#E58A35] [&_blockquote]:bg-[#FFF8EC] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-black/[0.05] [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-black [&_h2]:pt-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-black [&_h3]:pt-1 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-black [&_li]:my-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-black/[0.08] [&_pre]:bg-[#111827] [&_pre]:px-4 [&_pre]:py-4 [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:text-white/90 [&_strong]:font-semibold [&_strong]:text-black [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </section>
  );
}

function renderMultilineText(text: string, keyPrefix: string) {
  return decodeHtmlEntities(text)
    .split("\n")
    .map((line, index, lines) => (
      <Fragment key={`${keyPrefix}-${index}`}>
        {renderInlineMarkdown(line, `${keyPrefix}-${index}`)}
        {index < lines.length - 1 ? <br /> : null}
      </Fragment>
    ));
}

function extractImpliedHeading(blockText: string, isFirstBlock: boolean) {
  const trimmed = blockText.trim();
  if (!trimmed) return null;

  const impliedSectionTitle = IMPLIED_SECTION_TITLES.find((title) =>
    trimmed.toLowerCase().startsWith(`${title.toLowerCase()} `)
  );
  if (impliedSectionTitle) {
    return {
      heading: impliedSectionTitle,
      body: trimmed.slice(impliedSectionTitle.length).trim(),
      level: impliedSectionTitle === "Documentation" ? 3 : 2,
    };
  }

  if (isFirstBlock) {
    const titleAndBodyMatch = trimmed.match(
      /^([A-Z0-9][A-Za-z0-9'’.+/-]*(?:\s+[A-Z0-9][A-Za-z0-9'’.+/-]*){0,4})\s+((?:The|A|An)\b[\s\S]*)$/
    );
    if (titleAndBodyMatch) {
      return {
        heading: titleAndBodyMatch[1].trim(),
        body: titleAndBodyMatch[2].trim(),
        level: 1,
      };
    }
  }

  return null;
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|") && trimmed.includes("|");
}

function isMarkdownTableDivider(line: string) {
  const trimmed = line.trim();
  if (!isMarkdownTableRow(trimmed)) return false;
  const cells = trimmed
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const normalized = markdown.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const language = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) {
        index += 1;
      }
      blocks.push({ type: "code", code: codeLines.join("\n"), language });
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length as 1 | 2 | 3,
        text: headingMatch[2].trim(),
      });
      index += 1;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith(">")) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "blockquote", text: quoteLines.join(" ") });
      continue;
    }

    if (
      isMarkdownTableRow(trimmed) &&
      index + 1 < lines.length &&
      isMarkdownTableDivider(lines[index + 1].trim())
    ) {
      const headers = splitMarkdownTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && isMarkdownTableRow(lines[index].trim())) {
        rows.push(splitMarkdownTableRow(lines[index].trim()));
        index += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("- ")) {
        items.push(lines[index].trim().slice(2).trim());
        index += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, "").trim());
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("```") &&
      !lines[index].trim().startsWith(">") &&
      !lines[index].trim().startsWith("- ") &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !/^(#{1,3})\s+/.test(lines[index].trim())
    ) {
      paragraphLines.push(lines[index].trim());
      index += 1;
    }
    const paragraphText = paragraphLines.join("\n");
    const inferredHeading = extractImpliedHeading(paragraphText, blocks.length === 0);
    if (inferredHeading) {
      blocks.push({
        type: "heading",
        level: inferredHeading.level as 1 | 2 | 3,
        text: inferredHeading.heading,
      });
      if (inferredHeading.body) {
        blocks.push({ type: "paragraph", text: inferredHeading.body });
      }
      continue;
    }
    blocks.push({ type: "paragraph", text: paragraphText });
  }

  return blocks;
}

function MarkdownReadme({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  if (blocks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">README</h2>
        <p className="mt-1 text-sm text-black/55">
          Supplemental model documentation for search indexing and user context.
        </p>
      </div>
      <article className="space-y-4 text-[15px] leading-7 text-black/75">
        {blocks.map((block, index) => {
          if (block.type === "heading") {
            if (block.level === 1) {
              return (
                <h2 key={index} className="text-3xl font-semibold tracking-tight text-black">
                  {renderInlineMarkdown(block.text, `heading-${index}`)}
                </h2>
              );
            }
            if (block.level === 2) {
              return (
                <h2 key={index} className="pt-2 text-2xl font-semibold tracking-tight text-black">
                  {renderInlineMarkdown(block.text, `heading-${index}`)}
                </h2>
              );
            }
            return (
              <h3 key={index} className="pt-1 text-xl font-semibold text-black">
                {renderInlineMarkdown(block.text, `heading-${index}`)}
              </h3>
            );
          }

          if (block.type === "blockquote") {
            return (
              <blockquote
                key={index}
                className="border-l-4 border-[#E58A35] bg-[#FFF8EC] px-4 py-3 italic text-black/70"
              >
                {renderMultilineText(block.text, `quote-${index}`)}
              </blockquote>
            );
          }

          if (block.type === "list") {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 marker:text-[#9A4F18]">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          }

          if (block.type === "ordered-list") {
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5 marker:text-[#9A4F18]">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInlineMarkdown(item, `olist-${index}-${itemIndex}`)}</li>
                ))}
              </ol>
            );
          }

          if (block.type === "table") {
            return (
              <div key={index} className="overflow-x-auto rounded-xl border border-black/[0.08] bg-white">
                <table className="min-w-full border-collapse text-left text-sm text-black/75">
                  <thead className="bg-[#FCFCFA]">
                    <tr>
                      {block.headers.map((header, headerIndex) => (
                        <th
                          key={headerIndex}
                          className="border-b border-black/[0.08] px-4 py-3 font-semibold text-black"
                        >
                          {renderInlineMarkdown(header, `thead-${index}-${headerIndex}`)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-b border-black/[0.06] last:border-b-0">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="px-4 py-3 align-top">
                            {renderInlineMarkdown(cell, `tbody-${index}-${rowIndex}-${cellIndex}`)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          if (block.type === "code") {
            return (
              <div key={index} className="overflow-hidden rounded-xl border border-black/[0.08] bg-[#111827]">
                {block.language ? (
                  <div className="border-b border-white/10 px-3 py-2 text-xs uppercase tracking-[0.25em] text-white/45">
                    {block.language}
                  </div>
                ) : null}
                <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-white/90">
                  <code>{block.code}</code>
                </pre>
              </div>
            );
          }

          return (
            <p key={index} className="text-[15px] leading-7 text-black/75">
              {renderMultilineText(block.text, `paragraph-${index}`)}
            </p>
          );
        })}
      </article>
    </section>
  );
}

function FieldHelpTooltip({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  const text = description?.trim();
  if (!text) return null;

  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label={`About ${label}`}
        className="inline-flex size-4 items-center justify-center rounded-full text-black/35 outline-none transition-colors hover:text-[#9A4F18] focus-visible:text-[#9A4F18]"
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden w-56 -translate-y-1/2 rounded-lg border border-black/[0.08] bg-[#111827] px-2.5 py-2 text-[11px] leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function parseInputSchemaText(schemaText: string): JsonSchemaField[] {
  try {
    const parsed = JSON.parse(schemaText) as Record<string, unknown>;
    const record =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    const requiredList = Array.isArray(record.required)
      ? new Set(record.required.filter((v): v is string => typeof v === "string"))
      : new Set<string>();

    const fields: JsonSchemaField[] = [];

    const params =
      Array.isArray(record.params)
        ? record.params
        : record.input && typeof record.input === "object" && !Array.isArray(record.input) && Array.isArray((record.input as Record<string, unknown>).params)
          ? ((record.input as Record<string, unknown>).params as unknown[])
          : [];
    if (params.length > 0) {
      for (const item of params) {
        if (!item || typeof item !== "object" || Array.isArray(item)) continue;
        const row = item as Record<string, unknown>;
        const key = typeof row.name === "string" ? row.name.trim() : "";
        if (!key || key === "model") continue;
        const rawType = typeof row.type === "string" ? row.type : "string";
        const enumValues = Array.isArray(row.enum)
          ? row.enum.filter((v): v is string => typeof v === "string")
          : undefined;
        const normalizedType: JsonSchemaField["type"] =
          rawType === "array" || rawType.toLowerCase().includes("array")
            ? "array"
            : rawType === "number" || rawType === "integer"
            ? "number"
            : rawType === "boolean"
              ? "boolean"
              : "string";
        fields.push({
          key,
          label: key,
          type: normalizedType,
          required: Boolean(row.required),
          description: typeof row.description === "string" ? row.description : "",
          exposedToCustomer:
            typeof row.exposedToCustomer === "boolean"
              ? row.exposedToCustomer
              : typeof row.customerVisible === "boolean"
                ? row.customerVisible
                : true,
          enumValues: enumValues && enumValues.length > 0 ? enumValues : undefined,
        });
      }
      return fields;
    }

    const directProperties =
      record.properties && typeof record.properties === "object" && !Array.isArray(record.properties)
        ? (record.properties as Record<string, unknown>)
        : null;
    const nestedInputProperties =
      record.input &&
      typeof record.input === "object" &&
      !Array.isArray(record.input) &&
      (record.input as Record<string, unknown>).properties &&
      typeof (record.input as Record<string, unknown>).properties === "object" &&
      !Array.isArray((record.input as Record<string, unknown>).properties)
        ? ((record.input as Record<string, unknown>).properties as Record<string, unknown>)
        : null;

    const properties = directProperties ?? nestedInputProperties ?? {};
    for (const [key, value] of Object.entries(properties)) {
      if (!value || typeof value !== "object" || Array.isArray(value)) continue;
      if (key === "model") continue;
      const propertySchema = value as Record<string, unknown>;
      const rawType = propertySchema.type;
      const enumValues = Array.isArray(propertySchema.enum)
        ? propertySchema.enum.filter((v): v is string => typeof v === "string")
        : undefined;
      const normalizedType: JsonSchemaField["type"] =
        rawType === "array" || (typeof rawType === "string" && rawType.toLowerCase().includes("array"))
          ? "array"
          : rawType === "number" || rawType === "integer"
          ? "number"
          : rawType === "boolean"
            ? "boolean"
            : "string";
      fields.push({
        key,
        label: key,
        type: normalizedType,
        required: requiredList.has(key),
        description:
          typeof propertySchema.description === "string" ? propertySchema.description : "",
        exposedToCustomer:
          typeof propertySchema.exposedToCustomer === "boolean"
            ? propertySchema.exposedToCustomer
            : typeof propertySchema.customerVisible === "boolean"
              ? propertySchema.customerVisible
              : true,
        enumValues: enumValues && enumValues.length > 0 ? enumValues : undefined,
      });
    }
    return fields;
  } catch {
    return [];
  }
}

const ASPECT_RATIO_OPTIONS = [
  "1:1",
  "3:2",
  "2:3",
  "3:4",
  "4:5",
  "5:4",
  "9:16",
  "16:9",
  "21:9",
];

const RESOLUTION_OPTIONS = ["1k", "2k", "3k", "4k"];
const PLAYGROUND_POLL_TIMEOUT_MS = 10 * 60 * 1000;
const PLAYGROUND_POLL_INTERVAL_MS = 1800;

function isAspectRatioEnum(values?: string[]) {
  if (!values || values.length === 0) return false;
  return values.every((value) => /^\d+:\d+$/.test(value));
}

function isResolutionField(key: string) {
  return key.trim().toLowerCase() === "resolution";
}

function isImageUploadField(field: JsonSchemaField) {
  return field.key.trim().toLowerCase() === "images";
}

function formatUploadSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value >= 0.1 ? 2 : 3,
    maximumFractionDigits: value >= 0.1 ? 2 : 3,
  }).format(value);
}

function readPositiveNumber(value: unknown) {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) && number > 0 ? number : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function slugifyPathPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function pickImageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  if (
    text.startsWith("/v1/files/") ||
    text.startsWith("https://") ||
    text.startsWith("http://") ||
    text.startsWith("data:image/")
  ) {
    return text;
  }
  if (
    text.startsWith("iVBORw0KGgo") ||
    text.startsWith("/9j/") ||
    text.startsWith("R0lGOD")
  ) {
    return `data:image/png;base64,${text}`;
  }
  if (text.startsWith("UklGR")) {
    return `data:image/webp;base64,${text}`;
  }
  return null;
}

function imageExtensionFromMimeType(mimeType: string | null | undefined) {
  const normalized = mimeType?.split(";")[0]?.trim().toLowerCase();
  if (normalized === "image/jpeg") return "jpg";
  if (normalized === "image/webp") return "webp";
  if (normalized === "image/gif") return "gif";
  if (normalized === "image/png") return "png";
  return "png";
}

function replaceFileExtension(filename: string, extension: string) {
  return filename.replace(/\.[a-z0-9]+$/i, "") + `.${extension}`;
}

function buildDisplayImageUrl(src: string) {
  if (src.startsWith("data:image/")) return src;
  try {
    const url = src.startsWith("/v1/files/")
      ? new URL(src, PUBLIC_API_BASE_URL)
      : src.startsWith("/")
        ? new URL(src, typeof window !== "undefined" ? window.location.origin : "http://localhost")
      : new URL(src);
    if (url.pathname.startsWith("/v1/files/")) {
      url.searchParams.set("display", "1");
      return url.toString();
    }
  } catch {
    return src;
  }
  return src;
}

function isRouteSyncedWithSelection(input: {
  pathname: string;
  selectedProvider: string;
  selectedModelPublicSlug: string;
}) {
  const providerSlug =
    slugifyPathPart(input.selectedProvider) || encodeURIComponent(input.selectedProvider);
  const modelSlug =
    slugifyPathPart(input.selectedModelPublicSlug) || encodeURIComponent(input.selectedModelPublicSlug);
  return input.pathname === `/models/${providerSlug}/${modelSlug}`;
}

type PlaygroundImageAsset = {
  url: string;
  mimeType?: string;
};

function extractImageAssets(output: unknown): PlaygroundImageAsset[] {
  if (!isRecord(output)) return [];
  const assets: PlaygroundImageAsset[] = [];
  const seen = new Set<string>();
  const pushAsset = (candidate: unknown, mimeType?: unknown) => {
    const resolved = pickImageUrl(candidate);
    if (!resolved || seen.has(resolved)) return;
    seen.add(resolved);
    assets.push({
      url: resolved,
      ...(typeof mimeType === "string" && mimeType.length > 0 ? { mimeType } : {}),
    });
  };

  const outputAssets = Array.isArray(output.assets) ? output.assets : [];
  for (const item of outputAssets) {
    if (!isRecord(item)) continue;
    if (item.type && item.type !== "image") continue;
    const primaryUrl = pickImageUrl(item.url);
    if (primaryUrl) {
      pushAsset(primaryUrl, item.mimeType);
      continue;
    }
    pushAsset(item.sourceUrl, item.mimeType);
  }

  if (assets.length === 0) {
    const primaryUrl = pickImageUrl(output.url);
    if (primaryUrl) {
      pushAsset(primaryUrl, output.mimeType);
    } else {
      pushAsset(output.sourceUrl, output.mimeType);
    }
  }

  return assets;
}

export function ModelsBrowser({
  rows,
  vendorOptions,
  gatewayErrorDocs,
  initialProvider,
  initialModelSlug,
}: {
  rows: ModelDocRow[];
  vendorOptions: string[];
  gatewayErrorDocs?: GatewayErrorDocRow[];
  initialProvider?: string;
  initialModelSlug?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const safeRows = rows;
  const providerModelCountMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of safeRows) {
      const key = (row.providerName?.trim() || "Other").toLowerCase();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [safeRows]);
  const rowsByProvider = useMemo(() => {
    const map = new Map<string, ModelDocRow[]>();
    for (const row of safeRows) {
      const key = row.providerName?.trim() || "Other";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en-US"));
  }, [safeRows]);

  const providerOptions = useMemo(() => {
    const modelProviders = rowsByProvider.map(([provider]) => provider);
    if (vendorOptions.length === 0) {
      return modelProviders;
    }

    const providerSet = new Set(modelProviders.map((item) => item.toLowerCase()));
    const intersection = vendorOptions.filter((item) =>
      providerSet.has(item.toLowerCase())
    );

    if (intersection.length > 0) {
      return intersection;
    }

    return modelProviders;
  }, [rowsByProvider, vendorOptions]);
  const selectableProviderOptions = useMemo(
    () =>
      providerOptions.filter(
        (provider) => (providerModelCountMap.get(provider.toLowerCase()) ?? 0) > 0
      ),
    [providerOptions, providerModelCountMap]
  );
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    const normalizedInitialProvider = slugifyPathPart(initialProvider ?? "");
    if (!normalizedInitialProvider) {
      return selectableProviderOptions[0] ?? "";
    }
    const matched =
      selectableProviderOptions.find(
        (provider) => slugifyPathPart(provider) === normalizedInitialProvider
      ) ?? selectableProviderOptions[0];
    return matched ?? "";
  });
  const visibleRows = useMemo(
    () =>
      safeRows.filter(
        (row) =>
          (row.providerName?.trim() || "Other").toLowerCase() ===
          selectedProvider.toLowerCase()
      ),
    [safeRows, selectedProvider]
  );

  const findModelByRouteSlug = (routeSlug: string | undefined, rows: ModelDocRow[]) => {
    const normalized = (routeSlug ?? "").trim();
    if (!normalized) return null;
    const exact = rows.find((row) => row.publicModel === normalized);
    if (exact) return exact.publicModel;
    const normalizedSlug = slugifyPathPart(normalized);
    const bySlug = rows.find((row) => slugifyPathPart(row.publicModel) === normalizedSlug);
    return bySlug?.publicModel ?? null;
  };

  const [selectedModelSlug, setSelectedModelSlug] = useState<string | null>(() => {
    const fromRoute = findModelByRouteSlug(initialModelSlug, visibleRows);
    if (fromRoute) return fromRoute;
    return visibleRows[0]?.publicModel ?? null;
  });
  const effectiveModelSlug =
    selectedModelSlug && visibleRows.some((row) => row.publicModel === selectedModelSlug)
      ? selectedModelSlug
      : (visibleRows[0]?.publicModel ?? null);
  const selectedModel =
    visibleRows.find((row) => row.publicModel === effectiveModelSlug) ?? visibleRows[0] ?? null;
  const showcaseItems = useMemo(() => {
    if (!selectedModel) return [];
    const items = [
      ...(selectedModel.coverImageUrl
        ? [{ url: selectedModel.coverImageUrl, prompt: selectedModel.coverImagePrompt, kind: "cover" as const }]
        : []),
      ...selectedModel.showcaseImageUrls.map((url, index) => ({
        url,
        prompt: selectedModel.showcaseImagePrompts[index] ?? null,
        kind: "gallery" as const,
      })),
    ];
    return items.filter(
      (item, index) => items.findIndex((candidate) => candidate.url === item.url) === index
    );
  }, [selectedModel]);

  const [mainTab, setMainTab] = useState<"playground" | "api">("playground");
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [playgroundErrorDetail, setPlaygroundErrorDetail] = useState<unknown>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCopied, setDetailCopied] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState(false);
  const [topUpRequiredModalOpen, setTopUpRequiredModalOpen] = useState(false);
  const [resultCopied, setResultCopied] = useState(false);
  const [playgroundOutput, setPlaygroundOutput] = useState<unknown>(null);
  const [playgroundForm, setPlaygroundForm] = useState<Record<string, string>>({});
  const [playgroundUploads, setPlaygroundUploads] = useState<Record<string, PlaygroundUpload[]>>({});
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const playgroundImageAssets = useMemo(
    () => extractImageAssets(playgroundOutput),
    [playgroundOutput]
  );
  useEffect(() => {
    setPlaygroundForm({});
    setPlaygroundUploads({});
    setUploadingFields({});
  }, [effectiveModelSlug]);
  const handleProviderChange = (nextProvider: string) => {
    setSelectedProvider(nextProvider);
    const nextRows = rowsByProvider.find(([provider]) => provider === nextProvider)?.[1] ?? [];
    setSelectedModelSlug(nextRows[0]?.publicModel ?? null);
  };

  const handleModelChange = (nextModelSlug: string | null) => {
    setSelectedModelSlug(nextModelSlug);
  };

  useEffect(() => {
    const normalizedInitialProvider = slugifyPathPart(initialProvider ?? "");
    if (!normalizedInitialProvider) return;
    const matched =
      selectableProviderOptions.find(
        (provider) => slugifyPathPart(provider) === normalizedInitialProvider
      ) ?? null;
    if (matched && matched !== selectedProvider) {
      setSelectedProvider(matched);
    }
  }, [initialProvider, selectableProviderOptions, selectedProvider]);

  useEffect(() => {
    if (!initialModelSlug) return;
    const resolved = findModelByRouteSlug(initialModelSlug, visibleRows);
    if (!resolved) return;
    if (selectedModelSlug !== resolved) {
      setSelectedModelSlug(resolved);
    }
  }, [initialModelSlug, visibleRows, selectedModelSlug]);

  useEffect(() => {
    if (!selectedModel || !selectedProvider) return;
    const providerSlug = slugifyPathPart(selectedProvider) || encodeURIComponent(selectedProvider);
    const modelSlug = slugifyPathPart(selectedModel.publicModel) || encodeURIComponent(selectedModel.publicModel);
    const nextHref = `/models/${providerSlug}/${modelSlug}`;
    if (pathname === nextHref) return;
    router.replace(nextHref, { scroll: false });
  }, [pathname, router, selectedModel, selectedProvider]);

  const handleMainTabChange = (tab: "playground" | "api") => {
    if (tab === mainTab) return;
    setMainTab(tab);
  };

  const modelsByCapability = useMemo(() => {
    const map = new Map<string, ModelDocRow[]>();
    for (const row of visibleRows) {
      const key = row.capability?.trim() || "other";
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "en-US"));
  }, [visibleRows]);
  const relatedModels = useMemo(
    () =>
      visibleRows
        .filter((row) => row.publicModel !== selectedModel?.publicModel)
        .slice(0, 6),
    [selectedModel?.publicModel, visibleRows]
  );
  const capabilityTag = selectedModel?.modelTypeLabel || "uncategorized";
  const modelSlugTail = selectedModel?.upstreamModelSlug || selectedModel?.publicModel || "model";
  const parsedFields = useMemo(
    () =>
      parseInputSchemaText(selectedModel?.inputSchemaText ?? "").filter(
        (field) => field.exposedToCustomer
      ),
    [selectedModel?.inputSchemaText]
  );
  const isSubmitting = taskStatus === "submitting" || taskStatus === "queued" || taskStatus === "processing";
  const priceTag = useMemo(() => {
    if (!selectedModel) return "";
    const tiers = selectedModel.priceTiers ?? [];
    if (tiers.length === 0) return selectedModel.priceLabel || "";
    const resolutionField = parsedFields.find((field) => isResolutionField(field.key));
    const qualityField = parsedFields.find((field) => field.key.trim().toLowerCase() === "quality");
    const resolution =
      (resolutionField ? playgroundForm[resolutionField.key] : "") ||
      resolutionField?.enumValues?.[0] ||
      RESOLUTION_OPTIONS[0];
    const quality =
      (qualityField ? playgroundForm[qualityField.key] : "") ||
      qualityField?.enumValues?.[0] ||
      "medium";
    const tier =
      tiers.find((item) => item.resolution === resolution && item.quality === quality) ??
      tiers.find((item) => item.resolution === resolution) ??
      tiers[0];
    const imageCount =
      readPositiveNumber(playgroundForm.num_images) ??
      readPositiveNumber(playgroundForm.n) ??
      1;
    const total = tier.price * imageCount;
    return imageCount > 1
      ? `${formatUsd(total)} total · ${formatUsd(tier.price)} / image`
      : `${formatUsd(tier.price)} / image`;
  }, [parsedFields, playgroundForm, selectedModel]);

  useEffect(() => {
    setPlaygroundForm((current) => {
      const next = { ...current };
      let changed = false;

      for (const field of parsedFields) {
        const existing = next[field.key];
        if (typeof existing === "string" && existing.trim().length > 0) continue;

        if (field.key === "aspect_ratio") {
          const defaultRatio =
            field.enumValues && field.enumValues.length > 0
              ? field.enumValues[0]
              : ASPECT_RATIO_OPTIONS[0];
          next[field.key] = defaultRatio;
          changed = true;
          continue;
        }

        if (isResolutionField(field.key)) {
          const defaultResolution =
            field.enumValues && field.enumValues.length > 0
              ? field.enumValues[0]
              : RESOLUTION_OPTIONS[0];
          next[field.key] = defaultResolution;
          changed = true;
          continue;
        }

        if (field.enumValues && field.enumValues.length > 0) {
          next[field.key] = field.enumValues[0];
          changed = true;
          continue;
        }

        if (field.type === "boolean") {
          next[field.key] = "true";
          changed = true;
        }
      }

      return changed ? next : current;
    });
  }, [parsedFields]);

  useEffect(() => {
    const exampleUrl = selectedModel?.playgroundInputImageUrl;
    if (!exampleUrl) return;
    const imageFields = parsedFields.filter(isImageUploadField);
    if (imageFields.length === 0) return;

    setPlaygroundUploads((current) => {
      let changed = false;
      const next = { ...current };
      for (const field of imageFields) {
        const currentUploads = next[field.key] ?? [];
        if (currentUploads.length > 0) continue;
        next[field.key] = [
          {
            url: exampleUrl,
            name: "Example image",
            mimeType: "image/*",
            size: 0,
          },
        ];
        changed = true;
      }
      return changed ? next : current;
    });
  }, [parsedFields, selectedModel?.playgroundInputImageUrl]);

  useEffect(() => {
    const prefillPrompt = searchParams.get("prompt")?.trim();
    if (!prefillPrompt) return;
    const hasPromptField = parsedFields.some((field) => field.key === "prompt");
    if (!hasPromptField) return;
    setPlaygroundForm((current) => ({ ...current, prompt: prefillPrompt }));
  }, [parsedFields, searchParams]);

  const inferEndpoint = (capability: string | null | undefined) =>
    capability === "image_edit"
      ? "/v1/images/edits"
      : capability?.includes("video")
        ? "/v1/videos/generations"
        : "/v1/images/generations";

  const uploadPlaygroundImages = async (field: JsonSchemaField, files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;

    setUploadingFields((current) => ({ ...current, [field.key]: true }));
    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });

    try {
      const uploaded: PlaygroundUpload[] = [];
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.set("field", field.key);
        formData.set("file", file);
        const response = await fetch("/api/playground/uploads", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          url?: string;
          mimeType?: string;
          name?: string;
          size?: number;
          error?: { message?: string };
        };
        if (!response.ok || !payload.url) {
          throw new Error(payload.error?.message ?? "Upload failed");
        }
        uploaded.push({
          url: payload.url,
          name: payload.name || file.name,
          mimeType: payload.mimeType || file.type,
          size: typeof payload.size === "number" ? payload.size : file.size,
        });
      }

      setPlaygroundUploads((current) => ({
        ...current,
        [field.key]: [...(current[field.key] ?? []), ...uploaded],
      }));
    } catch (error) {
      setValidationErrors((current) => ({
        ...current,
        [field.key]: error instanceof Error ? error.message : "Upload failed",
      }));
    } finally {
      setUploadingFields((current) => ({ ...current, [field.key]: false }));
    }
  };

  const removePlaygroundUpload = (fieldKey: string, index: number) => {
    setPlaygroundUploads((current) => ({
      ...current,
      [fieldKey]: (current[fieldKey] ?? []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const submitPlayground = async () => {
    if (!selectedModel) return;
    setPlaygroundError(null);
    setPlaygroundErrorDetail(null);
    setDetailCopied(false);
    setResultCopied(false);
    setResultModalOpen(false);
    setPlaygroundOutput(null);
    setTaskId(null);
    setTaskStatus("idle");

    const nextValidationErrors: Record<string, string> = {};
    for (const field of parsedFields) {
      if (isImageUploadField(field)) {
        if (field.required && (playgroundUploads[field.key] ?? []).length === 0) {
          nextValidationErrors[field.key] = `${field.label} is required.`;
        }
        continue;
      }
      const value = playgroundForm[field.key]?.trim() ?? "";
      if (field.required && value.length === 0) {
        nextValidationErrors[field.key] = `${field.label} is required.`;
      }
      if (field.key === "prompt" && value.length === 0) {
        nextValidationErrors[field.key] = "Prompt is required.";
      }
    }
    if (Object.keys(nextValidationErrors).length > 0) {
      setValidationErrors(nextValidationErrors);
      return;
    }
    setValidationErrors({});
    setTaskStatus("submitting");

    let capturedErrorDetail: unknown = null;

    try {
      const inputPayload: Record<string, unknown> = {};
      let promptValue: string | undefined;

      for (const field of parsedFields) {
        if (isImageUploadField(field)) {
          const uploads = playgroundUploads[field.key] ?? [];
          if (uploads.length > 0) {
            inputPayload[field.key] = uploads.map((item) => item.url);
          }
          continue;
        }
        const raw = playgroundForm[field.key];
        if ((raw ?? "").trim().length === 0) continue;
        if (field.key === "prompt") {
          promptValue = raw;
          continue;
        }
        if (field.type === "number") {
          const num = Number(raw);
          if (!Number.isNaN(num)) inputPayload[field.key] = num;
          continue;
        }
        if (field.type === "boolean") {
          inputPayload[field.key] = raw === "true";
          continue;
        }
        if (field.type === "array") {
          const trimmed = raw.trim();
          if (trimmed.startsWith("[")) {
            try {
              const parsedArray = JSON.parse(trimmed);
              if (Array.isArray(parsedArray)) {
                inputPayload[field.key] = parsedArray;
                continue;
              }
            } catch {
              // Fall through to simple splitting below.
            }
          }
          inputPayload[field.key] = trimmed
            .split(/[\n,]/)
            .map((item) => item.trim())
            .filter(Boolean);
          continue;
        }
        inputPayload[field.key] = raw;
      }

      const submitRes = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "submit",
          endpoint: inferEndpoint(selectedModel.capability),
          model: selectedModel.publicModel,
          prompt: promptValue,
          input: inputPayload,
        }),
      });

      const submitJson = (await submitRes.json()) as {
        id?: string;
        status?: string;
        error?: { message?: string; code?: string } | string;
        upstreamStatus?: number;
        upstreamBody?: unknown;
        apiBase?: string;
        requestUrl?: string;
      };

      if (!submitRes.ok || !submitJson.id) {
        const errorCode =
          submitJson.error && typeof submitJson.error === "object" && !Array.isArray(submitJson.error)
            ? submitJson.error.code
            : "";
        if (submitRes.status === 401 || errorCode === "unauthorized") {
          setTaskStatus("idle");
          setAuthRequiredModalOpen(true);
          return;
        }
        if (submitRes.status === 402 || errorCode === "insufficient_balance") {
          setTaskStatus("idle");
          setTopUpRequiredModalOpen(true);
          return;
        }
        const hasPromptField = parsedFields.some((field) => field.key === "prompt");
        const browserProxyUrl =
          typeof window !== "undefined"
            ? `${window.location.origin}/api/playground`
            : "/api/playground";
        const inferredEndpoint = inferEndpoint(selectedModel.capability);
        const inferredApiBase =
          typeof submitJson.apiBase === "string" && submitJson.apiBase.length > 0
            ? submitJson.apiBase
            : PUBLIC_API_BASE_URL;
        const inferredRequestUrl =
          typeof submitJson.requestUrl === "string" && submitJson.requestUrl.length > 0
            ? submitJson.requestUrl
            : `${inferredApiBase}${inferredEndpoint}`;
        capturedErrorDetail = {
          stage: "submit",
          chain: {
            browserToProxy: {
              method: "POST",
              url: browserProxyUrl,
            },
            proxyToGateway: {
              method: "POST",
              apiBase: inferredApiBase,
              requestUrl: inferredRequestUrl,
            },
          },
          request: {
            endpoint: inferredEndpoint,
            model: selectedModel.publicModel,
            prompt: promptValue ?? "",
            hasPromptField,
            input: inputPayload,
          },
          submitHttpStatus: submitRes.status,
          response: submitJson,
        };
        throw new Error(formatPlaygroundError(submitJson));
      }

      setTaskId(submitJson.id);
      setTaskStatus("queued");

      const startedAt = Date.now();
      while (Date.now() - startedAt < PLAYGROUND_POLL_TIMEOUT_MS) {
        await new Promise((resolve) => setTimeout(resolve, PLAYGROUND_POLL_INTERVAL_MS));
        const statusRes = await fetch("/api/playground", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "status",
            taskId: submitJson.id,
          }),
        });
        const statusJson = (await statusRes.json()) as {
          status?: string;
          output_payload?: unknown;
          error_message?: string;
          error?: { message?: string; code?: string } | string;
          upstreamStatus?: number;
          upstreamBody?: unknown;
        };

        if (!statusRes.ok) {
          const errorCode =
            statusJson.error && typeof statusJson.error === "object" && !Array.isArray(statusJson.error)
              ? statusJson.error.code
              : "";
          if (statusRes.status === 401 || errorCode === "unauthorized") {
            setTaskStatus("idle");
            setAuthRequiredModalOpen(true);
            return;
          }
          if (statusRes.status === 402 || errorCode === "insufficient_balance") {
            setTaskStatus("idle");
            setTopUpRequiredModalOpen(true);
            return;
          }
          capturedErrorDetail = {
            stage: "status",
            taskId: submitJson.id,
            response: statusJson,
          };
          throw new Error(formatPlaygroundError(statusJson));
        }

        if (statusJson.status === "queued" || statusJson.status === "processing") {
          setTaskStatus(statusJson.status);
          continue;
        }
        if (statusJson.status === "succeeded") {
          setTaskStatus("succeeded");
          setPlaygroundOutput(statusJson.output_payload ?? statusJson);
          return;
        }
        if (statusJson.status === "failed") {
          setTaskStatus("failed");
          const structuredError =
            statusJson.error && typeof statusJson.error === "object" && !Array.isArray(statusJson.error)
              ? statusJson.error
              : null;
          setPlaygroundError(
            statusJson.error_message ||
              (typeof structuredError?.message === "string" ? structuredError.message : "") ||
              "Generation failed"
          );
          setPlaygroundErrorDetail({
            stage: "task_failed",
            taskId: submitJson.id,
            response: statusJson,
          });
          return;
        }
      }

      setTaskStatus("failed");
      setPlaygroundError("Playground request timeout, please retry.");
      setPlaygroundErrorDetail({
        stage: "timeout",
        taskId: submitJson.id,
      });
    } catch (error) {
      setTaskStatus("failed");
      setPlaygroundError(error instanceof Error ? error.message : "Submit failed");
      setPlaygroundErrorDetail(
        capturedErrorDetail ?? {
          stage: "client_exception",
          message: error instanceof Error ? error.message : "Submit failed",
        }
      );
    }
  };

  const copyErrorDetail = async () => {
    const text = formatDetailText(playgroundErrorDetail);
    try {
      await navigator.clipboard.writeText(text);
      setDetailCopied(true);
      setTimeout(() => setDetailCopied(false), 1500);
    } catch {
      setDetailCopied(false);
    }
  };

  const copyResultJson = async () => {
    const text = formatDetailText(playgroundOutput);
    try {
      await navigator.clipboard.writeText(text);
      setResultCopied(true);
      setTimeout(() => setResultCopied(false), 1500);
    } catch {
      setResultCopied(false);
    }
  };

  const downloadImage = async (src: string, filename: string, mimeType?: string) => {
    try {
      const requestedFilename = replaceFileExtension(filename, imageExtensionFromMimeType(mimeType));
      if (src.startsWith("data:image/")) {
        const link = document.createElement("a");
        link.href = src;
        link.download = requestedFilename;
        link.click();
        return;
      }
      const response = await fetch(buildDisplayImageUrl(src));
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const downloadFilename = replaceFileExtension(
        requestedFilename,
        imageExtensionFromMimeType(blob.type || mimeType)
      );
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = downloadFilename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(buildDisplayImageUrl(src), "_blank", "noopener,noreferrer");
    }
  };
  const openModelWithPrompt = (prompt: string | null | undefined) => {
    if (!selectedModel) return;
    const providerSlug = slugifyPathPart(selectedProvider) || encodeURIComponent(selectedProvider);
    const modelSlug = slugifyPathPart(selectedModel.publicModel) || encodeURIComponent(selectedModel.publicModel);
    const params = new URLSearchParams();
    if (prompt && prompt.trim().length > 0) {
      params.set("prompt", prompt.trim());
    }
    const href = `/models/${providerSlug}/${modelSlug}${params.toString().length > 0 ? `?${params.toString()}` : ""}`;
    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="space-y-3 sm:space-y-4">
      <div className="space-y-2.5">
        {selectedModel ? (
          <div className="rounded-xl border border-[#E9DEC9] bg-[linear-gradient(135deg,#FFF7EA_0%,#FFFDFC_55%,#F6F1E7_100%)] p-3 sm:rounded-2xl sm:p-3.5">
            <div className="grid gap-2.5 sm:gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium tracking-[0.2px] text-black/50">Vendor</span>
                <select
                  value={selectedProvider}
                  onChange={(event) => handleProviderChange(event.target.value)}
                  className="h-9 w-full appearance-none rounded-md border border-transparent bg-white/55 px-2.5 text-sm text-black/80 outline-none transition-colors hover:bg-white/70 focus:bg-white/85"
                >
                  {selectableProviderOptions.map((provider) => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[11px] font-medium tracking-[0.2px] text-black/50">Model</span>
                <select
                  value={effectiveModelSlug ?? visibleRows[0]?.publicModel ?? ""}
                  onChange={(event) => handleModelChange(event.target.value || null)}
                  className="h-9 w-full appearance-none rounded-md border border-transparent bg-white/55 px-2.5 text-sm font-semibold text-black/90 outline-none transition-colors hover:bg-white/70 focus:bg-white/85"
                >
                  {modelsByCapability.map(([capability, models]) => (
                    <optgroup key={capability} label={capability}>
                      {models.map((item) => (
                        <option key={item.publicModel} value={item.publicModel}>
                          {item.displayName}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-2 text-[13px] leading-5 text-black/68 sm:mt-1.5 sm:leading-5.5">
              {selectedModel.modelDescription || "This model does not have a detailed description yet."}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              <span className="inline-flex rounded-full border border-[#E7C89A] bg-white/80 px-3 py-1 text-xs font-medium text-[#9A4F18]">
                {selectedModel.providerName}
              </span>
              <span className="inline-flex rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs text-black/70">
                {capabilityTag}
              </span>
              {priceTag ? (
                <span className="inline-flex rounded-full border border-[#CFE5D5] bg-[#EAF7ED] px-3 py-1 text-xs font-medium text-[#245C31]">
                  {priceTag}
                </span>
              ) : null}
              <span className="inline-flex max-w-full rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs text-black/70">
                <span className="truncate">
                {selectedModel.publicModel}
                </span>
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0 max-w-full">
        <div className="min-w-0 space-y-4">
      <section className="min-w-0 max-w-full rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm sm:rounded-2xl sm:p-3">
        <div className="mb-2 border-b border-black/[0.08] pb-1.5">
          <div className="grid grid-cols-2 gap-1 sm:flex sm:items-center">
            {(["playground", "api"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleMainTabChange(tab)}
                className={`h-10 cursor-pointer rounded-md border-b-2 px-3 text-sm font-medium sm:rounded-none ${
                  tab === mainTab
                    ? "border-[#E58A35] text-[#9A4F18]"
                    : "border-transparent text-[#6B7280] hover:bg-black/[0.02] hover:text-[#111827]"
                }`}
              >
                {tab === "api" ? "API" : "Playground"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-w-0">
        {mainTab === "playground" ? (
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            <section className="rounded-lg border border-black/[0.08] bg-white p-3 sm:rounded-xl sm:p-4">
              <h3 className="mb-3 text-sm font-medium text-black">Input</h3>
              <div className="space-y-3">
                {parsedFields.length === 0 ? (
                  <p className="text-sm text-black/55">
                    No structured input schema found. You can still submit with default empty input.
                  </p>
                ) : (
                  parsedFields.map((field) => (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs text-black/65">
                        <span className="inline-flex items-center">
                          {field.label}
                          <FieldHelpTooltip label={field.label} description={field.description} />
                        </span>
                        {field.required ? <span className="pl-1 text-red-500">*</span> : null}
                      </span>
                      {isImageUploadField(field) ? (
                        <div className="rounded-md border border-black/[0.1] bg-white p-2.5 sm:p-3">
                          <input
                            disabled={isSubmitting || uploadingFields[field.key]}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            multiple
                            onChange={(event) => {
                              void uploadPlaygroundImages(field, event.target.files);
                              event.target.value = "";
                            }}
                            className="block w-full text-xs text-black/60 file:mb-2 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-black file:px-3 file:text-xs file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:file:mb-0"
                          />
                          <p className="mt-2 text-[11px] leading-5 text-black/45">
                            Upload PNG, JPEG, or WebP images. They are converted to secure URLs before submission.
                          </p>
                          {uploadingFields[field.key] ? (
                            <p className="mt-2 text-[11px] text-black/55">Uploading...</p>
                          ) : null}
                          {(playgroundUploads[field.key] ?? []).length > 0 ? (
                            <div className="mt-3 grid gap-3">
                              {(playgroundUploads[field.key] ?? []).map((upload, index) => (
                                <div
                                  key={`${upload.url}-${index}`}
                                  className="relative rounded-md border border-black/[0.06] bg-[#FCFCFA] p-2"
                                >
                                  <button
                                    type="button"
                                    disabled={isSubmitting}
                                    onClick={() => removePlaygroundUpload(field.key, index)}
                                    className="absolute right-2 top-2 z-10 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-black/[0.08] bg-white/95 text-black/50 shadow-sm hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                                    aria-label={`Remove ${upload.name}`}
                                    title="Remove image"
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                  <div className="overflow-hidden rounded bg-white">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={upload.url}
                                      alt={upload.name}
                                      className="max-h-32 w-full object-contain"
                                    />
                                  </div>
                                  <div className="mt-2 min-w-0 pr-8">
                                    <p className="truncate text-xs font-medium text-black/75">
                                      {upload.name}
                                    </p>
                                    {selectedModel?.playgroundInputPrompt && upload.url === selectedModel.playgroundInputImageUrl ? (
                                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-black/45">
                                        {selectedModel.playgroundInputPrompt}
                                      </p>
                                    ) : null}
                                    <p className="mt-1 text-[11px] text-black/45">
                                      {upload.mimeType}
                                      {upload.size > 0 ? ` · ${formatUploadSize(upload.size)}` : ""}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : field.key === "aspect_ratio" || isAspectRatioEnum(field.enumValues) ? (
                        <select
                          disabled={isSubmitting}
                          value={
                            playgroundForm[field.key] ??
                            (field.enumValues && field.enumValues.length > 0
                              ? field.enumValues[0]
                              : ASPECT_RATIO_OPTIONS[0])
                          }
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {(field.enumValues && field.enumValues.length > 0
                            ? field.enumValues
                            : ASPECT_RATIO_OPTIONS
                          ).map((ratio) => (
                            <option key={ratio} value={ratio}>
                              {ratio}
                            </option>
                          ))}
                        </select>
                      ) : isResolutionField(field.key) ? (
                        <select
                          disabled={isSubmitting}
                          value={
                            playgroundForm[field.key] ??
                            (field.enumValues && field.enumValues.length > 0
                              ? field.enumValues[0]
                              : RESOLUTION_OPTIONS[0])
                          }
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {(field.enumValues && field.enumValues.length > 0
                            ? field.enumValues
                            : RESOLUTION_OPTIONS
                          ).map((resolution) => (
                            <option key={resolution} value={resolution}>
                              {resolution}
                            </option>
                          ))}
                        </select>
                      ) : field.enumValues && field.enumValues.length > 0 ? (
                        <select
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? field.enumValues[0]}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {field.enumValues.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <select
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? "true"}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : field.key === "prompt" ? (
                        <textarea
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className={`min-h-[120px] w-full rounded-md border bg-white px-3 py-2 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03] ${
                            validationErrors[field.key] ? "border-[#D94A38]" : "border-black/[0.1]"
                          }`}
                          placeholder="Describe what to generate..."
                        />
                      ) : field.type === "array" ? (
                        <textarea
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className={`min-h-[88px] w-full rounded-md border bg-white px-3 py-2 font-mono text-xs text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03] ${
                            validationErrors[field.key] ? "border-[#D94A38]" : "border-black/[0.1]"
                          }`}
                          placeholder="One value per line, comma-separated, or a JSON array"
                        />
                      ) : (
                        <input
                          disabled={isSubmitting}
                          type={field.type === "number" ? "number" : "text"}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className={`h-10 w-full rounded-md border bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03] ${
                            validationErrors[field.key] ? "border-[#D94A38]" : "border-black/[0.1]"
                          }`}
                          placeholder={field.type === "number" ? "0" : `Enter ${field.label}`}
                        />
                      )}
                      {validationErrors[field.key] ? (
                        <p className="mt-1 text-[11px] text-[#B54432]">{validationErrors[field.key]}</p>
                      ) : null}
                    </label>
                  ))
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={isSubmitting || !selectedModel}
                  onClick={submitPlayground}
                  className="h-11 w-full rounded-md bg-[#1F8A4C] px-4 text-sm font-medium text-white transition-colors hover:bg-[#176D3D] disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:w-auto"
                >
                  {isSubmitting ? "Generating..." : `Generate ${priceTag ? `(${priceTag})` : ""}`}
                </button>
                {taskId ? <span className="min-w-0 truncate text-xs text-black/45">Task: {taskId}</span> : null}
              </div>
            </section>

            <section className="flex min-h-[300px] flex-col rounded-lg border border-black/[0.08] bg-[#FAFAFA] p-3 sm:min-h-[360px] sm:rounded-xl sm:p-4">
              <div className="mb-3 grid gap-2 sm:flex sm:items-center sm:justify-between">
                <h3 className="text-sm font-medium text-black">Output</h3>
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  {playgroundImageAssets.length > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        downloadImage(
                          playgroundImageAssets[0].url,
                          `${slugifyPathPart(selectedModel?.publicModel || "generated-image")}-1.png`,
                          playgroundImageAssets[0].mimeType
                        )
                      }
                      className="inline-flex h-8 items-center gap-1 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03] sm:h-7"
                    >
                      <Download className="size-3.5" />
                      <span className="hidden sm:inline">Download image</span>
                      <span className="sm:hidden">Download</span>
                    </button>
                  ) : null}
                  {playgroundOutput ? (
                    <button
                      type="button"
                      onClick={() => setResultModalOpen(true)}
                      className="h-8 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03] sm:h-7"
                    >
                      Result JSON
                    </button>
                  ) : null}
                  <div className="min-w-0 text-xs capitalize text-black/60">Status: {taskStatusLabel(taskStatus)}</div>
                </div>
              </div>
              {playgroundError ? (
                <div className="flex min-h-[220px] flex-1 items-center sm:min-h-[280px]">
                  <div className="w-full">
                    <p className="w-full whitespace-pre-wrap break-all rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {playgroundError}
                    </p>
                    {playgroundErrorDetail ? (
                      <div className="mt-2 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setDetailModalOpen(true)}
                          className="text-xs text-black/55 underline underline-offset-2 hover:text-black"
                        >
                          Error Detail
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : isSubmitting ? (
                <div className="flex min-h-[220px] flex-1 flex-col items-center justify-center rounded-md border border-black/[0.08] bg-white sm:min-h-[280px]">
                  <span className="inline-flex size-7 animate-spin rounded-full border-2 border-[#E7E0D3] border-t-[#E58A35]" />
                  <p className="mt-3 text-sm font-medium text-black">Generating...</p>
                  <p className="mt-1 text-xs text-black/55">{taskStatusLabel(taskStatus)}</p>
                </div>
              ) : playgroundOutput ? (
                <div className="space-y-3">
                  {playgroundImageAssets.length > 0 ? (
                    <div className="grid gap-2">
                      {playgroundImageAssets.map((asset, index) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={`${asset.url}-${index}`}
                          src={buildDisplayImageUrl(asset.url)}
                          alt={`Generated result ${index + 1}`}
                          className="max-h-[70vh] w-full rounded-md border border-black/[0.08] bg-white object-contain"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-md border border-black/[0.08] bg-white px-4 sm:min-h-[280px]">
                  <p className="text-center text-sm text-black/55">
                    {`Submit ${modelSlugTail} to preview result here.`}
                  </p>
                </div>
              )}
            </section>
          </div>
        ) : (
          <ApiQuickstartCard
            models={visibleRows}
            initialModel={effectiveModelSlug}
            gatewayErrorDocs={gatewayErrorDocs}
          />
        )}
        </div>
      </section>

      {mainTab === "playground" && showcaseItems.length > 0 ? (
        <section className="rounded-xl border border-black/[0.08] bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="mb-3">
              <h2 className="text-base font-semibold text-black">Examples</h2>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:items-start">
              {showcaseItems.map((item, index) => (
                <div
                  key={`${item.url}-${index}`}
                  className="relative aspect-square w-full overflow-hidden rounded-md border border-black/[0.08] bg-[#FAFAFA] sm:h-24 sm:w-24"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildDisplayImageUrl(item.url)}
                    alt={`${selectedModel?.displayName ?? "Model"} example ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => openModelWithPrompt(item.prompt)}
                    className="absolute bottom-1 right-1 inline-flex h-5 items-center justify-center rounded-sm border border-white/40 bg-black/45 px-1.5 text-[10px] font-medium text-white transition-colors hover:bg-black/60"
                  >
                    Go try
                  </button>
                </div>
              ))}
            </div>
          </section>
      ) : null}

      {mainTab === "playground" && relatedModels.length > 0 ? (
        <section className="rounded-xl border border-black/[0.08] bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="mb-3">
            <h2 className="text-base font-semibold text-black">Related Models</h2>
            <p className="mt-1 text-xs text-black/55">
              More models from {selectedProvider || "this vendor"} that you can switch to quickly.
            </p>
          </div>
          <div
            className="grid gap-2.5"
            style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
          >
            {relatedModels.map((model) => {
              const active = model.publicModel === selectedModel?.publicModel;
              return (
                <button
                  key={model.publicModel}
                  type="button"
                  onClick={() => handleModelChange(model.publicModel)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? "border-[#E58A35] bg-[#FFF8EC]"
                      : "border-black/[0.08] bg-[#FCFCFA] hover:border-[#E7C89A] hover:bg-[#FFFBF4]"
                  }`}
                >
                  <div className="text-[13px] font-medium leading-5 text-black">{model.displayName}</div>
                  <div className="mt-0.5 line-clamp-2 text-[11px] leading-4.5 text-black/55">
                    {model.modelDescription || model.upstreamModelSlug || model.publicModel}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1">
                    <span className="rounded-sm bg-white px-1.5 py-0.5 text-[10px] text-black/60">
                      {model.modelTypeLabel || "model"}
                    </span>
                    {model.priceLabel ? (
                      <span className="rounded-sm bg-[#EAF7ED] px-1.5 py-0.5 text-[10px] font-medium text-[#245C31]">
                        {model.priceLabel}
                      </span>
                    ) : null}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {mainTab === "playground" && selectedModel?.readmeMarkdown?.trim() ? (
        looksLikeHtmlDocument(selectedModel.readmeMarkdown) ? (
          <HtmlReadme html={selectedModel.readmeMarkdown} />
        ) : (
          <MarkdownReadme markdown={selectedModel.readmeMarkdown} />
        )
      ) : null}
        </div>
      </div>

      {detailModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">Error Detail</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyErrorDetail}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  {detailCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalOpen(false)}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto whitespace-pre-wrap break-all rounded-md border border-black/[0.08] bg-[#FAFAFA] p-3 text-xs text-black/80">
              {formatDetailText(playgroundErrorDetail)}
            </pre>
          </div>
        </div>
      ) : null}

      {resultModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-black">Result JSON</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyResultJson}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  {resultCopied ? "Copied" : "Copy"}
                </button>
                <button
                  type="button"
                  onClick={() => setResultModalOpen(false)}
                  className="h-7 rounded border border-black/[0.12] px-2 text-xs text-black/70 hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="max-h-[65vh] overflow-auto rounded-md border border-black/[0.08] bg-[#FAFAFA] p-3 text-xs text-black/80">
              {formatDetailText(playgroundOutput)}
            </pre>
          </div>
        </div>
      ) : null}

      {authRequiredModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/[0.1] bg-white p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-black">Sign in required</h4>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Please sign in before starting a generation task. Playground usage is billed to your own workspace.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAuthRequiredModalOpen(false)}
                className="h-9 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const nextPath =
                    typeof window !== "undefined"
                      ? `${window.location.pathname}${window.location.search}`
                      : pathname;
                  router.push(`/login?next=${encodeURIComponent(nextPath)}`);
                }}
                className="h-9 rounded bg-black px-3 text-xs font-medium text-white hover:bg-black/85"
              >
                Sign in
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {topUpRequiredModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/[0.1] bg-white p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-black">Balance required</h4>
            <p className="mt-2 text-sm leading-6 text-black/60">
              Your wallet balance is insufficient for this generation. Add balance in the dashboard and then try again.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTopUpRequiredModalOpen(false)}
                className="h-9 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="h-9 rounded bg-black px-3 text-xs font-medium text-white hover:bg-black/85"
              >
                Go to dashboard
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </section>
  );
}
