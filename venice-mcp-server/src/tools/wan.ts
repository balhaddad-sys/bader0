import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { wanConfig } from "../config.js";
import { jsonResult, responseFormatField, ResponseFormat, textResult } from "../format.js";
import {
  cancelJob,
  chooseDefaults,
  DEFAULT_FRAMES,
  getJobStatus,
  getRunnerProfile,
  listJobs,
  MAX_FRAMES,
  queueWanVideo,
  type WanJob
} from "../wan.js";

// Local tools: nothing leaves the machine, so openWorldHint is false
const LOCAL_GENERATES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

const jobIdField = z
  .string()
  .regex(/^[A-Za-z0-9-]{8,64}$/, "Job IDs are the ComfyUI prompt IDs wan_video returns, e.g. 3f2a…-…")
  .describe("Job ID returned by wan_video");

function statusLine(job: WanJob): string {
  switch (job.status) {
    case "queued":
      return `queued${job.queue_position ? ` (position ${job.queue_position})` : ""}`;
    case "running":
      return `rendering${job.progress ? ` ${job.progress.percent}% (step ${job.progress.value}/${job.progress.max})` : ""}`;
    default:
      return job.status.replace("_", " ");
  }
}

function jobMarkdown(job: WanJob): string {
  const lines = [`# Wan job ${job.job_id}`, `- Status: **${statusLine(job)}**`];
  if (job.output_path) lines.push(`- Video: ${job.output_path}`);
  if (job.error) lines.push(`- ${job.status === "timed_out" ? "Note" : "Error"}: ${job.error}`);
  if (job.width) {
    lines.push(
      `- Clip: ${job.width}x${job.height}, ${job.frames} frames at ${job.fps} fps (${job.duration_seconds} s), seed ${job.seed}`,
      `- Model: ${job.model}${job.steps ? ` · steps ${job.steps}` : ""}${job.cfg !== undefined ? ` · cfg ${job.cfg}` : ""}${job.sampler ? ` · ${job.sampler}` : ""}`
    );
  }
  for (const warning of job.warnings) lines.push(`- Warning: ${warning}`);
  if (job.status === "queued" || job.status === "running") lines.push("", `Still working. Call wan_status with job_id="${job.job_id}" again later.`);
  return lines.join("\n");
}

/** Adds an MCP resource link for a finished video, so clients can open it without base64 over stdio. */
function withVideoLink(job: WanJob, result: CallToolResult): CallToolResult {
  if (!job.output_uri || !job.output_path) return result;
  result.content.push({
    type: "resource_link",
    uri: job.output_uri,
    name: job.output_path.split(/[\\/]/).pop() ?? "wan-video",
    mimeType: job.output_mime_type ?? "video/mp4",
    description: `Wan clip for job ${job.job_id} (seed ${job.seed})`
  });
  return result;
}

