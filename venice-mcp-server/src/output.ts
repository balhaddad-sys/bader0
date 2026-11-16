/**
 * The directory finished clips are saved to, shared by local Wan and hosted Venice video:
 * file naming, retention, safe-path checks and streamed downloads.
 */
import { createWriteStream } from "node:fs";
import { mkdir, readdir, rename, rm, stat, unlink } from "node:fs/promises";
import { basename, dirname, isAbsolute, join } from "node:path";
import { Transform, Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as WebReadableStream } from "node:stream/web";
import { wanConfig } from "./config.js";

/**
 * Files this server wrote: `<comfyui prompt id>-<name>` for local clips and `venice-<queue id>-<name>` for hosted
 * ones. Retention only ever deletes names that match, so pointing WAN_OUTPUT_DIR at a folder with other files in it is safe.
 */
const MANAGED_NAME = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|venice-[A-Za-z0-9_-]{1,80})-.+\.(?:mp4|webm|mov|mkv|gif|webp)$/i;

export const isManagedName = (name: string): boolean => MANAGED_NAME.test(name);

/** A name that is safe to use as one path segment: no separators, no control characters. */
export function safeFileName(name: string): string {
  const clean = basename(name).replace(/[^\w.\-]+/g, "_").replace(/^\.+/, "");
  return clean || "clip.mp4";
}

export function localOutputPath(jobId: string, filename: string): string {
  return join(wanConfig.outputDir, `${jobId}-${safeFileName(filename)}`);
}

export function hostedOutputPath(queueId: string, extension: string): string {
  const id = queueId.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 80) || "job";
  return join(wanConfig.outputDir, `venice-${id}-clip${extension}`);
}

/** True when a name would leave the folder it is meant for: a `..` segment, a NUL byte, or (with `absolute`) an absolute path. */
export function hasPathTraversal(value: string, options: { rejectAbsolute?: boolean } = {}): boolean {
  if (value.includes("\0")) return true;
  if (value.split(/[\\/]+/).includes("..")) return true;
  return Boolean(options.rejectAbsolute && (isAbsolute(value) || /^[A-Za-z]:/.test(value)));
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export interface RetentionReport {
  dir: string;
  files: number;
  bytes: number;
  pruned: number;
  prunedBytes: number;
  unmanaged: number;
}

/** Deletes managed clips older than WAN_RETAIN_HOURS, then logs what the directory holds. Never throws. */
export async function pruneOutputDir(now: number = Date.now()): Promise<RetentionReport | undefined> {
  const dir = wanConfig.outputDir;
  const retainMs = wanConfig.retainHours * 3_600_000;
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(`[wan] output dir ${dir} does not exist yet; it is created by the first render`);
    } else {
      console.error(`[wan] could not read output dir ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return undefined;
  }

  const report: RetentionReport = { dir, files: 0, bytes: 0, pruned: 0, prunedBytes: 0, unmanaged: 0 };
  for (const name of names) {
    const path = join(dir, name);
    try {
      const info = await stat(path);
      if (!info.isFile()) continue;
      const managed = isManagedName(name);
      if (!managed) report.unmanaged++;
      if (managed && retainMs > 0 && now - info.mtimeMs > retainMs) {
        await unlink(path);
        report.pruned++;
        report.prunedBytes += info.size;
        continue;
      }
      report.files++;
      report.bytes += info.size;
    } catch {
      // A file that vanished or cannot be read is not worth failing startup over
    }
  }

  const policy =
    wanConfig.retainHours > 0
      ? `pruned ${report.pruned} clip(s) / ${mb(report.prunedBytes)} older than ${wanConfig.retainHours} h`
      : "retention is off (WAN_RETAIN_HOURS=0)";
  const other = report.unmanaged ? `; ${report.unmanaged} file(s) not written by this server are left alone` : "";
  console.error(`[wan] output dir ${dir}: ${report.files} file(s), ${mb(report.bytes)} kept (${policy}${other})`);
  return report;
}

/** Streams a response body to `path` through a `.part` file, so a failed download never leaves a truncated clip behind. */
export async function saveResponseBody(response: Response, path: string, maxBytes: number): Promise<number> {
  if (!response.body) throw new Error("the response had no body");
  await mkdir(dirname(path), { recursive: true });
  const partial = `${path}.part`;
  let bytes = 0;
  const limit = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytes += chunk.length;
      if (bytes > maxBytes) callback(new Error(`the download is larger than ${mb(maxBytes)}`));
      else callback(null, chunk);
    }
  });
  try {
    await pipeline(Readable.fromWeb(response.body as unknown as WebReadableStream), limit, createWriteStream(partial));
    if (bytes === 0) throw new Error("the download was empty");
    await rename(partial, path);
    return bytes;
  } catch (error) {
    await rm(partial, { force: true });
    throw error;
  }
}
