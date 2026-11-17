# venice-mcp-server

An MCP server that gives Claude and other MCP clients a **Venice.ai agent**, direct access to Venice's private AI APIs, hosted **Venice video**, and **free local video generation** with Wan through ComfyUI. It also includes a **phone-friendly web app** ([below](#web-app-control-it-from-your-phone)) so you can make videos from your phone while the work runs on your computer.

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
| `venice_video` | Quotes, then queues a clip on Venice's hosted Wan (`wan-3-0…`) model and returns `{ queue_id, quote_usd }` at once. **Billed.** |
| `venice_video_status` | Shows a hosted job's progress, and the saved file path and resource link once the background poll has downloaded it. With no `queue_id`, lists this server's hosted jobs |
| `wan_video` | Queues a text-to-video or image-to-video clip on local Wan and returns `{ job_id, status: "queued" }` at once. **Free.** |
| `wan_status` | Shows a local job's queue position, render progress, and the saved file path and resource link once it is done. With no `job_id`, shows the GPU, the workflow metadata, the defaults chosen from VRAM, and the installed checkpoints |
| `wan_cancel` | Removes a waiting local job from ComfyUI's queue, or interrupts one that is rendering |

Every tool accepts `response_format: "json"` for structured output, except the image and speech tools, which return media.

### What costs Venice credits

| Tool | Runs on | Cost |
|---|---|---|
| `wan_video`, `wan_status`, `wan_cancel` | Your GPU, through local ComfyUI | **Free.** Prompts, images and videos stay on your machine and never reach Venice |
| `venice_video` | Venice | **Billed.** The price is quoted (`POST /video/quote`) before the job is queued, and `quote_usd` is returned. Nothing gates on the price |
| `venice_video_status` | Venice | Polls a job that was already quoted and queued; it does not start a new generation |
| The web app | Local: your GPU. Hosted: Venice | Local clips are **free**. Hosted clips are **billed**, and the app shows the price and asks before spending (it sends it as a `max_usd` cap) |
| `venice_agent` | Venice | **Billed.** Each round is one model call plus its searches, scrapes and images. Clips it queues locally (`enable_local_video`) are free |
| `venice_chat`, `venice_generate_image`, `venice_text_to_speech`, `venice_embeddings` | Venice | **Billed**, per call |
| `venice_web_search`, `venice_web_scrape` | Venice | **Billed**, per call |
| `venice_list_models`, `venice_list_characters`, `venice_image_styles`, `venice_account_limits` | Venice | Catalog and account reads, not generations; they need `VENICE_API_KEY` |

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
  - The agent does not get the hosted `venice_video`.

## Local Wan video

`wan_video` sends a ComfyUI workflow to a ComfyUI server on your machine and returns at once. The server then polls ComfyUI in the background:

1. It polls `GET /history/{id}`, and also `/queue` to report queue position.
2. It reads progress from ComfyUI's websocket.
3. When the render is done, it downloads the clip with `GET /view` into `WAN_OUTPUT_DIR` as `<job_id>-<file>.mp4`.

`wan_status` returns the absolute path and an MCP `resource_link`. The video itself is never base64-encoded over stdio.

### Setup

1. **Run ComfyUI** on the default `127.0.0.1:8188`. The bundled workflows use ComfyUI's core `CreateVideo` and `SaveVideo` nodes, which need a 2025 or newer ComfyUI.
2. **Install the model files** in ComfyUI's `models/` folders. This server never downloads them:
   - `diffusion_models/`: a Wan checkpoint the bundled workflows can load: Wan 2.1 `wan2.1_t2v_1.3B_fp16`, `wan2.1_t2v_14B_fp8_e4m3fn`, `wan2.1_i2v_480p_14B_fp8_e4m3fn` (or `.gguf` versions, see below), or Wan 2.2 `wan2.2_ti2v_5B_fp16`.
   - `text_encoders/`: `umt5_xxl_fp8_e4m3fn_scaled.safetensors`. The fp16 variant is picked up automatically.
   - `vae/`: `wan_2.1_vae.safetensors` for Wan 2.1, `wan2.2_vae.safetensors` for the 5B.
   - `clip_vision/`: `clip_vision_h.safetensors`, for Wan 2.1 image-to-video.
