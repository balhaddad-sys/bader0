/**
 * Venice domain helpers shared by the tools and the agent loop:
 * chat completions, the model catalog, web search, scraping and image generation.
 * Upstream responses are validated with loose Zod schemas so new Venice fields never break parsing.
 */
import * as z from "zod/v4";
import { veniceJson } from "./api.js";
import { config } from "./config.js";

// ---------------------------------------------------------------------------
// Chat completions
// ---------------------------------------------------------------------------

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type ChatMessage =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

export interface FunctionTool {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export type WebSearchMode = "auto" | "on" | "off";

export interface VeniceParameters {
  enable_web_search?: WebSearchMode;
  enable_web_citations?: boolean;
  enable_web_scraping?: boolean;
  include_venice_system_prompt?: boolean;
  character_slug?: string;
  strip_thinking_response?: boolean;
  disable_thinking?: boolean;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_completion_tokens?: number;
  tools?: FunctionTool[];
  tool_choice?: "auto" | "none";
  venice_parameters?: VeniceParameters;
}

const ToolCallSchema = z.looseObject({
  id: z.string().nullish(),
  type: z.string().nullish(),
  function: z.looseObject({
    name: z.string(),
    arguments: z.union([z.string(), z.record(z.string(), z.unknown())]).nullish()
  })
});

const CitationSchema = z.looseObject({
  title: z.string().nullish(),
  url: z.string().nullish(),
  content: z.string().nullish(),
  date: z.string().nullish()
});

const CompletionSchema = z.looseObject({
  id: z.string().nullish(),
  model: z.string().nullish(),
  choices: z
    .array(
      z.looseObject({
        finish_reason: z.string().nullish(),
        message: z.looseObject({
          content: z.union([z.string(), z.array(z.unknown())]).nullish(),
          reasoning_content: z.string().nullish(),
          tool_calls: z.array(ToolCallSchema).nullish()
        })
      })
    )
    .min(1),
  usage: z
    .looseObject({
      prompt_tokens: z.number().nullish(),
      completion_tokens: z.number().nullish(),
      total_tokens: z.number().nullish()
    })
    .nullish(),
  venice_parameters: z.looseObject({ web_search_citations: z.array(CitationSchema).nullish() }).nullish()
});

export interface Citation {
  title: string;
  url: string;
  date?: string;
}

export interface Usage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ChatResult {
  id?: string;
  model: string;
  content: string;
  tool_calls: ToolCall[];
  finish_reason?: string;
  citations: Citation[];
  usage: Usage;
}

/** Removes <think>…</think> blocks that some reasoning models leave in the visible answer. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/^[\s\S]*?<\/think>/i, "").trim();
}

function contentToText(content: string | unknown[] | null | undefined): string {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map(part => (part && typeof part === "object" && "text" in part ? String((part as { text: unknown }).text) : ""))
    .join("");
}

export async function chatCompletion(request: ChatRequest, signal: AbortSignal): Promise<ChatResult> {
  const raw = await veniceJson("chat/completions", { body: { ...request, stream: false } }, signal);
  const parsed = CompletionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Venice returned a chat completion without any choices. Retry, or try a different model.");
  }
  const data = parsed.data;
  const choice = data.choices[0]!;

  const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((call, index) => ({
    id: call.id || `call_${index + 1}`,
    type: "function",
    function: {
      name: call.function.name,
      arguments:
        typeof call.function.arguments === "string" ? call.function.arguments : JSON.stringify(call.function.arguments ?? {})
    }
  }));

  const citations: Citation[] = [];
  for (const citation of data.venice_parameters?.web_search_citations ?? []) {
    if (!citation.url) continue;
    citations.push({ title: citation.title || citation.url, url: citation.url, ...(citation.date ? { date: citation.date } : {}) });
  }

  return {
    ...(data.id ? { id: data.id } : {}),
    model: data.model || request.model,
    content: stripThinking(contentToText(choice.message.content)),
    tool_calls: toolCalls,
    ...(choice.finish_reason ? { finish_reason: choice.finish_reason } : {}),
    citations,
    usage: {
      prompt_tokens: data.usage?.prompt_tokens ?? 0,
      completion_tokens: data.usage?.completion_tokens ?? 0,
      total_tokens: data.usage?.total_tokens ?? (data.usage?.prompt_tokens ?? 0) + (data.usage?.completion_tokens ?? 0)
    }
  };
}

// ---------------------------------------------------------------------------
// Model catalog
// ---------------------------------------------------------------------------

export const MODEL_TYPES = ["text", "image", "embedding", "tts", "asr", "upscale", "inpaint", "video", "music", "all"] as const;
export type ModelType = (typeof MODEL_TYPES)[number];

const ModelSchema = z.looseObject({
  id: z.string(),
  type: z.string().nullish(),
  context_length: z.number().nullish(),
  model_spec: z
    .looseObject({
      name: z.string().nullish(),
      description: z.string().nullish(),
      traits: z.array(z.string()).nullish(),
      capabilities: z.record(z.string(), z.unknown()).nullish(),
      availableContextTokens: z.number().nullish(),
      privacy: z.string().nullish(),
      offline: z.boolean().nullish(),
      betaModel: z.boolean().nullish()
    })
    .nullish()
});
const ModelListSchema = z.looseObject({ data: z.array(z.unknown()) });

export interface ModelSummary {
  id: string;
  type?: string;
  name?: string;
  context_tokens?: number;
  traits: string[];
  capabilities: string[];
  privacy?: string;
  offline?: boolean;
  beta?: boolean;
}

const MODEL_CACHE_TTL_MS = 10 * 60 * 1000;
const modelCache = new Map<ModelType, { expiresAt: number; models: ModelSummary[] }>();

function summarizeModel(raw: unknown): ModelSummary | undefined {
  const parsed = ModelSchema.safeParse(raw);
  if (!parsed.success) return undefined;
  const model = parsed.data;
  const spec = model.model_spec;
  const capabilities = Object.entries(spec?.capabilities ?? {})
    .filter(([, enabled]) => enabled === true)
    .map(([name]) => name);
  const contextTokens = spec?.availableContextTokens ?? model.context_length ?? undefined;
  return {
    id: model.id,
    ...(model.type ? { type: model.type } : {}),
    ...(spec?.name ? { name: spec.name } : {}),
    ...(contextTokens ? { context_tokens: contextTokens } : {}),
    traits: spec?.traits ?? [],
    capabilities,
    ...(spec?.privacy ? { privacy: spec.privacy } : {}),
    ...(spec?.offline ? { offline: true } : {}),
    ...(spec?.betaModel ? { beta: true } : {})
  };
}

/** Lists models of one type, cached for ten minutes because the catalog rarely changes. */
export async function listModels(type: ModelType, signal: AbortSignal): Promise<ModelSummary[]> {
  const cached = modelCache.get(type);
  if (cached && cached.expiresAt > Date.now()) return cached.models;
  const raw = await veniceJson("models", { query: { type } }, signal);
  const parsed = ModelListSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Venice returned a model list in an unexpected shape. Retry shortly.");
  const models = parsed.data.data.map(summarizeModel).filter((model): model is ModelSummary => model !== undefined);
  modelCache.set(type, { expiresAt: Date.now() + MODEL_CACHE_TTL_MS, models });
  return models;
}

type ModelRole = "chat" | "agent" | "image";

/**
 * Picks the model for a call: the explicit argument, then the environment override,
 * then the live catalog by Venice trait (e.g. "function_calling_default" for the agent).
 */
export async function resolveModel(role: ModelRole, explicit: string | undefined, signal: AbortSignal): Promise<string> {
  if (explicit) return explicit;
  const override = role === "chat" ? config.chatModel : role === "agent" ? config.agentModel : config.imageModel;
  if (override) return override;

  const models = (await listModels(role === "image" ? "image" : "text", signal)).filter(model => !model.offline);
  const byTrait = (trait: string) => models.find(model => model.traits.includes(trait));
  const pick =
    role === "agent"
      ? byTrait("function_calling_default") ?? models.find(model => model.capabilities.includes("supportsFunctionCalling")) ?? byTrait("default")
      : byTrait("default");
  const chosen = pick ?? models[0];
  if (!chosen) {
    throw new Error(`Venice listed no available ${role === "image" ? "image" : "text"} models. Pass a model ID explicitly.`);
  }
  return chosen.id;
}

// ---------------------------------------------------------------------------
// Web search and scraping
// ---------------------------------------------------------------------------

export const SEARCH_PROVIDERS = ["brave", "google", "exa"] as const;
export type SearchProvider = (typeof SEARCH_PROVIDERS)[number];

export interface SearchResult {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

/** Finds the result list whether Venice returns `results`, `data`, or `web.results`. */
function extractResultArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return [];
  const record = raw as Record<string, unknown>;
  for (const key of ["results", "data", "items"]) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  const web = record.web;
  if (web && typeof web === "object" && Array.isArray((web as Record<string, unknown>).results)) {
    return (web as Record<string, unknown>).results as unknown[];
  }
  return [];
}

export async function webSearch(
  query: string,
  limit: number,
  provider: SearchProvider | undefined,
  signal: AbortSignal
): Promise<SearchResult[]> {
  const raw = await veniceJson(
    "augment/search",
    { body: { query, limit, ...(provider ? { search_provider: provider } : {}) } },
    signal
  );
  const results: SearchResult[] = [];
  for (const item of extractResultArray(raw)) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const url = pickString(record, ["url", "link", "href"]);
    if (!url) continue;
    const snippet = pickString(record, ["snippet", "description", "content", "text", "summary"]);
    const date = pickString(record, ["date", "published_date", "publishedDate", "age"]);
    results.push({
      title: pickString(record, ["title", "name"]) ?? url,
      url,
      ...(snippet ? { snippet } : {}),
      ...(date ? { date } : {})
    });
  }
  return results.slice(0, limit);
}

