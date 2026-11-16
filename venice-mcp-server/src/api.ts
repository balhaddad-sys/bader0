/**
 * Thin HTTP client for the Venice API. Every tool goes through veniceJson or veniceBinary,
 * so authentication, timeouts and error messages live in one place.
 */
import { config, SERVER_NAME, SERVER_VERSION } from "./config.js";

type Query = Record<string, string | number | boolean | undefined>;

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  query?: Query;
  timeoutMs?: number;
}

/** An HTTP error from Venice. Keeps the status and the parsed body so callers can tell a 404 from a 401 or 429, and read fields such as a consent policy. */
export class VeniceApiError extends Error {
  constructor(
    readonly status: number,
    readonly detail?: string,
    readonly body?: unknown
  ) {
    super(httpErrorMessage(status, detail));
    this.name = "VeniceApiError";
  }
}

// Thrown errors reach the model as the tool result's text, so each one says how to recover.
function httpErrorMessage(status: number, detail?: string): string {
  const said = detail ? ` Venice said: ${detail}` : "";
  switch (status) {
    case 400:
      return `Venice rejected the request as invalid.${said} Check the arguments; venice_list_models shows valid model IDs and capabilities.`;
    case 401:
      return `Venice rejected the API key.${said} Check that VENICE_API_KEY is a valid key from https://venice.ai/settings/api.`;
    case 402:
      return `Venice reports insufficient balance for this request.${said} Add credits at https://venice.ai/settings/api, then retry.`;
    case 403:
      return `This API key is not allowed to use that endpoint or model.${said}`;
    case 404:
      return `Venice could not find that resource.${said} Check the model ID or character slug; venice_list_models and venice_list_characters list valid values.`;
    case 413:
      return `The request is too large for Venice.${said} Shorten the input and retry.`;
    case 422:
      return `Venice could not process the request.${said} The model may not support one of the parameters, or the content was refused.`;
    case 429:
      return `Venice rate limit exceeded.${said} Wait a minute before retrying; venice_account_limits shows this key's limits.`;
    default:
      if (status >= 500) return `Venice had a server error (HTTP ${status}).${said} Retry shortly, or try a different model.`;
      return `Venice returned HTTP ${status}.${said}`;
  }
}

/** Pulls a short human-readable message, and the parsed body when it is JSON, out of a Venice error response. */
async function readErrorDetail(response: Response): Promise<{ detail?: string; body?: unknown }> {
  let text: string;
  try {
    text = (await response.text()).slice(0, 100_000);
  } catch {
    return {};
  }
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const error = body.error;
    const candidate =
      (error && typeof error === "object" ? (error as Record<string, unknown>).message : error) ??
      body.message ??
      body.details;
    const detail = typeof candidate === "string" ? candidate.slice(0, 500) : JSON.stringify(candidate ?? body).slice(0, 500);
    return { detail, body };
  } catch {
    const detail = text.trim().slice(0, 500);
    return detail ? { detail } : {};
  }
}

function buildHeaders(accept: string, hasBody: boolean): Record<string, string> {
  if (!config.apiKey) {
    throw new Error(
      "VENICE_API_KEY is not set. Add it to this MCP server's environment (a key from https://venice.ai/settings/api) and restart the server."
    );
  }
  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.apiKey}`,
    Accept: accept,
    "User-Agent": `${SERVER_NAME}/${SERVER_VERSION}`
  };
  if (hasBody) headers["Content-Type"] = "application/json";
  return headers;
}

async function send(path: string, options: RequestOptions, accept: string, signal: AbortSignal): Promise<Response> {
  const url = new URL(`${config.baseUrl}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const hasBody = options.body !== undefined;
  const timeoutMs = options.timeoutMs ?? config.timeoutMs;

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (hasBody ? "POST" : "GET"),
      headers: buildHeaders(accept, hasBody),
      body: hasBody ? JSON.stringify(options.body) : undefined,
      // Aborts when the client cancels the tool call, or when the timeout passes
      signal: AbortSignal.any([signal, AbortSignal.timeout(timeoutMs)]),
      // Never forward the API key to another host
      redirect: "error"
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(
        `Venice did not respond within ${Math.round(timeoutMs / 1000)} seconds. Retry, pick a faster model, or raise VENICE_TIMEOUT_MS.`
      );
    }
    if (signal.aborted) throw error;
    const reason = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error);
    throw new Error(`Could not reach Venice at ${config.baseUrl} (${reason}). Check the network connection and VENICE_BASE_URL.`);
  }

  if (!response.ok) {
    const { detail, body } = await readErrorDetail(response);
    throw new VeniceApiError(response.status, detail, body);
  }
  return response;
}

/**
 * Calls an endpoint whose success response may be JSON or a file (video retrieval) and hands back the unread response,
 * so the caller can look at the content type and stream a file to disk instead of buffering it.
 */
export async function veniceRaw(path: string, options: RequestOptions, signal: AbortSignal): Promise<Response> {
  return send(path, options, "*/*", signal);
}

/** Calls a JSON endpoint and returns the parsed body. Callers validate the shape they rely on. */
export async function veniceJson(path: string, options: RequestOptions, signal: AbortSignal): Promise<unknown> {
  const response = await send(path, options, "application/json", signal);
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`Venice returned a response on /${path} that is not JSON. Retry; if it persists, the endpoint may have changed.`);
  }
}

/** Calls an endpoint that returns binary media (audio). Returns it base64-encoded. */
export async function veniceBinary(
  path: string,
  body: unknown,
  signal: AbortSignal,
  fallbackMimeType: string
): Promise<{ data: string; mimeType: string; bytes: number }> {
  const response = await send(path, { body }, "*/*", signal);
  const buffer = Buffer.from(await response.arrayBuffer());
  const mimeType = response.headers.get("content-type")?.split(";")[0]?.trim() || fallbackMimeType;
  return { data: buffer.toString("base64"), mimeType, bytes: buffer.length };
}
