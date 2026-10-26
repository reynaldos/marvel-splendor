"use client";

import { useState } from "react";

import { BackLink } from "@/components/BackLink";
import { WinTile } from "@/components/duel/TokenBoard";
import { Option } from "@/components/lobby/Option";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Stage, StageRows } from "@/components/Stage";
import { TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

type Action = (formData: FormData) => Promise<void>;

/** The turn times on offer, and no clock at all. */
const TIMES = [...TURN_TIME_OPTIONS, null];

/**
 * Setting up a Duel, the two-player game, as a private game is: pick the turn time and open a room for two,
 * or join someone else's by code. The room is where a bot is added or a friend arrives.
 */
export function DuelGameScreen({ onCreate, onJoin }: { onCreate: Action; onJoin: Action }) {
  const [turnTime, setTurnTime] = useState<number | null>(TIMES[0]);
  const [code, setCode] = useState("");

  return (
    <Stage>
      <StageRows>
        <div className="flex items-end justify-around gap-6">
          <Option icon={<TimerIcon className="size-24" />} label="Turn time" value={turnTime ? `${turnTime} sec` : "Off"} onNext={() => setTurnTime((v) => TIMES[(TIMES.indexOf(v) + 1) % TIMES.length])} />

          <div className="flex w-80 flex-col gap-2">
            <div className="flex justify-center [&>*]:w-44 [&>*]:shadow-lg [&>*]:ring-2 [&>*]:ring-gold-400">
              <WinTile still />
            </div>
            <form action={onCreate} className="flex">
              <input type="hidden" name="turnTimeSeconds" value={turnTime ?? "off"} />
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
