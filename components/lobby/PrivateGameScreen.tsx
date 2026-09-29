"use client";

import { useState } from "react";
import { cn } from "cn";
import { Star } from "lucide-react";

import { BackLink } from "@/components/BackLink";
import { AssetImage } from "@/components/game/assets";
import { Logo } from "@/components/home/Logo";
import { Option } from "@/components/lobby/Option";
import { TimerIcon } from "@/components/lobby/TimerIcon";
import { Stage, StageRows } from "@/components/Stage";
import { nextOption, POINT_OPTIONS, TURN_TIME_OPTIONS } from "@/lib/lobby-rules";

type Action = (formData: FormData) => Promise<void>;

// The six stones, three tucked behind each side of the Gauntlet.
const STONES_AROUND = [
  { stone: "mind", place: "top-0 left-2" },
  { stone: "space", place: "top-6 left-9" },
  { stone: "soul", place: "bottom-0 left-0" },
  { stone: "power", place: "top-0 right-2" },
  { stone: "reality", place: "top-6 right-9" },
  { stone: "time", place: "right-0 bottom-0" },
];

/** Setting up a game with friends: choose the rules and open a room, or join someone else's. */
export function PrivateGameScreen({ onCreate, onJoin }: { onCreate: Action; onJoin: Action }) {
  const [turnTime, setTurnTime] = useState(TURN_TIME_OPTIONS[0]);
  const [points, setPoints] = useState(POINT_OPTIONS[0]);
  const [code, setCode] = useState("");

  return (
    <Stage>
      <StageRows>
        <header className="flex items-center justify-between">
          <Logo className="text-3xl" />
          <h1 className="font-display text-2xl font-black tracking-widest text-gold-400 uppercase">Private game</h1>
        </header>

        <div className="flex items-end justify-around gap-6">
          <div className="flex gap-4">
            <Option
              icon={<TimerIcon className="size-24" />}
              label="Turn time"
              value={`${turnTime} sec`}
              onNext={() => setTurnTime((v) => nextOption(TURN_TIME_OPTIONS, v))}
            />
            <Option
              icon={<Star className="size-24 fill-gold-400 text-gold-600" />}
              label="Points to win"
              value={String(points)}
              onNext={() => setPoints((v) => nextOption(POINT_OPTIONS, v))}
            />
          </div>

          <div className="flex w-80 flex-col gap-2">
            <div className="relative flex justify-center">
              {STONES_AROUND.map(({ stone, place }) => (
                <span
                  key={stone}
                  className={cn("absolute size-10 overflow-hidden rounded-full shadow-lg", place)}
                >
                  <AssetImage src={`/assets/stones/${stone}-token.png`} alt="" />
                </span>
              ))}
              <span className="relative aspect-[1404/688] w-44 overflow-hidden rounded-xl shadow-lg ring-2 ring-gold-400">
                <AssetImage src="/assets/infinity-gauntlet.jpg" alt="" sizes="22vw" />
              </span>
            </div>
            <form action={onCreate} className="flex">
              <input type="hidden" name="turnTimeSeconds" value={turnTime} />
              <input type="hidden" name="targetPoints" value={points} />
              {/* Sent along for what may be typed there besides a room's code. */}
              <input type="hidden" name="code" value={code} />
              <button
                type="submit"
                className="h-12 flex-1 rounded-full bg-marvel font-display text-lg font-black tracking-wide text-white uppercase shadow-lg hover:bg-red-500"
              >
                Create room
              </button>
            </form>
         
            <form
              action={onJoin}
              className="flex h-13 items-center rounded-full bg-cosmos-950 p-1 ring-2 ring-cosmos-500 ring-inset"
            >
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
              <button
                type="submit"
                className="h-full rounded-full bg-cosmos-500 px-7 text-base font-black uppercase hover:bg-cosmos-300 hover:text-cosmos-950"
              >
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
