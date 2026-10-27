"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { cn } from "cn";
import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

import { closeDeadGamesAction, deleteGameAction } from "@/app/admin/actions";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ordinal, timeAgo } from "@/lib/game-record";
import { formatDuration, type GameSummary } from "@/lib/game-summary";

const PAGE = 25;
const MODE = { VS_BOT: "VS Computer", MULTIPLAYER: "Private Game" };
const TH = "px-4 py-3 font-bold";
const PAGER =
  "flex size-8 items-center justify-center rounded-full bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500 disabled:opacity-40 disabled:hover:bg-cosmos-700";
const DELETE = "flex h-9 items-center gap-2 rounded-full px-4 text-xs font-black tracking-wide uppercase disabled:opacity-40";

/** Runs the sweep the daily cron runs, from the admin page. */
function CloseDeadGames({ count }: { count: number }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending || count === 0} onClick={() => start(() => closeDeadGamesAction())} className={cn(DELETE, "bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}>
      <Trash2 className="size-4" />
      {pending ? "Closing…" : `Close ${count} left open`}
    </button>
  );
}

/** Deletes the game on a second tap; a finished one takes a moment, as the records are set right after it. */
function DeleteGame({ id, finished, onDone }: { id: string; finished: boolean; onDone: () => void }) {
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-3">
      {armed ? <span className="text-xs text-white/70">{finished ? "Its players' stats, rank, coins and cards are recounted." : "This can't be undone."}</span> : null}
      <button
        type="button"
        disabled={pending}
        onClick={() => (armed ? start(async () => { await deleteGameAction(id); onDone(); }) : setArmed(true))}
        className={cn(DELETE, armed ? "bg-marvel text-white hover:bg-red-500" : "bg-cosmos-700 ring-2 ring-cosmos-500 ring-inset hover:bg-cosmos-500")}
      >
        <Trash2 className="size-4" />
        {pending ? "Deleting…" : armed ? "Really delete" : "Delete game"}
      </button>
    </div>
  );
}

function statusLabel(game: GameSummary): string {
  if (game.status === "LOBBY") return "Lobby";
  if (game.status === "ACTIVE") return game.live ? "In play" : "Left open";
  return game.status === "FINISHED" ? "Finished" : "Abandoned";
}

function Dot({ game }: { game: GameSummary }) {
  const on = game.live || game.status === "FINISHED";
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className={cn("size-2 rounded-full", on ? "bg-green-400" : "bg-cosmos-500")} />
      {statusLabel(game)}
    </span>
  );
}

const winners = (game: GameSummary) => game.standings?.filter((p) => p.won).map((p) => p.name) ?? [];

/**
 * Games in a table, newest first, each row opening to who sat where and how
 * it went. `recent` shows how games ended and pages through them; otherwise
 * the open ones, with their room codes.
 */
