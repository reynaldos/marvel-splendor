/** Where the sound files live, and how loud they play. Drop the files in public/audio and the paths here find them. */

/** 0 to 1. The music sits under the sounds. */
export const BGM_VOLUME = 0.1;
export const SFX_VOLUME = 1;

/**
 * Background music. A player's pick is saved by `id`, so never change or
 * reuse one; the shop will add to this list.
 */
export const BGM_TRACKS = [{ id: "theme", label: "Theme", src: "/audio/bgm/theme.mp3" }] as const;

/** The game's sounds, the same for everyone. AAC, made from the originals with macOS's afconvert. */
export const SFX = {
  /** Picking a stone or a deck on the board, before the turn is played. */
  tap: "/audio/sfx/tap.m4a",
  /** Viewing a card large, or opening a Location, the Avengers tile, your reserves or a team to look at. */
  flip: "/audio/sfx/flip.m4a",
  yourTurn: "/audio/sfx/your-turn.m4a",
  /** One tick; it repeats quickly through the last seconds of your turn. */
  clockLow: "/audio/sfx/clock-low.m4a",
  /** Stones or a card landing in a hand, yours or anyone's, once the turn is played. */
  recruit: "/audio/sfx/recruit.m4a",
  reserve: "/audio/sfx/reserve.m4a",
  location: "/audio/sfx/location.m4a",
  timeStone: "/audio/sfx/time-stone.m4a",
  avengers: "/audio/sfx/avengers.m4a",
  chat: "/audio/sfx/chat.m4a",
  victory: "/audio/sfx/victory.m4a",
  defeat: "/audio/sfx/defeat.m4a",
  /** The game ends with no winner: abandoned, or out of time. */
  gameOver: "/audio/sfx/game-over.m4a",
} as const;

export type SfxName = keyof typeof SFX;
