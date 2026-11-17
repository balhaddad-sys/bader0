/**
 * The web app's server: a small JSON API over the same local-Wan and hosted-Venice code the MCP tools use, plus the
 * static page in web/. It holds no logic of its own about video: planning, queueing, polling and downloads all happen
 * in wan.ts and video.ts, so a clip made from a phone behaves exactly like one made through MCP.
 */
import express, { type NextFunction, type Request, type RequestHandler, type Response } from "express";
import { readdir, stat } from "node:fs/promises";
import { basename, extname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod/v4";
import { VeniceApiError } from "../api.js";
import { ComfyUnreachableError } from "../comfy.js";
import { config, videoConfig, wanConfig } from "../config.js";
import { isManagedName } from "../output.js";
import { listModels } from "../venice.js";
import { fetchBalances, listVideoJobs, quoteVideoRequest, startVideo, VideoRequestError, type VideoJob } from "../video.js";
import { cancelJob, describeDefaults, getRunnerProfile, listJobs, queueWanVideo, type WanJob, type WanModeDefaults } from "../wan.js";
import { readQueue } from "../wan-runner.js";
import { createAuth } from "./auth.js";

const WEB_DIR = fileURLToPath(new URL("../../web/", import.meta.url));
const MAX_BODY = "30mb";
const STATUS_TIMEOUT_MS = 8_000;

/** A request the caller can fix, with an HTTP status. */
class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fields: Record<string, unknown> = {}
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Request bodies
// ---------------------------------------------------------------------------

/** A photo from the phone, already downscaled in the page. Only data URIs: a path or URL here would let a caller point the server at its own files. */
const DATA_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

const LocalBody = z.strictObject({
  prompt: z.string().trim().min(1).max(2_000),
  negative_prompt: z.string().max(2_000).optional(),
  width: z.number().int().min(256).max(4_096).optional(),
  height: z.number().int().min(256).max(4_096).optional(),
  duration: z.number().min(0.1).max(60).optional(),
  seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional(),
  image: z.string().regex(DATA_IMAGE, "image must be a PNG, JPEG or WebP data URI").optional()
});

const HostedFields = {
  duration: z.number().int().min(1).max(30),
  model: z.string().max(100).optional(),
  aspect_ratio: z.string().max(16).optional(),
  resolution: z.string().max(16).optional()
};

const HostedQuoteBody = z.strictObject({ ...HostedFields, has_image: z.boolean().optional() });

const HostedBody = z.strictObject({
  ...HostedFields,
  prompt: z.string().trim().min(1).max(4_096),
  negative_prompt: z.string().max(4_096).optional(),
  image: z
    .string()
    .refine(value => DATA_IMAGE.test(value) || /^https:\/\//i.test(value), "image must be an https URL or a PNG, JPEG or WebP data URI")
    .optional(),
  max_usd: z.number().positive().max(1_000).optional()
});

const parse = <T extends z.ZodType>(schema: T, body: unknown): z.infer<T> => {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const issue = result.error.issues[0]!;
    throw new HttpError(400, `${issue.path.join(".") || "request"}: ${issue.message}`);
  }
  return result.data;
};

// ---------------------------------------------------------------------------
// Job views: one shape for local and hosted jobs, so the page has one list
// ---------------------------------------------------------------------------

type ViewStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";

interface JobView {
  engine: "local" | "hosted";
  id: string;
  status: ViewStatus;
  prompt: string;
  created_at: string;
  finished_at?: string;
  summary: string;
  progress?: number;
  detail?: string;
  has_video: boolean;
  can_cancel: boolean;
  error?: string;
  warnings: string[];
  quote_usd?: number | null;
  seed?: number;
}

/** The server's warnings are written for people who know Wan's frame rules; on a phone they get plain wording. */
function friendlyWarning(warning: string): string {
  const adjusted = /^frames adjusted from \d+ to (\d+)/.exec(warning);
  if (adjusted) return `Length rounded to ${adjusted[1]} frames, the closest this model can render.`;
  return warning;
}

function localView(job: WanJob): JobView {
  const active = job.status === "queued" || job.status === "running" || job.status === "timed_out";
  return {
    engine: "local",
    id: job.job_id,
    status: job.status,
    prompt: job.prompt,
    created_at: job.created_at,
    ...(job.finished_at ? { finished_at: job.finished_at } : {}),
    summary: job.width ? `${job.width}x${job.height} · ${job.frames} frames at ${job.fps} fps · ${job.duration_seconds} s${job.seed >= 0 ? ` · seed ${job.seed}` : ""}` : "",
    ...(job.progress ? { progress: job.progress.percent } : {}),
    ...(job.queue_position ? { detail: `${job.queue_position === 1 ? "next" : `#${job.queue_position}`} in ComfyUI's queue` } : {}),
    has_video: Boolean(job.output_path),
    can_cancel: active,
    ...(job.error ? { error: job.error } : {}),
    warnings: job.warnings.map(friendlyWarning),
    ...(job.seed >= 0 ? { seed: job.seed } : {})
  };
}

function hostedView(job: VideoJob): JobView {
  const status: ViewStatus = job.status === "processing" ? "running" : job.status;
  return {
    engine: "hosted",
    id: job.queue_id,
    status,
    prompt: job.prompt,
    created_at: job.created_at,
    ...(job.finished_at ? { finished_at: job.finished_at } : {}),
    summary: [job.model, job.duration_seconds ? `${job.duration_seconds} s` : "", job.resolution, job.aspect_ratio, job.quote_usd !== null ? `$${job.quote_usd.toFixed(2)}` : ""]
      .filter(Boolean)
      .join(" · "),
    ...(job.progress?.estimated_percent !== undefined ? { progress: job.progress.estimated_percent } : {}),
    ...(job.progress ? { detail: `${job.progress.elapsed_seconds} s on Venice` } : {}),
    has_video: Boolean(job.output_path),
    can_cancel: false,
    ...(job.error ? { error: job.error } : {}),
    warnings: job.warnings,
    quote_usd: job.quote_usd
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

const VIDEO_STATUS: Record<string, number> = { insufficient_credits: 402, needs_consent: 409, payload_too_large: 413, prompt_rejected: 422 };

function describeError(error: unknown): { status: number; body: Record<string, unknown> } {
  if (error instanceof HttpError) return { status: error.status, body: { error: "bad_request", message: error.message, ...error.fields } };
  if (error instanceof VideoRequestError) {
    return { status: VIDEO_STATUS[error.kind] ?? 400, body: { error: error.kind, message: error.message, ...error.fields } };
  }
  if (error instanceof ComfyUnreachableError) return { status: 503, body: { error: "runner_unreachable", message: error.message } };
  if (error instanceof VeniceApiError) return { status: error.status === 429 ? 429 : 502, body: { error: "venice_error", message: error.message } };
  const typed = error as { type?: string };
  if (typed?.type === "entity.too.large") return { status: 413, body: { error: "payload_too_large", message: "That photo is too large to send. Try a smaller one." } };
  if (typed?.type === "entity.parse.failed") return { status: 400, body: { error: "bad_request", message: "The request was not valid JSON." } };
  if (error instanceof TypeError || error instanceof RangeError || error instanceof ReferenceError || error instanceof SyntaxError) {
    return { status: 500, body: { error: "internal", message: "Something went wrong inside the server. Check its log." } };
  }
  // The messages from wan.ts and video.ts say what is wrong and how to fix it
  return { status: 400, body: { error: "failed", message: error instanceof Error ? error.message : String(error) } };
}

const handle =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    fn(req, res).catch(next);
  };

async function within<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([promise, new Promise<never>((_, reject) => (timer = setTimeout(() => reject(new Error(`${what} did not answer in ${ms / 1000} s.`)), ms)))]);
  } finally {
    clearTimeout(timer);
  }
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

const CLIP_TYPES: Record<string, string> = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mkv": "video/x-matroska", ".gif": "image/gif", ".webp": "image/webp" };

/** Streams a saved clip with Range support (iOS Safari will not play a video without it), only from the output directory. */
async function sendClip(req: Request, res: Response, path: string): Promise<void> {
  const root = resolve(wanConfig.outputDir);
  const rel = relative(root, resolve(path));
  if (rel === "" || rel.startsWith("..") || isAbsolute(rel)) throw new HttpError(404, "That clip is not available.");
  const info = await stat(path).catch(() => undefined);
  if (!info?.isFile()) throw new HttpError(404, "That clip is gone (old clips are deleted automatically, see WAN_RETAIN_HOURS).");
  const download = req.query.download === "1";
  await new Promise<void>((done, fail) => {
    res.sendFile(
      path,
      {
        dotfiles: "allow",
        headers: {
          "Content-Type": CLIP_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream",
          "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${basename(path).replace(/[^\w.\-]/g, "_")}"`,
          "Cache-Control": "private, max-age=3600"
        }
      },
      error => {
        if (!error) return done();
        // A viewer who scrubbed away or locked their phone is not a failure
        const code = (error as NodeJS.ErrnoException).code;
        if (res.headersSent || code === "ECONNABORTED" || code === "EPIPE" || code === "ECONNRESET") return done();
        const status = (error as { status?: number }).status;
        fail(status ? new HttpError(status, "That part of the clip can't be sent.") : error);
      }
    );
  });
}

// ---------------------------------------------------------------------------
// The app
// ---------------------------------------------------------------------------

export function createWebApp(token: string): express.Express {
  const app = express();
  app.disable("x-powered-by");
  // A reverse proxy on this machine (tailscale serve, cloudflared) supplies the client address and protocol
  app.set("trust proxy", "loopback");
  const auth = createAuth(token);

  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; img-src 'self' data: blob:; media-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'"
    );
    const started = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/api/")) console.error(`[web] ${req.method} ${req.path} ${res.statusCode} ${Date.now() - started} ms`);
    });
    next();
  });

  // The page itself holds no secrets; every API call is authenticated
  app.get("/healthz", (_req, res) => void res.json({ ok: true }));
  app.use(express.static(WEB_DIR, { index: "index.html", dotfiles: "ignore", setHeaders: res => res.setHeader("Cache-Control", "no-cache") }));

  const api = express.Router();

  // A page on another site must not be able to drive the app: state-changing calls have to come from this origin
  api.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.get("origin");
      if (origin) {
        let host: string | undefined;
        try {
          host = new URL(origin).host;
        } catch {
          // fall through to the refusal
        }
        const allowed = [req.get("host"), req.get("x-forwarded-host")].filter(Boolean);
        if (!host || !allowed.includes(host)) return void res.status(403).json({ error: "bad_origin", message: "That request came from another site." });
      }
    }
    next();
  });

  api.post("/login", express.json({ limit: "4kb" }), auth.login);
  api.post("/logout", auth.logout);
  api.get("/session", (req, res) => void res.json({ authenticated: auth.isAuthed(req) }));

  api.use(auth.requireAuth);
  api.use(express.json({ limit: MAX_BODY }));

  api.get(
    "/status",
    handle(async (_req, res) => {
      const signal = AbortSignal.timeout(STATUS_TIMEOUT_MS * 2);

      const local = async (): Promise<Record<string, unknown>> => {
        try {
          const profile = await within(getRunnerProfile(signal), STATUS_TIMEOUT_MS, "ComfyUI");
          const mode = async (name: "t2v" | "i2v"): Promise<WanModeDefaults | { error: string }> => {
            try {
              return await describeDefaults(profile, name);
            } catch (error) {
              return { error: message(error) };
            }
          };
          const queue = await readQueue(signal, 4_000).catch(() => undefined);
          return {
            reachable: true,
            gpu: profile.gpu ?? null,
            vram_gb: profile.vramGB ?? null,
            gguf: profile.ggufLoader,
            queue: queue ? { running: queue.running.length, waiting: queue.pending.length } : null,
            modes: { t2v: await mode("t2v"), i2v: await mode("i2v") }
          };
        } catch (error) {
          return { reachable: false, error: message(error) };
        }
      };

      const hosted = async (): Promise<Record<string, unknown>> => {
        if (!config.apiKey) return { configured: false, prefix: videoConfig.modelPrefix, error: "VENICE_API_KEY is not set on the computer running this app." };
        try {
          const models = (await within(listModels("video", signal), STATUS_TIMEOUT_MS, "Venice"))
            .filter(model => model.id.toLowerCase().startsWith(videoConfig.modelPrefix) && !model.offline)
            .map(model => model.id);
          const balance = await fetchBalances(signal);
          return { configured: true, prefix: videoConfig.modelPrefix, models, ...(balance ? { balance } : {}) };
        } catch (error) {
          return { configured: true, prefix: videoConfig.modelPrefix, models: [], error: message(error) };
        }
      };

      const [localStatus, hostedStatus] = await Promise.all([local(), hosted()]);
      res.json({ local: localStatus, hosted: hostedStatus });
    })
  );

  api.get("/jobs", (_req, res) => {
    const jobs = [...listJobs().map(localView), ...listVideoJobs().map(hostedView)].sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json({ jobs });
  });

  api.post(
    "/local/video",
    handle(async (req, res) => {
      const body = parse(LocalBody, req.body);
      const job = await queueWanVideo(
        {
          prompt: body.prompt,
          ...(body.negative_prompt ? { negative_prompt: body.negative_prompt } : {}),
          ...(body.width !== undefined ? { width: body.width } : {}),
          ...(body.height !== undefined ? { height: body.height } : {}),
          ...(body.duration !== undefined ? { duration: body.duration } : {}),
          ...(body.seed !== undefined ? { seed: body.seed } : {}),
          ...(body.image ? { start_image: body.image } : {})
        },
        AbortSignal.timeout(60_000)
      );
      res.status(201).json({ job: localView(job) });
    })
  );

  api.post(
    "/hosted/quote",
    handle(async (req, res) => {
      const body = parse(HostedQuoteBody, req.body);
      res.json(await quoteVideoRequest(body, AbortSignal.timeout(30_000)));
    })
  );

  api.post(
    "/hosted/video",
    handle(async (req, res) => {
      const body = parse(HostedBody, req.body);
      const job = await startVideo(
        {
          prompt: body.prompt,
          duration: body.duration,
          ...(body.model ? { model: body.model } : {}),
          ...(body.aspect_ratio ? { aspect_ratio: body.aspect_ratio } : {}),
          ...(body.resolution ? { resolution: body.resolution } : {}),
          ...(body.negative_prompt ? { negative_prompt: body.negative_prompt } : {}),
          ...(body.image ? { image_url: body.image } : {}),
          ...(body.max_usd !== undefined ? { max_usd: body.max_usd } : {})
        },
        AbortSignal.timeout(60_000)
      );
      res.status(201).json({ job: hostedView(job) });
    })
  );

  api.post(
    "/jobs/:engine/:id/cancel",
    handle(async (req, res) => {
      if (req.params.engine !== "local") throw new HttpError(400, "Venice has no way to cancel a hosted video once it is queued.");
      const { job, action } = await cancelJob(String(req.params.id), AbortSignal.timeout(20_000));
      res.json({ job: localView(job), action });
    })
  );

  api.get(
    "/jobs/:engine/:id/video",
    handle(async (req, res) => {
      const id = String(req.params.id);
      const path =
        req.params.engine === "local" ? listJobs().find(job => job.job_id === id)?.output_path : req.params.engine === "hosted" ? listVideoJobs().find(job => job.queue_id === id)?.output_path : undefined;
      if (!path) throw new HttpError(404, "There is no finished video for that job.");
      await sendClip(req, res, path);
    })
  );

  api.get(
    "/library",
    handle(async (_req, res) => {
      const dir = resolve(wanConfig.outputDir);
      const names = (await readdir(dir).catch(() => [] as string[])).filter(isManagedName);
      const files = (
        await Promise.all(
          names.map(async name => {
            const info = await stat(join(dir, name)).catch(() => undefined);
            return info?.isFile() ? { name, size: info.size, modified: info.mtime.toISOString(), engine: name.startsWith("venice-") ? "hosted" : "local" } : undefined;
          })
        )
      )
        .filter((file): file is NonNullable<typeof file> => file !== undefined)
        .sort((a, b) => b.modified.localeCompare(a.modified))
        .slice(0, 100);
      res.json({ files });
    })
  );

  api.get(
    "/library/:name",
    handle(async (req, res) => {
      const name = String(req.params.name);
      if (!isManagedName(name) || name !== basename(name)) throw new HttpError(404, "That clip is not available.");
      await sendClip(req, res, join(resolve(wanConfig.outputDir), name));
    })
  );

  app.use("/api", api);
  app.use("/api", (_req, res) => void res.status(404).json({ error: "not_found", message: "No such endpoint." }));

  app.use((error: unknown, req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = describeError(error);
    if (status >= 500) console.error(`[web] ${req.method} ${req.path} failed:`, error);
    if (res.headersSent) return void res.end();
    res.status(status).json(body);
  });

  return app;
}