export interface ScrapeResult {
  url: string;
  title?: string;
  content: string;
}

// Scrapes are billed per call, so a short-lived cache lets callers page through a long page without paying twice.
const SCRAPE_CACHE_TTL_MS = 10 * 60 * 1000;
const SCRAPE_CACHE_MAX = 16;
const scrapeCache = new Map<string, { expiresAt: number; result: ScrapeResult }>();

export async function scrapeUrl(url: string, signal: AbortSignal): Promise<ScrapeResult> {
  const cached = scrapeCache.get(url);
  if (cached && cached.expiresAt > Date.now()) return cached.result;

  const raw = await veniceJson("augment/scrape", { body: { url } }, signal);
  let content = "";
  let title: string | undefined;
  if (typeof raw === "string") {
    content = raw;
  } else if (raw && typeof raw === "object") {
    const record = raw as Record<string, unknown>;
    const inner = record.data && typeof record.data === "object" ? (record.data as Record<string, unknown>) : record;
    content = pickString(inner, ["markdown", "content", "text", "html"]) ?? "";
    title = pickString(inner, ["title"]) ?? pickString((inner.metadata as Record<string, unknown>) ?? {}, ["title"]);
  }
  if (!content) throw new Error(`Venice returned no readable content for ${url}. The page may block scraping or need JavaScript.`);

  const result: ScrapeResult = { url, ...(title ? { title } : {}), content };
  if (scrapeCache.size >= SCRAPE_CACHE_MAX) {
    const oldest = scrapeCache.keys().next();
    if (!oldest.done) scrapeCache.delete(oldest.value);
  }
  scrapeCache.set(url, { expiresAt: Date.now() + SCRAPE_CACHE_TTL_MS, result });
  return result;
}

