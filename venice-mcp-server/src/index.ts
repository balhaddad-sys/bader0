#!/usr/bin/env node
/**
 * MCP server for Venice.ai.
 *
 * Serves stdio by default (for Claude Code, Claude Desktop, Cursor and other local hosts),
 * or Streamable HTTP when TRANSPORT=http.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { createMcpExpressApp } from "@modelcontextprotocol/express";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpHandler, McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import type { NextFunction, Request, Response } from "express";
import { config, isLoopbackUrl, SERVER_NAME, SERVER_VERSION, wanConfig } from "./config.js";
import { registerAgentTools } from "./tools/agent.js";
import { registerCatalogTools } from "./tools/catalog.js";
import { registerChatTools } from "./tools/chat.js";
import { registerMediaTools } from "./tools/media.js";
import { registerVideoTools } from "./tools/video.js";
import { registerWanTools } from "./tools/wan.js";
import { pruneOutputDir } from "./output.js";
import { shutdownWan } from "./wan.js";
import { registerWebTools } from "./tools/web.js";

/** Builds a fresh server. serveStdio calls it once; createMcpHandler calls it for every HTTP request. */
function createServer(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      instructions:
        "Venice.ai tools. For research or multi-step tasks that need current information, call venice_agent: it searches, reads pages and returns a cited answer. " +
        "Use venice_chat for a single prompt to a Venice model, venice_web_search / venice_web_scrape for raw web data, " +
        "venice_generate_image and venice_text_to_speech for media, and venice_list_models / venice_list_characters to find IDs. " +
        "Every venice_* generation call, including venice_video (hosted video), is billed to the user's Venice account. " +
        "wan_video renders video locally (free, private, never sent to Venice). Both video tools return a job ID at once, so poll wan_status / venice_video_status instead of waiting."
    }
  );
  registerAgentTools(server);
  registerChatTools(server);
  registerWebTools(server);
  registerMediaTools(server);
  registerCatalogTools(server);
  registerWanTools(server);
  registerVideoTools(server);
  return server;
}

/** Rejects requests without `Authorization: Bearer <MCP_AUTH_TOKEN>`. Hashing first makes the comparison constant-time. */
function requireToken(token: string) {
  const expected = createHash("sha256").update(token).digest();
  return (req: Request, res: Response, next: NextFunction) => {
    const header = req.headers.authorization ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
    const actual = createHash("sha256").update(presented).digest();
    if (presented && timingSafeEqual(actual, expected)) return next();
    res.status(401).set("WWW-Authenticate", "Bearer").json({ error: "Missing or invalid bearer token" });
  };
}

function serveHttp(): void {
  const host = process.env.HOST?.trim() || "127.0.0.1";
  const port = Number(process.env.PORT ?? 3000);
  const token = process.env.MCP_AUTH_TOKEN?.trim();
  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(host);

  if (!isLocal && !token) {
    console.error(`Refusing to listen on ${host} without MCP_AUTH_TOKEN: anyone who can reach it could spend your Venice credits.`);
    process.exit(1);
  }
  const allowedHosts = process.env.ALLOWED_HOSTS?.split(",").map(entry => entry.trim()).filter(Boolean);
  const app = createMcpExpressApp({ host, ...(allowedHosts?.length ? { allowedHosts } : {}) });

  const nodeHandler = toNodeHandler(createMcpHandler(createServer));
  const handlers = token ? [requireToken(token)] : [];
  app.all("/mcp", ...handlers, (req: Request, res: Response) => void nodeHandler(req, res, req.body));
  app.get("/healthz", (_req: Request, res: Response) => {
    res.json({ ok: true, name: SERVER_NAME, version: SERVER_VERSION });
  });

  app.listen(port, host, () => {
    console.error(`${SERVER_NAME} listening on http://${host}:${port}/mcp${token ? " (bearer token required)" : ""}`);
  });
}

if (!config.apiKey) {
  // Start anyway so hosts can list the tools; each call explains how to set the key
  console.error(`${SERVER_NAME}: VENICE_API_KEY is not set. venice_* tool calls will fail until it is (the local wan_* tools do not need it).`);
}

if (!isLoopbackUrl(wanConfig.baseUrl)) {
  // ComfyUI has no authentication: anyone who can reach it can queue jobs, read outputs and upload files
  console.error(
    `${SERVER_NAME}: WARNING: WAN_BASE_URL (${wanConfig.baseUrl}) is not a loopback address. ComfyUI has no authentication, ` +
      "so keep it on 127.0.0.1 unless it is behind an authenticating proxy."
  );
}

// Old clips go before anything is served; this never throws
await pruneOutputDir();

/**
 * Cancels the local renders this process queued, so a closed session leaves nothing orphaned in ComfyUI's queue, then
 * exits. The stdio transport only closes itself when stdin ends; the progress websocket would keep the process alive.
 */
let shuttingDown = false;
function shutdown(reason: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  console.error(`${SERVER_NAME}: shutting down (${reason})`);
  const deadline = setTimeout(() => process.exit(0), 4_000);
  void shutdownWan()
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, () => shutdown(signal));

if (process.env.TRANSPORT === "http") {
  serveHttp();
} else {
  serveStdio(createServer);
  process.stdin.on("end", () => shutdown("stdin closed"));
  process.stdin.on("close", () => shutdown("stdin closed"));
  console.error(`${SERVER_NAME} ${SERVER_VERSION} running on stdio`);
}
