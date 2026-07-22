import { getDb, type CartItem, type Manager } from "./db";

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";

export async function sendTelegramMessage(chatId: string, text: string) {
  if (!TOKEN || !chatId) return { ok: false as const, error: "no token or chat" };
  // Только числовой chat_id — защита от подмены и инъекций
  if (!/^-?\d{5,20}$/.test(String(chatId))) {
    return { ok: false as const, error: "invalid chat id" };
  }
  if (text.length > 4000) text = text.slice(0, 4000);

  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: "HTML",
    }),
  });

  const data = await res.json();
  return data as { ok: boolean; description?: string };
}

export function formatOrderMessage(order: {
  id: number;
  phone: string;
  email?: string | null;
  notes?: string | null;
  items: CartItem[];
  total: number;
  created_at?: string;
}) {
  const lines = order.items
    .map(
      (i, idx) =>
        `${idx + 1}. <b>${escapeHtml(i.title)}</b> × ${i.qty} — ${formatPrice(i.price * i.qty)}`
    )
    .join("\n");

  return [
    `🧺 <b>Новый заказ #${order.id}</b>`,
    ``,
    `👤 <b>Покупатель</b>`,
    `📞 Телефон: ${escapeHtml(order.phone)}`,
    order.email ? `✉️ Почта: ${escapeHtml(order.email)}` : null,
    order.notes ? `📝 Примечание: ${escapeHtml(order.notes)}` : null,
    ``,
    `🍽 <b>Меню заказа</b>`,
    lines,
    ``,
    `💰 <b>Итого: ${formatPrice(order.total)}</b>`,
    order.created_at ? `🕒 ${order.created_at}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function notifyManagers(text: string) {
  const db = getDb();
  const managers = db
    .prepare(
      `SELECT * FROM managers WHERE active = 1 AND chat_id IS NOT NULL AND chat_id != ''`
    )
    .all() as Manager[];

  const results = await Promise.all(
    managers.map((m) => sendTelegramMessage(String(m.chat_id), text))
  );

  return { recipients: managers.length, results };
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
