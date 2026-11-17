/**
 * Self-check: starts the built server against a local mock of the Venice API, calls every tool
 * as an MCP client would, and exits non-zero on any failure. Also checks the HTTP transport.
 *
 * Run with: npm run build && npm run smoke
 */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { getDefaultEnvironment, StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { FAKE_MP4, startMockComfy, type MockComfyOptions } from "./mock-comfy.js";
import { FAKE_VIDEO, MOCK_API_KEY, PNG_1X1, startMockVenice } from "./mock-venice.js";

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
  "venice_video",
  "venice_video_status",
  "venice_web_scrape",
  "venice_web_search",
  "wan_cancel",
  "wan_status",
  "wan_video"
];

const mock = await startMockVenice();
// A 48 GB card: with the weights + text encoder + VAE + activations budget, the 14B fp8 model at 720p needs ~38 GB,
// so a 24 GB card would now default to the 5B instead. The 24 GB cases have their own fixtures further down.
const comfy = await startMockComfy({ renderMs: 1_000, vramGB: 48, gpuName: "NVIDIA RTX 6000 Ada Generation" });
const WORKFLOWS = join(dirname(fileURLToPath(import.meta.url)), "..", "workflows");
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

const VIDEO_ENV = { VENICE_VIDEO_POLL_INTERVAL_MS: "100" };
const client = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: mock.url, ...VIDEO_ENV, ...WAN_ENV });
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

const FP8 = "umt5_xxl_fp8_e4m3fn_scaled.safetensors";
const GGUF = "wan2.1_t2v_14B_Q4_K_M.gguf";
const until = async (condition: () => boolean, timeoutMs = 5_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await sleep(50);
  }
  throw new Error("the condition was not met in time");
};
const wcall = (c: Client, name: string, args: Record<string, unknown>) => c.callTool({ name, arguments: args }) as Promise<Result>;

/** A mock ComfyUI plus a server connected to it, both closed afterwards. */
let mockCount = 0;
async function withComfy<T>(options: MockComfyOptions, env: Record<string, string>, fn: (c: Client, m: Awaited<ReturnType<typeof startMockComfy>>) => Promise<T>): Promise<T> {
  const m = await startMockComfy({ renderMs: 400, ...options });
  const c = await connect({ WAN_BASE_URL: m.url, WAN_POLL_INTERVAL_MS: "100", WAN_OUTPUT_DIR: join(wanDir, `out-${++mockCount}`), ...env });
  try {
    return await fn(c, m);
  } finally {
    await c.close().catch(() => undefined);
    await m.close();
  }
}

/** Starts the built server on stdio with only this environment and returns what it logged by the time it is serving. */
const serverLog = (env: Record<string, string>) =>
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

async function waitVideo(c: Client, queueId: string, done: (job: any) => boolean, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  const seen: string[] = [];
  while (Date.now() < deadline) {
    const result = (await c.callTool({ name: "venice_video_status", arguments: { queue_id: queueId, response_format: "json" } })) as Result;
    assert.ok(!result.isError, text(result));
    const job = result.structuredContent;
    seen.push(job.status);
    if (done(job)) return { job, result, seen };
    await sleep(100);
  }
  throw new Error(`video ${queueId} did not settle; saw ${seen.join(", ")}`);
}

let wanJobId = "";

