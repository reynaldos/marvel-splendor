"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BotDifficulty } from "@/lib/engine/types";

type TurnTime = "untimed" | "15" | "30" | "60" | "120";
type GameClock = "none" | "10" | "20" | "30";

/**
 * The vs-computer setup form (ARCHITECTURE.md §8 Phase 1 item 5). Lives
 * inline on the landing page rather than a separate `/play/new` route —
 * the route table in §6 doesn't list one, and there's nothing else to do on
 * that screen besides this form.
 */
export function SettingsForm() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = useState<"2" | "3" | "4">("2");
  const [botDifficulty, setBotDifficulty] = useState<BotDifficulty>("normal");
  const [targetPoints, setTargetPoints] = useState(16);
  const [turnTime, setTurnTime] = useState<TurnTime>("untimed");
  const [gameClock, setGameClock] = useState<GameClock>("none");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNeedsSignIn(false);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerCount: Number(playerCount),
          botDifficulty,
          targetPoints,
          turnTimeSeconds: turnTime === "untimed" ? null : Number(turnTime),
          gameTimeMinutes: gameClock === "none" ? null : Number(gameClock),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) {
          setNeedsSignIn(true);
          setError("Your session expired. Please sign in again to start a game.");
        } else {
          setError(body.error ?? "Could not create the game.");
        }
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="playerCount">Total players (you + bots)</Label>
          <Select value={playerCount} onValueChange={(v) => setPlayerCount(v as typeof playerCount)}>
            <SelectTrigger id="playerCount" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 players (you + 1 bot)</SelectItem>
              <SelectItem value="3">3 players (you + 2 bots)</SelectItem>
              <SelectItem value="4">4 players (you + 3 bots)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="botDifficulty">Bot difficulty</Label>
          <Select
            value={botDifficulty}
            onValueChange={(v) => setBotDifficulty(v as BotDifficulty)}
          >
            <SelectTrigger id="botDifficulty" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="easy">Easy</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="hard">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="targetPoints">Target Infinity Points</Label>
          <Input
            id="targetPoints"
            type="number"
            min={1}
            max={99}
            value={targetPoints}
            onChange={(e) => setTargetPoints(Number(e.target.value) || 1)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="turnTime">Turn timer</Label>
          <Select value={turnTime} onValueChange={(v) => setTurnTime(v as TurnTime)}>
            <SelectTrigger id="turnTime" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="untimed">Untimed</SelectItem>
              <SelectItem value="15">15 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">60 seconds</SelectItem>
              <SelectItem value="120">120 seconds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gameClock">Game clock</Label>
          <Select value={gameClock} onValueChange={(v) => setGameClock(v as GameClock)}>
            <SelectTrigger id="gameClock" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No overall clock</SelectItem>
              <SelectItem value="10">10 minutes</SelectItem>
              <SelectItem value="20">20 minutes</SelectItem>
              <SelectItem value="30">30 minutes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {needsSignIn ? (
        <a href="/auth/login?returnTo=/" className="text-xs underline">
          Sign in
        </a>
      ) : null}

      <Button type="submit" disabled={submitting} className="self-start">
        {submitting ? "Starting…" : "Start game"}
      </Button>
    </form>
  );
}
