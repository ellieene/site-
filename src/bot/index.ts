import { Telegraf, Markup } from "telegraf";
import type { Context } from "telegraf";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cron from "node-cron";
import { sendOrdersReport, getPreviousMonthRange } from "../lib/report";
import { SITE_URL } from "../lib/site";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OWNER = (process.env.OWNER_USERNAME || "annbereg").toLowerCase();

if (!TOKEN) {
  console.error("TELEGRAM_BOT_TOKEN не задан в .env");
  process.exit(1);
}

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, "furshet.db"));
db.pragma("journal_mode = WAL");
db.exec(`
  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    image TEXT,
    category TEXT DEFAULT 'Бокс',
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    items_json TEXT NOT NULL,
    total REAL NOT NULL,
    status TEXT DEFAULT 'new',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS managers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    chat_id TEXT,
    name TEXT,
    is_owner INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const ownerExists = db
  .prepare("SELECT id FROM managers WHERE username = ? COLLATE NOCASE")
  .get(OWNER);
if (!ownerExists) {
  db.prepare(
    `INSERT INTO managers (username, name, is_owner, active) VALUES (?, 'Владелец', 1, 1)`
  ).run(OWNER);
}

const bot = new Telegraf(TOKEN);

const BTN_MENU = "📋 Меню";
const BTN_ORDERS = "🧾 Заказы";
const BTN_MANAGERS = "👥 Менеджеры";
const BTN_EDIT_MENU = "🖊 Изменить меню";
const BTN_HELP = "❓ Помощь";

const ADMIN_PATH = "/staff-4f6867e4";

function keyboardFor(username: string) {
  const rows =
    username.toLowerCase() === OWNER
      ? [[BTN_MENU, BTN_ORDERS], [BTN_MANAGERS, BTN_EDIT_MENU], [BTN_HELP]]
      : [[BTN_MENU, BTN_ORDERS], [BTN_HELP]];
  return Markup.keyboard(rows).resize();
}

function formatPrice(n: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(n);
}

function isAllowed(username?: string) {
  if (!username) return false;
  const u = username.toLowerCase();
  const row = db
    .prepare(
      `SELECT * FROM managers WHERE username = ? COLLATE NOCASE AND active = 1`
    )
    .get(u);
  return Boolean(row);
}

function linkChat(username: string | undefined, chatId: number, name?: string) {
  if (!username) return false;
  const u = username.toLowerCase();
  const result = db
    .prepare(
      `UPDATE managers SET chat_id = ?, name = COALESCE(?, name) WHERE username = ? COLLATE NOCASE AND active = 1`
    )
    .run(String(chatId), name || null, u);
  return result.changes > 0;
}

function escape(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

bot.start(async (ctx) => {
  const username = ctx.from?.username;
  const chatId = ctx.chat.id;
  const name = [ctx.from?.first_name, ctx.from?.last_name].filter(Boolean).join(" ");

  if (!username) {
    await ctx.reply(
      "У вас не указан username в Telegram. Укажите @username в настройках и снова напишите /start."
    );
    return;
  }

  if (!isAllowed(username)) {
    await ctx.reply(
      `Привет! Бот принимает уведомления только для владельца @${OWNER} и добавленных менеджеров.\n\nЕсли вас должны добавить — попросите владельца через админ-панель сайта.`
    );
    return;
  }

  linkChat(username, chatId, name);
  await ctx.reply(
    `✅ Готово, @${username}!\nТеперь вам будут приходить новые заказы с сайта.\n\nПользуйтесь кнопками внизу 👇`,
    keyboardFor(username)
  );
});

async function sendHelp(ctx: Context) {
  const username = ctx.from?.username;
  await ctx.reply(
    `Фуршетный бот\n\n${BTN_MENU} — актуальное меню\n${BTN_ORDERS} — последние 5 заказов\n${BTN_MANAGERS} — кто получает уведомления (только владелец)\n${BTN_EDIT_MENU} — ссылка на админ-панель (только владелец)\n\nВладелец: @${OWNER}`,
    username ? keyboardFor(username) : undefined
  );
}

async function sendEditMenuLink(ctx: Context) {
  const username = ctx.from?.username?.toLowerCase();
  if (username !== OWNER) {
    await ctx.reply("Изменить меню может только владелец.");
    return;
  }

  const link = `${SITE_URL}${ADMIN_PATH}`;

  // Telegram принимает в url-кнопке только настоящий публичный http(s)-адрес —
  // пока домен не подключён (NEXT_PUBLIC_SITE_URL пуст), шлём обычной ссылкой в тексте
  if (!/^https?:\/\/(?!localhost\b)(?!127\.)(?!0\.0\.0\.0\b)/i.test(link)) {
    await ctx.reply(
      `🖊 Админ-панель для изменения меню:\n${link}\n\nНикому не пересылайте эту ссылку.\n\n(Кнопка-ссылка заработает, когда в .env будет настоящий домен в NEXT_PUBLIC_SITE_URL)`
    );
    return;
  }

  await ctx.reply(
    "🖊 Нажмите, чтобы открыть админ-панель (никому не пересылайте эту ссылку):",
    Markup.inlineKeyboard([Markup.button.url("Открыть админ-панель", link)])
  );
}

async function sendMenu(ctx: Context) {
  if (!isAllowed(ctx.from?.username)) {
    await ctx.reply("Нет доступа. Напишите /start, чтобы проверить доступ.");
    return;
  }
  const products = db
    .prepare("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
    .all() as { title: string; description: string; price: number; category: string }[];

  if (!products.length) {
    await ctx.reply("Меню пока пустое.");
    return;
  }

  const text = products
    .map(
      (p, i) =>
        `${i + 1}. <b>${escape(p.title)}</b> (${escape(p.category)})\n${escape(p.description)}\n💰 ${formatPrice(p.price)}`
    )
    .join("\n\n");

  await ctx.reply(`🍽 <b>Ассортимент</b>\n\n${text}`, { parse_mode: "HTML" });
}

async function sendOrders(ctx: Context) {
  if (!isAllowed(ctx.from?.username)) {
    await ctx.reply("Нет доступа. Напишите /start, чтобы проверить доступ.");
    return;
  }
  const orders = db
    .prepare("SELECT * FROM orders ORDER BY id DESC LIMIT 5")
    .all() as {
    id: number;
    phone: string;
    email: string | null;
    notes: string | null;
    items_json: string;
    total: number;
    created_at: string;
  }[];

  if (!orders.length) {
    await ctx.reply("Заказов пока нет.");
    return;
  }

  for (const o of orders) {
    const items = JSON.parse(o.items_json || "[]") as {
      title: string;
      qty: number;
      price: number;
    }[];
    const lines = items
      .map((i) => `• ${i.title} × ${i.qty} — ${formatPrice(i.price * i.qty)}`)
      .join("\n");
    await ctx.reply(
      `🧺 Заказ #${o.id}\n📞 ${o.phone}${o.email ? `\n✉️ ${o.email}` : ""}${
        o.notes ? `\n📝 ${o.notes}` : ""
      }\n\n${lines}\n\n💰 ${formatPrice(o.total)}\n🕒 ${o.created_at}`
    );
  }
}

async function sendManagers(ctx: Context) {
  const username = ctx.from?.username?.toLowerCase();
  if (username !== OWNER) {
    await ctx.reply("Список менеджеров доступен только владельцу.");
    return;
  }
  const managers = db
    .prepare("SELECT * FROM managers ORDER BY is_owner DESC, id ASC")
    .all() as {
    username: string;
    chat_id: string | null;
    is_owner: number;
    active: number;
  }[];

  const text = managers
    .map((m) => {
      const role = m.is_owner ? "👑 владелец" : "👤 менеджер";
      const status = m.active ? "активен" : "выкл";
      const linked = m.chat_id ? "уведомления ✅" : "нужен /start ⏳";
      return `@${m.username} — ${role}, ${status}, ${linked}`;
    })
    .join("\n");

  await ctx.reply(`Получатели уведомлений:\n\n${text}`);
}

// Кнопки — основной способ навигации
bot.hears(BTN_MENU, sendMenu);
bot.hears(BTN_ORDERS, sendOrders);
bot.hears(BTN_MANAGERS, sendManagers);
bot.hears(BTN_EDIT_MENU, sendEditMenuLink);
bot.hears(BTN_HELP, sendHelp);

// Команды — оставлены для тех, кто предпочитает печатать
bot.command("menu", sendMenu);
bot.command("orders", sendOrders);
bot.command("managers", sendManagers);
bot.command("editmenu", sendEditMenuLink);
bot.command("help", sendHelp);

// Ошибка в одном обработчике не должна ронять весь процесс бота
bot.catch((err, ctx) => {
  console.error(`Ошибка при обработке апдейта ${ctx.updateType}:`, err);
});

bot.launch({ dropPendingUpdates: true }).catch((err) => {
  console.error("Ошибка запуска бота:", err);
  process.exit(1);
});

bot.telegram
  .getMe()
  .then((me) => {
    console.log(`Telegram-бот запущен (@${me.username}). Владелец: @${OWNER}`);
    console.log(`Напишите боту /start из аккаунта @${OWNER}, чтобы привязать чат.`);
  })
  .catch(() => {
    console.log(`Telegram-бот запущен. Владелец: @${OWNER}`);
  });

// Каждое 1-е число месяца в 06:00 — отчёт по заказам за прошлый месяц на почту
cron.schedule("0 6 1 * *", async () => {
  try {
    const result = await sendOrdersReport(getPreviousMonthRange());
    console.log(
      `Ежемесячный отчёт отправлен на ${result.to}: заказов ${result.ordersCount} за ${result.label}`
    );
  } catch (err) {
    console.error("Не удалось отправить ежемесячный отчёт:", err);
  }
});

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
