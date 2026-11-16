import type { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { veniceBinary, veniceJson } from "../api.js";
import { config } from "../config.js";
import { jsonResult, responseFormatField, ResponseFormat, textResult } from "../format.js";
import { generateImage } from "../venice.js";

const GENERATES = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true } as const;

const AUDIO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  opus: "audio/opus",
  aac: "audio/aac",
  flac: "audio/flac",
  pcm: "audio/pcm"
};

const EmbeddingResponseSchema = z.looseObject({
  model: z.string().nullish(),
  data: z.array(z.looseObject({ embedding: z.array(z.number()), index: z.number().nullish() })),
  usage: z.looseObject({ prompt_tokens: z.number().nullish(), total_tokens: z.number().nullish() }).nullish()
});

export function registerMediaTools(server: McpServer): void {
  server.registerTool(
    "venice_generate_image",
    {
      title: "Venice Generate Image",
      description: `Generate images from a text prompt with a Venice.ai image model. Returns the images as image content.

Size: give width and height, or aspect_ratio / resolution on models that use them; Venice validates what each model supports. Style presets come from venice_image_styles, and models from venice_list_models with type="image".

Examples:
  - "A watercolor fox in a misty forest" -> prompt=that text
  - "Four square logo options" -> prompt=..., variants=4, width=1024, height=1024`,
      inputSchema: z.strictObject({
        prompt: z.string().min(1).max(4_000).describe("Detailed description of the image"),
        negative_prompt: z.string().max(4_000).optional().describe("What the image should not contain"),
        model: z.string().optional().describe("Venice image model ID. Defaults to VENICE_IMAGE_MODEL or Venice's default image model"),
        width: z.number().int().min(256).max(2_048).optional().describe("Width in pixels"),
        height: z.number().int().min(256).max(2_048).optional().describe("Height in pixels"),
        aspect_ratio: z.string().optional().describe("Aspect ratio on models that take one, e.g. '16:9'"),
        resolution: z.string().optional().describe("Resolution tier on models that take one, e.g. '1K', '2K'"),
        style_preset: z.string().optional().describe("Style preset name from venice_image_styles"),
        seed: z.number().int().min(0).optional().describe("Seed for reproducible results"),
        steps: z.number().int().min(1).max(50).optional().describe("Inference steps, on models that support it"),
        cfg_scale: z.number().min(0).max(20).optional().describe("How closely to follow the prompt, on models that support it"),
        variants: z.number().int().min(1).max(4).default(1).describe("Number of images to generate"),
        format: z.enum(["webp", "png", "jpeg"]).default("webp").describe("Image file format"),
        safe_mode: z.boolean().default(true).describe("Blur adult content. Set false to allow it where the model permits"),
        hide_watermark: z.boolean().optional().describe("Ask Venice to omit its watermark")
      }),
      annotations: GENERATES
    },
    async (args, ctx) => {
      const result = await generateImage(args, ctx.mcpReq.signal);
      const summary = `Generated ${result.images.length} image(s) with ${result.model}${args.seed !== undefined ? ` (seed ${args.seed})` : ""}.`;
      return textResult(
        summary,
        result.images.map(image => ({ type: "image" as const, data: image.data, mimeType: image.mimeType }))
      );
    }
  );

  server.registerTool(
    "venice_image_styles",
    {
      title: "Venice Image Styles",
      description: "List the style preset names that venice_generate_image accepts in style_preset, such as '3D Model' or 'Anime'.",
      inputSchema: z.strictObject({ response_format: responseFormatField }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ response_format }, ctx) => {
      const raw = await veniceJson("image/styles", {}, ctx.mcpReq.signal);
      const parsed = z.looseObject({ data: z.array(z.string()) }).safeParse(raw);
      if (!parsed.success) throw new Error("Venice returned the style list in an unexpected shape. Retry shortly.");
      const styles = parsed.data.data;
      if (response_format === ResponseFormat.JSON) return jsonResult({ count: styles.length, styles });
      return textResult(`# Venice image styles (${styles.length})\n\n${styles.map(style => `- ${style}`).join("\n")}`);
    }
  );

  server.registerTool(
    "venice_text_to_speech",
    {
      title: "Venice Text to Speech",
      description: `Convert text to speech with a Venice.ai voice model. Returns the audio as audio content.

Defaults: model ${config.ttsModel}, voice ${config.ttsVoice}. Kokoro voice IDs look like af_sky, am_adam, bf_emma, bm_george (prefix: a=American/b=British, f=female/m=male). List TTS models with venice_list_models type="tts".

Example: "Read this paragraph aloud" -> input=the paragraph`,
      inputSchema: z.strictObject({
        input: z.string().min(1).max(4_096).describe("Text to speak (up to 4096 characters)"),
        voice: z.string().optional().describe(`Voice ID. Defaults to ${config.ttsVoice}`),
        model: z.string().optional().describe(`TTS model ID. Defaults to ${config.ttsModel}`),
        speed: z.number().min(0.25).max(4).default(1).describe("Playback speed, 0.25 to 4"),
        audio_format: z.enum(["mp3", "wav", "opus", "aac", "flac", "pcm"]).default("mp3").describe("Audio file format")
      }),
      annotations: GENERATES
    },
    async ({ input, voice, model, speed, audio_format }, ctx) => {
      const audio = await veniceBinary(
        "audio/speech",
        { input, voice: voice ?? config.ttsVoice, model: model ?? config.ttsModel, speed, response_format: audio_format },
        ctx.mcpReq.signal,
        AUDIO_MIME[audio_format] ?? "audio/mpeg"
      );
      return textResult(`Generated ${Math.round(audio.bytes / 1024)} KB of ${audio_format} speech with voice ${voice ?? config.ttsVoice}.`, [
        { type: "audio", data: audio.data, mimeType: audio.mimeType }
      ]);
    }
  );

  server.registerTool(
    "venice_embeddings",
    {
      title: "Venice Embeddings",
      description: `Compute embedding vectors for up to 16 texts with a Venice.ai embedding model (default ${config.embeddingModel}).

Markdown output gives the dimensions and a short preview of each vector; use response_format="json" for the full vectors, which are large (thousands of numbers per text). Use it to compare texts by meaning, cluster them, or build a search index.`,
      inputSchema: z.strictObject({
        input: z
          .union([z.string().min(1).max(32_000), z.array(z.string().min(1).max(32_000)).min(1).max(16)])
          .describe("A text, or an array of up to 16 texts"),
        model: z.string().optional().describe(`Embedding model ID. Defaults to ${config.embeddingModel}`),
        dimensions: z.number().int().min(1).max(8_192).optional().describe("Shorter output vectors, on models that support it"),
        response_format: responseFormatField
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true }
    },
    async ({ input, model, dimensions, response_format }, ctx) => {
      const raw = await veniceJson(
        "embeddings",
        {
          body: {
            input,
            model: model ?? config.embeddingModel,
            encoding_format: "float",
            ...(dimensions ? { dimensions } : {})
          }
        },
        ctx.mcpReq.signal
      );
      const parsed = EmbeddingResponseSchema.safeParse(raw);
      if (!parsed.success) throw new Error("Venice returned embeddings in an unexpected shape. Check that the model is an embedding model.");
      const data = parsed.data;
      const vectors = [...data.data].sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).map(item => item.embedding);
      const usedModel = data.model ?? model ?? config.embeddingModel;
      const dims = vectors[0]?.length ?? 0;

      if (response_format === ResponseFormat.JSON) {
        return jsonResult({ model: usedModel, count: vectors.length, dimensions: dims, embeddings: vectors, usage: data.usage ?? null });
      }
      const lines = [`# Embeddings from ${usedModel}`, `${vectors.length} vector(s), ${dims} dimensions each.`, ""];
      vectors.forEach((vector, index) => {
        lines.push(`${index + 1}. [${vector.slice(0, 6).map(value => value.toFixed(4)).join(", ")}, …]`);
      });
      lines.push("", "Call again with response_format='json' for the full vectors.");
      return textResult(lines.join("\n"));
    }
  );
}
