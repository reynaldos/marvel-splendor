"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { playSfx, scheduleClockTicks } from "@/components/audio";
import { DuelBoard } from "@/components/duel/Board";
import { DuelChoices } from "@/components/duel/DuelChoices";
import { stagedToMove, type DuelStaged } from "@/components/duel/staged";
import { Announcement, tileOrigin, type TileOrigin } from "@/components/game/Announcement";
import { DuelBoardSkeleton } from "@/components/game/BoardSkeleton";
import { useChatBubbles } from "@/components/game/ChatBubble";
import { ChatButton } from "@/components/game/ChatButton";
import { flowLock } from "@/components/game/flow-lock";
import { GameMenu } from "@/components/game/GameMenu";
import { GameOverDialog } from "@/components/game/GameOverDialog";
import type { MoveLogEntry } from "@/components/game/MoveLog";
import { PendingActionModals } from "@/components/game/PendingActionModals";
import { TracedMoveProvider, type TracedMove } from "@/components/game/traced-move";
import { useGameUpdates } from "@/components/game/use-game-updates";
import { useNotchSide } from "@/components/use-notch-side";
import { Button } from "@/components/ui/button";
import { duelEvents, leavesATrace, type BoardEvent } from "@/lib/board-events";
import { CHAT_COOLDOWN_MS, ChatBubbleSchema, type ChatSend } from "@/lib/chat";
import { asPlayer } from "@/components/duel/Board";
import { tokenMeta } from "@/components/game/stone-colors";
import { isLine } from "@/lib/duel/board";
import { colorPointsOf } from "@/lib/duel/rules";
import { STONES, WIN_COLOR_POINTS, WIN_CROWNS, WIN_POINTS, type CardLevel, type DuelMove, type Stone, type TokenColor } from "@/lib/duel/types";
import { IDLE_TURNS } from "@/lib/engine/types";
import type { DuelView } from "@/lib/duel/view";
import { rankPlayers, type GameRewards } from "@/lib/game-record";
import type { MoveSummary } from "@/lib/game-replay";
import { announceMs, announceSfx, BOT_THINK_MS, TRACE_MS, TURN_BANNER_MS } from "@/lib/playback";

interface GamePlayerInfo {
  seat: number;
  isBot: boolean;
  userId: string | null;
  name: string;
  avatarUrl: string | null;
  rewards: GameRewards | null;
}

interface GameStep {
  seat: number;
  move: DuelMove;
  view: DuelView;
}

interface GameGetResponse {
  id: string;
  status: string;
  mode: string;
  players: GamePlayerInfo[];
  view: DuelView;
  moves: Array<{ ordinal: number; seat: number; move: DuelMove } & Partial<MoveSummary>>;
  steps: GameStep[];
  start: DuelView | null;
  turnEndsInMs: number | null;
}

interface MovesPostResponse {
  view: DuelView;
  status: string;
  steps: GameStep[];
  turnEndsInMs: number | null;
}

interface GameData {
  id: string;
  mode: string;
  players: GamePlayerInfo[];
  view: DuelView;
  turnEndsAt: number | null;
  abandoned: boolean;
}

const toDeadline = (msLeft: number | null) => (msLeft === null ? null : Date.now() + msLeft);
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const OTHERS_CLAIM_DELAY_MS = 3000;
const NOTICE = "flex flex-col items-center gap-3 rounded-2xl border-2 border-gold-400 bg-popover p-6 text-center text-popover-foreground shadow-md";

function toLogEntry(step: { seat: number; move: DuelMove; tokens?: TokenColor[] } & Partial<MoveSummary>): MoveLogEntry {
  const { seat, move, round, points, tokens, events } = step;
  return { id: crypto.randomUUID(), seat, move, round, points, tokens, events, timestamp: Date.now() };
}

function signInAgain(gameId: string) {
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Auth0 route, not a page
  window.location.href = `/auth/login?returnTo=${encodeURIComponent(`/play/${gameId}`)}`;
}

