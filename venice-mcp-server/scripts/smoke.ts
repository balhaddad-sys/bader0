/**
 * Self-check: starts the built server against a local mock of the Venice API, calls every tool
 * as an MCP client would, and exits non-zero on any failure. Also checks the HTTP transport.
 *
 * Run with: npm run build && npm run smoke
 */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { MOCK_API_KEY, startMockVenice } from "./mock-venice.js";

type Content = { type: string; text?: string; data?: string; mimeType?: string };
type Result = { isError?: boolean; content: Content[]; structuredContent?: any };

const EXPECTED_TOOLS = [
  "venice_account_limits",
  "venice_agent",
  "venice_chat",
  "venice_embeddings",
  "venice_generate_image",
  "venice_image_styles",
  "venice_list_characters",
  "venice_list_models",
  "venice_text_to_speech",
  "venice_web_scrape",
  "venice_web_search"
];

const mock = await startMockVenice();
let passed = 0;

function text(result: Result): string {
  return result.content.filter(block => block.type === "text").map(block => block.text).join("\n");
}

async function connect(env: Record<string, string>): Promise<Client> {
  const client = new Client({ name: "smoke-test", version: "1.0.0" });
  await client.connect(
    new StdioClientTransport({ command: "node", args: ["dist/index.js"], env: { ...getDefaultEnvironment(), ...env }, stderr: "ignore" })
  );
  return client;
}

async function check(name: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    passed++;
    console.error(`  ok  ${name}`);
  } catch (error) {
    console.error(`  FAIL ${name}`);
    throw error;
  }
}

const client = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: mock.url });
const call = async (name: string, args: Record<string, unknown>, options?: Parameters<Client["callTool"]>[1]) =>
  (await client.callTool({ name, arguments: args }, options)) as Result;

console.error("stdio transport");

await check("lists all tools with titles and annotations", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), EXPECTED_TOOLS);
  for (const tool of tools) {
    assert.ok(tool.title, `${tool.name} needs a title`);
    assert.ok(tool.annotations, `${tool.name} needs annotations`);
    assert.ok((tool.description ?? "").length > 40, `${tool.name} needs a useful description`);
  }
});

await check("venice_agent runs search -> scrape -> answer, recovers from bad tool arguments", async () => {
  mock.requests.length = 0;
  const progress: string[] = [];
  const result = await call(
    "venice_agent",
    { task: "How does Venice handle my chat history?" },
    { onprogress: update => void progress.push(update.message ?? "") }
  );
  assert.ok(!result.isError, text(result));
  const out = text(result);
  assert.match(out, /Venice keeps conversation history in the browser \[1\]/);
  assert.doesNotMatch(out, /internal reasoning/, "<think> blocks must be stripped");
  assert.match(out, /## Sources consulted/);
  assert.match(out, /example\.com\/privacy \(read in full\)/);
  assert.match(out, /`web_search` ✓ 3 results/);
  assert.match(out, /`web_search` ✗ invalid JSON arguments/);
  assert.match(out, /`scrape_url` ✓/);
  assert.ok(out.indexOf("✓ 3 results") < out.indexOf("✗ invalid JSON"), "trace lists calls in the order the model made them");
  assert.match(out, /Model: qwen3-235b · rounds: 3/);

  const chats = mock.requests.filter(r => r.path === "/chat/completions");
  assert.equal(chats.length, 3, "one model call per round");
  assert.equal(chats[0]!.body.model, "qwen3-235b", "agent picks the function_calling_default model");
  assert.deepEqual(chats[0]!.body.tools.map((t: any) => t.function.name), ["web_search", "scrape_url"]);
  assert.equal(chats[0]!.body.venice_parameters.enable_web_search, "off");
  const round2Tools = chats[1]!.body.messages.filter((m: any) => m.role === "tool");
  assert.equal(round2Tools.length, 2, "both calls from round 1 got a tool message");
  assert.match(round2Tools[1].content, /not valid JSON/);
  assert.ok(progress.length >= 3, `expected progress notifications, got ${JSON.stringify(progress)}`);
});

await check("venice_agent stops at max_steps and forces a final answer (json)", async () => {
  const result = await call("venice_agent", { task: "How does Venice handle my chat history?", max_steps: 1, response_format: "json" });
  assert.ok(!result.isError, text(result));
  const data = result.structuredContent;
  assert.equal(data.stopped_reason, "step_limit");
  assert.equal(data.answer, "Forced final answer from gathered notes.");
  assert.equal(data.steps, 1);
  assert.equal(JSON.parse(result.content[0]!.text!).answer, data.answer, "JSON text mirrors structuredContent");
});

await check("venice_agent attaches generated images", async () => {
  const result = await call("venice_agent", { task: "Make an image of a fox logo", allow_image_generation: true });
  assert.ok(!result.isError, text(result));
  const images = result.content.filter(block => block.type === "image");
  assert.equal(images.length, 1);
  assert.equal(images[0]!.mimeType, "image/png");
  assert.match(text(result), /`generate_image` ✓ generated 1 image/);
});

await check("venice_agent without image permission only offers search tools", async () => {
  mock.requests.length = 0;
  await call("venice_agent", { task: "Make an image of a fox logo" });
  const first = mock.requests.find(r => r.path === "/chat/completions")!;
  assert.ok(!first.body.tools.some((t: any) => t.function.name === "generate_image"));
});

await check("venice_chat uses the default model and Venice parameters", async () => {
  mock.requests.length = 0;
  const result = await call("venice_chat", { prompt: "hello", system: "Be brief", character_slug: "socrates" });
  assert.ok(!result.isError, text(result));
  assert.match(text(result), /Echo: hello/);
  assert.match(text(result), /Model: llama-3\.3-70b/);
  const body = mock.requests.find(r => r.path === "/chat/completions")!.body;
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.venice_parameters.character_slug, "socrates");
  assert.equal(body.venice_parameters.enable_web_search, "off");
});

