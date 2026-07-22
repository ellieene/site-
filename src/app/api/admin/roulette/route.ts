import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb, type RouletteItem } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { clampStr, isSafeImageUrl, readJsonBody } from "@/lib/security";

export const runtime = "nodejs";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureSeed();
  const items = getDb()
    .prepare(
      `SELECT * FROM roulette_items ORDER BY sort_order ASC, id ASC`
    )
    .all() as RouletteItem[];
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody<Record<string, unknown>>(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const title = clampStr(body.data.title, 80);
  const image = clampStr(body.data.image, 500);
  const sort_order = Number(body.data.sort_order ?? 0);

  if (!title) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }
  if (!image || !isSafeImageUrl(image)) {
    return NextResponse.json(
      { error: "Укажите корректный URL картинки (https:// или /path)" },
      { status: 400 }
    );
  }

  const result = getDb()
    .prepare(
      `INSERT INTO roulette_items (title, image, sort_order, active)
       VALUES (?, ?, ?, 1)`
    )
    .run(title, image, Number.isFinite(sort_order) ? Math.floor(sort_order) : 0);

  return NextResponse.json({ ok: true, id: Number(result.lastInsertRowid) });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody<Record<string, unknown>>(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const id = Number(body.data.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  const title = clampStr(body.data.title, 80);
  const image = clampStr(body.data.image, 500);
  const sort_order = Number(body.data.sort_order ?? 0);
  const active =
    body.data.active === 0 || body.data.active === false ? 0 : 1;

  if (!title) {
    return NextResponse.json({ error: "Укажите название" }, { status: 400 });
  }
  if (!image || !isSafeImageUrl(image)) {
    return NextResponse.json({ error: "Некорректный URL картинки" }, { status: 400 });
  }

  const result = getDb()
    .prepare(
      `UPDATE roulette_items
       SET title = ?, image = ?, sort_order = ?, active = ?
       WHERE id = ?`
    )
    .run(
      title,
      image,
      Number.isFinite(sort_order) ? Math.floor(sort_order) : 0,
      active,
      id
    );

  if (result.changes === 0) {
    return NextResponse.json({ error: "Не найдено" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  getDb().prepare("DELETE FROM roulette_items WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
