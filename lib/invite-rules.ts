/** The room-invite rules that need no database, so they can be tested on their own. */

/** At most this many friends one player may invite to one room. */
export const MAX_INVITES_PER_ROOM = 10;
/** An unanswered invite may be sent again once this long has passed. */
export const RESEND_AFTER_MS = 60_000;

/** The same words `joinLobby` uses, so a player sees one message for one reason. */
export const INVITE_MESSAGES = {
  started: "That game has already started.",
  closed: "That room has closed.",
  full: "That game is full.",
  seated: "They're already at the table.",
  tooMany: `You've invited ${MAX_INVITES_PER_ROOM} friends to this room.`,
  declined: "You declined this invite.",
  theyDeclined: "They declined this invite.",
  tooSoon: "Wait a minute before you send it again.",
} as const;

/** Whether an unanswered invite sent at `sentAt` may be sent again. */
export const canResend = (sentAt: number, now = Date.now()): boolean => now - sentAt >= RESEND_AFTER_MS;

export interface InviteRoom {
  status: string;
  /** When the room closes unless the host is back; null while they are in it. */
  hostAwayUntil: number | null;
  taken: number;
  seats: number;
}

/** Why an invite to this room can't be taken up, or null while it can. */
export function inviteClosedReason(room: InviteRoom, now = Date.now()): string | null {
  if (room.status === "ACTIVE" || room.status === "FINISHED") return INVITE_MESSAGES.started;
  if (room.status !== "LOBBY" || (room.hostAwayUntil !== null && now >= room.hostAwayUntil)) return INVITE_MESSAGES.closed;
  if (room.taken >= room.seats) return INVITE_MESSAGES.full;
  return null;
}

/** "Marvel game, 2 of 4 seats taken", for the invite's line. */
export function roomLine(room: { duel: boolean; taken: number; seats: number }): string {
  return `${room.duel ? "Duel" : "Marvel game"}, ${room.taken} of ${room.seats} seats taken`;
}
