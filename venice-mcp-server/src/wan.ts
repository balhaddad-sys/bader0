/**
 * Local Wan video generation through ComfyUI: runner detection, VRAM-based defaults,
 * workflow injection by class_type, and the job lifecycle (queue -> poll -> download).
 *
 * Nothing here calls Venice. Jobs are tracked in this process; job IDs are ComfyUI prompt
 * IDs, so wan_status can still resolve a job from ComfyUI's history after a server restart.
 */
import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ComfyApiError, comfyBytes, comfyJson } from "./comfy.js";
import { wanConfig } from "./config.js";
import { bundledImageToVideo, bundledTextToVideo, type Workflow, type WorkflowNode } from "./wan-workflows.js";

export const DEFAULT_FPS = 16;
export const DEFAULT_FRAMES = 81;
export const MAX_FRAMES = 241;
const DEFAULT_NEGATIVE =
  "blurry, low quality, worst quality, jpeg artifacts, static frame, overexposed, subtitles, text, watermark, " +
  "deformed, disfigured, extra fingers, poorly drawn hands, poorly drawn face, mutated limbs, cluttered background";

/** Identifies this server to ComfyUI, so its websocket sends progress for the jobs queued here. */
const CLIENT_ID = randomUUID();
const PROFILE_TTL_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 300_000;
const MAX_START_IMAGE_BYTES = 20 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".bmp": "image/bmp" };
const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

// ---------------------------------------------------------------------------
// Runner detection
// ---------------------------------------------------------------------------

type Mode = "t2v" | "i2v";

export interface Checkpoint {
  file: string;
  loader: "UNETLoader" | "UnetLoaderGGUF";
  mode: "t2v" | "i2v" | "ti2v" | "other";
  family: "2.1" | "2.2" | "unknown";
  params?: number;
  dual?: "high" | "low";
  quantized: boolean;
  footprintGB?: number;
  nativeHeight?: 480 | 720;
}

export interface RunnerProfile {
  gpu?: string;
  vramGB?: number;
  checkpoints: Checkpoint[];
  options: { unet: string[]; gguf: string[]; clip: string[]; vae: string[]; clipVision: string[]; samplers: string[] };
}

let profileCache: { expiresAt: number; profile: RunnerProfile } | undefined;

/** Reads the choices for one input of a node class from /object_info, in both the old and the COMBO format. */
function comboOptions(info: unknown, cls: string, input: string): string[] {
  const node = (info as Record<string, any> | undefined)?.[cls];
  const spec = node?.input?.required?.[input] ?? node?.input?.optional?.[input];
  if (!Array.isArray(spec)) return [];
  const list = Array.isArray(spec[0]) ? spec[0] : spec[0] === "COMBO" ? spec[1]?.options : undefined;
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
}

async function objectInfo(cls: string, signal?: AbortSignal): Promise<unknown> {
  try {
    return await comfyJson(`object_info/${cls}`, {}, signal);
  } catch (error) {
    // Classes from custom nodes that are not installed come back empty or 404
    if (error instanceof ComfyApiError && error.status === 404) return {};
    throw error;
  }
}

function bytesPerParam(name: string): number {
  if (name.endsWith(".gguf")) {
    const level = /q(\d)/.exec(name)?.[1];
    return { "8": 1.06, "6": 0.82, "5": 0.69, "4": 0.56, "3": 0.43, "2": 0.33 }[level ?? ""] ?? 0.6;
  }
  if (/fp8|e4m3|e5m2/.test(name)) return 1;
  if (/fp32/.test(name)) return 4;
  return 2;
}

/** Reads size class, task and family from a checkpoint file name, e.g. wan2.1_t2v_1.3B_fp16.safetensors. */
export function parseCheckpoint(file: string, loader: Checkpoint["loader"]): Checkpoint | undefined {
  const name = file.toLowerCase();
  if (!name.includes("wan")) return undefined;
  const params = /1[._]3b/.test(name) ? 1.3 : /(^|[^0-9.])5b/.test(name) ? 5 : /14b/.test(name) ? 14 : undefined;
  const mode = /(flf2v|vace|fun|s2v|animate|camera|control)/.test(name)
    ? "other"
    : /ti2v/.test(name)
      ? "ti2v"
      : /i2v/.test(name)
        ? "i2v"
        : /t2v/.test(name)
          ? "t2v"
          : "other";
  const family = /wan_?2[._-]?2|wan22/.test(name) ? "2.2" : /wan_?2[._-]?1|wan21/.test(name) ? "2.1" : "unknown";
  const dual = /high[_-]?noise/.test(name) ? "high" : /low[_-]?noise/.test(name) ? "low" : undefined;
  const nativeHeight = /720p/.test(name) ? 720 : /480p/.test(name) || params === 1.3 ? 480 : undefined;
  return {
    file,
    loader,
    mode,
    family,
    ...(params ? { params, footprintGB: Math.round(params * bytesPerParam(name) * 10) / 10 } : {}),
    ...(dual ? { dual } : {}),
    quantized: name.endsWith(".gguf") || /fp8|e4m3|e5m2/.test(name),
    ...(nativeHeight ? { nativeHeight } : {})
  };
}

