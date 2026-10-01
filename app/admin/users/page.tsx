import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cn } from "cn";
import { ArrowLeft, Eye } from "lucide-react";

import { AdminTabs } from "@/components/admin/AdminTabs";
import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { FeedbackTable } from "@/components/admin/FeedbackTable";
import { GamesTable } from "@/components/admin/GamesTable";
import { isAdmin } from "@/lib/admin";
import { auth0 } from "@/lib/auth0";
import { loadFeedback } from "@/lib/load-feedback";
import { timeAgo } from "@/lib/game-record";
import { pageMetadata } from "@/lib/site";
import { formatDuration } from "@/lib/game-summary";
import { loadUserMetrics } from "@/lib/user-metrics";

export const metadata = pageMetadata("Admin dashboard", "Who is playing, and how much.", true);

const REFRESH_SECONDS = 60;

const ago = (date: Date | null) => (date ? timeAgo(date.getTime()) : "Never");
const day = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

function Tile({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <li className="flex flex-col rounded-xl bg-cosmos-800 px-4 py-3 ring-2 ring-cosmos-500 ring-inset">
      <span className="text-xs font-bold text-cosmos-300">{label}</span>
      <span className="text-2xl font-black text-gold-400 tabular-nums">{value}</span>
      {note ? <span className="text-xs text-cosmos-300">{note}</span> : null}
    </li>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl bg-cosmos-900 ring-2 ring-cosmos-500 ring-inset">
      <table className="w-full text-left text-sm whitespace-nowrap">
        <thead className="text-xs text-cosmos-300">
          <tr>
            {head.map((label) => (
              <th key={label} scope="col" className="px-4 py-3 font-bold">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular-nums [&_td]:px-4 [&_td]:py-2.5 [&_tr]:border-t [&_tr]:border-cosmos-700">
          {children}
        </tbody>
      </table>
    </div>
  );
}

function Dot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={cn("size-2 rounded-full", on ? "bg-green-400" : "bg-cosmos-500")} />
      {label}
    </span>
  );
}

export default async function AdminUsersPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/auth/login?returnTo=/admin/users");
  // Anyone else is told the page doesn't exist.
  if (!isAdmin(session.user)) notFound();

  // A load that fails, as when the database is slow to wake, leaves the page up to try again.
  const [metrics, feedback] = await Promise.all([loadUserMetrics(), loadFeedback()]).catch((error) => {
    console.error("admin metrics", error);
    return [null, []] as const;
  });
  if (!metrics) {
    return (
      <main className="dark flex min-h-dvh flex-col items-center justify-center gap-2 bg-cosmos px-6 text-center text-white">
        <AutoRefresh seconds={REFRESH_SECONDS} />
        <p className="font-display text-lg font-black tracking-widest text-gold-400 uppercase">
          Couldn&apos;t load the numbers
        </p>
        <p className="text-sm text-cosmos-300">Trying again in a minute.</p>
      </main>
    );
  }
  const { totals, tables, recent, users, sent } = metrics;
  const unread = feedback.filter((row) => row.status === "NEW").length;

  return (
    <main className="dark min-h-dvh bg-cosmos px-6 py-8 text-white">
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Back to the game"
            className="flex size-9 items-center justify-center rounded-full bg-cosmos-700 text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <h1 className="font-display text-2xl font-black tracking-widest text-gold-400 uppercase">Admin dashboard</h1>
          <p className="ml-auto text-xs text-cosmos-300">Refreshes every minute.</p>
          <Link
            href="/preview/board"
            className="flex h-9 items-center gap-2 rounded-full bg-cosmos-700 px-4 text-sm font-bold text-gold-200 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500"
          >
            <Eye className="size-5" />
            Previews
          </Link>
        </header>

        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          <Tile label="Online now" value={totals.online} note="Seen in the last 5 minutes" />
          <Tile label="Games in play" value={totals.liveGames} note={`${totals.openGames} open`} />
          <Tile label="Lobbies waiting" value={totals.lobbies} />
          <Tile label="Visits today" value={totals.visitsToday} note="Last 24 hours" />
          <Tile label="Users" value={totals.users} note={`${totals.newThisWeek} new this week`} />
          <Tile label="Games finished" value={totals.finished} />
          <Tile label="Games abandoned" value={totals.abandoned} />
        </ul>

        {/* The chosen tab is kept when the numbers are fetched again. */}
        <AdminTabs
          tabs={[
            { name: "Active games", view: <GamesTable games={tables} /> },
            { name: "Recent games", view: <GamesTable games={recent} recent /> },
            {
              name: "Every user",
              view: (
                <Table
                  head={[
                    "User",
                    "Email",
                    "Signed up",
                    "Visits",
                    "Last joined",
                    "Last seen",
                    "Time in app",
                    "Time playing",
                    "Games",
                    "Wins",
                    "Device",
                    "IP address",
                  ]}
                >
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>
                        <Link href={`/profile/${user.username}`} className="font-bold text-gold-200 hover:underline">
                          <Dot on={user.online} label={user.name ?? user.username} />
                        </Link>
                      </td>
                      <td>{user.email}</td>
                      <td>
                        {day(user.signedUpAt)}, {user.signIn}
                      </td>
                      <td>{user.count}</td>
                      <td>{ago(user.lastJoinedAt)}</td>
                      <td>{ago(user.lastSeenAt)}</td>
                      <td>{formatDuration(user.timeInAppMs)}</td>
                      <td>{formatDuration(user.playingMs)}</td>
                      <td title={`${user.finished} finished, ${user.inPlay} open, ${user.abandoned} abandoned`}>
                        {user.finished + user.inPlay + user.abandoned}
                      </td>
                      <td>{user.wins}</td>
                      <td>{user.device}</td>
                      <td className="font-mono" title={user.ips.join("\n")}>
                        {user.ips[0]}
                        {user.ips.length > 1 ? ` +${user.ips.length - 1}` : ""}
                      </td>
                    </tr>
                  ))}
                </Table>
              ),
            },
            {
              name: "Message stats",
              view: (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Table head={["Emoji", "Times sent"]}>
                    {sent.emojis.map((emoji) => (
                      <tr key={emoji.body}>
                        <td className="text-xl">{emoji.body}</td>
                        <td>{emoji.count}</td>
                      </tr>
                    ))}
                  </Table>
                  <Table head={["Message", "Times sent"]}>
                    {sent.messages.map((message) => (
                      <tr key={message.body}>
                        <td>{message.body}</td>
                        <td>{message.count}</td>
                      </tr>
                    ))}
                  </Table>
                </div>
              ),
            },
            {
              name: unread ? `Feedback (${unread} new)` : "Feedback",
              view: <FeedbackTable rows={feedback} />,
            },
          ]}
        />
      </div>
    </main>
  );
}