function moveSfx(move: DuelMove) {
  if (move.type === "TAKE_LINE" || move.type === "BUY" || move.type === "PICK_TOKEN") return "recruit" as const;
  if (move.type === "RESERVE") return "reserve" as const;
  return null;
}

/** Which of Duel's three wins the winner reached; null when the game ended another way, such as a forfeit. */
function winReason(view: DuelView): string | null {
  const winner = view.players.find((p) => p.seat === view.winnerSeat);
  if (!winner) return null;
  if (winner.points >= WIN_POINTS) return `${WIN_POINTS} points`;
  if (winner.crowns >= WIN_CROWNS) return `${WIN_CROWNS} Avengers badges`;
  const byColor = colorPointsOf(asPlayer(winner));
  const color = STONES.find((s) => byColor[s] >= WIN_COLOR_POINTS);
  return color ? `${WIN_COLOR_POINTS} points in ${tokenMeta(color).label}` : null;
}

/** The standings the results popup wants, from a Duel view: crowns stand as tags. */
function standingsOf(view: DuelView, players: GamePlayerInfo[]) {
  return rankPlayers(
    { players: view.players.map((p) => ({ seat: p.seat, points: p.points, cards: p.cards.map((c) => c.cardId), tags: p.crowns })), winnerSeat: view.winnerSeat, sharedWinners: null },
    players,
  );
}

