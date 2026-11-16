/**
 * Thin HTTP client for a local ComfyUI runner, mirroring api.ts: one request helper,
 * timeouts, and error messages that say how to recover. ComfyUI has no authentication,
 * so nothing here sends credentials; the runner must stay on loopback.
 */
import { wanConfig } from "./config.js";

type Query = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: "GET" | "POST";
  json?: unknown;
  form?: FormData;
  query?: Query;
  timeoutMs?: number;
}

const API_TIMEOUT_MS = 15_000;

/** An HTTP error from ComfyUI. Keeps the status so callers can tell a 404 from a validation failure. */
export class ComfyApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "ComfyApiError";
  }
}

/** The runner could not be reached at all. Separate from ComfyApiError so callers can report "not running". */
export class ComfyUnreachableError extends Error {
  constructor(reason: string) {
    super(
      `Could not reach the local Wan runner (ComfyUI) at ${wanConfig.baseUrl} (${reason}). ` +
        "Start ComfyUI with `python main.py --listen 127.0.0.1 --port 8188`, or set WAN_BASE_URL to where it runs."
    );
    this.name = "ComfyUnreachableError";
  }
}

const MODEL_INPUTS = /^(unet|clip|vae|ckpt|clip_vision|lora|model)_name$/;

/** Turns ComfyUI's /prompt validation body into one readable sentence per failing node. */
function describeValidationErrors(body: Record<string, unknown>): string | undefined {
  const nodeErrors = body.node_errors;
  if (!nodeErrors || typeof nodeErrors !== "object") return undefined;
  const parts: string[] = [];
  for (const entry of Object.values(nodeErrors as Record<string, unknown>)) {
    if (!entry || typeof entry !== "object") continue;
    const { class_type, errors } = entry as { class_type?: string; errors?: unknown[] };
    for (const error of errors ?? []) {
      if (!error || typeof error !== "object") continue;
      const { type, message, details, extra_info } = error as {
        type?: string;
        message?: string;
        details?: string;
        extra_info?: { input_name?: string; received_value?: unknown };
      };
      const input = extra_info?.input_name;
      if (type === "value_not_in_list" && input && MODEL_INPUTS.test(input)) {
        parts.push(
          `ComfyUI does not have the model file ${JSON.stringify(extra_info?.received_value ?? "")} for ${class_type}.${input}. ` +
            "Put the file in ComfyUI's models folder, or set WAN_MODEL to an installed checkpoint (wan_status lists them)."
        );
      } else {
        parts.push(`${class_type ?? "node"}: ${message ?? type ?? "invalid"}${details ? ` (${details})` : ""}`);
      }
    }
  }
  return parts.length ? parts.join(" ") : undefined;
}

async function errorFromResponse(response: Response, path: string): Promise<ComfyApiError> {
  let text = "";
  try {
    text = (await response.text()).slice(0, 8_000);
  } catch {
    // Body unreadable; the status alone has to do
  }
  let detail: string | undefined;
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    const nodes = describeValidationErrors(body);
    const error = body.error;
    const top =
      error && typeof error === "object" ? (error as Record<string, unknown>).message : typeof error === "string" ? error : undefined;
    detail = [typeof top === "string" ? top : undefined, nodes].filter(Boolean).join(" ");
  } catch {
    detail = text.trim().slice(0, 500);
  }
  const said = detail ? ` ${detail}` : "";
  switch (response.status) {
    case 400:
      return new ComfyApiError(400, `ComfyUI rejected the workflow.${said}`);
    case 404:
      return new ComfyApiError(404, `ComfyUI has no endpoint or file at /${path}.${said} Check that WAN_BASE_URL points at ComfyUI itself.`);
    default:
      if (response.status >= 500) {
        return new ComfyApiError(response.status, `ComfyUI had a server error (HTTP ${response.status}).${said} Check the ComfyUI console.`);
      }
      return new ComfyApiError(response.status, `ComfyUI returned HTTP ${response.status}.${said}`);
  }
}

async function send(path: string, options: RequestOptions, signal?: AbortSignal): Promise<Response> {
  const url = new URL(`${wanConfig.baseUrl}/${path.replace(/^\/+/, "")}`);
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const timeoutMs = options.timeoutMs ?? API_TIMEOUT_MS;
  const signals = [AbortSignal.timeout(timeoutMs), ...(signal ? [signal] : [])];

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method ?? (options.json !== undefined || options.form ? "POST" : "GET"),
      headers: options.json !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: options.form ?? (options.json !== undefined ? JSON.stringify(options.json) : undefined),
      signal: AbortSignal.any(signals),
      redirect: "error"
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error(`ComfyUI at ${wanConfig.baseUrl} did not answer /${path} within ${Math.round(timeoutMs / 1000)} seconds. It may be busy loading a model; retry shortly.`);
    }
    if (signal?.aborted) throw error;
    const reason = error instanceof Error ? (error.cause instanceof Error ? error.cause.message : error.message) : String(error);
    throw new ComfyUnreachableError(reason);
  }
  if (!response.ok) throw await errorFromResponse(response, path);
  return response;
}

export async function comfyJson(path: string, options: RequestOptions = {}, signal?: AbortSignal): Promise<unknown> {
  const response = await send(path, options, signal);
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(`ComfyUI returned a response on /${path} that is not JSON. Check that WAN_BASE_URL points at ComfyUI.`);
  }
}

export async function comfyBytes(path: string, query: Query, timeoutMs: number, signal?: AbortSignal): Promise<Buffer> {
  const response = await send(path, { query, timeoutMs }, signal);
  return Buffer.from(await response.arrayBuffer());
}
