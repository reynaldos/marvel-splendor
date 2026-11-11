"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Hourglass, Send, Star } from "lucide-react";
import { toast } from "sonner";

import { WinTile } from "@/components/duel/TokenBoard";
import { AssetImage } from "@/components/game/assets";
import { Option } from "@/components/lobby/Option";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pill } from "@/components/ui/pill";
import type { FriendResult } from "@/lib/friends";
import { DUEL_TURN_TIME_OPTIONS, GAME_CLOCK_OPTIONS, nextOption, POINT_OPTIONS, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

export type SendToRoom = (friendId: string, duel: boolean, form: FormData) => Promise<FriendResult & { gameId?: string }>;

const CLOCKS = [null, ...GAME_CLOCK_OPTIONS];
/** A Duel's turn times on offer, and no turn clock. */
const DUEL_TIMES = [...DUEL_TURN_TIME_OPTIONS, null];
const GAME_TILE = "flex flex-1 flex-col items-center gap-3 rounded-2xl bg-cosmos-950 p-4 ring-2 ring-cosmos-500 ring-inset outline-none hover:bg-cosmos-700 focus-visible:ring-gold-400";
const GAME_NAME = "font-display text-base font-black tracking-wide text-gold-400 uppercase";

/**
 * Send invite on the Friends screen: pick the game, set it up as on Play Game or Duel, and Send.
 * That opens the room, invites the friend, and takes the player to the room, where more can be invited.
 */
export function InviteToRoom({ friendId, username, onSend }: { friendId: string; username: string; onSend: SendToRoom }) {
  const router = useRouter();
  const [game, setGame] = useState<"marvel" | "duel" | null>(null);
  const [turnTime, setTurnTime] = useState(TURN_TIME_OPTIONS[0]);
  const [points, setPoints] = useState(POINT_OPTIONS[0]);
  const [duelTime, setDuelTime] = useState<number | null>(DUEL_TIMES[0]);
  const [clock, setClock] = useState<number | null>(CLOCKS[0]);
  const [busy, setBusy] = useState(false);

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const result = await onSend(friendId, game === "duel", new FormData(event.currentTarget));
      if ("error" in result) toast.error(result.error);
      else if (result.message) toast.success(result.message);
      if (result.gameId) return router.push(`/lobby/${result.gameId}`);
    } catch {
      toast.error("That didn't go through. Try again.");
    }
    setBusy(false);
  };

  return (
    <Dialog onOpenChange={(open) => !open && setGame(null)}>
      <DialogTrigger asChild>
        <Pill tone="gold" className="w-full">
          <Send className="size-4" />
          Send invite
        </Pill>
      </DialogTrigger>
      <DialogContent className="theme-cosmos dark max-h-[calc(var(--screen-h)*0.9)] gap-4 overflow-y-auto border-2 border-gold-400 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite {username}</DialogTitle>
          <DialogDescription>{game ? "Set up the game, then send. You go to the room; they get the invite." : "Which game?"}</DialogDescription>
        </DialogHeader>

        {game === null ? (
          <div className="flex gap-3">
            <button type="button" onClick={() => setGame("marvel")} className={GAME_TILE}>
              <span className="relative aspect-[1404/688] w-full overflow-hidden rounded-xl ring-2 ring-gold-400">
                <AssetImage src="/assets/infinity-gauntlet.jpg" alt="" sizes="200px" />
              </span>
              <span className={GAME_NAME}>Original</span>
            </button>
            <button type="button" onClick={() => setGame("duel")} className={GAME_TILE}>
              <span className="flex w-full [&>*]:w-full [&>*]:ring-2 [&>*]:ring-gold-400">
                <WinTile still />
              </span>
              <span className={GAME_NAME}>Duel</span>
            </button>
          </div>
        ) : (
          <form onSubmit={(event) => void send(event)} className="flex flex-col gap-4">
            <div className="flex justify-center gap-3">
              {game === "marvel" ? (
                <>
                  <Option className="w-28" icon={<TimerIcon className="size-12" />} label="Turn time" value={`${turnTime} sec`} onNext={() => setTurnTime((v) => nextOption(TURN_TIME_OPTIONS, v))} />
                  <Option className="w-28" icon={<Star className="size-12 fill-gold-400 text-gold-600" />} label="Points" value={String(points)} onNext={() => setPoints((v) => nextOption(POINT_OPTIONS, v))} />
                  <input type="hidden" name="turnTimeSeconds" value={turnTime} />
                  <input type="hidden" name="targetPoints" value={points} />
                </>
              ) : (
                <>
                  <Option className="w-28" icon={<TimerIcon className="size-12" />} label="Turn time" value={duelTime ? `${duelTime} sec` : "Off"} onNext={() => setDuelTime((v) => nextOption(DUEL_TIMES, v))} />
                  <input type="hidden" name="turnTimeSeconds" value={duelTime ?? "off"} />
                </>
              )}
              <Option className="w-28" icon={<Hourglass className="size-12 text-gold-400" />} label="Game clock" value={clock ? `${clock} min` : "No clock"} onNext={() => setClock((v) => nextOption(CLOCKS, v))} />
              <input type="hidden" name="gameTimeMinutes" value={clock ?? "off"} />
            </div>
            <div className="flex gap-3">
              <Pill className="flex-1" disabled={busy} onClick={() => setGame(null)}>
                Back
              </Pill>
              <Pill type="submit" tone="gold" className="flex-1" disabled={busy}>
                <Send className="size-4" />
                Send
              </Pill>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
