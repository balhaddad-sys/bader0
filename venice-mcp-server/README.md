# venice-mcp-server

An MCP server that gives Claude and other MCP clients a **Venice.ai agent**, direct access to Venice's private AI APIs, and **free local video generation** with Wan through ComfyUI.

The main tool is `venice_agent`. You give it a task, and it runs an autonomous loop on a Venice model that supports function calling. Each round, the model searches the web, reads pages, and (if you allow it) generates images or queues local video clips. It then returns a cited answer with a trace of what it did. The other `venice_*` tools wrap single Venice endpoints. The `wan_*` tools render video on your own GPU and never contact Venice.

## Tools

| Tool | What it does |
|---|---|
| `venice_agent` | Runs an autonomous research or task agent: web search, page reading, optional images and local video clips, then a cited answer, a trace, and token usage |
| `venice_chat` | Sends one prompt (with optional history) to a Venice model. Supports Venice web search and citations, characters, and turning reasoning off |
| `venice_web_search` | Runs a raw web search (Brave, Google or Exa via Venice) |
| `venice_web_scrape` | Returns a page as markdown, paged in 25k-character chunks and cached for 10 minutes |
| `venice_generate_image` | Generates 1–4 images; returns them as MCP image content |
| `venice_image_styles` | Lists the style presets for image generation |
| `venice_text_to_speech` | Converts text to speech; returns MCP audio content |
| `venice_embeddings` | Computes embedding vectors for up to 16 texts |
| `venice_list_models` | Lists the model catalog with traits and capabilities; filters by type, name or capability |
| `venice_list_characters` | Searches public Venice characters, whose slugs work with `venice_chat` and `venice_agent` |
| `venice_account_limits` | Shows balances (USD, DIEM), tier, and per-model rate limits |
| `wan_video` | Queues a text-to-video or image-to-video clip on local Wan and returns `{ job_id, status: "queued" }` at once |
| `wan_status` | Shows a job's queue position, render progress, and the saved file path and resource link once it is done. With no `job_id`, shows the GPU, the defaults chosen from VRAM, and the installed checkpoints |
| `wan_cancel` | Removes a waiting job from ComfyUI's queue, or interrupts one that is rendering |

Every tool accepts `response_format: "json"` for structured output, except the image and speech tools, which return media.

### Local vs hosted: what costs Venice credits

| Tool | Runs on | Cost |
|---|---|---|
| `venice_agent` | Venice | Venice credits: each round is one model call plus its searches, scrapes and images. Video clips it queues locally are free |
| `venice_chat`, `venice_generate_image`, `venice_text_to_speech`, `venice_embeddings` | Venice | Venice credits, per call |
| `venice_web_search`, `venice_web_scrape` | Venice | Venice credits, per call |
| `venice_list_models`, `venice_list_characters`, `venice_image_styles`, `venice_account_limits` | Venice | No generation charge (catalog and account reads); needs `VENICE_API_KEY` |
| `wan_video`, `wan_status`, `wan_cancel` | Your GPU, through local ComfyUI | **Free.** Prompts, images and videos stay on your machine and never reach Venice |

Venice also hosts Wan video models (for example `wan-3-0`), which generate native audio along with the picture. Local Wan (2.1 / 2.2) produces **silent** clips. This server does not wrap Venice's hosted video endpoints; use the Venice API or the official `@veniceai/mcp-server` (`venice_video_generate`) for those.

### How the agent works

```
task ─▶ Venice model (function calling) ──tool calls──▶ web_search / scrape_url / generate_image / wan_video
             ▲                                                    │
             └────────────── tool results (untrusted) ◀───────────┘
        repeats up to max_steps rounds, then answers ─▶ answer + sources + trace + images + video job IDs
```

