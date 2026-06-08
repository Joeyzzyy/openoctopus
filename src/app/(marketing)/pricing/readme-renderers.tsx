"use client";

import type { ReactNode } from "react";
import { Fragment, useMemo } from "react";
import { Check, Copy } from "lucide-react";

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

export function looksLikeHtmlDocument(text: string) {
  return /^\s*<[^>]+>/.test(text);
}

function escapeHtmlAttribute(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function sanitizeReadmeHref(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
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
      const safeHref = sanitizeReadmeHref(href);
      return safeHref
        ? `<a href="${escapeHtmlAttribute(safeHref)}" target="_blank" rel="noreferrer">`
        : "<a>";
    }

    if (safeTag === "br") {
      return "<br />";
    }

    return `<${safeTag}>`;
  });

  return sanitized.trim();
}

export function ReadmeSeoHeading({
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

export function HtmlReadme({
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

export function MarkdownReadme({
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

export function MarkdownChatMessage({
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

