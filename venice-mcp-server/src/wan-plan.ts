/**
 * Choosing a checkpoint and a size for the GPU at hand. Pure functions: everything they need is passed in.
 *
 * Tiers follow the VRAM classes: under 12 GB, 12-23 GB, 24 GB and up. A card's reported total is a little below its
 * marketing size (a "24 GB" 3090 reports 23.7 GiB), so the boundaries sit at 11.5 and 23.5.
 *
 * The footprint estimate is weights + text encoder + VAE + activations, because Wan loads all of them and the
 * activations grow with resolution and frame count. It is deliberately conservative: ComfyUI offloads the text encoder
 * once the prompt is encoded, so the real peak is usually lower. The OOM retry in wan.ts covers estimates that are too
 * optimistic. They are estimates, labelled as such wherever they are shown.
 */
import type { Checkpoint } from "./wan-runner.js";
import { minSide, pixels, sizeLabel, sizesLargestFirst, type BundledKey, type SizeOption, type WanMeta } from "./wan-workflows.js";

export type Tier = "low" | "mid" | "high";

export const TIER_MID_MIN_GB = 11.5;
export const TIER_HIGH_MIN_GB = 23.5;
const TIER_CEILING_GB: Record<Tier, number> = { low: 11, mid: 23, high: Infinity };
/** Room for the CUDA context and fragmentation. */
const USABLE_FRACTION = 0.92;

export const TIER_LABEL: Record<Tier, string> = {
  high: "24 GB+ → 720p",
  mid: "12–23 GB → 480p (720p possible)",
  low: "under 12 GB → 480p"
};

const RANK: Record<Tier, number> = { low: 0, mid: 1, high: 2 };

export function tierOf(vramGB: number | undefined): Tier {
  if (vramGB !== undefined && vramGB >= TIER_HIGH_MIN_GB) return "high";
  if (vramGB !== undefined && vramGB >= TIER_MID_MIN_GB) return "mid";
  return "low";
}

export const lowerTier = (tier: Tier): Tier | undefined => (tier === "high" ? "mid" : tier === "mid" ? "low" : undefined);

/** GB of VRAM a tier may plan with: the real total, capped at the tier's ceiling when planning for a lower tier. */
export function usableGB(tier: Tier, vramGB: number | undefined): number | undefined {
  if (vramGB === undefined) return undefined;
  return Math.round(Math.min(vramGB, TIER_CEILING_GB[tier]) * USABLE_FRACTION * 10) / 10;
}

// ---------------------------------------------------------------------------
// Footprint
// ---------------------------------------------------------------------------

export interface Footprint {
  weights: number;
  encoder: number;
  vae: number;
  activations: number;
  total: number;
}

/** UMT5-XXL: ~11.4 GB as fp16/bf16, ~6.7 GB as fp8 scaled (ComfyUI's repackaged files). */
export function encoderGB(file: string | undefined): number {
  return /fp8|e4m3|e5m2/i.test(file ?? "") ? 6.7 : 11.4;
}

/** The 5B's own VAE is ~1.4 GB; the 2.1 VAE (also used by the 14B 2.2 models) is ~0.3 GB. */
export const is5B = (checkpoint: Pick<Checkpoint, "family" | "params">): boolean => checkpoint.family === "2.2" && checkpoint.params === 5;

const HIDDEN_DIM: Record<number, number> = { 1.3: 1536, 5: 3072, 14: 5120 };

const round1 = (value: number) => Math.round(value * 10) / 10;

/**
 * Activation memory is modelled as tokens x hidden size x 32 bytes (bf16 x about 16 live tensors per block, plus the
 * VAE decode). Tokens come from the latent grid: 4x temporal compression and a 16 px (2.1) or 32 px (2.2 5B) spatial
 * stride after patching.
 */
export function estimateFootprint(input: {
  checkpoint: Pick<Checkpoint, "family" | "params" | "footprintGB">;
  encoderFile?: string;
  size: SizeOption;
  frames: number;
}): Footprint | undefined {
  const { checkpoint, size, frames } = input;
  if (checkpoint.footprintGB === undefined || checkpoint.params === undefined) return undefined;
  const stride = is5B(checkpoint) ? 32 : 16;
  const tokens = Math.ceil((frames - 1) / 4 + 1) * Math.ceil(size.height / stride) * Math.ceil(size.width / stride);
  const activations = (tokens * (HIDDEN_DIM[checkpoint.params] ?? 4096) * 32) / 1e9;
  const weights = checkpoint.footprintGB;
  const encoder = encoderGB(input.encoderFile);
  const vae = is5B(checkpoint) ? 1.4 : 0.3;
  return {
    weights: round1(weights),
    encoder: round1(encoder),
    vae: round1(vae),
    activations: round1(activations),
    total: round1(weights + encoder + vae + activations)
  };
}

