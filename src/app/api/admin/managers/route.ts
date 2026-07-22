import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getDb, type Manager } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  clampStr,
  isValidUsername,
  rateLimit,
  readJsonBody,
  clientIp,
} from "@/lib/security";

export const runtime = "nodejs";

async function requireAdmin() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

function normalizeUsername(raw: string) {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureSeed();
  const managers = getDb()
    .prepare("SELECT * FROM managers ORDER BY is_owner DESC, id ASC")
    .all() as Manager[];
  return NextResponse.json(managers);
}

export async function POST(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  ensureSeed();

  const body = await readJsonBody<{ username?: unknown; name?: unknown }>(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const username = normalizeUsername(clampStr(body.data.username, 40));
  const name = clampStr(body.data.name, 80) || null;

  if (!isValidUsername(username)) {
    return NextResponse.json(
      { error: "Username: 4–32 символа (латиница, цифры, _)" },
      { status: 400 }
    );
  }

  try {
    const result = getDb()
      .prepare(
        `INSERT INTO managers (username, name, is_owner, active) VALUES (?, ?, 0, 1)`
      )
      .run(username, name);

    return NextResponse.json({
      ok: true,
      id: Number(result.lastInsertRowid),
      hint: `Менеджер @${username} добавлен. Пусть напишет боту /start — после этого ему начнут приходить заказы.`,
    });
  } catch {
    return NextResponse.json({ error: "Такой менеджер уже есть" }, { status: 409 });
  }
}

export async function DELETE(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  const manager = getDb().prepare("SELECT * FROM managers WHERE id = ?").get(id) as
    | Manager
    | undefined;
  if (!manager) {
    return NextResponse.json({ error: "Не найден" }, { status: 404 });
  }
  if (manager.is_owner) {
    return NextResponse.json({ error: "Владельца нельзя удалить" }, { status: 400 });
  }

  getDb().prepare("DELETE FROM managers WHERE id = ?").run(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await readJsonBody<{ id?: unknown; active?: unknown }>(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const id = Number(body.data.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Нет id" }, { status: 400 });
  }

  if (typeof body.data.active === "boolean" || body.data.active === 0 || body.data.active === 1) {
    getDb()
      .prepare("UPDATE managers SET active = ? WHERE id = ? AND is_owner = 0")
      .run(body.data.active ? 1 : 0, id);
  }

  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const ip = clientIp(req);
  const limited = rateLimit(`tg-test:${ip}`, 5, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json({ error: "Слишком часто" }, { status: 429 });
  }

  ensureSeed();
  const managers = getDb()
    .prepare(
      `SELECT * FROM managers WHERE active = 1 AND chat_id IS NOT NULL AND chat_id != ''`
    )
    .all() as Manager[];

  if (managers.length === 0) {
    const owner = process.env.OWNER_USERNAME || "annbereg";
    return NextResponse.json({
      ok: false,
      error: `Ни у кого нет chat_id. Напишите боту /start от аккаунта @${owner} (или менеджера).`,
    });
  }

  const results = [];
  for (const m of managers) {
    const r = await sendTelegramMessage(
      String(m.chat_id),
      `✅ Тест: уведомления подключены для @${m.username}`
    );
    results.push({ username: m.username, ok: Boolean(r.ok) });
  }

  return NextResponse.json({ ok: true, results });
}
