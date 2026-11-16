import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { jsonResult, responseFormatField, ResponseFormat, textResult, truncateText } from "../format.js";
import { chatCompletion, resolveModel, type ChatMessage, type VeniceParameters } from "../venice.js";

const HistoryMessage = z.strictObject({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string().min(1).max(100_000)
});

export function registerChatTools(server: McpServer): void {
  server.registerTool(
    "venice_chat",
    {
      title: "Venice Chat",
      description: `Send a prompt to a Venice.ai text model and get its reply in one call. Venice models are private (no data retention) and include uncensored and reasoning models.

Options cover Venice's own features: built-in web search with citations, answering as a Venice character, and turning reasoning off. Pass earlier turns in messages for a multi-turn conversation.

Examples:
  - "Get a second opinion from a different model" -> prompt=the question, model="<id from venice_list_models>"
  - "What changed in the news about X today?" -> prompt=the question, web_search="on"
  - "Answer as a Venice character" -> character_slug="<slug from venice_list_characters>"

For multi-step research that needs several searches or reading pages, use venice_agent instead.`,
      inputSchema: z.strictObject({
        prompt: z.string().min(1).max(100_000).describe("The user message to send"),
        system: z.string().max(20_000).optional().describe("System prompt that sets the model's behavior"),
        messages: z
          .array(HistoryMessage)
          .max(100)
          .optional()
          .describe("Earlier conversation turns, oldest first. The prompt is sent after them as the newest user message"),
        model: z.string().optional().describe("Venice text model ID. Defaults to VENICE_CHAT_MODEL or Venice's default text model"),
        temperature: z.number().min(0).max(2).optional().describe("Sampling temperature"),
        max_tokens: z.number().int().min(1).max(64_000).optional().describe("Maximum tokens in the reply, including reasoning tokens"),
        web_search: z
          .enum(["off", "on", "auto"])
          .default("off")
          .describe("Venice web search: 'on' forces it, 'auto' lets the model decide, 'off' disables it"),
        web_citations: z.boolean().default(true).describe("When web search runs, ask the model to cite sources"),
        character_slug: z.string().optional().describe("Answer as this Venice character. Find slugs with venice_list_characters"),
        disable_thinking: z.boolean().optional().describe("Turn reasoning off on reasoning models for a faster reply"),
        include_venice_system_prompt: z
          .boolean()
          .optional()
          .describe("Keep Venice's default system prompt alongside yours (Venice defaults to true). Set false for full control"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async (args, ctx) => {
      const signal = ctx.mcpReq.signal;
      const model = await resolveModel("chat", args.model, signal);

      const messages: ChatMessage[] = [];
      if (args.system) messages.push({ role: "system", content: args.system });
      for (const message of args.messages ?? []) messages.push(message);
      messages.push({ role: "user", content: args.prompt });

      const venice_parameters: VeniceParameters = {
        enable_web_search: args.web_search,
        strip_thinking_response: true,
        ...(args.web_search !== "off" ? { enable_web_citations: args.web_citations } : {}),
        ...(args.character_slug ? { character_slug: args.character_slug } : {}),
        ...(args.disable_thinking !== undefined ? { disable_thinking: args.disable_thinking } : {}),
        ...(args.include_venice_system_prompt !== undefined ? { include_venice_system_prompt: args.include_venice_system_prompt } : {})
      };

      const result = await chatCompletion(
        {
          model,
          messages,
          ...(args.temperature !== undefined ? { temperature: args.temperature } : {}),
          ...(args.max_tokens !== undefined ? { max_completion_tokens: args.max_tokens } : {}),
          venice_parameters
        },
        signal
      );

      const answer = truncateText(result.content || "(The model returned an empty reply.)");
      if (args.response_format === ResponseFormat.JSON) {
        return jsonResult({
          model: result.model,
          answer: answer.text,
          truncated: answer.truncated,
          finish_reason: result.finish_reason ?? null,
          citations: result.citations,
          usage: result.usage
        });
      }

      const lines = [answer.text];
      if (result.citations.length > 0) {
        lines.push("", "## Web sources");
        result.citations.forEach((citation, index) => lines.push(`${index + 1}. ${citation.title} - ${citation.url}`));
      }
      const cutoff = result.finish_reason === "length" ? " · cut off at max_tokens" : "";
      lines.push("", `_Model: ${result.model} · tokens: ${result.usage.total_tokens}${cutoff}_`);
      return textResult(lines.join("\n"));
    }
  );
}
