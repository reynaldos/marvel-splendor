"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Announcement, announceMs, tileOrigin, type TileOrigin } from "@/components/game/Announcement";
import { Board } from "@/components/game/Board";
import { BoardSkeleton } from "@/components/game/BoardSkeleton";
import { useChatBubbles } from "@/components/game/ChatBubble";
import { ChatButton } from "@/components/game/ChatButton";
import { CHAT_COOLDOWN_MS, ChatBubbleSchema, type ChatSend } from "@/lib/chat";
import { TracedMoveProvider, type TracedMove } from "@/components/game/traced-move";
import { boardEvents, leavesATrace, type BoardEvent } from "@/lib/board-events";
import { playSfx, scheduleClockTicks } from "@/components/audio";
import { useNotchSide } from "@/components/use-notch-side";
import { useGameUpdates } from "@/components/game/use-game-updates";
import { GameClock } from "@/components/game/GameClock";
import { GameMenu } from "@/components/game/GameMenu";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import type { MoveLogEntry } from "@/components/game/MoveLog";
import { PendingActionModals } from "@/components/game/PendingActionModals";
import { canAddTokenColor } from "@/components/game/token-rules";
import { stagedActionToMove, tokensAfter, type StagedAction } from "@/components/game/staged-action";
import { HAND_LIMIT, IDLE_TURNS, totalTokens, type CardLevel, type Move, type Stone, type TokenColor } from "@/lib/engine/types";
import { rankPlayers, type GameRewards } from "@/lib/game-record";
import { TURN_BANNER_MS } from "@/lib/turn-banner";
import type { RedactedGameState } from "@/lib/game-view";
import type { MoveSummary } from "@/lib/game-replay";

interface GamePlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  /** Once the game has finished, what it gave this player; null for a bot or an older game. */
  rewards: GameRewards | null;
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
  /** The whole move log, in order, each with what it meant for the record. */
  moves: Array<{ ordinal: number; seat: number; move: Move } & Partial<MoveSummary>>;
  /** The moves since `?since=`, to play back; empty when there's nothing to show. */
  steps: GameStep[];
  turnEndsInMs: number | null;
  gameEndsInMs: number | null;
}

interface MovesPostResponse {
  view: RedactedGameState;
  status: string;
  /** The submitted move, then every move the server made after it. */
  steps: GameStep[];
  turnEndsInMs: number | null;
  gameEndsInMs: number | null;
}

interface GameData {
  id: string;
  mode: string;
  players: GamePlayerInfo[];
  view: RedactedGameState;
  /** When the current turn runs out, on this device's clock; null when untimed. */
  turnEndsAt: number | null;
  /** When the game clock runs out, on this device's clock; null when the game has none. */
  gameEndsAt: number | null;
  /** Closed because nobody was playing (or by hand); the board is read-only. */
  abandoned: boolean;
}

/** The server sends time remaining, not a timestamp, so device clocks needn't agree with it. */
function toDeadline(msLeft: number | null): number | null {
  return msLeft === null ? null : Date.now() + msLeft;
}

function toLogEntry(step: { seat: number; move: Move } & Partial<MoveSummary>): MoveLogEntry {
  const { seat, move, round, points, events } = step;
  return { id: crypto.randomUUID(), seat, move, round, points, events, timestamp: Date.now() };
}

/** How long what another player picked is outlined before it leaves the board: the time the outline takes to be drawn and taken up. */
const TRACE_MS = 1500;
/** How long each bot appears to think before its move lands. */
const BOT_THINK_MS = 3500;
/** How long after the deadline before timing out another player; their own device goes first. */
const OTHERS_CLAIM_DELAY_MS = 3000;

// A session that ended mid-game: sign in again and come straight back, before any turns are missed.
function signInAgain(gameId: string) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Auth0 route, not a page
  window.location.href = `/auth/login?returnTo=${encodeURIComponent(`/play/${gameId}`)}`;
}

