/**
 * A local stand-in for the Venice API, used by the smoke test so every tool and the agent loop
 * can be exercised without a real key or network access. It mimics the response shapes the
 * server parses and records every request for assertions.
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export const MOCK_API_KEY = "test-key";

/** A 1x1 transparent PNG. */
export const PNG_1X1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export interface RecordedRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: any;
  /** The Authorization header as received, so tests can check that the API key is never sent to a download URL. */
  authorization?: string;
}

export interface MockVeniceOptions {
  /** Video models the catalog lists. Defaults to two wan-3-0 models plus models the tool must filter out. */
  videoModels?: string[];
  /** Reject quotes that carry anything beyond model and duration, like a stricter upstream. */
  strictQuote?: boolean;
  /** Answer quotes with a body that has no price in it, so the price cannot be read. */
  noQuote?: boolean;
}

/** What a finished hosted video is: tiny, but with a recognisable body. */
export const FAKE_VIDEO = Buffer.from("\x00\x00\x00\x18ftypmp42-fake-venice-clip", "latin1");

const DEFAULT_VIDEO_MODELS = ["wan-3-0-text-to-video", "wan-3-0-image-to-video", "wan-2-7-reference-to-video", "veo3.1-fast-text-to-video"];

interface VideoJob {
  model: string;
  mode: "binary" | "download_url" | "stuck" | "fail";
  polls: number;
}

const TEXT_MODELS = [
  {
    id: "venice-uncensored",
    type: "text",
    model_spec: { name: "Venice Uncensored", traits: ["most_uncensored"], availableContextTokens: 32768, capabilities: { supportsFunctionCalling: false } }
  },
  {
    id: "llama-3.3-70b",
    type: "text",
    model_spec: { name: "Llama 3.3 70B", traits: ["default"], availableContextTokens: 65536, capabilities: { supportsFunctionCalling: true, supportsWebSearch: true } }
  },
  {
    id: "qwen3-235b",
    type: "text",
    model_spec: {
      name: "Qwen 3 235B",
      traits: ["function_calling_default", "default_reasoning"],
      availableContextTokens: 131072,
      privacy: "private",
      capabilities: { supportsFunctionCalling: true, supportsReasoning: true, supportsWebSearch: true, supportsVision: false }
    }
  }
];

const IMAGE_MODELS = [
  { id: "flux-dev", type: "image", model_spec: { name: "FLUX Dev", traits: ["default"] } },
  { id: "hidream", type: "image", model_spec: { name: "HiDream", traits: [] } }
];

const CHARACTERS = [
  { name: "Socrates", slug: "socrates", description: "Asks questions until you find the answer yourself.", tags: ["philosophy", "tutor"], modelId: "llama-3.3-70b", webEnabled: false, adult: false },
  { name: "Ada", slug: "ada-lovelace", description: "Mathematician and first programmer.", tags: ["history", "math"], modelId: "qwen3-235b", webEnabled: true, adult: false },
  { name: "Noir Detective", slug: "noir-detective", description: "A hard-boiled detective.", tags: ["roleplay"], modelId: "venice-uncensored", webEnabled: false, adult: false }
];

/** Long enough that venice_web_scrape has to page it. */
const PRIVACY_PAGE = `# Venice Privacy\n\nVenice keeps conversation history in the browser, not on its servers.\n\n${"Lorem ipsum dolor sit amet. ".repeat(1200)}\n\nEND OF PAGE`;

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function completion(model: string, message: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    id: `chatcmpl-${Math.random().toString(16).slice(2)}`,
    object: "chat.completion",
    model,
    choices: [{ index: 0, finish_reason: message.tool_calls ? "tool_calls" : "stop", message: { role: "assistant", ...message } }],
    usage: { prompt_tokens: 100, completion_tokens: 20, total_tokens: 120 },
    ...extra
  };
}

function toolCall(id: string, name: string, args: string) {
  return { id, type: "function", function: { name, arguments: args } };
}