// ---------------------------------------------------------------------------
// Image generation
// ---------------------------------------------------------------------------

export interface ImageRequest {
  prompt: string;
  model?: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  aspect_ratio?: string;
  resolution?: string;
  style_preset?: string;
  seed?: number;
  steps?: number;
  cfg_scale?: number;
  variants?: number;
  format?: "webp" | "png" | "jpeg";
  safe_mode?: boolean;
  hide_watermark?: boolean;
}

export interface GeneratedImage {
  data: string;
  mimeType: string;
}

const ImageResponseSchema = z.looseObject({
  id: z.string().nullish(),
  images: z.array(z.string()).nullish(),
  data: z.array(z.looseObject({ b64_json: z.string().nullish() })).nullish()
});

/** Reads the image type from the first bytes of base64 data. */
export function detectImageMime(base64: string): string {
  if (base64.startsWith("/9j/")) return "image/jpeg";
  if (base64.startsWith("iVBOR")) return "image/png";
  if (base64.startsWith("UklGR")) return "image/webp";
  if (base64.startsWith("R0lGOD")) return "image/gif";
  return "image/png";
}

export async function generateImage(
  request: ImageRequest,
  signal: AbortSignal
): Promise<{ id?: string; model: string; images: GeneratedImage[] }> {
  const model = await resolveModel("image", request.model, signal);
  const raw = await veniceJson("image/generate", { body: { ...request, model, return_binary: false } }, signal);
  const parsed = ImageResponseSchema.safeParse(raw);
  const encoded = parsed.success
    ? [...(parsed.data.images ?? []), ...(parsed.data.data ?? []).map(item => item.b64_json ?? "")].filter(Boolean)
    : [];
  if (encoded.length === 0) {
    throw new Error("Venice returned no images. The prompt may have been refused; rephrase it or try another model.");
  }
  return {
    ...(parsed.success && parsed.data.id ? { id: parsed.data.id } : {}),
    model,
    images: encoded.map(data => {
      const clean = data.replace(/^data:[^;]+;base64,/, "");
      return { data: clean, mimeType: detectImageMime(clean) };
    })
  };
}
