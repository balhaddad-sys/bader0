/**
 * Self-check: starts the built server against a local mock of the Venice API, calls every tool
 * as an MCP client would, and exits non-zero on any failure. Also checks the HTTP transport.
 *
 * Run with: npm run build && npm run smoke
 */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { bundledTextToVideo } from "../src/wan-workflows.js";
import { FAKE_MP4, startMockComfy } from "./mock-comfy.js";
import { MOCK_API_KEY, PNG_1X1, startMockVenice } from "./mock-venice.js";

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
  "venice_web_search",
  "wan_cancel",
  "wan_status",
  "wan_video"
];

const mock = await startMockVenice();
const comfy = await startMockComfy({ renderMs: 1_000 });
const wanDir = mkdtempSync(join(tmpdir(), "wan-smoke-"));
const WAN_ENV = { WAN_BASE_URL: comfy.url, WAN_POLL_INTERVAL_MS: "100", WAN_OUTPUT_DIR: join(wanDir, "out") };
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

const client = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: mock.url, ...WAN_ENV });
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

console.error("local wan (mock ComfyUI)");

type WanJobView = { job_id: string; status: string; output_path?: string; error?: string; progress?: { percent: number }; queue_position?: number };
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const nodesOf = (workflow: any, cls: string): any[] => Object.values(workflow ?? {}).filter((node: any) => node.class_type === cls);

async function wanStatus(c: Client, jobId: string): Promise<Result> {
  return (await c.callTool({ name: "wan_status", arguments: { job_id: jobId, response_format: "json" } })) as Result;
}

/** Polls wan_status until done() holds, collecting the statuses and progress values seen on the way. */
async function waitFor(c: Client, jobId: string, done: (job: WanJobView) => boolean, timeoutMs = 10_000) {
  const statuses: string[] = [];
  const percents: number[] = [];
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await wanStatus(c, jobId);
    assert.ok(!result.isError, text(result));
    const job = result.structuredContent as WanJobView;
    statuses.push(job.status);
    if (job.progress) percents.push(job.progress.percent);
    if (done(job)) return { job, result, statuses, percents };
    await sleep(100);
  }
  throw new Error(`job ${jobId} did not settle; saw ${statuses.join(", ")}`);
}

let wanJobId = "";

