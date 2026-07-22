import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb, type Product } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { clampStr, isSafeImageUrl, readJsonBody } from "@/lib/security";

export const runtime = "nodejs";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function parseProductInput(body: Record<string, unknown>) {
  const title = clampStr(body.title, 120);
  const description = clampStr(body.description, 2000);
  const category = clampStr(body.category || "Бокс", 60) || "Бокс";
  const imageRaw = clampStr(body.image, 500);
  const image = imageRaw || null;
  const price = Number(body.price);

  if (!title || !description) {
    return { error: "Заполните название и описание" } as const;
  }
  if (!Number.isFinite(price) || price < 0 || price > 1_000_000 || !Number.isInteger(price)) {
    return { error: "Цена должна быть целым числом от 0 до 1 000 000" } as const;
  }
  if (!isSafeImageUrl(image)) {
    return { error: "Некорректный URL картинки (только /path или https://)" } as const;
  }

  return { title, description, category, image, price } as const;
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureSeed();
  const products = getDb()
    .prepare("SELECT * FROM products ORDER BY id DESC")
    .all() as Product[];
  return NextResponse.json(products);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody<Record<string, unknown>>(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const parsed = parseProductInput(body.data);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = getDb()
    .prepare(
      `INSERT INTO products (title, description, price, image, category, active)
       VALUES (?, ?, ?, ?, ?, 1)`
    )
    .run(parsed.title, parsed.description, parsed.price, parsed.image, parsed.category);

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

  const parsed = parseProductInput(body.data);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const active =
    body.data.active === 0 || body.data.active === false ? 0 : 1;

  const result = getDb()
    .prepare(
      `UPDATE products SET title=?, description=?, price=?, image=?, category=?, active=? WHERE id=?`
    )
    .run(
      parsed.title,
      parsed.description,
      parsed.price,
      parsed.image,
      parsed.category,
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

  getDb().prepare("DELETE FROM products WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}