await check("venice_chat with web search lists citations", async () => {
  const result = await call("venice_chat", { prompt: "news", web_search: "on", response_format: "json" });
  assert.equal(result.structuredContent.citations[0].url, "https://example.com/blog");
});

await check("upstream 429 becomes an actionable tool error", async () => {
  const result = await call("venice_chat", { prompt: "hi", model: "rate-limited" });
  assert.equal(result.isError, true);
  assert.match(text(result), /rate limit exceeded.*Too many requests/i);
});

await check("venice_web_search normalizes results", async () => {
  const result = await call("venice_web_search", { query: "venice", limit: 2, response_format: "json" });
  assert.equal(result.structuredContent.count, 2);
  assert.equal(result.structuredContent.results[0].snippet, "How Venice handles data.");
  const md = await call("venice_web_search", { query: "venice" });
  assert.match(text(md), /1\. \*\*Venice Privacy Policy\*\* \(2026-10-01\)/);
});

await check("venice_web_scrape pages long content from cache", async () => {
  mock.requests.length = 0;
  const first = await call("venice_web_scrape", { url: "https://example.org/long", response_format: "json" });
  assert.equal(first.structuredContent.has_more, true);
  const second = await call("venice_web_scrape", { url: "https://example.org/long", offset: first.structuredContent.next_offset });
  assert.match(text(second), /END OF PAGE/);
  assert.equal(mock.requests.filter(r => r.path === "/augment/scrape").length, 1, "second page served from cache");
});

await check("venice_generate_image returns image content", async () => {
  mock.requests.length = 0;
  const result = await call("venice_generate_image", { prompt: "a fox", variants: 2, seed: 7 });
  assert.equal(result.content.filter(block => block.type === "image").length, 2);
  const body = mock.requests.find(r => r.path === "/image/generate")!.body;
  assert.equal(body.model, "flux-dev");
  assert.equal(body.return_binary, false);
  assert.equal(body.safe_mode, true);
});

await check("venice_image_styles lists presets", async () => {
  assert.match(text(await call("venice_image_styles", {})), /- Anime/);
});

await check("venice_text_to_speech returns audio content", async () => {
  const result = await call("venice_text_to_speech", { input: "Hello there" });
  const audio = result.content.find(block => block.type === "audio");
  assert.equal(audio?.mimeType, "audio/mpeg");
  assert.equal(Buffer.from(audio!.data!, "base64").toString(), "ID3-fake-mp3-bytes");
});