- **Model:** by default the agent uses the model Venice tags `function_calling_default` in its live catalog. Set `model` or `VENICE_AGENT_MODEL` to override it.
- **Round limit:** `max_steps` (default 6, max 15) caps the rounds of tool calls. If the model is still calling tools when the limit is reached, it is told to answer from what it has gathered, and the result reports `stopped_reason: "step_limit"`.
- **Parallel calls:** independent calls in a round run in parallel, up to 6 per round.
- **Error recovery:** a failed tool call or malformed arguments go back to the model as an error message, so it can adjust instead of aborting the run.
- **Untrusted pages:** web content is marked as untrusted data in the agent's instructions.
- **Progress:** the server sends progress notifications each round when the client asks for them.
- **Thinking blocks:** reasoning models' `<think>` blocks are removed from the answer.
- **Local video (`enable_local_video: true`, off by default):** gives the agent `wan_video` and `wan_status`.
  - Clips render in the background, so the agent gets job IDs, not videos, and the answer lists them under "Local video jobs" for you to poll with `wan_status`.
  - The agent may queue at most 2 clips per round and 4 per run.
  - It cannot pass `start_image`, so instructions planted in a web page can't make it upload files from your disk.

## Local Wan video

`wan_video` sends a ComfyUI workflow to a ComfyUI server on your machine and returns at once. The server then polls ComfyUI in the background:

1. It polls `GET /history/{id}`, and also `/queue` to report queue position.
2. It reads progress from ComfyUI's websocket.
3. When the render is done, it downloads the clip with `GET /view` into `WAN_OUTPUT_DIR` as `<job_id>-<file>.mp4`.

`wan_status` returns the absolute path and an MCP `resource_link`. The video itself is never base64-encoded over stdio.

### Setup

1. **Run ComfyUI** on the default `127.0.0.1:8188`. The bundled workflows use ComfyUI's core `CreateVideo` and `SaveVideo` nodes, which need a 2025 or newer ComfyUI.
2. **Install the model files** in ComfyUI's `models/` folders. This server never downloads them:
   - `diffusion_models/`: a Wan 2.1 checkpoint, such as `wan2.1_t2v_1.3B_fp16.safetensors`, `wan2.1_t2v_14B_fp8_e4m3fn.safetensors`, or `wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors` for image-to-video. GGUF files work with the ComfyUI-GGUF custom nodes.
   - `text_encoders/`: `umt5_xxl_fp8_e4m3fn_scaled.safetensors`. The fp16 variant is picked up automatically.
   - `vae/`: `wan_2.1_vae.safetensors`.
   - `clip_vision/`: `clip_vision_h.safetensors`, for image-to-video.
3. **Check what was detected** by calling `wan_status` with no `job_id`. It shows the GPU, VRAM, and the resolution and checkpoint the server will use, with the reason for each choice.

### VRAM and defaults

The server reads VRAM from ComfyUI's `/system_stats`. It uses that to choose the default size and, for the bundled workflows, the checkpoint. The first time it makes the choice, it writes the decision to stderr:

| VRAM | Default size | Checkpoint (bundled workflow) | Typical fit |
|---|---|---|---|
| under 12 GB | 832×480 | the smallest installed | Wan 2.1 1.3B (~2.6 GB fp16) |
| 12–23 GB | 832×480 (720p allowed) | the largest that fits in 75% of VRAM | 14B GGUF Q4 (~8 GB) |
| 24 GB+ | 1280×720 | the largest that fits in 75% of VRAM | 14B fp8 (~14 GB). fp16 (~28 GB) needs about 40 GB |

- **Weights only:** the sizes above count the diffusion model's weights. The text encoder (~6.7 GB at fp8), the VAE and activations come on top, and ComfyUI offloads them as needed.
- **480p checkpoints:** the 1.3B and `*_480p_*` checkpoints keep the default at 832×480 even on large GPUs.
- **Warnings:** when you ask for more than your VRAM tier comfortably handles, the result carries a warning.
- **Overrides:** `WAN_MODEL` forces a specific checkpoint.

### Inputs

- **`prompt`** (required) and **`negative_prompt`**. A standard Wan quality negative prompt is used by default.
- **`width` / `height`:** multiples of 16. If you give only one, the other follows the default aspect ratio.
- **`frames` or `duration`, not both.** Wan renders at 16 fps by default, so the default 81 frames is about 5 s. `duration` is converted to frames at the workflow's fps. Frame counts snap to 4k+1 (5–241).
- **`seed`:** random when omitted. It is always returned and logged, so a run can be reproduced.
- **`start_image`** turns on image-to-video. It accepts:
  - a local file path or `file://` URL (png/jpg/webp/bmp, up to 20 MB), which is uploaded through `/upload/image`;
  - a `data:image/...;base64` URI;
  - or a media ID: the name of an image already in ComfyUI's input folder, which is used in place.
