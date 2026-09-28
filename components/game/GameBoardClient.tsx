"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Board } from "@/components/game/Board";
import { useNotchSide } from "@/components/use-notch-side";
import { useGameUpdates } from "@/components/game/use-game-updates";
import { GameMenu } from "@/components/game/GameMenu";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import type { MoveLogEntry } from "@/components/game/MoveLog";
import { PendingActionModals } from "@/components/game/PendingActionModals";
import { canAddTokenColor } from "@/components/game/token-rules";
import { stagedActionToMove, tokensAfter, type StagedAction } from "@/components/game/staged-action";
import { HAND_LIMIT, totalTokens, type CardLevel, type Move, type Stone, type TokenColor } from "@/lib/engine/types";
import { TURN_BANNER_MS } from "@/lib/turn-banner";
import type { RedactedGameState } from "@/lib/game-view";

interface GamePlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  name: string;
}

/** One move and the board right after it. */
interface GameStep {
  seat: number;
  move: Move;
  view: RedactedGameState;
}

interface GameGetResponse {
  id: string;
  status: string;
  mode: string;
  winnerSeat: number | null;
  version: number;
  players: GamePlayerInfo[];
  view: RedactedGameState;
  /** The whole move log, in order. */
  moves: Array<{ ordinal: number; seat: number; move: Move }>;
  /** The moves since `?since=`, to play back; empty when there's nothing to show. */
  steps: GameStep[];
  turnEndsInMs: number | null;
}

interface MovesPostResponse {
  view: RedactedGameState;
  status: string;
  /** The submitted move, then every move the server made after it. */
  steps: GameStep[];
  turnEndsInMs: number | null;
}

interface GameData {
  id: string;
  players: GamePlayerInfo[];
  view: RedactedGameState;
  /** When the current turn runs out, on this device's clock; null when untimed. */
  turnEndsAt: number | null;
  /** Closed because nobody was playing (or by hand); the board is read-only. */
  abandoned: boolean;
}

/** The server sends time remaining, not a timestamp, so device clocks needn't agree with it. */
function toDeadline(turnEndsInMs: number | null): number | null {
  return turnEndsInMs === null ? null : Date.now() + turnEndsInMs;
}

function toLogEntry(step: { seat: number; move: Move }): MoveLogEntry {
  return { id: crypto.randomUUID(), seat: step.seat, move: step.move, timestamp: Date.now() };
}