/** Asks ComfyUI what GPU it has and which models are installed. Cached briefly; throws if the runner is down. */
export async function getRunnerProfile(signal?: AbortSignal): Promise<RunnerProfile> {
  if (profileCache && profileCache.expiresAt > Date.now()) return profileCache.profile;
  const [stats, unet, gguf, clip, vae, clipVision, sampler] = await Promise.all([
    comfyJson("system_stats", {}, signal),
    objectInfo("UNETLoader", signal),
    objectInfo("UnetLoaderGGUF", signal),
    objectInfo("CLIPLoader", signal),
    objectInfo("VAELoader", signal),
    objectInfo("CLIPVisionLoader", signal),
    objectInfo("KSampler", signal)
  ]);
  const devices = ((stats as { devices?: unknown[] }).devices ?? []) as { name?: string; type?: string; vram_total?: number }[];
  const gpu = devices.find(device => device.type !== "cpu" && typeof device.vram_total === "number" && device.vram_total > 0);

  const options = {
    unet: comboOptions(unet, "UNETLoader", "unet_name"),
    gguf: comboOptions(gguf, "UnetLoaderGGUF", "unet_name"),
    clip: comboOptions(clip, "CLIPLoader", "clip_name"),
    vae: comboOptions(vae, "VAELoader", "vae_name"),
    clipVision: comboOptions(clipVision, "CLIPVisionLoader", "clip_name"),
    samplers: comboOptions(sampler, "KSampler", "sampler_name")
  };
  const checkpoints = [
    ...options.unet.map(file => parseCheckpoint(file, "UNETLoader")),
    ...options.gguf.map(file => parseCheckpoint(file, "UnetLoaderGGUF"))
  ].filter((checkpoint): checkpoint is Checkpoint => checkpoint !== undefined);

  // "cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync" -> "NVIDIA GeForce RTX 4090"
  const gpuName = gpu?.name?.replace(/^cuda:\d+\s*/, "").replace(/\s*:\s*\w+$/, "");
  const profile: RunnerProfile = {
    ...(gpuName ? { gpu: gpuName } : {}),
    ...(gpu?.vram_total ? { vramGB: Math.round((gpu.vram_total / 1024 ** 3) * 10) / 10 } : {}),
    checkpoints,
    options
  };
  profileCache = { expiresAt: Date.now() + PROFILE_TTL_MS, profile };
  return profile;
}

// ---------------------------------------------------------------------------
// Defaults from VRAM
// ---------------------------------------------------------------------------

export interface WanDefaults {
  width: number;
  height: number;
  checkpoint?: Checkpoint;
  reason: string;
}

function describeCheckpoint(checkpoint: Checkpoint): string {
  const size = checkpoint.params ? `${checkpoint.params}B` : "unknown size";
  const footprint = checkpoint.footprintGB ? `, ~${checkpoint.footprintGB} GB` : "";
  return `${checkpoint.file} (${size}${checkpoint.quantized ? " quantized" : ""}${footprint})`;
}

function installedList(profile: RunnerProfile): string {
  return profile.checkpoints.length ? profile.checkpoints.map(checkpoint => checkpoint.file).join(", ") : "none";
}

/** Whether the bundled Wan 2.1 single-model workflow can load this checkpoint. */
function fitsBundled(checkpoint: Checkpoint, mode: Mode): boolean {
  return checkpoint.mode === mode && checkpoint.family !== "2.2" && !checkpoint.dual && checkpoint.params !== undefined && checkpoint.params !== 5;
}

/**
 * Picks resolution and (for the bundled workflow) checkpoint from VRAM:
 * under 12 GB -> 480p and the smallest checkpoint; 12-23 GB -> 480p and the largest checkpoint that fits
 * in 75% of VRAM (the mid size on typical installs); 24 GB and up -> 720p and the largest that fits.
 */
export function chooseDefaults(profile: RunnerProfile, mode: Mode, pickCheckpoint: boolean): WanDefaults {
  const vram = profile.vramGB;
  const gpuText = vram !== undefined ? `${profile.gpu ?? "GPU"} with ${vram} GB VRAM` : "no GPU reported by ComfyUI";
  let width = 832;
  let height = 480;
  let tier = "under 12 GB → 480p";
  if (vram !== undefined && vram >= 24) {
    width = 1280;
    height = 720;
    tier = "24 GB+ → 720p";
  } else if (vram !== undefined && vram >= 12) {
    tier = "12–23 GB → 480p (720p possible)";
  }

  let checkpoint: Checkpoint | undefined;
  let modelText = "";
  if (pickCheckpoint) {
    if (wanConfig.model) {
      const file = wanConfig.model;
      checkpoint =
        profile.checkpoints.find(candidate => candidate.file === file) ??
        (profile.options.unet.includes(file)
          ? { file, loader: "UNETLoader", mode: "other", family: "unknown", quantized: false }
          : profile.options.gguf.includes(file)
            ? { file, loader: "UnetLoaderGGUF", mode: "other", family: "unknown", quantized: true }
            : undefined);
      if (!checkpoint) {
        throw new Error(`WAN_MODEL is set to ${wanConfig.model}, but ComfyUI does not have it. Installed Wan checkpoints: ${installedList(profile)}.`);
      }
      modelText = `checkpoint ${describeCheckpoint(checkpoint)} from WAN_MODEL`;
    } else {
      const candidates = profile.checkpoints.filter(candidate => fitsBundled(candidate, mode)).sort((a, b) => (a.footprintGB ?? 0) - (b.footprintGB ?? 0));
      if (candidates.length === 0) throw missingCheckpointError(profile, mode);
      if (vram === undefined || vram < 12) {
        checkpoint = candidates[0]!;
        modelText = `checkpoint ${describeCheckpoint(checkpoint)}, the smallest installed`;
      } else {
        const fitting = candidates.filter(candidate => (candidate.footprintGB ?? Infinity) <= vram * 0.75);
        checkpoint = fitting.at(-1) ?? candidates[0]!;
        modelText = fitting.length
          ? `checkpoint ${describeCheckpoint(checkpoint)}, the largest installed that fits in 75% of VRAM`
          : `checkpoint ${describeCheckpoint(checkpoint)}, the smallest installed (none fit in 75% of VRAM)`;
      }
    }
    if (checkpoint.nativeHeight === 480 && height > 480) {
      width = 832;
      height = 480;
      tier += ", capped at 480p because the checkpoint is a 480p model";
    }
  }

  const reason = `${gpuText} (${tier}): default ${width}x${height}${modelText ? `; ${modelText}` : ""}.`;
  return { width, height, ...(checkpoint ? { checkpoint } : {}), reason };
}

