import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated, verifyPassword } from "@/lib/auth";
import { setAdminPassword } from "@/lib/settings";
import { readJsonBody, clientIp, rateLimit } from "@/lib/security";

export const runtime = "nodejs";

export async function PUT(req: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = clientIp(req);
  const limited = rateLimit(`password-change:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток. Подождите ${limited.retryAfterSec} сек.` },
      { status: 429 }
    );
  }

  const body = await readJsonBody<{ currentPassword?: unknown; newPassword?: unknown }>(
    req,
    2000
  );
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (!verifyPassword(body.data.currentPassword)) {
    return NextResponse.json({ error: "Текущий пароль неверен" }, { status: 400 });
  }

  const newPassword = String(body.data.newPassword ?? "");
  if (newPassword === String(body.data.currentPassword ?? "")) {
    return NextResponse.json(
      { error: "Новый пароль совпадает с текущим" },
      { status: 400 }
    );
  }

  try {
    setAdminPassword(newPassword);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Ошибка сохранения" },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
