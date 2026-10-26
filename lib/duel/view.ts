/** What one seat may see of a Duel game: the bag's count but not its order, the opponent's blind reserves as levels only, a pending choice only for the seat on turn. */
import { getDuelCard } from "./data";
import { bonusesOf, crownsOf, pointsOf } from "./rules";
import { isAway } from "@/lib/engine/types";
import type { CardLevel, DuelPending, DuelPlayer, DuelState, GameSettings, OwnedCard, StoneCounts, TokenColor, TokenCounts } from "./types";

export type DuelViewReserved = { cardId: string; blind: boolean } | { hidden: true; level: CardLevel };

export interface DuelViewPlayer {
  seat: number;
  tokens: TokenCounts;
  cards: OwnedCard[];
  reserved: DuelViewReserved[];
  privileges: number;
  royals: string[];
  /** Worked out here so the board and the records need not. */
  points: number;
  crowns: number;
  bonuses: StoneCounts;
  away: boolean;
}

export interface DuelView {
  rules: "duel";
  settings: GameSettings;
  viewerSeat: number;
  players: DuelViewPlayer[];
  board: (TokenColor | null)[];
  bagCount: number;
  deckCounts: Record<CardLevel, number>;
  pyramid: Record<CardLevel, (string | null)[]>;
  royals: string[];
  privileges: number;
  currentSeat: number;
  startingSeat: number;
  refilled: boolean;
  extraTurn: boolean;
  pending: DuelPending | null;
  moveCount: number;
  status: "active" | "finished";
  winnerSeat: number | null;
  clockExpired: boolean;
}

function viewPlayer(player: DuelPlayer, viewerSeat: number): DuelViewPlayer {
  const isViewer = player.seat === viewerSeat;
  return {
    seat: player.seat,
    tokens: { ...player.tokens },
    cards: player.cards.map((c) => ({ ...c })),
    // A card reserved from the pyramid was seen by both; one from a deck is known only by its level.
    reserved: player.reserved.map((r) => (isViewer || !r.blind ? { ...r } : { hidden: true, level: getDuelCard(r.cardId).level })),
    privileges: player.privileges,
    royals: [...player.royals],
    points: pointsOf(player),
    crowns: crownsOf(player),
    bonuses: bonusesOf(player),
    away: isAway(player),
  };
}

export function redactDuel(state: DuelState, viewerSeat: number): DuelView {
  return {
    rules: "duel",
    settings: state.settings,
    viewerSeat,
    players: state.players.map((p) => viewPlayer(p, viewerSeat)),
    board: [...state.board],
    bagCount: state.bag.length,
    deckCounts: { 1: state.decks[1].length, 2: state.decks[2].length, 3: state.decks[3].length },
    pyramid: { 1: [...state.pyramid[1]], 2: [...state.pyramid[2]], 3: [...state.pyramid[3]] },
    royals: [...state.royals],
    clockExpired: state.clockExpired ?? false,
    privileges: state.privileges,
    currentSeat: state.currentSeat,
    startingSeat: state.startingSeat,
    refilled: state.refilled,
    extraTurn: state.extraTurn,
    pending: state.currentSeat === viewerSeat ? state.pending : null,
    moveCount: state.moveCount,
    status: state.status,
    winnerSeat: state.winnerSeat,
  };
}
