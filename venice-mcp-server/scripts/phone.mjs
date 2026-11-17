#!/usr/bin/env node
// One step to get the phone web app running on this computer:
//   npm run phone          (or: node scripts/phone.mjs)
// It checks Node, installs and builds if needed, tells you whether ComfyUI (which does the Wan rendering) is reachable,
// then starts the app, which prints a QR code to scan with your phone. Works on Windows, macOS and Linux.
// Add --no-start to do only the checks and the build.

import { spawn, spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const windows = process.platform === "win32";
const noStart = process.argv.includes("--no-start");

const step = text => console.log(`\n> ${text}`);
const fail = text => {
  console.error(`\nX ${text}`);
  process.exit(1);
};

// 1. Node
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 3)) {
  fail(`Node.js 20.3 or newer is needed, and this is ${process.versions.node}. Install the current LTS from https://nodejs.org, then run this again.`);
}
console.log(`ok Node.js ${process.versions.node}`);

// 2. Install and build (both are quick when nothing has changed)
const npm = args => {
  const result = spawnSync(windows ? "npm.cmd" : "npm", args, { cwd: root, stdio: "inherit", shell: windows });
  if (result.status !== 0) fail(`"npm ${args.join(" ")}" failed. The reason is just above.`);
};
step("Installing dependencies");
npm(["install", "--no-audit", "--no-fund"]);
step("Building");
npm(["run", "build"]);

// 3. Is ComfyUI there? The app starts either way, but local videos need it.
const comfy = (process.env.WAN_BASE_URL || "http://127.0.0.1:8188").replace(/\/+$/, "");
step(`Looking for ComfyUI at ${comfy}`);
try {
  const response = await fetch(`${comfy}/system_stats`, { signal: AbortSignal.timeout(4_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const stats = await response.json();
  const gpu = (stats.devices ?? []).find(device => device.type !== "cpu" && device.vram_total > 0);
  console.log(`ok ComfyUI is running${gpu ? `: ${gpu.name.replace(/^cuda:\d+\s*/, "").replace(/\s*:\s*\w+$/, "")}, ${Math.round(gpu.vram_total / 1024 ** 3)} GB` : " (it reports no GPU)"}`);
} catch {
  console.log(
    "!  ComfyUI is not running there. Start it first (it needs the Wan model files in its models folder), then reload the page on your phone.\n" +
      "   The app starts anyway and shows 'Local off' until it can reach ComfyUI."
  );
}
if (!process.env.VENICE_API_KEY) {
  console.log("i  VENICE_API_KEY is not set, so hosted Venice video is off. Local Wan videos don't need it.");
}

if (noStart) {
  console.log("\nSetup finished. Start the app with: npm run web");
  process.exit(0);
}

// 4. Run the app. It prints the addresses and the QR code.
step("Starting the web app");
console.log("   If your phone can't connect, allow Node.js through the firewall on private networks when your computer asks.\n");
const app = spawn(process.execPath, [join(root, "dist", "web.js")], { cwd: root, stdio: "inherit" });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => app.kill(signal));
app.on("exit", code => process.exit(code ?? 0));
