/**
 * Deterministic heuristic bot policy (ARCHITECTURE.md §3 "The bot").
 *
 * `chooseBotMove` scores every move `legalMoves` offers for a seat by
 * simulating it (`applyMove`) and evaluating the resulting state, then picks
 * the highest-scoring move. Ties are broken by generation order (the first
 * highest-scoring move `legalMoves` produced) — deterministic, no RNG, so
 * bot-vs-bot games are fully reproducible from their seed.
 *
 * Responsibility split for pending sub-moves (RETURN_TOKENS / CHOOSE_LOCATION):
 * `chooseBotMove` happily answers them too — `legalMoves` already narrows to
 * just the pending-resolving moves, and the same scoring function ranks them
 * (e.g. it naturally prefers to return tokens least useful for near-term
 * recruits). It is the CALLER's job to keep invoking `chooseBotMove` for the
 * same seat until `state.pending` is null before treating the turn as over —
 * this module does not loop internally. See tests/bot/*.test.ts for the loop.
 *
 * Scoring factors (ARCHITECTURE.md's bot-policy bullet list), each computed
 * on the state a candidate move would produce:
 *  - progress toward affordable high-value cards not yet in reach ("affordability")
 *  - color-set completion, including the specialization depth Level-3 costs
 *    actually require (win needs all 5 basic bonuses) ("colorSet")
 *  - Time Stone acquisition — a large flat reward once obtained, plus a
 *    capped "closing the gap" nudge beforehand ("timeStone")
 *  - Avengers-tag race ("tags")
 *  - token efficiency / hand-limit awareness ("tokenPenalty")
 *  - not permanently burning reserve slots on cards nowhere close to
 *    affordable, since reserved cards can never be discarded ("reserveBurden")
 *  - keeping the shared token bank from running dry, which (absent a PASS
 *    move in the engine — see this task's final report) can otherwise
 *    deadlock the game ("supplyCare")
 *
 * IMPORTANT invariant learned the hard way (see git history / task report):
 * any "how good is my best nearby opportunity" signal MUST exclude cards
 * that are already affordable right now, and any "value of holding X"
 * signal MUST be capped well below the flat reward for actually having X.
 * Otherwise a purely greedy, single-state evaluator will always rate
 * "leave the great option on the table" at least as well as "take it" —
 * recruiting can only ever remove or downgrade a visible opportunity, so if
 * admiring it scores as well as consuming it, the bot never pulls the
 * trigger. `bestOpportunityScore` and `timeStoneScore` both bake this in.
 *
 * Difficulty tiers (`state.settings.botDifficulty`, default "normal"):
 * "easy" ignores level-3 opportunities in its general affordability scan and
 * never looks beyond the immediate move; "normal" adds a shallow extra-ply
 * search that rewards moves which open up a strong follow-up move; "hard"
 * doesn't use this file's scoring at all, and plans ahead in planner.ts.
 */
import { planMove } from "@/lib/bot/planner";
import { getCard } from "@/lib/engine/data";
import { applyMove } from "@/lib/engine/apply";
import { legalMoves } from "@/lib/engine/legal-moves";
import { recruitCost } from "@/lib/engine/rules";
import {
  botDifficultyForSeat,
  MAX_RESERVED,
  STONES,
  TAGS_TO_CLAIM_AVENGERS,
  totalTokens,
  type BotDifficulty,
  type Card,
  type GameState,
  type Move,
  type PlayerState,
} from "@/lib/engine/types";

interface Weights {
  points: number;
  colorSet: number;
  timeStone: number;
  tags: number;
  tokenPenalty: number;
  affordability: number;
  reserveBurden: number;
  recruitBias: number;
  supplyCare: number;
  futurePlan: number;
  /** Highest card level considered by the general affordability scan. */
  affordabilityLevelCap: 1 | 2 | 3;
}