function missingCheckpointError(profile: RunnerProfile, mode: Mode): Error {
  const kind = mode === "t2v" ? "text-to-video" : "image-to-video";
  const envName = mode === "t2v" ? "WAN_WORKFLOW_T2V" : "WAN_WORKFLOW_I2V";
  if (profile.checkpoints.length === 0) {
    return new Error(
      "No Wan checkpoints are installed in ComfyUI (models/diffusion_models). Add one, e.g. " +
        (mode === "t2v" ? "wan2.1_t2v_1.3B_fp16.safetensors (runs under 12 GB)." : "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors.")
    );
  }
  return new Error(
    `No Wan 2.1 ${kind} checkpoint is installed for the bundled workflow. Installed Wan files: ${installedList(profile)}. ` +
      `Wan 2.2 and specialty checkpoints (5B TI2V, high/low-noise 14B, VACE, Fun) need their own workflow: build it in ComfyUI, ` +
      `use Export (API), and set ${envName} to that file.`
  );
}

// ---------------------------------------------------------------------------
// Workflow injection (by class_type, never by node ID)
// ---------------------------------------------------------------------------

type Link = [string, number];
const isLink = (value: unknown): value is Link =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "number";

function nodes(workflow: Workflow, test: (node: WorkflowNode) => boolean): [string, WorkflowNode][] {
  return Object.entries(workflow).filter(([, node]) => test(node));
}

const isEncoder = (node: WorkflowNode) => /TextEncode/.test(node.class_type) && typeof node.inputs.text === "string";

/** Follows a sampler's positive or negative input upstream to the text encoder that feeds it. */
function traceEncoder(workflow: Workflow, start: string, role: "positive" | "negative"): string | undefined {
  const opposite = role === "positive" ? "negative" : "positive";
  const queue = [start];
  const seen = new Set<string>();
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = workflow[id];
    if (!node) continue;
    if (isEncoder(node)) return id;
    const inputs = Object.entries(node.inputs).filter(([key, value]) => isLink(value) && key !== opposite);
    const preferred = inputs.filter(([key]) => key === role || key === "conditioning");
    const rest = inputs.filter(([key]) => key !== role && key !== "conditioning");
    for (const [, value] of [...preferred, ...rest]) queue.push((value as Link)[0]);
  }
  return undefined;
}

function findEncoders(workflow: Workflow): { positive: string; negative?: string } {
  const conditioned = nodes(workflow, node => isLink(node.inputs.positive) && isLink(node.inputs.negative));
  for (const [, node] of conditioned) {
    const positive = traceEncoder(workflow, (node.inputs.positive as Link)[0], "positive");
    const negative = traceEncoder(workflow, (node.inputs.negative as Link)[0], "negative");
    if (positive && negative && positive !== negative) return { positive, negative };
  }
  // No sampler wiring to follow: fall back to titles, then to node order
  const encoders = nodes(workflow, isEncoder).sort(([a], [b]) => Number(a) - Number(b) || a.localeCompare(b));
  if (encoders.length === 0) throw new Error("The workflow has no CLIPTextEncode node to put the prompt in.");
  const titled = (pattern: RegExp) => encoders.find(([, node]) => pattern.test(node._meta?.title ?? ""))?.[0];
  const negative = titled(/neg/i) ?? encoders[1]?.[0];
  const positive = titled(/pos/i) ?? encoders.find(([id]) => id !== negative)![0];
  return { positive, ...(negative && negative !== positive ? { negative } : {}) };
}

const DIFFUSION_LOADERS: Record<string, string> = { UNETLoader: "unet_name", UnetLoaderGGUF: "unet_name", CheckpointLoaderSimple: "ckpt_name" };

