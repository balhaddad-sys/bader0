/**
 * Shared output helpers: the response_format argument, result builders and pagination.
 */
import type { CallToolResult } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CHARACTER_LIMIT } from "./config.js";

export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

export const responseFormatField = z
  .enum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("'markdown' for readable text (default), 'json' for structured data");

/** A JSON-mode result: the data as structuredContent plus the same data as JSON text, per the MCP spec. */
export function jsonResult(data: Record<string, unknown>, extra: CallToolResult["content"] = []): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }, ...extra], structuredContent: data };
}

export function textResult(text: string, extra: CallToolResult["content"] = []): CallToolResult {
  return { content: [{ type: "text", text }, ...extra] };
}

/** Cuts long free text at a line break near the limit and says how much was left out. */
export function truncateText(text: string, limit: number = CHARACTER_LIMIT): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  const cut = text.lastIndexOf("\n", limit);
  const end = cut > limit * 0.8 ? cut : limit;
  return { text: `${text.slice(0, end)}\n\n[… ${text.length - end} more characters truncated]`, truncated: true };
}

/**
 * Renders one page of items and halves the page until its text fits under CHARACTER_LIMIT.
 * next_offset then points at the first item left out, so nothing is silently dropped.
 */
export function paginate<T>(
  all: T[],
  offset: number,
  limit: number,
  render: (page: { items: T[]; total: number; offset: number; has_more: boolean; next_offset?: number }) => string
): { text: string; items: T[]; total: number; has_more: boolean; next_offset?: number } {
  let items = all.slice(offset, offset + limit);
  const build = () => {
    const nextOffset = offset + items.length;
    const hasMore = all.length > nextOffset;
    const page = { items, total: all.length, offset, has_more: hasMore, ...(hasMore ? { next_offset: nextOffset } : {}) };
    return { ...page, text: render(page) };
  };
  let result = build();
  while (items.length > 1 && result.text.length > CHARACTER_LIMIT) {
    items = items.slice(0, Math.ceil(items.length / 2));
    result = build();
  }
  return result;
}