/** Fetches the Duel view, owns the staged pick and the move log, and is the only place that talks to the API. */
export function DuelBoardClient({ gameId }: { gameId: string }) {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [staged, setStaged] = useState<DuelStaged | null>(null);
  const [moveLog, setMoveLog] = useState<MoveLogEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [botPlaying, setBotPlaying] = useState(false);
  const [gameOverDismissed, setGameOverDismissed] = useState(false);
  const [traced, setTraced] = useState<TracedMove | null>(null);
  const [announcement, setAnnouncement] = useState<{ event: BoardEvent; origin: TileOrigin | null; key: string } | null>(null);
  const [returnClosedAt, setReturnClosedAt] = useState<number | null>(null);
  const [choiceClosedAt, setChoiceClosedAt] = useState<number | null>(null);
  const [chatWaiting, setChatWaiting] = useState(false);
  const [bubbles, showBubble] = useChatBubbles();
  const notchSide = useNotchSide();

  const gameRef = useRef<GameData | null>(null);
  const commit = useCallback((data: GameData) => {
    gameRef.current = data;
    setGameData(data);
  }, []);
  const [lock] = useState(flowLock);
  const missedSignal = useRef(false);
  const catchUp = useRef(() => {});

  const playSteps = useCallback(async (steps: GameStep[], players: GamePlayerInfo[], from: DuelView, heard = false) => {
    let shown = from;
    for (const step of steps) {
      const away = step.view.players.find((p) => p.seat === step.seat)?.away;
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
      const sfx = moveSfx(step.move);
      if (sfx && !(heard && step.seat === from.viewerSeat)) playSfx(sfx);
      const tokens = step.move.type === "TAKE_LINE" ? step.move.spaces.map((s) => shown.board[s]).filter((t): t is TokenColor => Boolean(t)) : undefined;
      // Read where each tile sits before the board changes, so the announcement can carry it from there.
      const events = duelEvents(shown, step.view, step).map((event) => ({ event, origin: tileOrigin(event) }));
      setGameData((prev) => (prev ? { ...prev, view: step.view, turnEndsAt: null } : prev));
      const points = step.view.players.find((p) => p.seat === step.seat)?.points;
      setMoveLog((log) => [...log, toLogEntry({ ...step, round: Math.floor(step.view.moveCount / 2) + 1, points, tokens, events: events.map((e) => e.event) })]);
      for (const [i, announced] of events.entries()) {
        playSfx(announceSfx(announced.event));
        setAnnouncement({ ...announced, key: `${step.view.moveCount}-${i}` });
        await delay(announceMs(announced.event));
      }
      setAnnouncement(null);
      shown = step.view;
    }
    setBotPlaying(false);
  }, []);

  const fetchGame = useCallback(
    async (quiet = false) => {
      if (!lock.take()) {
        missedSignal.current = true;
        return;
      }
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
        if (shown && shown.view.moveCount > data.view.moveCount) return;
        const turnEndsAt = toDeadline(data.turnEndsInMs);
        if (shown) {
          setMoveLog(data.moves.slice(0, shown.view.moveCount).map(toLogEntry));
          await playSteps(data.steps, data.players, shown.view);
        } else if (data.start && data.steps.length > 0) {
          commit({ id: data.id, mode: data.mode, players: data.players, view: data.start, turnEndsAt: null, abandoned: false });
          setMoveLog([]);
          await playSteps(data.steps, data.players, data.start);
        }
        setMoveLog(data.moves.map(toLogEntry));
        commit({ id: data.id, mode: data.mode, players: data.players, view: data.view, turnEndsAt, abandoned: data.status === "ABANDONED" });
        setFatalError(null);
      } catch {
        if (!quiet) setFatalError("Could not reach the server.");
      } finally {
        if (lock.release()) catchUp.current();
      }
    },
    [gameId, lock, playSteps, commit],
  );

  useEffect(() => {
    catchUp.current = () => {
      if (!missedSignal.current) return;
      missedSignal.current = false;
      void fetchGame(true);
    };
  }, [fetchGame]);

  useGameUpdates(
    gameId,
    () => void fetchGame(true),
    (arrived) => {
      const sent = ChatBubbleSchema.safeParse(arrived);
      if (sent.success && sent.data.seat !== gameRef.current?.view.viewerSeat) showBubble(sent.data.seat, sent.data);
    },
  );
  useEffect(() => {
    void fetchGame();
  }, [fetchGame]);

  const myTurnNow = gameData !== null && !gameData.abandoned && gameData.view.status === "active" && gameData.view.currentSeat === gameData.view.viewerSeat && !gameData.view.pending;
  const finishedNow = gameData?.view.status === "finished" && !gameOverDismissed;
  const winner = gameData?.view.winnerSeat ?? null;
  const viewerSeat = gameData?.view.viewerSeat;
  useEffect(() => {
    if (myTurnNow) playSfx("yourTurn");
  }, [myTurnNow]);
  useEffect(() => {
    if (finishedNow) playSfx(winner === viewerSeat ? "victory" : "defeat");
  }, [finishedNow, winner, viewerSeat]);

  const submitMove = useCallback(
    async (move: DuelMove, quietly = false): Promise<boolean> => {
      const turn = gameRef.current?.view.status === "active" && !gameRef.current.abandoned ? lock.wait() : null;
      if (!turn) return false;
      const quiet = quietly || move.type === "TIMEOUT_SKIP";
      setSubmitting(true);
      const sfx = moveSfx(move);
      if (sfx) playSfx(sfx);
      await turn;
      const shown = gameRef.current;
      try {
        if (!shown || shown.abandoned || shown.view.status !== "active") return false;
        const res = await fetch(`/api/games/${gameId}/moves`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(move) });
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          if (res.status === 401) {
            signInAgain(gameId);
            return false;
          }
          if (!quiet) toast.error(body?.error ?? `That move was rejected (${res.status}).`);
          if (res.status === 409) missedSignal.current = true;
          return false;
        }
        const { view, status, steps, turnEndsInMs } = body as MovesPostResponse;
        setStaged(null);
        setSubmitting(false);
        await playSteps(steps, shown.players, shown.view, true);
        commit({ ...shown, view, turnEndsAt: toDeadline(turnEndsInMs), abandoned: status === "ABANDONED" });
        return true;
      } catch {
        if (!quiet) toast.error("Could not reach the server. Please try again.");
        return false;
      } finally {
        setSubmitting(false);
        if (lock.release()) catchUp.current();
      }
    },
    [gameId, lock, playSteps, commit],
  );

  const stagedRef = useRef(staged);
  useEffect(() => {
    stagedRef.current = staged;
  });

  // When the turn's time runs out: play what was picked, or skip.
  const live = gameData?.view;
  const turnEndsAt = gameData?.turnEndsAt ?? null;
  const timed = live?.status === "active" && turnEndsAt !== null && !submitting && !botPlaying;
  const isMine = live?.currentSeat === live?.viewerSeat;
  useEffect(() => {
    if (!timed || turnEndsAt === null) return;
    const wait = turnEndsAt - Date.now() + (isMine ? 0 : OTHERS_CLAIM_DELAY_MS);
    const timer = setTimeout(async () => {
      const picked = isMine && !gameRef.current?.view.pending ? stagedRef.current : null;
      if (picked && (await submitMove(stagedToMove(picked), true))) return;
      await submitMove(picked ? { type: "TIMEOUT_SKIP", present: true } : { type: "TIMEOUT_SKIP" });
    }, Math.max(0, wait));
    return () => clearTimeout(timer);
  }, [timed, isMine, turnEndsAt, submitMove]);
  useEffect(() => {
    if (!timed || !isMine || turnEndsAt === null) return;
    return scheduleClockTicks(turnEndsAt);
  }, [timed, isMine, turnEndsAt]);

  const toggleSpace = useCallback((space: number) => {
    const board = gameRef.current?.view.board;
    if (!board) return;
    setStaged((prev) => {
      const spaces = prev?.kind === "line" ? prev.spaces : [];
      if (spaces.includes(space)) {
        const left = spaces.filter((s) => s !== space);
        return left.length && isLine(board, left) ? { kind: "line", spaces: left } : null;
      }
      const next = [...spaces, space];
      if (!isLine(board, next)) return prev;
      playSfx("tap");
      return { kind: "line", spaces: next };
    });
  }, []);

  const stageReserveDeck = useCallback((level: CardLevel) => {
    playSfx("tap");
    setStaged((prev) => (prev?.kind === "reserveDeck" && prev.level === level ? null : { kind: "reserveDeck", level }));
  }, []);

  const sendChat = useCallback(
    async (chat: ChatSend) => {
      setChatWaiting(true);
      const response = await fetch(`/api/games/${gameId}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(chat) }).catch(() => null);
      const tooSoon = response?.status === 429 ? await response.json().catch(() => null) : null;
      if (!response?.ok && !tooSoon) toast.error("That couldn't be sent.");
      const seat = gameRef.current?.view.viewerSeat;
      if (response?.ok && seat !== undefined) showBubble(seat, chat);
      setTimeout(() => setChatWaiting(false), tooSoon?.retryInMs ?? CHAT_COOLDOWN_MS);
    },
    [gameId, showBubble],
  );

  if (!gameData && !fatalError) return <DuelBoardSkeleton />;
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
  const viewer = view.players[view.viewerSeat];
  const isMyTurn = view.currentSeat === view.viewerSeat;
  const over = gameData.abandoned || view.status !== "active";
  const disabled = submitting || botPlaying || over || Boolean(view.pending) || !isMyTurn;
  const gameOverOpen = view.status === "finished" && !gameOverDismissed;
  const canChat = gameData.mode === "MULTIPLAYER" && !gameData.abandoned && !viewer.away;

  return (
    <>
      <div data-notch={notchSide} className="game-board theme-cosmos dark relative flex w-full items-end overflow-hidden bg-cosmos">
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
        ) : viewer.away && !over ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/70 backdrop-blur-xs">
            <div className={NOTICE}>
              <p className="font-display text-base font-bold tracking-wide text-gold-400 uppercase">You were removed from this game</p>
              <p className="text-xs text-muted-foreground">You missed {IDLE_TURNS} turns in a row, so a bot is playing your seat to the end.</p>
              <Button asChild>
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </div>
        ) : null}
        {announcement ? (
          <Announcement key={announcement.key} event={announcement.event} origin={announcement.origin} nameForSeat={(seat) => players.find((p) => p.seat === seat)?.name ?? `Seat ${seat + 1}`} />
        ) : null}
        {isMyTurn && !over && !botPlaying && !view.pending && !announcement ? (
          <div key={view.moveCount} style={{ animationDuration: `${TURN_BANNER_MS}ms` }} className="turn-banner pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
            <span className="w-full bg-cosmos-950/85 py-4 text-center shadow-lg ring-2 ring-gold-400">
              <span className="font-display text-5xl font-black tracking-widest text-gold uppercase">Your turn</span>
            </span>
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-2 z-20 flex justify-center gap-2">
          {view.status === "finished" && gameOverDismissed ? (
            <button type="button" onClick={() => setGameOverDismissed(false)} className="pointer-events-auto rounded-full bg-gold-400 px-4 py-1 font-display text-xs font-black tracking-wide text-cosmos-950 uppercase shadow-md hover:bg-gold-200">
              Results
            </button>
          ) : null}
          {botPlaying ? (
            <span className="rounded-full bg-popover px-3 py-1 font-display text-xs font-bold tracking-wide text-gold-400 uppercase shadow-md ring-2 ring-cosmos-500 ring-inset">Bot is thinking…</span>
          ) : null}
        </div>
        <TracedMoveProvider value={traced}>
          <DuelBoard
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
            onToggleSpace={toggleSpace}
            onStageReserveDeck={stageReserveDeck}
            onReservePyramid={(cardId) => void submitMove({ type: "RESERVE", from: "pyramid", cardId })}
            onBuy={(cardId) => void submitMove({ type: "BUY", cardId })}
            onSpendPrivilege={() => void submitMove({ type: "SPEND_PRIVILEGE" })}
            onRefill={() => void submitMove({ type: "REFILL" })}
            onConfirm={() => staged && void submitMove(stagedToMove(staged))}
            onReturn={view.pending?.type === "RETURN_TOKENS" && returnClosedAt === view.moveCount ? () => setReturnClosedAt(null) : undefined}
            onAction={view.pending && view.pending.type !== "RETURN_TOKENS" && choiceClosedAt === view.moveCount ? () => setChoiceClosedAt(null) : undefined}
          />
        </TracedMoveProvider>
      </div>

      {!over ? (
        <>
          <DuelChoices
            view={view}
            pending={view.pending && view.pending.type !== "RETURN_TOKENS" ? view.pending : null}
            // Waits for any announcement on screen, so the banner is seen before the choice it led to.
            open={choiceClosedAt !== view.moveCount && !announcement}
            onOpenChange={(open) => setChoiceClosedAt(open ? null : view.moveCount)}
            submitting={submitting}
            turnEndsAt={gameData.turnEndsAt}
            onPickToken={(space) => void submitMove({ type: "PICK_TOKEN", space })}
            onPickOpponentToken={(color) => void submitMove({ type: "PICK_OPPONENT_TOKEN", color })}
            onPickJoinColor={(color: Stone) => void submitMove({ type: "PICK_JOIN_COLOR", color })}
            onPickRoyal={(royalId) => void submitMove({ type: "PICK_ROYAL", royalId })}
          />
          <PendingActionModals
            pending={view.pending?.type === "RETURN_TOKENS" ? { type: "RETURN_TOKENS", mustReturn: view.pending.mustReturn } : null}
            viewerTokens={viewer.tokens}
            submitting={submitting}
            turnEndsAt={gameData.turnEndsAt}
            turnSeconds={view.settings.turnTimeSeconds}
            returnOpen={returnClosedAt !== view.moveCount}
            onReturnOpenChange={(open) => setReturnClosedAt(open ? null : view.moveCount)}
            onSubmitReturnTokens={(tokens) => void submitMove({ type: "RETURN_TOKENS", tokens })}
            onReturnPicked={() => {}}
            onSubmitChooseLocation={() => {}}
          />
        </>
      ) : null}

      <GameOverDialog
        open={gameOverOpen}
        onOpenChange={(open) => {
          if (!open) setGameOverDismissed(true);
        }}
        standings={standingsOf(view, players)}
        rewards={new Map(players.filter((p) => p.rewards).map((p) => [p.seat, p.rewards!]))}
        viewerSeat={view.viewerSeat}
        round={Math.ceil(view.moveCount / 2)}
        how={winReason(view)}
      />
    </>
  );
}
