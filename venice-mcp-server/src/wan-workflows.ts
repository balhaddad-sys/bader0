/**
 * Bundled ComfyUI workflows (API format) for Wan 2.1 text-to-video and image-to-video,
 * built from ComfyUI's native nodes. The node IDs here are arbitrary: wan.ts finds every
 * node by class_type, so a workflow re-exported from ComfyUI (WAN_WORKFLOW_T2V / _I2V)
 * with different IDs works the same way.
 *
 * File names are the ones ComfyUI's Wan examples use. Missing text encoders and VAEs are
 * swapped for an installed equivalent at queue time; the diffusion model is chosen from VRAM.
 */

export interface WorkflowNode {
  class_type: string;
  inputs: Record<string, unknown>;
  _meta?: { title?: string };
}

export type Workflow = Record<string, WorkflowNode>;

const shared = (positiveLink: [string, number], negativeLink: [string, number], latentLink: [string, number]): Workflow => ({
  "1": { class_type: "UNETLoader", inputs: { unet_name: "wan2.1_t2v_1.3B_fp16.safetensors", weight_dtype: "default" } },
  "2": { class_type: "CLIPLoader", inputs: { clip_name: "umt5_xxl_fp8_e4m3fn_scaled.safetensors", type: "wan", device: "default" } },
  "3": { class_type: "VAELoader", inputs: { vae_name: "wan_2.1_vae.safetensors" } },
  "4": { class_type: "ModelSamplingSD3", inputs: { shift: 8, model: ["1", 0] } },
  "5": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["2", 0] }, _meta: { title: "Positive Prompt" } },
  "6": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["2", 0] }, _meta: { title: "Negative Prompt" } },
  "8": {
    class_type: "KSampler",
    inputs: {
      seed: 0,
      steps: 30,
      cfg: 6,
      sampler_name: "uni_pc",
      scheduler: "simple",
      denoise: 1,
      model: ["4", 0],
      positive: positiveLink,
      negative: negativeLink,
      latent_image: latentLink
    }
  },
  "9": { class_type: "VAEDecode", inputs: { samples: ["8", 0], vae: ["3", 0] } },
  "10": { class_type: "CreateVideo", inputs: { images: ["9", 0], fps: 16 } },
  "11": { class_type: "SaveVideo", inputs: { video: ["10", 0], filename_prefix: "venice-mcp/wan", format: "mp4", codec: "h264" } }
});

export function bundledTextToVideo(): Workflow {
  return {
    ...shared(["5", 0], ["6", 0], ["7", 0]),
    "7": { class_type: "EmptyHunyuanLatentVideo", inputs: { width: 832, height: 480, length: 81, batch_size: 1 } }
  };
}

export function bundledImageToVideo(): Workflow {
  const workflow: Workflow = {
    ...shared(["7", 0], ["7", 1], ["7", 2]),
    "12": { class_type: "CLIPVisionLoader", inputs: { clip_name: "clip_vision_h.safetensors" } },
    "13": { class_type: "LoadImage", inputs: { image: "start.png" } },
    "14": { class_type: "CLIPVisionEncode", inputs: { clip_vision: ["12", 0], image: ["13", 0], crop: "none" } },
    "7": {
      class_type: "WanImageToVideo",
      inputs: {
        positive: ["5", 0],
        negative: ["6", 0],
        vae: ["3", 0],
        clip_vision_output: ["14", 0],
        start_image: ["13", 0],
        width: 832,
        height: 480,
        length: 81,
        batch_size: 1
      }
    }
  };
  workflow["1"]!.inputs.unet_name = "wan2.1_i2v_480p_14B_fp8_e4m3fn.safetensors";
  return workflow;
}