export function GamesTable({ games, recent = false }: { games: GameSummary[]; recent?: boolean }) {
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = games.find((g) => g.id === openId);
  const pages = Math.max(1, Math.ceil(games.length / PAGE));
  const shown = recent ? games.slice(page * PAGE, (page + 1) * PAGE) : games;

  if (games.length === 0) {
    return <p className="text-sm font-bold text-cosmos-300">{recent ? "No games have ended yet." : "No games or lobbies are open."}</p>;
  }

  const dead = recent ? 0 : games.filter((g) => g.dead).length;

  return (
    <>
      {/* The sweep's button: a day idle, or a week against bots, is a game nobody is coming back to. */}
      {!recent ? (
        <div className="mb-3 flex justify-end">
          <CloseDeadGames count={dead} />
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-xl bg-cosmos-900 ring-2 ring-cosmos-500 ring-inset">
        <table className="w-full text-left text-sm whitespace-nowrap">
          <thead className="text-xs text-cosmos-300">
            <tr>
              <th className={TH}>Status</th>
              <th className={TH}>Kind</th>
              <th className={TH}>Players</th>
              {recent ? <th className={TH}>Winner</th> : null}
              <th className={TH}>{recent ? "Rounds" : "Round"}</th>
              {recent ? <th className={TH}>Length</th> : <th className={TH}>Room code</th>}
              <th className={TH}>Opened</th>
              <th className={TH}>{recent ? "Ended" : "Last move"}</th>
            </tr>
          </thead>
          <tbody className="tabular-nums [&_td]:px-4 [&_td]:py-2.5 [&_tr]:border-t [&_tr]:border-cosmos-700">
            {shown.map((game) => (
              <tr key={game.id} onClick={() => setOpenId(game.id)} className="cursor-pointer hover:bg-cosmos-800">
                <td>
                  <Dot game={game} />
                </td>
                <td>{MODE[game.mode]}</td>
                <td>{game.players.join(", ")}</td>
                {recent ? <td>{winners(game).join(", ") || "—"}</td> : null}
                <td>{game.status === "LOBBY" ? "" : game.round}</td>
                {recent ? (
                  <td>{game.playedMs ? formatDuration(game.playedMs) : "—"}</td>
                ) : (
                  <td className="font-mono">{game.mode === "MULTIPLAYER" ? game.joinCode : ""}</td>
                )}
                <td>{timeAgo(game.createdAt)}</td>
                <td>{timeAgo(game.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {recent && pages > 1 ? (
        <nav className="mt-3 flex items-center justify-end gap-3 text-xs font-bold text-cosmos-300">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className={PAGER}>
            <ChevronLeft className="size-4" />
          </button>
          Page {page + 1} of {pages}
          <button type="button" aria-label="Next page" disabled={page >= pages - 1} onClick={() => setPage(page + 1)} className={PAGER}>
            <ChevronRight className="size-4" />
          </button>
        </nav>
      ) : null}

      <Dialog open={open !== undefined} onOpenChange={(next) => !next && setOpenId(null)}>
        <DialogContent className="theme-cosmos dark gap-4 border-2 border-gold-400 sm:max-w-lg">
          {open ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-base font-black tracking-widest text-gold-400 uppercase">
                  {MODE[open.mode]} · {statusLabel(open)}
                </DialogTitle>
                <DialogDescription className="text-sm text-white/70">
                  Opened {timeAgo(open.createdAt)}, last change {timeAgo(open.updatedAt)}.
                  {open.playedMs ? ` Played for ${formatDuration(open.playedMs)} over ${open.moves} moves.` : " No moves yet."}
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-3 gap-2 text-center text-xs font-bold text-cosmos-300 [&_dd]:text-base [&_dd]:text-gold-400 [&_dd]:tabular-nums">
                <div>
                  <dt>Points to win</dt>
                  <dd>{open.rules.targetPoints || "—"}</dd>
                </div>
                <div>
                  <dt>Turn time</dt>
                  <dd>{open.rules.turnTimeSeconds ? `${open.rules.turnTimeSeconds} sec` : "Untimed"}</dd>
                </div>
                <div>
                  <dt>Room code</dt>
                  <dd className="font-mono">{open.mode === "MULTIPLAYER" ? open.joinCode : "—"}</dd>
                </div>
              </dl>
              {open.standings ? (
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-cosmos-300">
                    <tr className="[&_th]:px-3 [&_th]:py-1 [&_th]:font-bold">
                      <th>Place</th>
                      <th>Player</th>
                      <th>Points</th>
                      <th>Cards</th>
                      <th>Badges</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums [&_td]:px-3 [&_td]:py-1.5 [&_tr]:border-t [&_tr]:border-cosmos-700">
                    {open.standings.map((p) => (
                      <tr key={p.seat} className={cn(p.won && "font-bold text-gold-200")}>
                        <td>{open.status === "FINISHED" ? ordinal(p.place) : `Seat ${p.seat + 1}`}</td>
                        <td>
                          <Link href={`/profile/${p.name}`} className="hover:underline">
                            {p.name}
                          </Link>
                        </td>
                        <td>{p.points}</td>
                        <td>{p.cards}</td>
                        <td>{p.tags}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-white/70">Waiting in the lobby: {open.players.join(", ")}.</p>
              )}
              <DeleteGame key={open.id} id={open.id} finished={open.status === "FINISHED"} onDone={() => setOpenId(null)} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
