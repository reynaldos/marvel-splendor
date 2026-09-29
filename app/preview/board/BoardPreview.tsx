"use client";

import { useEffect, useEffectEvent, useState } from "react";

import { Announcement, announceMs, tileOrigin, type TileOrigin } from "@/components/game/Announcement";
import { Board } from "@/components/game/Board";
import { ChatButton } from "@/components/game/ChatButton";
import { TracedMoveProvider, type TracedMove } from "@/components/game/traced-move";
import type { BoardEvent } from "@/lib/board-events";
import { createGame } from "@/lib/engine/setup";
import { DEFAULT_SETTINGS, type Move } from "@/lib/engine/types";
import { redactState } from "@/lib/game-view";

// A made-up table of three, seen from the first seat, with the second seat doing everything.
const state = createGame(3, "preview", DEFAULT_SETTINGS);
state.players[1].reserved = [{ cardId: state.decks[2][0], hidden: false }];
const view = redactState(state, 0);
const players = [
  { seat: 0, isBot: false, userId: "a", name: "You", avatarUrl: "/assets/pfp/pfp-iron-man.jpg" },
  { seat: 1, isBot: false, userId: "b", name: "maryanmi", avatarUrl: "/assets/pfp/pfp-scarlet-witch.jpg" },
  { seat: 2, isBot: true, userId: null, name: "Bot 1", avatarUrl: null },
];

const MOVES: Record<string, Move> = {
  "3 tokens": { type: "TAKE_TOKENS", colors: ["mind", "soul", "reality"] },
  "2 tokens": { type: "TAKE_TOKENS", colors: ["space", "space"] },
  Recruit: { type: "RECRUIT", from: "market", cardId: view.market[2][1]! },
  Reserve: { type: "RESERVE", from: "market", level: 3, cardId: view.market[3][2]! },
  "Reserve blind": { type: "RESERVE", from: "deck", level: 1 },
  "Recruit reserved": { type: "RECRUIT", from: "reserve", cardId: state.decks[2][0] },
};
const EVENTS: Record<string, BoardEvent> = {
  Location: { kind: "location", seat: 1, locationId: view.locations[0] },
  Avengers: { kind: "avengers", seat: 1, from: 2 },
  "TimeStone": { kind: "timeStone", seat: 1 },
};

const noop = () => {};

/** The board's animations, without playing a game: choose one and it plays. */
export function BoardPreview({ show, at }: { show?: string; /** Milliseconds in. */ at?: number }) {
  const [traced, setTraced] = useState<TracedMove | null>(null);
  const [announced, setAnnounced] = useState<{ event: BoardEvent; origin: TileOrigin | null; key: number } | null>(null);

  const trace = (move: Move) => {
    // Taken off and put back, so choosing the same one again plays it again.
    setTraced(null);
    setTimeout(() => setTraced({ seat: 1, move }), 50);
  };
  const announce = (event: BoardEvent) => {
    const key = Date.now();
    setAnnounced({ event, origin: tileOrigin(event), key });
    if (at === undefined) setTimeout(() => setAnnounced((shown) => (shown?.key === key ? null : shown)), announceMs(event));
  };
  // The address can name one to play on arrival, once the board is there to take a tile from.
  const played = useEffectEvent(() => {
    if (show && MOVES[show]) trace(MOVES[show]);
    if (show && EVENTS[show]) announce(EVENTS[show]);
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
      <div className="absolute inset-x-0 bottom-1 z-30 flex justify-center gap-1">
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
      <TracedMoveProvider value={traced}>
        <Board
          view={view}
          turnEndsAt={null}
          players={players}
          staged={null}
          disabled
          submitting={false}
          banterBySeat={{}}
          menu={null}
          chat={<ChatButton waiting={false} onSend={noop} defaultOpen={show === "Chat"} />}
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