/** Swaps a missing text encoder / VAE / CLIP vision file for an installed equivalent (bundled workflow only). */
function substituteSupportFile(node: WorkflowNode, input: string, installed: string[], pattern: RegExp, label: string): void {
  const current = node.inputs[input];
  if (typeof current !== "string" || installed.length === 0 || installed.includes(current)) return;
  const replacement = installed.find(file => pattern.test(file));
  if (!replacement) {
    throw new Error(`ComfyUI is missing the Wan ${label} (${current}). Install it in ComfyUI's models folder. Installed: ${installed.join(", ")}.`);
  }
  node.inputs[input] = replacement;
}

function setDiffusionModel(node: WorkflowNode, checkpoint: Checkpoint): void {
  if (checkpoint.loader === "UnetLoaderGGUF") {
    node.class_type = "UnetLoaderGGUF";
    node.inputs = { unet_name: checkpoint.file };
  } else {
    node.class_type = "UNETLoader";
    node.inputs = { unet_name: checkpoint.file, weight_dtype: typeof node.inputs.weight_dtype === "string" ? node.inputs.weight_dtype : "default" };
  }
}

function readFps(workflow: Workflow): number {
  for (const [, node] of Object.entries(workflow)) {
    const value = node.inputs.fps ?? node.inputs.frame_rate;
    if (typeof value === "number" && value > 0 && /Video|Animated|Combine/.test(node.class_type)) return value;
  }
  return DEFAULT_FPS;
}

/** Wan needs 4k+1 frames. */
export function snapFrames(frames: number): number {
  return Math.min(MAX_FRAMES, Math.max(5, Math.round((frames - 1) / 4) * 4 + 1));
}

async function loadCustomWorkflow(path: string, envName: string): Promise<Workflow> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${envName} (${path}): ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { nodes?: unknown }).nodes)) {
    throw new Error(`${envName} is a UI-format workflow. In ComfyUI use Export (API) and point ${envName} at that file.`);
  }
  const entries = Object.entries((parsed ?? {}) as Record<string, unknown>);
  const valid = entries.length > 0 && entries.every(([, node]) => node && typeof node === "object" && typeof (node as WorkflowNode).class_type === "string" && typeof (node as WorkflowNode).inputs === "object");
  if (!valid) throw new Error(`${envName} (${path}) is not an API-format ComfyUI workflow.`);
  return parsed as Workflow;
}

// ---------------------------------------------------------------------------
// Start image
// ---------------------------------------------------------------------------

/** Uploads a local file or data URI to ComfyUI's input folder, or checks that a media ID is already there. */
async function resolveStartImage(value: string, signal?: AbortSignal): Promise<string> {
  let bytes: Buffer;
  let filename: string;
  let mimeType: string;

  const dataUri = /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/s.exec(value);
  const looksLikePath = isAbsolute(value) || /^(~\/|\.\.?\/|file:\/\/)/.test(value);
  if (dataUri) {
    mimeType = dataUri[1]!;
    bytes = Buffer.from(dataUri[2]!, "base64");
    filename = `start.${mimeType.split("/")[1]}`;
  } else if (looksLikePath) {
    const path = value.startsWith("file://") ? fileURLToPath(value) : value.startsWith("~/") ? join(homedir(), value.slice(2)) : resolve(value);
    const type = IMAGE_TYPES[extname(path).toLowerCase()];
    if (!type) throw new Error(`start_image must be a .png, .jpg, .jpeg, .webp or .bmp file, got ${basename(path)}.`);
    const info = await stat(path).catch(() => undefined);
    if (!info?.isFile()) throw new Error(`start_image file not found: ${path}`);
    if (info.size > MAX_START_IMAGE_BYTES) throw new Error(`start_image is ${Math.round(info.size / 1024 / 1024)} MB; the limit is 20 MB.`);
    bytes = await readFile(path);
    filename = basename(path);
    mimeType = type;
  } else {
    // A media ID: the name of an image already in ComfyUI's input folder, as /upload/image returns it
    if (value.split("/").includes("..") || !/^[\w .\-/]+$/.test(value)) {
      throw new Error("start_image media IDs are file names from ComfyUI's input folder, such as 'start.png' or 'clips/start.png'.");
    }
    const available = comboOptions(await objectInfo("LoadImage", signal), "LoadImage", "image");
    if (available.length && !available.includes(value)) {
      throw new Error(`start_image ${JSON.stringify(value)} is not in ComfyUI's input folder. Pass a local file path instead and it will be uploaded.`);
    }
    return value;
  }
  if (bytes.length > MAX_START_IMAGE_BYTES) throw new Error("start_image is larger than 20 MB.");

  const form = new FormData();
  form.set("image", new Blob([new Uint8Array(bytes)], { type: mimeType }), filename);
  form.set("type", "input");
  form.set("overwrite", "true");
  const uploaded = (await comfyJson("upload/image", { form, timeoutMs: 60_000 }, signal)) as { name?: string; subfolder?: string };
  if (!uploaded.name) throw new Error("ComfyUI accepted the start image but did not return its name.");
  return uploaded.subfolder ? `${uploaded.subfolder}/${uploaded.name}` : uploaded.name;
}

// ---------------------------------------------------------------------------
// Jobs
// ---------------------------------------------------------------------------

export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "timed_out";
const TERMINAL: ReadonlySet<JobStatus> = new Set(["completed", "failed", "cancelled"]);

