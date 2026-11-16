/**
 * Wan workflows and their metadata.
 *
 * Every workflow is an API-format ComfyUI JSON file with a sibling `<name>.meta.json` holding the numbers that differ
 * between model families and that no code should guess: frame rate, frame counts and the sizes the model accepts.
 * Bundled workflows live in `workflows/` next to `dist/`; user-supplied ones (WAN_WORKFLOW_T2V / _I2V) must bring their
 * own metadata file. A missing or incomplete one is an error, never a fallback to Wan 2.1 numbers.
 */
import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as z from "zod/v4";

export interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
}

export type Workflow = Record<string, WorkflowNode>;

export interface SizeOption {
  width: number;
  height: number;
}

export interface WanMeta {
  family: string;
  fps: number;
  default_frames: number;
  min_frames: number;
  max_frames: number;
  allowed_sizes: SizeOption[];
}

export const META_KEYS = ["family", "fps", "default_frames", "min_frames", "max_frames", "allowed_sizes"] as const;

export type BundledKey = "wan2.1_t2v" | "wan2.1_i2v" | "wan2.2_ti2v_5b_t2v" | "wan2.2_ti2v_5b_i2v";

export const BUNDLED_LABELS: Record<BundledKey, string> = {
  "wan2.1_t2v": "bundled Wan 2.1 text-to-video",
  "wan2.1_i2v": "bundled Wan 2.1 image-to-video",
  "wan2.2_ti2v_5b_t2v": "bundled Wan 2.2 5B text-to-video",
  "wan2.2_ti2v_5b_i2v": "bundled Wan 2.2 5B image-to-video"
};

const BUNDLED_DIR = fileURLToPath(new URL("../workflows/", import.meta.url));

export const bundledPath = (key: BundledKey): string => join(BUNDLED_DIR, `${key}.json`);

/** `/a/b/wan.json` -> `/a/b/wan.meta.json` */
export function metaPathFor(workflowPath: string): string {
  return /\.json$/i.test(workflowPath) ? workflowPath.replace(/\.json$/i, ".meta.json") : `${workflowPath}.meta.json`;
}

const EXAMPLE_META = JSON.stringify({
  family: "2.2",
  fps: 24,
  default_frames: 121,
  min_frames: 49,
  max_frames: 145,
  allowed_sizes: [
    { width: 1280, height: 704 },
    { width: 704, height: 1280 }
  ]
});

const frameCount = z
  .number()
  .int()
  .refine(value => value >= 5 && (value - 1) % 4 === 0, "must be 4k+1 and at least 5 (for example 49, 81, 121)");

const SizeSchema = z.looseObject({
  width: z.number().int().positive().multipleOf(16),
  height: z.number().int().positive().multipleOf(16)
});

const MetaSchema = z
  .looseObject({
    family: z.string().min(1),
    fps: z.number().positive().max(120),
    default_frames: frameCount,
    min_frames: frameCount,
    max_frames: frameCount,
    allowed_sizes: z.array(SizeSchema).min(1)
  })
  .refine(meta => meta.min_frames <= meta.default_frames && meta.default_frames <= meta.max_frames, {
    message: "min_frames <= default_frames <= max_frames must hold",
    path: ["default_frames"]
  });

function parseMeta(raw: unknown, metaPath: string): WanMeta {
  const keys = META_KEYS.join(", ");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${metaPath} must be a JSON object with the keys: ${keys}.`);
  }
  const missing = META_KEYS.filter(key => !(key in raw));
  if (missing.length) {
    throw new Error(`${metaPath} is missing the key(s) ${missing.join(", ")}. Every workflow's metadata needs all of: ${keys}.`);
  }
  const parsed = MetaSchema.safeParse(raw);
  if (!parsed.success) {
    const problems = parsed.error.issues.map(issue => `${issue.path.join(".") || "(root)"}: ${issue.message}`).join("; ");
    throw new Error(`${metaPath} has invalid values: ${problems}.`);
  }
  const { family, fps, default_frames, min_frames, max_frames, allowed_sizes } = parsed.data;
  return {
    family,
    fps,
    default_frames,
    min_frames,
    max_frames,
    allowed_sizes: allowed_sizes.map(size => ({ width: size.width, height: size.height }))
  };
}

export interface LoadedWorkflow {
  workflow: Workflow;
  meta: WanMeta;
  path: string;
  metaPath: string;
  /** What to call it in messages: the bundled name or the user's file name. */
  label: string;
  bundledKey?: BundledKey;
}

/**
 * Reads a workflow and its metadata. `label` names the setting that pointed at it (WAN_WORKFLOW_T2V) for error messages;
 * for bundled files it is the bundled key. Always returns fresh objects, so callers can edit them freely.
 */