// The hard bot plans ahead instead, in planner.ts.
const WEIGHTS: Record<Exclude<BotDifficulty, "hard">, Weights> = {
  easy: {
    points: 1,
    colorSet: 0.6,
    timeStone: 1.0,
    tags: 0.3,
    tokenPenalty: 0.3,
    affordability: 0.5,
    reserveBurden: 0.08,
    recruitBias: 0.1,
    supplyCare: 0.15,
    futurePlan: 0,
    affordabilityLevelCap: 2,
  },
  // Looks one move further than easy does, and cares more about what a win takes.
  normal: {
    points: 1,
    colorSet: 1.5,
    timeStone: 1.8,
    tags: 0.9,
    tokenPenalty: 0.5,
    affordability: 1.3,
    reserveBurden: 0.25,
    recruitBias: 0.15,
    supplyCare: 0.3,
    futurePlan: 0.6,
    affordabilityLevelCap: 3,
  },
};

const HOARD_THRESHOLD = 5;

export function chooseBotMove(state: GameState, seat: number): Move {
  const difficulty = botDifficultyForSeat(state.settings, seat);
  if (difficulty === "hard") return planMove(state, seat);
  const weights = WEIGHTS[difficulty];

  const candidates = legalMoves(state, seat);
  if (candidates.length === 0) {
    throw new Error(
      `chooseBotMove: no legal moves for seat ${seat} (pending=${JSON.stringify(state.pending)})`,
    );
  }

  const tokensHeld = totalTokens(state.players[seat].tokens);

  let bestMove = candidates[0];
  let bestScore = -Infinity;

  for (const move of candidates) {
    const resultState = applyMove(state, seat, move);
    let score = evaluateState(resultState, seat, weights);

    if (weights.futurePlan > 0 && resultState.status === "active" && resultState.pending === null) {
      score += weights.futurePlan * bestFollowupImprovement(resultState, seat, score, weights);
    }

    // Recruiting spends tokens back into the shared supply and converts them
    // into permanent progress (points/bonus). The more tokens a player is
    // currently sitting on, the more valuable that recycling is — this is
    // what keeps the token economy flowing turn after turn instead of both
    // players racing each other to hoard the bank dry (see tests/bot: an
    // earlier tuning of this heuristic let exactly that happen, draining
    // every basic-color stack into players' hands with nothing recruitable
    // and no reserve slots left — a genuine deadlock).
    if (move.type === "RECRUIT") {
      score += weights.recruitBias * tokensHeld;
    }

    // Reserving is the only way to gain more S.H.I.E.L.D. wildcards, but
    // reserved cards can never be discarded — burning the *last* free slot
    // on something still nowhere close to affordable permanently forecloses
    // that option for the rest of the game. Extra-penalize that specific
    // case beyond the general reserveBurden term.
    if (move.type === "RESERVE" && state.players[seat].reserved.length === MAX_RESERVED - 1) {
      const reservedCard = resultState.players[seat].reserved.find(
        (r) => !state.players[seat].reserved.some((existing) => existing.cardId === r.cardId),
      );
      if (reservedCard) {
        const { shieldNeeded } = recruitCost(getCard(reservedCard.cardId), resultState.players[seat]);
        if (shieldNeeded > 3) score -= weights.reserveBurden * shieldNeeded * 2;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function evaluateState(state: GameState, seat: number, w: Weights): number {
  const player = state.players[seat];

  const colorSet = colorSetScore(player);
  const time = timeStoneScore(state, player);
  const tags = tagsScore(state, seat, player);
  const tokenPenalty = Math.max(0, totalTokens(player.tokens) - HOARD_THRESHOLD);
  const affordability = bestOpportunityScore(state, player, w.affordabilityLevelCap);
  const reserveBurden = reservedShortfall(player);
  const scarcity = supplyScarcityPenalty(state);

  return (
    w.points * player.points +
    w.colorSet * colorSet +
    w.timeStone * time +
    w.tags * tags -
    w.tokenPenalty * tokenPenalty +
    w.affordability * affordability -
    w.reserveBurden * reserveBurden -
    w.supplyCare * scarcity
  );
}

/**
 * Every basic-color supply stack simultaneously hitting 0 is exactly the
 * deadlock condition: nobody can TAKE_TOKENS, and if reserves are also maxed
 * out with unaffordable cards, nobody can act at all (the engine has no
 * "pass" move — see the bot task write-up). This is a shared-resource
 * signal, not player-specific: reward moves that leave the bank healthier
 * so no bot (self or opponent) is the one who drains it dry.
 */
const SUPPLY_HEALTH_FLOOR = 3;
function supplyScarcityPenalty(state: GameState): number {
  return STONES.reduce((sum, s) => sum + Math.max(0, SUPPLY_HEALTH_FLOOR - state.supply[s]), 0);
}

/**
 * Reserved cards can never be discarded — reserving one you can't plausibly
 * afford soon permanently ties up one of only 3 reserve slots (and, once
 * all 3 are full, cuts off the S.H.I.E.L.D. wildcard supply reserving would
 * have kept feeding you). Sum the remaining wildcard-equivalent shortfall
 * across everything currently reserved as a standing penalty, so reserving
 * a wildly-unaffordable card (especially blind) isn't free just because it
 * nudges some other metric up slightly.
 */
function reservedShortfall(player: PlayerState): number {
  return player.reserved.reduce((sum, r) => sum + recruitCost(getCard(r.cardId), player).shieldNeeded, 0);
}

/**
 * Rewards owning each new basic bonus color, with a strong push to complete
 * all 5, PLUS continued reward for stacking depth in any one color up to 7
 * (every Level-3 card's most expensive single stone costs 5-7 — capping this
 * lower, e.g. at 4, would flatten the payoff for specializing right when
 * specializing is exactly what unlocks Level-3 affordability, which is
 * exactly the trap an earlier tuning of this heuristic fell into: bots
 * spread bonuses evenly and never got any single color deep enough to ever
 * afford a Level-3 card, so both players ground through the *entire*
 * Level-1/2 supply before either recruited a single Level-3 card).
 */
const MAX_USEFUL_BONUS_DEPTH = 7;
function colorSetScore(player: PlayerState): number {
  const heldCount = STONES.filter((s) => player.bonuses[s] >= 1).length;
  const bonusDepth = STONES.reduce((sum, s) => sum + Math.min(player.bonuses[s], MAX_USEFUL_BONUS_DEPTH), 0);
  return heldCount * 2 + (heldCount === 5 ? 3 : 0) + bonusDepth * 0.3;
}

/**
 * Time Stone is a one-time, all-or-nothing gate on the win condition
 * (granted automatically on a player's first Level-3 recruit). Once already
 * held, it's worth a large flat bonus — one big enough that it MUST outscore
 * the "chase" signal below, or a bot ends up preferring to perpetually admire
 * a great, reachable Level-3 opportunity over ever actually recruiting it
 * (recruiting collapses "a great opportunity exists" into "a smaller flat
 * reward" — if the opportunity signal isn't capped well under the flat
 * reward, that trade nets negative and the bot never pulls the trigger; this
 * is exactly what an earlier tuning of this heuristic did, and both bots
 * ground through all 70 Level-1/2 cards before either ever recruited a
 * single Level-3 card despite several sitting trivially affordable).
 *
 * Otherwise, reward closing in on whichever Level-3 card (market or own
 * reserve) is currently cheapest to reach, capped well below the "obtained"
 * value — enough to nudge specialization/reservation choices toward an
 * actual target, never enough to rival capturing it.
 */
const TIME_STONE_OBTAINED_SCORE = 20;
const TIME_STONE_CHASE_CAP = 6;
function timeStoneScore(state: GameState, player: PlayerState): number {
  if (player.tokens.time >= 1) return TIME_STONE_OBTAINED_SCORE;
  const chase = bestOpportunityScore(state, player, 3, /* onlyLevel */ 3);
  return Math.min(chase, TIME_STONE_CHASE_CAP);
}

function avengersThreshold(state: GameState, seat: number): number {
  if (state.avengersHolder === null) return TAGS_TO_CLAIM_AVENGERS;
  if (state.avengersHolder === seat) return Infinity;
  return state.players[state.avengersHolder].tags + 1;
}

function tagsScore(state: GameState, seat: number, player: PlayerState): number {
  if (state.avengersHolder === seat) return player.tags + 2;
  const threshold = avengersThreshold(state, seat);
  if (!Number.isFinite(threshold) || threshold <= 0) return player.tags;
  const progress = player.tags >= threshold ? 2 : (player.tags / threshold) * 1.5;
  return player.tags + progress;
}

/**
 * Best "opportunity value" among currently-visible cards (market slots plus
 * the player's own reserve) up to `levelCap` that the player CANNOT YET
 * afford — this exists purely to steer TAKE_TOKENS/RESERVE choices toward
 * closing the gap on a genuine target. Higher for higher-point/higher-tag
 * cards and for cards requiring fewer additional wildcard-equivalent tokens
 * to close the gap (`shieldNeeded` from `recruitCost`).
 *
 * Deliberately EXCLUDES anything already affordable right now
 * (`shieldNeeded === 0`): this is a state-evaluation heuristic, scored on
 * whatever state a candidate move produces, and if it kept rewarding
 * already-recruitable cards just for still sitting there, "take tokens and
 * leave a great, already-affordable card untouched" would score *at least*
 * as well as "recruit it" every single time (recruiting only ever removes
 * that opportunity from the board, or replaces it with an unknown one) — a
 * bot would then never actually pull the trigger. Recruiting's real payoff
 * (points, bonuses, spending down held tokens) is already captured by the
 * other terms in evaluateState; this term's only job is "how close am I to
 * my next real target," so once something is affordable it has no more
 * distance left to close and drops out.
 */
function bestOpportunityScore(
  state: GameState,
  player: PlayerState,
  levelCap: 1 | 2 | 3,
  onlyLevel?: 1 | 2 | 3,
): number {
  let best = 0;
  const consider = (card: Card) => {
    if (onlyLevel ? card.level !== onlyLevel : card.level > levelCap) return;
    const { shieldNeeded } = recruitCost(card, player);
    if (shieldNeeded === 0) return;
    // Points dominate the value, with only a small flat floor — a 0-point
    // Level-1 filler card must never out-score a genuinely valuable card
    // that's merely a couple of tokens away (colorSetScore separately
    // rewards the diversification a 0-point card still offers).
    const base = card.points * 4 + card.tags * 2 + 0.5;
    const value = base / (1 + shieldNeeded);
    if (value > best) best = value;
  };

  for (const level of [1, 2, 3] as const) {
    for (const cardId of state.market[level]) {
      if (cardId) consider(getCard(cardId));
    }
  }
  for (const r of player.reserved) consider(getCard(r.cardId));

  return best;
}

/**
 * "hard" tier's extra ply: peek at the best move reachable from `state` as
 * if `seat` got to move again immediately (ignoring that it's really the
 * next player's turn) and return how much better that follow-up scores than
 * this move's own base score. This is a heuristic mobility signal, not a
 * real simulation of future turns — it never mutates or returns state, it
 * only informs which of this turn's candidate moves scores highest.
 */
function bestFollowupImprovement(
  state: GameState,
  seat: number,
  baseScore: number,
  w: Weights,
): number {
  const peek: GameState = { ...state, currentSeat: seat };
  const followups = legalMoves(peek, seat);
  let bestFollowup = -Infinity;
  for (const move of followups) {
    const next = applyMove(peek, seat, move);
    const score = evaluateState(next, seat, w);
    if (score > bestFollowup) bestFollowup = score;
  }
  if (bestFollowup === -Infinity) return 0;
  return Math.max(0, bestFollowup - baseScore);
}