export interface WanJob {
  job_id: string;
  status: JobStatus;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  prompt: string;
  seed: number;
  width: number;
  height: number;
  frames: number;
  fps: number;
  duration_seconds: number;
  model: string;
  workflow: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  start_image?: string;
  defaults_reason?: string;
  queue_position?: number;
  progress?: { value: number; max: number; percent: number };
  output_path?: string;
  output_uri?: string;
  output_mime_type?: string;
  error?: string;
  warnings: string[];
}

export interface WanVideoParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  frames?: number;
  duration?: number;
  seed?: number;
  start_image?: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
}

const MAX_TRACKED_JOBS = 100;
const jobs = new Map<string, WanJob>();
const inFlight = new Map<string, Promise<void>>();
const loggedReasons = new Set<string>();

function track(job: WanJob): void {
  if (jobs.size >= MAX_TRACKED_JOBS) {
    const oldest = [...jobs.values()].find(candidate => TERMINAL.has(candidate.status));
    if (oldest) jobs.delete(oldest.job_id);
  }
  jobs.set(job.job_id, job);
}

/** Builds the workflow for one request and queues it. Returns as soon as ComfyUI accepts it. */
export async function queueWanVideo(params: WanVideoParams, signal?: AbortSignal): Promise<WanJob> {
  const mode: Mode = params.start_image ? "i2v" : "t2v";
  const envName = mode === "t2v" ? "WAN_WORKFLOW_T2V" : "WAN_WORKFLOW_I2V";
  const customPath = mode === "t2v" ? wanConfig.workflowT2V : wanConfig.workflowI2V;
  const profile = await getRunnerProfile(signal);
  const workflow = customPath ? await loadCustomWorkflow(customPath, envName) : mode === "t2v" ? bundledTextToVideo() : bundledImageToVideo();
  const warnings: string[] = [];

  // Model: chosen from VRAM for the bundled workflow; a custom workflow keeps its own unless WAN_MODEL is set
  const loaders = nodes(workflow, node => node.class_type in DIFFUSION_LOADERS);
  if (loaders.length === 0) throw new Error("The workflow has no UNETLoader (or UnetLoaderGGUF) node to load the Wan model.");
  const defaults = chooseDefaults(profile, mode, !customPath || Boolean(wanConfig.model));
  if (defaults.checkpoint) {
    if (loaders.length > 1) {
      throw new Error(`The workflow loads ${loaders.length} diffusion models (e.g. Wan 2.2 high/low noise), so WAN_MODEL cannot pick one. Unset WAN_MODEL or edit the workflow.`);
    }
    setDiffusionModel(loaders[0]![1], defaults.checkpoint);
  }
  if (!customPath) {
    for (const [, node] of nodes(workflow, node => node.class_type === "CLIPLoader")) substituteSupportFile(node, "clip_name", profile.options.clip, /umt5/i, "text encoder (umt5)");
    for (const [, node] of nodes(workflow, node => node.class_type === "VAELoader")) substituteSupportFile(node, "vae_name", profile.options.vae, /wan.?2[._]?1.*vae|wan_2\.1_vae|^(?!.*2[._]?2).*wan.*vae/i, "VAE");
    for (const [, node] of nodes(workflow, node => node.class_type === "CLIPVisionLoader")) substituteSupportFile(node, "clip_name", profile.options.clipVision, /clip.?vision/i, "CLIP vision model");
  }
  // Every model file the workflow names must be installed
  const optionLists: Record<string, string[]> = { UNETLoader: profile.options.unet, UnetLoaderGGUF: profile.options.gguf, CLIPLoader: profile.options.clip, VAELoader: profile.options.vae, CLIPVisionLoader: profile.options.clipVision };
  for (const [, node] of Object.entries(workflow)) {
    const list = optionLists[node.class_type];
    const input = node.class_type === "CLIPLoader" || node.class_type === "CLIPVisionLoader" ? "clip_name" : node.class_type === "VAELoader" ? "vae_name" : "unet_name";
    const file = node.inputs[input];
    if (list && typeof file === "string" && !list.includes(file)) {
      throw new Error(`ComfyUI does not have ${file} (needed by ${node.class_type}). Installed: ${list.join(", ") || "none"}. Install it or set WAN_MODEL to an installed checkpoint.`);
    }
  }
  if (!loggedReasons.has(defaults.reason)) {
    loggedReasons.add(defaults.reason);
    console.error(`[wan] ${defaults.reason}`);
  }

  // Size and length
  let width = params.width ?? defaults.width;
  let height = params.height ?? defaults.height;
  if (params.width && !params.height) height = Math.max(256, Math.round((params.width * defaults.height) / defaults.width / 16) * 16);
  if (params.height && !params.width) width = Math.max(256, Math.round((params.height * defaults.width) / defaults.height / 16) * 16);
  const fps = readFps(workflow);
  const requestedFrames = params.frames ?? (params.duration !== undefined ? Math.round(params.duration * fps) : DEFAULT_FRAMES);
  const frames = snapFrames(requestedFrames);
  if (frames !== requestedFrames) warnings.push(`frames adjusted from ${requestedFrames} to ${frames} (Wan needs 4k+1 frames, 5–${MAX_FRAMES}).`);
  const vram = profile.vramGB;
  if (vram !== undefined && vram < 12 && width * height > 832 * 480) warnings.push(`${width}x${height} on ${vram} GB VRAM may run out of memory; 832x480 is the safe size.`);
  if (frames > 121) warnings.push(`${frames} frames is beyond Wan's 81-frame training length; expect drift and long renders.`);
  const seed = params.seed ?? randomInt(0, 2 ** 48 - 1);

  // Prompt text
  const encoders = findEncoders(workflow);
  workflow[encoders.positive]!.inputs.text = params.prompt;
  if (encoders.negative) workflow[encoders.negative]!.inputs.text = params.negative_prompt ?? DEFAULT_NEGATIVE;
  else if (params.negative_prompt) warnings.push("The workflow has no negative prompt node; negative_prompt was ignored.");

  // Latent size and length
  const latents = nodes(workflow, node => /LatentVideo$|ImageToVideo/.test(node.class_type) && "width" in node.inputs && "height" in node.inputs && "length" in node.inputs);
  if (latents.length === 0) {
    throw new Error("The workflow has no latent video node (EmptyHunyuanLatentVideo, WanImageToVideo, Wan22ImageToVideoLatent…) with width/height/length inputs.");
  }
  for (const [, node] of latents) Object.assign(node.inputs, { width, height, length: frames });

  // Sampling
  const seeded = nodes(workflow, node => /KSampler|SamplerCustom|RandomNoise/.test(node.class_type) && (typeof node.inputs.seed === "number" || typeof node.inputs.noise_seed === "number"));
  if (seeded.length === 0) throw new Error("The workflow has no KSampler (or RandomNoise) node to set the seed on.");
  for (const [, node] of seeded) node.inputs[typeof node.inputs.seed === "number" ? "seed" : "noise_seed"] = seed;
  const stepNodes = nodes(workflow, node => /^KSampler(Advanced)?$|BasicScheduler/.test(node.class_type) && typeof node.inputs.steps === "number");
  if (params.steps !== undefined) {
    if (stepNodes.length === 1) stepNodes[0]![1].inputs.steps = params.steps;
    else warnings.push(`steps was ignored: the workflow has ${stepNodes.length} samplers with their own step splits.`);
  }
  if (params.cfg !== undefined) {
    for (const [, node] of nodes(workflow, node => /KSampler|SamplerCustom|CFGGuider/.test(node.class_type) && typeof node.inputs.cfg === "number")) node.inputs.cfg = params.cfg;
  }
  if (params.sampler !== undefined) {
    if (profile.options.samplers.length && !profile.options.samplers.includes(params.sampler)) {
      throw new Error(`Unknown sampler ${JSON.stringify(params.sampler)}. ComfyUI offers: ${profile.options.samplers.join(", ")}.`);
    }
    for (const [, node] of nodes(workflow, node => /KSampler/.test(node.class_type) && typeof node.inputs.sampler_name === "string")) node.inputs.sampler_name = params.sampler;
  }
  for (const [, node] of nodes(workflow, node => typeof node.inputs.filename_prefix === "string")) node.inputs.filename_prefix = "venice-mcp/wan";

  // Start image for image-to-video
  let startImage: string | undefined;
  if (params.start_image) {
    const loadImage = nodes(workflow, node => node.class_type === "LoadImage");
    if (loadImage.length === 0) throw new Error(`The image-to-video workflow (${customPath ?? "bundled"}) has no LoadImage node for start_image.`);
    startImage = await resolveStartImage(params.start_image, signal);
    for (const [, node] of loadImage) node.inputs.image = startImage;
  }

  const queued = (await comfyJson("prompt", { json: { prompt: workflow, client_id: CLIENT_ID } }, signal)) as { prompt_id?: string; number?: number };
  if (!queued.prompt_id) throw new Error("ComfyUI accepted the workflow but returned no prompt_id.");

  const sampler = stepNodes[0]?.[1] ?? seeded[0]![1];
  const job: WanJob = {
    job_id: queued.prompt_id,
    status: "queued",
    created_at: new Date().toISOString(),
    prompt: params.prompt,
    seed,
    width,
    height,
    frames,
    fps,
    duration_seconds: Math.round((frames / fps) * 100) / 100,
    model: loaders.map(([, node]) => String(node.inputs.unet_name ?? node.inputs.ckpt_name)).join(" + "),
    workflow: customPath ?? (mode === "t2v" ? "bundled Wan 2.1 text-to-video" : "bundled Wan 2.1 image-to-video"),
    ...(typeof sampler.inputs.steps === "number" ? { steps: sampler.inputs.steps } : {}),
    ...(typeof sampler.inputs.cfg === "number" ? { cfg: sampler.inputs.cfg } : {}),
    ...(typeof sampler.inputs.sampler_name === "string" ? { sampler: sampler.inputs.sampler_name } : {}),
    ...(startImage ? { start_image: startImage } : {}),
    defaults_reason: defaults.reason,
    warnings
  };
  track(job);
  console.error(`[wan] queued ${job.job_id}: seed=${seed} ${width}x${height} ${frames}f@${fps}fps model=${job.model}`);
  ensureProgressSocket();
  watch(job);
  return job;
}

