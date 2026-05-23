"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode, SyntheticEvent } from "react";
import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, CircleHelp, Copy, Download, X } from "lucide-react";
import type {
  GatewayErrorDocRow,
  ModelDocRow,
  PlaygroundPromptComposerConfig,
} from "../models/data";
import { ApiQuickstartCard } from "@/app/dashboard/api-quickstart-card";
import { PUBLIC_API_BASE_URL } from "@/lib/api-docs";
import { normalizeGatewayFileAssetUrl } from "@/lib/asset-urls";

type JsonSchemaField = {
  key: string;
  label: string;
  type: "string" | "number" | "boolean" | "array";
  required: boolean;
  description?: string;
  exposedToCustomer: boolean;
  enumValues?: string[];
  minimum?: number;
  maximum?: number;
  step?: number;
  maxItems?: number;
};

type PlaygroundUpload = {
  url: string;
  name: string;
  mimeType: string;
  size: number;
  characterCount?: number;
  extractionSource?: string;
};

type PlaygroundHistoryImage = {
  url: string;
  mimeType: string;
  prompt: string | null;
  createdAt: string;
  requestId: string;
};

type PreviewImageState = {
  url: string;
  name: string;
  mimeType?: string;
};

type PlaygroundDocumentSentenceScore = {
  text: string;
  score?: number;
  length?: number;
};

type PlaygroundDocumentAnalysisResult = {
  status?: string;
  humanScore?: number;
  readabilityScore?: number;
  creditsUsed?: number;
  creditsRemaining?: number;
  language?: string;
  version?: string;
  inputType?: string;
  attackDetected?: {
    homoglyphAttack?: boolean;
    zeroWidthSpace?: boolean;
  };
  sentences: PlaygroundDocumentSentenceScore[];
};

type MaskEditorState = {
  fieldKey: string;
  fieldLabel: string;
  sourceFieldLabel: string;
  sourceUpload: PlaygroundUpload;
};

type UploadFieldKind = "image" | "video" | "audio" | "document";

type TaskStatus =
  | "idle"
  | "submitting"
  | "queued"
  | "processing"
  | "succeeded"
  | "failed";

type PromptComposerSelectionMap = Record<string, string>;

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

function buildPromptFromComposer(
  composer: PlaygroundPromptComposerConfig | null,
  defaultPrompt: string | null,
  selectedValues: PromptComposerSelectionMap
) {
  if (!composer) return "";

  const optionGroups = Array.isArray(composer.optionGroups) ? composer.optionGroups : [];
  const sourceLines =
    Array.isArray(composer.basePrompt) && composer.basePrompt.length > 0
      ? composer.basePrompt
      : [
          "{default_prompt}",
          ...optionGroups.map((group) => `{${group.key}_block}`),
          "{negative_block}",
        ];
  const replacements = new Map<string, string>();
  replacements.set("default_prompt", defaultPrompt?.trim() || "");
  replacements.set("negative_block", composer.negativePrompt?.trim() || "");

  for (const group of optionGroups) {
    const selectedValue = selectedValues[group.key];
    const selectedOption =
      group.options.find((option) => option.value === selectedValue) ?? group.options[0] ?? null;
    replacements.set(`${group.key}_block`, selectedOption?.promptBlock?.trim() || "");
  }

  return sourceLines
    .map((line) =>
      String(line ?? "")
        .replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, token) => replacements.get(token) ?? "")
        .trim()
    )
    .filter((line) => line.length > 0)
    .join("\n");
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

function taskStatusClass(status: TaskStatus) {
  if (status === "succeeded") return "border-[#B7E4C7] bg-[#ECFDF3] text-[#166534]";
  if (status === "failed") return "border-[#F2B8B5] bg-[#FEF2F2] text-[#B42318]";
  if (status === "queued" || status === "processing" || status === "submitting") {
    return "border-[#BAE6FD] bg-[#F0F9FF] text-[#0369A1]";
  }
  return "border-black/[0.08] bg-white text-black/55";
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
          className="text-[#0369A1] underline underline-offset-4"
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

function ReadmeSeoHeading({
  eyebrow,
  heading,
  intro,
}: {
  eyebrow: string;
  heading: string;
  intro: string;
}) {
  return (
    <div className="mb-5 border-b border-black/[0.08] pb-5">
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0369A1]">{eyebrow}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black sm:text-4xl">{heading}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-black/62">{intro}</p>
    </div>
  );
}

function HtmlReadme({
  html,
  seoHeading,
}: {
  html: string;
  seoHeading?: { eyebrow: string; heading: string; intro: string };
}) {
  const sanitizedHtml = useMemo(() => sanitizeReadmeHtml(html), [html]);

  if (!sanitizedHtml) return null;

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
      {seoHeading ? <ReadmeSeoHeading {...seoHeading} /> : null}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-black">README</h2>
        <p className="mt-1 text-sm text-black/55">
          Supplemental model documentation for search indexing and user context.
        </p>
      </div>
      <article
        className="readme-html space-y-4 text-[15px] leading-7 text-black/75 [&_a]:text-[#0369A1] [&_a]:underline [&_a]:underline-offset-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#38BDF8] [&_blockquote]:bg-[#F0F9FF] [&_blockquote]:px-4 [&_blockquote]:py-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-black/[0.05] [&_code]:px-1 [&_code]:py-0.5 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight [&_h1]:text-black [&_h2]:pt-2 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-black [&_h3]:pt-1 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-black [&_li]:my-1 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:border [&_pre]:border-black/[0.08] [&_pre]:bg-[#111827] [&_pre]:px-4 [&_pre]:py-4 [&_pre]:text-sm [&_pre]:leading-6 [&_pre]:text-white/90 [&_strong]:font-semibold [&_strong]:text-black [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5"
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

function MarkdownReadme({
  markdown,
  seoHeading,
}: {
  markdown: string;
  seoHeading?: { eyebrow: string; heading: string; intro: string };
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  if (blocks.length === 0) return null;

  return (
    <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
      {seoHeading ? <ReadmeSeoHeading {...seoHeading} /> : null}
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
                className="border-l-4 border-[#38BDF8] bg-[#F0F9FF] px-4 py-3 italic text-black/70"
              >
                {renderMultilineText(block.text, `quote-${index}`)}
              </blockquote>
            );
          }

          if (block.type === "list") {
            return (
              <ul key={index} className="list-disc space-y-2 pl-5 marker:text-[#0369A1]">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>{renderInlineMarkdown(item, `list-${index}-${itemIndex}`)}</li>
                ))}
              </ul>
            );
          }

          if (block.type === "ordered-list") {
            return (
              <ol key={index} className="list-decimal space-y-2 pl-5 marker:text-[#0369A1]">
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

function MarkdownChatMessage({
  markdown,
  messageId,
  copiedCodeBlockId,
  onCopyCodeBlock,
}: {
  markdown: string;
  messageId: string;
  copiedCodeBlockId: string | null;
  onCopyCodeBlock: (codeBlockId: string, code: string) => void;
}) {
  const blocks = useMemo(() => parseMarkdownBlocks(markdown), [markdown]);

  if (blocks.length === 0) {
    return <div className="whitespace-pre-wrap break-words">{markdown}</div>;
  }

  return (
    <div className="space-y-3 text-[15px] leading-7 text-slate-800">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          if (block.level === 1) {
            return (
              <h2 key={index} className="text-2xl font-semibold tracking-tight text-slate-950">
                {renderInlineMarkdown(block.text, `chat-heading-${index}`)}
              </h2>
            );
          }
          if (block.level === 2) {
            return (
              <h3 key={index} className="text-xl font-semibold tracking-tight text-slate-950">
                {renderInlineMarkdown(block.text, `chat-heading-${index}`)}
              </h3>
            );
          }
          return (
            <h4 key={index} className="text-lg font-semibold text-slate-900">
              {renderInlineMarkdown(block.text, `chat-heading-${index}`)}
            </h4>
          );
        }

        if (block.type === "blockquote") {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-slate-300 pl-4 italic text-slate-600"
            >
              {renderMultilineText(block.text, `chat-quote-${index}`)}
            </blockquote>
          );
        }

        if (block.type === "list") {
          return (
            <ul key={index} className="list-disc space-y-1 pl-5 marker:text-slate-500">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item, `chat-list-${index}-${itemIndex}`)}</li>
              ))}
            </ul>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index} className="list-decimal space-y-1 pl-5 marker:text-slate-500">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInlineMarkdown(item, `chat-olist-${index}-${itemIndex}`)}</li>
              ))}
            </ol>
          );
        }

        if (block.type === "table") {
          return (
            <div key={index} className="overflow-x-auto rounded-lg border border-slate-200 bg-white/70">
              <table className="min-w-full border-collapse text-left text-sm text-slate-700">
                <thead className="bg-slate-50/90">
                  <tr>
                    {block.headers.map((header, headerIndex) => (
                      <th
                        key={headerIndex}
                        className="border-b border-slate-200 px-3 py-2 font-semibold text-slate-900"
                      >
                        {renderInlineMarkdown(header, `chat-thead-${index}-${headerIndex}`)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-b border-slate-100 last:border-b-0">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 align-top">
                          {renderInlineMarkdown(cell, `chat-tbody-${index}-${rowIndex}-${cellIndex}`)}
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
          const codeBlockId = `${messageId}-code-${index}`;
          return (
            <div key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
              <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
                <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
                  {block.language || "code"}
                </div>
                <button
                  type="button"
                  onClick={() => onCopyCodeBlock(codeBlockId, block.code)}
                  className="inline-flex h-7 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {copiedCodeBlockId === codeBlockId ? (
                    <Check className="size-3.5" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copiedCodeBlockId === codeBlockId ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="overflow-x-auto px-4 py-4 text-sm leading-6 text-slate-100">
                <code>{block.code}</code>
              </pre>
            </div>
          );
        }

        return (
          <p key={index} className="text-[15px] leading-7 text-slate-800">
            {renderMultilineText(block.text, `chat-paragraph-${index}`)}
          </p>
        );
      })}
    </div>
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
        className="inline-flex size-4 items-center justify-center rounded-full text-black/35 outline-none transition-colors hover:text-[#0369A1] focus-visible:text-[#0369A1]"
      >
        <CircleHelp className="size-3.5" />
      </button>
      <span className="pointer-events-none absolute left-full top-1/2 z-20 ml-2 hidden w-56 -translate-y-1/2 rounded-lg border border-black/[0.08] bg-[#111827] px-2.5 py-2 text-[11px] leading-5 text-white shadow-xl group-hover:block group-focus-within:block">
        {text}
      </span>
    </span>
  );
}

function readOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
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
          minimum: readOptionalNumber(row.minimum ?? row.min),
          maximum: readOptionalNumber(row.maximum ?? row.max),
          step: readOptionalNumber(row.step),
          maxItems: readOptionalNumber(row.maxItems ?? row.max_items),
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
        minimum: readOptionalNumber(propertySchema.minimum ?? propertySchema.min),
        maximum: readOptionalNumber(propertySchema.maximum ?? propertySchema.max),
        step: readOptionalNumber(propertySchema.step),
        maxItems: readOptionalNumber(propertySchema.maxItems ?? propertySchema.max_items),
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

const RESOLUTION_OPTIONS = ["480p", "720p", "1080p", "1440p", "2160p", "1k", "2k", "3k", "4k"];
const PLAYGROUND_POLL_TIMEOUT_MS = 30 * 60 * 1000;
const PLAYGROUND_POLL_INTERVAL_MS = 1800;

function isAspectRatioEnum(values?: string[]) {
  if (!values || values.length === 0) return false;
  return values.every((value) => /^\d+:\d+$/.test(value));
}

function isResolutionField(key: string) {
  return key.trim().toLowerCase() === "resolution";
}

function splitFieldPath(key: string) {
  return key
    .split(".")
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function getFieldLeafKey(key: string) {
  const segments = splitFieldPath(key);
  return (segments[segments.length - 1] ?? key).trim().toLowerCase();
}

function setNestedValue(target: Record<string, unknown>, path: string, value: unknown) {
  const segments = splitFieldPath(path);
  if (segments.length === 0) return;
  if (segments.length === 1) {
    target[segments[0]] = value;
    return;
  }

  let current: Record<string, unknown> = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const existing = current[segment];
    if (!existing || typeof existing !== "object" || Array.isArray(existing)) {
      current[segment] = {};
    }
    current = current[segment] as Record<string, unknown>;
  }

  current[segments[segments.length - 1]] = value;
}

function isImageUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  if (["num_images", "number_of_images", "image_count", "n_images"].includes(leafKey)) return false;
  return (
    leafKey === "images" ||
    leafKey === "image" ||
    leafKey === "face_image" ||
    leafKey === "source_image" ||
    leafKey === "target_image" ||
    leafKey === "input_image" ||
    leafKey === "reference_image" ||
    leafKey === "init_image" ||
    leafKey === "mask_image" ||
    leafKey === "image_url" ||
    leafKey === "reference_url" ||
    leafKey === "mask_url" ||
    leafKey.endsWith("_image") ||
    leafKey.endsWith("_images") ||
    key.endsWith(".image_url") ||
    key.endsWith(".reference_url") ||
    key.endsWith(".mask_url")
  );
}

function isMaskUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  return leafKey === "mask" || leafKey === "mask_image" || leafKey === "mask_url";
}

function isReferenceImageUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  return leafKey === "reference_image" || leafKey === "reference_url";
}

function isEditableBaseImageField(field: JsonSchemaField) {
  if (!isImageUploadField(field)) return false;
  if (isMaskUploadField(field) || isReferenceImageUploadField(field) || isFaceImageField(field)) {
    return false;
  }
  return true;
}

function isVideoUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "video" ||
    leafKey === "videos" ||
    leafKey === "reference_video" ||
    leafKey === "reference_videos" ||
    leafKey === "source_video" ||
    leafKey === "input_video" ||
    leafKey === "target_video" ||
    leafKey === "video_url" ||
    leafKey.endsWith("_video") ||
    leafKey.endsWith("_videos")
  );
}

function isAudioUploadField(field: JsonSchemaField) {
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "audio" ||
    leafKey === "audios" ||
    leafKey === "reference_audio" ||
    leafKey === "reference_audios" ||
    leafKey === "source_audio" ||
    leafKey === "input_audio" ||
    leafKey === "target_audio" ||
    leafKey === "audio_url" ||
    leafKey.endsWith("_audio") ||
    leafKey.endsWith("_audios")
  );
}

function isDocumentUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  const leafKey = getFieldLeafKey(field.key);
  if (field.type === "boolean") return false;
  return (
    leafKey === "file" ||
    leafKey === "document" ||
    leafKey === "file_url" ||
    leafKey === "document_url" ||
    key.endsWith(".file") ||
    key.endsWith(".document") ||
    key.endsWith(".file_url") ||
    key.endsWith(".document_url") ||
    leafKey.endsWith("_file") ||
    leafKey.endsWith("_document")
  );
}

function getUploadFieldKind(field: JsonSchemaField): UploadFieldKind | null {
  if (isImageUploadField(field)) return "image";
  if (isVideoUploadField(field)) return "video";
  if (isAudioUploadField(field)) return "audio";
  if (isDocumentUploadField(field)) return "document";
  return null;
}

function isUploadField(field: JsonSchemaField) {
  return getUploadFieldKind(field) !== null;
}

function normalizeImageFieldKey(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isFaceImageField(field: JsonSchemaField) {
  const normalized = normalizeImageFieldKey(field.key);
  return normalized === "faceimage" || normalized.includes("face");
}

function canUseHistoryImageForField(field: JsonSchemaField) {
  if (!isImageUploadField(field)) return false;
  const normalized = normalizeImageFieldKey(field.key);
  if (!normalized) return false;
  return !["faceimage", "maskimage"].includes(normalized);
}

function isSingleBaseImageSlotField(field: JsonSchemaField) {
  return normalizeImageFieldKey(field.key) === "images";
}

function pickPlaygroundExampleForField(
  field: JsonSchemaField,
  examples: ModelDocRow["playgroundInputExamples"]
) {
  const normalizedFieldKey = normalizeImageFieldKey(field.key);
  const exact = examples.find((item) => normalizeImageFieldKey(item.fieldKey) === normalizedFieldKey);
  if (exact) return exact;
  if (isFaceImageField(field)) return null;
  return examples.find((item) => item.fieldKey === null) ?? null;
}

function isMultipleUploadField(field: JsonSchemaField) {
  const key = field.key.trim().toLowerCase();
  return (
    field.type === "array" ||
    key === "images" ||
    key === "videos" ||
    key === "audios" ||
    key.endsWith("_images") ||
    key.endsWith("_videos") ||
    key.endsWith("_audios")
  );
}

function getUploadLimit(field: JsonSchemaField) {
  const configuredMaxItems =
    typeof field.maxItems === "number" && Number.isFinite(field.maxItems)
      ? Math.max(1, Math.floor(field.maxItems))
      : null;
  if (configuredMaxItems !== null) {
    return configuredMaxItems;
  }
  return isMultipleUploadField(field) ? null : 1;
}

function getUploadAccept(kind: UploadFieldKind) {
  if (kind === "video") return "video/mp4,video/webm,video/quicktime";
  if (kind === "audio") return "audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/aac,audio/ogg,audio/webm";
  if (kind === "document") return "application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  return "image/png,image/jpeg,image/webp,image/gif";
}

function getUploadHelpText(kind: UploadFieldKind) {
  if (kind === "video") {
    return "Upload MP4, WebM, or MOV videos. They are converted to secure URLs before submission.";
  }
  if (kind === "audio") {
    return "Upload MP3, WAV, M4A, AAC, OGG, or WebM audio. They are converted to secure URLs before submission.";
  }
  if (kind === "document") {
    return "Upload DOC or DOCX files. They are converted to secure URLs before submission.";
  }
  return "Upload PNG, JPEG, WebP, or GIF images. They are converted to secure URLs before submission.";
}

function appendUploadLimitText(baseText: string, field: JsonSchemaField) {
  const limit = getUploadLimit(field);
  if (limit === null) {
    return baseText;
  }
  return `${baseText} Max ${limit} file${limit === 1 ? "" : "s"}.`;
}

function getUploadTitle(kind: UploadFieldKind) {
  if (kind === "video") return "video";
  if (kind === "audio") return "audio";
  if (kind === "document") return "document";
  return "image";
}

function isSliderNumberField(field: JsonSchemaField) {
  return field.type === "number" && field.minimum !== undefined && field.maximum !== undefined;
}

function buildNumberSelectOptions(field: JsonSchemaField) {
  if (field.minimum === undefined || field.maximum === undefined) return [];
  const step = field.step && field.step > 0 ? field.step : 1;
  const start = Math.min(field.minimum, field.maximum);
  const end = Math.max(field.minimum, field.maximum);
  const options: string[] = [];
  for (let value = start; value <= end + step / 1000; value += step) {
    options.push(Number(value.toFixed(8)).toString());
    if (options.length >= 200) break;
  }
  return options.length > 0 ? options : [String(field.minimum)];
}

function ModelContentSkeleton() {
  const block = (className: string) => <div className={`animate-pulse rounded bg-black/[0.06] ${className}`} />;

  return (
    <div className="space-y-4">
      <section className="min-w-0 max-w-full rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm sm:rounded-2xl sm:p-3">
        <div className="mb-3 rounded-lg border border-black/[0.08] bg-[#F6F8FB] p-1">
          <div className="grid grid-cols-2 gap-1">
            {block("h-10 rounded-md")}
            {block("h-10 rounded-md")}
          </div>
        </div>
        <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
          <section className="rounded-lg border border-black/[0.08] bg-white p-3 sm:rounded-xl sm:p-4">
            {block("mb-3 h-5 w-16")}
            <div className="space-y-3">
              <div>
                {block("mb-2 h-3 w-20")}
                {block("h-12 w-full")}
              </div>
              <div>
                {block("mb-2 h-3 w-24")}
                {block("h-28 w-full")}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {block("h-12 w-full")}
                {block("h-12 w-full")}
              </div>
              {block("h-11 w-full")}
            </div>
          </section>
          <section className="rounded-lg border border-black/[0.08] bg-[#FAFAFA] p-3 sm:rounded-xl sm:p-4">
            <div className="flex items-center justify-between gap-3">
              {block("h-5 w-16")}
              {block("h-7 w-28")}
            </div>
            {block("mt-3 min-h-[280px] w-full")}
          </section>
        </div>
      </section>
      <section className="rounded-xl border border-black/[0.08] bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
        {block("mb-3 h-5 w-24")}
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-24 w-24 shrink-0 animate-pulse rounded-md bg-black/[0.06]" />
          ))}
        </div>
      </section>
      <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
        {block("h-4 w-24")}
        {block("mt-3 h-8 w-full max-w-2xl")}
        {block("mt-2 h-4 w-full max-w-4xl")}
        {block("mt-4 h-40 w-full")}
      </section>
    </div>
  );
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

function isBooleanEnabled(value: unknown) {
  return value === true || value === "true";
}

function isBooleanSurchargeEnabled(
  form: Record<string, string>,
  uploads: Record<string, PlaygroundUpload[]>,
  surchargeName: string
) {
  if (isBooleanEnabled(form[surchargeName])) {
    return true;
  }

  const aliases =
    surchargeName === "hasAudio"
      ? [
          "hasAudio",
          "has_audio",
          "withAudio",
          "with_audio",
          "generateAudio",
          "generate_audio",
          "includeAudio",
          "include_audio",
        ]
      : surchargeName === "hasReferenceVideos"
        ? [
            "hasReferenceVideos",
            "has_reference_videos",
            "useReferenceVideos",
            "use_reference_videos",
          ]
        : [surchargeName];

  if (aliases.some((key) => isBooleanEnabled(form[key]))) {
    return true;
  }

  if (surchargeName === "hasReferenceVideos") {
    return [
      "referenceVideos",
      "reference_videos",
      "referenceVideoUrls",
      "reference_video_urls",
    ].some((key) => (uploads[key] ?? []).length > 0);
  }

  return false;
}

function isValidEnumValue(value: string | undefined, enumValues?: string[]) {
  if (!enumValues || enumValues.length === 0) return true;
  return typeof value === "string" && enumValues.includes(value);
}

