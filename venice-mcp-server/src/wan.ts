/**
 * Local Wan video generation through ComfyUI: planning from workflow metadata and the GPU, workflow injection by
 * class_type, and the job lifecycle (queue -> poll -> download), including the one out-of-memory retry and shutdown.
 *
 * Nothing here calls Venice. A job's ID is the ComfyUI prompt ID of its first attempt, so wan_status can still resolve
 * it from ComfyUI's history after a server restart; a retried job keeps that ID while its current prompt ID changes.
 */
import { randomInt, randomUUID } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { comfyBytes, comfyJson } from "./comfy.js";
import { wanConfig } from "./config.js";
import { hasPathTraversal, localOutputPath } from "./output.js";
import { diffusionLoaders, ggufMissingError, injectRequest, loaderFile, nodes, normalizeLoaders, setLoaderFile, substituteSupportFile } from "./wan-graph.js";
import {
  describeFootprint,
  estimateFootprint,
  is5B,
  lowerTier,
  pickCandidate,
  preferredSize,
  ratedTier,
  tierAtLeast,
  tierOf,
  TIER_LABEL,
  usableGB,
  type Candidate,
  type Footprint,
  type Tier
} from "./wan-plan.js";
import { comboOptions, getRunnerProfile, isGguf, objectInfo, readQueue, type Checkpoint, type RunnerProfile } from "./wan-runner.js";
import {
  BUNDLED_LABELS,
  loadBundledWorkflow,
  loadWorkflowFile,
  minSide,
  resolveFrames,
  resolveSize,
  sizeLabel,
  snapFrames,
  type BundledKey,
  type LoadedWorkflow,
  type SizeOption,
  type WanMeta
} from "./wan-workflows.js";

export { getRunnerProfile } from "./wan-runner.js";

const DEFAULT_NEGATIVE =
  "blurry, low quality, worst quality, jpeg artifacts, static frame, overexposed, subtitles, text, watermark, " +
  "deformed, disfigured, extra fingers, poorly drawn hands, poorly drawn face, mutated limbs, cluttered background";

/** Identifies this server to ComfyUI, so its websocket sends progress for the jobs queued here. */
const CLIENT_ID = randomUUID();
const DOWNLOAD_TIMEOUT_MS = 300_000;
const SHUTDOWN_TIMEOUT_MS = 2_000;
const MAX_START_IMAGE_BYTES = 20 * 1024 * 1024;
/** Jobs ahead of a new one (running + waiting) at which this server stops adding to ComfyUI's queue. */
const MAX_QUEUE_DEPTH = 2;
const OOM_FRAME_FACTOR = 0.6;
const IMAGE_TYPES: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".bmp": "image/bmp" };
const VIDEO_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".webp": "image/webp",
  ".gif": "image/gif"
};

type Mode = "t2v" | "i2v";

// ---------------------------------------------------------------------------
// Choosing a workflow and checkpoint
// ---------------------------------------------------------------------------

function describeCheckpoint(checkpoint: Checkpoint): string {
  const size = checkpoint.params ? `${checkpoint.params}B` : "unknown size";
  const footprint = checkpoint.footprintGB ? `, ~${checkpoint.footprintGB} GB` : "";
  return `${checkpoint.file} (${size}${checkpoint.quantized ? " quantized" : ""}${footprint})`;
}

const installedList = (profile: RunnerProfile): string => (profile.checkpoints.length ? profile.checkpoints.map(checkpoint => checkpoint.file).join(", ") : "none");

const envNameFor = (mode: Mode): "WAN_WORKFLOW_T2V" | "WAN_WORKFLOW_I2V" => (mode === "t2v" ? "WAN_WORKFLOW_T2V" : "WAN_WORKFLOW_I2V");
const customPathFor = (mode: Mode): string | undefined => (mode === "t2v" ? wanConfig.workflowT2V : wanConfig.workflowI2V);

/** Which bundled workflow can load a checkpoint, if any. The 5B TI2V serves both modes; 2.2 high/low-noise models are not bundled. */
function bundledKeyFor(checkpoint: Checkpoint, mode: Mode): BundledKey | undefined {
  if (checkpoint.dual || checkpoint.params === undefined) return undefined;
  if (is5B(checkpoint)) return checkpoint.mode === "ti2v" || checkpoint.mode === mode ? (`wan2.2_ti2v_5b_${mode}` as BundledKey) : undefined;
  if (checkpoint.family === "2.2" || checkpoint.params === 5) return undefined;
  return checkpoint.mode === mode ? (`wan2.1_${mode}` as BundledKey) : undefined;
}

