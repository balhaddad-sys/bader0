import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { veniceJson } from "../api.js";
import { CHARACTER_LIMIT } from "../config.js";
import { jsonResult, paginate, responseFormatField, ResponseFormat, textResult } from "../format.js";
import { listModels, MODEL_TYPES, type ModelSummary } from "../venice.js";

const READ_ONLY = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true } as const;

const CharacterSchema = z.looseObject({
  name: z.string(),
  slug: z.string(),
  description: z.string().nullish(),
  tags: z.array(z.string()).nullish(),
  modelId: z.string().nullish(),
  webEnabled: z.boolean().nullish(),
  adult: z.boolean().nullish()
});
type Character = z.infer<typeof CharacterSchema>;

const RateLimitsSchema = z.looseObject({
  data: z.looseObject({
    accessPermitted: z.boolean().nullish(),
    apiTier: z.looseObject({ id: z.string().nullish(), isCharged: z.boolean().nullish() }).nullish(),
    balances: z.record(z.string(), z.unknown()).nullish(),
    keyExpiration: z.string().nullish(),
    nextEpochBegins: z.string().nullish(),
    rateLimits: z
      .array(
        z.looseObject({
          apiModelId: z.string(),
          rateLimits: z.array(z.looseObject({ amount: z.number(), type: z.string() })).nullish()
        })
      )
      .nullish()
  })
});

