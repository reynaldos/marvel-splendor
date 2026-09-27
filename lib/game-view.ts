/**
 * Per-seat redaction of a GameState for API responses (ARCHITECTURE.md §5:
 * "per-seat redaction handled by clients fetching their own view"; §9: "a
 * client can never see deck order or hidden reserves"). This lives outside
 * lib/engine/ on purpose — the engine itself never needs to redact anything,
 * only the API layer serving a specific viewer does.
 *
 * Two things are never sent to ANY viewer, including the seat it belongs to:
 *  - `seed`: replaying the seeded RNG would reveal the exact order of every
 *    deck (including future draws), so it never leaves the server.
 *  - `decks` (the face-down id arrays): only the remaining COUNT per level is
 *    public knowledge in Splendor.
 *
 * One thing is redacted per-viewer:
 *  - Other players' blind ("hidden") reserved cards — face-up reserves are
 *    public (everyone watched it happen), but a blind reserve's identity is
 *    only known to its owner.
 */
import type {
  CardLevel,
  GameSettings,
  GameState,
  PendingAction,
  PlayerState,
  StoneCounts,
  TokenCounts,
} from "@/lib/engine/types";

/**
 * A reserved-card entry as redacted for a specific viewer.
 * - `{ cardId, blind }` — the viewer is allowed to know which card this is
 *   (either it's their own reservation, or it was reserved face-up from the
 *   market and is public knowledge). `blind` still records whether it was a
 *   blind draw, purely as flavor info ("reserved from the deck").
 * - `{ blind: true }` — someone else's blind reservation; the card id is
 *   withheld entirely.
 */
export type RedactedReservedCard = { cardId: string; blind: boolean } | { blind: true };

export interface RedactedPlayerState {
  seat: number;
  tokens: TokenCounts;
  cards: string[];
  reserved: RedactedReservedCard[];
  locations: string[];
  bonuses: StoneCounts;
  tags: number;
  points: number;
}

export interface RedactedGameState {
  playerCount: number;
  settings: GameSettings;
  /** The seat this view was redacted for. */
  viewerSeat: number;
  players: RedactedPlayerState[];
  supply: TokenCounts;
  /** Only the remaining count per level is public — never deck order/contents. */
  deckCounts: Record<CardLevel, number>;
  market: Record<CardLevel, (string | null)[]>;
  locations: string[];
  avengersHolder: number | null;
  currentSeat: number;
  startingSeat: number;
  moveCount: number;
  round: number;
  pending: PendingAction | null;
  endTriggered: boolean;
  clockExpired: boolean;
  status: "active" | "finished";
  winnerSeat: number | null;
  sharedWinners: number[] | null;
}

function redactPlayer(player: PlayerState, viewerSeat: number): RedactedPlayerState {
  const isViewer = player.seat === viewerSeat;
  return {
    seat: player.seat,
    tokens: { ...player.tokens },
    cards: [...player.cards],
    locations: [...player.locations],
    bonuses: { ...player.bonuses },
    tags: player.tags,
    points: player.points,
    reserved: player.reserved.map((r): RedactedReservedCard => {
      if (isViewer || !r.hidden) return { cardId: r.cardId, blind: r.hidden };
      return { blind: true };
    }),
  };
}

/** Redacts a full GameState down to what `viewerSeat` is allowed to see. */
export function redactState(state: GameState, viewerSeat: number): RedactedGameState {
  return {
    playerCount: state.playerCount,
    settings: state.settings,
    viewerSeat,
    players: state.players.map((p) => redactPlayer(p, viewerSeat)),
    supply: { ...state.supply },
    deckCounts: {
      1: state.decks[1].length,
      2: state.decks[2].length,
      3: state.decks[3].length,
    },
    market: {
      1: [...state.market[1]],
      2: [...state.market[2]],
      3: [...state.market[3]],
    },
    locations: [...state.locations],
    avengersHolder: state.avengersHolder,
    currentSeat: state.currentSeat,
    startingSeat: state.startingSeat,
    moveCount: state.moveCount,
    round: state.round,
    pending: state.pending,
    endTriggered: state.endTriggered,
    clockExpired: state.clockExpired,
    status: state.status,
    winnerSeat: state.winnerSeat,
    sharedWinners: state.sharedWinners ? [...state.sharedWinners] : null,
  };
}