function missingCheckpointError(profile: RunnerProfile, mode: Mode): Error {
  const kind = mode === "t2v" ? "text-to-video" : "image-to-video";
  const ggufNote = profile.ggufLoader ? "" : " GGUF files are only listed once the ComfyUI-GGUF custom nodes are installed.";
  if (profile.checkpoints.length === 0) {
    return new Error(
      "No Wan checkpoints are installed in ComfyUI (models/diffusion_models). Add one, e.g. " +
        (mode === "t2v" ? "wan2.1_t2v_1.3B_fp16.safetensors (runs under 12 GB)." : "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors.") +
        ggufNote
    );
  }
  return new Error(
    `No installed checkpoint fits a bundled ${kind} workflow (Wan 2.1 1.3B/14B and Wan 2.2 5B TI2V). Installed Wan files: ${installedList(profile)}. ` +
      `Wan 2.2 high/low-noise 14B and specialty checkpoints (VACE, Fun) need their own workflow: build it in ComfyUI, use Export (API), ` +
      `save a sibling .meta.json, and set ${envNameFor(mode)} to that file.${ggufNote}`
  );
}

/** WAN_MODEL: a listed checkpoint, or any installed diffusion model file. */
function resolveModelOverride(profile: RunnerProfile): Checkpoint {
  const file = wanConfig.model!;
  if (isGguf(file) && !profile.ggufLoader) throw ggufMissingError(file, wanConfig.baseUrl);
  const listed = profile.checkpoints.find(candidate => candidate.file === file);
  if (listed) return listed;
  if (!profile.options.unet.includes(file) && !profile.options.gguf.includes(file)) {
    throw new Error(`WAN_MODEL is set to ${file}, but ComfyUI does not have it. Installed Wan checkpoints: ${installedList(profile)}.`);
  }
  return { file, loader: isGguf(file) ? "UnetLoaderGGUF" : "UNETLoader", mode: "other", family: "unknown", quantized: isGguf(file) };
}

function keyForOverride(checkpoint: Checkpoint, mode: Mode): BundledKey {
  if (checkpoint.dual || (checkpoint.family === "2.2" && !is5B(checkpoint))) {
    throw new Error(
      `WAN_MODEL ${checkpoint.file} is a Wan 2.2 high/low-noise or specialty checkpoint, which the bundled workflows cannot load. ` +
        `Build its workflow in ComfyUI, use Export (API), save a sibling .meta.json, and set ${envNameFor(mode)}.`
    );
  }
  if (is5B(checkpoint)) return `wan2.2_ti2v_5b_${mode}`;
  if ((checkpoint.mode === "t2v" || checkpoint.mode === "i2v") && checkpoint.mode !== mode) {
    throw new Error(`WAN_MODEL ${checkpoint.file} is a ${checkpoint.mode} checkpoint, but this request is ${mode}. Unset WAN_MODEL or pass ${checkpoint.mode === "i2v" ? "a start_image" : "no start_image"}.`);
  }
  return `wan2.1_${mode}`;
}

const T5_DEFAULT = "umt5_xxl_fp8_e4m3fn_scaled.safetensors";
/** The text encoder the bundled workflows will end up with: their own if installed, else the first umt5 file. */
const encoderFileFor = (profile: RunnerProfile): string | undefined =>
  profile.options.clip.includes(T5_DEFAULT) ? T5_DEFAULT : profile.options.clip.find(file => /umt5/i.test(file));

interface Selection {
  loaded: LoadedWorkflow;
  checkpoint?: Checkpoint;
  size: SizeOption;
  why: string;
  estimate?: Footprint;
  warnings: string[];
}

/** Picks the workflow (and, for bundled ones, the checkpoint) for a tier. Shared by planning and the wan_status overview. */
async function selectWorkflow(profile: RunnerProfile, mode: Mode, tier: Tier): Promise<Selection> {
  const customPath = customPathFor(mode);
  const encoderFile = encoderFileFor(profile);

  if (customPath) {
    const loaded = await loadWorkflowFile(customPath, envNameFor(mode));
    const checkpoint = wanConfig.model ? resolveModelOverride(profile) : undefined;
    return {
      loaded,
      ...(checkpoint ? { checkpoint } : {}),
      size: preferredSize(loaded.meta, tier, checkpoint),
      why: checkpoint ? "from WAN_MODEL" : "the model the workflow itself loads",
      warnings: []
    };
  }

  if (wanConfig.model) {
    const checkpoint = resolveModelOverride(profile);
    const loaded = await loadBundledWorkflow(keyForOverride(checkpoint, mode));
    const size = preferredSize(loaded.meta, tier, checkpoint);
    const estimate = estimateFootprint({ checkpoint, ...(encoderFile ? { encoderFile } : {}), size, frames: loaded.meta.default_frames });
    return { loaded, checkpoint, size, why: "from WAN_MODEL", ...(estimate ? { estimate } : {}), warnings: [] };
  }

  const candidates: Candidate[] = [];
  for (const checkpoint of profile.checkpoints) {
    const key = bundledKeyFor(checkpoint, mode);
    if (!key) continue;
    candidates.push({ checkpoint, key, meta: (await loadBundledWorkflow(key)).meta });
  }
  if (candidates.length === 0) throw missingCheckpointError(profile, mode);
  const pick = pickCandidate(candidates, { tier, ...(profile.vramGB !== undefined ? { vramGB: profile.vramGB } : {}), ...(encoderFile ? { encoderFile } : {}) });
  return {
    loaded: await loadBundledWorkflow(pick.candidate.key),
    checkpoint: pick.candidate.checkpoint,
    size: pick.size,
    why: pick.why,
    ...(pick.estimate ? { estimate: pick.estimate } : {}),
    warnings: pick.warnings
  };
}