function findMatchingPriceTier(
  tiers: ModelDocRow["priceTiers"],
  resolution: string,
  quality: string,
  duration: string,
  hasReferenceVideos: string,
  hasAudio: string
) {
  const normalizedResolution = resolution || "default";
  const normalizedQuality = quality || "default";
  const normalizedDuration = duration || "default";
  const normalizedHasReferenceVideos = hasReferenceVideos || "default";
  const normalizedHasAudio = hasAudio || "default";
  const candidates = [
    (tier: ModelDocRow["priceTiers"][number]) =>
      tier.resolution === normalizedResolution &&
      tier.quality === normalizedQuality &&
      (tier.duration ?? "default") === normalizedDuration &&
      (tier.hasReferenceVideos ?? "default") === normalizedHasReferenceVideos &&
      (tier.hasAudio ?? "default") === normalizedHasAudio,
    (tier: ModelDocRow["priceTiers"][number]) =>
      tier.resolution === normalizedResolution &&
      tier.quality === normalizedQuality &&
      (tier.duration ?? "default") === normalizedDuration &&
      (tier.hasReferenceVideos ?? "default") === normalizedHasReferenceVideos,
    (tier: ModelDocRow["priceTiers"][number]) =>
      tier.resolution === normalizedResolution &&
      tier.quality === normalizedQuality &&
      (tier.duration ?? "default") === normalizedDuration,
    (tier: ModelDocRow["priceTiers"][number]) =>
      tier.resolution === normalizedResolution && tier.quality === "default",
    (tier: ModelDocRow["priceTiers"][number]) =>
      tier.resolution === "default" && tier.quality === normalizedQuality,
    (tier: ModelDocRow["priceTiers"][number]) => tier.resolution === normalizedResolution,
    (tier: ModelDocRow["priceTiers"][number]) => tier.quality === normalizedQuality,
  ];

  for (const predicate of candidates) {
    const tier = tiers.find(predicate);
    if (tier) return tier;
  }

  return tiers[0] ?? null;
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
  const normalizedGatewayFileUrl = normalizeGatewayFileAssetUrl(src);
  if (normalizedGatewayFileUrl !== src) {
    return normalizedGatewayFileUrl;
  }
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

type PlaygroundImageAsset = {
  url: string;
  mimeType?: string;
};

type PlaygroundVideoAsset = {
  url: string;
  mimeType?: string;
};

type ChatPlaygroundMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  taskId?: string | null;
  localId?: string;
  pending?: boolean;
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

function extractVideoAssets(output: unknown): PlaygroundVideoAsset[] {
  if (!isRecord(output)) return [];
  const assets: PlaygroundVideoAsset[] = [];
  const seen = new Set<string>();
  const pushAsset = (candidate: unknown, mimeType?: unknown) => {
    if (typeof candidate !== "string") return;
    const resolved = candidate.trim();
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
    if (item.type && item.type !== "video") continue;
    pushAsset(item.url, item.mimeType);
  }

  if (assets.length === 0) {
    pushAsset(output.url, output.mimeType);
  }

  return assets;
}

function extractTextOutput(output: unknown): string | null {
  if (!isRecord(output)) return null;
  const candidates = [output.text, output.caption, output.description, output.output];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return null;
}

function extractDocumentAnalysis(output: unknown): PlaygroundDocumentAnalysisResult | null {
  if (!isRecord(output)) return null;
  const score = isRecord(output.score) ? output.score : null;
  if (!score) return null;

  const sentences = Array.isArray(score.sentences)
    ? score.sentences.flatMap((item) => {
        if (!isRecord(item) || typeof item.text !== "string" || item.text.trim().length === 0) {
          return [];
        }
        return [
          {
            text: item.text.trim(),
            ...(typeof item.score === "number" ? { score: item.score } : {}),
            ...(typeof item.length === "number" ? { length: item.length } : {}),
          },
        ];
      })
    : [];

  const attackDetected = isRecord(score.attack_detected)
    ? {
        ...(typeof score.attack_detected.homoglyph_attack === "boolean"
          ? { homoglyphAttack: score.attack_detected.homoglyph_attack }
          : {}),
        ...(typeof score.attack_detected.zero_width_space === "boolean"
          ? { zeroWidthSpace: score.attack_detected.zero_width_space }
          : {}),
      }
    : undefined;

  return {
    ...(typeof output.status === "string" ? { status: output.status } : {}),
    ...(typeof score.human_score === "number" ? { humanScore: score.human_score } : {}),
    ...(typeof score.readability_score === "number" ? { readabilityScore: score.readability_score } : {}),
    ...(typeof score.credits_used === "number" ? { creditsUsed: score.credits_used } : {}),
    ...(typeof score.credits_remaining === "number" ? { creditsRemaining: score.credits_remaining } : {}),
    ...(typeof score.language === "string" ? { language: score.language } : {}),
    ...(typeof score.version === "string" ? { version: score.version } : {}),
    ...(typeof score.input === "string" ? { inputType: score.input } : {}),
    ...(attackDetected ? { attackDetected } : {}),
    sentences,
  };
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

  const mainTab: "playground" | "api" = searchParams.get("tab") === "api" ? "api" : "playground";
  const [taskStatus, setTaskStatus] = useState<TaskStatus>("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [playgroundError, setPlaygroundError] = useState<string | null>(null);
  const [playgroundErrorDetail, setPlaygroundErrorDetail] = useState<unknown>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCopied, setDetailCopied] = useState(false);
  const [resultModalOpen, setResultModalOpen] = useState(false);
  const [authRequiredModalOpen, setAuthRequiredModalOpen] = useState(false);
  const [topUpRequiredModalOpen, setTopUpRequiredModalOpen] = useState(false);
  const [isRouteSkeletonVisible, setRouteSkeletonVisible] = useState(false);
  const [, startRouteTransition] = useTransition();
  const [resultCopied, setResultCopied] = useState(false);
  const [textOutputCopied, setTextOutputCopied] = useState(false);
  const [copiedChatMessageId, setCopiedChatMessageId] = useState<string | null>(null);
  const [copiedCodeBlockId, setCopiedCodeBlockId] = useState<string | null>(null);
  const [playgroundOutput, setPlaygroundOutput] = useState<unknown>(null);
  const [playgroundForm, setPlaygroundForm] = useState<Record<string, string>>({});
  const [selectedPromptOptions, setSelectedPromptOptions] = useState<PromptComposerSelectionMap>({});
  const [playgroundUploads, setPlaygroundUploads] = useState<Record<string, PlaygroundUpload[]>>({});
  const [chatComposer, setChatComposer] = useState("");
  const [chatConversation, setChatConversation] = useState<ChatPlaygroundMessage[]>([]);
  const [playgroundHistoryImages, setPlaygroundHistoryImages] = useState<PlaygroundHistoryImage[]>([]);
  const [loadingHistoryImages, setLoadingHistoryImages] = useState(false);
  const [deletingHistoryRequestId, setDeletingHistoryRequestId] = useState<string | null>(null);
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<PlaygroundHistoryImage | null>(null);
  const [previewImage, setPreviewImage] = useState<PreviewImageState | null>(null);
  const [maskEditorState, setMaskEditorState] = useState<MaskEditorState | null>(null);
  const [maskEditorBrushSize, setMaskEditorBrushSize] = useState(28);
  const [maskEditorError, setMaskEditorError] = useState<string | null>(null);
  const [maskEditorSaving, setMaskEditorSaving] = useState(false);
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const maskCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const maskDrawingRef = useRef(false);
  const maskLastPointRef = useRef<{ x: number; y: number } | null>(null);
  const promptComposer = selectedModel?.promptComposer ?? null;
  const hasPromptComposer =
    selectedModel?.capability !== "text_generation" &&
    promptComposer !== null &&
    Array.isArray(promptComposer.optionGroups) &&
    promptComposer.optionGroups.length > 0;
  const composedPrompt = useMemo(
    () =>
      buildPromptFromComposer(
        promptComposer,
        selectedModel?.playgroundDefaultPrompt ?? null,
        selectedPromptOptions
      ),
    [promptComposer, selectedModel?.playgroundDefaultPrompt, selectedPromptOptions]
  );
  const playgroundImageAssets = useMemo(
    () => extractImageAssets(playgroundOutput),
    [playgroundOutput]
  );
  const playgroundVideoAssets = useMemo(
    () => extractVideoAssets(playgroundOutput),
    [playgroundOutput]
  );
  const playgroundTextOutput = useMemo(
    () => extractTextOutput(playgroundOutput),
    [playgroundOutput]
  );
  const playgroundDocumentAnalysis = useMemo(
    () => extractDocumentAnalysis(playgroundOutput),
    [playgroundOutput]
  );
  useEffect(() => {
    setPlaygroundForm({});
    setSelectedPromptOptions({});
    setPlaygroundUploads({});
    setChatComposer("");
    setChatConversation([]);
    setPlaygroundHistoryImages([]);
    setMaskEditorState(null);
    setMaskEditorError(null);
    setUploadingFields({});
  }, [effectiveModelSlug]);
  useEffect(() => {
    if (!hasPromptComposer || !promptComposer) {
      setSelectedPromptOptions({});
      return;
    }

    setSelectedPromptOptions((current) => {
      const next: PromptComposerSelectionMap = {};
      let changed = false;
      for (const group of promptComposer.optionGroups) {
        const fallbackValue = group.options[0]?.value ?? "";
        const existingValue = current[group.key];
        const nextValue =
          existingValue && group.options.some((option) => option.value === existingValue)
            ? existingValue
            : fallbackValue;
        next[group.key] = nextValue;
        if (current[group.key] !== nextValue) {
          changed = true;
        }
      }
      if (Object.keys(current).length !== Object.keys(next).length) {
        changed = true;
      }
      return changed ? next : current;
    });
  }, [hasPromptComposer, promptComposer, selectedModel?.publicModel]);
  useEffect(() => {
    if (!hasPromptComposer || !composedPrompt.trim()) return;
    setPlaygroundForm((current) =>
      current.prompt === composedPrompt ? current : { ...current, prompt: composedPrompt }
    );
  }, [composedPrompt, hasPromptComposer]);
  const handleProviderChange = (nextProvider: string) => {
    setRouteSkeletonVisible(true);
    setSelectedProvider(nextProvider);
    const nextRows = rowsByProvider.find(([provider]) => provider === nextProvider)?.[1] ?? [];
    setSelectedModelSlug(nextRows[0]?.publicModel ?? null);
  };

  const handleModelChange = (nextModelSlug: string | null) => {
    setRouteSkeletonVisible(true);
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
    const nextParams = new URLSearchParams();
    const prompt = searchParams.get("prompt")?.trim();
    if (mainTab === "api") {
      nextParams.set("tab", "api");
    } else {
      nextParams.set("tab", "playground");
    }
    if (prompt) {
      nextParams.set("prompt", prompt);
    }
    const nextHref = `/models/${providerSlug}/${modelSlug}${nextParams.toString().length > 0 ? `?${nextParams.toString()}` : ""}`;
    const currentHref = `${pathname}${searchParams.toString().length > 0 ? `?${searchParams.toString()}` : ""}`;
    if (currentHref === nextHref) {
      setRouteSkeletonVisible(false);
      return;
    }
    startRouteTransition(() => {
      router.replace(nextHref, { scroll: false });
    });
  }, [mainTab, pathname, router, searchParams, selectedModel, selectedProvider]);

  const handleMainTabChange = (tab: "playground" | "api") => {
    if (tab === mainTab) return;
    if (!selectedModel || !selectedProvider) return;
    const providerSlug = slugifyPathPart(selectedProvider) || encodeURIComponent(selectedProvider);
    const modelSlug =
      slugifyPathPart(selectedModel.publicModel) || encodeURIComponent(selectedModel.publicModel);
    const params = new URLSearchParams();
    params.set("tab", tab);
    const prompt = searchParams.get("prompt")?.trim();
    if (prompt) {
      params.set("prompt", prompt);
    }
    router.replace(
      `/models/${providerSlug}/${modelSlug}?${params.toString()}`,
      { scroll: false }
    );
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
  const isModelDetailRoute = Boolean(initialProvider && initialModelSlug);
  const pageHeading =
    isModelDetailRoute && selectedModel
      ? `${selectedModel.displayName}${selectedModel.modelTypeLabel ? ` ${selectedModel.modelTypeLabel} model` : " AI model"}`
      : "Explore AI models on OpenOctopus";
  const pageIntro =
    isModelDetailRoute && selectedModel
      ? selectedModel.modelDescription ||
        `${selectedModel.displayName} by ${selectedModel.providerName} with playground access, API examples, and pricing details.`
      : "Browse public AI model tools with playground access, API examples, pricing details, and provider-backed documentation.";
  const seoHeading = {
    eyebrow: isModelDetailRoute && selectedModel ? `${selectedModel.providerName} model tool` : "Model catalog",
    heading: pageHeading,
    intro: pageIntro,
  };
  const parsedFields = useMemo(
    () =>
      parseInputSchemaText(selectedModel?.inputSchemaText ?? "").filter(
        (field) => field.exposedToCustomer
      ),
    [selectedModel?.inputSchemaText]
  );
  const isChatModel = selectedModel?.capability === "text_generation";
  const isDocumentAnalysisModel = selectedModel?.capability === "document_analysis";
  const documentTextField = useMemo(
    () =>
      isDocumentAnalysisModel
        ? parsedFields.find((field) => getFieldLeafKey(field.key) === "text") ?? null
        : null,
    [isDocumentAnalysisModel, parsedFields]
  );
  const documentFileField = useMemo(
    () =>
      isDocumentAnalysisModel
        ? parsedFields.find((field) => {
            const leafKey = getFieldLeafKey(field.key);
            return leafKey === "file" || leafKey === "file_url" || leafKey === "document" || leafKey === "document_url";
          }) ?? null
        : null,
    [isDocumentAnalysisModel, parsedFields]
  );
  const visiblePlaygroundFields = useMemo(() => {
    const nextFields = !isDocumentAnalysisModel
      ? parsedFields
      : parsedFields.filter((field) => {
          const leafKey = getFieldLeafKey(field.key);
          return leafKey === "text" || leafKey === "file" || leafKey === "file_url" || leafKey === "document" || leafKey === "document_url";
        });
    if (!hasPromptComposer) return nextFields;
    return nextFields.filter((field) => getFieldLeafKey(field.key) !== "prompt");
  }, [hasPromptComposer, isDocumentAnalysisModel, parsedFields]);
  const chatConfigFields = useMemo(
    () =>
      parsedFields.filter(
        (field) =>
          field.key !== "messages" &&
          field.key !== "prompt" &&
          !isUploadField(field)
      ),
    [parsedFields]
  );
  const supportsContinuousOperations =
    selectedModel?.allowContinuousOperations === true &&
    parsedFields.some((field) => canUseHistoryImageForField(field));
  const isSubmitting = taskStatus === "submitting" || taskStatus === "queued" || taskStatus === "processing";
  const [documentInputMode, setDocumentInputMode] = useState<"text" | "file">("text");

  useEffect(() => {
    if (!selectedModel?.publicModel || !supportsContinuousOperations) {
      setPlaygroundHistoryImages([]);
      setLoadingHistoryImages(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const loadHistoryImages = async () => {
      setLoadingHistoryImages(true);
      try {
        const response = await fetch(
          `/api/playground/history-images?model=${encodeURIComponent(selectedModel.publicModel)}`,
          {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }
        );
        const payload = (await response.json().catch(() => ({}))) as {
          images?: PlaygroundHistoryImage[];
        };
        if (!response.ok) {
          throw new Error("Failed to load history images");
        }
        if (!cancelled) {
          setPlaygroundHistoryImages(Array.isArray(payload.images) ? payload.images : []);
        }
      } catch {
        if (!cancelled) {
          setPlaygroundHistoryImages([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingHistoryImages(false);
        }
      }
    };

    void loadHistoryImages();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [selectedModel?.publicModel, supportsContinuousOperations]);
  const priceTag = useMemo(() => {
    if (!selectedModel) return "";
    const tiers = selectedModel.priceTiers ?? [];
    const booleanSurchargeTotal = (selectedModel.booleanSurcharges ?? []).reduce(
      (sum, surcharge) =>
        sum + (isBooleanSurchargeEnabled(playgroundForm, playgroundUploads, surcharge.name) ? surcharge.price : 0),
      0
    );
    if (tiers.length === 0) {
      if (selectedModel.primaryPriceValue !== null) {
        const price = formatUsd(selectedModel.primaryPriceValue + booleanSurchargeTotal);
        const unitLabel = selectedModel.primaryPriceLabel?.trim();
        return unitLabel ? `${price} ${unitLabel}` : price;
      }
      return selectedModel.priceLabel || "";
    }
    const resolutionField = parsedFields.find((field) => isResolutionField(field.key));
    const qualityField = parsedFields.find((field) => field.key.trim().toLowerCase() === "quality");
    const durationField = parsedFields.find((field) => {
      const key = field.key.trim().toLowerCase();
      return key === "duration" || key === "duration_seconds" || key === "durationseconds";
    });
    const resolution =
      (resolutionField ? playgroundForm[resolutionField.key] : "") ||
      resolutionField?.enumValues?.[0] ||
      "default";
    const quality =
      (qualityField ? playgroundForm[qualityField.key] : "") ||
      qualityField?.enumValues?.[0] ||
      "default";
    const duration =
      (durationField ? playgroundForm[durationField.key] : "") ||
      durationField?.enumValues?.[0] ||
      "default";
    const hasReferenceVideos = ["referenceVideos", "reference_videos", "referenceVideoUrls", "reference_video_urls"]
      .some((key) => (playgroundUploads[key] ?? []).length > 0)
      ? "true"
      : "false";
    const hasAudio = isBooleanSurchargeEnabled(playgroundForm, playgroundUploads, "hasAudio") ? "true" : "false";
    const tier = findMatchingPriceTier(tiers, resolution, quality, duration, hasReferenceVideos, hasAudio);
    if (!tier) return selectedModel.priceLabel || "";
    const imageCount =
      readPositiveNumber(playgroundForm.num_images) ??
      readPositiveNumber(playgroundForm.n) ??
      1;
    const total = tier.price * imageCount + booleanSurchargeTotal;
    return formatUsd(total);
  }, [parsedFields, playgroundForm, playgroundUploads, selectedModel]);

  useEffect(() => {
    setPlaygroundForm((current) => {
      const next = { ...current };
      let changed = false;

      for (const field of parsedFields) {
        const existing = next[field.key];

        if (field.key === "aspect_ratio") {
          const defaultRatio =
            field.enumValues && field.enumValues.length > 0
              ? field.enumValues[0]
              : ASPECT_RATIO_OPTIONS[0];
          if (!existing || !isValidEnumValue(existing, field.enumValues)) {
            next[field.key] = defaultRatio;
            changed = true;
          }
          continue;
        }

        if (isResolutionField(field.key)) {
          const defaultResolution =
            field.enumValues && field.enumValues.length > 0
              ? field.enumValues[0]
              : RESOLUTION_OPTIONS[0];
          if (!existing || !isValidEnumValue(existing, field.enumValues)) {
            next[field.key] = defaultResolution;
            changed = true;
          }
          continue;
        }

        if (field.enumValues && field.enumValues.length > 0) {
          if (!existing || !isValidEnumValue(existing, field.enumValues)) {
            next[field.key] = field.enumValues[0];
            changed = true;
          }
          continue;
        }

        if (field.type === "boolean") {
          if (existing !== "true" && existing !== "false") {
            next[field.key] = "false";
            changed = true;
          }
          continue;
        }

        if (isSliderNumberField(field)) {
          const options = buildNumberSelectOptions(field);
          const defaultValue = options[0] ?? String(field.minimum);
          const currentNumber = Number(existing);
          if (!existing || !Number.isFinite(currentNumber) || !options.includes(existing)) {
            next[field.key] = defaultValue;
            changed = true;
          }
        }
      }

      return changed ? next : current;
    });
  }, [parsedFields]);

  useEffect(() => {
    const examples = selectedModel?.playgroundInputExamples ?? [];
    const imageFields = parsedFields.filter(isImageUploadField);
    if (imageFields.length === 0) return;
    const latestHistoryImage = playgroundHistoryImages[0] ?? null;
    if (examples.length === 0 && !latestHistoryImage) return;

    setPlaygroundUploads((current) => {
      let changed = false;
      const next = { ...current };
      for (const field of imageFields) {
        const currentUploads = next[field.key] ?? [];
        if (currentUploads.length > 0) continue;
        if (selectedModel?.allowContinuousOperations && canUseHistoryImageForField(field) && loadingHistoryImages) {
          continue;
        }
        if (selectedModel?.allowContinuousOperations && latestHistoryImage && canUseHistoryImageForField(field)) {
          next[field.key] = [
            {
              url: latestHistoryImage.url,
              name: "Recent generated image",
              mimeType: latestHistoryImage.mimeType,
              size: 0,
            },
          ];
          changed = true;
          continue;
        }
        const example = pickPlaygroundExampleForField(field, examples);
        if (!example) continue;
        next[field.key] = [
          {
            url: example.imageUrl,
            name: example.fieldKey ? `Example ${example.fieldKey}` : "Example image",
            mimeType: "image/*",
            size: 0,
          },
        ];
        changed = true;
      }
      return changed ? next : current;
    });
  }, [
    parsedFields,
    loadingHistoryImages,
    playgroundHistoryImages,
    selectedModel?.allowContinuousOperations,
    selectedModel?.playgroundInputExamples,
  ]);

  useEffect(() => {
    if (hasPromptComposer) return;
    const prefillPrompt = searchParams.get("prompt")?.trim();
    const hasPromptField = parsedFields.some((field) => field.key === "prompt");
    const fallbackPrompt = selectedModel?.playgroundDefaultPrompt?.trim() || "";
    const nextPrompt = prefillPrompt || fallbackPrompt;
    if (!nextPrompt) return;
    if (isChatModel) {
      setChatComposer(nextPrompt);
      return;
    }
    if (!hasPromptField) return;
    setPlaygroundForm((current) => {
      if (current.prompt?.trim()) return current;
      return { ...current, prompt: nextPrompt };
    });
  }, [hasPromptComposer, isChatModel, parsedFields, searchParams, selectedModel?.playgroundDefaultPrompt]);

  useEffect(() => {
    if (!isDocumentAnalysisModel) return;
    if (!documentTextField && documentFileField) {
      setDocumentInputMode("file");
      return;
    }
    setDocumentInputMode("text");
  }, [documentFileField, documentTextField, isDocumentAnalysisModel, selectedModel?.publicModel]);

  const inferEndpoint = (capability: string | null | undefined) =>
    capability === "document_analysis"
      ? "/v1/documents/analyses"
      : capability === "image_edit"
      ? "/v1/images/edits"
      : capability === "image_recognition"
        ? "/v1/images/recognitions"
        : capability === "text_generation"
          ? "/v1/chat/completions"
        : capability?.includes("video")
          ? "/v1/videos/generations"
          : "/v1/images/generations";

  const uploadPlaygroundAssets = async (field: JsonSchemaField, files: FileList | null) => {
    const selectedFiles = Array.from(files ?? []);
    if (selectedFiles.length === 0) return;
    const uploadLimit = getUploadLimit(field);
    const isSingleBaseSlot = isSingleBaseImageSlotField(field);

    if (uploadLimit !== null) {
      const existingCount = playgroundUploads[field.key]?.length ?? 0;
      const allowedRemaining = isSingleBaseSlot ? uploadLimit : Math.max(0, uploadLimit - existingCount);
      if (allowedRemaining <= 0) {
        setValidationErrors((current) => ({
          ...current,
          [field.key]: `${field.label} allows at most ${uploadLimit} file${uploadLimit === 1 ? "" : "s"}.`,
        }));
        return;
      }
      if (selectedFiles.length > allowedRemaining) {
        setValidationErrors((current) => ({
          ...current,
          [field.key]: `${field.label} allows at most ${uploadLimit} file${uploadLimit === 1 ? "" : "s"}.`,
        }));
        return;
      }
    }

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
          characterCount?: number;
          extractionSource?: string;
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
          characterCount:
            typeof payload.characterCount === "number" ? payload.characterCount : undefined,
          extractionSource:
            typeof payload.extractionSource === "string" ? payload.extractionSource : undefined,
        });
      }

      setPlaygroundUploads((current) => ({
        ...current,
        [field.key]: isSingleBaseSlot
          ? uploaded.slice(0, 1)
          : isMultipleUploadField(field)
          ? [...(current[field.key] ?? []), ...uploaded]
          : uploaded.slice(0, 1),
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

  const deleteHistoryImage = async () => {
    if (!historyDeleteTarget) return;
    setDeletingHistoryRequestId(historyDeleteTarget.requestId);
    try {
      const response = await fetch("/api/playground/history-images", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestId: historyDeleteTarget.requestId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!response.ok) {
        throw new Error(payload.error?.message ?? "Failed to delete history image");
      }
      setPlaygroundHistoryImages((current) =>
        current.filter((item) => item.requestId !== historyDeleteTarget.requestId)
      );
      setPlaygroundUploads((current) => {
        const next: Record<string, PlaygroundUpload[]> = { ...current };
        for (const field of parsedFields.filter((field) => canUseHistoryImageForField(field))) {
          const uploads = next[field.key] ?? [];
          next[field.key] = uploads.filter((upload) => upload.url !== historyDeleteTarget.url);
        }
        return next;
      });
      setHistoryDeleteTarget(null);
    } catch (error) {
      setValidationErrors((current) => ({
        ...current,
        images: error instanceof Error ? error.message : "Failed to delete history image",
      }));
    } finally {
      setDeletingHistoryRequestId(null);
    }
  };

  const applyHistoryImageToField = (field: JsonSchemaField, image: PlaygroundHistoryImage) => {
    const nextUpload: PlaygroundUpload = {
      url: image.url,
      name: "Recent generated image",
      mimeType: image.mimeType,
      size: 0,
    };

    setPlaygroundUploads((current) => {
      return {
        ...current,
        [field.key]: [nextUpload],
      };
    });

    setValidationErrors((current) => {
      const next = { ...current };
      delete next[field.key];
      return next;
    });
  };

  const resolveMaskSourceForField = (field: JsonSchemaField) => {
    if (!isMaskUploadField(field)) return null;
    const fieldPrefix = splitFieldPath(field.key).slice(0, -1).join(".").toLowerCase();
    const rankedCandidates = parsedFields
      .filter((candidate) => isEditableBaseImageField(candidate) && (playgroundUploads[candidate.key] ?? []).length > 0)
      .map((candidate) => {
        const candidatePrefix = splitFieldPath(candidate.key).slice(0, -1).join(".").toLowerCase();
        const leafKey = getFieldLeafKey(candidate.key);
        let score = 0;
        if (candidatePrefix === fieldPrefix) score += 20;
        if (leafKey === "image_url") score += 10;
        else if (leafKey === "image") score += 9;
        else if (leafKey === "images") score += 8;
        else if (leafKey === "source_image" || leafKey === "input_image" || leafKey === "init_image") score += 7;
        else if (leafKey === "target_image") score += 5;
        else score += 1;
        return { candidate, score };
      })
      .sort((left, right) => right.score - left.score);

    const sourceField = rankedCandidates[0]?.candidate;
    const sourceUpload = sourceField ? playgroundUploads[sourceField.key]?.[0] : null;
    if (!sourceField || !sourceUpload) return null;
    return { sourceField, sourceUpload };
  };

  const resetMaskCanvas = () => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const drawMaskPoint = (x: number, y: number, continueStroke: boolean) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.save();
    context.strokeStyle = "#FFFFFF";
    context.fillStyle = "#FFFFFF";
    context.lineCap = "round";
    context.lineJoin = "round";
    context.lineWidth = maskEditorBrushSize;
    if (continueStroke && maskLastPointRef.current) {
      context.beginPath();
      context.moveTo(maskLastPointRef.current.x, maskLastPointRef.current.y);
      context.lineTo(x, y);
      context.stroke();
    } else {
      context.beginPath();
      context.arc(x, y, Math.max(2, maskEditorBrushSize / 2), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
    maskLastPointRef.current = { x, y };
  };

  const getMaskPointerPosition = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const handleMaskPointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const point = getMaskPointerPosition(event);
    if (!point) return;
    maskDrawingRef.current = true;
    maskLastPointRef.current = null;
    drawMaskPoint(point.x, point.y, false);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleMaskPointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!maskDrawingRef.current) return;
    event.preventDefault();
    const point = getMaskPointerPosition(event);
    if (!point) return;
    drawMaskPoint(point.x, point.y, true);
  };

  const endMaskStroke = () => {
    maskDrawingRef.current = false;
    maskLastPointRef.current = null;
  };

  const handleMaskEditorImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    const image = event.currentTarget;
    const canvas = maskCanvasRef.current;
    if (!canvas) return;
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    resetMaskCanvas();
  };

  const saveMaskDrawing = async () => {
    if (!maskEditorState) return;
    const canvas = maskCanvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      setMaskEditorError("Mask canvas is not ready yet.");
      return;
    }

    setMaskEditorSaving(true);
    setMaskEditorError(null);

    try {
      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = canvas.width;
      exportCanvas.height = canvas.height;
      const exportContext = exportCanvas.getContext("2d");
      if (!exportContext) {
        throw new Error("Failed to prepare mask export.");
      }
      exportContext.fillStyle = "#000000";
      exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
      exportContext.drawImage(canvas, 0, 0);

      const blob = await new Promise<Blob | null>((resolve) => {
        exportCanvas.toBlob(resolve, "image/png");
      });
      if (!blob) {
        throw new Error("Failed to export mask image.");
      }

      const formData = new FormData();
      formData.set("field", maskEditorState.fieldKey);
      formData.set(
        "file",
        new File([blob], `mask-${Date.now()}.png`, {
          type: "image/png",
        })
      );

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
        throw new Error(payload.error?.message ?? "Failed to upload mask image.");
      }

      setPlaygroundUploads((current) => ({
        ...current,
        [maskEditorState.fieldKey]: [
          {
            url: payload.url!,
            name: payload.name || "Generated mask",
            mimeType: payload.mimeType || "image/png",
            size: typeof payload.size === "number" ? payload.size : blob.size,
          },
        ],
      }));
      setValidationErrors((current) => {
        const next = { ...current };
        delete next[maskEditorState.fieldKey];
        return next;
      });
      setMaskEditorState(null);
      setMaskEditorError(null);
    } catch (error) {
      setMaskEditorError(error instanceof Error ? error.message : "Failed to save mask.");
    } finally {
      setMaskEditorSaving(false);
    }
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
    let optimisticAssistantId: string | undefined;
    let optimisticUserId: string | undefined;

    const nextValidationErrors: Record<string, string> = {};
    if (hasPromptComposer && composedPrompt.trim().length === 0) {
      nextValidationErrors.prompt = "Prompt options configuration did not produce a prompt.";
    }
    for (const field of visiblePlaygroundFields) {
      if (isChatModel && field.key === "messages") {
        continue;
      }
      if (
        isDocumentAnalysisModel &&
        ((documentInputMode === "text" && field.key === documentFileField?.key) ||
          (documentInputMode === "file" && field.key === documentTextField?.key))
      ) {
        continue;
      }
      if (isUploadField(field)) {
        const uploadCount = (playgroundUploads[field.key] ?? []).length;
        if (field.required && uploadCount === 0 && !(isDocumentAnalysisModel && documentInputMode === "text")) {
          nextValidationErrors[field.key] = `${field.label} is required.`;
        }
        const uploadLimit = getUploadLimit(field);
        if (uploadLimit !== null && uploadCount > uploadLimit) {
          nextValidationErrors[field.key] = `${field.label} allows at most ${uploadLimit} file${uploadLimit === 1 ? "" : "s"}.`;
        }
        continue;
      }
      const value = playgroundForm[field.key]?.trim() ?? "";
      if (field.required && value.length === 0 && !(isDocumentAnalysisModel && documentInputMode === "file")) {
        nextValidationErrors[field.key] = `${field.label} is required.`;
      }
      if (getFieldLeafKey(field.key) === "prompt" && value.length === 0) {
        nextValidationErrors[field.key] = "Prompt is required.";
      }
      if (isDocumentAnalysisModel && getFieldLeafKey(field.key) === "text" && documentInputMode === "text") {
        if (value.length === 0) {
          nextValidationErrors[field.key] = `${field.label} is required.`;
        } else if (value.length < 300) {
          nextValidationErrors[field.key] = `${field.label} must be at least 300 characters.`;
        } else if (value.length > 150000) {
          nextValidationErrors[field.key] = `${field.label} must not exceed 150,000 characters.`;
        }
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

      if (isChatModel) {
        const composerText = chatComposer.trim();
        if (composerText.length === 0) {
          setValidationErrors({ messages: "Message is required." });
          setTaskStatus("idle");
          return;
        }
        optimisticUserId = `chat-user-${Date.now()}`;
        optimisticAssistantId = `chat-assistant-${Date.now()}`;

        setChatConversation((current) => [
          ...current,
          { role: "user", content: composerText, localId: optimisticUserId },
          {
            role: "assistant",
            content: "thinking...",
            localId: optimisticAssistantId,
            pending: true,
          },
        ]);
        setChatComposer("");

        for (const field of chatConfigFields) {
          const raw = playgroundForm[field.key];
          if ((raw ?? "").trim().length === 0) continue;
          if (field.type === "number") {
            const num = Number(raw);
            if (!Number.isNaN(num)) setNestedValue(inputPayload, field.key, num);
            continue;
          }
          if (field.type === "boolean") {
            setNestedValue(inputPayload, field.key, raw === "true");
            continue;
          }
          if (field.type === "array") {
            const trimmed = raw.trim();
            if (trimmed.startsWith("[")) {
              try {
                const parsedArray = JSON.parse(trimmed);
                if (Array.isArray(parsedArray)) {
                  setNestedValue(inputPayload, field.key, parsedArray);
                  continue;
                }
              } catch {
                // Fall through to simple splitting below.
              }
            }
            setNestedValue(
              inputPayload,
              field.key,
              trimmed
                .split(/[\n,]/)
                .map((item) => item.trim())
                .filter(Boolean)
            );
            continue;
          }
          setNestedValue(inputPayload, field.key, raw);
        }

        const systemPromptKey = chatConfigFields.find((field) => {
          const key = field.key.trim().toLowerCase();
          return key === "system_prompt" || key === "systemprompt" || key === "system";
        })?.key;
        const systemPromptValue =
          typeof systemPromptKey === "string" ? playgroundForm[systemPromptKey]?.trim() ?? "" : "";
        const outgoingMessages: ChatPlaygroundMessage[] = [
          ...(systemPromptValue
            ? [{ role: "system" as const, content: systemPromptValue }]
            : []),
          ...chatConversation.map((message) => ({
            role: message.role,
            content: message.content,
          })),
          { role: "user", content: composerText },
        ];
        inputPayload.messages = outgoingMessages.map((message) => ({
          role: message.role,
          content: message.content,
        }));

        const submitRes = await fetch("/api/playground", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "submit",
            endpoint: inferEndpoint(selectedModel.capability),
            model: selectedModel.publicModel,
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
            setChatConversation((current) =>
              current.filter((message) => message.localId !== optimisticAssistantId)
            );
            return;
          }
          if (submitRes.status === 402 || errorCode === "insufficient_balance") {
            setTaskStatus("idle");
            setTopUpRequiredModalOpen(true);
            setChatConversation((current) =>
              current.filter((message) => message.localId !== optimisticAssistantId)
            );
            return;
          }
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
              prompt: "",
              hasPromptField: false,
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
            error?: { message?: string; code?: string } | string;
            error_code?: string;
            error_message?: string;
          };
          if (!statusRes.ok) {
            throw new Error(formatPlaygroundError(statusJson));
          }

          const status = String(statusJson.status ?? "").toLowerCase();
          if (status === "queued") {
            setTaskStatus("queued");
            continue;
          }
          if (status === "processing" || status === "submitted") {
            setTaskStatus("processing");
            continue;
          }
          if (status === "succeeded") {
            const nextOutput = statusJson.output_payload ?? statusJson;
            const assistantText =
              extractTextOutput(nextOutput) ?? formatDetailText(nextOutput);
            setTaskStatus("succeeded");
            setPlaygroundOutput(nextOutput);
            setChatConversation((current) =>
              current.map((message) => {
                if (message.localId === optimisticUserId) {
                  return { ...message, taskId: submitJson.id };
                }
                if (message.localId === optimisticAssistantId) {
                  return {
                    ...message,
                    content: assistantText,
                    taskId: submitJson.id,
                    pending: false,
                  };
                }
                return message;
              })
            );
            return;
          }
          if (status === "failed" || status === "cancelled") {
            setTaskStatus("failed");
            capturedErrorDetail = statusJson;
            setChatConversation((current) =>
              current.map((message) =>
                message.localId === optimisticAssistantId
                  ? {
                      ...message,
                      content: "Request failed.",
                      pending: false,
                      taskId: submitJson.id,
                    }
                  : message
              )
            );
            throw new Error(formatPlaygroundError(statusJson));
          }
        }

        setTaskStatus("failed");
        setChatConversation((current) =>
          current.map((message) =>
            message.localId === optimisticAssistantId
              ? {
                  ...message,
                  content: "Request timed out.",
                  pending: false,
                  taskId: submitJson.id,
                }
              : message
          )
        );
        setPlaygroundError("Playground request timeout, please retry.");
        setPlaygroundErrorDetail({
          stage: "poll",
          taskId: submitJson.id,
        });
        return;
      }

      for (const field of visiblePlaygroundFields) {
        if (
          isDocumentAnalysisModel &&
          ((documentInputMode === "text" && field.key === documentFileField?.key) ||
            (documentInputMode === "file" && field.key === documentTextField?.key))
        ) {
          continue;
        }
        if (isUploadField(field)) {
          const uploads = playgroundUploads[field.key] ?? [];
          if (uploads.length > 0) {
            setNestedValue(
              inputPayload,
              field.key,
              isMultipleUploadField(field)
                ? uploads.map((item) => item.url)
                : uploads[0]?.url
            );
            if (
              isDocumentAnalysisModel &&
              documentInputMode === "file" &&
              getFieldLeafKey(field.key) === "file" &&
              typeof uploads[0]?.characterCount === "number"
            ) {
              inputPayload.input_characters = uploads[0].characterCount;
            }
          }
          continue;
        }
        const raw = playgroundForm[field.key];
        if ((raw ?? "").trim().length === 0) continue;
        if (getFieldLeafKey(field.key) === "prompt") {
          promptValue = raw;
          continue;
        }
        if (field.type === "number") {
          const num = Number(raw);
          if (!Number.isNaN(num)) setNestedValue(inputPayload, field.key, num);
          continue;
        }
        if (field.type === "boolean") {
          setNestedValue(inputPayload, field.key, raw === "true");
          continue;
        }
        if (field.type === "array") {
          const trimmed = raw.trim();
          if (trimmed.startsWith("[")) {
            try {
              const parsedArray = JSON.parse(trimmed);
              if (Array.isArray(parsedArray)) {
                setNestedValue(inputPayload, field.key, parsedArray);
                continue;
              }
            } catch {
              // Fall through to simple splitting below.
            }
          }
          setNestedValue(
            inputPayload,
            field.key,
            trimmed
              .split(/[\n,]/)
              .map((item) => item.trim())
              .filter(Boolean)
          );
          continue;
        }
        setNestedValue(inputPayload, field.key, raw);
      }
      if (hasPromptComposer) {
        promptValue = composedPrompt.trim();
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
          if (selectedModel?.allowContinuousOperations) {
            void fetch(
              `/api/playground/history-images?model=${encodeURIComponent(selectedModel.publicModel)}`,
              { method: "GET", cache: "no-store" }
            )
              .then(async (response) => {
                const payload = (await response.json().catch(() => ({}))) as {
                  images?: PlaygroundHistoryImage[];
                };
                if (!response.ok) return;
                setPlaygroundHistoryImages(Array.isArray(payload.images) ? payload.images : []);
              })
              .catch(() => {});
          }
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
      if (optimisticAssistantId) {
        setChatConversation((current) =>
          current.map((message) =>
            message.localId === optimisticAssistantId
              ? {
                  ...message,
                  content: error instanceof Error ? error.message : "Submit failed",
                  pending: false,
                }
              : message
          )
        );
      }
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

  const copyTextOutput = async () => {
    if (!playgroundTextOutput) return;
    try {
      await navigator.clipboard.writeText(playgroundTextOutput);
      setTextOutputCopied(true);
      setTimeout(() => setTextOutputCopied(false), 1500);
    } catch {
      setTextOutputCopied(false);
    }
  };

  const copyChatMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedChatMessageId(messageId);
      setTimeout(() => setCopiedChatMessageId((current) => (current === messageId ? null : current)), 1500);
    } catch {
      setCopiedChatMessageId(null);
    }
  };

  const copyCodeBlock = async (codeBlockId: string, code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeBlockId(codeBlockId);
      setTimeout(() => setCopiedCodeBlockId((current) => (current === codeBlockId ? null : current)), 1500);
    } catch {
      setCopiedCodeBlockId(null);
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
    params.set("tab", "playground");
    const href = `/models/${providerSlug}/${modelSlug}${params.toString().length > 0 ? `?${params.toString()}` : ""}`;
    if (typeof window !== "undefined") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <section className="space-y-3 sm:space-y-4">
      {!isModelDetailRoute ? (
        <header className="rounded-xl border border-[#BAE6FD] bg-white px-4 py-4 shadow-sm sm:rounded-2xl sm:px-5">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#0369A1]">{seoHeading.eyebrow}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-black sm:text-4xl">{seoHeading.heading}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/62">{seoHeading.intro}</p>
        </header>
      ) : null}
      <div className="space-y-2.5">
        {selectedModel ? (
          <div className="rounded-xl border border-[#BAE6FD] bg-[linear-gradient(135deg,#E0F2FE_0%,#FFFDFC_55%,#E0F2FE_100%)] p-3 sm:rounded-2xl sm:p-3.5">
            <div className="flex flex-col gap-2.5 sm:gap-3 md:flex-row md:flex-wrap md:items-end">
              <label className="block md:w-[220px] md:flex-none">
                <div className="relative">
                  <select
                    value={selectedProvider}
                    onChange={(event) => handleProviderChange(event.target.value)}
                    className="h-12 w-full appearance-none rounded-md border border-transparent bg-white/55 px-4 pr-11 text-[18px] font-semibold text-black/90 outline-none transition-colors hover:bg-white/70 focus:bg-white/85 sm:text-[19px]"
                  >
                    {selectableProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-black/45" />
                </div>
              </label>
              <label className="block md:w-[min(560px,calc(100vw-22rem))] md:min-w-[320px] md:flex-1">
                <div className="relative">
                  <select
                    value={effectiveModelSlug ?? visibleRows[0]?.publicModel ?? ""}
                    onChange={(event) => handleModelChange(event.target.value || null)}
                    className="h-12 w-full appearance-none rounded-md border border-transparent bg-white/55 px-4 pr-11 text-[18px] font-semibold text-black/95 outline-none transition-colors hover:bg-white/70 focus:bg-white/85 sm:text-[19px]"
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
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-black/45" />
                </div>
              </label>
            </div>
            {isRouteSkeletonVisible ? (
              <div className="mt-2.5 animate-pulse space-y-3">
                <div className="h-5 w-full max-w-3xl rounded bg-black/[0.06]" />
                <div className="flex flex-wrap gap-1.5">
                  <div className="h-7 w-24 rounded-full bg-black/[0.06]" />
                  <div className="h-7 w-28 rounded-full bg-black/[0.06]" />
                  <div className="h-7 w-48 rounded-full bg-black/[0.06]" />
                </div>
              </div>
            ) : (
              <>
                <p className="mt-2 text-[13px] leading-5 text-black/68 sm:mt-1.5 sm:leading-5.5">
                  {selectedModel.modelDescription || "This model does not have a detailed description yet."}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex rounded-full border border-[#BAE6FD] bg-white/80 px-3 py-1 text-xs font-medium text-[#0369A1]">
                    {selectedModel.providerName}
                  </span>
                  <span className="inline-flex rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs text-black/70">
                    {capabilityTag}
                  </span>
                  <span className="inline-flex max-w-full rounded-full border border-black/[0.08] bg-white/80 px-3 py-1 text-xs text-black/70">
                    <span className="truncate">
                    {selectedModel.publicModel}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="relative min-w-0 max-w-full">
        <div className="min-w-0 space-y-4">
      {isRouteSkeletonVisible ? (
        <ModelContentSkeleton />
      ) : (
        <>
      <section className="min-w-0 max-w-full rounded-xl border border-black/[0.08] bg-white p-2 shadow-sm sm:rounded-2xl sm:p-3">
        <div className="mb-3 rounded-lg border border-black/[0.08] bg-[#F6F8FB] p-1">
          <div className="grid grid-cols-2 gap-1">
            {(["playground", "api"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => handleMainTabChange(tab)}
                className={`h-10 cursor-pointer rounded-md border px-3 text-[14px] font-bold transition-colors ${
                  tab === mainTab
                    ? "border-[#38BDF8] bg-white text-[#0369A1]"
                    : "border-transparent text-[#4B5563] hover:bg-white/70 hover:text-[#111827]"
                }`}
              >
                {tab === "api" ? "API" : "Playground"}
              </button>
            ))}
          </div>
        </div>
        <div className="relative min-w-0">
        {mainTab === "playground" && isChatModel ? (
          <div>
            <div className="px-1 py-2 sm:p-5">
              <div className="min-w-0 rounded-[22px] border border-[#DCE7F3] bg-white/92 p-3 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur sm:p-4">
                <div className="mb-3 flex flex-col gap-3 border-b border-slate-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Conversation</p>
                    <p className="mt-1 text-xs text-slate-500">Responses append to this temporary thread.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setChatConversation([]);
                        setChatComposer("");
                        setPlaygroundOutput(null);
                        setTaskId(null);
                        setTaskStatus("idle");
                        setPlaygroundError(null);
                        setPlaygroundErrorDetail(null);
                      }}
                      className="h-8 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      Clear chat
                    </button>
                    {playgroundOutput ? (
                      <button
                        type="button"
                        onClick={() => setResultModalOpen(true)}
                        className="inline-flex h-8 items-center rounded-full px-2.5 text-[11px] font-medium text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                      >
                        Details
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mb-3 flex h-[420px] flex-col gap-3 overflow-y-auto rounded-[20px] border border-slate-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-3 shadow-inner sm:h-[520px] sm:p-4">
                  {chatConversation.length === 0 ? (
                    <div className="flex-1" />
                  ) : (
                    chatConversation.map((message, index) => {
                      const isUser = message.role === "user";
                      const isAssistant = message.role === "assistant";
                      const messageId = message.localId ?? `${message.role}-${index}-${message.taskId ?? "local"}`;
                      return (
                        <div
                          key={messageId}
                          className={`flex gap-2 sm:gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                        >
                          {!isUser ? (
                            <div
                              className={`mt-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-2xl border shadow-sm ${
                                isAssistant
                                  ? "border-[#BAE6FD] bg-white"
                                  : "border-[#FCD34D] bg-[#FFF8E1]"
                              }`}
                            >
                              {isAssistant ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src="/logo.png"
                                  alt="OpenOctopus"
                                  className="size-6 object-contain"
                                />
                              ) : (
                                <span className="text-[11px] font-semibold text-[#92400E]">S</span>
                              )}
                            </div>
                          ) : null}
                          <div className={`min-w-0 max-w-[92%] sm:max-w-[86%] ${isUser ? "items-end" : "items-start"} flex flex-col`}>
                            <div
                              className={`w-full text-sm leading-7 ${
                                isUser
                                  ? "rounded-2xl bg-[#EAF6FF] px-4 py-3 text-slate-800"
                                  : isAssistant
                                    ? "px-1 py-1 text-slate-800"
                                    : "px-1 py-1 text-slate-700"
                              }`}
                            >
                              {isAssistant && message.pending ? (
                                <span className="bg-[linear-gradient(90deg,#64748B_0%,#0F172A_50%,#64748B_100%)] bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent animate-pulse">
                                  thinking...
                                </span>
                              ) : (
                                isAssistant ? (
                                  <MarkdownChatMessage
                                    markdown={message.content}
                                    messageId={messageId}
                                    copiedCodeBlockId={copiedCodeBlockId}
                                    onCopyCodeBlock={(codeBlockId, code) => {
                                      void copyCodeBlock(codeBlockId, code);
                                    }}
                                  />
                                ) : (
                                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                                )
                              )}
                            </div>
                            {!message.pending ? (
                              <button
                                type="button"
                                onClick={() => void copyChatMessage(messageId, message.content)}
                                className="mt-1 inline-flex h-7 items-center gap-1 self-end rounded-full px-2 text-[11px] text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                                aria-label="Copy message"
                              >
                                {copiedChatMessageId === messageId ? (
                                  <Check className="size-3.5" />
                                ) : (
                                  <Copy className="size-3.5" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  )}
                  {playgroundError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                      {playgroundError}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-[22px] border border-[#DCE7F3] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] p-3 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                  <textarea
                    disabled={isSubmitting || !selectedModel}
                    value={chatComposer}
                    onChange={(event) => {
                      setChatComposer(event.target.value);
                      setValidationErrors((current) => {
                        const next = { ...current };
                        delete next.messages;
                        return next;
                      });
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" || event.shiftKey) return;
                      event.preventDefault();
                      if (isSubmitting || !selectedModel) return;
                      void submitPlayground();
                    }}
                    className={`min-h-[132px] w-full rounded-[18px] border bg-white px-4 py-3 text-sm leading-7 text-slate-800 shadow-inner outline-none transition-colors disabled:cursor-not-allowed disabled:bg-slate-100 ${
                      validationErrors.messages
                        ? "border-[#D94A38] focus:border-[#D94A38]"
                        : "border-slate-200 focus:border-[#38BDF8]"
                    }`}
                    placeholder="Write your next message..."
                  />
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>Shift + Enter for line break</span>
                    </div>
                    <button
                      type="button"
                      disabled={isSubmitting || !selectedModel}
                      onClick={submitPlayground}
                      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-[linear-gradient(135deg,#1F8A4C_0%,#176D3D_100%)] px-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(31,138,76,0.26)] transition-transform hover:-translate-y-[1px] hover:bg-[#176D3D] disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto"
                    >
                      {isSubmitting ? "Sending..." : "Send"}
                    </button>
                  </div>
                  {validationErrors.messages ? (
                    <p className="mt-2 text-[11px] text-[#B54432]">{validationErrors.messages}</p>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : mainTab === "playground" ? (
          <div className="grid gap-3 lg:grid-cols-2 lg:gap-4">
            <section className="rounded-lg border border-black/[0.08] bg-white p-3 sm:rounded-xl sm:p-4">
              <h3 className="mb-3 text-sm font-medium text-black">Input</h3>
              <div className="space-y-3">
                {visiblePlaygroundFields.length === 0 && !hasPromptComposer ? (
                  <p className="text-sm text-black/55">
                    No structured input schema found. You can still submit with default empty input.
                  </p>
                ) : (
                  <>
                  {isDocumentAnalysisModel && documentTextField && documentFileField ? (
                    <div className="rounded-md border border-black/[0.08] bg-[#F8FCFF] p-1">
                      <div className="grid grid-cols-2 gap-1">
                        {([
                          { key: "text" as const, label: "Paste text" },
                          { key: "file" as const, label: "Upload document" },
                        ]).map((item) => {
                          const active = documentInputMode === item.key;
                          return (
                            <button
                              key={item.key}
                              type="button"
                              onClick={() => setDocumentInputMode(item.key)}
                              className={`h-9 rounded-md text-xs font-medium transition-colors ${
                                active
                                  ? "bg-white text-black shadow-sm"
                                  : "text-black/55 hover:bg-white/70"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                  {hasPromptComposer && promptComposer ? (
                    <div className="rounded-md border border-[#BAE6FD] bg-[#F8FCFF] p-3">
                      <div className="mb-3">
                        <p className="text-xs font-medium text-black">Prompt options</p>
                        <p className="mt-1 text-[11px] leading-5 text-black/55">
                          Choose preset options below. Playground will generate the final prompt automatically.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {promptComposer.optionGroups.map((group) => {
                          const selectedValue = selectedPromptOptions[group.key] ?? group.options[0]?.value ?? "";
                          const selectedOption =
                            group.options.find((option) => option.value === selectedValue) ?? group.options[0] ?? null;
                          return (
                            <label key={group.key} className="block">
                              <span className="mb-1 block text-xs text-black/65">
                                {group.label || group.key}
                                {group.required ? <span className="pl-1 text-red-500">*</span> : null}
                              </span>
                              <select
                                disabled={isSubmitting}
                                value={selectedValue}
                                onChange={(event) =>
                                  setSelectedPromptOptions((current) => ({
                                    ...current,
                                    [group.key]: event.target.value,
                                  }))
                                }
                                className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                              >
                                {group.options.map((option) => (
                                  <option key={`${group.key}-${option.value}`} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              {selectedOption?.promptBlock ? (
                                <p className="mt-1 text-[11px] leading-5 text-black/45">
                                  {selectedOption.promptBlock}
                                </p>
                              ) : null}
                            </label>
                          );
                        })}
                        <label className="block">
                          <span className="mb-1 block text-xs text-black/65">Generated prompt preview</span>
                          <textarea
                            readOnly
                            value={composedPrompt}
                            className="min-h-[150px] w-full rounded-md border border-black/[0.1] bg-white px-3 py-2 font-mono text-xs text-black/75"
                          />
                          {validationErrors.prompt ? (
                            <p className="mt-1 text-[11px] text-[#D94A38]">{validationErrors.prompt}</p>
                          ) : null}
                        </label>
                      </div>
                    </div>
                  ) : null}
                  {visiblePlaygroundFields.map((field) => {
                    const hiddenForDocumentMode =
                      isDocumentAnalysisModel &&
                      ((documentInputMode === "text" && field.key === documentFileField?.key) ||
                        (documentInputMode === "file" && field.key === documentTextField?.key));
                    if (hiddenForDocumentMode) {
                      return null;
                    }

                    return (
                    <label key={field.key} className="block">
                      <span className="mb-1 block text-xs text-black/65">
                        <span className="inline-flex items-center">
                          {field.label}
                          <FieldHelpTooltip label={field.label} description={field.description} />
                        </span>
                        {field.required ? <span className="pl-1 text-red-500">*</span> : null}
                      </span>
                      {isUploadField(field) ? (
                        <div className="rounded-md border border-black/[0.1] bg-white p-2.5 sm:p-3">
                          {(() => {
                            const uploadKind = getUploadFieldKind(field) ?? "image";
                            const uploadTitle = getUploadTitle(uploadKind);
                            return (
                              <>
                          <input
                            disabled={isSubmitting || uploadingFields[field.key]}
                            type="file"
                            accept={getUploadAccept(uploadKind)}
                            multiple={isMultipleUploadField(field) && (getUploadLimit(field) ?? 2) > 1}
                            onChange={(event) => {
                              void uploadPlaygroundAssets(field, event.target.files);
                              event.target.value = "";
                            }}
                            className="block w-full text-xs text-black/60 file:mb-2 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-black file:px-3 file:text-xs file:font-medium file:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:file:mb-0"
                          />
                          <p className="mt-2 text-[11px] leading-5 text-black/45">
                            {appendUploadLimitText(getUploadHelpText(uploadKind), field)}
                          </p>
                          {uploadKind === "image" && isMaskUploadField(field) ? (
                            (() => {
                              const maskSource = resolveMaskSourceForField(field);
                              return (
                                <div className="mt-3 rounded-md border border-dashed border-[#D6E4FF] bg-[#F8FBFF] p-2.5">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-[11px] font-medium text-black/70">
                                        Draw mask area
                                      </p>
                                      <p className="mt-1 text-[11px] leading-5 text-black/45">
                                        Paint white on the background image. White area means the region to generate or repair.
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={isSubmitting || uploadingFields[field.key] || !maskSource}
                                      onClick={() => {
                                        if (!maskSource) return;
                                        setMaskEditorError(null);
                                        setMaskEditorBrushSize(28);
                                        setMaskEditorState({
                                          fieldKey: field.key,
                                          fieldLabel: field.label,
                                          sourceFieldLabel: maskSource.sourceField.label,
                                          sourceUpload: maskSource.sourceUpload,
                                        });
                                      }}
                                      className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-[#BAE6FD] bg-white px-3 text-[11px] font-medium text-black/70 hover:bg-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      Draw mask
                                    </button>
                                  </div>
                                  {!maskSource ? (
                                    <p className="mt-2 text-[11px] leading-5 text-black/45">
                                      Upload the background image first, then you can draw the mask here.
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-[11px] leading-5 text-black/45">
                                      Base image: {maskSource.sourceField.label}
                                    </p>
                                  )}
                                </div>
                              );
                            })()
                          ) : null}
                          {uploadingFields[field.key] ? (
                            <p className="mt-2 text-[11px] text-black/55">Uploading...</p>
                          ) : null}
                          {uploadKind === "image" &&
                          selectedModel?.allowContinuousOperations &&
                          canUseHistoryImageForField(field) ? (
                            <div className="mt-3 rounded-md border border-dashed border-[#BAE6FD] bg-[#F8FCFF] p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-[11px] font-medium text-black/65">
                                  Recent images from your history for this model
                                </p>
                                {loadingHistoryImages ? (
                                  <span className="text-[11px] text-black/45">Loading...</span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-[11px] leading-5 text-black/45">
                                Choose one image to continue refining it or use it as the base for another generation.
                              </p>
                              {playgroundHistoryImages.length > 0 ? (
                                <div className="mt-2 -mx-1 overflow-x-auto pb-1">
                                  <div className="flex min-w-max gap-2 px-1">
                                  {playgroundHistoryImages.slice(0, 8).map((historyImage) => {
                                    const selected = (playgroundUploads[field.key] ?? []).some(
                                      (upload) => upload.url === historyImage.url
                                    );
                                    const isDeleting = deletingHistoryRequestId === historyImage.requestId;
                                    return (
                                      <div
                                        key={`${field.key}-${historyImage.url}`}
                                        className="relative w-28 shrink-0 rounded-md border border-[#DDF4FF] bg-white p-1.5"
                                      >
                                        <button
                                          type="button"
                                          disabled={isSubmitting || isDeleting}
                                          onClick={() => setHistoryDeleteTarget(historyImage)}
                                          className="absolute right-2 top-2 z-10 inline-flex size-5 items-center justify-center rounded-full border border-black/[0.08] bg-white/95 text-black/50 shadow-sm hover:bg-white hover:text-black disabled:cursor-not-allowed disabled:opacity-40"
                                          aria-label="Delete history image"
                                          title="Delete history image"
                                        >
                                          <X className="size-3" />
                                        </button>
                                        <div className="overflow-hidden rounded bg-[#F7F7F7]">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img
                                            src={buildDisplayImageUrl(historyImage.url)}
                                            alt={historyImage.prompt ?? "Recent generated image"}
                                            className="h-20 w-full object-cover"
                                          />
                                        </div>
                                        <div className="mt-1.5">
                                          <button
                                            type="button"
                                            disabled={isSubmitting || selected || isDeleting}
                                            onClick={() => applyHistoryImageToField(field, historyImage)}
                                            className="inline-flex h-7 w-full items-center justify-center whitespace-nowrap rounded-md border border-[#BAE6FD] bg-white px-2 text-[11px] font-medium text-black/70 hover:bg-[#E0F2FE] disabled:cursor-not-allowed disabled:opacity-50"
                                          >
                                            {selected ? "Selected" : "Use"}
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  </div>
                                </div>
                              ) : !loadingHistoryImages ? (
                                <p className="mt-2 text-[11px] leading-5 text-black/45">
                                  No generated images found for this model yet.
                                </p>
                              ) : null}
                            </div>
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
                                    title={`Remove ${uploadTitle}`}
                                  >
                                    <X className="size-3.5" />
                                  </button>
                                  {upload.mimeType.startsWith("image/") ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewImage({
                                          url: upload.url,
                                          name: upload.name,
                                          mimeType: upload.mimeType,
                                        })
                                      }
                                      className="block w-full overflow-hidden rounded bg-white"
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={buildDisplayImageUrl(upload.url)}
                                        alt={upload.name}
                                        className="max-h-32 w-full object-contain"
                                      />
                                    </button>
                                  ) : upload.mimeType.startsWith("video/") ? (
                                    <div className="overflow-hidden rounded bg-white">
                                      <video
                                        src={buildDisplayImageUrl(upload.url)}
                                        controls
                                        className="max-h-48 w-full rounded bg-black object-contain"
                                      />
                                    </div>
                                  ) : upload.mimeType.startsWith("audio/") ? (
                                    <div className="overflow-hidden rounded bg-white">
                                      <div className="p-3">
                                        <audio src={upload.url} controls className="w-full" />
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="rounded border border-black/[0.06] bg-white px-3 py-3 text-sm text-black/65">
                                      <p className="font-medium text-black/75">{upload.name}</p>
                                      <p className="mt-1 text-xs text-black/45">{upload.mimeType}</p>
                                      {typeof upload.characterCount === "number" ? (
                                        <p className="mt-1 text-xs text-black/45">
                                          Detected {upload.characterCount.toLocaleString("en-US")} characters
                                        </p>
                                      ) : null}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : null}
                              </>
                            );
                          })()}
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
                          value={playgroundForm[field.key] ?? "false"}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          <option value="true">true</option>
                          <option value="false">false</option>
                        </select>
                      ) : field.key === "prompt" || (isDocumentAnalysisModel && getFieldLeafKey(field.key) === "text") ? (
                        <textarea
                          disabled={isSubmitting}
                          maxLength={isDocumentAnalysisModel && getFieldLeafKey(field.key) === "text" ? 150000 : undefined}
                          value={playgroundForm[field.key] ?? ""}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className={`${
                            isDocumentAnalysisModel && getFieldLeafKey(field.key) === "text"
                              ? "min-h-[188px]"
                              : "min-h-[120px]"
                          } w-full rounded-md border bg-white px-3 py-2 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03] ${
                            validationErrors[field.key] ? "border-[#D94A38]" : "border-black/[0.1]"
                          }`}
                          placeholder={
                            isDocumentAnalysisModel
                              ? "Paste the text to analyze..."
                              : "Describe what to generate..."
                          }
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
                      ) : isSliderNumberField(field) ? (
                        <select
                          disabled={isSubmitting}
                          value={playgroundForm[field.key] ?? buildNumberSelectOptions(field)[0] ?? String(field.minimum)}
                          onChange={(event) =>
                            setPlaygroundForm((prev) => ({ ...prev, [field.key]: event.target.value }))
                          }
                          className="h-10 w-full rounded-md border border-black/[0.1] bg-white px-3 text-sm text-black/80 disabled:cursor-not-allowed disabled:bg-black/[0.03]"
                        >
                          {buildNumberSelectOptions(field).map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          disabled={isSubmitting}
                          type={field.type === "number" ? "number" : "text"}
                          min={field.type === "number" ? field.minimum : undefined}
                          max={field.type === "number" ? field.maximum : undefined}
                          step={field.type === "number" ? field.step ?? "any" : undefined}
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
                      {isDocumentAnalysisModel && getFieldLeafKey(field.key) === "text" ? (
                        <p className="mt-1 text-[11px] text-black/45">
                          {(playgroundForm[field.key] ?? "").trim().length} / 150,000 characters. Minimum 300. Under 600 may be less reliable.
                        </p>
                      ) : null}
                      {validationErrors[field.key] ? (
                        <p className="mt-1 text-[11px] text-[#B54432]">{validationErrors[field.key]}</p>
                      ) : null}
                    </label>
                  )})}
                  </>
                )}
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
                <button
                  type="button"
                  disabled={isSubmitting || !selectedModel}
                  onClick={submitPlayground}
                  className="h-11 w-full rounded-md bg-[#1F8A4C] px-4 text-sm font-medium text-white transition-colors hover:bg-[#176D3D] disabled:cursor-not-allowed disabled:opacity-45 sm:h-10 sm:w-auto"
                >
                  {isSubmitting ? "Generating..." : priceTag ? `Generate · ${priceTag}` : "Generate"}
                </button>
              </div>
            </section>

            <section className="flex min-h-[260px] flex-col rounded-lg border border-black/[0.08] bg-[#FAFAFA] p-3 sm:min-h-[320px] sm:rounded-xl sm:p-4">
              <div className="mb-3 rounded-lg border border-black/[0.06] bg-white px-3 py-1.5">
                <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-black">Output</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    {playgroundOutput ? (
                      <button
                        type="button"
                        onClick={() => setResultModalOpen(true)}
                        className="inline-flex h-7 items-center rounded-md px-2 text-xs font-medium text-black/45 hover:bg-black/[0.03] hover:text-black/70"
                      >
                        Details
                      </button>
                    ) : null}
                    <span
                      className={`inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-medium ${taskStatusClass(taskStatus)}`}
                    >
                      Status: {taskStatusLabel(taskStatus)}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <div className="flex flex-wrap items-center gap-2">
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
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-black/[0.12] bg-white px-2.5 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
                      >
                        <Download className="size-3.5" />
                        <span>Download image</span>
                      </button>
                    ) : playgroundVideoAssets.length > 0 ? (
                      <a
                        href={playgroundVideoAssets[0].url}
                        download={`${slugifyPathPart(selectedModel?.publicModel || "generated-video")}-1.mp4`}
                        className="inline-flex h-8 items-center gap-1 rounded-md border border-black/[0.12] bg-white px-2.5 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
                      >
                        <Download className="size-3.5" />
                        <span>Download video</span>
                      </a>
                    ) : null}
                  </div>
                </div>
              </div>
              {playgroundError ? (
                <div className="flex min-h-[180px] flex-1 items-center sm:min-h-[220px]">
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
                <div className="flex min-h-[180px] flex-1 flex-col items-center justify-center rounded-md border border-black/[0.08] bg-white sm:min-h-[220px]">
                  <span className="inline-flex size-7 animate-spin rounded-full border-2 border-[#BAE6FD] border-t-[#38BDF8]" />
                  <p className="mt-3 text-sm font-medium text-black">Generating...</p>
                  <p className="mt-1 text-xs text-black/55">{taskStatusLabel(taskStatus)}</p>
                </div>
              ) : playgroundOutput ? (
                <div className="space-y-3">
                  {isDocumentAnalysisModel && playgroundDocumentAnalysis ? (
                    <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="rounded-md border border-[#BAE6FD] bg-white p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.35px] text-black/45">Human score</p>
                          <p className="mt-2 text-3xl font-semibold text-black">
                            {typeof playgroundDocumentAnalysis.humanScore === "number"
                              ? `${playgroundDocumentAnalysis.humanScore} / 100`
                              : "-"}
                          </p>
                          <p className="mt-2 text-[11px] leading-5 text-black/50">
                            0-100. Higher means more likely human-written.
                          </p>
                        </div>
                        <div className="rounded-md border border-[#BAE6FD] bg-white p-3">
                          <p className="text-[11px] font-medium uppercase tracking-[0.35px] text-black/45">Readability score</p>
                          <p className="mt-2 text-3xl font-semibold text-black">
                            {typeof playgroundDocumentAnalysis.readabilityScore === "number"
                              ? `${playgroundDocumentAnalysis.readabilityScore} / 100`
                              : "-"}
                          </p>
                          <p className="mt-2 text-[11px] leading-5 text-black/50">
                            0-100. Higher means easier to read.
                          </p>
                        </div>
                      </div>

                      <div className="rounded-md border border-black/[0.08] bg-white p-3">
                        <div className="grid gap-2 text-xs text-black/65 sm:grid-cols-2">
                          <p>Language: <span className="font-medium text-black/80">{playgroundDocumentAnalysis.language ?? "-"}</span></p>
                          <p>Version: <span className="font-medium text-black/80">{playgroundDocumentAnalysis.version ?? "-"}</span></p>
                          <p>Input: <span className="font-medium text-black/80">{playgroundDocumentAnalysis.inputType ?? "-"}</span></p>
                          <p>Status: <span className="font-medium text-black/80">{playgroundDocumentAnalysis.status ?? "-"}</span></p>
                        </div>
                        {playgroundDocumentAnalysis.attackDetected ? (
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                            <span className="rounded-full border border-black/[0.08] bg-[#F8FCFF] px-2.5 py-1 text-black/65">
                              Homoglyph attack: {playgroundDocumentAnalysis.attackDetected.homoglyphAttack ? "Detected" : "No"}
                            </span>
                            <span className="rounded-full border border-black/[0.08] bg-[#F8FCFF] px-2.5 py-1 text-black/65">
                              Zero-width space: {playgroundDocumentAnalysis.attackDetected.zeroWidthSpace ? "Detected" : "No"}
                            </span>
                          </div>
                        ) : null}
                      </div>

                      {playgroundDocumentAnalysis.sentences.length > 0 ? (
                        <div className="rounded-md border border-black/[0.08] bg-white p-3">
                          <div className="mb-2">
                            <p className="text-xs font-medium text-black/55">Sentence score</p>
                            <p className="mt-1 text-[11px] leading-5 text-black/45">
                              Sentence-level score from Winston AI. Smaller samples are less accurate than the overall score.
                            </p>
                          </div>
                          <div className="space-y-2">
                            {playgroundDocumentAnalysis.sentences.map((sentence, index) => (
                              <div key={`${sentence.text.slice(0, 24)}-${index}`} className="rounded-md border border-black/[0.06] bg-[#F8FCFF] p-3">
                                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-black/50">
                                  <span>#{index + 1}</span>
                                  {typeof sentence.score === "number" ? (
                                    <span className="rounded-full border border-[#BAE6FD] bg-white px-2 py-0.5 text-black/70">
                                      Score {sentence.score} / 100
                                    </span>
                                  ) : null}
                                  {typeof sentence.length === "number" ? (
                                    <span>{sentence.length} chars</span>
                                  ) : null}
                                </div>
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-black/80">
                                  {sentence.text}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                  {playgroundTextOutput ? (
                    <div className="rounded-md border border-black/[0.08] bg-white p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-black/55">Text output</p>
                        <button
                          type="button"
                          onClick={copyTextOutput}
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black/[0.12] bg-white px-2.5 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
                        >
                          {textOutputCopied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                          {textOutputCopied ? "Copied" : "Copy"}
                        </button>
                      </div>
                      <p className="whitespace-pre-wrap break-words rounded-md bg-[#F8FCFF] px-3 py-2 text-sm leading-6 text-black/80">
                        {playgroundTextOutput}
                      </p>
                    </div>
                  ) : null}
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
                  {playgroundVideoAssets.length > 0 ? (
                    <div className="grid gap-2">
                      {playgroundVideoAssets.map((asset, index) => (
                        <video
                          key={`${asset.url}-${index}`}
                          src={asset.url}
                          controls
                          playsInline
                          className="max-h-[70vh] w-full rounded-md border border-black/[0.08] bg-white"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex min-h-[180px] flex-1 items-center justify-center rounded-md border border-black/[0.08] bg-white px-4 sm:min-h-[220px]">
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
                      ? "border-[#38BDF8] bg-[#F0F9FF]"
                      : "border-black/[0.08] bg-[#FCFCFA] hover:border-[#BAE6FD] hover:bg-[#FFFBF4]"
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
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {mainTab === "playground" && selectedModel?.readmeMarkdown?.trim() ? (
        looksLikeHtmlDocument(selectedModel.readmeMarkdown) ? (
          <HtmlReadme html={selectedModel.readmeMarkdown} seoHeading={isModelDetailRoute ? seoHeading : undefined} />
        ) : (
          <MarkdownReadme markdown={selectedModel.readmeMarkdown} seoHeading={isModelDetailRoute ? seoHeading : undefined} />
        )
      ) : mainTab === "playground" && isModelDetailRoute ? (
        <section className="rounded-2xl border border-black/[0.08] bg-white p-5 shadow-sm">
          <ReadmeSeoHeading {...seoHeading} />
          <h2 className="text-lg font-semibold text-black">README</h2>
          <p className="mt-1 text-sm text-black/55">Supplemental model documentation has not been added yet.</p>
        </section>
      ) : null}
        </>
      )}
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

      {previewImage ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-4xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="min-w-0 truncate text-sm font-semibold text-black">{previewImage.name}</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    downloadImage(
                      previewImage.url,
                      previewImage.name || "base-image.png",
                      previewImage.mimeType
                    )
                  }
                  className="h-8 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
                >
                  Download
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="h-8 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03]"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="flex max-h-[75vh] items-center justify-center overflow-auto rounded-lg bg-[#F7F7F7] p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={buildDisplayImageUrl(previewImage.url)}
                alt={previewImage.name}
                className="max-h-[70vh] w-auto max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}

      {maskEditorState ? (
        <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-5xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h4 className="truncate text-sm font-semibold text-black">{maskEditorState.fieldLabel}</h4>
                <p className="mt-1 text-xs text-black/55">
                  Paint white where the model should generate or repair. Black area will stay unchanged.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="inline-flex items-center gap-2 rounded border border-black/[0.08] bg-[#FAFAFA] px-3 py-1.5 text-xs text-black/65">
                  <span>Brush</span>
                  <input
                    type="range"
                    min="8"
                    max="96"
                    step="2"
                    value={maskEditorBrushSize}
                    onChange={(event) => setMaskEditorBrushSize(Number(event.target.value))}
                    className="w-24 accent-black"
                  />
                  <span>{maskEditorBrushSize}px</span>
                </label>
                <button
                  type="button"
                  onClick={resetMaskCanvas}
                  disabled={maskEditorSaving}
                  className="h-8 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => setMaskEditorState(null)}
                  disabled={maskEditorSaving}
                  className="h-8 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void saveMaskDrawing()}
                  disabled={maskEditorSaving}
                  className="h-8 rounded border border-[#BAE6FD] bg-[#E0F2FE] px-3 text-xs font-medium text-black/80 hover:bg-[#D0EBFF] disabled:opacity-50"
                >
                  {maskEditorSaving ? "Saving..." : "Use mask"}
                </button>
              </div>
            </div>
            <div className="rounded-lg bg-[#F7F7F7] p-3">
              <div className="flex max-h-[72vh] items-center justify-center overflow-auto">
                <div className="relative inline-block max-w-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={buildDisplayImageUrl(maskEditorState.sourceUpload.url)}
                    alt={maskEditorState.sourceFieldLabel}
                    onLoad={handleMaskEditorImageLoad}
                    className="block max-h-[68vh] w-auto max-w-full object-contain"
                  />
                  <canvas
                    ref={maskCanvasRef}
                    onPointerDown={handleMaskPointerDown}
                    onPointerMove={handleMaskPointerMove}
                    onPointerUp={endMaskStroke}
                    onPointerLeave={endMaskStroke}
                    onPointerCancel={endMaskStroke}
                    className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                  />
                </div>
              </div>
            </div>
            {maskEditorError ? (
              <p className="mt-3 text-xs text-[#B42318]">{maskEditorError}</p>
            ) : (
              <p className="mt-3 text-xs text-black/55">
                Source image: {maskEditorState.sourceFieldLabel}
              </p>
            )}
          </div>
        </div>
      ) : null}

      {historyDeleteTarget ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl border border-black/[0.1] bg-white p-5 shadow-2xl">
            <h4 className="text-base font-semibold text-black">Delete this history image?</h4>
            <p className="mt-2 text-sm leading-6 text-black/60">
              This will remove the generated image from your history and delete the related playground task record.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                disabled={deletingHistoryRequestId === historyDeleteTarget.requestId}
                onClick={() => setHistoryDeleteTarget(null)}
                className="h-9 rounded border border-black/[0.12] px-3 text-xs font-medium text-black/70 hover:bg-black/[0.03] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingHistoryRequestId === historyDeleteTarget.requestId}
                onClick={() => void deleteHistoryImage()}
                className="h-9 rounded border border-[#F2B8B5] bg-[#FEF2F2] px-3 text-xs font-medium text-[#B42318] hover:bg-[#FDE8E8] disabled:opacity-50"
              >
                {deletingHistoryRequestId === historyDeleteTarget.requestId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {resultModalOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-black/[0.1] bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-black">Details</h4>
                {taskId ? (
                  <p className="mt-1 text-[11px] text-black/40">
                    Task ID:
                    <code className="ml-1 break-all font-mono text-black/55">{taskId}</code>
                  </p>
                ) : null}
              </div>
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
