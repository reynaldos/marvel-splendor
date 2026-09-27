import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { UserStatsSnapshot } from "@/lib/record-stats";

type Props = {
  stats: UserStatsSnapshot;
};

export function StatsGrid({ stats }: Props) {
  const entries: { label: string; value: string | number }[] = [
    { label: "Games played", value: stats.gamesPlayed },
    { label: "Wins", value: stats.wins },
    { label: "Vs-bot wins", value: stats.vsBotWins },
    { label: "Best points", value: stats.bestPoints },
    {
      label: "Fastest win",
      value: stats.fastestWinTurns != null ? `${stats.fastestWinTurns} turns` : "—",
    },
    { label: "Avengers tiles won", value: stats.avengersTilesWon },
    { label: "Locations claimed", value: stats.locationsClaimed },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {entries.map((entry) => (
        <Card key={entry.label}>
          <CardHeader>
            <CardTitle className="text-muted-foreground">{entry.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{entry.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
