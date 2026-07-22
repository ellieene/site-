import { NextResponse } from "next/server";
import { getDb, type RouletteItem } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  ensureSeed();
  const items = getDb()
    .prepare(
      `SELECT id, title, image, sort_order, active FROM roulette_items
       WHERE active = 1 ORDER BY sort_order ASC, id ASC`
    )
    .all() as RouletteItem[];
  return NextResponse.json(items);
}
