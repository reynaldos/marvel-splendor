import { PlayerAvatar } from "@/components/profile/PlayerAvatar";
import type { ReactNode } from "react";
import { cn } from "cn";
import { ArrowLeft, Bot, Crown, Star, UserRound, X } from "lucide-react";

import { AwayTimer } from "@/components/lobby/AwayTimer";
import { BotLevel } from "@/components/lobby/BotLevel";
import { Rule } from "@/components/lobby/Rule";
import { ShareCode } from "@/components/lobby/ShareCode";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Stage, StageRows } from "@/components/Stage";
import type { BotDifficulty } from "@/lib/engine/types";

export interface LobbySeat {
  /** The player's picture; without one, their initials are shown. */
  avatarUrl?: string | null;
  /** The seat number the table's actions refer to. */
  seat: number;
  name: string;
  isBot: boolean;
  isHost: boolean;
  isYou: boolean;
  /** How well a bot plays; unset for people. */
  difficulty?: BotDifficulty;
}

type Action = (formData: FormData) => Promise<void>;

interface LobbyScreenProps {
  joinCode: string;
  /** When the room closes unless the host is back; null while they are in it. */
  hostAwayUntil: number | null;
  /** One entry per place at the table, people first; null is an open place. */
  seats: Array<LobbySeat | null>;
  /** True when the viewer is hosting and may change the table. */
  isHost: boolean;
  targetPoints: number;
  turnTimeSeconds: number | null;
  onAddBot: Action;
  onRemoveBot: (seat: number) => Action;
  onSetBotDifficulty: (seat: number) => Action;
  onStart: Action;
  onLeave: Action;
}

const NAME_PILL = "flex h-8 w-full items-center justify-center rounded-full px-3 text-sm font-bold";

function Place({
  seat,
  isHost,
  away,
  below,
  children,
}: {
  seat: LobbySeat | null;
  isHost: boolean;
  /** The player has stepped out; their place is drawn dimmed until they are back. */
  away?: boolean;
  /** Shown under the name. */
  below?: ReactNode;
  /** Drawn over the picture. */
  children: ReactNode;
}) {
  const Icon = seat?.isBot ? Bot : UserRound;
  return (
    <li className={cn("flex w-38 flex-col items-center gap-2", away && "opacity-50 grayscale")}>
      <span
        className={cn(
          "relative flex size-30 items-center justify-center rounded-3xl",
          seat
            ? "bg-linear-to-b from-cosmos-700 to-cosmos-900 ring-3 ring-gold-400"
            : "border-3 border-dashed border-cosmos-500/70 bg-cosmos-950/50",
        )}
      >
        {seat?.avatarUrl ? (
          <PlayerAvatar src={seat.avatarUrl} name={seat.name} className="size-24 ring-0" />
        ) : seat && !seat.isBot ? (
          <span className="font-display text-5xl font-black text-gold-200">
            {seat.name.slice(0, 2).toUpperCase()}
          </span>
        ) : (
          <Icon className={cn("size-16", seat ? "text-gold-200" : "text-cosmos-500")} />
        )}
        {seat?.isHost ? (
          <Crown
            aria-label="Host"
            className="absolute -top-3 -left-3 size-9 -rotate-12 fill-gold-400 text-gold-600"
          />
        ) : null}
        {children}
      </span>
      <span
        className={cn(
          NAME_PILL,
          !seat && "bg-cosmos-800 text-cosmos-300",
          seat && (seat.isYou ? "bg-gold-400 text-cosmos-950" : "bg-cosmos-700 text-white"),
        )}
      >
        <span className="truncate">{seat ? seat.name : isHost ? "Open seat" : "Waiting…"}</span>
      </span>
      {below}
    </li>
  );
}

/** The table before a game: the code to share, who has sat down, and the host's controls. */
export function LobbyScreen({
  joinCode,
  hostAwayUntil,
  seats,
  isHost,
  targetPoints,
  turnTimeSeconds,
  onAddBot,
  onRemoveBot,
  onSetBotDifficulty,
  onStart,
  onLeave,
}: LobbyScreenProps) {
  const seated = seats.filter(Boolean).length;
  const canStart = seated >= 2;

  return (
    <Stage>
      <StageRows>
        <div className="flex justify-center">
          <ShareCode code={joinCode} />
        </div>

        <ol className="flex items-start justify-evenly">
          {seats.map((seat, i) => (
            <Place
              key={seat?.seat ?? `open-${i}`}
              seat={seat}
              isHost={isHost}
              away={seat?.isHost && hostAwayUntil !== null}
              below={
                seat?.isHost && hostAwayUntil !== null ? (
                  <AwayTimer until={hostAwayUntil} />
                ) : isHost && seat?.isBot ? (
                  <BotLevel level={seat.difficulty ?? "normal"} action={onSetBotDifficulty(seat.seat)} />
                ) : seat?.isBot ? (
                  <span className="flex h-7 items-center rounded-full bg-cosmos-950 px-3 text-xs font-bold text-gold-200 uppercase">
                    {seat.difficulty ?? "normal"}
                  </span>
                ) : null
              }
            >
              {isHost && seat?.isBot ? (
                <form action={onRemoveBot(seat.seat)} className="absolute -top-3 -right-3 flex">
                  <button
                    type="submit"
                    aria-label="Remove bot"
                    className="flex size-8 items-center justify-center rounded-full bg-marvel text-white ring-2 ring-white/40 hover:bg-red-500"
                  >
                    <X className="size-5" />
                  </button>
                </form>
              ) : null}
              {isHost && !seat ? (
                <form action={onAddBot} className="absolute inset-x-3 bottom-2 flex">
                  <button
                    type="submit"
                    className="h-7 flex-1 rounded-full bg-cosmos-500 text-xs font-bold text-white uppercase hover:bg-cosmos-300 hover:text-cosmos-950"
                  >
                    Add bot
                  </button>
                </form>
              ) : null}
            </Place>
          ))}
        </ol>

        <footer className="flex items-center justify-between gap-4">
          <form action={onLeave} className="flex">
            <button type="submit" className="flex items-center gap-2 text-base font-bold whitespace-nowrap hover:text-gold-200">
              <span className="flex size-11 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset">
                <ArrowLeft className="size-6" />
              </span>
              {isHost ? "Cancel lobby" : "Leave"}
            </button>
          </form>

          <div className="flex gap-8">
            <Rule
              icon={<TimerIcon className="size-10" />}
              label="Turn time"
              value={turnTimeSeconds ? `${turnTimeSeconds} sec` : "Untimed"}
            />
            <Rule
              icon={<Star className="size-10 fill-gold-400 text-gold-600" />}
              label="Points to win"
              value={String(targetPoints)}
            />
          </div>

          {isHost ? (
            <form action={onStart} className="flex">
              <button
                type="submit"
                disabled={!canStart}
                className="h-13 w-56 rounded-full bg-marvel font-display text-lg font-black tracking-wide text-white uppercase shadow-lg hover:bg-red-500 disabled:bg-cosmos-700 disabled:text-cosmos-300"
              >
                {canStart ? "Start game" : "Need 2 players"}
              </button>
            </form>
          ) : (
            <p className="flex h-13 w-56 items-center justify-center text-center font-display text-sm font-bold tracking-wide text-gold-400 uppercase">
              Waiting for the host…
            </p>
          )}
        </footer>
      </StageRows>
    </Stage>
  );
}
