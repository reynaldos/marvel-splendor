/**
 * The squad pic drawn by FLUX Kontext in ComfyUI, on this machine or any
 * box running it. The workflow is built here, node by node, and sent to
 * ComfyUI's HTTP API. Free per picture; slow on a laptop.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Card } from "./engine/types";
import { castFor } from "./squad-looks";
import { squadPrompt, type Setting, type SquadOptions } from "./squad-settings";

const url = () => process.env.COMFY_URL ?? "http://127.0.0.1:8188";

/** The model files the Kontext template downloads, by the names it gives them. */
const MODELS = {
  unet: "flux1-dev-kontext_fp8_scaled.safetensors",
  clip: "clip_l.safetensors",
  t5: "t5xxl_fp8_e4m3fn_scaled.safetensors",
  vae: "ae.safetensors",
};
// Sized for a 24 GB GPU. Kontext draws best near one megapixel.
const SIZE = { width: 1024, height: 768 };
const STEPS = 20;
const MAX_CARDS = 8;
const POLL_MS = 3000;
const GIVE_UP_MS = 20 * 60 * 1000;

type Node = { class_type: string; inputs: Record<string, unknown> };
type Workflow = Record<string, Node>;

/** Each card goes in as its own reference latent, chained onto the prompt's conditioning. */
export function workflow(prompt: string, images: string[], seed: number): Workflow {
  const w: Workflow = {
    unet: { class_type: "UNETLoader", inputs: { unet_name: MODELS.unet, weight_dtype: "default" } },
    clip: { class_type: "DualCLIPLoader", inputs: { clip_name1: MODELS.clip, clip_name2: MODELS.t5, type: "flux" } },
    vae: { class_type: "VAELoader", inputs: { vae_name: MODELS.vae } },
    text: { class_type: "CLIPTextEncode", inputs: { clip: ["clip", 0], text: prompt } },
    negative: { class_type: "ConditioningZeroOut", inputs: { conditioning: ["text", 0] } },
    latent: { class_type: "EmptySD3LatentImage", inputs: { ...SIZE, batch_size: 1 } },
  };
  let conditioning: [string, number] = ["text", 0];
  images.forEach((image, i) => {
    w[`load${i}`] = { class_type: "LoadImage", inputs: { image } };
    w[`scale${i}`] = { class_type: "FluxKontextImageScale", inputs: { image: [`load${i}`, 0] } };
    w[`encode${i}`] = { class_type: "VAEEncode", inputs: { pixels: [`scale${i}`, 0], vae: ["vae", 0] } };
    w[`ref${i}`] = { class_type: "ReferenceLatent", inputs: { conditioning, latent: [`encode${i}`, 0] } };
    conditioning = [`ref${i}`, 0];
  });
  w.guidance = { class_type: "FluxGuidance", inputs: { conditioning, guidance: 2.5 } };
  w.sampler = {
    class_type: "KSampler",
    inputs: {
      model: ["unet", 0],
      positive: ["guidance", 0],
      negative: ["negative", 0],
      latent_image: ["latent", 0],
      seed,
      steps: STEPS,
      cfg: 1,
      sampler_name: "euler",
      scheduler: "simple",
      denoise: 1,
    },
  };
  w.decode = { class_type: "VAEDecode", inputs: { samples: ["sampler", 0], vae: ["vae", 0] } };
  w.save = { class_type: "SaveImage", inputs: { images: ["decode", 0], filename_prefix: "squad" } };
  return w;
}

async function upload(card: Card): Promise<string> {
  const file = path.join(process.cwd(), "public", card.image!);
  const form = new FormData();
  form.append("image", new Blob([await readFile(file)], { type: "image/png" }), path.basename(file));
  form.append("overwrite", "true");
  const res = await fetch(`${url()}/upload/image`, { method: "POST", body: form });
  if (!res.ok) throw new Error(`ComfyUI would not take ${card.name}'s card: ${res.status}`);
  return ((await res.json()) as { name: string }).name;
}

export async function drawSquadPicComfy(cards: readonly Card[], setting: Setting, opts: SquadOptions): Promise<string> {
  const art = cards.filter((c) => c.image);
  if (art.length === 0) throw new Error("None of these cards has a picture to draw from.");
  if (art.length > MAX_CARDS) throw new Error(`ComfyUI takes up to ${MAX_CARDS} cards.`);
  const prompt = squadPrompt(setting, await castFor(art, opts), opts);
  const images = opts.images ? await Promise.all(art.map(upload)) : [];
  const queued = await fetch(`${url()}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow(prompt, images, Math.floor(Math.random() * 2 ** 32)) }),
  });
  const body = await queued.json().catch(() => null);
  if (!queued.ok) throw new Error(`ComfyUI ${queued.status}: ${JSON.stringify(body?.node_errors ?? body?.error ?? body).slice(0, 300)}`);
  const id = (body as { prompt_id: string }).prompt_id;

  const started = Date.now();
  while (Date.now() - started < GIVE_UP_MS) {
    await new Promise((r) => setTimeout(r, POLL_MS));
    const history = (await (await fetch(`${url()}/history/${id}`)).json()) as Record<string, { status?: { status_str: string; messages: unknown[] }; outputs?: Record<string, { images?: { filename: string; subfolder: string; type: string }[] }> }>;
    const run = history[id];
    if (!run) continue;
    if (run.status?.status_str === "error") throw new Error(`ComfyUI failed: ${JSON.stringify(run.status.messages).slice(0, 300)}`);
    const image = run.outputs?.save?.images?.[0];
    if (!image) continue;
    const q = new URLSearchParams({ filename: image.filename, subfolder: image.subfolder, type: image.type });
    return Buffer.from(await (await fetch(`${url()}/view?${q}`)).arrayBuffer()).toString("base64");
  }
  throw new Error("ComfyUI took too long.");
}
