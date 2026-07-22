import { NextResponse } from "next/server";
import { getDb, type Product } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  ensureSeed();
  const db = getDb();
  const products = db
    .prepare("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
    .all() as Product[];
  return NextResponse.json(products);
}
