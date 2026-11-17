import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { videoConfig, wanConfig } from "../config.js";
import { jsonResult, responseFormatField, ResponseFormat, textResult } from "../format.js";
import { getVideoStatus, listVideoJobs, startVideo, VideoRequestError, type VideoJob } from "../video.js";

const usd = (value: number | null) => (value === null ? "unknown" : `$${value.toFixed(2)}`);

/** A refusal with a specific meaning, as an error result carrying the fields behind it. */
function refusal(error: VideoRequestError): CallToolResult {
  return { isError: true, content: [{ type: "text", text: error.message }], structuredContent: { error: error.kind, message: error.message, ...error.fields } };
}

function statusLine(job: VideoJob): string {
  if (job.status === "processing" && job.progress) {
    const eta = job.progress.estimated_percent !== undefined ? `, about ${job.progress.estimated_percent}% of the usual ${job.progress.estimated_total_seconds} s` : "";
    return `rendering on Venice (${job.progress.elapsed_seconds} s elapsed${eta})`;
  }
  return job.status.replace("_", " ");
}

function jobMarkdown(job: VideoJob): string {
  const lines = [`# Venice video ${job.queue_id}`, `- Status: **${statusLine(job)}**`];
  if (job.output_path) lines.push(`- Video: ${job.output_path}`);
  if (job.error) lines.push(`- ${job.status === "timed_out" ? "Note" : "Error"}: ${job.error}`);
  lines.push(`- Model: ${job.model} · ${job.duration_seconds ? `${job.duration_seconds} s` : "duration unknown"}${job.resolution ? ` · ${job.resolution}` : ""}${job.aspect_ratio ? ` · ${job.aspect_ratio}` : ""}`);
  if (job.quote_usd !== null) lines.push(`- Quoted price: ${usd(job.quote_usd)} (billed to your Venice account)`);
  if (job.server_media_deleted !== undefined) lines.push(`- Venice's stored copy: ${job.server_media_deleted ? "released" : "not confirmed released"}`);
  for (const warning of job.warnings) lines.push(`- Warning: ${warning}`);
  if (job.status === "queued" || job.status === "processing") lines.push("", `Still working. Call venice_video_status with queue_id="${job.queue_id}" again later.`);
  return lines.join("\n");
}

