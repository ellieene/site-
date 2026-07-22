import { NextRequest, NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  createSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { clientIp, rateLimit, readJsonBody } from "@/lib/security";

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`login:${ip}`, 5, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Слишком много попыток. Подождите ${limited.retryAfterSec} сек.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } }
    );
  }

  const body = await readJsonBody<{ password?: string }>(req, 2000);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  if (!verifyPassword(body.data.password)) {
    return NextResponse.json({ error: "Неверный пароль" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return res;
}