/** Scripted agent: search (plus one malformed call) -> scrape -> answer. Image tasks generate instead. */
function agentReply(body: any) {
  const messages: any[] = body.messages;
  const task = String(messages.find(m => m.role === "user")?.content ?? "");
  const toolMessages = messages.filter(m => m.role === "tool");

  if (body.tool_choice === "none") return completion(body.model, { content: "Forced final answer from gathered notes." });

  // Asks for three clips in one round, so the two-per-round cap has to reject one
  if (/video/i.test(task)) {
    if (toolMessages.length === 0) {
      return completion(body.model, {
        content: null,
        tool_calls: [1, 2, 3].map(n => toolCall(`v${n}`, "wan_video", JSON.stringify({ prompt: `fox shot ${n}`, duration_seconds: 2, seed: n })))
      });
    }
    return completion(body.model, { content: "Queued the fox shots; poll the job IDs with wan_status." });
  }

  if (/image/i.test(task)) {
    if (toolMessages.length === 0) {
      return completion(body.model, { content: null, tool_calls: [toolCall("img", "generate_image", JSON.stringify({ prompt: "a fox logo", width: 512, height: 512 }))] });
    }
    return completion(body.model, { content: "Here is the fox logo you asked for." });
  }

  if (toolMessages.length === 0) {
    return completion(body.model, {
      content: null,
      tool_calls: [toolCall("a", "web_search", JSON.stringify({ query: "venice ai privacy", limit: 3 })), toolCall("b", "web_search", '{"query": ')]
    });
  }
  if (!toolMessages.some(m => String(m.content).includes("# Venice Privacy\nURL:"))) {
    return completion(body.model, { content: null, tool_calls: [toolCall("a", "scrape_url", JSON.stringify({ url: "https://example.com/privacy" }))] });
  }
  return completion(body.model, { content: "<think>internal reasoning that must be hidden</think>Venice keeps conversation history in the browser [1]." });
}

function chatReply(body: any) {
  const last = body.messages[body.messages.length - 1];
  const extra =
    body.venice_parameters?.enable_web_search === "on"
      ? { venice_parameters: { web_search_citations: [{ title: "Venice blog", url: "https://example.com/blog", content: "…" }] } }
      : {};
  return completion(body.model, { content: `Echo: ${last.content}` }, extra);
}

async function readBody(req: IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const text = Buffer.concat(chunks).toString("utf8");
  return text ? JSON.parse(text) : undefined;
}