3. **Check what was detected** by calling `wan_status` with no `job_id`. It shows the GPU, VRAM, the workflow metadata, and the resolution and checkpoint the server will use, with the reason for each choice.

### Frame rate, frames and sizes come from metadata

Wan families differ, and none of it is hardcoded:

| | Wan 2.1 (1.3B, 14B) | Wan 2.2 TI2V 5B |
|---|---|---|
| Frame rate | **16 fps** | **24 fps** |
| Default frames | 81 (≈ 5 s) | 121 (≈ 5 s) |
| Frame range (4k+1) | 5–241 | 49–145 |
| Allowed sizes | 832x480, 480x832, 1280x720, 720x1280 | 1280x704, 704x1280 only |

So `duration` is converted at the workflow's own fps: 3 s is 49 frames on 2.1 and 73 on the 5B. These numbers live in a `<workflow>.meta.json` beside each workflow JSON (the bundled ones are in `workflows/`):

```json
{ "family": "2.2", "fps": 24, "default_frames": 121, "min_frames": 49, "max_frames": 145,
  "allowed_sizes": [ { "width": 1280, "height": 704 }, { "width": 704, "height": 1280 } ] }
```

- **A requested size is checked against `allowed_sizes` before anything is queued.** A mismatch fails at once with the permitted sizes in the message; ComfyUI never gets to reject it after loading a model. With only a width or a height, the allowed size that has it is used.
- **Frames** are snapped to 4k+1 and kept within `min_frames`–`max_frames`, with a warning when they are changed.
- **The metadata's fps is written into the workflow's video node**, so the saved file and the `duration` arithmetic agree.
- **Your own workflows** (`WAN_WORKFLOW_T2V`, `WAN_WORKFLOW_I2V`) **must have a sibling `.meta.json` with all six keys** (`foo.json` → `foo.meta.json`). A missing file is an error that names the file and the keys, an incomplete one names the missing keys, and invalid values are listed. There is no fallback to the 2.1 numbers.

### Your own workflows (Wan 2.2 14B, LoRAs…)

Build the workflow in ComfyUI, choose **Export (API)**, and point `WAN_WORKFLOW_T2V` and/or `WAN_WORKFLOW_I2V` at the file, with its `.meta.json` next to it. The tool never relies on node IDs. It finds nodes by `class_type`:

| What it sets | Where it goes |
|---|---|
| Prompts | The `CLIPTextEncode` nodes, traced upstream from the sampler's positive and negative inputs |
| Width, height and length | The latent node: any `*LatentVideo`, `WanImageToVideo` or `Wan22ImageToVideoLatent` |
| Seed, cfg and sampler | `KSampler`, `KSamplerAdvanced`, `RandomNoise`, `CFGGuider` |
| Start image | `LoadImage` |
| Frame rate | `CreateVideo` or VHS Video Combine, set from the metadata |

A re-exported workflow with renumbered nodes keeps working. A custom workflow keeps its own model files unless `WAN_MODEL` is set. In workflows with two samplers (Wan 2.2 high/low noise), `steps` is ignored, because each sampler has its own step split.

### GGUF checkpoints need ComfyUI-GGUF

