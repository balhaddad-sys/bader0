# venice-mcp-server

An MCP server that gives Claude and other MCP clients a **Venice.ai agent** plus direct access to Venice's private AI APIs.

The main tool is `venice_agent`. You give it a task, and it runs an autonomous loop on a Venice model that supports function calling. Each round, the model searches the web, reads pages, and (if you allow it) generates images. It then returns a cited answer with a trace of what it did. The other tools wrap single Venice endpoints.

## Tools

| Tool | What it does |
|---|---|
| `venice_agent` | Runs an autonomous research or task agent: web search, page reading, optional image generation, then a cited answer, a trace, and token usage |
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

Every tool accepts `response_format: "json"` for structured output, except the image and speech tools, which return media.

### How the agent works

```
task ─▶ Venice model (function calling) ──tool calls──▶ web_search / scrape_url / generate_image
             ▲                                                    │
             └────────────── tool results (untrusted) ◀───────────┘
        repeats up to max_steps rounds, then answers ─▶ answer + sources + trace + images
```

- **Model:** by default the agent uses the model Venice tags `function_calling_default` in its live catalog. Set `model` or `VENICE_AGENT_MODEL` to override it.
- **Round limit:** `max_steps` (default 6, max 15) caps the rounds of tool calls. If the model is still calling tools when the limit is reached, it is told to answer from what it has gathered, and the result reports `stopped_reason: "step_limit"`.
- **Parallel calls:** independent calls in a round run in parallel, up to 6 per round.
- **Error recovery:** a failed tool call or malformed arguments go back to the model as an error message, so it can adjust instead of aborting the run.
- **Untrusted pages:** web content is marked as untrusted data in the agent's instructions.
- **Progress:** the server sends progress notifications each round when the client asks for them.
- **Thinking blocks:** reasoning models' `<think>` blocks are removed from the answer.

## Setup

Requires Node.js 20.3+ and a Venice API key from <https://venice.ai/settings/api>.

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

To expose it beyond localhost, set `HOST=0.0.0.0`, `ALLOWED_HOSTS=your.domain`, and `MCP_AUTH_TOKEN`. The server refuses to bind to a non-local host without a token, because anyone who can reach it could spend your Venice credits. Clients then send `Authorization: Bearer <MCP_AUTH_TOKEN>`.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VENICE_API_KEY` | (required) | Venice API key |
| `VENICE_AGENT_MODEL` | catalog trait `function_calling_default` | Model for `venice_agent` |
| `VENICE_CHAT_MODEL` | catalog trait `default` | Model for `venice_chat` |
| `VENICE_IMAGE_MODEL` | catalog trait `default` (image) | Model for image generation |
| `VENICE_TTS_MODEL` / `VENICE_TTS_VOICE` | `tts-kokoro` / `af_sky` | Speech defaults |
| `VENICE_EMBEDDING_MODEL` | `text-embedding-bge-m3` | Embedding default |
| `VENICE_TIMEOUT_MS` | `120000` | Per-request upstream timeout |
| `VENICE_BASE_URL` | `https://api.venice.ai/api/v1` | API base URL (the smoke test points this at a mock) |
| `TRANSPORT`, `PORT`, `HOST`, `MCP_AUTH_TOKEN`, `ALLOWED_HOSTS` | stdio | HTTP serving (see above) |

## Example prompts for Claude

- "Use venice_agent to compare the context windows and licenses of the three newest open-weight models, as a table."
- "Ask venice_chat with web_search on what changed in the EU AI Act this month."
- "Have the Venice agent design a minimalist fox logo and generate it." (sets `allow_image_generation`)
- "Get a second opinion on this function from an uncensored Venice model." (uses `venice_list_models`, then `venice_chat`)

## Development

```bash
npm run build     # compile TypeScript to dist/
npm run smoke     # end-to-end self-check against a local mock of the Venice API
npx @modelcontextprotocol/inspector node dist/index.js   # interactive testing (needs VENICE_API_KEY)
```

The smoke test (`scripts/smoke.ts`) starts a mock Venice API (`scripts/mock-venice.ts`) and drives every tool through a real MCP client over stdio. It covers the full agent loop: parallel calls, recovery from malformed arguments, the round limit, and images. It also checks error handling for a missing key, a bad key, and HTTP 429, and runs the HTTP transport with bearer auth. It needs no key or network access.

### Layout

```
src/
  index.ts       server factory, stdio/HTTP transports, bearer auth
  config.ts      environment configuration
  api.ts         Venice HTTP client: auth, timeouts, actionable errors
  venice.ts      chat, model catalog and trait resolution, search, scrape, images
  agent.ts       the tool-calling agent loop
  format.ts      response formats, truncation, pagination
  tools/         one register*Tools(server) per area
scripts/
  mock-venice.ts local Venice API stand-in
  smoke.ts       self-check
```

Built with the MCP TypeScript SDK v2 (`@modelcontextprotocol/server`) and Zod 4.
