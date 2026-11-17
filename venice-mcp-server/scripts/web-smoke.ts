/**
 * Self-check for the web app: spawns the built app (dist/web.js) against the mock Venice and mock ComfyUI servers and
 * drives its HTTP API the way the phone's page does: sign in, queue local and hosted videos, poll, stream the clip with
 * Range requests, and shut down. Exits non-zero on any failure. It needs no key, GPU or network.
 *
 * Run with: npm run build && npm run smoke:web
 */
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer as createNetServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { FAKE_MP4, startMockComfy } from "./mock-comfy.js";
import { FAKE_VIDEO, MOCK_API_KEY, PNG_1X1, startMockVenice } from "./mock-venice.js";

const TOKEN = "web-smoke-token-0123456789abcdef";
const dir = mkdtempSync(join(tmpdir(), "web-smoke-"));
let passed = 0;

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function freePort(): Promise<number> {
  const probe = createNetServer();
  await new Promise<void>(resolve => probe.listen(0, "127.0.0.1", resolve));
  const { port } = probe.address() as AddressInfo;
  await new Promise(resolve => probe.close(resolve));
  return port;
}

interface Web {
  url: string;
  port: number;
  log: () => string;
  exited: Promise<number | null>;
  stop: () => Promise<void>;
  signal: (signal: NodeJS.Signals) => void;
}