// ---------------------------------------------------------------------------
// Status: history -> queue -> download
// ---------------------------------------------------------------------------

interface OutputFile {
  filename: string;
  subfolder: string;
  type: string;
}

function findOutputFile(outputs: unknown): OutputFile | undefined {
  const files: OutputFile[] = [];
  for (const output of Object.values((outputs ?? {}) as Record<string, unknown>)) {
    for (const list of Object.values((output ?? {}) as Record<string, unknown>)) {
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item && typeof item === "object" && typeof (item as OutputFile).filename === "string") {
          const file = item as Partial<OutputFile>;
          files.push({ filename: file.filename!, subfolder: file.subfolder ?? "", type: file.type ?? "output" });
        }
      }
    }
  }
  const rank = (file: OutputFile) => {
    const ext = extname(file.filename).toLowerCase();
    const media = [".mp4", ".webm", ".mov", ".mkv"].includes(ext) ? 0 : ext in VIDEO_TYPES ? 1 : 9;
    return media * 2 + (file.type === "output" ? 0 : 1);
  };
  const best = files.sort((a, b) => rank(a) - rank(b))[0];
  return best && rank(best) < 18 ? best : undefined;
}

function describeExecutionError(data: Record<string, unknown> | undefined): string {
  const node = typeof data?.node_type === "string" ? data.node_type : "A node";
  const message = typeof data?.exception_message === "string" ? data.exception_message.trim().replace(/\.$/, "") : "unknown error";
  let hint = "";
  if (/out of memory|OOM|allocate/i.test(message)) hint = " Lower width/height or frames, or set WAN_MODEL to a smaller checkpoint.";
  return `${node} failed: ${message}.${hint}`;
}

