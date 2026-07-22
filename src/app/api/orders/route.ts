import { NextRequest, NextResponse } from "next/server";
import { getDb, type Product } from "@/lib/db";
import { ensureSeed } from "@/lib/seed";
import { formatOrderMessage, notifyManagers } from "@/lib/telegram";
import {
  clientIp,
  clampStr,
  isValidEmail,
  isValidPhone,
  rateLimit,
  readJsonBody,
} from "@/lib/security";

export const runtime = "nodejs";

type IncomingItem = { productId?: unknown; qty?: unknown };

export async function POST(req: NextRequest) {
  const ip = clientIp(req);
  const limited = rateLimit(`order:${ip}`, 10, 60 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Слишком много заказов с вашего IP. Попробуйте позже." },
      { status: 429 }
    );
  }

  ensureSeed();
  const body = await readJsonBody<{
    phone?: unknown;
    email?: unknown;
    notes?: unknown;
    items?: IncomingItem[];
  }>(req, 16_000);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const phone = clampStr(body.data.phone, 32);
  const email = clampStr(body.data.email, 120);
  const notes = clampStr(body.data.notes, 1000);
  const items = body.data.items;

  if (!isValidPhone(phone)) {
    return NextResponse.json({ error: "Укажите корректный номер телефона" }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Некорректная почта" }, { status: 400 });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Корзина пуста" }, { status: 400 });
  }
  if (items.length > 20) {
    return NextResponse.json({ error: "Слишком много позиций в корзине" }, { status: 400 });
  }

  const db = getDb();
  const productStmt = db.prepare(
    "SELECT id, title, price FROM products WHERE id = ? AND active = 1"
  );

  const normalized: { productId: number; title: string; price: number; qty: number }[] = [];

  for (const raw of items) {
    const productId = Number(raw.productId);
    const qty = Math.floor(Number(raw.qty) || 0);
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: "Некорректный товар" }, { status: 400 });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) {
      return NextResponse.json({ error: "Количество должно быть от 1 до 99" }, { status: 400 });
    }

    // Цену и название берём ТОЛЬКО из БД — клиент не может подменить
    const product = productStmt.get(productId) as
      | Pick<Product, "id" | "title" | "price">
      | undefined;
    if (!product) {
      return NextResponse.json({ error: "Товар недоступен" }, { status: 400 });
    }

    const existing = normalized.find((n) => n.productId === product.id);
    if (existing) {
      existing.qty = Math.min(99, existing.qty + qty);
    } else {
      normalized.push({
        productId: product.id,
        title: product.title,
        price: Number(product.price),
        qty,
      });
    }
  }

  const total = normalized.reduce((s, i) => s + i.price * i.qty, 0);
  if (!Number.isFinite(total) || total < 0 || total > 10_000_000) {
    return NextResponse.json({ error: "Некорректная сумма" }, { status: 400 });
  }

  const result = db
    .prepare(
      `INSERT INTO orders (phone, email, notes, items_json, total) VALUES (?, ?, ?, ?, ?)`
    )
    .run(phone, email || null, notes || null, JSON.stringify(normalized), total);

  const orderId = Number(result.lastInsertRowid);
  const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId) as {
    id: number;
    phone: string;
    email: string | null;
    notes: string | null;
    total: number;
    created_at: string;
  };

  const message = formatOrderMessage({
    id: order.id,
    phone: order.phone,
    email: order.email,
    notes: order.notes,
    items: normalized,
    total: order.total,
    created_at: order.created_at,
  });

  try {
    await notifyManagers(message);
  } catch (e) {
    console.error("Telegram notify failed", e);
  }

  return NextResponse.json({ ok: true, orderId });
}