export function registerVideoTools(server: McpServer): void {
  server.registerTool(
    "venice_video",
    {
      title: "Venice Video (hosted, billed)",
      description: `Generate a video with Venice's hosted Wan model. This is billed to the Venice account. For a free, private clip on your own GPU use wan_video instead.

It quotes the price, queues the job on Venice, and returns at once with { queue_id, quote_usd }: the render takes minutes. Do not wait for it. A background poller fetches the finished file into ${wanConfig.outputDir}, and venice_video_status with the queue_id shows progress and the saved path. There is no way to cancel a queued video.

duration is in seconds (1-30) and each model accepts only certain lengths. model, aspect_ratio and resolution are optional: the model is chosen from Venice's live catalog (IDs starting "${videoConfig.modelPrefix}"; image-to-video when image_url is given), and unset values use Venice's defaults. image_url (an https URL or a data: URI) turns it into image-to-video. Prefer an https URL: Venice's request limit is 25 MB, but the MCP transport caps a whole message far lower (about 10 MB over stdio, 4 MB over HTTP), so only small images fit as a data: URI.

Pass max_usd to cap the price: the video is only queued if the quote is at or below it (an unreadable quote also stops it). Unlike local Wan, hosted Wan can generate native audio. Refusals are specific: over your price limit, out of credits (with the balance), consent required (with Venice's policy text and version; this tool never consents for the user), payload over 25 MB, or a rejected prompt (with Venice's suggested prompt when it has one).

Examples:
  - "A 5-second clip of waves at dusk" -> prompt=that text, duration=5
  - "Animate this photo" -> prompt=..., duration=5, image_url="https://example.com/photo.jpg"`,
      inputSchema: z.strictObject({
        prompt: z.string().min(1).max(4_096).describe("What happens in the clip: subject, action, setting, camera, style"),
        duration: z.number().int().min(1).max(30).describe("Clip length in whole seconds, 1-30. Sent to Venice as e.g. '5s'; each model accepts only certain lengths"),
        model: z.string().max(100).optional().describe(`Venice video model ID. Must start with "${videoConfig.modelPrefix}". Defaults to the catalog's text-to-video (or image-to-video) model`),
        aspect_ratio: z.string().max(16).optional().describe("Aspect ratio such as '16:9' or '9:16'. Model-specific; Venice rejects unsupported values"),
        resolution: z.string().max(16).optional().describe("Resolution such as '720p' or '1080p'. Model-specific; Venice rejects unsupported values"),
        negative_prompt: z.string().max(4_096).optional().describe("What to avoid"),
        max_usd: z.number().positive().max(1_000).optional().describe("Price limit in USD. If Venice's quote is above it, or cannot be read, the video is not queued"),
        image_url: z.string().max(10_000_000).optional().describe("First frame for image-to-video: an https URL (preferred) or a small data:image URI. Venice limits a request to 25 MB, and the MCP transport limits a message to less than that"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true }
    },
    async ({ response_format, ...request }, ctx) => {
      let job: VideoJob;
      try {
        job = await startVideo(request, ctx.mcpReq.signal);
      } catch (error) {
        if (error instanceof VideoRequestError) return refusal(error);
        throw error;
      }
      if (response_format === ResponseFormat.JSON) {
        return jsonResult({
          queue_id: job.queue_id,
          status: "queued",
          quote_usd: job.quote_usd,
          model: job.model,
          duration_seconds: job.duration_seconds,
          aspect_ratio: job.aspect_ratio ?? null,
          resolution: job.resolution ?? null,
          warnings: job.warnings
        });
      }
      return textResult(
        [
          `Queued Venice video ${job.queue_id} on ${job.model} (${job.duration_seconds} s). Quoted price: ${usd(job.quote_usd)}, billed to your Venice account.`,
          ...job.warnings.map(warning => `Warning: ${warning}`),
          "",
          `This renders on Venice's servers for minutes. Poll venice_video_status with queue_id="${job.queue_id}"; do not wait on this call.`
        ].join("\n")
      );
    }
  );

  server.registerTool(
    "venice_video_status",
    {
      title: "Venice Video Status (hosted)",
      description: `Check a hosted Venice video job: queued, rendering (with Venice's progress estimate), completed (with the saved file path and a resource link), failed, or timed_out. A finished video is saved to ${wanConfig.outputDir}, and Venice's stored copy is released once it has been saved.

With no queue_id, lists this server's recent hosted jobs. To check a job this server did not queue (for example from before a restart), pass its queue_id and the model it was queued with.`,
      inputSchema: z.strictObject({
        queue_id: z.string().min(1).max(200).optional().describe("queue_id returned by venice_video"),
        model: z.string().max(100).optional().describe("Only needed for a job this server did not queue: the model it used"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ queue_id, model, response_format }, ctx) => {
      if (queue_id) {
        const job = await getVideoStatus(queue_id, model, ctx.mcpReq.signal);
        const result = response_format === ResponseFormat.JSON ? jsonResult({ ...job }) : textResult(jobMarkdown(job));
        if (job.output_uri && job.output_path) {
          result.content.push({
            type: "resource_link",
            uri: job.output_uri,
            name: job.output_path.split(/[\\/]/).pop() ?? "venice-video",
            mimeType: job.output_mime_type ?? "video/mp4",
            description: `Venice video ${job.queue_id}`
          });
        }
        return result;
      }
      const recent = listVideoJobs().slice(0, 20).map(job => ({ queue_id: job.queue_id, status: job.status, model: job.model, prompt: job.prompt.slice(0, 80), quote_usd: job.quote_usd, output_path: job.output_path ?? null }));
      if (response_format === ResponseFormat.JSON) return jsonResult({ jobs: recent });
      const lines = [`# Hosted Venice video jobs (${recent.length})`];
      if (recent.length === 0) lines.push("No hosted video jobs queued by this server yet.");
      for (const job of recent) lines.push(`- \`${job.queue_id}\` ${job.status} (${job.model}, ${usd(job.quote_usd)}): ${job.prompt}${job.output_path ? ` → ${job.output_path}` : ""}`);
      return textResult(lines.join("\n"));
    }
  );
}
