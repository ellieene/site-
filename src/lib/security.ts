import { NextRequest } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Простой in-memory rate limit (на один процесс Node) */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const cur = buckets.get(key);

  if (!cur || now >= cur.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (cur.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000) };
  }

  cur.count += 1;
  return { ok: true };
}

export function clientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "local";
}

export function clampStr(value: unknown, max: number): string {
  return String(value ?? "")
    .trim()
    .slice(0, max);
}

export function isSafeImageUrl(value: string | null): boolean {
  if (!value) return true;
  if (value.length > 500) return false;
  if (value.startsWith("/uploads/") || value.startsWith("/images/")) {
    return (
      !value.includes("..") &&
      !value.includes("//") &&
      !/[\s<>"']/.test(value) &&
      /^\/(uploads|images)\/[A-Za-z0-9._\-/%]+$/.test(value)
    );
  }
  try {
    const u = new URL(value);
    return u.protocol === "https:" && value.length <= 500;
  } catch {
    return false;
  }
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && phone.length <= 32;
}

export function isValidEmail(email: string): boolean {
  if (!email) return true;
  if (email.length > 120) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{4,32}$/.test(username);
}

/** Ссылка на соцсеть: пусто — ок (иконка скрывается), иначе только https:// */
export function isSafeSocialUrl(value: string): boolean {
  if (!value) return true;
  if (value.length > 300) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Только JSON-запросы с разумным размером */
export async function readJsonBody<T = unknown>(
  req: NextRequest,
  maxBytes = 32_000
): Promise<{ ok: true; data: T } | { ok: false; error: string; status: number }> {
  const ctype = req.headers.get("content-type") || "";
  if (!ctype.includes("application/json")) {
    return { ok: false, error: "Ожидается application/json", status: 415 };
  }

  const raw = await req.text();
  if (raw.length > maxBytes) {
    return { ok: false, error: "Слишком большой запрос", status: 413 };
  }

  try {
    return { ok: true, data: JSON.parse(raw) as T };
  } catch {
    return { ok: false, error: "Некорректный JSON", status: 400 };
  }
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