function reasonText(profile: RunnerProfile, tier: Tier, selection: Selection): string {
  const vram = profile.vramGB;
  const gpuText = vram !== undefined ? `${profile.gpu ?? "GPU"} with ${vram} GB VRAM` : "no GPU reported by ComfyUI";
  const capped = selection.checkpoint?.nativeHeight === 480 && minSide(selection.size) <= 480 && tier === "high" ? ", capped at 480p because the checkpoint is a 480p model" : "";
  const model = selection.checkpoint ? `checkpoint ${describeCheckpoint(selection.checkpoint)}, ${selection.why}` : selection.why;
  const usable = usableGB(tier, vram);
  const estimate = selection.estimate && usable !== undefined ? `. Estimate: ${describeFootprint(selection.estimate)} of ${usable} GB usable` : "";
  return `${gpuText} (${TIER_LABEL[tier]}${capped}): default ${sizeLabel(selection.size)}; ${model}${estimate}.`;
}

export interface WanModeDefaults {
  family: string;
  width: number;
  height: number;
  fps: number;
  default_frames: number;
  allowed_sizes: SizeOption[];
  model: string;
  workflow: string;
  tier: Tier;
  reason: string;
}

/** What wan_video would use for a mode on this runner, straight from the metadata and the GPU. */
export async function describeDefaults(profile: RunnerProfile, mode: Mode): Promise<WanModeDefaults> {
  const tier = tierOf(profile.vramGB);
  const selection = await selectWorkflow(profile, mode, tier);
  const meta = selection.loaded.meta;
  return {
    family: meta.family,
    width: selection.size.width,
    height: selection.size.height,
    fps: meta.fps,
    default_frames: meta.default_frames,
    allowed_sizes: meta.allowed_sizes,
    model: selection.checkpoint?.file ?? "(the model the workflow loads)",
    workflow: selection.loaded.bundledKey ? BUNDLED_LABELS[selection.loaded.bundledKey] : selection.loaded.label,
    tier,
    reason: reasonText(profile, tier, selection)
  };
}

// ---------------------------------------------------------------------------
// Planning one request
// ---------------------------------------------------------------------------

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

interface Plan {
  mode: Mode;
  tier: Tier;
  loaded: LoadedWorkflow;
  checkpoint?: Checkpoint;
  model: string;
  width: number;
  height: number;
  frames: number;
  fps: number;
  seed: number;
  family: string;
  workflowLabel: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  warnings: string[];
  reason: string;
  estimate?: Footprint;
}

interface PlanOptions {
  tier?: Tier;
  frames?: number;
  seed?: number;
  /** Drop the caller's width/height and use the tier's default size (an out-of-memory retry). */
  ignoreSize?: boolean;
}

const VAE_PATTERN_21 = /wan.?2[._]?1.*vae|wan_2\.1_vae|^(?!.*2[._]?2).*wan.*vae/i;
const VAE_PATTERN_22 = /wan.?2[._]?2.*vae/i;

/**
 * Builds the workflow for one request without touching ComfyUI's queue: every check that can fail does so here, before
 * a model is loaded. Frame rate, default frames and allowed sizes come from the workflow's metadata.
 */
