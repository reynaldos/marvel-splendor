"use client";

import { useState } from "react";
import { cn } from "cn";
import { toast } from "sonner";

import { CardView } from "@/components/game/Card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Card } from "@/lib/engine/types";
import { dealTeam, DEFAULT_OPTIONS, DRAWERS, MAX_SQUAD, squadSetting, STYLES, type Drawer, type Setting, type SquadOptions, type Style } from "@/lib/squad-settings";

const SELECT = "h-9 rounded-md border border-border bg-cosmos-950/70 px-2 text-sm font-bold";
const OPTION_LABELS: Record<Exclude<keyof SquadOptions, "style">, string> = {
  images: "Card art",
  looks: "Looks, read by OpenAI",
  names: "Names of characters and place",
};

interface SquadPicDemoProps {
  /** Every card with a picture, to deal or pick from. */
  cards: Card[];
  /** The team dealt on the server, and its setting, so the first paint matches. */
  initial: Card[];
  initialSetting: Setting;
}

/** Draws the squad pic for a team, dealt, shuffled or picked by hand, and shows it with a way to save it. */
export function SquadPicDemo({ cards, initial, initialSetting }: SquadPicDemoProps) {
  const byId = new Map(cards.map((c) => [c.id, c]));
  const [team, setTeam] = useState<Card[]>(initial);
  // Picked once per team, here and not in render: a random pick would differ between server and browser.
  const [setting, setSetting] = useState<Setting>(initialSetting);
  const [png, setPng] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [drawer, setDrawer] = useState<Drawer>("openai");
  const [opts, setOpts] = useState<SquadOptions>(DEFAULT_OPTIONS);

  const changeTeam = (next: Card[]) => {
    setTeam(next);
    setSetting(squadSetting(next));
    setPng(null);
  };

  const draw = async () => {
    setDrawing(true);
    try {
      const res = await fetch("/api/preview/squad-pic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardIds: team.map((c) => c.id), setting, drawer, ...opts }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? `The picture was not drawn (${res.status}).`);
      setPng(body.png);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not reach the server.");
    } finally {
      setDrawing(false);
    }
  };

  const togglePick = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < MAX_SQUAD ? [...p, id] : p));

  return (
    <div className="flex h-full w-full items-center gap-6">
      <div className="flex h-full w-64 shrink-0 flex-col gap-2 overflow-y-auto">
        <p className="text-xs font-bold tracking-widest text-cosmos-300 uppercase">The squad</p>
        <ul className="grid grid-cols-2 gap-x-2 text-xs font-bold">
          {team.map((c) => (
            <li key={c.id}>{c.name}</li>
          ))}
        </ul>
        <p className="text-sm font-bold text-cosmos-300">Setting: {setting}</p>
        <select aria-label="Style" value={opts.style} disabled={drawing} onChange={(e) => setOpts({ ...opts, style: e.target.value as Style })} className={SELECT}>
          {Object.entries(STYLES).map(([id, { name }]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        {(Object.keys(OPTION_LABELS) as Array<keyof typeof OPTION_LABELS>).map((key) => (
          <label key={key} className="flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              checked={opts[key]}
              disabled={drawing}
              onChange={(e) => setOpts({ ...opts, [key]: e.target.checked })}
              className="size-4 accent-gold-400"
            />
            {OPTION_LABELS[key]}
          </label>
        ))}
        <select
          aria-label="Image model"
          value={drawer}
          disabled={drawing}
          onChange={(e) => setDrawer(e.target.value as Drawer)}
          className={SELECT}
        >
          {Object.entries(DRAWERS).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <Button type="button" onClick={draw} disabled={drawing}>
          {drawing ? "Drawing…" : png ? "Draw it again" : "Draw the squad pic"}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="flex-1" disabled={drawing} onClick={() => changeTeam(dealTeam(cards))}>
            Shuffle
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={drawing}
            onClick={() => {
              setPicked(team.map((c) => c.id));
              setPicking(true);
            }}
          >
            Pick the team
          </Button>
        </div>
        {png ? (
          <a href={`data:image/png;base64,${png}`} download="squad.png" className="text-sm font-bold text-gold-400 underline">
            Save the picture
          </a>
        ) : null}
      </div>
      <div className="flex aspect-[3/2] h-full max-w-full items-center justify-center overflow-hidden rounded-xl bg-cosmos-950/70 ring-1 ring-gold-400/40">
        {png ? (
          // eslint-disable-next-line @next/next/no-img-element -- a picture just drawn, not an asset to optimise
          <img src={`data:image/png;base64,${png}`} alt="The squad" className="size-full object-contain" />
        ) : (
          <p className="text-sm font-bold text-cosmos-300">{drawing ? "The model is drawing, about a minute." : "No picture yet."}</p>
        )}
      </div>

      <Dialog open={picking} onOpenChange={setPicking}>
        <DialogContent className="theme-cosmos dark max-h-[calc(var(--screen-h)*0.9)] gap-3 overflow-y-auto border-2 border-gold-400 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Pick the team</DialogTitle>
            <DialogDescription>
              Tap cards to put them in or out. {picked.length} of {MAX_SQUAD} picked.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-8 gap-2">
            {cards.map((c) => {
              const on = picked.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={on}
                  title={c.name}
                  onClick={() => togglePick(c.id)}
                  className={cn("rounded-md transition-opacity", on ? "ring-3 ring-gold-400" : "opacity-50 hover:opacity-80")}
                >
                  <CardView card={c} className="w-full" />
                </button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={picked.length === 0}
              onClick={() => {
                changeTeam(picked.map((id) => byId.get(id)!));
                setPicking(false);
              }}
            >
              Use these {picked.length}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
