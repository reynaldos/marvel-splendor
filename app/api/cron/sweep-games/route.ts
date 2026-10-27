import { NextResponse } from "next/server";

import { sweepDeadGames } from "@/lib/sweep-games";

/** GET /api/cron/sweep-games — Vercel's daily cron (vercel.json), with its CRON_SECRET; closes the games left open. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not allowed." }, { status: 401 });
  }
  return NextResponse.json({ closed: await sweepDeadGames() });
}
