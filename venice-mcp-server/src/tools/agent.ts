import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { runAgent, type AgentResult } from "../agent.js";
import { jsonResult, responseFormatField, ResponseFormat, textResult } from "../format.js";
import { resolveModel, SEARCH_PROVIDERS } from "../venice.js";

function renderMarkdown(result: AgentResult): string {
  const lines = [result.answer.trim()];

  if (result.sources.length > 0 && !/\n#*\s*sources\b/i.test(result.answer)) {
    lines.push("", "## Sources consulted");
    result.sources.forEach((source, index) => {
      lines.push(`${index + 1}. ${source.title} - ${source.url}${source.read ? " (read in full)" : ""}`);
    });
  }

  if (result.tool_calls.length > 0) {
    lines.push("", "## Agent trace");
    for (const call of result.tool_calls) {
      lines.push(`- Round ${call.step}: \`${call.tool}\` ${call.ok ? "✓" : "✗"} ${call.summary}`);
    }
  }

  const stop = result.stopped_reason === "step_limit" ? " · stopped at the step limit" : "";
  lines.push(
    "",
    `_Model: ${result.model} · rounds: ${result.steps} · tokens: ${result.usage.total_tokens}${result.images.length ? ` · images: ${result.images.length}` : ""}${stop}_`
  );
  return lines.join("\n");
}

export function registerAgentTools(server: McpServer): void {
  server.registerTool(
    "venice_agent",
    {
      title: "Venice Agent",
      description: `Delegate a task to an autonomous Venice.ai agent. It plans, searches the web, reads pages, and (optionally) generates images over several rounds, then returns a cited answer with a trace of what it did.

Use it for research and multi-step questions that need current information, such as comparisons, fact-finding across several sources, or summarizing a set of pages. For a single prompt with no tool use, venice_chat is faster and cheaper; for raw search results, use venice_web_search.

Examples:
  - "Compare the three most recent open-weight LLM releases by context length and license" -> task=that text, max_steps=6
  - "Summarize https://example.com/post and find two critical responses to it" -> task=that text
  - "Design a logo concept for a privacy-first note app and generate it" -> allow_image_generation=true

The agent runs on a Venice model that supports function calling (chosen from the live catalog unless model is set). Each round makes one model call plus its tool calls, all billed to the Venice account. Returns the answer, sources, a step trace and token usage; generated images are attached as image content.`,
      inputSchema: z.strictObject({
        task: z.string().min(3).max(8_000).describe("What the agent should accomplish, stated as you would to a capable researcher"),
        context: z
          .string()
          .max(40_000)
          .optional()
          .describe("Background material for the task, such as notes, a draft, or data. The agent reads it but does not need to search for it"),
        instructions: z
          .string()
          .max(4_000)
          .optional()
          .describe("Extra rules for the agent, e.g. 'Answer in a markdown table' or 'Only use sources from 2026'"),
        model: z
          .string()
          .optional()
          .describe("Venice text model ID that supports function calling. Defaults to VENICE_AGENT_MODEL or Venice's function-calling default model"),
        character_slug: z.string().optional().describe("Venice character to run the agent as. Find slugs with venice_list_characters"),
        max_steps: z.number().int().min(1).max(15).default(6).describe("Maximum rounds of tool calls before the agent must answer"),
        allow_image_generation: z.boolean().default(false).describe("Let the agent generate images (extra cost). Off by default"),
        search_provider: z.enum(SEARCH_PROVIDERS).optional().describe("Web search backend: brave (default), google, or exa"),
        temperature: z.number().min(0).max(2).optional().describe("Sampling temperature for the agent model"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args, ctx) => {
      const signal = ctx.mcpReq.signal;
      const model = await resolveModel("agent", args.model, signal);
      const progressToken = ctx.mcpReq._meta?.progressToken;

      const result = await runAgent({
        task: args.task,
        ...(args.context ? { context: args.context } : {}),
        ...(args.instructions ? { instructions: args.instructions } : {}),
        model,
        ...(args.character_slug ? { characterSlug: args.character_slug } : {}),
        maxSteps: args.max_steps,
        allowImages: args.allow_image_generation,
        ...(args.search_provider ? { searchProvider: args.search_provider } : {}),
        ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
        signal,
        ...(progressToken !== undefined
          ? {
              onProgress: async (progress: number, total: number, message: string) => {
                await ctx.mcpReq
                  .notify({ method: "notifications/progress", params: { progressToken, progress, total, message } })
                  .catch(() => undefined);
              }
            }
          : {})
      });

      const imageBlocks = result.images.map(image => ({ type: "image" as const, data: image.data, mimeType: image.mimeType }));
      if (args.response_format === ResponseFormat.JSON) {
        const { images, ...rest } = result;
        return jsonResult({ ...rest, image_count: images.length }, imageBlocks);
      }
      return textResult(renderMarkdown(result), imageBlocks);
    }
  );
}
