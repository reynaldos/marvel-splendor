"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";

import { BackLink } from "@/components/BackLink";
import { CardLevelUps } from "@/components/game/CardLevelUps";
import { GameMenu } from "@/components/game/GameMenu";
import { PendingActionModals } from "@/components/game/PendingActionModals";
import { HowToPlay } from "@/components/home/HowToPlay";
import { Stage, StageRows } from "@/components/Stage";
import { TopBarView } from "@/components/TopBarView";
import { FRAME_TIER_NAMES } from "@/lib/frame-tier";
import type { GameSettings, PendingAction, TokenCounts } from "@/lib/engine/types";

import { PreviewMenu } from "../PreviewBar";
import { CARD_LEVEL_UPS } from "../game-over/standings";

const BUTTON = "flex h-10 items-center justify-center rounded-full bg-cosmos-950 px-4 text-sm font-black ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-700";
const HEADING = "font-display text-sm font-black tracking-widest text-gold-400 uppercase";

const PLAYERS = [
  { seat: 0, name: "You", isBot: false },
  { seat: 1, name: "maryanmi", isBot: true },
];
const SETTINGS: GameSettings = { turnTimeSeconds: 60, gameTimeMinutes: null, targetPoints: 16, botDifficulty: "normal" };
/** Two over the hand limit. */
const TOKENS: TokenCounts = { mind: 3, space: 2, soul: 2, power: 2, reality: 2, time: 1, shield: 0 };

/** A row of the page: its title, then the buttons that open popups. */
function Row({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex items-center gap-4">
      <h2 className={`${HEADING} w-32 shrink-0`}>{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  );
}

/** Every popup, each behind a button: the home menu and its views, the board's menu, the turn's sub-moves, the rewards. */
export function ModalsPreview() {
  const [pending, setPending] = useState<PendingAction | null>(null);
  const [returnOpen, setReturnOpen] = useState(true);
  const [levelUps, setLevelUps] = useState(false);

  return (
    <Stage>
      {/* The real top bar: its avatar, coins and menu buttons open the home popups. */}
      <TopBarView
        username="preview"
        avatarUrl={null}
        tier={FRAME_TIER_NAMES[0]}
        progress={{ level: 4, into: 30, span: 100 }}
        rating={1012}
        wins={7}
        coins={240}
        isAdmin={false}
        newFeedback={false}
        dailyBonus={{ day: 3, claimable: true, unlocksAt: null }}
        onClaimDailyBonus={async () => 30}
        onDeleteAccount={async () => {}}
      />
      <StageRows>
        <h1 className="font-display text-xl font-black tracking-widest text-gold-400 uppercase">Popups preview</h1>
        {/* Scrolls on a short screen, so the last row is never cut off. */}
        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <Row title="Home">
            <span className="text-sm text-white/70">Tap the coins or the menu button in the top bar.</span>
            <HowToPlay />
          </Row>
          <Row title="On the board">
            <span className="text-sm text-white/70">Original:</span>
            <GameMenu moveLog={[]} players={PLAYERS} viewerSeat={0} settings={SETTINGS} finished={false} busy={false} onForfeit={() => {}} onPause={() => {}} />
            <span className="text-sm text-white/70">Duel:</span>
            <GameMenu moveLog={[]} players={PLAYERS} viewerSeat={0} settings={{ ...SETTINGS, rules: "duel" }} finished={false} busy={false} onForfeit={() => {}} />
            <button
              type="button"
              className={BUTTON}
              onClick={() => {
                setReturnOpen(true);
                setPending({ type: "RETURN_TOKENS", mustReturn: 2 });
              }}
            >
              Too many tokens
            </button>
            <button type="button" className={BUTTON} onClick={() => setPending({ type: "CHOOSE_LOCATION", options: ["loc-01a", "loc-01b", "loc-02a"] })}>
              Choose a Location
            </button>
          </Row>
          <Row title="Rewards">
            <button type="button" className={BUTTON} onClick={() => setLevelUps(true)}>
              Cards ranked up
            </button>
            <Link href="/preview/pack" className={BUTTON}>
              Pack opening
            </Link>
            <Link href="/preview/game-over" className={BUTTON}>
              Game over
            </Link>
          </Row>
          <Row title="Duel choices">
            {["PickToken", "PickColorToken", "Steal", "Join", "Royal"].map((show) => (
              <Link key={show} href={`/preview/duel?show=${show}`} className={BUTTON}>
                {show}
              </Link>
            ))}
          </Row>
        </div>
        <footer className="flex items-center justify-between">
          <BackLink />
        </footer>
      </StageRows>

      <PendingActionModals
        pending={pending}
        viewerTokens={TOKENS}
        turnEndsAt={null}
        turnSeconds={null}
        returnOpen={returnOpen}
        onReturnOpenChange={setReturnOpen}
        onSubmitReturnTokens={() => setPending(null)}
        onSubmitChooseLocation={() => setPending(null)}
      />
      {levelUps ? <CardLevelUps ups={CARD_LEVEL_UPS} onClose={() => setLevelUps(false)} /> : null}
      <PreviewMenu />
    </Stage>
  );
}