export function registerWanTools(server: McpServer): void {
  server.registerTool(
    "wan_video",
    {
      title: "Wan Video (local)",
      description: `Queue a video clip on the local Wan model through ComfyUI. It is free and private: nothing is sent to Venice.

This call is slow to finish but returns at once: you get { job_id, status: "queued" }, not a video. Do not wait for it. Poll wan_status with the job_id (renders take minutes), and use wan_cancel to stop one.

Wan renders at 16 fps by default, so 81 frames ≈ 5 s. Give frames (snapped to 4k+1) or duration in seconds, not both. Width and height default from the GPU's VRAM: 832x480 under 24 GB, 1280x720 from 24 GB. Pass start_image (a local file path, or an image name already in ComfyUI's input folder) for image-to-video. The seed is always returned, so a result can be reproduced.

Examples:
  - "A paper boat drifting down a rain gutter, macro shot" -> prompt=that text
  - "Animate this photo: the clouds drift" -> prompt=..., start_image="/path/photo.png"
  - "A 3-second clip" -> duration=3`,
      inputSchema: z.strictObject({
        prompt: z.string().min(1).max(2_000).describe("What happens in the clip: subject, action, setting, camera, style"),
        negative_prompt: z.string().max(2_000).optional().describe("What to avoid. Defaults to a standard Wan quality negative"),
        width: z.number().int().min(256).max(1_920).multipleOf(16).optional().describe("Width in pixels, a multiple of 16. Defaults from VRAM"),
        height: z.number().int().min(256).max(1_920).multipleOf(16).optional().describe("Height in pixels, a multiple of 16. Defaults from VRAM"),
        frames: z.number().int().min(5).max(MAX_FRAMES).optional().describe(`Frame count, snapped to 4k+1. Default ${DEFAULT_FRAMES} (≈5 s at 16 fps)`),
        duration: z.number().min(0.3).max(15).optional().describe("Clip length in seconds, converted to frames at the workflow's fps. Use instead of frames"),
        seed: z.number().int().min(0).max(Number.MAX_SAFE_INTEGER).optional().describe("Seed for a reproducible result. Random (and returned) when omitted"),
        start_image: z.string().min(1).max(10_000).optional().describe("First frame for image-to-video: a local file path, file:// URL, data:image URI, or an image name in ComfyUI's input folder"),
        steps: z.number().int().min(1).max(100).optional().describe("Sampling steps (bundled workflow default 30)"),
        cfg: z.number().min(0).max(30).optional().describe("Prompt guidance (bundled workflow default 6)"),
        sampler: z.string().max(64).optional().describe("ComfyUI sampler name, e.g. 'uni_pc' (default), 'euler', 'dpmpp_2m'"),
        response_format: responseFormatField
      }),
      annotations: LOCAL_GENERATES
    },
    async ({ response_format, frames, duration, ...rest }, ctx) => {
      if (frames !== undefined && duration !== undefined) throw new Error("Give frames or duration, not both.");
      const job = await queueWanVideo(
        { ...rest, ...(frames !== undefined ? { frames } : {}), ...(duration !== undefined ? { duration } : {}) },
        ctx.mcpReq.signal
      );
      if (response_format === ResponseFormat.JSON) {
        return jsonResult({
          job_id: job.job_id,
          status: "queued",
          seed: job.seed,
          width: job.width,
          height: job.height,
          frames: job.frames,
          fps: job.fps,
          duration_seconds: job.duration_seconds,
          model: job.model,
          workflow: job.workflow,
          defaults_reason: job.defaults_reason ?? null,
          warnings: job.warnings
        });
      }
      const lines = [
        `Queued Wan job ${job.job_id} (status: queued).`,
        `${job.width}x${job.height}, ${job.frames} frames at ${job.fps} fps (${job.duration_seconds} s), seed ${job.seed}, model ${job.model}.`,
        ...job.warnings.map(warning => `Warning: ${warning}`),
        "",
        `This takes minutes. Poll wan_status with job_id="${job.job_id}"; do not wait on this call.`
      ];
      return textResult(lines.join("\n"));
    }
  );

  server.registerTool(
    "wan_status",
    {
      title: "Wan Job Status (local)",
      description: `Check a local Wan video job: queued (with queue position), rendering (with step progress), completed (with the saved file path and a resource link), failed, cancelled, or timed_out. When a render finishes, the video is saved to ${wanConfig.outputDir}.

With no job_id, lists this server's recent jobs and the runner's GPU, VRAM-based defaults and installed Wan checkpoints. Use that to check the local setup.`,
      inputSchema: z.strictObject({
        job_id: jobIdField.optional(),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false }
    },
    async ({ job_id, response_format }, ctx) => {
      if (job_id) {
        const job = await getJobStatus(job_id, ctx.mcpReq.signal);
        const result = response_format === ResponseFormat.JSON ? jsonResult({ ...job }) : textResult(jobMarkdown(job));
        return withVideoLink(job, result);
      }

      // Overview: the runner plus recent jobs. A down runner is reported, not thrown, so the job list still shows.
      let runner: Record<string, unknown>;
      try {
        const profile = await getRunnerProfile(ctx.mcpReq.signal);
        const defaults = (mode: "t2v" | "i2v") => {
          try {
            const chosen = chooseDefaults(profile, mode, !(mode === "t2v" ? wanConfig.workflowT2V : wanConfig.workflowI2V) || Boolean(wanConfig.model));
            return { width: chosen.width, height: chosen.height, model: chosen.checkpoint?.file ?? "from workflow", reason: chosen.reason };
          } catch (error) {
            return { error: error instanceof Error ? error.message : String(error) };
          }
        };
        runner = {
          reachable: true,
          base_url: wanConfig.baseUrl,
          gpu: profile.gpu ?? null,
          vram_gb: profile.vramGB ?? null,
          text_to_video: defaults("t2v"),
          image_to_video: defaults("i2v"),
          checkpoints: profile.checkpoints.map(checkpoint => ({
            file: checkpoint.file,
            size: checkpoint.params ? `${checkpoint.params}B` : "unknown",
            task: checkpoint.mode,
            family: checkpoint.family,
            quantized: checkpoint.quantized
          }))
        };
      } catch (error) {
        runner = { reachable: false, base_url: wanConfig.baseUrl, error: error instanceof Error ? error.message : String(error) };
      }
      const recent = listJobs().slice(0, 20).map(job => ({ job_id: job.job_id, status: job.status, prompt: job.prompt.slice(0, 80), output_path: job.output_path ?? null }));
      if (response_format === ResponseFormat.JSON) return jsonResult({ runner, jobs: recent });

      const lines = ["# Local Wan runner", `- ComfyUI: ${wanConfig.baseUrl} (${runner.reachable ? "reachable" : "not reachable"})`];
      if (!runner.reachable) {
        lines.push(`- ${runner.error}`);
      } else {
        lines.push(`- GPU: ${runner.gpu ?? "none reported"}${runner.vram_gb ? ` (${runner.vram_gb} GB VRAM)` : ""}`);
        for (const [label, key] of [["Text-to-video", "text_to_video"], ["Image-to-video", "image_to_video"]] as const) {
          const entry = runner[key] as { reason?: string; error?: string };
          lines.push(`- ${label}: ${entry.reason ?? entry.error}`);
        }
        const checkpoints = runner.checkpoints as { file: string; size: string; task: string; family: string; quantized: boolean }[];
        lines.push(`- Wan checkpoints: ${checkpoints.length ? checkpoints.map(c => `${c.file} (${c.size} ${c.task}${c.quantized ? ", quantized" : ""})`).join("; ") : "none installed"}`);
      }
      lines.push("", `## Jobs (${recent.length})`);
      if (recent.length === 0) lines.push("No jobs queued by this server yet.");
      for (const job of recent) lines.push(`- \`${job.job_id}\` ${job.status}: ${job.prompt}${job.output_path ? ` → ${job.output_path}` : ""}`);
      return textResult(lines.join("\n"));
    }
  );

  server.registerTool(
    "wan_cancel",
    {
      title: "Wan Cancel (local)",
      description:
        "Stop a local Wan video job. A job still waiting in ComfyUI's queue is removed from it; a job that is rendering is interrupted. Jobs that already finished are left as they are.",
      inputSchema: z.strictObject({ job_id: jobIdField, response_format: responseFormatField }),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false }
    },
    async ({ job_id, response_format }, ctx) => {
      const { job, action } = await cancelJob(job_id, ctx.mcpReq.signal);
      if (response_format === ResponseFormat.JSON) return jsonResult({ job_id, status: job.status, action });
      const text =
        action === "dequeued"
          ? `Removed job ${job_id} from ComfyUI's queue before it started.`
          : action === "interrupted"
            ? `Interrupted job ${job_id} while it was rendering.`
            : `Job ${job_id} is already ${job.status}; nothing to cancel.`;
      return textResult(text);
    }
  );
}