A `.gguf` file cannot load through `UNETLoader` or `CheckpointLoaderSimple`. It needs `UnetLoaderGGUF` from the [ComfyUI-GGUF](https://github.com/city96/ComfyUI-GGUF) custom nodes. The loader node is chosen **by file extension**, whatever the workflow says: `.gguf` gets `UnetLoaderGGUF` and anything else gets `UNETLoader`. That holds for the bundled workflows, for a custom workflow, and for `WAN_MODEL`.

- If a GGUF is wanted and ComfyUI has no `UnetLoaderGGUF` node (checked in `/object_info`), the call is **refused before anything is submitted**, with a message saying to install ComfyUI-GGUF. `wan_status` shows whether it is installed.
- Without ComfyUI-GGUF, ComfyUI does not list `.gguf` files at all, so "no checkpoints installed" messages also point at it.
- This server does not install it. GGUF text encoders (`CLIPLoaderGGUF`) are not handled; only the diffusion model is.

### VRAM tiers and the memory budget

The server reads VRAM from ComfyUI's `/system_stats` on **every** call (one cheap request). If the reported GPU or VRAM total changes, for example ComfyUI restarted on another card, the cached model lists and defaults are dropped and the change is logged. The first time it makes a choice, it writes the decision and the reason to stderr.

| VRAM | Default size | Checkpoint (bundled workflows) |
|---|---|---|
| under 12 GB | the smallest 480-class size | the smallest installed |
| 12–23 GB | the largest 480-class size (720p allowed on request) | the largest whose estimate fits |
| 24 GB+ | the largest allowed size (720p) | the largest whose estimate fits |

The tier boundaries sit at 11.5 and 23.5 GB, because a card reports a little less than its marketing size (a "24 GB" 3090 reports about 23.7).

**The estimate is weights + text encoder + VAE + activations**, compared with 92% of the available VRAM:

- **Weights:** parameters × bytes per parameter (fp16 2, fp8 1, GGUF by quant level).
- **Text encoder:** the UMT5-XXL encoder, about 11.4 GB as fp16/bf16 and 6.7 GB as fp8.
- **VAE:** about 0.3 GB for Wan 2.1, 1.4 GB for the 5B.
- **Activations:** they grow with resolution and frame count; they are modelled from the latent token count and the model's hidden size.

It is deliberately conservative: ComfyUI offloads the text encoder once the prompt is encoded, so the real peak is usually lower. The estimate is shown in `wan_status`, labelled as an estimate.

**Wan 2.2 5B at 720p counts as a 24 GB job whatever the arithmetic says.** On a card below the 24 GB class it is passed over by the automatic choice and gets a warning if you force it with `WAN_MODEL`.

**Out of memory is retried once, one tier down.** The retry uses the lower tier's default size and, for bundled workflows, its checkpoint; the seed is kept. When that changes nothing (the 5B has a single size), it asks for fewer frames instead (60% of the original, within the metadata's range). If there is nothing smaller to try, the job fails with the usual hint. The downgrade is logged, recorded in the job (`attempt`, `previous_attempts`, a warning), and applies even to an explicitly requested size. The job's `job_id` stays the first attempt's ID.

### Jobs, the queue and shutdown

- **The queue.** If ComfyUI already has 2 jobs (running plus waiting, from anyone) ahead, `wan_video` is refused with "queue is busy, N ahead" instead of stacking a third. `start_image` problems are reported before this, so a bad image never shows up as "busy".
- **Job IDs** are ComfyUI prompt IDs, so `wan_status` still works after this server restarts, as long as ComfyUI keeps its history. A job that was retried can only be followed up to its first attempt after a restart.
- **Timeouts.** A job still unfinished after `WAN_TIMEOUT` seconds is reported as `timed_out`. That doesn't stop the render. `wan_status` keeps checking, and `wan_cancel` stops it.
- **Cancelling.** `wan_cancel` removes a waiting job with `POST /queue {delete}` and interrupts a running one with `POST /interrupt`.
- **Shutdown.** On SIGINT, SIGTERM, SIGHUP or when the client closes stdin, the server removes the jobs **it** queued from ComfyUI's queue and interrupts the one that is rendering, so no render is orphaned. Jobs queued by anyone else are left alone.
- **Render errors** come back as `failed`, with the node that failed and a suggestion for recovering.

