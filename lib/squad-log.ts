/**
 * A record of every squad pic draw, to find what each model's checker
 * refuses. One line per draw in squad-log/log.jsonl, and each picture kept
 * next to it in squad-log/pics/. Local only, the folder is not committed.
 */
import { mkdir, appendFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Card } from "./engine/types";
import type { Drawer, Setting, SquadOptions } from "./squad-settings";

const DIR = path.join(process.cwd(), "squad-log");

export interface SquadDraw {
  drawer: Drawer;
  setting: Setting;
  options: SquadOptions;
  cards: readonly Card[];
  startedAt: number;
  png?: string;
  error?: string;
}

export async function logSquadDraw(draw: SquadDraw): Promise<void> {
  const stamp = new Date(draw.startedAt).toISOString().replace(/[:.]/g, "-");
  const picture = draw.png ? `pics/${stamp}-${draw.drawer}.png` : null;
  await mkdir(path.join(DIR, "pics"), { recursive: true });
  if (draw.png && picture) await writeFile(path.join(DIR, picture), Buffer.from(draw.png, "base64"));
  const line = {
    at: new Date(draw.startedAt).toISOString(),
    seconds: Math.round((Date.now() - draw.startedAt) / 1000),
    drawer: draw.drawer,
    style: draw.options.style,
    images: draw.options.images,
    looks: draw.options.looks,
    names: draw.options.names,
    setting: draw.setting,
    cards: draw.cards.map((c) => `${c.id} ${c.name}`),
    outcome: draw.png ? "drawn" : /content|safety|policy|flagged/i.test(draw.error ?? "") ? "refused" : "error",
    error: draw.error ?? null,
    picture,
  };
  await appendFile(path.join(DIR, "log.jsonl"), JSON.stringify(line) + "\n");
}
