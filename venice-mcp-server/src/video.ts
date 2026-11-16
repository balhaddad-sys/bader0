/**
 * Hosted Venice video (the venice_video tool). Billed to the Venice account.
 *
 * The flow is quote -> queue -> return at once; a background poller then calls /video/retrieve until the file (or a
 * download URL for it) is ready, saves it to the output directory, and releases Venice's copy with /video/complete.
 * It mirrors the local Wan path in wan.ts, but the parameters genuinely differ (seconds from a model-specific list and
 * aspect-ratio strings, not frames and a size grid), so it is a separate tool.
 */
import { pathToFileURL } from "node:url";
import { VeniceApiError, veniceJson, veniceRaw } from "./api.js";
import { config, videoConfig } from "./config.js";
import { hostedOutputPath, saveResponseBody } from "./output.js";
import { listModels } from "./venice.js";

/** Venice's request size limit; an image_url given as a data: URI counts toward it. */
const MAX_PAYLOAD_BYTES = 25 * 1024 * 1024;
const MAX_VIDEO_BYTES = 1024 ** 3;
const RETRIEVE_TIMEOUT_MS = 300_000;
const MAX_TRACKED_JOBS = 100;
/** A 404 from /video/retrieve this soon after queueing is treated as "not visible yet", not as a failure. */
const NOT_FOUND_GRACE_MS = 30_000;
const NO_SIGNAL = new AbortController().signal;

export type VideoStatus = "queued" | "processing" | "completed" | "failed" | "timed_out";
const TERMINAL: ReadonlySet<VideoStatus> = new Set(["completed", "failed"]);

export interface VideoJob {
  queue_id: string;
  status: VideoStatus;
  model: string;
  prompt: string;
  duration_seconds: number;
  aspect_ratio?: string;
  resolution?: string;
  has_image: boolean;
  quote_usd: number | null;
  created_at: string;
  finished_at?: string;
  progress?: { elapsed_seconds: number; estimated_total_seconds?: number; estimated_percent?: number };
  output_path?: string;
  output_uri?: string;
  output_mime_type?: string;
  bytes?: number;
  server_media_deleted?: boolean;
  error?: string;
  warnings: string[];
}

export interface VideoRequest {
  prompt: string;
  /** Seconds. Sent to Venice as a string such as "5s". */
  duration: number;
  model?: string;
  aspect_ratio?: string;
  resolution?: string;
  negative_prompt?: string;
  /** An https URL or a data: URI. */
  image_url?: string;
}

/** A refusal the caller can act on, with the fields behind it. The tool turns it into an error result with structuredContent. */
export class VideoRequestError extends Error {
  constructor(
    readonly kind: string,
    message: string,
    readonly fields: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "VideoRequestError";
  }
}

/** A failure that no amount of polling will fix. */
class FatalVideoError extends Error {}

// ---------------------------------------------------------------------------
// Reading loosely shaped bodies
// ---------------------------------------------------------------------------

function dig(value: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((current, key) => (current && typeof current === "object" ? (current as Record<string, unknown>)[key] : undefined), value);
}

function firstString(value: unknown, paths: string[]): string | undefined {
  for (const path of paths) {
    const found = dig(value, path);
    if (typeof found === "string" && found.trim()) return found.trim();
  }
  return undefined;
}