- **`steps`, `cfg`, `sampler`:** the bundled defaults are 30 steps, cfg 6 and `uni_pc`. Sampler names are checked against what ComfyUI offers.

### Your own workflows (Wan 2.2, 5B TI2V, LoRAs…)

The bundled workflows are Wan 2.1 single-model graphs. For anything else, build the workflow in ComfyUI, choose **Export (API)**, and point `WAN_WORKFLOW_T2V` and/or `WAN_WORKFLOW_I2V` at the file.

The tool never relies on node IDs. It finds nodes by `class_type`:

| What it sets | Where it goes |
|---|---|
| Prompts | The `CLIPTextEncode` nodes, traced upstream from the sampler's positive and negative inputs |
| Width, height and length | The latent node: any `*LatentVideo`, `WanImageToVideo` or `Wan22ImageToVideoLatent` |
| Seed, cfg and sampler | `KSampler`, `KSamplerAdvanced`, `RandomNoise`, `CFGGuider` |
| Start image | `LoadImage` |
| Frame rate (read, not set) | `CreateVideo` or VHS Video Combine. This is what keeps `duration` right for 24 fps models such as the 5B TI2V |

A re-exported workflow with renumbered nodes keeps working.

A custom workflow keeps its own model files unless `WAN_MODEL` is set. In workflows with two samplers (Wan 2.2 high/low noise), `steps` is ignored, because each sampler has its own step split.

### Jobs, timeouts and cancelling

- **Job IDs** are ComfyUI prompt IDs, so `wan_status` still works after this server restarts, as long as ComfyUI keeps its history.
- **Timeouts:** a job still unfinished after `WAN_TIMEOUT` seconds is reported as `timed_out`. That doesn't stop the render. `wan_status` keeps checking, and `wan_cancel` stops it.
- **Cancelling:** `wan_cancel` removes a waiting job with `POST /queue {delete}` and interrupts a running one with `POST /interrupt`. On its own, `/interrupt` only stops whatever is currently rendering.
- **Render errors** (for example CUDA out of memory) come back as `failed`, with the node that failed and a suggestion for recovering.

### Keep ComfyUI on loopback

ComfyUI has **no authentication**. Anyone who can reach it can queue jobs, upload files and download outputs.

- Keep `WAN_BASE_URL` on `127.0.0.1`. That is ComfyUI's default when it runs without `--listen`.
- If ComfyUI must run on another machine, put it behind a reverse proxy that requires authentication.
- The server prints a warning at startup when `WAN_BASE_URL` is not a loopback address.
- In HTTP mode, `start_image` paths are read from the server's disk: images only, 20 MB at most.

## Setup

Requires Node.js 20.3+ and a Venice API key from <https://venice.ai/settings/api>. The `wan_*` tools also work without a Venice key.

```bash
cd venice-mcp-server
npm install
npm run build
```

### Claude Code

```bash
claude mcp add venice -e VENICE_API_KEY=your-key -- node /absolute/path/to/venice-mcp-server/dist/index.js
```

### Claude Desktop, Cursor, and other JSON-configured clients

```json
{
  "mcpServers": {
    "venice": {
      "command": "node",
      "args": ["/absolute/path/to/venice-mcp-server/dist/index.js"],
      "env": { "VENICE_API_KEY": "your-key" }
    }
  }
}
```

### Remote (Streamable HTTP)

```bash
TRANSPORT=http PORT=3000 VENICE_API_KEY=your-key npm start
# -> http://127.0.0.1:3000/mcp (health check at /healthz)
```

