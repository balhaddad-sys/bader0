#!/usr/bin/env node
/**
 * The web app: control video generation from a phone. Run it on the computer that has ComfyUI (and your Venice key);
 * the phone talks only to this app, so ComfyUI itself can stay on loopback.
 */
import { hostname, networkInterfaces } from "node:os";
import qrcode from "qrcode-terminal";
import { config, isLoopbackUrl, wanConfig, webConfig } from "./config.js";
import { pruneOutputDir } from "./output.js";
import { shutdownWan } from "./wan.js";
import { createWebApp } from "./web/app.js";
import { loadToken } from "./web/auth.js";

const NAME = "Venice Video web app";

/** IPv4 addresses a phone on the same network could use, private ranges first. */
function lanAddresses(): string[] {
  const found: string[] = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (!address.internal && String(address.family).replace("IPv", "") === "4") found.push(address.address);
    }
  }
  const isPrivate = (ip: string) => /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip);
  return found.sort((a, b) => Number(isPrivate(b)) - Number(isPrivate(a)));
}

let token: Awaited<ReturnType<typeof loadToken>>;
try {
  token = await loadToken();
} catch (error) {
  console.error(`${NAME}: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

await pruneOutputDir();
if (!config.apiKey) console.error(`${NAME}: VENICE_API_KEY is not set, so hosted video is unavailable. Local Wan still works.`);
if (!isLoopbackUrl(wanConfig.baseUrl)) {
  console.error(
    `${NAME}: WARNING: WAN_BASE_URL (${wanConfig.baseUrl}) is not a loopback address. ComfyUI has no authentication, so keep it on 127.0.0.1 unless it is behind an authenticating proxy.`
  );
}

const app = createWebApp(token.token);
const server = app.listen(webConfig.port, webConfig.host, () => {
  const { host, port } = webConfig;
  const open = host === "0.0.0.0" || host === "::";
  const local = `http://127.0.0.1:${port}/`;
  const phone = open ? lanAddresses().map(ip => `http://${ip}:${port}/`) : isLoopbackUrl(`http://${host}`) ? [] : [`http://${host}:${port}/`];

  console.log(`${NAME} listening on ${open ? `all interfaces, port ${port}` : `http://${host}:${port}`}`);
  console.log(`  This computer:  ${local}`);
  for (const url of phone) console.log(`  On your phone:  ${url}   (same Wi-Fi)`);
  if (open) console.log(`  By name:        http://${hostname()}.local:${port}/   (if your network supports it)`);

  const signIn = `${phone[0] ?? local}#t=${token.token}`;
  if (token.source === "generated") console.log(`\nA new sign-in token was created and saved to ${token.file}`);
  else if (token.source === "file") console.log(`\nSign-in token: ${token.file}`);
  else console.log("\nSign-in token: WEB_TOKEN");
  console.log("Scan this with your phone's camera to open the app and sign in:\n");
  qrcode.generate(signIn, { small: true }, code => {
    console.log(code);
    console.log(`Or open: ${signIn}`);
    console.log("\nAnyone with that link can spend your Venice credits and use your GPU. Keep it private.");
    if (open) console.log("This is plain HTTP on your network. To reach it away from home with HTTPS, put it behind Tailscale or a tunnel (see the README).");
  });
});

server.on("error", error => {
  const code = (error as NodeJS.ErrnoException).code;
  console.error(
    code === "EADDRINUSE"
      ? `${NAME}: port ${webConfig.port} is already in use. Set WEB_PORT to another port, or stop whatever is using it.`
      : `${NAME}: ${error.message}`
  );
  process.exit(1);
});

/** Cancels the local renders this process queued (as the MCP server does), then exits. */
let closing = false;
function stop(reason: string): void {
  if (closing) return;
  closing = true;
  console.log(`\n${NAME}: shutting down (${reason})`);
  const deadline = setTimeout(() => process.exit(0), 5_000);
  server.closeAllConnections();
  server.close();
  void shutdownWan()
    .catch(() => undefined)
    .finally(() => {
      clearTimeout(deadline);
      process.exit(0);
    });
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) process.on(signal, () => stop(signal));
