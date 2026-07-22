import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb, type Order } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { readJsonBody } from "@/lib/security";

export const runtime = "nodejs";

const SORTS: Record<string, string> = {
  date_desc: "created_at DESC, id DESC",
  date_asc: "created_at ASC, id ASC",
  total_desc: "total DESC, id DESC",
  total_asc: "total ASC, id ASC",
};

const ORDER_STATUSES = ["new", "processing", "done", "cancelled"] as const;

export async function GET(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  ensureSeed();

  const { searchParams } = new URL(req.url);
  const qDigits = (searchParams.get("q") || "").replace(/\D/g, "").slice(0, 20);
  const status = searchParams.get("status") || "";
  const sortKey = searchParams.get("sort") || "date_desc";
  const orderBy = SORTS[sortKey] || SORTS.date_desc;

  const limit = Math.min(Math.max(Math.floor(Number(searchParams.get("limit"))) || 5, 1), 50);
  const offset = Math.max(Math.floor(Number(searchParams.get("offset"))) || 0, 0);

  const where: string[] = [];
  const params: (string | number)[] = [];

  if (qDigits) {
    // Сравниваем телефон без пробелов/скобок/дефисов/плюса — поиск по цифрам номера
    where.push(
      "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '') LIKE ?"
    );
    params.push(`%${qDigits}%`);
  }

  if ((ORDER_STATUSES as readonly string[]).includes(status)) {
    where.push("status = ?");
    params.push(status);
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const db = getDb();
  const total = (
    db.prepare(`SELECT COUNT(*) as c FROM orders ${whereSql}`).get(...params) as { c: number }
  ).c;

  const orders = db
    .prepare(`SELECT * FROM orders ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`)
    .all(...params, limit, offset) as Order[];

  return NextResponse.json({
    total,
    orders: orders.map((o) => ({
      ...o,
      items: JSON.parse(o.items_json || "[]"),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await readJsonBody<{ id?: unknown; status?: unknown }>(req, 2000);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const id = Number(body.data.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  const status = String(body.data.status || "");
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const result = getDb().prepare("UPDATE orders SET status = ? WHERE id = ?").run(status, id);
  if (result.changes === 0) {
    return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
