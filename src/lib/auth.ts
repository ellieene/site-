import crypto from "crypto";
import { cookies } from "next/headers";
import { getAdminPasswordHash, verifyPasswordHash } from "./settings";

const COOKIE = "furshet_admin";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 дней

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "admin";
}

function getSessionSecret() {
  const fromEnv = process.env.SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 32) return fromEnv;
  // Fallback: не храним пароль в куке; секрет производный и непредсказуемый без знания пароля+соли
  return crypto
    .createHash("sha256")
    .update(`furshet-session|${getAdminPassword()}|${process.env.TELEGRAM_BOT_TOKEN || "local"}`)
    .digest("hex");
}

function timingSafeEqualStr(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) {
    crypto.timingSafeEqual(ba, ba);
    return false;
  }
  return crypto.timingSafeEqual(ba, bb);
}

/** Проверка пароля без утечки по времени ответа. Если пароль меняли из админки —
 * сверяем с хешем в БД, иначе — с ADMIN_PASSWORD из .env */
export function verifyPassword(input: unknown): boolean {
  if (typeof input !== "string" || !input) return false;

  const storedHash = getAdminPasswordHash();
  if (storedHash) {
    return verifyPasswordHash(input, storedHash);
  }

  const expected = getAdminPassword();
  const a = crypto.createHash("sha256").update(input).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Подписанная сессия (HMAC) — куку нельзя подделать без SESSION_SECRET */
export function createSessionToken(): string {
  const issuedAt = Date.now().toString(36);
  const nonce = crypto.randomBytes(24).toString("base64url");
  const payload = `${issuedAt}.${nonce}`;
  const sig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, sig] = parts;
  if (!issuedAt || !nonce || !sig) return false;
  if (!/^[a-z0-9]+$/i.test(issuedAt) || !/^[A-Za-z0-9_-]+$/.test(nonce)) return false;

  const payload = `${issuedAt}.${nonce}`;
  const expected = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  if (!timingSafeEqualStr(sig, expected)) return false;

  const ts = parseInt(issuedAt, 36);
  if (!Number.isFinite(ts) || Date.now() - ts > SESSION_TTL_MS || Date.now() < ts - 60_000) {
    return false;
  }
  return true;
}

export async function isAdminAuthenticated() {
  const jar = await cookies();
  return verifySessionToken(jar.get(COOKIE)?.value);
}

export function sessionCookieOptions(maxAge = SESSION_TTL_MS / 1000) {
  return {
    httpOnly: true as const,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export { COOKIE as ADMIN_COOKIE };
