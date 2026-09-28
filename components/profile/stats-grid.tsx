import type { UserStatsSnapshot } from "@/lib/record-stats";

export function StatsGrid({ stats }: { stats: UserStatsSnapshot }) {
  const entries: { label: string; value: string | number }[] = [
    { label: "Games played", value: stats.gamesPlayed },
    { label: "Wins", value: stats.wins },
    { label: "Vs computer", value: stats.vsBotWins },
    { label: "Best points", value: stats.bestPoints },
    { label: "Fastest win", value: stats.fastestWinTurns != null ? `${stats.fastestWinTurns} turns` : "—" },
    { label: "Avengers tiles", value: stats.avengersTilesWon },
    { label: "Locations", value: stats.locationsClaimed },
  ];

  return (
    <dl className="grid grid-cols-4 gap-2">
      {entries.map((entry) => (
        <div
          key={entry.label}
          className="flex h-16 w-32 flex-col justify-center rounded-xl bg-cosmos-900/80 px-3 ring-2 ring-cosmos-500 ring-inset"
        >
          <dt className="truncate font-display fs-2xs font-bold text-gold-400 uppercase">{entry.label}</dt>
          <dd className="text-2xl font-black whitespace-nowrap tabular-nums">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
