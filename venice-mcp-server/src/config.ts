/**
 * Configuration read once from the environment at startup.
 */
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const SERVER_NAME = "venice-mcp-server";
export const SERVER_VERSION = "1.0.0";

/** Cap on the text a tool returns; list tools return fewer items to stay under it. */
export const CHARACTER_LIMIT = 25_000;

/** Treats blanks and unfilled placeholders such as `${VENICE_API_KEY}` or `<your-key>` as unset. */
function readSecret(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  if (/^\$\{.*\}$/.test(value) || /^<.*>$/.test(value)) return undefined;
  return value;
}

function readString(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  return value ? value : undefined;
}

function readPositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function readPositiveNumber(raw: string | undefined, fallback: number): number {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Zero is a valid setting here (it switches the feature off), so only blanks and junk fall back. */
function readNonNegativeNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

/** True for localhost, 127.0.0.0/8 and ::1. ComfyUI has no auth, so anything else is reachable by others. */
export function isLoopbackUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "::1" || /^127(\.\d{1,3}){3}$/.test(host);
  } catch {
    return false;
  }
}

export const config = {
  apiKey: readSecret(process.env.VENICE_API_KEY),
  baseUrl: (readString(process.env.VENICE_BASE_URL) ?? "https://api.venice.ai/api/v1").replace(/\/+$/, ""),
  /** Model overrides. Unset ones are chosen from the live catalog by Venice's model traits. */
  chatModel: readString(process.env.VENICE_CHAT_MODEL),
  agentModel: readString(process.env.VENICE_AGENT_MODEL),
  imageModel: readString(process.env.VENICE_IMAGE_MODEL),
  ttsModel: readString(process.env.VENICE_TTS_MODEL) ?? "tts-kokoro",
  ttsVoice: readString(process.env.VENICE_TTS_VOICE) ?? "af_sky",
  embeddingModel: readString(process.env.VENICE_EMBEDDING_MODEL) ?? "text-embedding-bge-m3",
  timeoutMs: readPositiveInt(process.env.VENICE_TIMEOUT_MS, 120_000)
};

/** Local Wan video generation through a ComfyUI runner. Never touches Venice. */
export const wanConfig = {
  baseUrl: (readString(process.env.WAN_BASE_URL) ?? "http://127.0.0.1:8188").replace(/\/+$/, ""),
  outputDir: resolve(readString(process.env.WAN_OUTPUT_DIR) ?? join(tmpdir(), "venice-mcp-wan")),
  /** Diffusion model file to load instead of the one chosen from VRAM, e.g. wan2.1_t2v_14B_fp8_e4m3fn.safetensors */
  model: readString(process.env.WAN_MODEL),
  /** Seconds a render may take before its job is reported as timed out. */
  timeoutSeconds: readPositiveNumber(process.env.WAN_TIMEOUT, 1_800),
  /** Optional API-format workflows exported from ComfyUI, replacing the bundled Wan 2.1 ones. */
  workflowT2V: readString(process.env.WAN_WORKFLOW_T2V),
  workflowI2V: readString(process.env.WAN_WORKFLOW_I2V),
  pollIntervalMs: readPositiveInt(process.env.WAN_POLL_INTERVAL_MS, 2_000),
  /** Finished clips older than this are deleted on startup. 0 keeps them forever. Hosted clips share the directory. */
  retainHours: readNonNegativeNumber(process.env.WAN_RETAIN_HOURS, 48)
};

/** The phone-friendly web app (npm run web). It can spend Venice credits and use the GPU, so it always needs a token. */
export const webConfig = {
  /** All interfaces by default so a phone on the same network can reach it; set 127.0.0.1 to keep it local or behind a proxy. */
  host: readString(process.env.WEB_HOST) ?? "0.0.0.0",
  port: readPositiveInt(process.env.WEB_PORT, 8787),
  /** Unset: a random token is generated once and kept in tokenFile, so a phone bookmark survives restarts. */
  token: readSecret(process.env.WEB_TOKEN),
  tokenFile: resolve(readString(process.env.WEB_TOKEN_FILE) ?? join(homedir(), ".venice-mcp", "web-token"))
};

/** Hosted Venice video (the venice_video tool). Billed to the Venice account. */
export const videoConfig = {
  /** Only catalog models whose ID starts with this are offered; the IDs themselves are read from the live catalog. */
  modelPrefix: (readString(process.env.VENICE_VIDEO_MODEL_PREFIX) ?? "wan-3-0").toLowerCase(),
  timeoutSeconds: readPositiveNumber(process.env.VENICE_VIDEO_TIMEOUT, 1_800),
  pollIntervalMs: readPositiveInt(process.env.VENICE_VIDEO_POLL_INTERVAL_MS, 5_000)
};