await check("venice_embeddings returns vectors in JSON mode", async () => {
  const result = await call("venice_embeddings", { input: ["a", "b"], response_format: "json" });
  assert.equal(result.structuredContent.count, 2);
  assert.equal(result.structuredContent.dimensions, 8);
});

await check("venice_list_models filters by capability", async () => {
  const result = await call("venice_list_models", { capability: "supportsFunctionCalling", response_format: "json" });
  assert.deepEqual(result.structuredContent.models.map((m: any) => m.id), ["llama-3.3-70b", "qwen3-235b"]);
  const md = await call("venice_list_models", { type: "text", query: "qwen" });
  assert.match(text(md), /Traits: function_calling_default/);
  assert.match(text(md), /Capabilities: function calling, reasoning, web search/);
});

await check("venice_list_characters paginates", async () => {
  const result = await call("venice_list_characters", { limit: 2, response_format: "json" });
  assert.equal(result.structuredContent.count, 2);
  assert.equal(result.structuredContent.next_offset, 2);
  const rest = await call("venice_list_characters", { limit: 2, offset: 2, response_format: "json" });
  assert.equal(rest.structuredContent.characters[0].slug, "noir-detective");
  assert.equal(rest.structuredContent.has_more, false);
});

await check("venice_account_limits summarizes balances", async () => {
  const out = text(await call("venice_account_limits", { model: "qwen" }));
  assert.match(out, /USD: 12\.50/);
  assert.match(out, /`qwen3-235b`: RPM 20, RPD 1000/);
  assert.doesNotMatch(out, /flux-dev/);
});

await check("invalid arguments are rejected before reaching Venice", async () => {
  const result = await call("venice_agent", { task: "" });
  assert.equal(result.isError, true);
  const unknown = await call("venice_web_search", { query: "x", bogus: true });
  assert.equal(unknown.isError, true, "strict schemas reject unknown arguments");
});

await client.close();

await check("a missing API key gives setup instructions", async () => {
  const keyless = await connect({ VENICE_BASE_URL: mock.url });
  const result = (await keyless.callTool({ name: "venice_chat", arguments: { prompt: "hi", model: "x" } })) as Result;
  assert.equal(result.isError, true);
  assert.match(text(result), /VENICE_API_KEY is not set/);
  await keyless.close();
});

await check("a rejected API key says so", async () => {
  const wrong = await connect({ VENICE_API_KEY: "wrong", VENICE_BASE_URL: mock.url });
  const result = (await wrong.callTool({ name: "venice_image_styles", arguments: {} })) as Result;
  assert.match(text(result), /rejected the API key/);
  await wrong.close();
});

console.error("http transport");

const port = 3900 + Math.floor(Math.random() * 500);
const http = spawn("node", ["dist/index.js"], {
  env: { ...process.env, TRANSPORT: "http", PORT: String(port), MCP_AUTH_TOKEN: "s3cret", VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: mock.url },
  stdio: ["ignore", "ignore", "pipe"]
});
await new Promise<void>((resolve, reject) => {
  const timer = setTimeout(() => reject(new Error("HTTP server did not start")), 10_000);
  http.stderr!.on("data", chunk => {
    if (String(chunk).includes("listening")) {
      clearTimeout(timer);
      resolve();
    }
  });
});

try {
  await check("rejects requests without the bearer token", async () => {
    const response = await fetch(`http://127.0.0.1:${port}/mcp`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    assert.equal(response.status, 401);
  });

  await check("serves tools over Streamable HTTP with the token", async () => {
    const httpClient = new Client({ name: "smoke-http", version: "1.0.0" });
    await httpClient.connect(
      new StreamableHTTPClientTransport(new URL(`http://127.0.0.1:${port}/mcp`), {
        requestInit: { headers: { Authorization: "Bearer s3cret" } }
      })
    );
    const { tools } = await httpClient.listTools();
    assert.equal(tools.length, EXPECTED_TOOLS.length);
    const result = (await httpClient.callTool({ name: "venice_web_search", arguments: { query: "venice" } })) as Result;
    assert.ok(!result.isError, text(result));
    await httpClient.close();
  });
} finally {
  http.kill();
  await mock.close();
}

console.error(`\nSmoke test passed: ${passed} checks`);
