/**
 * Editing a ComfyUI API workflow without knowing its node IDs. Every node is found by class_type (and, for the prompt
 * encoders, by following the sampler's wiring), so a workflow re-exported from ComfyUI with different IDs still works.
 */
import { isGguf, type RunnerProfile } from "./wan-runner.js";
import type { Workflow, WorkflowNode } from "./wan-workflows.js";

export type Link = [string, number];
export const isLink = (value: unknown): value is Link =>
  Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "number";

export function nodes(workflow: Workflow, test: (node: WorkflowNode) => boolean): [string, WorkflowNode][] {
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

export function findEncoders(workflow: Workflow): { positive: string; negative?: string } {
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

// ---------------------------------------------------------------------------
// Diffusion model loaders
// ---------------------------------------------------------------------------

export const DIFFUSION_LOADERS: Record<string, string> = { UNETLoader: "unet_name", UnetLoaderGGUF: "unet_name", CheckpointLoaderSimple: "ckpt_name" };

export const diffusionLoaders = (workflow: Workflow): [string, WorkflowNode][] => nodes(workflow, node => node.class_type in DIFFUSION_LOADERS);

export function loaderFile(node: WorkflowNode): string | undefined {
  const value = node.inputs[DIFFUSION_LOADERS[node.class_type] ?? ""];
  return typeof value === "string" ? value : undefined;
}

export function setLoaderFile(node: WorkflowNode, file: string): void {
  node.inputs[DIFFUSION_LOADERS[node.class_type]!] = file;
}

export function ggufMissingError(file: string, baseUrl: string): Error {
  return new Error(
    `${file} is a GGUF checkpoint. GGUF files load through the UnetLoaderGGUF node from the ComfyUI-GGUF custom nodes ` +
      `(https://github.com/city96/ComfyUI-GGUF), and ComfyUI at ${baseUrl} does not have that node, so nothing was submitted. ` +
      "Install ComfyUI-GGUF and restart ComfyUI, or use a .safetensors checkpoint."
  );
}

/**
 * Makes each diffusion loader's node class match its file, by extension: a .gguf needs UnetLoaderGGUF, anything else
 * UNETLoader. Refuses, before anything is submitted, when a GGUF is wanted and ComfyUI-GGUF is not installed.
 * CheckpointLoaderSimple nodes are left alone (rewriting them would break their CLIP and VAE links).
 */
export function normalizeLoaders(workflow: Workflow, profile: Pick<RunnerProfile, "ggufLoader">, baseUrl: string): void {
  for (const [, node] of diffusionLoaders(workflow)) {
    const file = loaderFile(node);
    if (file === undefined) continue;
    if (node.class_type === "CheckpointLoaderSimple") {
      if (isGguf(file)) {
        throw new Error(`${file} is a GGUF file, which CheckpointLoaderSimple cannot load. Use a UNETLoader or UnetLoaderGGUF node for it.`);
      }
      continue;
    }
    if (isGguf(file)) {
      if (!profile.ggufLoader) throw ggufMissingError(file, baseUrl);
      node.class_type = "UnetLoaderGGUF";
      node.inputs = { unet_name: file };
    } else {
      node.class_type = "UNETLoader";
      node.inputs = { unet_name: file, weight_dtype: typeof node.inputs.weight_dtype === "string" ? node.inputs.weight_dtype : "default" };
    }
  }
}

/** Swaps a missing text encoder / VAE / CLIP vision file for an installed equivalent (bundled workflows only). */
export function substituteSupportFile(node: WorkflowNode, input: string, installed: string[], pattern: RegExp, label: string): void {
  const current = node.inputs[input];
  if (typeof current !== "string" || installed.length === 0 || installed.includes(current)) return;
  const replacement = installed.find(file => pattern.test(file));
  if (!replacement) {
    throw new Error(`ComfyUI is missing the Wan ${label} (${current}). Install it in ComfyUI's models folder. Installed: ${installed.join(", ")}.`);
  }
  node.inputs[input] = replacement;
}

// ---------------------------------------------------------------------------
// Injecting a request
// ---------------------------------------------------------------------------

export interface InjectInput {
  prompt: string;
  negativePrompt: string;
  explicitNegative: boolean;
  width: number;
  height: number;
  frames: number;
  fps: number;
  seed: number;
  steps?: number;
  cfg?: number;
  sampler?: string;
  knownSamplers: string[];
  filenamePrefix: string;
}

export interface InjectResult {
  warnings: string[];
  /** The node whose steps / cfg / sampler to report. */
  sampler: WorkflowNode;
}

export function injectRequest(workflow: Workflow, input: InjectInput): InjectResult {
  const warnings: string[] = [];

  const encoders = findEncoders(workflow);
  workflow[encoders.positive]!.inputs.text = input.prompt;
  if (encoders.negative) workflow[encoders.negative]!.inputs.text = input.negativePrompt;
  else if (input.explicitNegative) warnings.push("The workflow has no negative prompt node; negative_prompt was ignored.");

  const latents = nodes(workflow, node => /LatentVideo$|ImageToVideo/.test(node.class_type) && "width" in node.inputs && "height" in node.inputs && "length" in node.inputs);
  if (latents.length === 0) {
    throw new Error("The workflow has no latent video node (EmptyHunyuanLatentVideo, WanImageToVideo, Wan22ImageToVideoLatent…) with width/height/length inputs.");
  }
  for (const [, node] of latents) Object.assign(node.inputs, { width: input.width, height: input.height, length: input.frames });

  // The metadata's frame rate is the truth: the video node is made to match it, so the file and duration agree
  for (const [, node] of nodes(workflow, node => /Video|Animated|Combine/.test(node.class_type))) {
    const key = typeof node.inputs.fps === "number" ? "fps" : typeof node.inputs.frame_rate === "number" ? "frame_rate" : undefined;
    if (!key) continue;
    if (node.inputs[key] !== input.fps) {
      warnings.push(`${node.class_type} said ${String(node.inputs[key])} fps; set to ${input.fps} to match the workflow's metadata.`);
      node.inputs[key] = input.fps;
    }
  }

  const seeded = nodes(workflow, node => /KSampler|SamplerCustom|RandomNoise/.test(node.class_type) && (typeof node.inputs.seed === "number" || typeof node.inputs.noise_seed === "number"));
  if (seeded.length === 0) throw new Error("The workflow has no KSampler (or RandomNoise) node to set the seed on.");
  for (const [, node] of seeded) node.inputs[typeof node.inputs.seed === "number" ? "seed" : "noise_seed"] = input.seed;

  const stepNodes = nodes(workflow, node => /^KSampler(Advanced)?$|BasicScheduler/.test(node.class_type) && typeof node.inputs.steps === "number");
  if (input.steps !== undefined) {
    if (stepNodes.length === 1) stepNodes[0]![1].inputs.steps = input.steps;
    else warnings.push(`steps was ignored: the workflow has ${stepNodes.length} samplers with their own step splits.`);
  }
  if (input.cfg !== undefined) {
    for (const [, node] of nodes(workflow, node => /KSampler|SamplerCustom|CFGGuider/.test(node.class_type) && typeof node.inputs.cfg === "number")) node.inputs.cfg = input.cfg;
  }
  if (input.sampler !== undefined) {
    if (input.knownSamplers.length && !input.knownSamplers.includes(input.sampler)) {
      throw new Error(`Unknown sampler ${JSON.stringify(input.sampler)}. ComfyUI offers: ${input.knownSamplers.join(", ")}.`);
    }
    for (const [, node] of nodes(workflow, node => /KSampler/.test(node.class_type) && typeof node.inputs.sampler_name === "string")) node.inputs.sampler_name = input.sampler;
  }
  for (const [, node] of nodes(workflow, node => typeof node.inputs.filename_prefix === "string")) node.inputs.filename_prefix = input.filenamePrefix;

  return { warnings, sampler: stepNodes[0]?.[1] ?? seeded[0]![1] };
}