### Output directory and retention

Finished clips go to `WAN_OUTPUT_DIR` (default `<system temp>/venice-mcp-wan`); hosted clips are saved there too. At startup the server deletes clips older than `WAN_RETAIN_HOURS` (default 48; `0` keeps everything) and logs how many files and how many MB the directory holds. Only files this server wrote are ever deleted (`<prompt id>-<name>` and `venice-<queue id>-<name>` with a video extension), so pointing `WAN_OUTPUT_DIR` at a folder with other files in it is safe.

### Keep ComfyUI on loopback

ComfyUI has **no authentication**. Anyone who can reach it can queue jobs, upload files and download outputs.

- Keep `WAN_BASE_URL` on `127.0.0.1`. That is ComfyUI's default when it runs without `--listen`.
- If ComfyUI must run on another machine, put it behind a reverse proxy that requires authentication.
- The server prints a warning at startup when `WAN_BASE_URL` is not a loopback address.
- `start_image` and the output names ComfyUI returns must not contain `..`; they are rejected before they reach `/upload/image` or `/view`. In HTTP mode, `start_image` paths are read from the server's disk: images only, 20 MB at most.

## Hosted Venice video

`venice_video` calls Venice's hosted video endpoints (Bearer auth, `https://api.venice.ai/api/v1`) and follows the same shape as the local path: it returns at once, and a background poller does the rest.

1. `POST /video/quote` gives the price. It is sent the model, duration, resolution and aspect ratio; if Venice rejects the extra fields, it is repeated with model and duration only, and the result says so.
2. `POST /video/queue` queues it. The tool returns `{ queue_id, quote_usd }` immediately.
3. A background poller calls `POST /video/retrieve` until the file arrives (a JSON status while it is processing). When retrieval completes without a file, it uses the `download_url` Venice gave at queue time, fetched **without the API key** and only from the API's own origin or an https `venice.ai` host.
4. The file is saved to `WAN_OUTPUT_DIR` (streamed to disk), then `POST /video/complete` releases Venice's stored copy.

`venice_video_status` reports progress, the saved path and a resource link. There is no way to cancel a hosted job. A job past `VENICE_VIDEO_TIMEOUT` is reported as `timed_out` and may still finish on Venice's side.

**Inputs.** `prompt` and `duration` (whole seconds, 1–30, sent as `"5s"`; each model accepts only certain lengths) are required. `model`, `aspect_ratio`, `resolution`, `negative_prompt`, `image_url` (an https URL or a small `data:` URI) and `max_usd` are optional. **`max_usd` is a price cap:** the video is only queued if Venice's quote is at or below it, and a quote that cannot be read also stops it (it fails closed). Model IDs are read from `GET /models?type=video` at runtime and limited to IDs starting `wan-3-0` (`VENICE_VIDEO_MODEL_PREFIX`): the text-to-video one by default, the image-to-video one when `image_url` is given. If the catalog has none, the call says so and lists what exists.

**Errors:**

| Venice says | What you get |
|---|---|
| the quote is over `max_usd`, or unreadable with `max_usd` set | A refusal with the quote and your limit; nothing is queued |
| 402 | Out of credits, with the account's balance (read from `/api_keys/rate_limits`) and the quoted price |
| 409 `needs_consent` | Venice's consent **policy text and version**. `venice_video` never consents on the user's behalf and has no consent parameter |
| 413 | "Payload over 25 MB". The size is also checked before sending |
| 422 | Venice's reason, and its `suggested_prompt` when it sent one |

Each of these comes back as an error result with the fields (`balance`, `consent_version`, `policy_text`, `suggested_prompt`…) in `structuredContent`.

**The MCP transport limits a message well below Venice's 25 MB:** about 10 MB over stdio and 4 MB over HTTP. So only a small image fits as a `data:` URI; pass an https URL for anything bigger.

