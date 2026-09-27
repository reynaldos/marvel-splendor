"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Skeleton } from "@/components/ui/skeleton";
import { Board } from "@/components/game/Board";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import { MoveLog, type MoveLogEntry } from "@/components/game/MoveLog";
import { PendingActionModals } from "@/components/game/PendingActionModals";
import { canAddTokenColor } from "@/components/game/token-rules";
import { stagedActionToMove, type StagedAction } from "@/components/game/staged-action";
import type { CardLevel, Move, Stone, TokenColor } from "@/lib/engine/types";
import type { RedactedGameState } from "@/lib/game-view";

interface GamePlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  name: string;
}

interface GameGetResponse {
  id: string;
  status: string;
  mode: string;
  winnerSeat: number | null;
  version: number;
  players: GamePlayerInfo[];
  view: RedactedGameState;
}

interface MovesPostResponse {
  view: RedactedGameState;
  botMoves: Array<{ seat: number; move: Move }>;
}

interface GameData {
  id: string;
  players: GamePlayerInfo[];
  view: RedactedGameState;
}

const BOT_MOVE_STAGGER_MS = 550;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Stateful orchestrator (ARCHITECTURE.md §6): fetches the redacted view,
 * owns the currently-staged action + move log + bot-move sequencing, and
 * is the only place that talks to the API. `Board` and its children are
 * pure props-in.
 */