function finish(job: WanJob, status: JobStatus, error?: string): void {
  job.status = status;
  job.finished_at ??= new Date().toISOString();
  delete job.queue_position;
  if (error) job.error = error;
}

async function download(job: WanJob, file: OutputFile): Promise<void> {
  const bytes = await comfyBytes("view", { filename: file.filename, subfolder: file.subfolder, type: file.type }, DOWNLOAD_TIMEOUT_MS);
  await mkdir(wanConfig.outputDir, { recursive: true });
  const safeName = basename(file.filename).replace(/[^\w.\-]+/g, "_");
  const path = join(wanConfig.outputDir, `${job.job_id}-${safeName}`);
  await writeFile(path, bytes);
  job.output_path = path;
  job.output_uri = pathToFileURL(path).href;
  job.output_mime_type = VIDEO_TYPES[extname(safeName).toLowerCase()] ?? "application/octet-stream";
}

function checkTimeout(job: WanJob): void {
  if (TERMINAL.has(job.status)) return;
  const elapsed = Date.now() - Date.parse(job.created_at);
  if (elapsed > wanConfig.timeoutSeconds * 1000) {
    job.status = "timed_out";
    job.error =
      `No result after ${Math.round(elapsed / 1000)} s (WAN_TIMEOUT is ${wanConfig.timeoutSeconds} s). ` +
      "It may still be rendering in ComfyUI: wan_status checks again, wan_cancel stops it, or raise WAN_TIMEOUT.";
  }
}

async function refresh(job: WanJob, signal?: AbortSignal): Promise<void> {
  const history = (await comfyJson(`history/${encodeURIComponent(job.job_id)}`, {}, signal)) as Record<string, any>;
  const entry = history[job.job_id];
  if (entry) {
    const messages: unknown[] = Array.isArray(entry.status?.messages) ? entry.status.messages : [];
    const message = (name: string) => (messages.find(item => Array.isArray(item) && item[0] === name) as [string, Record<string, unknown>] | undefined)?.[1];
    if (message("execution_interrupted")) return finish(job, "cancelled");
    if (entry.status?.status_str === "error" || message("execution_error")) return finish(job, "failed", describeExecutionError(message("execution_error")));
    const file = findOutputFile(entry.outputs);
    if (file) {
      if (!job.output_path) {
        try {
          await download(job, file);
        } catch (error) {
          if (signal?.aborted) throw error;
          const reason = error instanceof Error ? error.message : String(error);
          return finish(job, "failed", `The render finished, but fetching ${file.filename} from ComfyUI failed (${reason}). The file is still in ComfyUI's output folder.`);
        }
      }
      job.progress = { value: job.progress?.max ?? 1, max: job.progress?.max ?? 1, percent: 100 };
      delete job.error;
      return finish(job, "completed");
    }
    if (entry.status?.completed) {
      return finish(job, "failed", "The workflow finished without saving a video. Make sure it ends in a SaveVideo (or VHS Video Combine) node.");
    }
  }

  const queue = (await comfyJson("queue", {}, signal)) as { queue_running?: unknown[][]; queue_pending?: unknown[][] };
  const running = (queue.queue_running ?? []).some(item => item[1] === job.job_id);
  const pendingIndex = (queue.queue_pending ?? []).findIndex(item => item[1] === job.job_id);
  // A job cancelled here can linger in ComfyUI's queue for a moment; never move it back out of a final state
  const settled = TERMINAL.has(job.status) || job.status === "timed_out";
  if (running) {
    if (!settled) job.status = "running";
    job.started_at ??= new Date().toISOString();
    delete job.queue_position;
  } else if (pendingIndex >= 0) {
    if (!settled) job.status = "queued";
    if (!TERMINAL.has(job.status)) job.queue_position = pendingIndex + 1;
  } else if (job.status !== "cancelled" && Date.now() - Date.parse(job.created_at) > 10_000) {
    // Not in history or the queue: ComfyUI restarted or the job was cleared there
    return finish(job, "failed", "ComfyUI has no record of this job (it may have restarted or the queue was cleared). Queue it again.");
  }
  checkTimeout(job);
}

