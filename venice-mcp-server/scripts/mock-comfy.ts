/**
 * A local stand-in for ComfyUI, used by the smoke test to exercise wan_video / wan_status / wan_cancel without a GPU.
 * It runs one job at a time from a FIFO queue like ComfyUI does, reports progress on /ws, validates the model files a
 * workflow names the way ComfyUI does (so a GGUF sent through UNETLoader is rejected), and records every request.
 *
 * The positive prompt steers each job:
 *   FAIL_RENDER  always out of memory (what this keyword has always meant), so it also exercises the retry
 *   BOOM         fails with a generic error that is not about memory
 *   OOM_BIG      out of memory when the latent is over 500k pixels
 *   OOM_LONG     out of memory when the latent has more than 100 frames
 *   OOM_ALWAYS   always out of memory
 *   HANG         renders until interrupted
 *   LOST_FILE    succeeds but its output cannot be fetched
 *   UNSAFE_NAME  succeeds but names its output "../evil.mp4"
 *   anything else succeeds after renderMs.
 * Interrupts settle 300 ms later, as a real sampler finishes its step.
 */
import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo, Socket } from "node:net";

export const FAKE_MP4 = Buffer.from("\x00\x00\x00\x18ftypmp42-fake-wan-clip", "latin1");

export interface MockComfyOptions {
  vramGB?: number;
  gpuName?: string;
  checkpoints?: string[];
  /** .gguf files; only listed (and loadable) when ggufInstalled is true. */
  ggufFiles?: string[];
  ggufInstalled?: boolean;
  clipFiles?: string[];
  vaeFiles?: string[];
  renderMs?: number;
}

export interface ComfyRequest {
  method: string;
  path: string;
  query: Record<string, string>;
  body: any;
  contentType?: string;
}

type Workflow = Record<string, { class_type: string; inputs: Record<string, any> }>;

interface Job {
  id: string;
  number: number;
  workflow: Workflow;
  clientId: string;
  behavior: "ok" | "fail" | "hang" | "lost" | "unsafe" | "oom_big" | "oom_long" | "oom_always";
  timer?: NodeJS.Timeout;
  history?: Record<string, unknown>;
}

const DEFAULT_CHECKPOINTS = [
  "wan2.1_t2v_1.3B_fp16.safetensors",
  "wan2.1_t2v_14B_fp8_e4m3fn.safetensors",
  "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors",
  "wan2.2_ti2v_5B_fp16.safetensors"
];

/** One unmasked server-to-client websocket text frame. */
function wsFrame(text: string): Buffer {
  const payload = Buffer.from(text);
  const header =
    payload.length < 126
      ? Buffer.from([0x81, payload.length])
      : Buffer.concat([Buffer.from([0x81, 126]), Buffer.from([(payload.length >> 8) & 0xff, payload.length & 0xff])]);
  return Buffer.concat([header, payload]);
}

