"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Bot, Hourglass, Star, UsersRound } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { Option } from "@/components/lobby/Option";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Stage, StageRows } from "@/components/Stage";
import { BOT_DIFFICULTIES } from "@/lib/engine/types";
import { POINT_OPTIONS, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

/** A setting and the values it steps through; `null` is shown as "Off". */
export const SOLO_OPTIONS = {
  playerCount: { label: "Players", values: [2, 3, 4], show: (v: number) => `${v}` },
  botDifficulty: {
    label: "Bot level",
    values: [...BOT_DIFFICULTIES],
    show: (v: string) => v[0].toUpperCase() + v.slice(1),
  },
  targetPoints: { label: "Points to win", values: POINT_OPTIONS, show: (v: number) => `${v}` },
  turnTimeSeconds: { label: "Turn time", values: [...TURN_TIME_OPTIONS, null], show: (v: number) => `${v} sec` },
  gameTimeMinutes: { label: "Game clock", values: [null, 10, 20, 30], show: (v: number) => `${v} min` },
} as const;

type Setting = keyof typeof SOLO_OPTIONS;
type Picks = { [K in Setting]: number };

/** Where each setting starts, as a place in its list: the first value, except the bot on normal. */
const START: Picks = { playerCount: 0, botDifficulty: 1, targetPoints: 0, turnTimeSeconds: 0, gameTimeMinutes: 0 };

const ICON = "size-24";
const ICONS: Record<Setting, ReactNode> = {
  playerCount: <UsersRound className={`${ICON} fill-gold-400 text-gold-600`} />,
  botDifficulty: <Bot className={`${ICON} text-gold-400`} />,
  targetPoints: <Star className={`${ICON} fill-gold-400 text-gold-600`} />,
  turnTimeSeconds: <TimerIcon className={ICON} />,
  gameTimeMinutes: <Hourglass className={`${ICON} text-gold-400`} />,
};

/** What is sent to start the game. */
export function soloSettings(picks: Picks) {
  return Object.fromEntries(
    (Object.keys(SOLO_OPTIONS) as Setting[]).map((key) => [key, SOLO_OPTIONS[key].values[picks[key]]]),
  );
}

/** Setting up a game against the computer: tap a setting to step through its values. */
export function SoloGameScreen() {
  const router = useRouter();
  const [picks, setPicks] = useState(START);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<ReactNode>(null);

  async function start() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(soloSettings(picks)),
      });
      if (res.status === 401) {
        setError(
          <a href="/auth/login?returnTo=/solo" className="underline">
            Sign in again to play
          </a>,
        );
        setSubmitting(false);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Could not create the game.");
        setSubmitting(false);
        return;
      }
      const data: { id: string } = await res.json();
      router.push(`/play/${data.id}`);
    } catch {
      setError("Could not reach the server. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <Stage>
      <StageRows>
        <div className="flex justify-evenly">
          {(Object.keys(SOLO_OPTIONS) as Setting[]).map((key) => {
            const { label, values, show } = SOLO_OPTIONS[key];
            const value = values[picks[key]];
            return (
              <Option
                key={key}
                icon={ICONS[key]}
                label={label}
                value={value === null ? "Off" : (show as (v: unknown) => string)(value)}
                onNext={() => setPicks((p) => ({ ...p, [key]: (p[key] + 1) % values.length }))}
                className="w-34"
              />
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-4">
          <BackLink />
          {error ? <p className="text-sm font-bold text-red-300">{error}</p> : null}
          <button
            type="button"
            disabled={submitting}
            onClick={start}
            className="h-13 w-64 rounded-full bg-marvel font-display text-lg font-black tracking-wide text-white uppercase shadow-lg hover:bg-red-500 disabled:bg-cosmos-700 disabled:text-cosmos-300"
          >
            {submitting ? "Starting…" : "Start game"}
          </button>
        </footer>
      </StageRows>
    </Stage>
  );
}