async function planJob(params: WanVideoParams, profile: RunnerProfile, options: PlanOptions = {}): Promise<Plan> {
  const mode: Mode = params.start_image ? "i2v" : "t2v";
  const customPath = customPathFor(mode);
  const tier = options.tier ?? tierOf(profile.vramGB);
  const selection = await selectWorkflow(profile, mode, tier);
  const { loaded, checkpoint } = selection;
  const meta: WanMeta = loaded.meta;
  const workflow = loaded.workflow;
  const warnings = [...selection.warnings];

  // Size and length, judged against the metadata before anything is submitted
  const size = options.ignoreSize ? selection.size : resolveSize(meta, { width: params.width, height: params.height }, selection.size, loaded.label);
  const length =
    options.frames !== undefined
      ? { frames: snapFrames(options.frames, meta), warnings: [] as string[] }
      : resolveFrames(meta, { frames: params.frames, duration: params.duration });
  warnings.push(...length.warnings);
  const frames = length.frames;

  // The diffusion model: .gguf files get UnetLoaderGGUF by extension; a custom workflow keeps its own unless WAN_MODEL is set
  const loaders = diffusionLoaders(workflow);
  if (loaders.length === 0) throw new Error("The workflow has no UNETLoader (or UnetLoaderGGUF) node to load the Wan model.");
  if (checkpoint && (!customPath || Boolean(wanConfig.model))) {
    if (loaders.length > 1) {
      throw new Error(`The workflow loads ${loaders.length} diffusion models (e.g. Wan 2.2 high/low noise), so WAN_MODEL cannot pick one. Unset WAN_MODEL or edit the workflow.`);
    }
    setLoaderFile(loaders[0]![1], checkpoint.file);
  }
  normalizeLoaders(workflow, profile, wanConfig.baseUrl);

  if (!customPath) {
    const vaePattern = loaded.bundledKey?.startsWith("wan2.2") ? VAE_PATTERN_22 : VAE_PATTERN_21;
    for (const [, node] of nodes(workflow, node => node.class_type === "CLIPLoader")) substituteSupportFile(node, "clip_name", profile.options.clip, /umt5/i, "text encoder (umt5)");
    for (const [, node] of nodes(workflow, node => node.class_type === "VAELoader")) substituteSupportFile(node, "vae_name", profile.options.vae, vaePattern, "VAE");
    for (const [, node] of nodes(workflow, node => node.class_type === "CLIPVisionLoader")) substituteSupportFile(node, "clip_name", profile.options.clipVision, /clip.?vision/i, "CLIP vision model");
  }
  // Every model file the workflow names must be installed
  const optionLists: Record<string, string[]> = {
    UNETLoader: profile.options.unet,
    UnetLoaderGGUF: profile.options.gguf,
    CLIPLoader: profile.options.clip,
    VAELoader: profile.options.vae,
    CLIPVisionLoader: profile.options.clipVision
  };
  for (const [, node] of Object.entries(workflow)) {
    const list = optionLists[node.class_type];
    const input = node.class_type === "CLIPLoader" || node.class_type === "CLIPVisionLoader" ? "clip_name" : node.class_type === "VAELoader" ? "vae_name" : "unet_name";
    const file = node.inputs[input];
    if (list && typeof file === "string" && !list.includes(file)) {
      throw new Error(`ComfyUI does not have ${file} (needed by ${node.class_type}). Installed: ${list.join(", ") || "none"}. Install it or set WAN_MODEL to an installed checkpoint.`);
    }
  }
  if (mode === "i2v" && nodes(workflow, node => node.class_type === "LoadImage").length === 0) {
    throw new Error(`The image-to-video workflow (${loaded.label}) has no LoadImage node for start_image.`);
  }

  // Memory: estimate, and say so when it is not expected to fit
  const clipNode = nodes(workflow, node => node.class_type === "CLIPLoader")[0]?.[1];
  const encoderFile = typeof clipNode?.inputs.clip_name === "string" ? clipNode.inputs.clip_name : encoderFileFor(profile);
  const estimate = checkpoint ? estimateFootprint({ checkpoint, ...(encoderFile ? { encoderFile } : {}), size, frames }) : undefined;
  const vram = profile.vramGB;
  if (checkpoint && vram !== undefined) {
    const rated = ratedTier(checkpoint, size);
    const usable = usableGB("high", vram);
    if (rated && !tierAtLeast(tierOf(vram), rated)) {
      warnings.push(`${checkpoint.file} at ${sizeLabel(size)} is rated for a 24 GB-class card and this one has ${vram} GB: expect offloading or out-of-memory. An out-of-memory is retried once at a lower setting.`);
    } else if (!rated && estimate && usable !== undefined && estimate.total > usable) {
      warnings.push(`Estimated ${describeFootprint(estimate)} is more than the ${usable} GB usable of ${vram} GB VRAM; ComfyUI will offload to system RAM (slow) and may run out of memory.`);
    }
  }
  if (checkpoint?.nativeHeight === 480 && minSide(size) > 480) {
    warnings.push(`${checkpoint.file} is a 480p model; ${sizeLabel(size)} is outside the resolution it was trained for.`);
  }

  const seed = options.seed ?? params.seed ?? randomInt(0, 2 ** 48 - 1);
  const injected = injectRequest(workflow, {
    prompt: params.prompt,
    negativePrompt: params.negative_prompt ?? DEFAULT_NEGATIVE,
    explicitNegative: params.negative_prompt !== undefined,
    width: size.width,
    height: size.height,
    frames,
    fps: meta.fps,
    seed,
    ...(params.steps !== undefined ? { steps: params.steps } : {}),
    ...(params.cfg !== undefined ? { cfg: params.cfg } : {}),
    ...(params.sampler !== undefined ? { sampler: params.sampler } : {}),
    knownSamplers: profile.options.samplers,
    filenamePrefix: "venice-mcp/wan"
  });
  warnings.push(...injected.warnings);

  const sampler = injected.sampler;
  return {
    mode,
    tier,
    loaded,
    ...(checkpoint ? { checkpoint } : {}),
    model: diffusionLoaders(workflow).map(([, node]) => loaderFile(node) ?? "unknown").join(" + "),
    width: size.width,
    height: size.height,
    frames,
    fps: meta.fps,
    seed,
    family: meta.family,
    workflowLabel: loaded.bundledKey ? BUNDLED_LABELS[loaded.bundledKey] : (customPath ?? loaded.label),
    ...(typeof sampler.inputs.steps === "number" ? { steps: sampler.inputs.steps } : {}),
    ...(typeof sampler.inputs.cfg === "number" ? { cfg: sampler.inputs.cfg } : {}),
    ...(typeof sampler.inputs.sampler_name === "string" ? { sampler: sampler.inputs.sampler_name } : {}),
    warnings,
    reason: reasonText(profile, tier, selection),
    ...(estimate ? { estimate } : {})
  };
}