await check("wan_status reports the runner, VRAM-based defaults and checkpoints", async () => {
  const out = text(await call("wan_status", {}));
  assert.match(out, /GPU: NVIDIA RTX 6000 Ada Generation \(48 GB VRAM\)/);
  assert.match(out, /Text-to-video: .*\(24 GB\+ → 720p\): default 1280x720; checkpoint wan2\.1_t2v_14B_fp8_e4m3fn\.safetensors \(14B quantized/);
  assert.match(out, /Image-to-video: .*default 832x480; checkpoint wan2\.1_i2v_480p_14B_fp8_e4m3fn\.safetensors/);
  assert.match(out, /wan2\.2_ti2v_5B_fp16\.safetensors \(5B ti2v\)/);
  assert.match(out, /Workflow: bundled Wan 2\.1 text-to-video \(Wan 2\.1\): 16 fps, 81 frames by default, sizes 832x480, 480x832, 1280x720, 720x1280/);
  assert.match(out, /Estimate: \d+(\.\d)? GB \(weights 14 \+ text encoder 11\.4 \+ VAE 0\.3 \+ activations 12\.4\) of 44\.2 GB usable/);
  assert.match(out, /ComfyUI-GGUF: not installed/);
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
  assert.equal(result.structuredContent.height, 480, "832 is only allowed with a height of 480");
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

console.error("local wan: sizes, memory retry and path safety (mock ComfyUI)");

await check("a size outside the workflow's allowed sizes is refused before anything is queued", async () => {
  const before = comfy.submissions().length;
  const result = await call("wan_video", { prompt: "x", width: 1024, height: 576 });
  assert.equal(result.isError, true);
  assert.match(text(result), /1024x576 is not allowed: wan2\.1_t2v \(Wan family 2\.1\) only accepts these sizes \(width x height\): 1280x720, 720x1280, 832x480, 480x832\. Nothing was submitted\./);
  assert.match(text(await call("wan_video", { prompt: "x", width: 1024 })), /No allowed size has width 1024/);
  assert.equal(comfy.submissions().length, before, "nothing reached ComfyUI");
});

await check("an out-of-memory is retried once at the next tier down, and the job keeps its ID", async () => {
  comfy.requests.length = 0;
  const queued = (await call("wan_video", { prompt: "OOM_BIG on the first try", seed: 5, response_format: "json" })).structuredContent;
  assert.deepEqual([queued.width, queued.height, queued.model], [1280, 720, "wan2.1_t2v_14B_fp8_e4m3fn.safetensors"]);
  await waitFor(client, queued.job_id, job => job.status === "completed", 20_000);

  const sizes = comfy.submissions().map((workflow: any) => {
    const latent = nodesOf(workflow, "EmptyHunyuanLatentVideo")[0].inputs;
    return `${latent.width}x${latent.height}`;
  });
  assert.deepEqual(sizes, ["1280x720", "832x480"], "one retry, at the lower tier's size");
  const retried: any = comfy.lastWorkflow();
  assert.equal(nodesOf(retried, "UNETLoader")[0].inputs.unet_name, "wan2.1_t2v_1.3B_fp16.safetensors", "and with the lower tier's checkpoint");
  assert.equal(nodesOf(retried, "KSampler")[0].inputs.seed, 5, "the seed carries over");

  const job = (await wanStatus(client, queued.job_id)).structuredContent;
  assert.equal(job.job_id, queued.job_id, "the job ID the caller holds is unchanged");
  assert.notEqual(job.prompt_id, queued.job_id, "while ComfyUI is on a new prompt");
  assert.equal(job.attempt, 2);
  assert.deepEqual([job.width, job.height, job.model], [832, 480, "wan2.1_t2v_1.3B_fp16.safetensors"]);
  assert.deepEqual(job.previous_attempts, [{ prompt_id: queued.job_id, tier: "high", width: 1280, height: 720, frames: 81, model: "wan2.1_t2v_14B_fp8_e4m3fn.safetensors", outcome: "out_of_memory" }]);
  assert.match(job.warnings.join(" "), /Ran out of memory at 1280x720, 81 frames \(wan2\.1_t2v_14B_fp8_e4m3fn\.safetensors\); retried once at 832x480, 81 frames \(wan2\.1_t2v_1\.3B_fp16\.safetensors\): tier high/);
});

await check("a render error that is not about memory fails the job and is not retried", async () => {
  comfy.requests.length = 0;
  const queued = (await call("wan_video", { prompt: "BOOM", response_format: "json" })).structuredContent;
  const { job } = await waitFor(client, queued.job_id, job => job.status === "failed");
  assert.equal(job.error, "KSampler failed: Sampler exploded.");
  assert.equal(comfy.submissions().length, 1, "no retry for a failure a smaller size would not fix");
});

await check("a second out-of-memory is not retried again", async () => {
  comfy.requests.length = 0;
  const queued = (await call("wan_video", { prompt: "OOM_ALWAYS", response_format: "json" })).structuredContent;
  const { job } = await waitFor(client, queued.job_id, job => job.status === "failed", 20_000);
  assert.match(job.error!, /KSampler failed: CUDA out of memory\. Tried to allocate 2\.00 GiB\. Lower width\/height or frames.*already been retried once/);
  assert.equal(comfy.submissions().length, 2, "exactly one retry");
});

await check("'..' in start_image is rejected up front, and so is an output name that climbs out of ComfyUI's folder", async () => {
  comfy.requests.length = 0;
  for (const bad of ["../secret.png", "/tmp/a/../b.png", "clips/../start.png"]) {
    const result = await call("wan_video", { prompt: "x", start_image: bad });
    assert.equal(result.isError, true, bad);
    assert.match(text(result), /start_image must not contain "\.\."/);
  }
  assert.ok(!comfy.requests.some(r => ["/upload/image", "/view", "/prompt"].includes(r.path)), "none of those reached ComfyUI");

  const queued = (await call("wan_video", { prompt: "UNSAFE_NAME output", response_format: "json" })).structuredContent;
  const { job } = await waitFor(client, queued.job_id, job => job.status === "failed");
  assert.match(job.error!, /tries to leave its output folder, so it was not fetched/);
  assert.ok(!comfy.requests.some(r => r.path === "/view"), "nothing was requested from /view");
});

console.error("hosted venice video (mock Venice)");

await check("venice_video quotes, queues and returns at once; the background poll saves the clip and releases Venice's copy", async () => {
  mock.requests.length = 0;
  const result = await call("venice_video", { prompt: "waves at dusk", duration: 5, resolution: "720p", aspect_ratio: "16:9", response_format: "json" });
  assert.ok(!result.isError, text(result));
  assert.deepEqual([result.structuredContent.queue_id, result.structuredContent.status, result.structuredContent.quote_usd, result.structuredContent.model], ["q-1", "queued", 0.42, "wan-3-0-text-to-video"]);
  assert.deepEqual(mock.requests.slice(0, 3).map(r => `${r.method} ${r.path}`), ["GET /models", "POST /video/quote", "POST /video/queue"], "the model comes from the live catalog, and the quote precedes the queue");
  assert.equal(mock.requests[0]!.query.type, "video");
  assert.deepEqual(mock.requests[1]!.body, { model: "wan-3-0-text-to-video", duration: "5s", resolution: "720p", aspect_ratio: "16:9" });
  assert.deepEqual(mock.requests[2]!.body, { model: "wan-3-0-text-to-video", prompt: "waves at dusk", duration: "5s", aspect_ratio: "16:9", resolution: "720p" });

  const { job, result: statusResult, seen } = await waitVideo(client, "q-1", job => job.status === "completed");
  assert.ok(seen.includes("processing"), `expected a processing status, saw ${seen.join(", ")}`);
  assert.ok(job.output_path.startsWith(join(wanDir, "out")) && /venice-q-1-clip\.mp4$/.test(job.output_path), job.output_path);
  assert.deepEqual(readFileSync(job.output_path), FAKE_VIDEO);
  assert.equal(job.server_media_deleted, true);
  const video = mock.requests.map(r => r.path).filter(path => path.startsWith("/video/"));
  assert.deepEqual(video, ["/video/quote", "/video/queue", "/video/retrieve", "/video/retrieve", "/video/retrieve", "/video/complete"], "retrieve until the file arrives, then release");
  assert.deepEqual(mock.requests.find(r => r.path === "/video/complete")!.body, { queue_id: "q-1", model: "wan-3-0-text-to-video" });
  assert.ok(!mock.requests.some(r => r.path.startsWith("/files/")), "no download_url: it falls back to retrieve");
  const link = statusResult.content.find(block => block.type === "resource_link") as any;
  assert.equal(link?.uri, pathToFileURL(job.output_path).href);
  assert.ok(!statusResult.content.some(block => block.data), "linked, never base64");
});

await check("image-to-video picks the image model; model must start with the wan-3-0 prefix", async () => {
  mock.requests.length = 0;
  const result = await call("venice_video", { prompt: "animate", duration: 3, image_url: "https://example.com/start.jpg", response_format: "json" });
  assert.ok(!result.isError, text(result));
  assert.deepEqual(mock.requests.find(r => r.path === "/video/queue")!.body, { model: "wan-3-0-image-to-video", prompt: "animate", duration: "3s", image_url: "https://example.com/start.jpg" });
  await waitVideo(client, result.structuredContent.queue_id, job => job.status === "completed");

  mock.requests.length = 0;
  const wrong = await call("venice_video", { prompt: "x", duration: 5, model: "veo3.1-fast-text-to-video" });
  assert.equal(wrong.isError, true);
  assert.match(text(wrong), /veo3\.1-fast-text-to-video is not one of the "wan-3-0" video models Venice lists: wan-3-0-text-to-video, wan-3-0-image-to-video\./);
  assert.ok(!mock.requests.some(r => r.path === "/video/queue" || r.path === "/video/quote"), "nothing was quoted or queued");
  assert.equal((await call("venice_video", { prompt: "x", duration: 5, image_url: "http://example.com/a.jpg" })).isError, true, "image_url must be https or a data URI");
});

await check("a download_url is fetched without the API key when retrieve completes without a file", async () => {
  mock.requests.length = 0;
  const queued = await call("venice_video", { prompt: "DOWNLOAD_URL clip", duration: 3, response_format: "json" });
  assert.ok(!queued.isError, text(queued));
  const { job } = await waitVideo(client, queued.structuredContent.queue_id, job => job.status === "completed");
  assert.deepEqual(readFileSync(job.output_path), FAKE_VIDEO);
  const download = mock.requests.find(r => r.path.startsWith("/files/"))!;
  assert.ok(download, "the queue-time download_url was used");
  assert.equal(download.authorization, undefined, "the API key is never sent to a download URL");
  const order = mock.requests.map(r => r.path.startsWith("/files/") ? "download" : r.path).filter(path => path === "download" || path === "/video/complete");
  assert.deepEqual(order, ["download", "/video/complete"], "Venice's copy is released only after the download");
  assert.equal(job.server_media_deleted, true);
});

await check("hosted errors are mapped: 402 with the balance, 409 with the consent text and version, 413, 422 with a suggested prompt", async () => {
  mock.requests.length = 0;
  const credits = await call("venice_video", { prompt: "NO_CREDITS please", duration: 5 });
  assert.equal(credits.isError, true);
  assert.match(text(credits), /out of credits for this video\. The clip was quoted at \$0\.42\. Current balance: USD 12\.50, DIEM 3\.00\./);
  assert.equal(credits.structuredContent.error, "insufficient_credits");
  assert.equal(credits.structuredContent.balance, "USD 12.50, DIEM 3.00");

  const consent = await call("venice_video", { prompt: "NEEDS_CONSENT person", duration: 5 });
  assert.equal(consent.isError, true);
  assert.match(text(consent), /generate this video \(consent version 2026-03-01\)[\s\S]*Policy text:\nYou confirm you have the right to use every person shown\.[\s\S]*cannot give consent on the user's behalf/);
  assert.deepEqual([consent.structuredContent.error, consent.structuredContent.consent_version, consent.structuredContent.policy_text], ["needs_consent", "2026-03-01", "You confirm you have the right to use every person shown."]);

  const big = await call("venice_video", { prompt: "TOO_BIG", duration: 5 });
  assert.match(text(big), /over Venice's 25 MB payload limit/);
  assert.equal(big.structuredContent.error, "payload_too_large");

  const bad = await call("venice_video", { prompt: "BAD_PROMPT", duration: 5 });
  assert.match(text(bad), /Suggested prompt: A calm fox walking through a snowy forest/);
  assert.equal(bad.structuredContent.suggested_prompt, "A calm fox walking through a snowy forest");
  assert.ok(!mock.requests.some(r => r.path === "/video/retrieve"), "none of these refusals was polled");
});

await check("a failed hosted job is reported with Venice's reason; unknown jobs ask for the model", async () => {
  const queued = await call("venice_video", { prompt: "VIDEO_FAILS", duration: 5, response_format: "json" });
  const { job } = await waitVideo(client, queued.structuredContent.queue_id, job => job.status === "failed");
  assert.match(job.error, /Venice reports the video failed: The model could not render this/);
  const unknown = await call("venice_video_status", { queue_id: "q-from-before" });
  assert.equal(unknown.isError, true);
  assert.match(text(unknown), /did not queue q-from-before.*Pass the model/);
  assert.match(text(await call("venice_video_status", {})), /Hosted Venice video jobs \(\d+\)[\s\S]*q-1.*completed/);
});

await check("a payload over 25 MB is refused before any quote or queue call", async () => {
  // Over stdio the transport caps a message at 10 MB, so such a payload can only be checked in-process
  const saved = { key: process.env.VENICE_API_KEY, base: process.env.VENICE_BASE_URL };
  process.env.VENICE_API_KEY = MOCK_API_KEY;
  process.env.VENICE_BASE_URL = mock.url;
  try {
    mock.requests.length = 0;
    const { startVideo } = await import("../src/video.js");
    const huge = `data:image/png;base64,${Buffer.alloc(19 * 1024 * 1024, 1).toString("base64")}`;
    await assert.rejects(startVideo({ prompt: "x", duration: 5, image_url: huge }, new AbortController().signal), /over Venice's 25 MB payload limit, so nothing was sent/);
    assert.ok(!mock.requests.some(r => r.path === "/video/quote" || r.path === "/video/queue"));
  } finally {
    if (saved.key === undefined) delete process.env.VENICE_API_KEY; else process.env.VENICE_API_KEY = saved.key;
    if (saved.base === undefined) delete process.env.VENICE_BASE_URL; else process.env.VENICE_BASE_URL = saved.base;
  }
});

await check("max_usd caps the price: over it nothing is queued, at or above it queues, and an unreadable quote fails closed", async () => {
  mock.requests.length = 0;
  const over = await call("venice_video", { prompt: "too dear", duration: 5, max_usd: 0.3 });
  assert.equal(over.isError, true);
  assert.match(text(over), /Venice quotes \$0\.42 for this video, over the max_usd limit of \$0\.30, so it was not queued\./);
  assert.deepEqual([over.structuredContent.error, over.structuredContent.quote_usd, over.structuredContent.max_usd], ["over_budget", 0.42, 0.3]);
  assert.ok(mock.requests.some(r => r.path === "/video/quote"), "it was quoted");
  assert.ok(!mock.requests.some(r => r.path === "/video/queue"), "but nothing was queued");

  const fair = await call("venice_video", { prompt: "fair price", duration: 5, max_usd: 0.42, response_format: "json" });
  assert.ok(!fair.isError, text(fair));
  await waitVideo(client, fair.structuredContent.queue_id, job => job.status === "completed");

  const blind = await startMockVenice({ noQuote: true });
  const c = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: blind.url, ...VIDEO_ENV, ...WAN_ENV });
  try {
    const refused = await wcall(c, "venice_video", { prompt: "x", duration: 5, max_usd: 1 });
    assert.equal(refused.isError, true);
    assert.match(text(refused), /price quote could not be read and max_usd was set, so the video was not queued/);
    assert.equal(refused.structuredContent.error, "quote_unavailable");
    assert.ok(!blind.requests.some(r => r.path === "/video/queue"), "an unreadable price is not a reason to spend");
    const allowed = await wcall(c, "venice_video", { prompt: "x", duration: 5, response_format: "json" });
    assert.ok(!allowed.isError, text(allowed));
    assert.equal(allowed.structuredContent.quote_usd, null, "without a limit it still queues, and says the price is unknown");
  } finally {
    await c.close();
    await blind.close();
  }
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

  // A high-noise 14B needs its own workflow; the 5B TI2V is bundled now, so it no longer belongs in this case
  const only22 = await startMockComfy({ checkpoints: ["wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors"] });
  const none = await startMockComfy({ checkpoints: [] });
  try {
    const c22 = await connect({ WAN_BASE_URL: only22.url });
    assert.match(text((await c22.callTool({ name: "wan_video", arguments: { prompt: "x" } })) as Result), /No installed checkpoint fits a bundled text-to-video workflow .*wan2\.2_t2v_high_noise_14B_fp8_scaled.*set WAN_WORKFLOW_T2V/);
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
  for (const [id, node] of Object.entries(JSON.parse(readFileSync(join(WORKFLOWS, "wan2.1_t2v.json"), "utf8")) as Record<string, any>)) {
    const inputs = Object.fromEntries(Object.entries(node.inputs).map(([key, value]) => [key, Array.isArray(value) ? [ids[value[0] as string], value[1]] : value]));
    custom[ids[id]!] = { class_type: node.class_type, inputs };
  }
  // Every user-supplied workflow needs a sibling .meta.json
  writeFileSync(join(wanDir, "custom-t2v.meta.json"), readFileSync(join(WORKFLOWS, "wan2.1_t2v.meta.json")));
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

console.error("local wan: metadata, GGUF, VRAM tiers, queue, shutdown, retention (mock ComfyUI)");

await check("Wan 2.2 5B takes its fps, default frames and sizes from metadata, not from code", async () => {
  await withComfy({ checkpoints: ["wan2.2_ti2v_5B_fp16.safetensors"], clipFiles: [FP8] }, {}, async (c, m) => {
    const overview = text(await wcall(c, "wan_status", {}));
    assert.match(overview, /Workflow: bundled Wan 2\.2 5B text-to-video \(Wan 2\.2\): 24 fps, 121 frames by default, sizes 1280x704, 704x1280/);

    const queued = await wcall(c, "wan_video", { prompt: "a fox in snow", response_format: "json" });
    assert.ok(!queued.isError, text(queued));
    assert.deepEqual([queued.structuredContent.width, queued.structuredContent.height, queued.structuredContent.frames, queued.structuredContent.fps], [1280, 704, 121, 24]);
    const workflow: any = m.lastWorkflow();
    assert.equal(nodesOf(workflow, "CreateVideo")[0].inputs.fps, 24);
    assert.equal(nodesOf(workflow, "Wan22ImageToVideoLatent")[0].inputs.length, 121);
    assert.equal(nodesOf(workflow, "VAELoader")[0].inputs.vae_name, "wan2.2_vae.safetensors");
    await waitFor(c, queued.structuredContent.job_id, job => job.status === "completed");

    // 3 s at 24 fps is 72 frames, which snaps to 73 (4k+1); the rate comes from the metadata
    const timed = await wcall(c, "wan_video", { prompt: "three seconds", duration: 3, response_format: "json" });
    assert.deepEqual([timed.structuredContent.frames, timed.structuredContent.duration_seconds], [73, 3.04]);
    assert.match(timed.structuredContent.warnings.join(" "), /adjusted from 72 to 73/);
    await waitFor(c, timed.structuredContent.job_id, job => job.status === "completed");

    // below the metadata's minimum (49): raised to it, with a warning
    const short = await wcall(c, "wan_video", { prompt: "too short", frames: 9, response_format: "json" });
    assert.equal(short.structuredContent.frames, 49);
    assert.match(short.structuredContent.warnings.join(" "), /adjusted from 9 to 49 \(this workflow needs 4k\+1 frames between 49 and 145\)/);
    await waitFor(c, short.structuredContent.job_id, job => job.status === "completed");

    // a single dimension picks the allowed size that has it
    const portrait = await wcall(c, "wan_video", { prompt: "portrait", width: 704, response_format: "json" });
    assert.deepEqual([portrait.structuredContent.width, portrait.structuredContent.height], [704, 1280]);
    await waitFor(c, portrait.structuredContent.job_id, job => job.status === "completed");

    // the 5B accepts exactly two sizes, so anything else is refused before a model is loaded
    const before = m.submissions().length;
    const wrong = await wcall(c, "wan_video", { prompt: "x", width: 832, height: 480 });
    assert.equal(wrong.isError, true);
    assert.match(text(wrong), /832x480 is not allowed: wan2\.2_ti2v_5b_t2v \(Wan family 2\.2\) only accepts these sizes \(width x height\): 1280x704, 704x1280\. Nothing was submitted\./);
    assert.equal(m.submissions().length, before);
  });
});

await check("Wan 2.2 5B image-to-video uses the same latent node, with the start image wired in", async () => {
  await withComfy({ checkpoints: ["wan2.2_ti2v_5B_fp16.safetensors"], clipFiles: [FP8] }, {}, async (c, m) => {
    const png = join(wanDir, "start-5b.png");
    writeFileSync(png, Buffer.from(PNG_1X1, "base64"));
    const result = await wcall(c, "wan_video", { prompt: "the fox turns", start_image: png, response_format: "json" });
    assert.ok(!result.isError, text(result));
    const workflow: any = m.lastWorkflow();
    const latent = nodesOf(workflow, "Wan22ImageToVideoLatent")[0].inputs;
    assert.equal(workflow[latent.start_image[0]].class_type, "LoadImage");
    assert.equal(nodesOf(workflow, "LoadImage")[0].inputs.image, "start.png");
    assert.equal(nodesOf(workflow, "CLIPVisionLoader").length, 0, "the 5B needs no CLIP vision model");
    assert.deepEqual([result.structuredContent.frames, result.structuredContent.fps], [121, 24]);
    await waitFor(c, result.structuredContent.job_id, job => job.status === "completed");
  });
});

await check("a user-supplied workflow without metadata is refused, naming the file and the keys; bad metadata says what is wrong", async () => {
  const path = join(wanDir, "nometa.json");
  writeFileSync(path, readFileSync(join(WORKFLOWS, "wan2.1_t2v.json")));
  const metaPath = join(wanDir, "nometa.meta.json");
  await withComfy({ clipFiles: [FP8] }, { WAN_WORKFLOW_T2V: path }, async (c, m) => {
    const missing = await wcall(c, "wan_video", { prompt: "x" });
    assert.equal(missing.isError, true);
    assert.ok(text(missing).includes(`WAN_WORKFLOW_T2V points at ${path}, but its metadata file ${metaPath} does not exist`), text(missing));
    assert.ok(text(missing).includes("family, fps, default_frames, min_frames, max_frames, allowed_sizes"), "the message names every key");
    assert.match(text(missing), /Example for Wan 2\.2 5B: \{"family":"2\.2","fps":24/);

    writeFileSync(metaPath, JSON.stringify({ family: "2.1", default_frames: 81, min_frames: 5, max_frames: 241 }));
    assert.ok(text(await wcall(c, "wan_video", { prompt: "x" })).includes(`${metaPath} is missing the key(s) fps, allowed_sizes`));

    writeFileSync(metaPath, JSON.stringify({ family: "2.1", fps: -1, default_frames: 80, min_frames: 5, max_frames: 241, allowed_sizes: [{ width: 830, height: 480 }] }));
    const invalid = text(await wcall(c, "wan_video", { prompt: "x" }));
    assert.match(invalid, /has invalid values: fps: .*; default_frames: must be 4k\+1.*; allowed_sizes\.0\.width: /);
    assert.equal(m.submissions().length, 0, "nothing was queued, and no 2.1 numbers were assumed");
  });
});

await check("the metadata's fps is written into the workflow's video node", async () => {
  const workflow = JSON.parse(readFileSync(join(WORKFLOWS, "wan2.1_t2v.json"), "utf8"));
  workflow["10"].inputs.fps = 8;
  const path = join(wanDir, "fps8.json");
  writeFileSync(path, JSON.stringify(workflow));
  writeFileSync(join(wanDir, "fps8.meta.json"), readFileSync(join(WORKFLOWS, "wan2.1_t2v.meta.json")));
  await withComfy({ clipFiles: [FP8] }, { WAN_WORKFLOW_T2V: path }, async (c, m) => {
    const result = await wcall(c, "wan_video", { prompt: "x", duration: 2, response_format: "json" });
    assert.ok(!result.isError, text(result));
    assert.deepEqual([result.structuredContent.frames, result.structuredContent.fps], [33, 16], "2 s at the metadata's 16 fps, not the node's 8");
    assert.equal(nodesOf(m.lastWorkflow(), "CreateVideo")[0].inputs.fps, 16);
    assert.match(result.structuredContent.warnings.join(" "), /CreateVideo said 8 fps; set to 16 to match the workflow's metadata/);
    await waitFor(c, result.structuredContent.job_id, job => job.status === "completed");
  });
});

await check("a .gguf checkpoint loads through UnetLoaderGGUF, decided by extension", async () => {
  const fixture = { vramGB: 48, checkpoints: ["wan2.1_t2v_1.3B_fp16.safetensors"], ggufFiles: [GGUF], ggufInstalled: true, clipFiles: [FP8] };
  await withComfy(fixture, {}, async (c, m) => {
    // the largest installed that fits is the GGUF, and the graph gets the GGUF loader
    const auto = await wcall(c, "wan_video", { prompt: "a", response_format: "json" });
    assert.ok(!auto.isError, text(auto));
    assert.equal(auto.structuredContent.model, GGUF);
    const workflow: any = m.lastWorkflow();
    assert.deepEqual(nodesOf(workflow, "UnetLoaderGGUF").map(node => node.inputs), [{ unet_name: GGUF }]);
    assert.equal(nodesOf(workflow, "UNETLoader").length, 0);
    await waitFor(c, auto.structuredContent.job_id, job => job.status === "completed");
    assert.match(text(await wcall(c, "wan_status", {})), /ComfyUI-GGUF: installed[\s\S]*wan2\.1_t2v_14B_Q4_K_M\.gguf \(14B quantized, ~7\.8 GB\)/);
  });
  // and back: choosing the safetensors file swaps the loader class again
  await withComfy(fixture, { WAN_MODEL: "wan2.1_t2v_1.3B_fp16.safetensors" }, async (c, m) => {
    const result = await wcall(c, "wan_video", { prompt: "a", response_format: "json" });
    assert.ok(!result.isError, text(result));
    const workflow: any = m.lastWorkflow();
    assert.equal(nodesOf(workflow, "UnetLoaderGGUF").length, 0);
    assert.equal(nodesOf(workflow, "UNETLoader")[0].inputs.unet_name, "wan2.1_t2v_1.3B_fp16.safetensors");
    await waitFor(c, result.structuredContent.job_id, job => job.status === "completed");
  });
  // a custom workflow that names a .gguf in a UNETLoader is fixed by extension too
  const custom = JSON.parse(readFileSync(join(WORKFLOWS, "wan2.1_t2v.json"), "utf8"));
  custom["1"].inputs.unet_name = GGUF;
  const path = join(wanDir, "gguf-custom.json");
  writeFileSync(path, JSON.stringify(custom));
  writeFileSync(join(wanDir, "gguf-custom.meta.json"), readFileSync(join(WORKFLOWS, "wan2.1_t2v.meta.json")));
  await withComfy(fixture, { WAN_WORKFLOW_T2V: path }, async (c, m) => {
    const result = await wcall(c, "wan_video", { prompt: "a", response_format: "json" });
    assert.ok(!result.isError, text(result));
    assert.deepEqual(nodesOf(m.lastWorkflow(), "UnetLoaderGGUF").map(node => node.inputs), [{ unet_name: GGUF }]);
    await waitFor(c, result.structuredContent.job_id, job => job.status === "completed");
  });
});

await check("a GGUF checkpoint without ComfyUI-GGUF is refused with a message that says so, and nothing is submitted", async () => {
  await withComfy({ clipFiles: [FP8] }, { WAN_MODEL: GGUF }, async (c, m) => {
    const result = await wcall(c, "wan_video", { prompt: "x" });
    assert.equal(result.isError, true);
    assert.match(text(result), /wan2\.1_t2v_14B_Q4_K_M\.gguf is a GGUF checkpoint\..*UnetLoaderGGUF.*ComfyUI-GGUF.*does not have that node, so nothing was submitted/s);
    assert.ok(!m.requests.some(r => r.path === "/prompt"));
    assert.match(text(await wcall(c, "wan_status", {})), /ComfyUI-GGUF: not installed/);
  });
  const custom = JSON.parse(readFileSync(join(WORKFLOWS, "wan2.1_t2v.json"), "utf8"));
  custom["1"].inputs.unet_name = GGUF;
  const path = join(wanDir, "gguf-missing.json");
  writeFileSync(path, JSON.stringify(custom));
  writeFileSync(join(wanDir, "gguf-missing.meta.json"), readFileSync(join(WORKFLOWS, "wan2.1_t2v.meta.json")));
  await withComfy({ clipFiles: [FP8] }, { WAN_WORKFLOW_T2V: path }, async (c, m) => {
    assert.match(text(await wcall(c, "wan_video", { prompt: "x" })), /GGUF checkpoint.*ComfyUI-GGUF/s);
    assert.ok(!m.requests.some(r => r.path === "/prompt"));
  });
  // without the nodes the files are not listed at all, so the "no checkpoints" message has to point at ComfyUI-GGUF
  await withComfy({ checkpoints: [], clipFiles: [FP8] }, {}, async c => {
    assert.match(text(await wcall(c, "wan_video", { prompt: "x" })), /No Wan checkpoints are installed.*GGUF files are only listed once the ComfyUI-GGUF custom nodes are installed/);
  });
});

await check("VRAM tiers budget weights + text encoder + VAE + activations, and treat 5B at 720p as a 24 GB job", async () => {
  // under 12 GB: 480p and the smallest checkpoint
  await withComfy({ vramGB: 8, clipFiles: [FP8] }, {}, async c => {
    assert.match(text(await wcall(c, "wan_status", {})), /\(under 12 GB → 480p\): default 832x480; checkpoint wan2\.1_t2v_1\.3B_fp16\.safetensors \(1\.3B, ~2\.6 GB\), the smallest installed/);
  });
  // 16 GB: only the 1.3B fits once the encoder and activations are counted (the 14B fp8 is 26 GB all in)
  await withComfy({ vramGB: 16, clipFiles: [FP8] }, {}, async c => {
    const overview = text(await wcall(c, "wan_status", {}));
    assert.match(overview, /\(12–23 GB → 480p \(720p possible\)\): default 832x480; checkpoint wan2\.1_t2v_1\.3B_fp16\.safetensors .*the largest installed that fits 14\.7 GB of usable VRAM/);
    assert.match(overview, /Estimate: 11\.2 GB \(weights 2\.6 \+ text encoder 6\.7 \+ VAE 0\.3 \+ activations 1\.6\) of 14\.7 GB usable/);
  });
  // 5B at 720p is a 24 GB job whatever the arithmetic: at 20 GB it fits on paper (15.8 of 18.4 GB) and is still passed over
  const pair = { checkpoints: ["wan2.1_t2v_1.3B_fp16.safetensors", "wan2.2_ti2v_5B_fp8_e4m3fn.safetensors"], clipFiles: [FP8] };
  await withComfy({ ...pair, vramGB: 20 }, {}, async c => {
    assert.match(text(await wcall(c, "wan_status", {})), /checkpoint wan2\.1_t2v_1\.3B_fp16\.safetensors .*the largest installed that fits 18\.4 GB of usable VRAM/);
  });
  await withComfy({ ...pair, vramGB: 24 }, {}, async c => {
    const overview = text(await wcall(c, "wan_status", {}));
    assert.match(overview, /\(24 GB\+ → 720p\): default 1280x704; checkpoint wan2\.2_ti2v_5B_fp8_e4m3fn\.safetensors \(5B quantized, ~5 GB\), the largest installed that fits \(rated for a 24 GB-class card\)/);
  });
  // forcing the 5B onto a 20 GB card works, with a warning
  await withComfy({ ...pair, vramGB: 20 }, { WAN_MODEL: "wan2.2_ti2v_5B_fp8_e4m3fn.safetensors" }, async c => {
    const result = await wcall(c, "wan_video", { prompt: "x", response_format: "json" });
    assert.match(result.structuredContent.warnings.join(" "), /rated for a 24 GB-class card and this one has 20 GB/);
  });
});

await check("an out-of-memory with nowhere smaller to go (5B has one size) retries once with fewer frames", async () => {
  await withComfy({ checkpoints: ["wan2.2_ti2v_5B_fp16.safetensors"], clipFiles: [FP8] }, {}, async (c, m) => {
    const queued = await wcall(c, "wan_video", { prompt: "OOM_LONG on the first try", response_format: "json" });
    assert.equal(queued.structuredContent.frames, 121);
    await waitFor(c, queued.structuredContent.job_id, job => job.status === "completed", 20_000);
    const lengths = m.submissions().map((workflow: any) => nodesOf(workflow, "Wan22ImageToVideoLatent")[0].inputs.length);
    assert.deepEqual(lengths, [121, 73], "121 frames, then 60% of that snapped to 4k+1, within the 49-145 range");
    const job = (await wanStatus(c, queued.structuredContent.job_id)).structuredContent;
    assert.deepEqual([job.width, job.height, job.frames, job.attempt], [1280, 704, 73, 2]);
  });
});

await check("a GPU or VRAM change on the runner invalidates the cached defaults", async () => {
  await withComfy({ vramGB: 48, clipFiles: [FP8] }, {}, async (c, m) => {
    const first = await wcall(c, "wan_video", { prompt: "a", response_format: "json" });
    assert.deepEqual([first.structuredContent.width, first.structuredContent.height], [1280, 720]);
    await waitFor(c, first.structuredContent.job_id, job => job.status === "completed");
    m.setVram(8, "NVIDIA GeForce RTX 3070"); // well inside the 30 s model-list cache
    const second = await wcall(c, "wan_video", { prompt: "b", response_format: "json" });
    assert.deepEqual([second.structuredContent.width, second.structuredContent.height, second.structuredContent.model], [832, 480, "wan2.1_t2v_1.3B_fp16.safetensors"]);
    assert.match(text(await wcall(c, "wan_status", {})), /GPU: NVIDIA GeForce RTX 3070 \(8 GB VRAM\)/);
    await waitFor(c, second.structuredContent.job_id, job => job.status === "completed");
  });
});

await check("a third job is refused while two are ahead on ComfyUI's queue", async () => {
  await withComfy({ clipFiles: [FP8] }, {}, async (c, m) => {
    const first = (await wcall(c, "wan_video", { prompt: "HANG one", response_format: "json" })).structuredContent.job_id;
    const second = (await wcall(c, "wan_video", { prompt: "HANG two", response_format: "json" })).structuredContent.job_id;
    assert.deepEqual([m.state().running, m.state().pending], [first, [second]]);

    const third = await wcall(c, "wan_video", { prompt: "third" });
    assert.equal(third.isError, true);
    assert.match(text(third), /ComfyUI's queue is busy, 2 ahead \(1 running, 1 waiting\), so this job was not queued/);
    assert.equal(m.submissions().length, 2, "nothing was stacked");

    // one less ahead and it goes through
    await wcall(c, "wan_cancel", { job_id: second });
    const retry = await wcall(c, "wan_video", { prompt: "third, now", response_format: "json" });
    assert.ok(!retry.isError, text(retry));
    await wcall(c, "wan_cancel", { job_id: retry.structuredContent.job_id });
    await wcall(c, "wan_cancel", { job_id: first });
  });
});

await check("shutting down cancels what this server queued: waiting jobs removed, the running one interrupted", async () => {
  const m = await startMockComfy({ clipFiles: [FP8] });
  const c = await connect({ WAN_BASE_URL: m.url, WAN_POLL_INTERVAL_MS: "100", WAN_OUTPUT_DIR: join(wanDir, "out-shutdown") });
  try {
    const running = (await wcall(c, "wan_video", { prompt: "HANG running", response_format: "json" })).structuredContent.job_id;
    const waiting = (await wcall(c, "wan_video", { prompt: "HANG waiting", response_format: "json" })).structuredContent.job_id;
    assert.deepEqual([m.state().running, m.state().pending], [running, [waiting]]);
    await c.close(); // the client ends stdin: the server must clean up before it exits
    await until(() => m.state().running === undefined && m.state().pending.length === 0);
    const removals = m.requests.filter(r => r.method === "POST" && r.path === "/queue");
    assert.deepEqual(removals.map(r => r.body.delete), [[waiting]]);
    assert.ok(m.requests.some(r => r.path === "/interrupt" && r.body?.prompt_id === running), "the running job was interrupted by ID");
  } finally {
    await m.close();
  }
});

await check("shutdown leaves jobs queued by someone else alone", async () => {
  const m = await startMockComfy({ clipFiles: [FP8] });
  const c = await connect({ WAN_BASE_URL: m.url, WAN_POLL_INTERVAL_MS: "100", WAN_OUTPUT_DIR: join(wanDir, "out-foreign") });
  try {
    // a render someone else started (the ComfyUI UI, say) and is running first
    const foreign = JSON.parse(readFileSync(join(WORKFLOWS, "wan2.1_t2v.json"), "utf8"));
    foreign["5"].inputs.text = "HANG foreign";
    const response = await fetch(`${m.url}/prompt`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: foreign, client_id: "someone-else" }) });
    const foreignId = ((await response.json()) as { prompt_id: string }).prompt_id;
    const ours = (await wcall(c, "wan_video", { prompt: "HANG ours", response_format: "json" })).structuredContent.job_id;
    assert.deepEqual([m.state().running, m.state().pending], [foreignId, [ours]]);
    await c.close();
    await until(() => m.state().pending.length === 0);
    assert.ok(!m.requests.some(r => r.path === "/interrupt"), "the other client's running job was not interrupted");
    assert.equal(m.state().running, foreignId);
  } finally {
    await m.close();
  }
});

await check("old clips are pruned on startup (only names this server wrote) and the directory size is logged", async () => {
  const dir = join(wanDir, "retention");
  mkdirSync(dir, { recursive: true });
  const put = (name: string, ageHours: number) => {
    const path = join(dir, name);
    writeFileSync(path, "x".repeat(1024));
    const when = new Date(Date.now() - ageHours * 3_600_000);
    utimesSync(path, when, when);
    return path;
  };
  const oldLocal = put("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-wan_00001_.mp4", 72);
  const oldHosted = put("venice-q-9-clip.mp4", 72);
  const unrelated = put("holiday.mp4", 72);
  const notes = put("notes.txt", 72);
  const fresh = put("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb-wan_00002_.mp4", 1);

  const log = await serverLog({ WAN_OUTPUT_DIR: dir, WAN_BASE_URL: comfy.url });
  assert.ok(!existsSync(oldLocal) && !existsSync(oldHosted), "both old clips were pruned");
  assert.ok(existsSync(unrelated) && existsSync(notes) && existsSync(fresh), "unrelated and recent files were kept");
  assert.match(log, /output dir .*retention: 3 file\(s\), [\d.]+ MB kept \(pruned 2 clip\(s\) \/ [\d.]+ MB older than 48 h; 2 file\(s\) not written by this server are left alone\)/);

  // WAN_RETAIN_HOURS=0 keeps everything
  const ancient = put("cccccccc-cccc-cccc-cccc-cccccccccccc-wan_00003_.mp4", 500);
  assert.match(await serverLog({ WAN_OUTPUT_DIR: dir, WAN_BASE_URL: comfy.url, WAN_RETAIN_HOURS: "0" }), /retention is off \(WAN_RETAIN_HOURS=0\)/);
  assert.ok(existsSync(ancient));
});

console.error("hosted venice video: catalog and quote edge cases (mock Venice)");

await check("with no wan-3-0 model in the catalog, venice_video says so and lists what exists", async () => {
  const bare = await startMockVenice({ videoModels: ["veo3.1-fast-text-to-video", "kling-2.6-pro-text-to-video"] });
  const c = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: bare.url, ...VIDEO_ENV, WAN_BASE_URL: comfy.url });
  try {
    const result = await wcall(c, "venice_video", { prompt: "x", duration: 5 });
    assert.equal(result.isError, true);
    assert.match(text(result), /no model whose ID starts with "wan-3-0".*It currently lists: veo3\.1-fast-text-to-video, kling-2\.6-pro-text-to-video/);
    assert.equal(result.structuredContent.error, "no_model");
    assert.ok(!bare.requests.some(r => r.path === "/video/queue"));
  } finally {
    await c.close();
    await bare.close();
  }
});

await check("a quote Venice rejects with resolution/aspect_ratio is retried with model and duration only, and says so", async () => {
  const strict = await startMockVenice({ strictQuote: true });
  const c = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: strict.url, ...VIDEO_ENV, ...WAN_ENV });
  try {
    const result = await wcall(c, "venice_video", { prompt: "x", duration: 5, resolution: "720p", response_format: "json" });
    assert.ok(!result.isError, text(result));
    assert.equal(result.structuredContent.quote_usd, 0.42);
    assert.match(result.structuredContent.warnings.join(" "), /quote covers the model and duration only/);
    assert.equal(strict.requests.filter(r => r.path === "/video/quote").length, 2);
  } finally {
    await c.close();
    await strict.close();
  }
});

await check("a hosted job still processing past VENICE_VIDEO_TIMEOUT is reported as timed out", async () => {
  const c = await connect({ VENICE_API_KEY: MOCK_API_KEY, VENICE_BASE_URL: mock.url, ...VIDEO_ENV, VENICE_VIDEO_TIMEOUT: "0.5", ...WAN_ENV });
  try {
    const queued = await wcall(c, "venice_video", { prompt: "STUCK forever", duration: 5, response_format: "json" });
    assert.ok(!queued.isError, text(queued));
    await sleep(900);
    const { job } = await waitVideo(c, queued.structuredContent.queue_id, job => job.status === "timed_out");
    assert.match(job.error, /VENICE_VIDEO_TIMEOUT is 0\.5 s.*no cancel endpoint/);
  } finally {
    await c.close();
  }
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