const NOTICE =
  "flex flex-col items-center gap-3 rounded-2xl border-2 border-gold-400 bg-popover p-6 text-center text-popover-foreground shadow-md";

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
  // What another player has just picked, while it is outlined on the board.
  const [traced, setTraced] = useState<TracedMove | null>(null);
  const [announcement, setAnnouncement] = useState<{ event: BoardEvent; origin: TileOrigin | null; key: string } | null>(
    null,
  );
  // The move the return-tokens popup was closed on; a later one opens it afresh.
  const [returnClosedAt, setReturnClosedAt] = useState<number | null>(null);
  // Choosing what to give back for a pick that isn't played yet; closing it keeps the pick.
  const [choosingReturn, setChoosingReturn] = useState(false);
  const notchSide = useNotchSide();

  const [chatWaiting, setChatWaiting] = useState(false);
  const [bubbles, showBubble] = useChatBubbles();

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

  /**
   * Shows each step in turn, from the board `from`. A bot pauses first, so it
   * appears to think. What another player picked is outlined before it leaves
   * the board, and a Location, the Avengers tile or the Time Stone changing
   * hands is announced to everyone once the move has landed.
   */
  const playSteps = useCallback(async (steps: GameStep[], players: GamePlayerInfo[], from: RedactedGameState) => {
    let shown = from;
    for (const step of steps) {
      const away = step.view.players.find((p) => p.seat === step.seat)?.away;
      // The viewer knows what they picked themselves.
      const outlined = leavesATrace(step.move) && (away || step.seat !== from.viewerSeat);
      if (away || players.find((p) => p.seat === step.seat)?.isBot) {
        setBotPlaying(true);
        await delay(BOT_THINK_MS - (outlined ? TRACE_MS : 0));
      }
      if (outlined) {
        setTraced({ seat: step.seat, move: step.move });
        await delay(TRACE_MS);
        setTraced(null);
      }
      if (step.move.type === "TAKE_TOKENS" || step.move.type === "RECRUIT") playSfx("recruit");
      else if (step.move.type === "RESERVE") playSfx("reserve");
      // Where each tile sits is read now, while it is still on the board.
      const events = boardEvents(shown, step.view).map((event) => ({ event, origin: tileOrigin(event) }));
      setGameData((prev) => (prev ? { ...prev, view: step.view, turnEndsAt: null } : prev));
      const points = step.view.players.find((p) => p.seat === step.seat)?.points;
      setMoveLog((log) => [...log, toLogEntry({ ...step, round: shown.round, points, events: events.map((e) => e.event) })]);
      shown = step.view;
      for (const [i, announced] of events.entries()) {
        playSfx(announced.event.kind);
        setAnnouncement({ ...announced, key: `${step.view.moveCount}-${i}` });
        await delay(announceMs(announced.event));
      }
      setAnnouncement(null);
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
          if (res.status === 401) return signInAgain(gameId);
          if (!quiet) setFatalError(body?.error ?? `Could not load this game (${res.status}).`);
          return;
        }
        const data = body as GameGetResponse;
        // A reply that was in flight while we moved can be older than what we show.
        if (shown && shown.view.moveCount > data.view.moveCount) return;

        if (shown) {
          setMoveLog(data.moves.slice(0, shown.view.moveCount).map(toLogEntry));
          await playSteps(data.steps, data.players, shown.view);
        }
        setMoveLog(data.moves.map(toLogEntry));
        commit({
          id: data.id,
          mode: data.mode,
          players: data.players,
          view: data.view,
          turnEndsAt: toDeadline(data.turnEndsInMs),
          gameEndsAt: toDeadline(data.gameEndsInMs),
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
  useGameUpdates(
    gameId,
    () => void fetchGame(true),
    (arrived) => {
      const sent = ChatBubbleSchema.safeParse(arrived);
      // The player's own is shown as it is sent, so it isn't shown again when it comes round.
      if (sent.success && sent.data.seat !== gameRef.current?.view.viewerSeat) showBubble(sent.data.seat, sent.data);
    },
  );

  useEffect(() => {
    void fetchGame();
  }, [fetchGame]);

  // Note: a stale staged action never lingers once a pending sub-move
  // (RETURN_TOKENS / CHOOSE_LOCATION) appears — `submitMove` already clears
  // `staged` unconditionally on every successful response, and `pending`
  // can only ever become non-null as the direct result of a move that just
  // went through that same success path.

  // Sounds for the moments the board doesn't play back: your turn coming round, and the end.
  const myTurnNow =
    gameData !== null &&
    !gameData.abandoned &&
    gameData.view.status === "active" &&
    gameData.view.currentSeat === gameData.view.viewerSeat;
  const finishedNow = gameData?.view.status === "finished" && !gameOverDismissed && !announcement;
  const winner = gameData?.view.winnerSeat ?? null;
  const viewerSeat = gameData?.view.viewerSeat;
  useEffect(() => {
    if (myTurnNow) playSfx("yourTurn");
  }, [myTurnNow]);
  useEffect(() => {
    if (finishedNow) playSfx(winner === null ? "gameOver" : winner === viewerSeat ? "victory" : "defeat");
  }, [finishedNow, winner, viewerSeat]);

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
          if (res.status === 401) {
            signInAgain(gameId);
            return false;
          }
          if (!quiet) toast.error(body?.error ?? `That move was rejected (${res.status}).`);
          // Someone else changed the game first; catch up once this flow ends.
          if (res.status === 409) missedSignal.current = true;
          return false;
        }

        const { view, status, steps, turnEndsInMs, gameEndsInMs } = body as MovesPostResponse;
        setStaged(null);
        // The request is done; what follows is the moves playing back.
        setSubmitting(false);
        await playSteps(steps, shown.players, shown.view);
        commit({
          ...shown,
          view,
          turnEndsAt: toDeadline(turnEndsInMs),
          gameEndsAt: toDeadline(gameEndsInMs),
          abandoned: status === "ABANDONED",
        });
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
  // or a pick the server won't take, it is skipped. A pick that leaves tokens
  // to give back isn't played, as there is no time left to choose them. The
  // server re-checks the time itself, so this can't skip a turn early.
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
      const mine = gameRef.current?.view.players.find((p) => p.seat === gameRef.current?.view.viewerSeat);
      const supply = gameRef.current?.view.supply;
      const goesOver = picked && mine && supply && totalTokens(tokensAfter(picked, mine.tokens, supply)) > HAND_LIMIT;
      if (picked && !goesOver && (await submitMove(stagedActionToMove(picked), true))) return;
      // Having picked something, the player was there: the turn is lost, but not counted as missed.
      const owed = isMine && gameRef.current?.view.pending?.type === "RETURN_TOKENS";
      const skipped = await submitMove(picked ? { type: "TIMEOUT_SKIP", present: true } : { type: "TIMEOUT_SKIP" });
      if (skipped && (goesOver || owed)) {
        setChoosingReturn(false);
        toast.info("Time ran out before you chose what to give back, so your pick was put back.");
      }
    }, Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [timed, isMine, turnEndsAt, submitMove]);
  // The clock ticks through the last seconds of your own turn.
  useEffect(() => {
    if (!timed || !isMine || turnEndsAt === null) return;
    return scheduleClockTicks(turnEndsAt);
  }, [timed, isMine, turnEndsAt]);

  const stageTokenColor = useCallback(
    (color: Stone) => {
      setStaged((prev) => {
        if (!gameData) return prev;
        const existing = prev?.kind === "tokens" ? prev.colors : [];
        if (!canAddTokenColor(existing, color, gameData.view.supply)) return prev;
        playSfx("tap");
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
    playSfx("tap");
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

  const sendChat = useCallback(
    async (chat: ChatSend) => {
      setChatWaiting(true);
      const response = await fetch(`/api/games/${gameId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chat),
      }).catch(() => null);
      // Sent too soon, as from a second device: wait out what the server says is left.
      const tooSoon = response?.status === 429 ? await response.json().catch(() => null) : null;
      if (!response?.ok && !tooSoon) toast.error("That couldn't be sent.");
      const seat = gameRef.current?.view.viewerSeat;
      if (response?.ok && seat !== undefined) showBubble(seat, chat);
      setTimeout(() => setChatWaiting(false), tooSoon?.retryInMs ?? CHAT_COOLDOWN_MS);
    },
    [gameId, showBubble],
  );

  // Loading until there is a board or an error: a fetch that was skipped
  // because another was already running must not end the wait.
  if (!gameData && !fatalError) {
    return <BoardSkeleton />;
  }

  if (fatalError || !gameData) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <p className="text-sm text-destructive">{fatalError ?? "This game could not be loaded."}</p>
      </div>
    );
  }

  const { view } = gameData;
  const awaySeats = view.players.filter((p) => p.away).map((p) => p.seat);
  const players = gameData.players.map((p) => (awaySeats.includes(p.seat) ? { ...p, name: `${p.name} (bot)` } : p));
  const viewer = view.players.find((p) => p.seat === view.viewerSeat);
  const isMyTurn = view.currentSeat === view.viewerSeat;
  const over = gameData.abandoned || view.status !== "active";
  const disabled = submitting || botPlaying || over || Boolean(view.pending) || !isMyTurn;
  // The last move is announced before the results come up.
  const gameOverOpen = view.status === "finished" && !gameOverDismissed && !announcement;

  // Still open once the game is over, for a "Good game!".
  const canChat = gameData.mode === "MULTIPLAYER" && !gameData.abandoned && viewer !== undefined && !viewer.away;

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
            <div className={NOTICE}>
              <p className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">This game was closed</p>
              <p className="text-xs text-muted-foreground">Nobody was playing, so the table was cleared.</p>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : viewer?.away && !over ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs">
            <div className={NOTICE}>
              <p className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">
                You were removed from this game
              </p>
              <p className="text-xs text-muted-foreground">
                You missed {IDLE_TURNS} turns in a row, so a bot is playing your seat to the end.
              </p>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : null}
        {announcement ? (
          <Announcement
            key={announcement.key}
            event={announcement.event}
            origin={announcement.origin}
            nameForSeat={(seat) => players.find((p) => p.seat === seat)?.name ?? `Seat ${seat + 1}`}
          />
        ) : null}
        {isMyTurn && !over && !botPlaying && !view.pending && !announcement ? (
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
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center gap-2">
          {gameData.gameEndsAt !== null && !over ? (
            <GameClock endsAt={gameData.gameEndsAt} lastRound={view.clockExpired} />
          ) : null}
          {view.status === "finished" && gameOverDismissed ? (
            <button
              type="button"
              onClick={() => setGameOverDismissed(false)}
              className="pointer-events-auto rounded-full bg-gold-400 px-4 py-1 font-display text-xs font-black tracking-wide text-cosmos-950 uppercase shadow-md hover:bg-gold-200"
            >
              Results
            </button>
          ) : null}
          {botPlaying ? (
            <span className="rounded-full bg-popover px-3 py-1 font-display text-xs font-bold tracking-wide text-gold-400 uppercase shadow-md ring-2 ring-cosmos-500 ring-inset">
              Bot is thinking…
            </span>
          ) : null}
        </div>
        <TracedMoveProvider value={traced}>
          <Board
            view={view}
            turnEndsAt={botPlaying ? null : gameData.turnEndsAt}
            players={players}
            staged={over ? null : staged}
            disabled={disabled}
            submitting={submitting}
            bubbles={bubbles}
            chat={canChat ? <ChatButton waiting={chatWaiting} onSend={sendChat} /> : null}
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
        </TracedMoveProvider>
      </div>

      {viewer && !over ? (
        <PendingActionModals
          pending={
            view.pending ?? (choosingReturn && pickGoesOver ? { type: "RETURN_TOKENS", mustReturn: overBy } : null)
          }
          viewerTokens={owesTokens || !afterPick ? viewer.tokens : afterPick}
          submitting={submitting}
          turnEndsAt={gameData.turnEndsAt}
          turnSeconds={view.settings.turnTimeSeconds}
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
        standings={rankPlayers(view, players)}
        rewards={new Map(players.filter((p) => p.rewards).map((p) => [p.seat, p.rewards!]))}
        viewerSeat={view.viewerSeat}
        round={view.round}
      />
    </>
  );
}