export async function loadWorkflowFile(path: string, label: string, options: { bundledKey?: BundledKey } = {}): Promise<LoadedWorkflow> {
  const metaPath = metaPathFor(path);
  const bundled = options.bundledKey !== undefined;

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Could not read ${bundled ? "bundled workflow" : label} (${path}): ${error instanceof Error ? error.message : String(error)}`);
  }
  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { nodes?: unknown }).nodes)) {
    throw new Error(`${label} is a UI-format workflow. In ComfyUI use Export (API) and point ${label} at that file.`);
  }
  const entries = Object.entries((parsed ?? {}) as Record<string, unknown>);
  const valid =
    entries.length > 0 &&
    entries.every(
      ([, node]) => node && typeof node === "object" && typeof (node as WorkflowNode).class_type === "string" && typeof (node as WorkflowNode).inputs === "object"
    );
  if (!valid) throw new Error(`${label} (${path}) is not an API-format ComfyUI workflow.`);

  let rawMeta: unknown;
  try {
    rawMeta = JSON.parse(await readFile(metaPath, "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        bundled
          ? `The bundled metadata file ${metaPath} is missing, so this install of venice-mcp-server is incomplete. Reinstall it.`
          : `${label} points at ${path}, but its metadata file ${metaPath} does not exist. Frame rate, frame counts and sizes differ between Wan families, ` +
              `so every workflow needs a sibling .meta.json with the keys: ${META_KEYS.join(", ")}. Example for Wan 2.2 5B: ${EXAMPLE_META}`
      );
    }
    throw new Error(`Could not read ${metaPath}: ${error instanceof Error ? error.message : String(error)}`);
  }

  return {
    workflow: parsed as Workflow,
    meta: parseMeta(rawMeta, metaPath),
    path,
    metaPath,
    label: bundled ? options.bundledKey! : basename(path),
    ...(options.bundledKey ? { bundledKey: options.bundledKey } : {})
  };
}

export const loadBundledWorkflow = (key: BundledKey): Promise<LoadedWorkflow> => loadWorkflowFile(bundledPath(key), key, { bundledKey: key });

// ---------------------------------------------------------------------------
// Sizes and frame counts, always judged against the metadata
// ---------------------------------------------------------------------------

export const sizeLabel = (size: SizeOption): string => `${size.width}x${size.height}`;
export const minSide = (size: SizeOption): number => Math.min(size.width, size.height);
export const pixels = (size: SizeOption): number => size.width * size.height;

/** Largest first; landscape before portrait when they have the same area. */
export function sizesLargestFirst(meta: WanMeta): SizeOption[] {
  return [...meta.allowed_sizes].sort((a, b) => pixels(b) - pixels(a) || b.width - a.width);
}

/**
 * Checks a requested size against the metadata before anything is submitted, so ComfyUI never has to reject it after
 * loading a model. With only a width or a height, picks the allowed size that has it.
 */
export function resolveSize(meta: WanMeta, requested: { width?: number; height?: number }, preferred: SizeOption, name: string): SizeOption {
  const { width, height } = requested;
  const allowed = sizesLargestFirst(meta);
  const fail = (what: string) =>
    new Error(`${what} ${name} (Wan family ${meta.family}) only accepts these sizes (width x height): ${allowed.map(sizeLabel).join(", ")}. Nothing was submitted.`);

  if (width !== undefined && height !== undefined) {
    const match = allowed.find(size => size.width === width && size.height === height);
    if (!match) throw fail(`${width}x${height} is not allowed:`);
    return match;
  }
  if (width !== undefined) {
    const match = allowed.find(size => size.width === width);
    if (!match) throw fail(`No allowed size has width ${width}:`);
    return match;
  }
  if (height !== undefined) {
    const match = allowed.find(size => size.height === height);
    if (!match) throw fail(`No allowed size has height ${height}:`);
    return match;
  }
  return preferred;
}

/** Rounds to the nearest 4k+1 and keeps the result inside the workflow's frame range. */
export function snapFrames(frames: number, meta: WanMeta): number {
  const snapped = Math.round((frames - 1) / 4) * 4 + 1;
  return Math.min(meta.max_frames, Math.max(meta.min_frames, snapped));
}

/** Turns `frames` or `duration` (seconds) into a frame count for this workflow. The default and the rate come from the metadata. */
export function resolveFrames(meta: WanMeta, requested: { frames?: number; duration?: number }): { frames: number; warnings: string[] } {
  const wanted = requested.frames ?? (requested.duration !== undefined ? Math.round(requested.duration * meta.fps) : meta.default_frames);
  const frames = snapFrames(wanted, meta);
  const warnings: string[] = [];
  if (frames !== wanted) {
    warnings.push(`frames adjusted from ${wanted} to ${frames} (this workflow needs 4k+1 frames between ${meta.min_frames} and ${meta.max_frames}).`);
  }
  if (frames > meta.default_frames * 1.5) {
    warnings.push(`${frames} frames is well beyond this model's default of ${meta.default_frames}; expect drift and long renders.`);
  }
  return { frames, warnings };
}
