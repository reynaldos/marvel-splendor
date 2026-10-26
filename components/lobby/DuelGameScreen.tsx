"use client";

import { useState } from "react";
import { Hourglass } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { WinTile } from "@/components/duel/TokenBoard";
import { Option } from "@/components/lobby/Option";
import { StonesAround } from "@/components/lobby/PrivateGameScreen";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Stage, StageRows } from "@/components/Stage";
import { GAME_CLOCK_OPTIONS, nextOption, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

type Action = (formData: FormData) => Promise<void>;

/** The turn times on offer, and no clock at all; the game clocks, and none. */
const TIMES = [...TURN_TIME_OPTIONS, null];
const CLOCKS = [null, ...GAME_CLOCK_OPTIONS];

/**
 * Setting up a Duel, the two-player game, as a private game is: pick the turn time and open a room for two,
 * or join someone else's by code. The room is where a bot is added or a friend arrives.
 */
export function DuelGameScreen({ onCreate, onJoin }: { onCreate: Action; onJoin: Action }) {
  const [turnTime, setTurnTime] = useState<number | null>(TIMES[0]);
  const [clock, setClock] = useState<number | null>(CLOCKS[0]);
  const [code, setCode] = useState("");

  return (
    <Stage>
      <StageRows>
        <div className="flex items-end justify-around gap-6">
          <div className="flex gap-4">
            <Option icon={<TimerIcon className="size-20" />} label="Turn time" value={turnTime ? `${turnTime} sec` : "Off"} onNext={() => setTurnTime((v) => nextOption(TIMES, v))} />
            <Option icon={<Hourglass className="size-20 text-gold-400" />} label="Game clock" value={clock ? `${clock} min` : "No clock"} onNext={() => setClock((v) => nextOption(CLOCKS, v))} />
          </div>

          <div className="flex w-80 flex-col gap-2">
            <StonesAround>
              <span className="relative flex w-44 [&>*]:w-full [&>*]:shadow-lg [&>*]:ring-2 [&>*]:ring-gold-400">
                <WinTile still />
              </span>
            </StonesAround>
            <form action={onCreate} className="flex">
              <input type="hidden" name="turnTimeSeconds" value={turnTime ?? "off"} />
              <input type="hidden" name="gameTimeMinutes" value={clock ?? "off"} />
              <button type="submit" className="h-12 flex-1 rounded-full bg-marvel font-display text-lg font-black tracking-wide text-white uppercase shadow-lg hover:bg-red-500">
                Create room
              </button>
            </form>
            <form action={onJoin} className="flex h-13 items-center rounded-full bg-cosmos-950 p-1 ring-2 ring-cosmos-500 ring-inset">
              <input
                name="code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                aria-label="Room code"
                placeholder="Or enter room code..."
                required
                maxLength={12}
                autoComplete="off"
                autoCapitalize="characters"
                className="h-full min-w-0 flex-1 bg-transparent px-4 font-mono text-xl font-bold tracking-widest uppercase outline-none placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:text-cosmos-500 placeholder:normal-case"
              />
              <button type="submit" className="h-full rounded-full bg-cosmos-500 px-7 text-base font-black uppercase hover:bg-cosmos-300 hover:text-cosmos-950">
                Join
              </button>
            </form>
          </div>
        </div>

        <footer className="flex">
          <BackLink />
        </footer>
      </StageRows>
    </Stage>
  );
}