/** "supportsFunctionCalling" -> "function calling" */
function capabilityLabel(name: string): string {
  return name
    .replace(/^supports/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
}

function formatModel(model: ModelSummary): string {
  const parts = [`- **${model.name ?? model.id}** (\`${model.id}\`)`];
  const details: string[] = [];
  if (model.type) details.push(model.type);
  if (model.context_tokens) details.push(`${Math.round(model.context_tokens / 1000)}k context`);
  if (model.privacy) details.push(model.privacy);
  if (model.beta) details.push("beta");
  if (model.offline) details.push("offline");
  if (details.length) parts.push(` - ${details.join(", ")}`);
  const lines = [parts.join("")];
  if (model.traits.length) lines.push(`  - Traits: ${model.traits.join(", ")}`);
  if (model.capabilities.length) lines.push(`  - Capabilities: ${model.capabilities.map(capabilityLabel).join(", ")}`);
  return lines.join("\n");
}

function formatCharacter(character: Character): string {
  const lines = [`- **${character.name}** (slug: \`${character.slug}\`)`];
  if (character.description) lines.push(`  ${character.description.replace(/\s+/g, " ").slice(0, 300)}`);
  const meta: string[] = [];
  if (character.modelId) meta.push(`model ${character.modelId}`);
  if (character.webEnabled) meta.push("web search");
  if (character.adult) meta.push("adult");
  if (character.tags?.length) meta.push(`tags: ${character.tags.slice(0, 6).join(", ")}`);
  if (meta.length) lines.push(`  _${meta.join(" · ")}_`);
  return lines.join("\n");
}

export function registerCatalogTools(server: McpServer): void {
  server.registerTool(
    "venice_list_models",
    {
      title: "Venice List Models",
      description: `List Venice.ai models of one type with their IDs, context size, traits and capabilities.

Traits mark Venice's picks, such as "default", "fastest", "most_uncensored", "default_reasoning" or "function_calling_default". Capabilities show support for function calling, web search, reasoning and vision.

Examples:
  - "Which models can the agent use?" -> type="text", capability="supportsFunctionCalling"
  - "Image models" -> type="image"
  - "Is there a Qwen model?" -> type="text", query="qwen"`,
      inputSchema: z.strictObject({
        type: z.enum(MODEL_TYPES).default("text").describe("Model type to list"),
        query: z.string().max(100).optional().describe("Only models whose ID or name contains this text (case-insensitive)"),
        capability: z
          .string()
          .max(60)
          .optional()
          .describe("Only models with this capability, e.g. 'supportsFunctionCalling', 'supportsWebSearch', 'supportsVision', 'supportsReasoning'"),
        limit: z.number().int().min(1).max(200).default(50).describe("Maximum models to return"),
        offset: z.number().int().min(0).default(0).describe("Models to skip, for pagination"),
        response_format: responseFormatField
      }),
      annotations: READ_ONLY
    },
    async ({ type, query, capability, limit, offset, response_format }, ctx) => {
      let models = await listModels(type, ctx.mcpReq.signal);
      if (query) {
        const needle = query.toLowerCase();
        models = models.filter(model => model.id.toLowerCase().includes(needle) || model.name?.toLowerCase().includes(needle));
      }
      if (capability) {
        const wanted = capability.toLowerCase().replace(/^supports/, "");
        models = models.filter(model => model.capabilities.some(name => name.toLowerCase().replace(/^supports/, "") === wanted));
      }

      const page = paginate(models, offset, limit, ({ items, total, has_more, next_offset }) => {
        if (response_format === ResponseFormat.JSON) {
          return JSON.stringify({ type, total, count: items.length, offset, models: items, has_more, ...(has_more ? { next_offset } : {}) }, null, 2);
        }
        const lines = [`# Venice ${type} models`, `Showing ${items.length} of ${total}.`, "", ...items.map(formatModel)];
        if (has_more) lines.push("", `More models: call again with offset=${next_offset}.`);
        return lines.join("\n");
      });

      if (response_format === ResponseFormat.JSON) {
        return {
          content: [{ type: "text", text: page.text }],
          structuredContent: JSON.parse(page.text) as Record<string, unknown>
        };
      }
      if (page.total === 0) return textResult(`No ${type} models match. Remove the query or capability filter, or try another type.`);
      return textResult(page.text);
    }
  );

  server.registerTool(
    "venice_list_characters",
    {
      title: "Venice List Characters",
      description: `Search Venice.ai's public characters: personas with their own system prompt and model. Pass a character's slug as character_slug to venice_chat or venice_agent to answer as that character.

Example: "Find a Socratic tutor character" -> search="socratic"`,
      inputSchema: z.strictObject({
        search: z.string().max(200).optional().describe("Text to match against character names, descriptions and tags"),
        limit: z.number().int().min(1).max(100).default(20).describe("Maximum characters to return"),
        offset: z.number().int().min(0).default(0).describe("Characters to skip, for pagination"),
        response_format: responseFormatField
      }),
      annotations: READ_ONLY
    },
    async ({ search, limit, offset, response_format }, ctx) => {
      const raw = await veniceJson("characters", { query: { search, limit, offset } }, ctx.mcpReq.signal);
      const list = z.looseObject({ data: z.array(z.unknown()) }).safeParse(raw);
      if (!list.success) throw new Error("Venice returned the character list in an unexpected shape. Retry shortly.");
      const characters = list.data.data
        .map(item => CharacterSchema.safeParse(item))
        .filter(result => result.success)
        .map(result => result.data);

      // If Venice honored limit/offset, this is already one page; if it returned everything, page it here
      const serverPaged = characters.length <= limit;
      const all = serverPaged ? characters : characters.slice(offset);
      let items = all.slice(0, limit);
      const render = () => {
        const hasMore = serverPaged ? characters.length === limit : all.length > items.length;
        const nextOffset = offset + items.length;
        const body = {
          count: items.length,
          offset,
          characters: items.map(c => ({
            name: c.name,
            slug: c.slug,
            description: c.description ?? null,
            model: c.modelId ?? null,
            web_enabled: c.webEnabled ?? false,
            adult: c.adult ?? false,
            tags: c.tags ?? []
          })),
          has_more: hasMore,
          ...(hasMore ? { next_offset: nextOffset } : {})
        };
        if (response_format === ResponseFormat.JSON) return { body, text: JSON.stringify(body, null, 2) };
        const lines = [`# Venice characters${search ? ` matching "${search}"` : ""}`, "", ...items.map(formatCharacter)];
        if (hasMore) lines.push("", `More characters: call again with offset=${nextOffset}.`);
        return { body, text: lines.join("\n") };
      };
      let result = render();
      while (items.length > 1 && result.text.length > CHARACTER_LIMIT) {
        items = items.slice(0, Math.ceil(items.length / 2));
        result = render();
      }

      if (response_format === ResponseFormat.JSON) return jsonResult(result.body);
      if (items.length === 0) return textResult(`No characters${search ? ` match "${search}"` : " found"}. Try a different search.`);
      return textResult(result.text);
    }
  );

  server.registerTool(
    "venice_account_limits",
    {
      title: "Venice Account Limits",
      description:
        "Show this Venice API key's balances (USD, DIEM), access tier, key expiry and per-model rate limits. Use it to check remaining credit or why requests hit 402/429 errors. Filter rate limits with model.",
      inputSchema: z.strictObject({
        model: z.string().max(100).optional().describe("Only show rate limits for model IDs containing this text"),
        response_format: responseFormatField
      }),
      annotations: READ_ONLY
    },
    async ({ model, response_format }, ctx) => {
      const raw = await veniceJson("api_keys/rate_limits", {}, ctx.mcpReq.signal);
      const parsed = RateLimitsSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Venice returned account limits in an unexpected shape. Retry shortly.");
      const data = parsed.data.data;
      const needle = model?.toLowerCase();
      let limits = (data.rateLimits ?? [])
        .filter(entry => !needle || entry.apiModelId.toLowerCase().includes(needle))
        .map(entry => ({
          model: entry.apiModelId,
          limits: Object.fromEntries((entry.rateLimits ?? []).map(limit => [limit.type, limit.amount]))
        }));
      const matchingModels = limits.length;

      const render = () => {
        const body = {
          access_permitted: data.accessPermitted ?? null,
          tier: data.apiTier?.id ?? null,
          balances: data.balances ?? {},
          key_expiration: data.keyExpiration ?? null,
          next_epoch_begins: data.nextEpochBegins ?? null,
          rate_limits: limits,
          rate_limits_truncated: limits.length < matchingModels
        };
        if (response_format === ResponseFormat.JSON) return { body, text: JSON.stringify(body, null, 2) };
        const balances = Object.entries(body.balances)
          .map(([currency, amount]) => `${currency}: ${typeof amount === "number" ? amount.toFixed(2) : String(amount)}`)
          .join(" · ");
        const lines = [
          "# Venice API key",
          `- Access permitted: ${body.access_permitted === null ? "unknown" : body.access_permitted ? "yes" : "no"}`,
          `- Tier: ${body.tier ?? "unknown"}`,
          `- Balances: ${balances || "none reported"}`,
          ...(body.key_expiration ? [`- Key expires: ${body.key_expiration}`] : []),
          ...(body.next_epoch_begins ? [`- Next epoch begins: ${body.next_epoch_begins}`] : []),
          "",
          `## Rate limits${needle ? ` for "${model}"` : ""} (${matchingModels} models)`
        ];
        for (const entry of limits) {
          const values = Object.entries(entry.limits).map(([kind, amount]) => `${kind} ${amount}`).join(", ");
          lines.push(`- \`${entry.model}\`: ${values || "none"}`);
        }
        if (body.rate_limits_truncated) {
          lines.push("", `Showing ${limits.length} of ${matchingModels} models. Pass model to filter.`);
        }
        return { body, text: lines.join("\n") };
      };
      let result = render();
      while (limits.length > 1 && result.text.length > CHARACTER_LIMIT) {
        limits = limits.slice(0, Math.ceil(limits.length / 2));
        result = render();
      }
      return response_format === ResponseFormat.JSON ? jsonResult(result.body) : textResult(result.text);
    }
  );
}
