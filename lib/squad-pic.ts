/**
 * The "squad pic": a picture of the team a player recruited, drawn by
 * OpenAI's image model. Costs money per picture.
 */
import { createReadStream } from "node:fs";
import path from "node:path";

import OpenAI, { toFile } from "openai";

import type { Card } from "./engine/types";
import { castFor } from "./squad-looks";
import { squadPrompt, type Setting, type SquadOptions } from "./squad-settings";

// ponytail: medium quality for the demo (a few cents a picture); the real feature can pick its own.
export async function drawSquadPic(cards: readonly Card[], setting: Setting, opts: SquadOptions): Promise<string> {
  const art = cards.filter((c) => c.image);
  if (art.length === 0) throw new Error("None of these cards has a picture to draw from.");
  const prompt = squadPrompt(setting, await castFor(art, opts), opts);
  const client = new OpenAI();
  const shared = { model: "gpt-image-2", prompt, size: "1536x1024" as const, quality: "medium" as const };
  const result = opts.images
    ? await client.images.edit({
        ...shared,
        image: await Promise.all(
          art.map((c) => {
            const file = path.join(process.cwd(), "public", c.image!);
            return toFile(createReadStream(file), path.basename(file), { type: "image/png" });
          }),
        ),
      })
    : await client.images.generate(shared);
  const png = result.data?.[0]?.b64_json;
  if (!png) throw new Error("The image model returned no picture.");
  return png;
}
