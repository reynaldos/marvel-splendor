"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import Link from "next/link";
import { UsersRound } from "lucide-react";

import { playSfx, scheduleClockTicks } from "@/components/audio";
import { Announcement, announceMs, tileOrigin, type TileOrigin } from "@/components/game/Announcement";
import { Board } from "@/components/game/Board";
import { useChatBubbles } from "@/components/game/ChatBubble";
import { ChatButton } from "@/components/game/ChatButton";
import { GameMenu } from "@/components/game/GameMenu";
import type { MoveLogEntry } from "@/components/game/MoveLog";
import { SFX, type SfxName } from "@/lib/audio-tracks";
import { EMOJIS, MESSAGES, type ChatSend } from "@/lib/chat";
import { TracedMoveProvider, type TracedMove } from "@/components/game/traced-move";
import type { BoardEvent } from "@/lib/board-events";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type Move } from "@/lib/engine/types";
import { redactState } from "@/lib/game-view";

import { PreviewBar, TABLE_SIZES } from "../PreviewBar";

const SEATED = [
  { seat: 0, isBot: false, userId: "a", name: "You", avatarUrl: "/assets/pfp/pfp-iron-man.jpg" },
  { seat: 1, isBot: false, userId: "b", name: "maryanmi", avatarUrl: "/assets/pfp/pfp-scarlet-witch.jpg" },
  { seat: 2, isBot: true, userId: null, name: "Bot 1", avatarUrl: null },
  // A name of the greatest length, to see how it is cut short.
  { seat: 3, isBot: false, userId: "c", name: "the_devenger_of_doom", avatarUrl: "/assets/pfp/pfp-doom.jpg" },
];

/** The table size after this one, going round. */
export function nextTableSize(count: number): number {
  return TABLE_SIZES[(TABLE_SIZES.indexOf(count) + 1) % TABLE_SIZES.length];
}

/** A made-up table, seen from the first seat, with the second seat doing everything and `first` having gone first. */
export function previewTable(count: number, first = 1) {
  const state = createGame(count, "preview", DEFAULT_SETTINGS);
  state.startingSeat = first;
  state.players[1].reserved = [{ cardId: state.decks[2][0], hidden: false }];
  const view = redactState(state, 0);
  const moves: Record<string, Move> = {
    "3 tokens": { type: "TAKE_TOKENS", colors: ["mind", "soul", "reality"] },
    "2 tokens": { type: "TAKE_TOKENS", colors: ["space", "space"] },
    Recruit: { type: "RECRUIT", from: "market", cardId: view.market[2][1]! },
    Reserve: { type: "RESERVE", from: "market", level: 3, cardId: view.market[3][2]! },
    "Reserve blind": { type: "RESERVE", from: "deck", level: 1 },
    "Recruit reserved": { type: "RECRUIT", from: "reserve", cardId: state.decks[2][0] },
  };
  const events: Record<string, BoardEvent> = {
    Location: { kind: "location", seat: 1, locationId: view.locations[0] },
    // Taken from the last seat, or from the viewer at a table of two.
    Avengers: { kind: "avengers", seat: 1, from: count > 2 ? count - 1 : 0 },
    TimeStone: { kind: "timeStone", seat: 1 },
  };
  // The moves above as a log, a few rounds of it, with the tiles won along the way.
  const won = Object.values(events);
  const log: MoveLogEntry[] = Object.values(moves).map((move, i) => ({
    id: `m${i}`,
    seat: i % count,
    move,
    round: Math.floor(i / count),
    points: i,
    events: won[i - 2] ? [won[i - 2]] : [],
    timestamp: i,
  }));
  return { view, players: SEATED.slice(0, count), moves, events, log };
}
// Shown on every card at once, the longest message among them.
const SENDS: Record<string, ChatSend> = {
  Emoji: { kind: "REACTION", body: EMOJIS[0] },
  Message: { kind: "TEXT", body: MESSAGES.reduce((longest, body) => (body.length > longest.length ? body : longest)) },
};

const noop = () => {};

interface BoardPreviewProps {
  show?: string;
  /** Milliseconds in. */
  at?: number;
  /** How many at the table: 2, 3 or 4. */
  count: number;
  /** The seat that went first, wearing the token. */
  first: number;
}

