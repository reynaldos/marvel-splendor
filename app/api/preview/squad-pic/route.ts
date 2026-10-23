import { NextResponse } from "next/server";
import { z } from "zod";

import { getCard } from "@/lib/engine/data";
import { drawSquadPic } from "@/lib/squad-pic";
import { drawSquadPicComfy } from "@/lib/squad-pic-comfy";
import { drawSquadPicFal } from "@/lib/squad-pic-fal";
import { logSquadDraw } from "@/lib/squad-log";
import { DRAWERS, MAX_SQUAD, SETTINGS, STYLES, type Drawer, type Setting, type Style } from "@/lib/squad-settings";

const Body = z.object({
  cardIds: z.array(z.string().min(1)).min(1).max(MAX_SQUAD),
  setting: z.enum(Object.keys(SETTINGS) as [Setting, ...Setting[]]),
  drawer: z.enum(Object.keys(DRAWERS) as [Drawer, ...Drawer[]]).default("openai"),
  style: z.enum(Object.keys(STYLES) as [Style, ...Style[]]).default("modern"),
  images: z.boolean().default(false),
  looks: z.boolean().default(true),
  names: z.boolean().default(false),
});

// ComfyUI needs no key: it is reached at COMFY_URL, or on this machine when that is unset.
const KEY: Partial<Record<Drawer, string>> = { openai: "OPENAI_API_KEY", google: "FAL_KEY", seedream5: "FAL_KEY", seedream: "FAL_KEY", flux: "FAL_KEY" };

// Demo only: draws a squad pic for the cards sent. Not served in production, as every call costs money.
export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "Not found." }, { status: 404 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Send the team's card ids and a setting." }, { status: 400 });
  const { cardIds, setting, drawer, ...opts } = parsed.data;
  const key = KEY[drawer];
  if (key && !process.env[key]) {
    return NextResponse.json({ error: `Add ${key} to .env to draw with ${DRAWERS[drawer]}.` }, { status: 503 });
  }
  const cards = cardIds.map(getCard);
  const startedAt = Date.now();
  try {
    const png =
      drawer === "openai"
        ? await drawSquadPic(cards, setting, opts)
        : drawer === "comfy"
          ? await drawSquadPicComfy(cards, setting, opts)
          : await drawSquadPicFal(drawer, cards, setting, opts);
    await logSquadDraw({ drawer, setting, options: opts, cards, startedAt, png });
    return NextResponse.json({ png });
  } catch (error) {
    const message = error instanceof Error ? error.message : "The picture was not drawn.";
    await logSquadDraw({ drawer, setting, options: opts, cards, startedAt, error: message });
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
