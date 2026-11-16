/**
 * What the local ComfyUI runner has: GPU, installed Wan checkpoints, support models and custom nodes.
 */
import { ComfyApiError, comfyJson } from "./comfy.js";

export interface Checkpoint {
  file: string;
  /** Chosen from the file extension: a .gguf can only load through ComfyUI-GGUF's UnetLoaderGGUF. */
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
  /** Device name plus VRAM total: when it changes between reads, everything derived from it is stale. */
  signature: string;
  /** Whether ComfyUI-GGUF's UnetLoaderGGUF node exists in ComfyUI. Without it, .gguf files are not even listed. */
  ggufLoader: boolean;
  checkpoints: Checkpoint[];
  options: { unet: string[]; gguf: string[]; clip: string[]; vae: string[]; clipVision: string[]; samplers: string[] };
}

const PROFILE_TTL_MS = 30_000;
let cache: { expiresAt: number; profile: RunnerProfile } | undefined;

export const isGguf = (file: string): boolean => file.toLowerCase().endsWith(".gguf");

/** Reads the choices for one input of a node class from /object_info, in both the old and the COMBO format. */
export function comboOptions(info: unknown, cls: string, input: string): string[] {
  const node = (info as Record<string, any> | undefined)?.[cls];
  const spec = node?.input?.required?.[input] ?? node?.input?.optional?.[input];
  if (!Array.isArray(spec)) return [];
  const list = Array.isArray(spec[0]) ? spec[0] : spec[0] === "COMBO" ? spec[1]?.options : undefined;
  return Array.isArray(list) ? list.filter((item): item is string => typeof item === "string") : [];
}

export async function objectInfo(cls: string, signal?: AbortSignal): Promise<unknown> {
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
export function parseCheckpoint(file: string): Checkpoint | undefined {
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
    loader: isGguf(file) ? "UnetLoaderGGUF" : "UNETLoader",
    mode,
    family,
    ...(params ? { params, footprintGB: Math.round(params * bytesPerParam(name) * 10) / 10 } : {}),
    ...(dual ? { dual } : {}),
    quantized: isGguf(file) || /fp8|e4m3|e5m2/.test(name),
    ...(nativeHeight ? { nativeHeight } : {})
  };
}

interface Device {
  gpu?: string;
  vramGB?: number;
  signature: string;
}

/** "cuda:0 NVIDIA GeForce RTX 4090 : cudaMallocAsync" -> "NVIDIA GeForce RTX 4090" */
function readDevice(stats: unknown): Device {
  const devices = ((stats as { devices?: unknown[] }).devices ?? []) as { name?: string; type?: string; vram_total?: number }[];
  const gpu = devices.find(device => device.type !== "cpu" && typeof device.vram_total === "number" && device.vram_total > 0);
  const gpuName = gpu?.name?.replace(/^cuda:\d+\s*/, "").replace(/\s*:\s*\w+$/, "");
  return {
    ...(gpuName ? { gpu: gpuName } : {}),
    ...(gpu?.vram_total ? { vramGB: Math.round((gpu.vram_total / 1024 ** 3) * 10) / 10 } : {}),
    signature: `${gpuName ?? "none"}|${gpu?.vram_total ?? 0}`
  };
}

const describeDevice = (device: { gpu?: string; vramGB?: number }): string =>
  device.gpu ? `${device.gpu} with ${device.vramGB} GB` : "no GPU";

/**
 * Asks ComfyUI what GPU it has and which models are installed. /system_stats is read on every call (it is one cheap
 * request) so that a runner restarted on a different GPU, or with a different VRAM total, is noticed at once and the
 * cached model lists and defaults are dropped. The heavier /object_info reads are cached for 30 s.
 */
export async function getRunnerProfile(signal?: AbortSignal): Promise<RunnerProfile> {
  const stats = await comfyJson("system_stats", {}, signal);
  const device = readDevice(stats);

  if (cache && cache.profile.signature === device.signature && cache.expiresAt > Date.now()) return cache.profile;
  if (cache && cache.profile.signature !== device.signature) {
    console.error(`[wan] ComfyUI now reports ${describeDevice(device)} (it was ${describeDevice(cache.profile)}); re-reading models and re-evaluating defaults`);
    cache = undefined;
  }

  const [unet, gguf, clip, vae, clipVision, sampler] = await Promise.all([
    objectInfo("UNETLoader", signal),
    objectInfo("UnetLoaderGGUF", signal),
    objectInfo("CLIPLoader", signal),
    objectInfo("VAELoader", signal),
    objectInfo("CLIPVisionLoader", signal),
    objectInfo("KSampler", signal)
  ]);

  const options = {
    unet: comboOptions(unet, "UNETLoader", "unet_name"),
    gguf: comboOptions(gguf, "UnetLoaderGGUF", "unet_name"),
    clip: comboOptions(clip, "CLIPLoader", "clip_name"),
    vae: comboOptions(vae, "VAELoader", "vae_name"),
    clipVision: comboOptions(clipVision, "CLIPVisionLoader", "clip_name"),
    samplers: comboOptions(sampler, "KSampler", "sampler_name")
  };
  const seen = new Set<string>();
  const checkpoints = [...options.unet, ...options.gguf]
    .filter(file => (seen.has(file) ? false : (seen.add(file), true)))
    .map(file => parseCheckpoint(file))
    .filter((checkpoint): checkpoint is Checkpoint => checkpoint !== undefined);

  const profile: RunnerProfile = {
    ...device,
    ggufLoader: Object.keys((gguf ?? {}) as object).includes("UnetLoaderGGUF"),
    checkpoints,
    options
  };
  cache = { expiresAt: Date.now() + PROFILE_TTL_MS, profile };
  return profile;
}

export interface QueueState {
  running: string[];
  pending: string[];
}

/** ComfyUI's queue as prompt IDs. Items are [number, prompt_id, prompt, extra, outputs]. */
export async function readQueue(signal?: AbortSignal, timeoutMs?: number): Promise<QueueState> {
  const queue = (await comfyJson("queue", timeoutMs !== undefined ? { timeoutMs } : {}, signal)) as { queue_running?: unknown[][]; queue_pending?: unknown[][] };
  const ids = (items?: unknown[][]) => (items ?? []).map(item => item[1]).filter((id): id is string => typeof id === "string");
  return { running: ids(queue.queue_running), pending: ids(queue.queue_pending) };
}
