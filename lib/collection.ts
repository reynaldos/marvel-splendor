import { duelArt } from "@/components/duel/duel-art";
import { IDLE_TURNS } from "@/lib/engine/types";
import type { AnyMove } from "@/lib/game-rules";

/**
 * The cards each seat recruited itself over a game, and how many times,
 * read from the game's moves in order. A card recruited by the bot standing
 * in for a player who was away is not theirs, so it is left out. Once away a
 * player stays away; older games let them come back, and there they count again.
 * A Duel card counts as the Marvel card whose picture it wears.
 */
export function cardsRecruited(moves: Array<{ seat: number; move: AnyMove }>): Map<number, Map<string, number>> {
  const found = new Map<number, Map<string, number>>();
  // Turns in a row each seat has let run out, kept as the game keeps it.
  const missed = new Map<number, number>();

  for (const { seat, move } of moves) {
    const away = (missed.get(seat) ?? 0) >= IDLE_TURNS;
    switch (move.type) {
      case "TIMEOUT_SKIP":
        if (!move.stuck) missed.set(seat, (missed.get(seat) ?? 0) + 1);
        break;
      case "REJOIN":
        missed.set(seat, 0);
        break;
      case "END_BY_CLOCK":
      case "FORFEIT":
        break;
      default:
        // Playing ends a run of missed turns, unless it is the bot doing the playing.
        if (away) break;
        missed.set(seat, 0);
        if (move.type === "RECRUIT" || move.type === "BUY") {
          const cardId = move.type === "BUY" ? duelArt(move.cardId).id : move.cardId;
          const cards = found.get(seat) ?? new Map<string, number>();
          cards.set(cardId, (cards.get(cardId) ?? 0) + 1);
          found.set(seat, cards);
        }
    }
  }
  return found;
}