### Why `wan_video` and `venice_video` are separate tools

They look alike but their parameters do not converge, and merging them would hide differences that matter:

- **Length:** local Wan takes frames, which must be 4k+1 within a workflow-specific range, or seconds converted at the workflow's own fps. Hosted takes whole seconds from a model-specific list and never frames.
- **Size:** local takes pixel sizes from a per-family grid. Hosted takes aspect-ratio and resolution strings.
- **Controls:** only local has `seed` (always returned), `steps`, `cfg`, `sampler` and `start_image` from a local path. Only hosted has a price quote, an `image_url` and consent and credit errors.
- **Lifecycle:** local can be cancelled and is cleaned up at shutdown. Hosted cannot be cancelled.
- **Cost and privacy:** local is free and stays on your machine. Hosted is billed and goes to Venice.
- **Sound:** hosted Wan generates native audio; local Wan (2.1 and 2.2) does not.

## Web app: control it from your phone

`npm run web` starts a small web app on your computer, the one that has ComfyUI and your Venice key. You open it on your phone, type a prompt (optionally pick a photo to animate), and watch the video render. Local (your GPU, free) and hosted (Venice, billed) are one tap apart.

```bash
cd venice-mcp-server
npm run phone       # checks Node, installs, builds, looks for ComfyUI, then starts the app
```

`npm run phone` works on Windows, macOS and Linux. Start ComfyUI first (with the Wan model files in its models folder), or the page will show "Local off" until it can reach it. To also make hosted Venice videos, set `VENICE_API_KEY` first. If you'd rather run the steps yourself: `npm install`, `npm run build`, `npm run web`.

It prints the addresses to use and a **QR code**. With your phone on the same Wi-Fi, scan it: the page opens and signs you in. Nothing to type.

**Using it**
- **Create:** choose **Local** or **Hosted**, write the prompt, pick a length (3, 5, 8 or 10 s, or any whole number up to 30), and optionally a photo. A photo is shrunk in the browser first, so a 12-megapixel picture becomes a few hundred KB.
  - **Local** shows your GPU and the model it will use, and lets you pick a size and a seed. Free.
  - **Hosted** shows your Venice balance and the models available. **It asks for the price first**: tap *Get the price*, see the quote, then tap *Generate for $0.42*. The app sends that quote as `max_usd`, so it only starts if the price stays at or below what you saw.
- **Jobs:** every video with live progress, the player when it is done, *Download*, *Cancel* (local jobs), and *Use this prompt* to start again from the same text. The page keeps updating while you wait.
- **Library:** clips saved on the computer, including ones from before the app was restarted.