export function describeFootprint(footprint: Footprint): string {
  return `${footprint.total} GB (weights ${footprint.weights} + text encoder ${footprint.encoder} + VAE ${footprint.vae} + activations ${footprint.activations})`;
}

/** The tier a checkpoint is documented to need at a size, whatever the arithmetic says: 5B at 720p is a 24 GB job. */
export function ratedTier(checkpoint: Pick<Checkpoint, "family" | "params">, size: SizeOption): Tier | undefined {
  return is5B(checkpoint) && minSide(size) >= 704 ? "high" : undefined;
}

export const tierAtLeast = (actual: Tier, needed: Tier): boolean => RANK[actual] >= RANK[needed];

// ---------------------------------------------------------------------------
// Sizes and checkpoints
// ---------------------------------------------------------------------------

/**
 * The default size for a tier, from the sizes the workflow allows: the largest one on a 24 GB+ card, the largest
 * 480-class one below that (or the smallest allowed size when the model has no 480-class size, as the 5B). A 480p
 * checkpoint never gets a larger default than 480p.
 */
export function preferredSize(meta: WanMeta, tier: Tier, checkpoint?: Pick<Checkpoint, "nativeHeight">): SizeOption {
  const sizes = sizesLargestFirst(meta);
  const small = sizes.filter(size => minSide(size) <= 480);
  if (checkpoint?.nativeHeight === 480 && small.length) return small[0]!;
  if (tier === "high") return sizes[0]!;
  // No 480-class size (the 5B): the smallest allowed one, landscape before portrait
  const smallest = [...sizes].sort((a, b) => pixels(a) - pixels(b) || b.width - a.width)[0]!;
  return small[0] ?? smallest;
}

export interface Candidate {
  checkpoint: Checkpoint;
  key: BundledKey;
  meta: WanMeta;
}

export interface Choice {
  candidate: Candidate;
  size: SizeOption;
  estimate?: Footprint;
  /** Why this one: shown in logs and wan_status. */
  why: string;
  warnings: string[];
}

/**
 * Picks among checkpoints a bundled workflow can load: under 12 GB the smallest; otherwise the largest whose estimated
 * footprint at the tier's default size fits the usable VRAM. A checkpoint with a rated tier (5B at 720p) fits exactly
 * when the tier is at least that, with no arithmetic involved. When nothing fits, the smallest is used and a warning says so.
 */
export function pickCandidate(candidates: Candidate[], options: { tier: Tier; vramGB?: number; encoderFile?: string }): Choice {
  const { tier, vramGB, encoderFile } = options;
  const sorted = [...candidates].sort((a, b) => (a.checkpoint.footprintGB ?? 0) - (b.checkpoint.footprintGB ?? 0));
  const usable = usableGB(tier, vramGB);

  const evaluate = (candidate: Candidate) => {
    const size = preferredSize(candidate.meta, tier, candidate.checkpoint);
    const estimate = estimateFootprint({ checkpoint: candidate.checkpoint, ...(encoderFile ? { encoderFile } : {}), size, frames: candidate.meta.default_frames });
    const rated = ratedTier(candidate.checkpoint, size);
    const fits = rated ? tierAtLeast(tier, rated) : estimate !== undefined && usable !== undefined && estimate.total <= usable;
    return { candidate, size, ...(estimate ? { estimate } : {}), fits, rated };
  };

  if (tier === "low") {
    const first = evaluate(sorted[0]!);
    return { candidate: first.candidate, size: first.size, ...(first.estimate ? { estimate: first.estimate } : {}), why: "the smallest installed", warnings: [] };
  }
  const evaluated = sorted.map(evaluate);
  const fitting = evaluated.filter(entry => entry.fits);
  const chosen = fitting.at(-1) ?? evaluated[0]!;
  const warnings: string[] = [];
  let why: string;
  if (fitting.length) {
    why = chosen.rated
      ? `the largest installed that fits (rated for a ${TIER_LABEL[chosen.rated].split(" ")[0]} GB-class card)`
      : `the largest installed that fits ${usable} GB of usable VRAM`;
  } else {
    why = `the smallest installed (none fit ${usable ?? "the available"} GB of usable VRAM)`;
    warnings.push(`None of the installed checkpoints is expected to fit in ${usable ?? "the available"} GB; ComfyUI will offload to system RAM and may run out of memory.`);
  }
  return { candidate: chosen.candidate, size: chosen.size, ...(chosen.estimate ? { estimate: chosen.estimate } : {}), why, warnings };
}

export const listSizes = (sizes: SizeOption[]): string => sizes.map(sizeLabel).join(", ");
