/**
 * Configuration read once from the environment at startup.
 */

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