export async function startMockVenice(options: MockVeniceOptions = {}): Promise<{ url: string; requests: RecordedRequest[]; close: () => Promise<void> }> {
  const requests: RecordedRequest[] = [];
  const videoModels = options.videoModels ?? DEFAULT_VIDEO_MODELS;
  const videoJobs = new Map<string, VideoJob>();
  let queueCounter = 0;
  let baseUrl = "";

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const path = url.pathname.replace(/^\/api\/v1/, "");
    const body = await readBody(req);
    requests.push({ method: req.method ?? "GET", path, query: Object.fromEntries(url.searchParams), body, ...(req.headers.authorization ? { authorization: req.headers.authorization } : {}) });

    // A pre-signed download URL: no API key needed, and none should be sent
    if (req.method === "GET" && path.startsWith("/files/")) {
      res.writeHead(200, { "Content-Type": "video/mp4" });
      return res.end(FAKE_VIDEO);
    }

    if (req.headers.authorization !== `Bearer ${MOCK_API_KEY}`) return json(res, 401, { error: "Authentication failed" });

    switch (`${req.method} ${path}`) {
      case "GET /models": {
        const type = url.searchParams.get("type");
        const video = videoModels.map(id => ({ id, type: "video", model_spec: { name: id } }));
        return json(res, 200, { object: "list", data: type === "video" ? video : type === "image" ? IMAGE_MODELS : TEXT_MODELS });
      }
      case "POST /video/quote": {
        const extra = Object.keys(body ?? {}).filter(key => key !== "model" && key !== "duration");
        if (options.strictQuote && extra.length) return json(res, 400, { error: `Unrecognized keys: ${extra.join(", ")}` });
        if (!videoModels.includes(body?.model) || !/^\d+s$/.test(body?.duration ?? "")) return json(res, 400, { error: "model and a duration like '5s' are required" });
        if (options.noQuote) return json(res, 200, { note: "no price today" });
        return json(res, 200, { quote: Number((0.084 * parseInt(body.duration, 10)).toFixed(2)) });
      }
      case "POST /video/queue": {
        if (!videoModels.includes(body?.model) || !/^\d+s$/.test(body?.duration ?? "")) return json(res, 400, { error: "model and a duration like '5s' are required" });
        const prompt: string = body.prompt ?? "";
        if (prompt.includes("NEEDS_CONSENT")) {
          return json(res, 409, {
            error: { code: "needs_consent", message: "Consent required" },
            consent: { consent_version: "2026-03-01", policy_text: "You confirm you have the right to use every person shown." },
            face_media_roles: ["image_url"],
            docs_url: "https://venice.ai/consent"
          });
        }
        if (prompt.includes("NO_CREDITS")) return json(res, 402, { error: { code: "insufficient_balance", message: "Insufficient balance" } });
        if (prompt.includes("BAD_PROMPT")) return json(res, 422, { error: { code: "prompt_rejected", message: "The prompt was refused" }, suggested_prompt: "A calm fox walking through a snowy forest" });
        if (prompt.includes("TOO_BIG")) return json(res, 413, { error: "Payload too large" });
        const queueId = `q-${++queueCounter}`;
        const mode: VideoJob["mode"] = prompt.includes("DOWNLOAD_URL") ? "download_url" : prompt.includes("STUCK") ? "stuck" : prompt.includes("VIDEO_FAILS") ? "fail" : "binary";
        videoJobs.set(queueId, { model: body.model, mode, polls: 0 });
        return json(res, 200, { queue_id: queueId, model: body.model, status: "QUEUED", ...(mode === "download_url" ? { download_url: `${baseUrl}/files/${queueId}.mp4` } : {}) });
      }
      case "POST /video/retrieve": {
        const job = videoJobs.get(body?.queue_id);
        if (!job || job.model !== body?.model) return json(res, 404, { error: "No such job" });
        job.polls++;
        if (job.mode === "fail") return json(res, 200, { status: "FAILED", error: "The model could not render this" });
        if (job.mode === "stuck" || job.polls <= 2) {
          return json(res, 200, { status: "PROCESSING", average_execution_time: 8000, execution_duration: job.polls * 2000 });
        }
        if (job.mode === "download_url") return json(res, 200, { status: "COMPLETED" });
        res.writeHead(200, { "Content-Type": "video/mp4" });
        return res.end(FAKE_VIDEO);
      }
      case "POST /video/complete":
        return json(res, 200, { success: videoJobs.has(body?.queue_id) });
      case "POST /chat/completions":
        if (body.model === "rate-limited") return json(res, 429, { error: "Too many requests for this model" });
        return json(res, 200, body.tools ? agentReply(body) : chatReply(body));
      case "POST /augment/search":
        return json(res, 200, {
          results: [
            { title: "Venice Privacy Policy", url: "https://example.com/privacy", content: "How Venice handles data.", date: "2026-10-01" },
            { title: "Venice FAQ", url: "https://example.com/faq", content: "Frequently asked questions." },
            { title: "Review of Venice", url: "https://example.com/review", content: "An independent review." }
          ].slice(0, body.limit ?? 10)
        });
      case "POST /augment/scrape":
        return json(res, 200, { markdown: PRIVACY_PAGE, metadata: { title: "Venice Privacy" } });
      case "POST /image/generate":
        return json(res, 200, { id: "img-1", images: Array.from({ length: body.variants ?? 1 }, () => PNG_1X1) });
      case "GET /image/styles":
        return json(res, 200, { object: "list", data: ["3D Model", "Anime", "Cinematic"] });
      case "GET /characters":
        // Ignores limit/offset on purpose, so the server's own pagination is exercised
        return json(res, 200, { object: "list", data: CHARACTERS });
      case "POST /audio/speech":
        res.writeHead(200, { "Content-Type": "audio/mpeg" });
        return res.end(Buffer.from("ID3-fake-mp3-bytes"));
      case "POST /embeddings": {
        const inputs: string[] = Array.isArray(body.input) ? body.input : [body.input];
        return json(res, 200, {
          object: "list",
          model: body.model,
          data: inputs.map((_, index) => ({ object: "embedding", index, embedding: Array.from({ length: 8 }, () => index + 0.5) })),
          usage: { prompt_tokens: 4, total_tokens: 4 }
        });
      }
      case "GET /api_keys/rate_limits":
        return json(res, 200, {
          data: {
            accessPermitted: true,
            apiTier: { id: "paid", isCharged: true },
            balances: { USD: 12.5, DIEM: 3 },
            keyExpiration: null,
            nextEpochBegins: "2026-11-17T00:00:00.000Z",
            rateLimits: [
              { apiModelId: "qwen3-235b", rateLimits: [{ amount: 20, type: "RPM" }, { amount: 1000, type: "RPD" }] },
              { apiModelId: "flux-dev", rateLimits: [{ amount: 10, type: "RPM" }] }
            ]
          }
        });
      default:
        return json(res, 404, { error: `No mock for ${req.method} ${path}` });
    }
  });

  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${port}`;
  return {
    url: `http://127.0.0.1:${port}/api/v1`,
    requests,
    close: () => new Promise(resolve => server.close(() => resolve()))
  };
}
