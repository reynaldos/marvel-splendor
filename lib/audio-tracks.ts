/** Where the sound files live. Drop the files in public/audio and the paths here find them. */

/**
 * Background music. A player's pick is saved by `id`, so never change or
 * reuse one; the shop will add to this list.
 */
export const BGM_TRACKS = [{ id: "theme", label: "Theme", src: "/audio/bgm/theme.mp3" }] as const;

/** The game's sounds, the same for everyone. */
export const SFX = {
  /** Picking a stone or a deck on the board, before the turn is played. */
  tap: "/audio/sfx/tap.mp3",
  /** Opening a card, your reserves, or a team to look at. */
  flip: "/audio/sfx/flip.mp3",
  yourTurn: "/audio/sfx/your-turn.mp3",
  /** Five seconds left on your turn. */
  clockLow: "/audio/sfx/clock-low.mp3",
  /** Stones and cards landing in a hand. */
  takeTokens: "/audio/sfx/take-tokens.mp3",
  recruit: "/audio/sfx/recruit.mp3",
  reserve: "/audio/sfx/reserve.mp3",
  location: "/audio/sfx/location.mp3",
  timeStone: "/audio/sfx/time-stone.mp3",
  avengers: "/audio/sfx/avengers.mp3",
  chat: "/audio/sfx/chat.mp3",
  victory: "/audio/sfx/victory.mp3",
  defeat: "/audio/sfx/defeat.mp3",
  /** The game ends with no winner: abandoned, or out of time. */
  gameOver: "/audio/sfx/game-over.mp3",
} as const;

export type SfxName = keyof typeof SFX;