/** How long each bot appears to think before its move lands. */
const BOT_THINK_MS = 3500;
/** How long after the deadline before timing out another player; their own device goes first. */
const OTHERS_CLAIM_DELAY_MS = 3000;

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
  const [fatalError, setFatalError] = useState<string | null>(null);

  const [staged, setStaged] = useState<StagedAction | null>(null);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [botPlaying, setBotPlaying] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  // The move the return-tokens popup was closed on; a later one opens it afresh.
  const [returnClosedAt, setReturnClosedAt] = useState<number | null>(null);
  // Choosing what to give back for a pick that isn't played yet; closing it keeps the pick.
  const [choosingReturn, setChoosingReturn] = useState(false);
  const notchSide = useNotchSide();

  // Integration point for a later task (OpenAI banter bubbles): nothing
  // populates this yet, but the plumbing — state + setter + prop passthrough
  // to PlayerPlaque/BanterBubble — is wired up so that task can just call
  // `setBanterBySeat` when content arrives.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [banterBySeat, setBanterBySeat] = useState<Record<number, string | null>>({});

  // Latest values for the async flows below, which outlive the render that started them.
  const gameRef = useRef<GameData | null>(null);
  /** Shows a settled board. The ref is set at once, not on the next render,
   * so a catch-up fetch fired right after asks only for moves newer than it. */
  const commit = useCallback((data: GameData) => {
    gameRef.current = data;
    setGameData(data);
  }, []);
  // One flow at a time touches the board; a signal that arrives meanwhile is
  // remembered and acted on once the current flow finishes.
  const busy = useRef(false);
  const missedSignal = useRef(false);
  /** Runs at the end of every flow; refetches if a signal was missed during it. */
  const catchUp = useRef(() => {});

  /** Shows each step in turn, pausing before a bot's so it appears to think. */
  const playSteps = useCallback(async (steps: GameStep[], players: GamePlayerInfo[]) => {
    for (const step of steps) {
      if (players.find((p) => p.seat === step.seat)?.isBot) {
        setBotPlaying(true);
        await delay(BOT_THINK_MS);
      }
      setGameData((prev) => (prev ? { ...prev, view: step.view, turnEndsAt: null } : prev));
      setMoveLog((log) => [...log, toLogEntry(step)]);
    }
    setBotPlaying(false);
  }, []);

  /**
   * Pulls the latest game. `quiet` is for background refreshes: a failure is
   * ignored, since the board on screen is still good and the next signal
   * retries. With no board on screen yet, a failure is always shown.
   */
  const fetchGame = useCallback(
    async (quiet = false) => {
      if (busy.current) {
        missedSignal.current = true;
        return;
      }
      busy.current = true;
      try {
        const shown = gameRef.current;
        if (!shown) quiet = false;
        const res = await fetch(`/api/games/${gameId}${shown ? `?since=${shown.view.moveCount}` : ""}`);
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          if (!quiet) setFatalError(body?.error ?? `Could not load this game (${res.status}).`);
          return;
        }
        const data = body as GameGetResponse;
        // A reply that was in flight while we moved can be older than what we show.
        if (shown && shown.view.moveCount > data.view.moveCount) return;

        if (shown) {
          setMoveLog(data.moves.slice(0, shown.view.moveCount).map(toLogEntry));
          await playSteps(data.steps, data.players);
        }
        setMoveLog(data.moves.map(toLogEntry));
        commit({
          id: data.id,
          players: data.players,
          view: data.view,
          turnEndsAt: toDeadline(data.turnEndsInMs),
          abandoned: data.status === "ABANDONED",
        });
        setFatalError(null);
      } catch {
        if (!quiet) setFatalError("Could not reach the server.");
      } finally {
        busy.current = false;
        catchUp.current();
      }
    },
    [gameId, playSteps, commit],
  );

  useEffect(() => {
    catchUp.current = () => {
      if (!missedSignal.current) return;
      missedSignal.current = false;
      void fetchGame(true);
    };
  }, [fetchGame]);

  // Another player moved, or the safety-net timer fired.
  useGameUpdates(gameId, () => void fetchGame(true));

  useEffect(() => {
    void fetchGame();
  }, [fetchGame]);

  // Note: a stale staged action never lingers once a pending sub-move
  // (RETURN_TOKENS / CHOOSE_LOCATION) appears — `submitMove` already clears
  // `staged` unconditionally on every successful response, and `pending`
  // can only ever become non-null as the direct result of a move that just
  // went through that same success path.

  /** Resolves to whether the move went through. */
  const submitMove = useCallback(
    async (move: Move, quietly = false): Promise<boolean> => {
      const shown = gameRef.current;
      if (!shown || busy.current || shown.abandoned || shown.view.status !== "active") return false;
      // A timeout is sent in the background; losing the race to another
      // device, or being a moment early, isn't something to tell the player.
      const quiet = quietly || move.type === "TIMEOUT_SKIP";
      busy.current = true;
      setSubmitting(true);
      try {
        const res = await fetch(`/api/games/${gameId}/moves`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(move),
        });
        const body = await res.json().catch(() => null);

        if (!res.ok) {
          if (!quiet) toast.error(body?.error ?? `That move was rejected (${res.status}).`);
          // Someone else changed the game first; catch up once this flow ends.
          if (res.status === 409) missedSignal.current = true;
          return false;
        }

        const { view, status, steps, turnEndsInMs } = body as MovesPostResponse;
        setStaged(null);
        // The request is done; what follows is the moves playing back.
        setSubmitting(false);
        await playSteps(steps, shown.players);
        commit({ ...shown, view, turnEndsAt: toDeadline(turnEndsInMs), abandoned: status === "ABANDONED" });
        return true;
      } catch {
        if (!quiet) toast.error("Could not reach the server. Please try again.");
        return false;
      } finally {
        setSubmitting(false);
        busy.current = false;
        catchUp.current();
      }
    },
    [gameId, playSteps, commit],
  );

  // When a turn's time runs out, end it: straight away if it's the viewer's
  // own, after a short wait if it's someone else's who may have walked away.
  // The viewer's own turn plays whatever they had picked; with nothing picked,
  // or a pick the server won't take, it is skipped. The server re-checks the
  // time itself, so this can't skip a turn early.
  const stagedRef = useRef(staged);
  useEffect(() => {
    stagedRef.current = staged;
  });
  const live = gameData?.view;
  const turnEndsAt = gameData?.turnEndsAt ?? null;
  const timed = live?.status === "active" && turnEndsAt !== null && !submitting && !botPlaying;
  const isMine = live?.currentSeat === live?.viewerSeat;
  useEffect(() => {
    if (!timed || turnEndsAt === null) return;
    const wait = turnEndsAt - Date.now() + (isMine ? 0 : OTHERS_CLAIM_DELAY_MS);
    const timer = setTimeout(async () => {
      const picked = isMine ? stagedRef.current : null;
      if (picked && (await submitMove(stagedActionToMove(picked), true))) return;
      void submitMove({ type: "TIMEOUT_SKIP" });
    }, Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [timed, isMine, turnEndsAt, submitMove]);

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

  const unstageTokenColor = useCallback((color: Stone) => {
    setStaged((prev) => {
      if (prev?.kind !== "tokens") return prev;
      const i = prev.colors.lastIndexOf(color);
      if (i === -1) return prev;
      const colors = prev.colors.filter((_, idx) => idx !== i);
      return colors.length > 0 ? { kind: "tokens", colors } : null;
    });
  }, []);

  // Picking Reserve/Recruit on a card is already an explicit two-tap choice
  // (open the card, then the action), so it ends the turn immediately
  // instead of staging. Tokens and blind deck reserves still wait for End Turn.
  const stageReserveMarket = useCallback(
    (level: CardLevel, cardId: string) => {
      void submitMove({ type: "RESERVE", from: "market", level, cardId });
    },
    [submitMove],
  );

  // Tapping the staged deck again un-stages it.
  const stageReserveDeck = useCallback((level: CardLevel) => {
    setStaged((prev) =>
      prev?.kind === "reserve" && prev.from === "deck" && prev.level === level
        ? null
        : { kind: "reserve", from: "deck", level },
    );
  }, []);

  const stageRecruit = useCallback(
    (from: "market" | "reserve", cardId: string) => {
      void submitMove({ type: "RECRUIT", from, cardId });
    },
    [submitMove],
  );

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

  // Loading until there is a board or an error: a fetch that was skipped
  // because another was already running must not end the wait.
  if (!gameData && !fatalError) {
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
  const over = gameData.abandoned || view.status !== "active";
  const disabled = submitting || botPlaying || over || Boolean(view.pending) || !isMyTurn;
  const gameOverOpen = view.status === "finished" && !gameOverDismissed;

  const owesTokens = view.pending?.type === "RETURN_TOKENS";
  const afterPick = viewer ? tokensAfter(staged, viewer.tokens, view.supply) : null;
  const overBy = afterPick ? totalTokens(afterPick) - HAND_LIMIT : 0;
  const pickGoesOver = !disabled && staged !== null && overBy > 0;
  // Nothing is sent until the tokens to give back are chosen, so backing out costs nothing.
  const playThenReturn = async (tokens: Partial<Record<TokenColor, number>>) => {
    if (!staged) return;
    setChoosingReturn(false);
    // The pick leaves tokens owed; this keeps that popup shut while the rest is sent.
    setReturnClosedAt(view.moveCount + 1);
    if (await submitMove(stagedActionToMove(staged))) await submitMove({ type: "RETURN_TOKENS", tokens });
  };

  return (
    <>
      <div
        data-notch={notchSide}
        className="game-board theme-cosmos dark relative flex h-dvh w-full items-center overflow-hidden bg-cosmos"
      >
        {gameData.abandoned ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs">
            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-gold-400 bg-popover p-6 text-center text-popover-foreground shadow-md">
              <p className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">This game was closed</p>
              <p className="text-xs text-muted-foreground">Nobody was playing, so the table was cleared.</p>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : null}
        {isMyTurn && !over && !botPlaying && !view.pending ? (
          // Keyed by turn, so it plays once each time the turn comes round.
          <div
            key={view.moveCount}
            style={{ animationDuration: `${TURN_BANNER_MS}ms` }}
            className="turn-banner pointer-events-none absolute inset-0 z-40 flex items-center justify-center"
          >
            {/* The gold lettering is its own element: it paints with its background. */}
            <span className="w-full bg-cosmos-950/85 py-4 text-center shadow-lg ring-2 ring-gold-400">
              <span className="font-display text-5xl font-black tracking-widest text-gold uppercase">Your turn</span>
            </span>
          </div>
        ) : null}
        {botPlaying ? (
          <div className="absolute inset-x-0 top-2 z-20 flex justify-center">
            <span className="rounded-full bg-popover px-3 py-1 font-display text-xs font-bold tracking-wide text-gold-400 uppercase shadow-md ring-2 ring-cosmos-500 ring-inset">
              Bot is thinking…
            </span>
          </div>
        ) : null}
        <Board
          view={view}
          turnEndsAt={botPlaying ? null : gameData.turnEndsAt}
          players={players}
          staged={over ? null : staged}
          disabled={disabled}
          submitting={submitting}
          banterBySeat={banterBySeat}
          menu={
            <GameMenu
              moveLog={moveLog}
              players={players}
              viewerSeat={view.viewerSeat}
              settings={view.settings}
              finished={view.status === "finished"}
              busy={submitting || botPlaying}
              onForfeit={() => void submitMove({ type: "FORFEIT" })}
            />
          }
          onStageTokenColor={stageTokenColor}
          onUnstageTokenColor={unstageTokenColor}
          onStageReserveMarket={stageReserveMarket}
          onStageReserveDeck={stageReserveDeck}
          onStageRecruit={stageRecruit}
          onConfirm={confirmStaged}
          onReturn={
            owesTokens && !over
              ? () => setReturnClosedAt(null)
              : pickGoesOver
                ? () => setChoosingReturn(true)
                : undefined
          }
        />
      </div>

      {viewer && !over ? (
        <PendingActionModals
          pending={
            view.pending ?? (choosingReturn && pickGoesOver ? { type: "RETURN_TOKENS", mustReturn: overBy } : null)
          }
          viewerTokens={owesTokens || !afterPick ? viewer.tokens : afterPick}
          submitting={submitting}
          returnOpen={owesTokens ? returnClosedAt !== view.moveCount : choosingReturn}
          onReturnOpenChange={(open) =>
            owesTokens ? setReturnClosedAt(open ? null : view.moveCount) : setChoosingReturn(open)
          }
          onSubmitReturnTokens={owesTokens ? submitReturnTokens : playThenReturn}
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
    </>
  );
}