/** The board's animations, without playing a game: choose one and it plays. */
export function BoardPreview({ show, at, count, first }: BoardPreviewProps) {
  const { view, players, moves: MOVES, events: EVENTS, log } = useMemo(() => previewTable(count, first), [count, first]);
  const [traced, setTraced] = useState<TracedMove | null>(null);
  const [bubbles, showBubble] = useChatBubbles();
  // `?show=MyTurn` gives the first seat the turn, with a clock, to look at its card lit up.
  const [myTurnEndsAt] = useState(() => (show === "MyTurn" ? Date.now() + 20_000 : null));
  const send = (chat: ChatSend) => players.forEach((p) => showBubble(p.seat, chat));
  const [announced, setAnnounced] = useState<{ event: BoardEvent; origin: TileOrigin | null; key: number } | null>(null);

  const trace = (move: Move) => {
    if (move.type === "TAKE_TOKENS" || move.type === "RECRUIT") playSfx("recruit");
    else if (move.type === "RESERVE") playSfx("reserve");
    // Taken off and put back, so choosing the same one again plays it again.
    setTraced(null);
    setTimeout(() => setTraced({ seat: 1, move }), 50);
  };
  const announce = (event: BoardEvent) => {
    playSfx(event.kind);
    const key = Date.now();
    setAnnounced({ event, origin: tileOrigin(event), key });
    if (at === undefined) setTimeout(() => setAnnounced((shown) => (shown?.key === key ? null : shown)), announceMs(event));
  };
  // The address can name one to play on arrival, once the board is there to take a tile from.
  const played = useEffectEvent(() => {
    if (show && MOVES[show]) trace(MOVES[show]);
    if (show && EVENTS[show]) announce(EVENTS[show]);
    if (show && SENDS[show]) send(SENDS[show]);
    // With a time as well, everything is stopped that far in, to be looked at.
    if (at !== undefined) {
      setTimeout(() => {
        for (const animation of document.getAnimations()) {
          animation.pause();
          animation.currentTime = at;
        }
      }, 100);
    }
  });
  useEffect(() => {
    const timer = setTimeout(played, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="game-board theme-cosmos dark relative flex h-dvh w-full items-center overflow-hidden bg-cosmos">
      {announced ? (
        <Announcement
          key={announced.key}
          event={announced.event}
          origin={announced.origin}
          nameForSeat={(seat) => players[seat].name}
        />
      ) : null}
      {/* What can be played, over the way between the preview pages. */}
      <div className="absolute inset-x-0 bottom-1 z-30 flex flex-col items-center gap-1">
        <div className="flex justify-center gap-1">
        {Object.entries(MOVES).map(([label, move]) => (
          <button
            key={label}
            type="button"
            onClick={() => trace(move)}
            className="rounded-full bg-cosmos-700 px-2 py-0.5 fs-2xs font-bold ring-1 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
          >
            {label}
          </button>
        ))}
        {Object.entries(SENDS).map(([label, chat]) => (
          <button
            key={label}
            type="button"
            onClick={() => send(chat)}
            className="rounded-full bg-cosmos-300 px-2 py-0.5 fs-2xs font-black text-cosmos-950 hover:bg-white"
          >
            {label}
          </button>
        ))}
        {Object.entries(EVENTS).map(([label, event]) => (
          <button
            key={label}
            type="button"
            onClick={() => announce(event)}
            className="rounded-full bg-gold-400 px-2 py-0.5 fs-2xs font-black text-cosmos-950 hover:bg-gold-200"
          >
            {label}
          </button>
        ))}
        </div>
        {/* Every sound on its own, to hear it. */}
        <div className="flex justify-center gap-1">
          {(Object.keys(SFX) as SfxName[]).map((name) => (
            <button
              key={name}
              type="button"
              // The clock's button plays its whole run of ticks, as a turn's last seconds do.
              onClick={() => (name === "clockLow" ? scheduleClockTicks(Date.now() + 3000) : playSfx(name))}
              className="rounded-full bg-cosmos-950 px-2 py-0.5 fs-2xs font-bold text-cosmos-300 ring-1 ring-cosmos-500 ring-inset hover:text-white"
            >
              {name}
            </button>
          ))}
        </div>
        <div className="flex justify-center gap-1">
          <PreviewBar />
          {/* Goes round the table sizes: 2, 3, 4, and back to 2. */}
          <Link
            href={`/preview/board?players=${nextTableSize(count)}`}
            aria-label={`${count} players. Change to ${nextTableSize(count)}`}
            className="flex items-center gap-1 rounded-full bg-cosmos-950 px-2 py-0.5 fs-2xs font-black text-white ring-1 ring-white/60 ring-inset hover:bg-cosmos-700"
          >
            <UsersRound className="size-[1.2em]" />
            {count} players
          </Link>
          {/* Hands the first player's token to the next seat round the table. */}
          <Link
            href={`/preview/board?players=${count}&first=${(first + 1) % count}`}
            aria-label={`${players[first].name} went first. Change to ${players[(first + 1) % count].name}`}
            className="flex items-center gap-1 rounded-full bg-cosmos-950 px-2 py-0.5 fs-2xs font-black text-white ring-1 ring-white/60 ring-inset hover:bg-cosmos-700"
          >
            <span className="size-[1em] rounded-full bg-gold-400 ring-1 ring-gold-600" />
            {players[first].name} first
          </Link>
        </div>
      </div>
      <TracedMoveProvider value={traced}>
        <Board
          view={myTurnEndsAt ? { ...view, currentSeat: 0 } : view}
          turnEndsAt={myTurnEndsAt}
          players={players}
          staged={null}
          disabled
          submitting={false}
          bubbles={bubbles}
          menu={
            <GameMenu
              moveLog={log}
              players={players}
              viewerSeat={0}
              settings={view.settings}
              finished={false}
              busy={false}
              onForfeit={noop}
            />
          }
          chat={<ChatButton waiting={false} onSend={(chat) => showBubble(0, chat)} defaultOpen={show === "Chat"} />}
          onStageTokenColor={noop}
          onUnstageTokenColor={noop}
          onStageReserveMarket={noop}
          onStageReserveDeck={noop}
          onStageRecruit={noop}
          onConfirm={noop}
        />
      </TracedMoveProvider>
    </div>
  );
}