**Sign-in and security.** The app can spend your Venice credits and use your GPU, so it is never open:
- Every API call needs a token. If you don't set `WEB_TOKEN` (16+ characters), one is generated the first time and kept in `~/.venice-mcp/web-token` (mode 0600), so your phone's bookmark survives restarts.
- The QR code and link carry the token in the URL **fragment** (`/#t=…`), which browsers never send to a server, so it stays out of logs. The page signs in and clears it from the address bar. After that the phone holds an `HttpOnly`, `SameSite=Strict` cookie that contains an HMAC of the token, not the token.
- Wrong tokens are rate limited (8 tries, then a few minutes' lockout from that address). State-changing requests must come from the app's own origin. The page runs under a strict content policy with no inline script.
- The phone can only supply **a photo** (PNG, JPEG or WebP, sent as a data URI) as a start image. It cannot name a file or URL for the server to read, so a signed-in phone can't point the server at other files on your computer.
- **ComfyUI stays on loopback.** The phone talks only to this app, and the app talks to ComfyUI from the same machine, which is the setup the ComfyUI warning above asks for.
- It is **plain HTTP on your network**: anyone who can watch your Wi-Fi traffic could see the token when you sign in. For use away from home, or if you want HTTPS, set `WEB_HOST=127.0.0.1` and put it behind an HTTPS front end that you control, such as Tailscale or a Cloudflare Tunnel. The app honours `X-Forwarded-For` and `X-Forwarded-Proto` from a proxy on the same machine and marks the cookie `Secure` over HTTPS. (I could not test those front ends here, only the app itself.)
- If the phone can't connect, your computer's firewall is the usual reason: allow incoming connections on the app's port (8787 by default).

**Good to know**
- The job list lives in the app's memory, so restarting it forgets the list. The clips themselves stay in `WAN_OUTPUT_DIR` and show up in **Library**, until `WAN_RETAIN_HOURS` deletes them.
- Quitting the app (Ctrl+C) cancels the local renders it queued, as the MCP server does. A hosted video can't be cancelled and keeps going on Venice's side.
- The MCP server and the web app are separate programs. They can run at the same time, but each only knows about the jobs it queued itself, and they share ComfyUI's queue.
- A phone's own web player decides what it can play. If a clip won't play inline, use *Download*.

| Variable | Default | Purpose |
|---|---|---|
| `WEB_PORT` | `8787` | Port to listen on |
| `WEB_HOST` | `0.0.0.0` | Address to listen on. `127.0.0.1` keeps it to this computer (for a proxy) |
| `WEB_TOKEN` | generated | Sign-in token, 16 or more characters |
| `WEB_TOKEN_FILE` | `~/.venice-mcp/web-token` | Where a generated token is kept |

It also uses `VENICE_API_KEY`, `WAN_BASE_URL`, `WAN_OUTPUT_DIR` and the other settings below.

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
| `VENICE_VIDEO_MODEL_PREFIX` | `wan-3-0` | Only hosted video models whose ID starts with this are offered |
| `VENICE_VIDEO_TIMEOUT` | `1800` | Seconds before an unfinished hosted video is reported as `timed_out` |
| `VENICE_VIDEO_POLL_INTERVAL_MS` | `5000` | How often the background poller checks Venice |
| `WAN_BASE_URL` | `http://127.0.0.1:8188` | ComfyUI address. **Keep it on loopback** |
| `WAN_OUTPUT_DIR` | `<system temp>/venice-mcp-wan` | Where finished clips (local and hosted) are saved |
| `WAN_RETAIN_HOURS` | `48` | Clips this server wrote that are older than this are deleted at startup. `0` keeps them |
| `WAN_MODEL` | chosen from VRAM | Diffusion model file to load instead (`.safetensors` or `.gguf`) |
| `WAN_TIMEOUT` | `1800` | Seconds before an unfinished local job is reported as `timed_out` |
| `WAN_WORKFLOW_T2V` / `WAN_WORKFLOW_I2V` | bundled | API-format workflow files exported from ComfyUI. Each needs a sibling `.meta.json` |
| `WAN_POLL_INTERVAL_MS` | `2000` | How often the background poller checks ComfyUI |
| `TRANSPORT`, `PORT`, `HOST`, `MCP_AUTH_TOKEN`, `ALLOWED_HOSTS` | stdio | HTTP serving (see above) |
| `WEB_PORT`, `WEB_HOST`, `WEB_TOKEN`, `WEB_TOKEN_FILE` | `8787`, `0.0.0.0`, generated, `~/.venice-mcp/web-token` | The phone web app (see its section) |

## Example prompts for Claude

- "Use venice_agent to compare the context windows and licenses of the three newest open-weight models, as a table."
- "Ask venice_chat with web_search on what changed in the EU AI Act this month."
- "Have the Venice agent design a minimalist fox logo and generate it." (sets `allow_image_generation`)
- "Render a 5-second clip of a paper boat drifting down a rain gutter with wan_video, then check on it." (free, local)
- "Make a 5-second clip with venice_video, and tell me the quote first." (billed, hosted)
- "Have the Venice agent storyboard a three-shot teaser and render the shots locally." (sets `enable_local_video`)

## Development

```bash
npm run build     # compile TypeScript to dist/
npm run smoke     # end-to-end self-check of the MCP server against local mocks of the Venice API and ComfyUI
npm run smoke:web # the same for the web app's HTTP API
npx @modelcontextprotocol/inspector node dist/index.js   # interactive testing
```

The smoke test (`scripts/smoke.ts`) drives every tool through a real MCP client over stdio. It needs no key, no GPU and no network access, and runs 63 checks. The web smoke test (`scripts/web-smoke.ts`) starts the built app against the same mocks and runs 17 checks: sign-in, the cookie flags, the origin check, the local and hosted flows, Range streaming (iOS will not play a video without it), the price cap and its refusals, the library, the token file, the rate limit, and shutdown cancelling renders. The page itself was checked in a real browser at phone and desktop sizes, but that check is not part of the repository.

- **Mock Venice API** (`scripts/mock-venice.ts`) covers the agent loop, error handling, and the hosted video flow: quote, queue, retrieve and complete; a `download_url` present and absent; 402, 409, 413 and 422; a missing `wan-3-0` catalog; a strict quote; a failed job and a timeout.
- **Mock ComfyUI** (`scripts/mock-comfy.ts`) implements queue, history, view, upload, interrupt and progress over a websocket, validates model files the way ComfyUI does, and can be told to run out of memory, hang, lose its output or name it `../evil.mp4`. The Wan checks against it cover:
  - the normal render, render errors, lost outputs, `WAN_TIMEOUT`, and cancelling a waiting job and a running one;
  - fps, default frames and sizes from metadata for Wan 2.1 and the 2.2 5B; refused sizes; missing and invalid metadata;
  - GGUF loader substitution by extension, and the refusal without ComfyUI-GGUF;
  - VRAM tiers, the memory budget, the 5B rule, the out-of-memory retry (tier down, and fewer frames) and GPU-change invalidation;
  - the busy queue, shutdown cancellation (and leaving other clients' jobs alone), and retention;
  - the loopback warning, `..` rejection, and the agent's two-clips-per-round cap.
- **HTTP transport:** also checked, with bearer auth.

### Layout

```
src/
  index.ts         server factory, stdio/HTTP transports, bearer auth, startup pruning, shutdown
  config.ts        environment configuration (Venice, Wan, hosted video)
  api.ts           Venice HTTP client: auth, timeouts, actionable errors (with the parsed body)
  venice.ts        chat, model catalog and trait resolution, search, scrape, images
  agent.ts         the tool-calling agent loop
  video.ts         hosted video: models, quote, queue, background retrieve, error mapping
  comfy.ts         ComfyUI HTTP client and error mapping
  wan.ts           planning, job lifecycle, out-of-memory retry, shutdown
  wan-workflows.ts workflow and metadata loading and validation, size and frame resolution
  wan-runner.ts    what the runner has: GPU, checkpoints, GGUF loader, queue
  wan-plan.ts      tiers, memory estimate, checkpoint choice
  wan-graph.ts     editing a workflow by class_type: prompts, loaders, injection
  output.ts        output directory: names, retention, safe paths, streamed saves
  format.ts        response formats, truncation, pagination
  tools/           one register*Tools(server) per area
  web.ts           the web app's entry: sign-in token, QR code, shutdown
  web/auth.ts      token, cookie session, login rate limit
  web/app.ts       the web app's JSON API over the same wan.ts and video.ts code
workflows/         bundled Wan workflows (API format) and their .meta.json
web/               the phone page: index.html, app.css, app.js (no build step)
scripts/
  mock-venice.ts   local Venice API stand-in
  mock-comfy.ts    local ComfyUI stand-in
  smoke.ts         self-check of the MCP server
  web-smoke.ts     self-check of the web app
```

Built with the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) and Zod 4.