/** Refreshes a job, sharing one in-flight refresh between the watcher and wan_status. */
async function refreshOnce(job: WanJob, signal?: AbortSignal): Promise<void> {
  const existing = inFlight.get(job.job_id);
  if (existing) return existing;
  const pending = refresh(job, signal).finally(() => inFlight.delete(job.job_id));
  inFlight.set(job.job_id, pending);
  return pending;
}

/** Polls a job in the background until it settles or times out. Timers are unref'd so they never keep the process alive. */
function watch(job: WanJob): void {
  const tick = async () => {
    try {
      await refreshOnce(job);
    } catch {
      // Runner briefly unreachable: keep polling until the timeout decides
      checkTimeout(job);
    }
    if (TERMINAL.has(job.status) || job.status === "timed_out") {
      closeProgressSocketIfIdle();
      return;
    }
    setTimeout(() => void tick(), wanConfig.pollIntervalMs).unref();
  };
  setTimeout(() => void tick(), wanConfig.pollIntervalMs).unref();
}

/** Current state of a job. Jobs queued before a restart are rebuilt from ComfyUI's history. */
export async function getJobStatus(jobId: string, signal?: AbortSignal): Promise<WanJob> {
  let job = jobs.get(jobId);
  if (!job) {
    job = {
      job_id: jobId,
      status: "queued",
      created_at: new Date().toISOString(),
      prompt: "(queued before this server started)",
      seed: -1,
      width: 0,
      height: 0,
      frames: 0,
      fps: DEFAULT_FPS,
      duration_seconds: 0,
      model: "unknown",
      workflow: "unknown",
      warnings: []
    };
    await refresh(job, signal);
    const known = job.status !== "queued" || job.queue_position !== undefined;
    if (!known) throw new Error(`ComfyUI has no job ${jobId}. Check the ID; wan_status with no job_id lists this server's jobs.`);
    track(job);
    return job;
  }
  if (!TERMINAL.has(job.status)) await refreshOnce(job, signal);
  return job;
}

export function listJobs(): WanJob[] {
  return [...jobs.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

/** Removes a waiting job from the queue, or interrupts it if it is rendering. */
export async function cancelJob(jobId: string, signal?: AbortSignal): Promise<{ job: WanJob; action: "dequeued" | "interrupted" | "none" }> {
  const job = await getJobStatus(jobId, signal);
  if (TERMINAL.has(job.status)) return { job, action: "none" };
  const queue = (await comfyJson("queue", {}, signal)) as { queue_running?: unknown[][]; queue_pending?: unknown[][] };
  if ((queue.queue_pending ?? []).some(item => item[1] === jobId)) {
    await comfyJson("queue", { json: { delete: [jobId] } }, signal);
    finish(job, "cancelled");
    return { job, action: "dequeued" };
  }
  if ((queue.queue_running ?? []).some(item => item[1] === jobId)) {
    await comfyJson("interrupt", { json: { prompt_id: jobId } }, signal);
    finish(job, "cancelled");
    return { job, action: "interrupted" };
  }
  await refresh(job, signal);
  return { job, action: "none" };
}

// ---------------------------------------------------------------------------
// Progress over ComfyUI's websocket (best effort; polling stays the source of truth)
// ---------------------------------------------------------------------------

let socket: WebSocket | undefined;

function ensureProgressSocket(): void {
  if (socket || typeof WebSocket === "undefined") return;
  try {
    socket = new WebSocket(`${wanConfig.baseUrl.replace(/^http/, "ws")}/ws?clientId=${CLIENT_ID}`);
  } catch {
    socket = undefined;
    return;
  }
  socket.addEventListener("message", event => {
    if (typeof event.data !== "string") return;
    let message: { type?: string; data?: Record<string, unknown> };
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    const job = typeof message.data?.prompt_id === "string" ? jobs.get(message.data.prompt_id) : undefined;
    if (!job || TERMINAL.has(job.status)) return;
    if (message.type === "execution_start") {
      job.status = "running";
      job.started_at ??= new Date().toISOString();
      delete job.queue_position;
    } else if (message.type === "progress") {
      const value = Number(message.data?.value);
      const max = Number(message.data?.max);
      if (Number.isFinite(value) && max > 0) {
        job.status = job.status === "timed_out" ? job.status : "running";
        job.progress = { value, max, percent: Math.round((value / max) * 100) };
      }
    }
  });
  socket.addEventListener("close", () => {
    socket = undefined;
  });
  socket.addEventListener("error", () => {
    // A close event follows; polling carries on without progress
  });
}

function closeProgressSocketIfIdle(): void {
  if (!socket) return;
  const active = [...jobs.values()].some(job => !TERMINAL.has(job.status) && job.status !== "timed_out");
  if (!active) {
    socket.close();
    socket = undefined;
  }
}
