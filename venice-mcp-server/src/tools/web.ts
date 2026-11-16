import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { CHARACTER_LIMIT } from "../config.js";
import { jsonResult, responseFormatField, ResponseFormat, textResult } from "../format.js";
import { scrapeUrl, SEARCH_PROVIDERS, webSearch } from "../venice.js";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

export function registerWebTools(server: McpServer): void {
  server.registerTool(
    "venice_web_search",
    {
      title: "Venice Web Search",
      description: `Search the web through Venice.ai and return the raw results: title, URL, snippet and date for each.

Providers: brave (default, zero data retention), google (proxied and anonymized by Venice), exa (zero data retention).

Examples:
  - "Find the official docs for X" -> query="X documentation"
  - "Recent coverage of Y" -> query="Y news", limit=10

To have an agent search, read and synthesize an answer for you, use venice_agent. To read one result in full, use venice_web_scrape.`,
      inputSchema: z.strictObject({
        query: z.string().min(1).max(400).describe("Search query"),
        limit: z.number().int().min(1).max(20).default(8).describe("Number of results to return"),
        search_provider: z.enum(SEARCH_PROVIDERS).optional().describe("brave (default), google, or exa"),
        response_format: responseFormatField
      }),
      annotations: READ_ONLY
    },
    async ({ query, limit, search_provider, response_format }, ctx) => {
      const results = await webSearch(query, limit, search_provider, ctx.mcpReq.signal);
      if (response_format === ResponseFormat.JSON) {
        return jsonResult({ query, count: results.length, results });
      }
      if (results.length === 0) return textResult(`No results for "${query}". Try a broader or differently worded query.`);
      const lines = [`# Web results for "${query}"`, ""];
      results.forEach((result, index) => {
        lines.push(`${index + 1}. **${result.title}**${result.date ? ` (${result.date})` : ""}`, `   ${result.url}`);
        if (result.snippet) lines.push(`   ${result.snippet.replace(/\s+/g, " ").slice(0, 400)}`);
      });
      return textResult(lines.join("\n"));
    }
  );

  server.registerTool(
    "venice_web_scrape",
    {
      title: "Venice Web Scrape",
      description: `Fetch a web page through Venice.ai and return its main content as markdown.

Long pages come back in chunks of ${CHARACTER_LIMIT} characters. When more remains, the result gives next_offset; call again with offset set to it. Recent pages are cached for 10 minutes, so paging does not scrape again.

Example: "Read https://example.com/article" -> url="https://example.com/article"`,
      inputSchema: z.strictObject({
        url: z.url({ protocol: /^https?$/ }).describe("Absolute http(s) URL of the page"),
        offset: z.number().int().min(0).default(0).describe("Character offset to start from, for paging through long pages"),
        response_format: responseFormatField
      }),
      annotations: READ_ONLY
    },
    async ({ url, offset, response_format }, ctx) => {
      const page = await scrapeUrl(url, ctx.mcpReq.signal);
      const total = page.content.length;
      if (offset >= total && total > 0) {
        throw new Error(`offset ${offset} is past the end of the page (${total} characters). Use an offset below ${total}.`);
      }
      const chunk = page.content.slice(offset, offset + CHARACTER_LIMIT);
      const nextOffset = offset + chunk.length;
      const hasMore = nextOffset < total;

      if (response_format === ResponseFormat.JSON) {
        return jsonResult({
          url,
          title: page.title ?? null,
          total_chars: total,
          offset,
          content: chunk,
          has_more: hasMore,
          ...(hasMore ? { next_offset: nextOffset } : {})
        });
      }
      const header = `# ${page.title ?? url}\nSource: ${url}\n\n`;
      const footer = hasMore
        ? `\n\n---\nShowing characters ${offset}-${nextOffset} of ${total}. More content: call again with offset=${nextOffset}.`
        : "";
      return textResult(header + chunk + footer);
    }
  );
}
