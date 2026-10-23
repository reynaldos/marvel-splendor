/**
 * The squad pic drawn by a model hosted on fal.ai, from the same card art and
 * prompt as the OpenAI one. Costs money per picture.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { Card } from "./engine/types";
import { castFor } from "./squad-looks";
import { DRAWERS, squadPrompt, type FalDrawer, type Setting, type SquadOptions } from "./squad-settings";

/** Each model's endpoints, with and without reference pictures, how many cards it takes, and the output asked for. */
const FAL_MODELS: Record<FalDrawer, { edit: string; text: string; maxCards: number; input: Record<string, unknown> }> = {
  // fal counts each input as a megapixel and allows nine in all, output included.
  flux: { edit: "fal-ai/flux-2-pro/edit", text: "fal-ai/flux-2-pro", maxCards: 8, input: { image_size: { width: 1024, height: 768 }, output_format: "png" } },
  google: { edit: "fal-ai/nano-banana-pro/edit", text: "fal-ai/nano-banana-pro", maxCards: 12, input: { aspect_ratio: "3:2", resolution: "1K", output_format: "png" } },
  seedream5: { edit: "bytedance/seedream/v5/pro/edit", text: "bytedance/seedream/v5/pro/text-to-image", maxCards: 10, input: { image_size: { width: 1536, height: 1024 }, output_format: "png" } },
  // Seedream 4.5 wants at least 3.7 megapixels out.
  seedream: { edit: "fal-ai/bytedance/seedream/v4.5/edit", text: "fal-ai/bytedance/seedream/v4.5/text-to-image", maxCards: 10, input: { image_size: { width: 2560, height: 1707 } } },
};

// ponytail: the cards go up as data URIs, since the dev box has no public address. Point
// image_urls at the served files once the art is on a host fal can reach.
export async function drawSquadPicFal(drawer: FalDrawer, cards: readonly Card[], setting: Setting, opts: SquadOptions): Promise<string> {
  const model = FAL_MODELS[drawer];
  const art = cards.filter((c) => c.image);
  if (art.length === 0) throw new Error("None of these cards has a picture to draw from.");
  if (art.length > model.maxCards) throw new Error(`This model takes up to ${model.maxCards} cards.`);
  const prompt = squadPrompt(setting, await castFor(art, opts), opts);
  const image_urls = opts.images
    ? await Promise.all(
        art.map(async (c) => `data:image/png;base64,${(await readFile(path.join(process.cwd(), "public", c.image!))).toString("base64")}`),
      )
    : undefined;
  const res = await fetch(`https://fal.run/${opts.images ? model.edit : model.text}`, {
    method: "POST",
    headers: { Authorization: `Key ${process.env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...model.input, prompt, image_urls, sync_mode: true }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail?.[0]?.msg ?? (body?.detail ? JSON.stringify(body.detail).slice(0, 300) : res.statusText);
    throw new Error(`${DRAWERS[drawer]} ${res.status}: ${detail}`);
  }
  // With sync_mode the picture comes back as a data URI.
  const url: string | undefined = body?.images?.[0]?.url;
  if (!url?.startsWith("data:")) throw new Error(`${DRAWERS[drawer]} returned no picture.`);
  return url.slice(url.indexOf(",") + 1);
}