/** Starts the built web app with exactly this environment and waits until it is listening (or has exited). */
async function startWeb(env: Record<string, string>, port?: number): Promise<Web> {
  const listenPort = port ?? (await freePort());
  const child = spawn("node", ["dist/web.js"], {
    env: { PATH: process.env.PATH ?? "", WEB_HOST: "127.0.0.1", WEB_PORT: String(listenPort), ...env },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let log = "";
  child.stdout.on("data", chunk => (log += String(chunk)));
  child.stderr.on("data", chunk => (log += String(chunk)));
  const exited = new Promise<number | null>(resolve => child.on("exit", code => resolve(code)));
  const web: Web = {
    url: `http://127.0.0.1:${listenPort}`,
    port: listenPort,
    log: () => log,
    exited,
    stop: async () => {
      child.kill("SIGTERM");
      await Promise.race([exited, sleep(5_000)]);
    },
    signal: signal => void child.kill(signal)
  };
  const ready = await Promise.race([
    new Promise<"listening">(resolve => {
      const timer = setInterval(() => {
        if (log.includes("listening on")) {
          clearInterval(timer);
          resolve("listening");
        }
      }, 25);
    }),
    exited.then(() => "exited" as const),
    sleep(10_000).then(() => "timeout" as const)
  ]);
  if (ready === "timeout") throw new Error(`the web app did not start: ${log}`);
  // The banner (addresses, QR code, link) is written line by line right after "listening on"
  if (ready === "listening") await sleep(200);
  return web;
}

const mock = await startMockVenice();
const comfy = await startMockComfy({ renderMs: 800, vramGB: 48 });
const outDir = join(dir, "out");
const env = {
  WEB_TOKEN: TOKEN,
  VENICE_API_KEY: MOCK_API_KEY,
  VENICE_BASE_URL: mock.url,
  VENICE_VIDEO_POLL_INTERVAL_MS: "100",
  WAN_BASE_URL: comfy.url,
  WAN_POLL_INTERVAL_MS: "100",
  WAN_OUTPUT_DIR: outDir
};
const web = await startWeb(env);

// ---- a tiny HTTP client with a cookie ----

let cookie = "";
async function http(path: string, init: { method?: string; body?: unknown; raw?: string; headers?: Record<string, string>; auth?: boolean } = {}) {
  const response = await fetch(`${web.url}${path}`, {
    method: init.method ?? (init.body !== undefined || init.raw !== undefined ? "POST" : "GET"),
    headers: {
      ...(init.body !== undefined || init.raw !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(init.auth === false || !cookie ? {} : { Cookie: cookie }),
      ...init.headers
    },
    body: init.raw ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
    redirect: "manual"
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  let json: any;
  try {
    json = JSON.parse(bytes.toString("utf8"));
  } catch {
    json = undefined;
  }
  return { status: response.status, headers: response.headers, bytes, json };
}

async function waitJob(engine: string, id: string, done: (job: any) => boolean, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  const seen: string[] = [];
  while (Date.now() < deadline) {
    const { json } = await http("/api/jobs");
    const job = json.jobs.find((candidate: any) => candidate.engine === engine && candidate.id === id);
    if (job) {
      seen.push(job.status);
      if (done(job)) return { job, seen };
    }
    await sleep(100);
  }
  throw new Error(`${engine} job ${id} did not settle; saw ${seen.join(", ")}`);
}

console.error("web app: pages and sign-in");

await check("the page and its assets load without signing in, under a strict content policy", async () => {
  const page = await http("/", { auth: false });
  assert.equal(page.status, 200);
  const html = page.bytes.toString("utf8");
  assert.match(html, /<title>Venice Video<\/title>/);
  assert.ok(!/<script(?![^>]*\bsrc=)[^>]*>/i.test(html), "no inline script, so the policy can forbid it");
  const csp = page.headers.get("content-security-policy") ?? "";
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.equal(page.headers.get("x-content-type-options"), "nosniff");
  assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  for (const asset of ["/app.js", "/app.css"]) assert.equal((await http(asset, { auth: false })).status, 200, asset);
  assert.equal((await http("/healthz", { auth: false })).json.ok, true);
});

await check("every API call needs the token", async () => {
  for (const path of ["/api/status", "/api/jobs", "/api/library"]) assert.equal((await http(path, { auth: false })).status, 401, path);
  assert.equal((await http("/api/local/video", { body: { prompt: "x" }, auth: false })).status, 401);
  assert.equal((await http("/api/status", { auth: false, headers: { Authorization: "Bearer not-the-token" } })).status, 401);
  assert.equal((await http("/api/session", { auth: false })).json.authenticated, false);
  const bearer = await http("/api/session", { auth: false, headers: { Authorization: `Bearer ${TOKEN}` } });
  assert.equal(bearer.json.authenticated, true, "scripts can use a bearer token");
});

await check("signing in sets an HttpOnly, SameSite=Strict cookie that is not the token", async () => {
  const wrong = await http("/api/login", { body: { token: "wrong-wrong-wrong-wrong" }, auth: false });
  assert.equal(wrong.status, 401);
  assert.equal(wrong.headers.get("set-cookie"), null);

  const right = await http("/api/login", { body: { token: TOKEN }, auth: false });
  assert.equal(right.status, 200);
  const header = right.headers.get("set-cookie") ?? "";
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  assert.match(header, /Path=\//);
  assert.match(header, /Max-Age=\d+/);
  assert.ok(!header.includes(TOKEN), "the raw token is never put in a cookie");
  cookie = header.split(";")[0]!;
  assert.equal((await http("/api/session")).json.authenticated, true);

  const out = await http("/api/logout", { body: {} });
  assert.match(out.headers.get("set-cookie") ?? "", /Max-Age=0/);
  const saved = cookie;
  cookie = "vmcp_session=";
  assert.equal((await http("/api/session")).json.authenticated, false);
  cookie = saved;
  assert.equal((await http("/api/session")).json.authenticated, true, "the old session still works until it expires: it is stateless");
});

await check("a state-changing request from another site is refused", async () => {
  const foreign = await http("/api/hosted/quote", { body: { duration: 5 }, headers: { Origin: "http://evil.example" } });
  assert.equal(foreign.status, 403);
  assert.equal(foreign.json.error, "bad_origin");
  const same = await http("/api/hosted/quote", { body: { duration: 5 }, headers: { Origin: web.url } });
  assert.equal(same.status, 200, "the page's own origin is fine");
});

await check("status reports the local runner and the hosted models and balance", async () => {
  const { status, json } = await http("/api/status");
  assert.equal(status, 200);
  assert.equal(json.local.reachable, true);
  assert.match(json.local.gpu, /RTX 4090/);
  assert.deepEqual(json.local.queue, { running: 0, waiting: 0 });
  assert.equal(json.local.modes.t2v.fps, 16);
  assert.equal(json.local.modes.t2v.allowed_sizes.length, 4);
  assert.equal(json.hosted.configured, true);
  assert.deepEqual(json.hosted.models, ["wan-3-0-text-to-video", "wan-3-0-image-to-video"]);
  assert.equal(json.hosted.balance, "USD 12.50, DIEM 3.00");
});

console.error("web app: local video");

await check("a local video is queued, finishes, and streams with Range support (what iOS needs to play it)", async () => {
  const created = await http("/api/local/video", { body: { prompt: "a paper boat in the rain", duration: 2, seed: 3 } });
  assert.equal(created.status, 201, created.bytes.toString());
  const view = created.json.job;
  assert.equal(view.engine, "local");
  assert.ok(["queued", "running"].includes(view.status));
  assert.equal(view.seed, 3);

  const { job, seen } = await waitJob("local", view.id, job => job.status === "completed");
  assert.ok(seen.includes("running"), `saw ${seen.join(", ")}`);
  assert.equal(job.has_video, true);
  assert.equal(job.can_cancel, false);
  assert.match(job.summary, /frames at 16 fps/);
  assert.deepEqual(job.warnings, ["Length rounded to 33 frames, the closest this model can render."], "the frame-rule warning is reworded for a phone");

  const path = `/api/jobs/local/${view.id}/video`;
  const full = await http(path);
  assert.equal(full.status, 200);
  assert.equal(full.headers.get("content-type"), "video/mp4");
  assert.equal(full.headers.get("accept-ranges"), "bytes");
  assert.deepEqual(full.bytes, FAKE_MP4);

  const head = await http(path, { headers: { Range: "bytes=0-3" } });
  assert.equal(head.status, 206);
  assert.equal(head.headers.get("content-range"), `bytes 0-3/${FAKE_MP4.length}`);
  assert.deepEqual(head.bytes, FAKE_MP4.subarray(0, 4));
  const tail = await http(path, { headers: { Range: "bytes=10-" } });
  assert.equal(tail.status, 206);
  assert.deepEqual(tail.bytes, FAKE_MP4.subarray(10));
  assert.equal((await http(path, { headers: { Range: "bytes=9999-" } })).status, 416);

  const download = await http(`${path}?download=1`);
  assert.match(download.headers.get("content-disposition") ?? "", /^attachment; filename="[\w.-]+\.mp4"$/);
  assert.match(full.headers.get("content-disposition") ?? "", /^inline;/);
  assert.equal((await http(path, { auth: false })).status, 401, "the clip itself needs the session too");
});

await check("local requests are validated before they reach ComfyUI", async () => {
  const before = comfy.submissions().length;
  const path = await http("/api/local/video", { body: { prompt: "x", image: "/etc/hostname" } });
  assert.equal(path.status, 400);
  assert.match(path.json.message, /image must be a PNG, JPEG or WebP data URI/, "a file path is not accepted, only an uploaded photo");
  const url = await http("/api/local/video", { body: { prompt: "x", image: "https://example.com/a.png" } });
  assert.equal(url.status, 400);
  const size = await http("/api/local/video", { body: { prompt: "x", width: 1024, height: 576 } });
  assert.equal(size.status, 400);
  assert.match(size.json.message, /only accepts these sizes/);
  assert.equal((await http("/api/local/video", { body: { prompt: "   " } })).status, 400);
  assert.equal((await http("/api/local/video", { body: { prompt: "x", surprise: true } })).status, 400, "unknown fields are rejected");
  assert.equal((await http("/api/local/video", { raw: "{not json" })).status, 400);
  assert.equal(comfy.submissions().length, before, "none of them was queued");
  const huge = await http("/api/local/video", { raw: JSON.stringify({ prompt: "x", image: `data:image/png;base64,${"A".repeat(31 * 1024 * 1024)}` }) });
  assert.equal(huge.status, 413);
  assert.match(huge.json.message, /photo is too large/);
});

await check("a photo becomes an image-to-video job", async () => {
  comfy.requests.length = 0;
  const created = await http("/api/local/video", { body: { prompt: "the fox turns", duration: 2, image: `data:image/png;base64,${PNG_1X1}` } });
  assert.equal(created.status, 201, created.bytes.toString());
  assert.ok(comfy.requests.some(r => r.path === "/upload/image" && r.contentType?.startsWith("multipart/form-data")), "the photo was uploaded to ComfyUI");
  const workflow: any = comfy.lastWorkflow();
  assert.equal(Object.values(workflow).filter((node: any) => node.class_type === "LoadImage").map((node: any) => node.inputs.image)[0], "start.png");
  await waitJob("local", created.json.job.id, job => job.status === "completed");
});

await check("a busy ComfyUI queue is reported, and a running or waiting job can be cancelled", async () => {
  const first = (await http("/api/local/video", { body: { prompt: "HANG one", duration: 2 } })).json.job;
  const second = (await http("/api/local/video", { body: { prompt: "HANG two", duration: 2 } })).json.job;
  const third = await http("/api/local/video", { body: { prompt: "third", duration: 2 } });
  assert.equal(third.status, 400);
  assert.match(third.json.message, /queue is busy, 2 ahead/);
  assert.equal((await http("/api/status")).json.local.queue.running, 1);

  const dequeued = await http(`/api/jobs/local/${second.id}/cancel`, { body: {} });
  assert.equal(dequeued.json.action, "dequeued");
  assert.equal(dequeued.json.job.status, "cancelled");
  const interrupted = await http(`/api/jobs/local/${first.id}/cancel`, { body: {} });
  assert.equal(interrupted.json.action, "interrupted");
  await waitJob("local", first.id, job => job.status === "cancelled");
  await until(() => comfy.state().running === undefined);

  const hosted = await http("/api/jobs/hosted/anything/cancel", { body: {} });
  assert.equal(hosted.status, 400);
  assert.match(hosted.json.message, /no way to cancel a hosted video/);
});

console.error("web app: hosted video");

await check("hosted: quote first, then generate under that price; a lower cap refuses", async () => {
  const quote = await http("/api/hosted/quote", { body: { duration: 5 } });
  assert.deepEqual([quote.json.model, quote.json.quote_usd], ["wan-3-0-text-to-video", 0.42]);
  assert.equal((await http("/api/hosted/quote", { body: { duration: 5, has_image: true } })).json.model, "wan-3-0-image-to-video");
  assert.equal((await http("/api/hosted/quote", { body: { duration: 99 } })).status, 400, "length is 1-30 seconds");

  mock.requests.length = 0;
  const capped = await http("/api/hosted/video", { body: { prompt: "waves at dusk", duration: 5, max_usd: 0.3 } });
  assert.equal(capped.status, 400);
  assert.equal(capped.json.error, "over_budget");
  assert.deepEqual([capped.json.quote_usd, capped.json.max_usd], [0.42, 0.3]);
  assert.ok(!mock.requests.some(r => r.path === "/video/queue"), "nothing was queued");

  const created = await http("/api/hosted/video", { body: { prompt: "waves at dusk", duration: 5, resolution: "720p", max_usd: 0.43 } });
  assert.equal(created.status, 201, created.bytes.toString());
  const view = created.json.job;
  assert.equal(view.engine, "hosted");
  assert.match(view.summary, /wan-3-0-text-to-video · 5 s · 720p · \$0\.42/);
  const { job, seen } = await waitJob("hosted", view.id, job => job.status === "completed");
  assert.ok(seen.includes("running"), `saw ${seen.join(", ")}`);
  assert.equal(job.has_video, true);
  const clip = await http(`/api/jobs/hosted/${view.id}/video`);
  assert.deepEqual(clip.bytes, FAKE_VIDEO);
  assert.equal(clip.headers.get("accept-ranges"), "bytes");
  assert.equal((await http(`/api/jobs/hosted/${view.id}/video`, { headers: { Range: "bytes=2-5" } })).status, 206);
});

await check("hosted refusals keep their meaning: 402 with the balance, 409 with the consent text, 413, 422 with a suggested prompt", async () => {
  const credits = await http("/api/hosted/video", { body: { prompt: "NO_CREDITS", duration: 5 } });
  assert.equal(credits.status, 402);
  assert.equal(credits.json.error, "insufficient_credits");
  assert.equal(credits.json.balance, "USD 12.50, DIEM 3.00");
  const consent = await http("/api/hosted/video", { body: { prompt: "NEEDS_CONSENT", duration: 5 } });
  assert.equal(consent.status, 409);
  assert.deepEqual([consent.json.consent_version, consent.json.policy_text], ["2026-03-01", "You confirm you have the right to use every person shown."]);
  assert.equal((await http("/api/hosted/video", { body: { prompt: "TOO_BIG", duration: 5 } })).status, 413);
  const bad = await http("/api/hosted/video", { body: { prompt: "BAD_PROMPT", duration: 5 } });
  assert.equal(bad.status, 422);
  assert.equal(bad.json.suggested_prompt, "A calm fox walking through a snowy forest");
  assert.equal((await http("/api/hosted/video", { body: { prompt: "x", duration: 5, image: "/etc/passwd" } })).status, 400, "only an https URL or a photo data URI");
});

console.error("web app: library and files");

await check("the library lists saved clips, and refuses any name that is not one this app wrote", async () => {
  writeFileSync(join(outDir, "notes.txt"), "private");
  const { json } = await http("/api/library");
  assert.ok(json.files.some((file: any) => file.engine === "local" && /-wan_\d+_\.mp4$/.test(file.name)));
  assert.ok(json.files.some((file: any) => file.engine === "hosted" && /^venice-q-\d+-clip\.mp4$/.test(file.name)));
  assert.ok(!json.files.some((file: any) => file.name === "notes.txt"));
  const first = json.files[0];
  const clip = await http(`/api/library/${encodeURIComponent(first.name)}`);
  assert.equal(clip.status, 200);
  assert.equal(clip.bytes.length, first.size);
  assert.equal(clip.headers.get("accept-ranges"), "bytes");

  for (const bad of ["notes.txt", "..%2Fnotes.txt", "%2E%2E%2F%2E%2E%2Fetc%2Fpasswd", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-missing.mp4"]) {
    assert.equal((await http(`/api/library/${bad}`)).status, 404, bad);
  }
  assert.equal((await http("/api/jobs/local/no-such-job/video")).status, 404);
  assert.equal((await http("/api/jobs/elsewhere/x/video")).status, 404);
  assert.equal((await http("/api/nothing-here")).status, 404);
});

async function until(condition: () => boolean, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (condition()) return;
    await sleep(50);
  }
  throw new Error("the condition was not met in time");
}

console.error("web app: start-up, limits and shutdown");

await check("repeated wrong tokens are locked out for a while, even if the right one follows", async () => {
  const guarded = await startWeb({ ...env, WEB_TOKEN: "another-token-0123456789abcdef" });
  try {
    const attempt = (token: string) => fetch(`${guarded.url}/api/login`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
    for (let i = 0; i < 8; i++) assert.equal((await attempt(`wrong-${i}-wrong-wrong`)).status, 401);
    const locked = await attempt("another-token-0123456789abcdef");
    assert.equal(locked.status, 429);
    assert.ok(Number(locked.headers.get("retry-after")) > 0);
  } finally {
    await guarded.stop();
  }
});

await check("without a Venice key or a running ComfyUI, the app says what is unavailable instead of failing", async () => {
  const dead = await freePort();
  const bare = await startWeb({ WEB_TOKEN: TOKEN, WAN_BASE_URL: `http://127.0.0.1:${dead}`, WAN_OUTPUT_DIR: join(dir, "out-bare") });
  try {
    const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
    const status: any = await (await fetch(`${bare.url}/api/status`, { headers })).json();
    assert.equal(status.local.reachable, false);
    assert.match(status.local.error, /Could not reach the local Wan runner/);
    assert.equal(status.hosted.configured, false);
    assert.match(status.hosted.error, /VENICE_API_KEY is not set/);
    const local = await fetch(`${bare.url}/api/local/video`, { method: "POST", headers, body: JSON.stringify({ prompt: "x" }) });
    assert.equal(local.status, 503);
    assert.equal(((await local.json()) as any).error, "runner_unreachable");
    const hosted = await fetch(`${bare.url}/api/hosted/quote`, { method: "POST", headers, body: JSON.stringify({ duration: 5 }) });
    assert.equal(hosted.status, 400);
    assert.match(((await hosted.json()) as any).message, /VENICE_API_KEY is not set/);
  } finally {
    await bare.stop();
  }
});

await check("with no WEB_TOKEN, a token is generated once, kept in a private file, and shown as a QR code and link", async () => {
  const tokenFile = join(dir, "state", "web-token");
  const { WEB_TOKEN: _unused, ...withoutToken } = env;
  const first = await startWeb({ ...withoutToken, WEB_TOKEN_FILE: tokenFile });
  let token: string;
  try {
    token = readFileSync(tokenFile, "utf8").trim();
    assert.ok(token.length >= 16);
    assert.equal(statSync(tokenFile).mode & 0o777, 0o600, "only the owner can read it");
    assert.ok(first.log().includes(`#t=${token}`), "the sign-in link carries it in the fragment, which never reaches a server log");
    assert.match(first.log(), /Scan this with your phone/);
    assert.match(first.log(), /[█▀▄]/, "a QR code is drawn");
    assert.match(first.log(), /created and saved to/);
    const guest = await fetch(`${first.url}/api/status`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(guest.status, 200);
  } finally {
    await first.stop();
  }
  const second = await startWeb({ ...withoutToken, WEB_TOKEN_FILE: tokenFile });
  try {
    assert.ok(second.log().includes(`#t=${token}`), "a restart keeps the same token, so the phone's bookmark still works");
    assert.ok(!second.log().includes("created and saved to"));
  } finally {
    await second.stop();
  }
});

await check("a weak token, or a port that is taken, stops the app with a message", async () => {
  const weak = await startWeb({ ...env, WEB_TOKEN: "short" });
  assert.equal(await weak.exited, 1);
  assert.match(weak.log(), /WEB_TOKEN must be at least 16 characters/);

  const taken = await startWeb({ ...env, WEB_TOKEN: TOKEN }, undefined);
  try {
    const second = await startWeb({ ...env, WEB_TOKEN: TOKEN }, taken.port);
    assert.equal(await second.exited, 1);
    assert.match(second.log(), /port \d+ is already in use. Set WEB_PORT/);
  } finally {
    await taken.stop();
  }
});

await check("shutting the app down cancels the renders it queued", async () => {
  const gpu = await startMockComfy({ renderMs: 400, vramGB: 48 });
  const app = await startWeb({ ...env, WAN_BASE_URL: gpu.url, WAN_OUTPUT_DIR: join(dir, "out-shutdown") });
  try {
    const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
    const created = await fetch(`${app.url}/api/local/video`, { method: "POST", headers, body: JSON.stringify({ prompt: "HANG until the app stops", duration: 2 }) });
    assert.equal(created.status, 201);
    await until(() => gpu.state().running !== undefined);
    app.signal("SIGTERM");
    assert.equal(await app.exited, 0);
    await until(() => gpu.state().running === undefined);
    assert.ok(gpu.requests.some(r => r.path === "/interrupt"), "the running render was interrupted in ComfyUI");
    assert.match(app.log(), /shutting down \(SIGTERM\)/);
  } finally {
    await app.stop();
    await gpu.close();
  }
});

await web.stop();
await mock.close();
await comfy.close();
rmSync(dir, { recursive: true, force: true });
console.error(`\nWeb smoke test passed: ${passed} checks`);