export function GameBoardClient({ gameId }: { gameId: string }) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [staged, setStaged] = useState<StagedAction | null>(null);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [botPlaying, setBotPlaying] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);

  // Integration point for a later task (OpenAI banter bubbles): nothing
  // populates this yet, but the plumbing — state + setter + prop passthrough
  // to PlayerPlaque/BanterBubble — is wired up so that task can just call
  // `setBanterBySeat` when content arrives.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [banterBySeat, setBanterBySeat] = useState<Record<number, string | null>>({});

  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}`);
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setFatalError(body?.error ?? `Could not load this game (${res.status}).`);
        return false;
      }
      const data = body as GameGetResponse;
      setGameData({ id: data.id, players: data.players, view: data.view });
      setFatalError(null);
      return true;
    } catch {
      setFatalError("Could not reach the server.");
      return false;
    }
  }, [gameId]);

  // Standard "fetch on mount" effect shape (react.dev/learn/synchronizing-
  // with-effects#fetching-data): an `ignore` flag set in the cleanup
  // function guards the post-await setState calls against a stale request
  // whose component/deps already changed before it resolved. This is
  // exactly the pattern React's own docs recommend for effect-based data
  // fetching; `react-hooks/set-state-in-effect` flags it anyway because its
  // static analysis can't see that `fetchGame`'s setState calls all happen
  // after an `await`, not synchronously — hence the targeted disable below.
  useEffect(() => {
    let ignore = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above; setState only ever runs post-await inside fetchGame/finally.
    fetchGame().finally(() => {
      if (!ignore) setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, [fetchGame]);

  // Note: a stale staged action never lingers once a pending sub-move
  // (RETURN_TOKENS / CHOOSE_LOCATION) appears — `submitMove` already clears
  // `staged` unconditionally on every successful response, and `pending`
  // can only ever become non-null as the direct result of a move that just
  // went through that same success path.

  const submitMove = useCallback(
    async (move: Move) => {
      if (!gameData) return;
      const submitterSeat = gameData.view.viewerSeat;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/games/${gameId}/moves`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(move),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          toast.error(body?.error ?? `That move was rejected (${res.status}).`);
          if (res.status === 409) await fetchGame();
          return;
        }

        const { view, botMoves } = body as MovesPostResponse;
        setGameData((prev) => (prev ? { ...prev, view } : prev));
        setStaged(null);
        setMoveLog((log) => [
          ...log,
          { id: crypto.randomUUID(), seat: submitterSeat, move, timestamp: Date.now() },
        ]);

        if (botMoves.length > 0) {
          setBotPlaying(true);
          for (const applied of botMoves) {
            await delay(BOT_MOVE_STAGGER_MS);
            setMoveLog((log) => [
              ...log,
              { id: crypto.randomUUID(), seat: applied.seat, move: applied.move, timestamp: Date.now() },
            ]);
          }
          setBotPlaying(false);
        }
      } catch {
        toast.error("Could not reach the server. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [gameData, gameId, fetchGame],
  );

  const stageTokenColor = useCallback(
    (color: Stone) => {
      setStaged((prev) => {
        if (!gameData) return prev;
        const existing = prev?.kind === "tokens" ? prev.colors : [];
        if (!canAddTokenColor(existing, color, gameData.view.supply)) return prev;
        return { kind: "tokens", colors: [...existing, color] };
      });
    },
    [gameData],
  );

  const stageReserveMarket = useCallback((level: CardLevel, cardId: string) => {
    setStaged({ kind: "reserve", from: "market", level, cardId });
  }, []);

  const stageReserveDeck = useCallback((level: CardLevel) => {
    setStaged({ kind: "reserve", from: "deck", level });
  }, []);

  const stageRecruit = useCallback((from: "market" | "reserve", cardId: string) => {
    setStaged({ kind: "recruit", from, cardId });
  }, []);

  const cancelStaged = useCallback(() => setStaged(null), []);

  const confirmStaged = useCallback(() => {
    if (!staged) return;
    void submitMove(stagedActionToMove(staged));
  }, [staged, submitMove]);

  const submitReturnTokens = useCallback(
    (tokens: Partial<Record<TokenColor, number>>) => {
      void submitMove({ type: "RETURN_TOKENS", tokens });
    },
    [submitMove],
  );

  const submitChooseLocation = useCallback(
    (locationId: string) => {
      void submitMove({ type: "CHOOSE_LOCATION", locationId });
    },
    [submitMove],
  );

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (fatalError || !gameData) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-destructive">{fatalError ?? "This game could not be loaded."}</p>
      </div>
    );
  }

  const { view, players } = gameData;
  const viewer = view.players.find((p) => p.seat === view.viewerSeat);
  const isMyTurn = view.currentSeat === view.viewerSeat;
  const disabled = submitting || botPlaying || Boolean(view.pending) || view.status !== "active" || !isMyTurn;
  const gameOverOpen = view.status === "finished" && !gameOverDismissed;

  return (
    <div className="flex flex-1 flex-col gap-3 lg:flex-row">
      <div className="relative flex-1">
        {botPlaying ? (
          <div className="absolute inset-x-0 top-2 z-20 flex justify-center">
            <span className="rounded-full bg-popover px-3 py-1 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
              Bot is thinking…
            </span>
          </div>
        ) : null}
        <Board
          view={view}
          players={players}
          staged={staged}
          disabled={disabled}
          submitting={submitting}
          banterBySeat={banterBySeat}
          onStageTokenColor={stageTokenColor}
          onStageReserveMarket={stageReserveMarket}
          onStageReserveDeck={stageReserveDeck}
          onStageRecruit={stageRecruit}
          onConfirm={confirmStaged}
          onCancel={cancelStaged}
        />
      </div>

      <aside className="w-full shrink-0 p-3 lg:w-72">
        <MoveLog entries={moveLog} players={players} viewerSeat={view.viewerSeat} />
      </aside>

      {viewer ? (
        <PendingActionModals
          pending={view.pending}
          viewerTokens={viewer.tokens}
          submitting={submitting}
          onSubmitReturnTokens={submitReturnTokens}
          onSubmitChooseLocation={submitChooseLocation}
        />
      ) : null}

      <GameOverDialog
        open={gameOverOpen}
        onOpenChange={(open) => {
          if (!open) setGameOverDismissed(true);
        }}
        winnerSeat={view.winnerSeat}
        sharedWinners={view.sharedWinners}
        viewerSeat={view.viewerSeat}
        nameForSeat={(seat) => players.find((p) => p.seat === seat)?.name ?? `Seat ${seat}`}
      />
    </div>
  );
}