To expose it beyond localhost, set `HOST=0.0.0.0`, `ALLOWED_HOSTS=your.domain`, and `MCP_AUTH_TOKEN`. The server refuses to bind to a non-local host without a token, because anyone who can reach it could spend your Venice credits or use your GPU. Clients then send `Authorization: Bearer <MCP_AUTH_TOKEN>`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VENICE_API_KEY` | (required for `venice_*`) | Venice API key |
| `VENICE_AGENT_MODEL` | catalog trait `function_calling_default` | Model for `venice_agent` |
| `VENICE_CHAT_MODEL` | catalog trait `default` | Model for `venice_chat` |
| `VENICE_IMAGE_MODEL` | catalog trait `default` (image) | Model for image generation |
| `VENICE_TTS_MODEL` / `VENICE_TTS_VOICE` | `tts-kokoro` / `af_sky` | Speech defaults |
| `VENICE_EMBEDDING_MODEL` | `text-embedding-bge-m3` | Embedding default |
| `VENICE_TIMEOUT_MS` | `120000` | Per-request upstream timeout |
| `VENICE_BASE_URL` | `https://api.venice.ai/api/v1` | API base URL (the smoke test points this at a mock) |
| `WAN_BASE_URL` | `http://127.0.0.1:8188` | ComfyUI address. **Keep it on loopback** |
| `WAN_OUTPUT_DIR` | `<system temp>/venice-mcp-wan` | Where finished clips are saved |
| `WAN_MODEL` | chosen from VRAM | Diffusion model file to load instead, e.g. `wan2.1_t2v_14B_fp8_e4m3fn.safetensors` |
| `WAN_TIMEOUT` | `1800` | Seconds before an unfinished job is reported as `timed_out` |
| `WAN_WORKFLOW_T2V` / `WAN_WORKFLOW_I2V` | bundled Wan 2.1 | API-format workflow files exported from ComfyUI |
| `WAN_POLL_INTERVAL_MS` | `2000` | How often the background poller checks ComfyUI |
| `TRANSPORT`, `PORT`, `HOST`, `MCP_AUTH_TOKEN`, `ALLOWED_HOSTS` | stdio | HTTP serving (see above) |

## Example prompts for Claude

- "Use venice_agent to compare the context windows and licenses of the three newest open-weight models, as a table."
- "Ask venice_chat with web_search on what changed in the EU AI Act this month."
- "Have the Venice agent design a minimalist fox logo and generate it." (sets `allow_image_generation`)
- "Render a 5-second clip of a paper boat drifting down a rain gutter with wan_video, then check on it." (free, local)
- "Have the Venice agent storyboard a three-shot teaser and render the shots locally." (sets `enable_local_video`)

## Development

```bash
npm run build     # compile TypeScript to dist/
npm run smoke     # end-to-end self-check against local mocks of the Venice API and ComfyUI
npx @modelcontextprotocol/inspector node dist/index.js   # interactive testing
```

The smoke test (`scripts/smoke.ts`) drives every tool through a real MCP client over stdio. It needs no key, no GPU and no network access, and runs 35 checks.

- **Mock Venice API** (`scripts/mock-venice.ts`) covers the full agent loop and error handling.
- **Mock ComfyUI** (`scripts/mock-comfy.ts`) implements queue, history, view, upload, interrupt, and progress over a websocket. The Wan checks against it cover:
  - the happy path: queue, then progress, then download and resource link;
  - render errors and lost outputs;
  - `WAN_TIMEOUT`;
  - cancelling a waiting job and a running one, including the moment after an interrupt when ComfyUI still lists the job as running;
  - missing checkpoints and an unreachable runner;
  - image-to-video and re-exported workflows with renumbered nodes;
  - the agent's two-clips-per-round cap;
  - the loopback warning at startup.
- **HTTP transport:** also checked, with bearer auth.

### Layout

```
src/
  index.ts         server factory, stdio/HTTP transports, bearer auth, loopback warning
  config.ts        environment configuration (Venice and Wan)
  api.ts           Venice HTTP client: auth, timeouts, actionable errors
  venice.ts        chat, model catalog and trait resolution, search, scrape, images
  agent.ts         the tool-calling agent loop
  comfy.ts         ComfyUI HTTP client and error mapping
  wan.ts           runner detection, VRAM defaults, class_type injection, job lifecycle
  wan-workflows.ts bundled Wan 2.1 T2V / I2V workflows (API format)
  format.ts        response formats, truncation, pagination
  tools/           one register*Tools(server) per area
scripts/
  mock-venice.ts   local Venice API stand-in
  mock-comfy.ts    local ComfyUI stand-in
  smoke.ts         self-check
```

Built with the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) and Zod 4.
