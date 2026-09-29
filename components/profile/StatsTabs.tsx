"use client";

import { useState, type ReactNode } from "react";
import { cn } from "cn";
import {
  Bot,
  Dices,
  MapPin,
  Shield,
  Skull,
  Star,
  Swords,
  Timer,
  TrendingDown,
  Trophy,
} from "lucide-react";

import { AvengersIcon } from "@/components/game/assets";
import { GameRecords } from "@/components/profile/GameRecords";
import type { CareerStats } from "@/lib/career-stats";
import type { GameRecord } from "@/lib/game-record";
import type { UserStatsSnapshot } from "@/lib/record-stats";

interface Stat {
  label: string;
  icon: ReactNode;
  value: string | number;
}

const NONE = "—";
const ICON = "size-6 text-gold-400";
const badge = <AvengersIcon className="size-6 text-base" />;

function decimal(value: number | null): string {
  return value === null ? NONE : value.toFixed(1);
}

function tabs(stats: UserStatsSnapshot, career: CareerStats, records: CareerStats): Array<{ name: string; stats: Stat[] }> {
  return [
    {
      name: "Statistics",
      stats: [
        {
          label: "Games played",
          icon: <Dices className={ICON} />,
          value: stats.gamesPlayed,
        },
        { label: "Wins", icon: <Trophy className={ICON} />, value: stats.wins },
        {
          label: "Vs computer",
          icon: <Bot className={ICON} />,
          value: stats.vsBotWins,
        },
        {
          label: "Locations",
          icon: <MapPin className={ICON} />,
          value: stats.locationsClaimed,
        },
        { label: "Avengers tiles", icon: badge, value: stats.avengersTilesWon },
        {
          label: "Average badges",
          icon: badge,
          value: decimal(career.averageTags),
        },
      ],
    },
    {
      name: "Records",
      // From games against other people only.
      stats: [
        { label: "Highest score", icon: <Star className={cn(ICON, "fill-gold-400")} />, value: records.bestPoints },
        { label: "Best win", icon: <Trophy className={ICON} />, value: records.bestWinPoints ?? NONE },
        { label: "Average win", icon: <Swords className={ICON} />, value: decimal(records.averageWinPoints) },
        { label: "Lowest loss", icon: <TrendingDown className={ICON} />, value: records.lowestLossPoints ?? NONE },
        {
          label: "Fastest win",
          icon: <Timer className={ICON} />,
          value: records.fastestWinTurns != null ? `${records.fastestWinTurns} turns` : NONE,
        },
        { label: "Most badges", icon: badge, value: records.mostTags },
      ],
    },
    {
      name: "Heroes & Villains",
      stats: [
        {
          label: "Heroes recruited",
          icon: <Shield className={ICON} />,
          value: career.heroes,
        },
        {
          label: "Villains recruited",
          icon: <Skull className={ICON} />,
          value: career.villains,
        },
        { label: "Top hero", icon: <Shield className={ICON} />, value: career.mostUsedHero?.name ?? NONE },
        { label: "Top villain", icon: <Skull className={ICON} />, value: career.mostUsedVillain?.name ?? NONE },
      ],
    },
  ];
}

interface StatsTabsProps {
  stats: UserStatsSnapshot;
  career: CareerStats;
  /** The same stats, from games against other people only. */
  records: CareerStats;
  games: GameRecord[];
}

const PANEL = "h-50 rounded-2xl bg-cosmos-950/80 ring-3 ring-cosmos-500 ring-inset";

/** A player's stats, a few at a time, then their games: tabs along the top. */
export function StatsTabs({ stats, career, records, games }: StatsTabsProps) {
  const [open, setOpen] = useState(0);
  const all = tabs(stats, career, records);
  const shown = all.at(open);

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div role="tablist" className="flex gap-1 px-3">
        {[...all.map((tab) => tab.name), "Game Record"].map((name, i) => (
          <button
            key={name}
            type="button"
            role="tab"
            aria-selected={i === open}
            onClick={() => setOpen(i)}
            className={cn(
              // Each tab is as wide as its name, and gives way before the row outgrows the panel.
              "h-8 min-w-0 truncate rounded-t-xl px-3 text-sm font-black",
              i === open ? "bg-cosmos-500 text-white" : "bg-cosmos-800 text-cosmos-300 hover:text-white",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      {shown ? (
        <dl
          role="tabpanel"
          className={cn(
            PANEL,
            "grid content-center gap-x-5 gap-y-5 px-5",
            shown.stats.length > 4 ? "grid-cols-3" : "grid-cols-2",
          )}
        >
          {shown.stats.map((stat) => (
            <div key={stat.label} className="flex min-w-0 flex-col gap-1">
              <dt className="truncate px-3 text-sm font-bold">{stat.label}</dt>
              <dd className="relative flex h-10 items-center justify-center rounded-full bg-cosmos-900 pr-3 pl-10 ring-2 ring-cosmos-500 ring-inset">
                <span className="absolute left-3 flex">{stat.icon}</span>
                {/* Words are set smaller than numbers, to fit beside the icon. */}
                <span
                  className={cn(
                    "truncate font-black text-gold-400 tabular-nums",
                    typeof stat.value === "number" ? "text-xl" : "text-base",
                  )}
                >
                  {stat.value}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      ) : (
        // The list scrolls by touch or trackpad, with no scrollbar drawn; rows fade out at the frame.
        <div role="tabpanel" className={cn(PANEL, "overflow-hidden p-1")}>
          <div className="scroll-fade flex h-full flex-col overflow-y-auto overscroll-contain px-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <GameRecords games={games} />
          </div>
        </div>
      )}
    </div>
  );
}