// ---------------------------------------------------------------------------
// Start image
// ---------------------------------------------------------------------------

/** Cheap, purely textual check that runs before anything else: no `..` in a path or media ID. */
function assertSafeStartImage(value: string): void {
  if (/^data:/i.test(value)) return;
  if (hasPathTraversal(value)) {
    throw new Error('start_image must not contain ".." or NUL. Pass the file\'s full path, or an image name from ComfyUI\'s input folder.');
  }
}

type PreparedImage = { kind: "existing"; name: string } | { kind: "upload"; bytes: Buffer; filename: string; mimeType: string };

/**
 * Checks a start image without side effects: a local file or data URI is read and validated, a media ID is checked
 * against ComfyUI's input folder. The upload itself waits until the queue-busy check has passed.
 */
async function prepareStartImage(value: string, signal?: AbortSignal): Promise<PreparedImage> {
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
    if (!/^[\w .\-/]+$/.test(value)) {
      throw new Error("start_image media IDs are file names from ComfyUI's input folder, such as 'start.png' or 'clips/start.png'.");
    }
    const available = comboOptions(await objectInfo("LoadImage", signal), "LoadImage", "image");
    if (available.length && !available.includes(value)) {
      throw new Error(`start_image ${JSON.stringify(value)} is not in ComfyUI's input folder. Pass a local file path instead and it will be uploaded.`);
    }
    return { kind: "existing", name: value };
  }
  if (bytes.length > MAX_START_IMAGE_BYTES) throw new Error("start_image is larger than 20 MB.");
  return { kind: "upload", bytes, filename, mimeType };
}