await check("wan_status reports the runner, VRAM-based defaults and checkpoints", async () => {
  const out = text(await call("wan_status", {}));
  assert.match(out, /GPU: NVIDIA GeForce RTX 4090 \(24 GB VRAM\)/);
  assert.match(out, /Text-to-video: .*\(24 GB\+ → 720p\): default 1280x720; checkpoint wan2\.1_t2v_14B_fp8_e4m3fn\.safetensors \(14B quantized/);
  assert.match(out, /Image-to-video: .*default 832x480; checkpoint wan2\.1_i2v_480p_14B_fp8_e4m3fn\.safetensors/);
  assert.match(out, /wan2\.2_ti2v_5B_fp16\.safetensors \(5B ti2v\)/);
});

await check("wan_video returns a queued job at once and injects values by class_type", async () => {
  comfy.requests.length = 0;
  const result = await call("wan_video", { prompt: "a paper boat drifting down a rain gutter", seed: 42, response_format: "json" });
  assert.ok(!result.isError, text(result));
  const queued = result.structuredContent;
  assert.equal(comfy.state().running, queued.job_id, "the render was still running when wan_video returned");
  assert.equal(queued.status, "queued");
  assert.match(queued.job_id, /^[0-9a-f-]{36}$/);
  assert.deepEqual([queued.seed, queued.width, queued.height, queued.frames, queued.fps], [42, 1280, 720, 81, 16]);

  const workflow: any = comfy.lastWorkflow();
  const sampler = nodesOf(workflow, "KSampler")[0];
  assert.equal(sampler.inputs.seed, 42);
  assert.equal(workflow[sampler.inputs.positive[0]].inputs.text, "a paper boat drifting down a rain gutter");
  assert.match(workflow[sampler.inputs.negative[0]].inputs.text, /blurry/);
  const latent = nodesOf(workflow, "EmptyHunyuanLatentVideo")[0].inputs;
  assert.deepEqual([latent.width, latent.height, latent.length], [1280, 720, 81]);
  assert.equal(nodesOf(workflow, "UNETLoader")[0].inputs.unet_name, "wan2.1_t2v_14B_fp8_e4m3fn.safetensors");
  assert.equal(nodesOf(workflow, "CLIPLoader")[0].inputs.clip_name, "umt5_xxl_fp16.safetensors", "missing text encoder swapped for the installed one");
  assert.equal(nodesOf(workflow, "VAELoader")[0].inputs.vae_name, "wan_2.1_vae.safetensors");
  assert.ok(comfy.requests.find(r => r.path === "/prompt")?.body.client_id, "queued with a client_id");
  wanJobId = queued.job_id;
});

await check("wan_status shows progress, then saves the finished mp4 and links it", async () => {
  const { job, result, statuses, percents } = await waitFor(client, wanJobId, job => job.status === "completed");
  assert.ok(statuses.includes("running"), `expected a running status, saw ${statuses.join(", ")}`);
  assert.ok(percents.some(percent => percent > 0 && percent < 100), `expected websocket progress, saw ${percents.join(", ")}`);
  assert.equal(job.progress?.percent, 100);
  assert.ok(job.output_path?.startsWith(join(wanDir, "out")), job.output_path);
  assert.ok(existsSync(job.output_path!));
  assert.deepEqual(readFileSync(job.output_path!), FAKE_MP4);
  const link = result.content.find(block => block.type === "resource_link") as any;
  assert.equal(link?.uri, pathToFileURL(job.output_path!).href);
  assert.equal(link?.mimeType, "video/mp4");
  assert.ok(!result.content.some(block => block.data), "the video is linked, never sent as base64");
  assert.equal(comfy.requests.filter(r => r.path === "/view").length, 1, "downloaded once");
  assert.match(text(await call("wan_status", { job_id: wanJobId })), /Status: \*\*completed\*\*[\s\S]*Video: /);
});

await check("duration maps to 4k+1 frames; bad sizes, samplers and mixed inputs are rejected", async () => {
  const result = await call("wan_video", { prompt: "a short clip", duration: 3, width: 832, response_format: "json" });
  assert.ok(!result.isError, text(result));
  assert.equal(result.structuredContent.frames, 49, "3 s x 16 fps = 48, snapped to 49");
  assert.equal(result.structuredContent.height, 464, "height derived from width at the default aspect");
  assert.match(result.structuredContent.warnings.join(" "), /adjusted from 48 to 49/);
  assert.equal((await call("wan_video", { prompt: "x", duration: 3, frames: 81 })).isError, true);
  assert.equal((await call("wan_video", { prompt: "x", width: 830 })).isError, true, "width must be a multiple of 16");
  const sampler = await call("wan_video", { prompt: "x", sampler: "nope" });
  assert.match(text(sampler), /Unknown sampler "nope"\. ComfyUI offers: euler, uni_pc, dpmpp_2m/);
  await waitFor(client, result.structuredContent.job_id, job => job.status === "completed");
});

await check("a render error becomes a failed job with a recovery hint", async () => {
  const queued = await call("wan_video", { prompt: "FAIL_RENDER on purpose", response_format: "json" });
  const { job } = await waitFor(client, queued.structuredContent.job_id, job => job.status !== "queued" && job.status !== "running");
  assert.equal(job.status, "failed");
  assert.match(job.error!, /KSampler failed: CUDA out of memory\. Tried to allocate 2\.00 GiB\. Lower width\/height or frames/);

  const lost = await call("wan_video", { prompt: "LOST_FILE output", response_format: "json" });
  const { job: lostJob } = await waitFor(client, lost.structuredContent.job_id, job => job.status !== "queued" && job.status !== "running");
  assert.equal(lostJob.status, "failed", "a failed download fails the job instead of polling until the timeout");
  assert.match(lostJob.error!, /render finished, but fetching wan_\d+_\.mp4 from ComfyUI failed .*still in ComfyUI's output folder/);
});

await check("wan_cancel dequeues a waiting job and interrupts a running one", async () => {
  const hang = (await call("wan_video", { prompt: "HANG until cancelled", response_format: "json" })).structuredContent.job_id;
  const waiting = (await call("wan_video", { prompt: "stuck behind the hang", response_format: "json" })).structuredContent.job_id;
  const status = (await wanStatus(client, waiting)).structuredContent;
  assert.deepEqual([status.status, status.queue_position], ["queued", 1]);

  const dequeued = await call("wan_cancel", { job_id: waiting, response_format: "json" });
  assert.equal(dequeued.structuredContent.action, "dequeued");
  assert.deepEqual(comfy.state().pending, []);
  const interrupted = await call("wan_cancel", { job_id: hang, response_format: "json" });
  assert.equal(interrupted.structuredContent.action, "interrupted");
  assert.ok(comfy.requests.some(r => r.path === "/interrupt" && r.body?.prompt_id === hang), "interrupt names the job");
  // ComfyUI keeps listing the job as running for 300 ms; the background poll must not flip it back
  for (let i = 0; i < 4; i++) {
    assert.equal((await wanStatus(client, hang)).structuredContent.status, "cancelled");
    await sleep(100);
  }
  assert.match(text(await call("wan_cancel", { job_id: hang })), /already cancelled/);
  const unknown = await call("wan_cancel", { job_id: "00000000-0000-0000-0000-000000000000" });
  assert.equal(unknown.isError, true);
  assert.match(text(unknown), /ComfyUI has no job/);
});

await check("image-to-video uploads start_image and switches to the I2V checkpoint", async () => {
  const png = join(wanDir, "start.png");
  writeFileSync(png, Buffer.from(PNG_1X1, "base64"));
  comfy.requests.length = 0;
  const result = await call("wan_video", { prompt: "the fox turns its head", start_image: png, response_format: "json" });
  assert.ok(!result.isError, text(result));
  assert.ok(comfy.requests.some(r => r.path === "/upload/image" && r.contentType?.startsWith("multipart/form-data")), "uploaded as multipart");
  const workflow: any = comfy.lastWorkflow();
  assert.equal(nodesOf(workflow, "LoadImage")[0].inputs.image, "start.png");
  assert.equal(nodesOf(workflow, "UNETLoader")[0].inputs.unet_name, "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors");
  assert.equal(nodesOf(workflow, "WanImageToVideo")[0].inputs.length, 81);
  assert.deepEqual([result.structuredContent.width, result.structuredContent.height], [832, 480], "a 480p checkpoint caps the size");

  const byId = await call("wan_video", { prompt: "again", start_image: "existing.png", response_format: "json" });
  assert.ok(!byId.isError, text(byId));
  assert.equal(comfy.requests.filter(r => r.path === "/upload/image").length, 1, "a media ID is used in place, not uploaded");
  assert.match(text(await call("wan_video", { prompt: "x", start_image: "nope.png" })), /not in ComfyUI's input folder/);
  assert.match(text(await call("wan_video", { prompt: "x", start_image: "/etc/hostname" })), /must be a \.png/);
  await waitFor(client, result.structuredContent.job_id, job => job.status === "completed");
  await waitFor(client, byId.structuredContent.job_id, job => job.status === "completed");
});

await check("venice_agent queues at most two local clips per round when enable_local_video is on", async () => {
  mock.requests.length = 0;
  const result = await call("venice_agent", { task: "Render the fox video shots", enable_local_video: true });
  assert.ok(!result.isError, text(result));
  const out = text(result);
  assert.match(out, /## Local video jobs/);
  assert.equal(out.match(/`wan_video` ✓ queued local video job/g)?.length, 2);
  assert.match(out, /`wan_video` ✗ at most 2 clips can be queued per round/);
  const first = mock.requests.find(r => r.path === "/chat/completions")!;
  assert.deepEqual(first.body.tools.map((t: any) => t.function.name), ["web_search", "scrape_url", "wan_video", "wan_status"]);
  const wanTool = first.body.tools.find((t: any) => t.function.name === "wan_video");
  assert.match(wanTool.function.description, /SLOW[\s\S]*returns a job ID immediately[\s\S]*at most 2 clips per round[\s\S]*wan_status/);
  assert.match(first.body.messages[0].content, /queue at most 2 clips per round/);
  for (const [, id] of out.matchAll(/^- `([0-9a-f-]{36})` queued/gm)) await waitFor(client, id!, job => job.status === "completed");

  mock.requests.length = 0;
  const off = text(await call("venice_agent", { task: "Render the fox video shots" }));
  const offTools = mock.requests.find(r => r.path === "/chat/completions")!.body.tools.map((t: any) => t.function.name);
  assert.ok(!offTools.includes("wan_video"), "off by default");
  assert.match(off, /`wan_video` ✗ local video generation is disabled/);
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

await check("a missing checkpoint names what is installed", async () => {
  const wrong = await connect({ ...WAN_ENV, WAN_MODEL: "wan2.1_t2v_14B_fp16.safetensors" });
  const result = (await wrong.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result;
  assert.equal(result.isError, true);
  assert.match(text(result), /WAN_MODEL is set to wan2\.1_t2v_14B_fp16\.safetensors, but ComfyUI does not have it\. Installed Wan checkpoints: wan2\.1_t2v_1\.3B_fp16/);
  await wrong.close();

  const only22 = await startMockComfy({ checkpoints: ["wan2.2_ti2v_5B_fp16.safetensors"] });
  const none = await startMockComfy({ checkpoints: [] });
  try {
    const c22 = await connect({ WAN_BASE_URL: only22.url });
    assert.match(text((await c22.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result), /No Wan 2\.1 text-to-video checkpoint .*wan2\.2_ti2v_5B_fp16.*set WAN_WORKFLOW_T2V/);
    await c22.close();
    const cNone = await connect({ WAN_BASE_URL: none.url });
    assert.match(text((await cNone.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result), /No Wan checkpoints are installed in ComfyUI/);
    await cNone.close();
    assert.ok(![...only22.requests, ...none.requests].some(r => r.path === "/prompt"), "nothing queued without a checkpoint");
  } finally {
    await only22.close();
    await none.close();
  }
});

await check("a render past WAN_TIMEOUT is reported as timed out", async () => {
  const slow = await connect({ ...WAN_ENV, WAN_TIMEOUT: "0.5" });
  const queued = (await slow.callTool({ name: "wan_video", arguments: { prompt: "HANG past the timeout", response_format: "json" } })) as Result;
  await sleep(900);
  const job = (await wanStatus(slow, queued.structuredContent.job_id)).structuredContent;
  assert.equal(job.status, "timed_out");
  assert.match(job.error, /WAN_TIMEOUT is 0\.5 s/);
  const cancelled = (await slow.callTool({ name: "wan_cancel", arguments: { job_id: job.job_id, response_format: "json" } })) as Result;
  assert.equal(cancelled.structuredContent.action, "interrupted", "a timed-out render can still be stopped");
  await slow.close();
});

await check("an unreachable runner says how to start it", async () => {
  const probe = createNetServer();
  await new Promise<void>(resolve => probe.listen(0, "127.0.0.1", resolve));
  const freePort = (probe.address() as AddressInfo).port;
  await new Promise(resolve => probe.close(resolve));
  const down = await connect({ WAN_BASE_URL: `http://127.0.0.1:${freePort}` });
  const result = (await down.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result;
  assert.equal(result.isError, true);
  assert.match(text(result), /Could not reach the local Wan runner \(ComfyUI\) at http:\/\/127\.0\.0\.1:\d+ .*python main\.py --listen 127\.0\.0\.1 --port 8188/);
  const overview = (await down.callTool({ name: "wan_status", arguments: {} })) as Result;
  assert.ok(!overview.isError, "the overview reports a down runner instead of failing");
  assert.match(text(overview), /not reachable/);
  await down.close();
});

await check("a re-exported workflow with different node IDs is injected by class_type", async () => {
  // Renumber every node; the negative encoder gets the lowest ID so node order would pick the wrong one
  const ids: Record<string, string> = { "1": "unet-a", "2": "77", "3": "vae", "4": "12", "5": "40", "6": "3", "7": "latent", "8": "990", "9": "5", "10": "6", "11": "save" };
  const custom: Record<string, any> = {};
  for (const [id, node] of Object.entries(bundledTextToVideo())) {
    const inputs = Object.fromEntries(Object.entries(node.inputs).map(([key, value]) => [key, Array.isArray(value) ? [ids[value[0] as string], value[1]] : value]));
    custom[ids[id]!] = { class_type: node.class_type, inputs };
  }
  custom["77"].inputs.clip_name = "umt5_xxl_fp16.safetensors";
  const path = join(wanDir, "custom-t2v.json");
  writeFileSync(path, JSON.stringify(custom));
  const exported = await connect({ ...WAN_ENV, WAN_WORKFLOW_T2V: path });
  const result = (await exported.callTool({
    name: "wan_video",
    arguments: { prompt: "custom node ids", seed: 7, steps: 12, cfg: 4.5, sampler: "euler", response_format: "json" }
  })) as Result;
  assert.ok(!result.isError, text(result));
  const workflow: any = comfy.lastWorkflow();
  assert.equal(workflow["40"].inputs.text, "custom node ids");
  assert.match(workflow["3"].inputs.text, /blurry/);
  assert.deepEqual([workflow["990"].inputs.seed, workflow["990"].inputs.steps, workflow["990"].inputs.cfg, workflow["990"].inputs.sampler_name], [7, 12, 4.5, "euler"]);
  assert.deepEqual([workflow.latent.inputs.width, workflow.latent.inputs.height, workflow.latent.inputs.length], [1280, 720, 81]);
  assert.equal(workflow["unet-a"].inputs.unet_name, "wan2.1_t2v_1.3B_fp16.safetensors", "a custom workflow keeps its own model");
  await waitFor(exported, result.structuredContent.job_id, job => job.status === "completed");
  await exported.close();

  writeFileSync(path, JSON.stringify({ nodes: [], links: [] }));
  const uiFormat = await connect({ ...WAN_ENV, WAN_WORKFLOW_T2V: path });
  assert.match(text((await uiFormat.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result), /UI-format workflow\. In ComfyUI use Export \(API\)/);
  await uiFormat.close();
});

await check("warns at startup when WAN_BASE_URL is not loopback", async () => {
  const startupLog = (env: Record<string, string>) =>
    new Promise<string>((resolve, reject) => {
      const child = spawn("node", ["dist/index.js"], { env: { PATH: process.env.PATH ?? "", ...env }, stdio: ["pipe", "ignore", "pipe"] });
      let log = "";
      const timer = setTimeout(() => (child.kill(), reject(new Error(`no startup line: ${log}`))), 10_000);
      child.stderr!.on("data", chunk => {
        log += String(chunk);
        if (log.includes("running on stdio")) {
          clearTimeout(timer);
          child.kill();
          resolve(log);
        }
      });
    });
  assert.match(await startupLog({ WAN_BASE_URL: "http://192.168.1.50:8188" }), /WARNING: WAN_BASE_URL \(http:\/\/192\.168\.1\.50:8188\) is not a loopback address/);
  assert.doesNotMatch(await startupLog({}), /WARNING/, "the default 127.0.0.1 does not warn");
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
  await comfy.close();
  rmSync(wanDir, { recursive: true, force: true });
}

console.error(`\nSmoke test passed: ${passed} checks`);
