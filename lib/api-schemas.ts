/**
 * Runtime (zod) validation for API request bodies. `validateMove`/`applyMove`
 * in lib/engine/* trust their `Move` argument's shape completely (they only
 * check game-rule legality) — untrusted JSON from a client body must be
 * shape-checked before it ever reaches them.
 */
import { z } from "zod";

import { STONES, TOKEN_COLORS } from "@/lib/engine/types";

const StoneSchema = z.enum(STONES);
const TokenColorSchema = z.enum(TOKEN_COLORS);
const CardLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

/** Mirrors `Move` from lib/engine/types.ts, minus the server-initiated
 * `END_BY_CLOCK`. A client may send `TIMEOUT_SKIP` for its own expired
 * turn, but the moves route only honors it once the server's own clock
 * agrees the turn time has run out. */
export const MoveSchema = z.union([
  z.object({ type: z.literal("TAKE_TOKENS"), colors: z.array(StoneSchema).min(1).max(3) }),
  z.object({
    type: z.literal("RESERVE"),
    from: z.literal("market"),
    level: CardLevelSchema,
    cardId: z.string().min(1),
  }),
  z.object({ type: z.literal("RESERVE"), from: z.literal("deck"), level: CardLevelSchema }),
  z.object({
    type: z.literal("RECRUIT"),
    from: z.enum(["market", "reserve"]),
    cardId: z.string().min(1),
  }),
  z.object({
    type: z.literal("RETURN_TOKENS"),
    tokens: z.partialRecord(TokenColorSchema, z.number().int().nonnegative()),
  }),
  z.object({ type: z.literal("CHOOSE_LOCATION"), locationId: z.string().min(1) }),
  z.object({ type: z.literal("TIMEOUT_SKIP"), present: z.literal(true).optional() }),
  z.object({ type: z.literal("FORFEIT") }),
  // Splendor Duel's moves; the engine a game plays decides which kinds it takes.
  z.object({ type: z.literal("SPEND_PRIVILEGE") }),
  z.object({ type: z.literal("REFILL") }),
  z.object({ type: z.literal("TAKE_LINE"), spaces: z.array(z.number().int().min(0).max(24)).min(1).max(3) }),
  z.object({ type: z.literal("RESERVE"), from: z.literal("pyramid"), cardId: z.string().min(1) }),
  z.object({ type: z.literal("BUY"), cardId: z.string().min(1) }),
  z.object({ type: z.literal("PICK_TOKEN"), space: z.number().int().min(0).max(24) }),
  z.object({ type: z.literal("PICK_OPPONENT_TOKEN"), color: TokenColorSchema }),
  z.object({ type: z.literal("PICK_JOIN_COLOR"), color: z.enum(["mind", "space", "soul", "power", "reality"]) }),
  z.object({ type: z.literal("PICK_ROYAL"), royalId: z.string().min(1) }),
]);

/** `POST /api/games` body — see ARCHITECTURE.md §4 `GameSettings`. */
export const CreateGameSchema = z.object({
  rules: z.enum(["marvel", "duel"]).optional(),
  playerCount: z.union([z.literal(2), z.literal(3), z.literal(4)]),
  botDifficulty: z.enum(["easy", "normal", "hard"]).optional(),
  targetPoints: z.number().int().min(1).max(99).optional(),
  turnTimeSeconds: z
    .union([z.literal(15), z.literal(30), z.literal(60), z.literal(90), z.literal(120), z.null()])
    .optional(),
  gameTimeMinutes: z.union([z.literal(10), z.literal(20), z.literal(30), z.null()]).optional(),
});