/** The first number found under the keys Venice might use for a price, however it nests it. */
function extractUsd(value: unknown, depth = 0): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))) return Number(value);
  if (!value || typeof value !== "object" || depth > 2) return null;
  for (const key of ["quote", "usd", "quote_usd", "price_usd", "cost_usd", "price", "cost", "amount", "total"]) {
    if (key in value) {
      const found = extractUsd((value as Record<string, unknown>)[key], depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Error mapping
// ---------------------------------------------------------------------------

async function readBalances(signal: AbortSignal): Promise<string | undefined> {
  try {
    const raw = await veniceJson("api_keys/rate_limits", { timeoutMs: 5_000 }, signal);
    const balances = dig(raw, "data.balances");
    if (!balances || typeof balances !== "object") return undefined;
    const parts = Object.entries(balances as Record<string, unknown>)
      .filter(([, amount]) => typeof amount === "number")
      .map(([currency, amount]) => `${currency} ${(amount as number).toFixed(2)}`);
    return parts.length ? parts.join(", ") : undefined;
  } catch {
    return undefined;
  }
}

function extractConsent(body: unknown): { version?: string; policy?: string; docs?: string } | undefined {
  const rawError = dig(body, "error");
  const code = firstString(body, ["error.code", "code"]) ?? (typeof rawError === "string" ? rawError : undefined);
  if (code !== "needs_consent") return undefined;
  const version = firstString(body, ["consent.consent_version", "error.consent.consent_version", "consent_version", "consent.version"]);
  const policy = firstString(body, ["consent.policy_text", "error.consent.policy_text", "policy_text", "consent.text"]);
  const docs = firstString(body, ["docs_url", "error.docs_url"]);
  return { ...(version ? { version } : {}), ...(policy ? { policy } : {}), ...(docs ? { docs } : {}) };
}

/**
 * Turns the Venice errors that have a specific meaning for a video request into actionable ones; anything else is
 * returned unchanged (and carries the generic mapping from api.ts). Nothing here claims what was or was not billed.
 */
async function mapVideoError(error: unknown, options: { signal: AbortSignal; quoteUsd?: number | null }): Promise<Error> {
  if (!(error instanceof VeniceApiError)) return error instanceof Error ? error : new Error(String(error));
  const { body } = error;

  switch (error.status) {
    case 402: {
      const balance = await readBalances(options.signal);
      const quoted = options.quoteUsd != null ? ` The clip was quoted at $${options.quoteUsd.toFixed(2)}.` : "";
      return new VideoRequestError(
        "insufficient_credits",
        `Venice reports this account is out of credits for this video.${quoted} ${balance ? `Current balance: ${balance}.` : "The current balance could not be read."} ` +
          "Add credits at https://venice.ai/settings/api and try again. The video was not queued.",
        { ...(balance ? { balance } : {}), quote_usd: options.quoteUsd ?? null }
      );
    }
    case 409: {
      const consent = extractConsent(body);
      if (!consent) break;
      const version = consent.version ? ` (consent version ${consent.version})` : "";
      return new VideoRequestError(
        "needs_consent",
        `Venice needs the user's consent before it will generate this video${version}. The video was not queued.\n\n` +
          `Policy text:\n${consent.policy ?? "Venice did not return the policy text."}\n\n` +
          "venice_video cannot give consent on the user's behalf. Show this text to the user; only if they agree should they complete Venice's consent step, after which the request can be retried." +
          (consent.docs ? `\nPolicy guide: ${consent.docs}` : ""),
        {
          ...(consent.version ? { consent_version: consent.version } : {}),
          policy_text: consent.policy ?? null,
          ...(consent.docs ? { docs_url: consent.docs } : {})
        }
      );
    }
    case 413:
      return new VideoRequestError(
        "payload_too_large",
        "The request is over Venice's 25 MB payload limit, so the video was not queued. An image_url given as a data: URI counts toward it: use a smaller image, or pass an https URL instead.",
        { limit_bytes: MAX_PAYLOAD_BYTES }
      );
    case 422: {
      const suggested = firstString(body, ["suggested_prompt", "error.suggested_prompt", "details.suggested_prompt", "error.details.suggested_prompt"]);
      const said = error.detail ? ` Venice said: ${error.detail}` : "";
      return new VideoRequestError(
        "prompt_rejected",
        suggested
          ? `Venice would not generate a video from this prompt (HTTP 422).${said}\nSuggested prompt: ${suggested}\nThe video was not queued. Retry with the suggested prompt if it still says what you want.`
          : `Venice could not process this video request (HTTP 422).${said} It was not queued; check the prompt, duration, aspect_ratio and resolution against the model.`,
        { suggested_prompt: suggested ?? null }
      );
    }
  }
  return error;
}

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

/**
 * Video models offered by this tool: whatever the live catalog lists whose ID starts with the configured prefix
 * (wan-3-0). Nothing is hardcoded beyond that prefix, so new variants appear without a code change.
 */
export async function resolveVideoModel(requested: string | undefined, hasImage: boolean, signal: AbortSignal): Promise<string> {
  const prefix = videoConfig.modelPrefix;
  const all = await listModels("video", signal);
  const allowed = all.filter(model => model.id.toLowerCase().startsWith(prefix) && !model.offline);
  if (allowed.length === 0) {
    throw new VideoRequestError(
      "no_model",
      `Venice's video catalog has no model whose ID starts with "${prefix}", so there is nothing to queue on. It currently lists: ${all.map(model => model.id).join(", ") || "no video models"}. ` +
        "Check that your account has access, or change VENICE_VIDEO_MODEL_PREFIX.",
      { available: all.map(model => model.id) }
    );
  }
  const ids = allowed.map(model => model.id);
  if (requested) {
    const match = allowed.find(model => model.id.toLowerCase() === requested.toLowerCase());
    if (!match) {
      throw new VideoRequestError("unknown_model", `${requested} is not one of the "${prefix}" video models Venice lists: ${ids.join(", ")}.`, { available: ids });
    }
    return match.id;
  }
  const wanted = hasImage ? /image[-_]to[-_]video|i2v/i : /text[-_]to[-_]video|t2v/i;
  const fitting = allowed.filter(model => wanted.test(model.id));
  if (fitting.length > 0) return fitting[0]!.id;
  const neutral = allowed.filter(model => !/image[-_]to[-_]video|i2v|text[-_]to[-_]video|t2v/i.test(model.id));
  if (neutral.length === 1) return neutral[0]!.id;
  throw new VideoRequestError(
    "ambiguous_model",
    `None of the "${prefix}" models Venice lists (${ids.join(", ")}) is clearly a ${hasImage ? "image-to-video" : "text-to-video"} model. Pass model explicitly.`,
    { available: ids }
  );
}

// ---------------------------------------------------------------------------
// Quote and queue
// ---------------------------------------------------------------------------

function checkImageUrl(imageUrl: string): void {
  if (/^https:\/\//i.test(imageUrl) || /^data:image\/(?:png|jpeg|webp);base64,/i.test(imageUrl)) return;
  throw new Error("image_url must be an https:// URL or a data:image/png|jpeg|webp;base64 URI.");
}

function assertPayloadSize(body: unknown): void {
  const bytes = Buffer.byteLength(JSON.stringify(body));
  if (bytes > MAX_PAYLOAD_BYTES) {
    throw new VideoRequestError(
      "payload_too_large",
      `The request is ${(bytes / 1024 / 1024).toFixed(1)} MB, over Venice's 25 MB payload limit, so nothing was sent. ` +
        "An image_url given as a data: URI counts toward the limit: use a smaller image, or pass an https URL instead.",
      { payload_bytes: bytes, limit_bytes: MAX_PAYLOAD_BYTES }
    );
  }
}

async function getQuote(model: string, request: VideoRequest, signal: AbortSignal): Promise<{ usd: number | null; warning?: string }> {
  const duration = `${request.duration}s`;
  const full = { model, duration, ...(request.resolution ? { resolution: request.resolution } : {}), ...(request.aspect_ratio ? { aspect_ratio: request.aspect_ratio } : {}) };
  try {
    return { usd: extractUsd(await veniceJson("video/quote", { body: full }, signal)) };
  } catch (error) {
    // The documented quote request is model + duration. If Venice objects to the extra fields, ask with just those.
    const rejected = error instanceof VeniceApiError && (error.status === 400 || error.status === 422);
    if (!rejected || (!request.resolution && !request.aspect_ratio)) throw error;
    const usd = extractUsd(await veniceJson("video/quote", { body: { model, duration } }, signal));
    return { usd, warning: "The price quote covers the model and duration only: Venice did not accept resolution or aspect_ratio on the quote, so the final price may differ." };
  }
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

interface VideoContext {
  /** The queue-time download_url, already checked against the trusted hosts. */
  downloadUrl?: URL;
}

const jobs = new Map<string, VideoJob>();
const contexts = new Map<string, VideoContext>();
const inFlight = new Map<string, Promise<void>>();

function track(job: VideoJob, context: VideoContext): void {
  if (jobs.size >= MAX_TRACKED_JOBS) {
    const oldest = [...jobs.values()].find(candidate => TERMINAL.has(candidate.status));
    if (oldest) {
      jobs.delete(oldest.queue_id);
      contexts.delete(oldest.queue_id);
    }
  }
  jobs.set(job.queue_id, job);
  contexts.set(job.queue_id, context);
}

/** A download URL is only fetched from the API's own origin or an https venice.ai host, and never with the API key. */
function trustedDownloadUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return undefined;
  }
  if (url.origin === new URL(config.baseUrl).origin) return url;
  if (url.protocol === "https:" && (url.hostname === "venice.ai" || url.hostname.endsWith(".venice.ai"))) return url;
  return undefined;
}

async function fetchDownload(start: URL): Promise<Response> {
  const apiOrigin = new URL(config.baseUrl).origin;
  let current = start;
  for (let hop = 0; hop < 4; hop++) {
    const response = await fetch(current, {
      redirect: "manual",
      headers: { Accept: "video/*,*/*" },
      signal: AbortSignal.timeout(RETRIEVE_TIMEOUT_MS)
    });
    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      const next = new URL(location, current);
      if (next.protocol !== "https:" && next.origin !== apiOrigin) throw new FatalVideoError("Venice's download URL redirected to a non-https location, which was not followed.");
      current = next;
      continue;
    }
    if (response.ok) return response;
    const message = `Downloading the video from Venice's download URL failed with HTTP ${response.status}.`;
    throw response.status >= 400 && response.status < 500 && response.status !== 429 ? new FatalVideoError(message) : new Error(message);
  }
  throw new FatalVideoError("Venice's download URL redirected too many times.");
}

/** Validates, quotes, queues, and starts the background poll. Returns as soon as Venice has queued it. */
export async function startVideo(request: VideoRequest, signal: AbortSignal): Promise<VideoJob> {
  if (request.image_url) checkImageUrl(request.image_url);
  const model = await resolveVideoModel(request.model, Boolean(request.image_url), signal);
  const body = {
    model,
    prompt: request.prompt,
    duration: `${request.duration}s`,
    ...(request.aspect_ratio ? { aspect_ratio: request.aspect_ratio } : {}),
    ...(request.resolution ? { resolution: request.resolution } : {}),
    ...(request.negative_prompt ? { negative_prompt: request.negative_prompt } : {}),
    ...(request.image_url ? { image_url: request.image_url } : {})
  };
  assertPayloadSize(body);

  let quote: { usd: number | null; warning?: string };
  try {
    quote = await getQuote(model, request, signal);
  } catch (error) {
    throw await mapVideoError(error, { signal });
  }

  let queued: unknown;
  try {
    queued = await veniceJson("video/queue", { body }, signal);
  } catch (error) {
    throw await mapVideoError(error, { signal, quoteUsd: quote.usd });
  }
  const queueId = firstString(queued, ["queue_id"]);
  if (!queueId) throw new Error("Venice accepted the request but returned no queue_id. Nothing can be polled; check venice_account_limits and retry.");
  const downloadUrl = trustedDownloadUrl(firstString(queued, ["download_url"]));

  const job: VideoJob = {
    queue_id: queueId,
    status: "queued",
    model: firstString(queued, ["model"]) ?? model,
    prompt: request.prompt,
    duration_seconds: request.duration,
    ...(request.aspect_ratio ? { aspect_ratio: request.aspect_ratio } : {}),
    ...(request.resolution ? { resolution: request.resolution } : {}),
    has_image: Boolean(request.image_url),
    quote_usd: quote.usd,
    created_at: new Date().toISOString(),
    warnings: quote.warning ? [quote.warning] : []
  };
  track(job, downloadUrl ? { downloadUrl } : {});
  console.error(`[venice-video] queued ${queueId} on ${job.model}: ${request.duration}s, quote ${quote.usd === null ? "unknown" : `$${quote.usd}`}`);
  watch(job);
  return job;
}

const mimeFor = (type: string): { mime: string; extension: string } => {
  if (type.startsWith("video/webm")) return { mime: "video/webm", extension: ".webm" };
  if (type.startsWith("video/quicktime")) return { mime: "video/quicktime", extension: ".mov" };
  return { mime: "video/mp4", extension: ".mp4" };
};

/** Saves the file, then releases Venice's copy. A failed release is reported on the job, not treated as a failed video. */
async function saveVideo(job: VideoJob, response: Response, contentType: string): Promise<void> {
  const { mime, extension } = mimeFor(contentType);
  const path = hostedOutputPath(job.queue_id, extension);
  job.bytes = await saveResponseBody(response, path, MAX_VIDEO_BYTES);
  job.output_path = path;
  job.output_uri = pathToFileURL(path).href;
  job.output_mime_type = mime;
  job.status = "completed";
  job.finished_at = new Date().toISOString();
  delete job.error;
  delete job.progress;

  try {
    const released = await veniceJson("video/complete", { body: { queue_id: job.queue_id, model: job.model } }, NO_SIGNAL);
    job.server_media_deleted = dig(released, "success") === true;
    if (!job.server_media_deleted) job.warnings.push("Venice did not confirm that it deleted its stored copy of the video; it may still be held on Venice's side.");
  } catch (error) {
    job.server_media_deleted = false;
    job.warnings.push(`The video was saved, but releasing Venice's stored copy failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function checkTimeout(job: VideoJob): void {
  if (TERMINAL.has(job.status)) return;
  const elapsed = Date.now() - Date.parse(job.created_at);
  if (elapsed > videoConfig.timeoutSeconds * 1000) {
    job.status = "timed_out";
    job.error =
      `No result after ${Math.round(elapsed / 1000)} s (VENICE_VIDEO_TIMEOUT is ${videoConfig.timeoutSeconds} s). ` +
      "It may still finish on Venice's side: venice_video_status checks again, or raise VENICE_VIDEO_TIMEOUT. Venice has no cancel endpoint for video jobs.";
  }
}

async function refresh(job: VideoJob, signal: AbortSignal): Promise<void> {
  if (TERMINAL.has(job.status)) return;
  const context = contexts.get(job.queue_id) ?? {};
  const response = await veniceRaw(
    "video/retrieve",
    { body: { model: job.model, queue_id: job.queue_id, delete_media_on_completion: false }, timeoutMs: RETRIEVE_TIMEOUT_MS },
    signal
  );
  const type = (response.headers.get("content-type") ?? "").toLowerCase();

  // Done: the file itself
  if (type.startsWith("video/") || type.startsWith("application/octet-stream")) {
    await saveVideo(job, response, type);
    return;
  }

  let data: unknown;
  try {
    data = JSON.parse(await response.text());
  } catch {
    throw new Error("Venice returned a status response for the video that is not JSON.");
  }
  const status = (firstString(data, ["status"]) ?? "").toUpperCase();

  if (status === "COMPLETED") {
    // Some models complete without a body: the file is then at the download_url given when the job was queued
    const url = trustedDownloadUrl(firstString(data, ["download_url", "url"])) ?? context.downloadUrl;
    if (!url) throw new FatalVideoError("Venice says the video is complete but returned neither the file nor a download URL it can be fetched from.");
    const download = await fetchDownload(url);
    await saveVideo(job, download, (download.headers.get("content-type") ?? "").toLowerCase());
    return;
  }
  if (/^(FAILED|ERROR|CANCELLED|CANCELED)$/.test(status)) {
    throw new FatalVideoError(`Venice reports the video ${status.toLowerCase()}${firstString(data, ["error", "error.message", "message"]) ? `: ${firstString(data, ["error", "error.message", "message"])}` : "."}`);
  }

  job.status = status === "QUEUED" || status === "PENDING" ? "queued" : "processing";
  const elapsedMs = Number(dig(data, "execution_duration"));
  const averageMs = Number(dig(data, "average_execution_time"));
  if (Number.isFinite(elapsedMs) && elapsedMs >= 0) {
    job.progress = {
      elapsed_seconds: Math.round(elapsedMs / 1000),
      ...(Number.isFinite(averageMs) && averageMs > 0
        ? { estimated_total_seconds: Math.round(averageMs / 1000), estimated_percent: Math.min(99, Math.round((elapsedMs / averageMs) * 100)) }
        : {})
    };
  }
  checkTimeout(job);
}

async function refreshOnce(job: VideoJob, signal: AbortSignal): Promise<void> {
  const existing = inFlight.get(job.queue_id);
  if (existing) return existing;
  const pending = refresh(job, signal).finally(() => inFlight.delete(job.queue_id));
  inFlight.set(job.queue_id, pending);
  return pending;
}

function failJob(job: VideoJob, message: string): void {
  job.status = "failed";
  job.finished_at = new Date().toISOString();
  job.error = message;
}

/** Polls a job in the background until it settles or times out. Timers are unref'd so they never keep the process alive. */
function watch(job: VideoJob): void {
  const tick = async () => {
    try {
      await refreshOnce(job, NO_SIGNAL);
    } catch (error) {
      const young = Date.now() - Date.parse(job.created_at) < NOT_FOUND_GRACE_MS;
      if (error instanceof FatalVideoError) failJob(job, error.message);
      else if (error instanceof VeniceApiError && error.status >= 400 && error.status < 500 && ![408, 429].includes(error.status) && !(error.status === 404 && young)) failJob(job, error.message);
      else checkTimeout(job);
    }
    if (TERMINAL.has(job.status) || job.status === "timed_out") return;
    setTimeout(() => void tick(), videoConfig.pollIntervalMs).unref();
  };
  setTimeout(() => void tick(), videoConfig.pollIntervalMs).unref();
}

/** Current state of a job. A job this server did not queue (for example from before a restart) can be checked by passing its model. */
export async function getVideoStatus(queueId: string, model: string | undefined, signal: AbortSignal): Promise<VideoJob> {
  const known = jobs.get(queueId);
  if (known) {
    try {
      await refreshOnce(known, signal);
    } catch (error) {
      if (error instanceof FatalVideoError) failJob(known, error.message);
      else throw error;
    }
    return known;
  }
  if (!model) {
    throw new Error(`This server did not queue ${queueId} (it may be from before a restart). Pass the model it was queued with to check it.`);
  }
  const job: VideoJob = {
    queue_id: queueId,
    status: "queued",
    model,
    prompt: "(queued before this server started)",
    duration_seconds: 0,
    has_image: false,
    quote_usd: null,
    created_at: new Date().toISOString(),
    warnings: []
  };
  try {
    await refreshOnce(job, signal);
  } catch (error) {
    if (error instanceof FatalVideoError) failJob(job, error.message);
    else throw error;
  }
  track(job, {});
  if (!TERMINAL.has(job.status)) watch(job);
  return job;
}

export function listVideoJobs(): VideoJob[] {
  return [...jobs.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