function json(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function readRaw(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

/** The node that carries the latent size and length, whatever the workflow calls it. */
function latentOf(workflow: Workflow): { width: number; height: number; length: number } {
  for (const node of Object.values(workflow)) {
    if (/LatentVideo$|ImageToVideo/.test(node.class_type) && "length" in node.inputs) {
      return { width: node.inputs.width, height: node.inputs.height, length: node.inputs.length };
    }
  }
  return { width: 0, height: 0, length: 0 };
}

export async function startMockComfy(options: MockComfyOptions = {}) {
  const settings = {
    vramGB: options.vramGB ?? 24,
    gpuName: options.gpuName ?? "NVIDIA GeForce RTX 4090",
    checkpoints: options.checkpoints ?? DEFAULT_CHECKPOINTS,
    ggufFiles: options.ggufFiles ?? [],
    ggufInstalled: options.ggufInstalled ?? false,
    clipFiles: options.clipFiles ?? ["umt5_xxl_fp16.safetensors"],
    vaeFiles: options.vaeFiles ?? ["wan2.2_vae.safetensors", "wan_2.1_vae.safetensors"],
    renderMs: options.renderMs ?? 600
  };
  const steps = 4;
  const requests: ComfyRequest[] = [];
  const jobs = new Map<string, Job>();
  const pending: string[] = [];
  let running: string | undefined;
  let counter = 0;
  const sockets = new Map<string, Socket>();
  const outputs = new Map<string, Buffer>();

  const send = (clientId: string, message: unknown) => {
    const socket = sockets.get(clientId);
    if (socket && !socket.destroyed) socket.write(wsFrame(JSON.stringify(message)));
  };

  const settle = (job: Job, status: "success" | "error", messages: unknown[], jobOutputs: Record<string, unknown> = {}) => {
    clearTimeout(job.timer);
    job.history = {
      prompt: [job.number, job.id, job.workflow, { client_id: job.clientId }, []],
      outputs: jobOutputs,
      status: { status_str: status, completed: status === "success", messages },
      meta: {}
    };
    if (running === job.id) running = undefined;
    startNext();
  };

  const oom = (id: string, start: unknown[]) => [
    start,
    [
      "execution_error",
      {
        prompt_id: id,
        node_id: "8",
        node_type: "KSampler",
        exception_message: "CUDA out of memory. Tried to allocate 2.00 GiB",
        exception_type: "torch.OutOfMemoryError",
        traceback: []
      }
    ]
  ];

  const startNext = () => {
    if (running) return;
    const id = pending.shift();
    if (!id) return;
    const job = jobs.get(id)!;
    running = id;
    const start = ["execution_start", { prompt_id: id, timestamp: Date.now() }];
    send(job.clientId, { type: "execution_start", data: { prompt_id: id } });
    if (job.behavior === "hang") return;

    const latent = latentOf(job.workflow);
    const outOfMemory =
      job.behavior === "oom_always" ||
      (job.behavior === "oom_big" && latent.width * latent.height > 500_000) ||
      (job.behavior === "oom_long" && latent.length > 100);

    let step = 0;
    const tick = () => {
      step++;
      send(job.clientId, { type: "progress", data: { value: step, max: steps, prompt_id: id, node: "8" } });
      if (step < steps) {
        job.timer = setTimeout(tick, settings.renderMs / steps);
        return;
      }
      if (outOfMemory) {
        settle(job, "error", oom(id, start));
        return;
      }
      if (job.behavior === "fail") {
        settle(job, "error", [
          start,
          ["execution_error", { prompt_id: id, node_id: "8", node_type: "KSampler", exception_message: "Sampler exploded", exception_type: "RuntimeError", traceback: [] }]
        ]);
        return;
      }
      const filename = job.behavior === "unsafe" ? "../evil.mp4" : `wan_${String(job.number).padStart(5, "0")}_.mp4`;
      if (job.behavior !== "lost" && job.behavior !== "unsafe") outputs.set(filename, FAKE_MP4);
      settle(job, "success", [start, ["execution_success", { prompt_id: id }]], {
        "save-node": { images: [{ filename, subfolder: "venice-mcp", type: "output" }], animated: [true] }
      });
    };
    job.timer = setTimeout(tick, settings.renderMs / steps);
  };

  const comboNode = (cls: string, input: string, files: string[], extra: Record<string, unknown> = {}) => ({
    [cls]: { input: { required: { [input]: [files], ...extra } } }
  });

  const objectInfo = (): Record<string, unknown> => ({
    UNETLoader: comboNode("UNETLoader", "unet_name", settings.checkpoints, { weight_dtype: [["default", "fp8_e4m3fn"]] }),
    UnetLoaderGGUF: settings.ggufInstalled ? comboNode("UnetLoaderGGUF", "unet_name", settings.ggufFiles) : {},
    CLIPLoader: comboNode("CLIPLoader", "clip_name", settings.clipFiles, { type: [["wan", "sd3"]] }),
    VAELoader: comboNode("VAELoader", "vae_name", settings.vaeFiles),
    CLIPVisionLoader: comboNode("CLIPVisionLoader", "clip_name", ["clip_vision_h.safetensors"]),
    // The newer COMBO format, so both parsers are exercised
    KSampler: { KSampler: { input: { required: { sampler_name: ["COMBO", { options: ["euler", "uni_pc", "dpmpp_2m"] }] } } } },
    LoadImage: comboNode("LoadImage", "image", ["existing.png"])
  });

  /** ComfyUI's own /prompt validation: the node classes must exist and the model files must be installed. */
  const validate = (workflow: Workflow): { status: number; body: unknown } | undefined => {
    for (const [nodeId, node] of Object.entries(workflow ?? {})) {
      if (node.class_type === "UnetLoaderGGUF" && !settings.ggufInstalled) {
        return {
          status: 400,
          body: { error: { type: "invalid_prompt", message: "Cannot execute because node UnetLoaderGGUF does not exist.", details: `Node ID '#${nodeId}'` }, node_errors: {} }
        };
      }
      const list =
        node.class_type === "UNETLoader" ? settings.checkpoints : node.class_type === "UnetLoaderGGUF" ? settings.ggufFiles : undefined;
      if (list && !list.includes(node.inputs.unet_name)) {
        return {
          status: 400,
          body: {
            error: { type: "prompt_outputs_failed_validation", message: "Prompt outputs failed validation", details: "" },
            node_errors: {
              [nodeId]: {
                class_type: node.class_type,
                errors: [{ type: "value_not_in_list", message: "Value not in list", details: "", extra_info: { input_name: "unet_name", received_value: node.inputs.unet_name } }]
              }
            }
          }
        };
      }
    }
    return undefined;
  };

  const server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const raw = await readRaw(req);
    const contentType = req.headers["content-type"];
    let body: any;
    if (raw.length && contentType?.includes("application/json")) body = JSON.parse(raw.toString("utf8"));
    else if (raw.length) body = raw;
    requests.push({ method: req.method ?? "GET", path: url.pathname, query: Object.fromEntries(url.searchParams), body, ...(contentType ? { contentType } : {}) });

    const path = url.pathname;
    if (req.method === "GET" && path === "/system_stats") {
      return json(res, 200, {
        system: { os: "posix", comfyui_version: "0.3.60" },
        devices: [
          {
            name: `cuda:0 ${settings.gpuName} : cudaMallocAsync`,
            type: "cuda",
            index: 0,
            vram_total: settings.vramGB * 1024 ** 3,
            vram_free: settings.vramGB * 1024 ** 3
          }
        ]
      });
    }
    if (req.method === "GET" && path.startsWith("/object_info/")) return json(res, 200, objectInfo()[path.slice(13)] ?? {});
    if (req.method === "POST" && path === "/upload/image") {
      if (!contentType?.startsWith("multipart/form-data")) return json(res, 400, { error: "expected multipart" });
      return json(res, 200, { name: "start.png", subfolder: "", type: "input" });
    }
    if (req.method === "POST" && path === "/prompt") {
      const workflow = body?.prompt as Workflow;
      const invalid = validate(workflow);
      if (invalid) return json(res, invalid.status, invalid.body);
      const text = JSON.stringify(workflow);
      const id = randomUUID();
      const behavior: Job["behavior"] = text.includes("BOOM")
        ? "fail"
        : text.includes("FAIL_RENDER") || text.includes("OOM_ALWAYS")
          ? "oom_always"
          : text.includes("OOM_BIG")
            ? "oom_big"
            : text.includes("OOM_LONG")
              ? "oom_long"
              : text.includes("HANG")
                ? "hang"
                : text.includes("LOST_FILE")
                  ? "lost"
                  : text.includes("UNSAFE_NAME")
                    ? "unsafe"
                    : "ok";
      const job: Job = { id, number: ++counter, workflow, clientId: body.client_id, behavior };
      jobs.set(id, job);
      pending.push(id);
      startNext();
      return json(res, 200, { prompt_id: id, number: job.number, node_errors: {} });
    }
    if (req.method === "GET" && path.startsWith("/history/")) {
      const job = jobs.get(decodeURIComponent(path.slice(9)));
      return json(res, 200, job?.history ? { [job.id]: job.history } : {});
    }
    if (req.method === "GET" && path === "/queue") {
      const row = (id: string) => [jobs.get(id)!.number, id, {}, {}, []];
      return json(res, 200, { queue_running: running ? [row(running)] : [], queue_pending: pending.map(row) });
    }
    if (req.method === "POST" && path === "/queue") {
      for (const id of body?.delete ?? []) {
        const index = pending.indexOf(id);
        if (index >= 0) pending.splice(index, 1);
      }
      return json(res, 200, {});
    }
    if (req.method === "POST" && path === "/interrupt") {
      const target = body?.prompt_id ?? running;
      if (target && target === running) {
        // The job stays in queue_running until the current step ends
        const job = jobs.get(target)!;
        job.timer = setTimeout(() => settle(job, "error", [["execution_interrupted", { prompt_id: target, node_id: "8", node_type: "KSampler" }]]), 300);
      }
      return json(res, 200, {});
    }
    if (req.method === "GET" && path === "/view") {
      const file = outputs.get(url.searchParams.get("filename") ?? "");
      if (!file || url.searchParams.get("type") !== "output") return json(res, 404, { error: "not found" });
      res.writeHead(200, { "Content-Type": "video/mp4" });
      return res.end(file);
    }
    return json(res, 404, { error: `No mock for ${req.method} ${path}` });
  });

  // Minimal websocket endpoint: handshake, then server-to-client text frames only
  server.on("upgrade", (req, socket: Socket) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    const key = req.headers["sec-websocket-key"];
    if (url.pathname !== "/ws" || typeof key !== "string") return socket.destroy();
    const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const clientId = url.searchParams.get("clientId") ?? "";
    sockets.set(clientId, socket);
    socket.on("data", chunk => {
      // Opcode 8: the client is closing
      if ((chunk[0]! & 0x0f) === 0x8) socket.end(Buffer.from([0x88, 0]));
    });
    socket.on("error", () => undefined);
    socket.on("close", () => sockets.delete(clientId));
    socket.write(wsFrame(JSON.stringify({ type: "status", data: { status: { exec_info: { queue_remaining: pending.length } }, sid: clientId } })));
  });

  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    requests,
    state: () => ({ running, pending: [...pending] }),
    /** Change the reported VRAM, as if ComfyUI had been restarted on a different card. */
    setVram: (gb: number, gpuName?: string) => {
      settings.vramGB = gb;
      if (gpuName) settings.gpuName = gpuName;
    },
    /** Every workflow ComfyUI accepted, oldest first, with the prompt ID it was given. */
    submissions: () =>
      requests
        .filter(r => r.method === "POST" && r.path === "/prompt")
        .map(r => r.body?.prompt as Workflow)
        .filter(workflow => workflow && !validate(workflow)),
    /** The last workflow ComfyUI accepted. */
    lastWorkflow: () => [...requests].reverse().find(r => r.method === "POST" && r.path === "/prompt")?.body?.prompt as Workflow,
    close: async () => {
      for (const job of jobs.values()) clearTimeout(job.timer);
      for (const socket of sockets.values()) socket.destroy();
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  };
}