/** Uploads a prepared image to ComfyUI's input folder and returns the name to put in LoadImage. */
async function uploadStartImage(prepared: PreparedImage, signal?: AbortSignal): Promise<string> {
  if (prepared.kind === "existing") return prepared.name;
  const form = new FormData();
  form.set("image", new Blob([new Uint8Array(prepared.bytes)], { type: prepared.mimeType }), prepared.filename);
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

export interface AttemptSummary {
  prompt_id: string;
  tier: Tier;
  width: number;
  height: number;
  frames: number;
  model: string;
  outcome: "out_of_memory";
}

export interface WanJob {
  /** The ComfyUI prompt ID of the first attempt. Stays the same if the job is retried. */
  job_id: string;
  /** The prompt ID of the current attempt. */
  prompt_id: string;
  attempt: number;
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
  family?: string;
  tier?: Tier;
  model: string;
  workflow: string;
  steps?: number;
  cfg?: number;
  sampler?: string;
  start_image?: string;
  defaults_reason?: string;
  queue_position?: number;
  progress?: { value: number; max: number; percent: number };
  previous_attempts?: AttemptSummary[];
  output_path?: string;
  output_uri?: string;
  output_mime_type?: string;
  error?: string;
  warnings: string[];
}

interface JobContext {
  params: WanVideoParams;
  startImage?: string;
  plan: Plan;
}

const MAX_TRACKED_JOBS = 100;
const jobs = new Map<string, WanJob>();
const contexts = new Map<string, JobContext>();
/** Current prompt ID -> job, for websocket progress. */
const promptIndex = new Map<string, WanJob>();
/** Jobs this process queued. Only these are cancelled at shutdown. */
const owned = new Set<string>();
const inFlight = new Map<string, Promise<void>>();
const loggedReasons = new Set<string>();

function track(job: WanJob): void {
  if (jobs.size >= MAX_TRACKED_JOBS) {
    const oldest = [...jobs.values()].find(candidate => TERMINAL.has(candidate.status));
    if (oldest) {
      jobs.delete(oldest.job_id);
      contexts.delete(oldest.job_id);
      promptIndex.delete(oldest.prompt_id);
      owned.delete(oldest.job_id);
    }
  }
  jobs.set(job.job_id, job);
  promptIndex.set(job.prompt_id, job);
}

function applyPlan(job: WanJob, plan: Plan): void {
  job.seed = plan.seed;
  job.width = plan.width;
  job.height = plan.height;
  job.frames = plan.frames;
  job.fps = plan.fps;
  job.duration_seconds = Math.round((plan.frames / plan.fps) * 100) / 100;
  job.family = plan.family;
  job.tier = plan.tier;
  job.model = plan.model;
  job.workflow = plan.workflowLabel;
  job.defaults_reason = plan.reason;
  if (plan.steps !== undefined) job.steps = plan.steps;
  if (plan.cfg !== undefined) job.cfg = plan.cfg;
  if (plan.sampler !== undefined) job.sampler = plan.sampler;
  for (const warning of plan.warnings) if (!job.warnings.includes(warning)) job.warnings.push(warning);
}

async function submitPlan(plan: Plan, startImage: string | undefined, signal?: AbortSignal): Promise<string> {
  if (startImage) {
    for (const [, node] of nodes(plan.loaded.workflow, node => node.class_type === "LoadImage")) node.inputs.image = startImage;
  }
  const queued = (await comfyJson("prompt", { json: { prompt: plan.loaded.workflow, client_id: CLIENT_ID } }, signal)) as { prompt_id?: string };
  if (!queued.prompt_id) throw new Error("ComfyUI accepted the workflow but returned no prompt_id.");
  return queued.prompt_id;
}

/** Refuses to stack a job on a queue that already has MAX_QUEUE_DEPTH ahead of it. Applies to new jobs only, not the retry of a failed one. */
async function assertQueueNotBusy(signal?: AbortSignal): Promise<void> {
  const queue = await readQueue(signal);
  const ahead = queue.running.length + queue.pending.length;
  if (ahead >= MAX_QUEUE_DEPTH) {
    throw new Error(
      `ComfyUI's queue is busy, ${ahead} ahead (${queue.running.length} running, ${queue.pending.length} waiting), so this job was not queued. ` +
        "Wait for one to finish (wan_status shows progress), stop one with wan_cancel, then try again."
    );
  }
}

/** Plans, checks and queues one clip. Returns as soon as ComfyUI accepts it. */
export async function queueWanVideo(params: WanVideoParams, signal?: AbortSignal): Promise<WanJob> {
  if (params.start_image) assertSafeStartImage(params.start_image);
  const profile = await getRunnerProfile(signal);
  const plan = await planJob(params, profile);
  // Everything that can be wrong with the request is reported before the transient "queue is busy"
  const prepared = params.start_image ? await prepareStartImage(params.start_image, signal) : undefined;
  await assertQueueNotBusy(signal);
  const startImage = prepared ? await uploadStartImage(prepared, signal) : undefined;
  const promptId = await submitPlan(plan, startImage, signal);

  if (!loggedReasons.has(plan.reason)) {
    loggedReasons.add(plan.reason);
    console.error(`[wan] ${plan.reason}`);
  }
  const job: WanJob = {
    job_id: promptId,
    prompt_id: promptId,
    attempt: 1,
    status: "queued",
    created_at: new Date().toISOString(),
    prompt: params.prompt,
    seed: plan.seed,
    width: plan.width,
    height: plan.height,
    frames: plan.frames,
    fps: plan.fps,
    duration_seconds: 0,
    model: plan.model,
    workflow: plan.workflowLabel,
    ...(startImage ? { start_image: startImage } : {}),
    warnings: []
  };
  applyPlan(job, plan);
  track(job);
  contexts.set(job.job_id, { params, ...(startImage ? { startImage } : {}), plan });
  owned.add(job.job_id);
  console.error(`[wan] queued ${job.job_id}: seed=${job.seed} ${job.width}x${job.height} ${job.frames}f@${job.fps}fps family=${job.family} model=${job.model}`);
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

const isOutOfMemory = (data: Record<string, unknown> | undefined): boolean =>
  /out of memory|OutOfMemory|allocate/i.test(`${String(data?.exception_message ?? "")} ${String(data?.exception_type ?? "")}`);

function describeExecutionError(data: Record<string, unknown> | undefined): string {
  const node = typeof data?.node_type === "string" ? data.node_type : "A node";
  const message = typeof data?.exception_message === "string" ? data.exception_message.trim().replace(/\.$/, "") : "unknown error";
  const hint = isOutOfMemory(data) ? " Lower width/height or frames, or set WAN_MODEL to a smaller checkpoint." : "";
  return `${node} failed: ${message}.${hint}`;
}

function finish(job: WanJob, status: JobStatus, error?: string): void {
  job.status = status;
  job.finished_at ??= new Date().toISOString();
  delete job.queue_position;
  if (error) job.error = error;
}

class UnsafeOutputError extends Error {}

/** ComfyUI chooses these names. Anything that would climb out of its output folder is refused before it reaches /view. */
function assertSafeOutputRef(file: OutputFile): void {
  if (hasPathTraversal(file.filename, { rejectAbsolute: true }) || hasPathTraversal(file.subfolder, { rejectAbsolute: true }) || file.filename === "") {
    throw new UnsafeOutputError(
      `ComfyUI named an output ${JSON.stringify(join(file.subfolder, file.filename))} that tries to leave its output folder, so it was not fetched.`
    );
  }
}

async function download(job: WanJob, file: OutputFile): Promise<void> {
  assertSafeOutputRef(file);
  const bytes = await comfyBytes("view", { filename: file.filename, subfolder: file.subfolder, type: file.type }, DOWNLOAD_TIMEOUT_MS);
  const path = localOutputPath(job.job_id, file.filename);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, bytes);
  job.output_path = path;
  job.output_uri = pathToFileURL(path).href;
  job.output_mime_type = VIDEO_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
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

const sameSettings = (a: Plan, b: Plan): boolean =>
  a.checkpoint?.file === b.checkpoint?.file && a.width === b.width && a.height === b.height && a.frames === b.frames && a.loaded.label === b.loaded.label;

/**
 * After an out-of-memory, queues the same request once more at the next tier down: the tier's default size and, for
 * bundled workflows, its checkpoint. When that changes nothing (the 5B has a single size), it asks for fewer frames
 * instead. Returns false when there is nothing smaller to try or the retry could not be queued.
 */
async function retryAfterOutOfMemory(job: WanJob, signal?: AbortSignal): Promise<boolean> {
  const context = contexts.get(job.job_id);
  if (!context || job.attempt >= 2 || !owned.has(job.job_id)) return false;
  const old = context.plan;
  let next: Plan | undefined;
  let change = "";
  try {
    const profile = await getRunnerProfile(signal);
    const lower = lowerTier(old.tier);
    if (lower) {
      const candidate = await planJob(context.params, profile, { tier: lower, seed: job.seed, ignoreSize: true });
      if (!sameSettings(old, candidate)) {
        next = candidate;
        change = `tier ${old.tier} (${TIER_LABEL[old.tier]}) → ${lower} (${TIER_LABEL[lower]})`;
      }
    }
    if (!next) {
      const reduced = Math.max(old.loaded.meta.min_frames, snapFrames(old.frames * OOM_FRAME_FACTOR, old.loaded.meta));
      if (reduced < old.frames) {
        next = await planJob(context.params, profile, { tier: old.tier, seed: job.seed, frames: reduced });
        change = `${old.frames} → ${reduced} frames (there is no smaller size or checkpoint)`;
      }
    }
    if (!next) return false;
    const promptId = await submitPlan(next, context.startImage, signal);

    console.error(
      `[wan] job ${job.job_id}: out of memory at ${old.width}x${old.height}, ${old.frames} frames, ${old.model}; ` +
        `retrying once with ${next.width}x${next.height}, ${next.frames} frames, ${next.model} (${change})`
    );
    (job.previous_attempts ??= []).push({
      prompt_id: job.prompt_id,
      tier: old.tier,
      width: old.width,
      height: old.height,
      frames: old.frames,
      model: old.model,
      outcome: "out_of_memory"
    });
    promptIndex.delete(job.prompt_id);
    job.prompt_id = promptId;
    job.attempt = 2;
    job.status = "queued";
    for (const key of ["started_at", "finished_at", "progress", "queue_position", "error"] as const) delete job[key];
    applyPlan(job, next);
    job.warnings.push(
      `Ran out of memory at ${old.width}x${old.height}, ${old.frames} frames (${old.model}); retried once at ${next.width}x${next.height}, ${next.frames} frames (${next.model}): ${change}.`
    );
    promptIndex.set(promptId, job);
    context.plan = next;
    return true;
  } catch (error) {
    if (signal?.aborted) throw error;
    console.error(`[wan] job ${job.job_id}: could not retry after out-of-memory: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

async function refresh(job: WanJob, signal?: AbortSignal): Promise<void> {
  const history = (await comfyJson(`history/${encodeURIComponent(job.prompt_id)}`, {}, signal)) as Record<string, any>;
  const entry = history[job.prompt_id];
  if (entry) {
    const messages: unknown[] = Array.isArray(entry.status?.messages) ? entry.status.messages : [];
    const message = (name: string) => (messages.find(item => Array.isArray(item) && item[0] === name) as [string, Record<string, unknown>] | undefined)?.[1];
    if (message("execution_interrupted")) return finish(job, "cancelled");
    if (entry.status?.status_str === "error" || message("execution_error")) {
      const data = message("execution_error");
      if (isOutOfMemory(data) && !TERMINAL.has(job.status) && (await retryAfterOutOfMemory(job, signal))) return;
      const retried = job.attempt > 1 ? " It had already been retried once at a lower setting." : "";
      return finish(job, "failed", describeExecutionError(data) + retried);
    }
    const file = findOutputFile(entry.outputs);
    if (file) {
      if (!job.output_path) {
        try {
          await download(job, file);
        } catch (error) {
          if (signal?.aborted) throw error;
          if (error instanceof UnsafeOutputError) return finish(job, "failed", error.message);
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

  const queue = await readQueue(signal);
  const running = queue.running.includes(job.prompt_id);
  const pendingIndex = queue.pending.indexOf(job.prompt_id);
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
      prompt_id: jobId,
      attempt: 1,
      status: "queued",
      created_at: new Date().toISOString(),
      prompt: "(queued before this server started)",
      seed: -1,
      width: 0,
      height: 0,
      frames: 0,
      fps: 0,
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
  const queue = await readQueue(signal);
  if (queue.pending.includes(job.prompt_id)) {
    await comfyJson("queue", { json: { delete: [job.prompt_id] } }, signal);
    finish(job, "cancelled");
    return { job, action: "dequeued" };
  }
  if (queue.running.includes(job.prompt_id)) {
    await comfyJson("interrupt", { json: { prompt_id: job.prompt_id } }, signal);
    finish(job, "cancelled");
    return { job, action: "interrupted" };
  }
  await refresh(job, signal);
  return { job, action: "none" };
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

/**
 * Cancels what this process queued, so a closed session leaves no renders orphaned in ComfyUI: waiting jobs are
 * removed from its queue and the running one is interrupted. Jobs queued by anyone else are left alone.
 */
export async function shutdownWan(): Promise<{ dequeued: number; interrupted: number }> {
  const result = { dequeued: 0, interrupted: 0 };
  const active = [...owned].map(id => jobs.get(id)).filter((job): job is WanJob => job !== undefined && !TERMINAL.has(job.status));
  closeSocket();
  if (active.length === 0) return result;

  const ours = new Set(active.map(job => job.prompt_id));
  const interrupted = new Set<string>();
  try {
    // Two passes: a job that was waiting can start between reading the queue and deleting it
    for (let pass = 0; pass < 2; pass++) {
      const queue = await readQueue(undefined, SHUTDOWN_TIMEOUT_MS);
      const pending = queue.pending.filter(id => ours.has(id));
      const running = queue.running.filter(id => ours.has(id) && !interrupted.has(id));
      if (pending.length === 0 && running.length === 0) break;
      if (pending.length) {
        await comfyJson("queue", { json: { delete: pending }, timeoutMs: SHUTDOWN_TIMEOUT_MS });
        result.dequeued += pending.length;
      }
      for (const id of running) {
        await comfyJson("interrupt", { json: { prompt_id: id }, timeoutMs: SHUTDOWN_TIMEOUT_MS });
        interrupted.add(id);
        result.interrupted++;
      }
    }
  } catch (error) {
    console.error(`[wan] could not cancel every job on shutdown: ${error instanceof Error ? error.message : String(error)}`);
  }
  for (const job of active) finish(job, "cancelled");
  console.error(`[wan] shutdown: removed ${result.dequeued} waiting and interrupted ${result.interrupted} running job(s) in ComfyUI`);
  return result;
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
    const job = typeof message.data?.prompt_id === "string" ? promptIndex.get(message.data.prompt_id) : undefined;
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

function closeSocket(): void {
  if (!socket) return;
  socket.close();
  socket = undefined;
}

function closeProgressSocketIfIdle(): void {
  const active = [...jobs.values()].some(job => !TERMINAL.has(job.status) && job.status !== "timed_out");
  if (!active) closeSocket();
}

