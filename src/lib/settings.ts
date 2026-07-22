import crypto from "crypto";
import { getDb } from "./db";
import { isSafeSocialUrl, isValidPhone, isValidEmail } from "./security";

const DEFAULT_SITE_NAME = "Фуршетное меню";

export type SocialLinks = {
  phone: string;
  telegramUrl: string;
  telegramLabel: string;
  vkUrl: string;
  instagramUrl: string;
  maxUrl: string;
};

export type AboutBlock = {
  title: string;
  items: string[];
};

export type FooterInfo = {
  city: string;
  tagline: string;
};

const DEFAULT_SOCIALS: SocialLinks = {
  phone: "+7 996 378-33-56",
  telegramUrl: "https://t.me/annbereg",
  telegramLabel: "@annbereg",
  vkUrl: "",
  instagramUrl: "",
  maxUrl: "",
};

const DEFAULT_FOOTER_INFO: FooterInfo = {
  city: "Краснообск / Новосибирск",
  tagline: "Заказ от одного бокса · предоплата от 50%",
};

const DEFAULT_ABOUT_BLOCKS: AboutBlock[] = [
  {
    title: "Заказ",
    items: [
      "Заказ от одного бокса",
      "Заказ за 2–3 дня (рекомендую бронировать нужную вам дату заранее, особенно выходные и праздничные дни)",
      "Заказ принимаю по предоплате от 50%. Остаток при доставке или до передачи заказа курьеру",
    ],
  },
  {
    title: "Доставка",
    items: [
      "Самовывоз Краснообск",
      "По Краснообску — бесплатно",
      "По Новосибирску и области: бесплатная доставка для заказов от 15 000₽ (за исключением отдаленных районов)",
      "Курьер Яндекс.Go по тарифам сервиса",
    ],
  },
  {
    title: "Работа с юрлицами",
    items: [
      "С юридическими лицами работаю — сформирую счет, договор, акт",
      "Отсрочку не предоставляю",
    ],
  },
];

export function ensureSettingsTable() {
  getDb().exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

function getMeta(key: string): string | undefined {
  ensureSettingsTable();
  const row = getDb().prepare("SELECT value FROM meta WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value;
}

function setMeta(key: string, value: string) {
  ensureSettingsTable();
  getDb()
    .prepare(
      `INSERT INTO meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

export function getSiteName(): string {
  const name = getMeta("site_name")?.trim();
  return name || DEFAULT_SITE_NAME;
}

export function setSiteName(name: string) {
  const cleaned = name.trim().slice(0, 80);
  if (!cleaned) throw new Error("Пустое название");
  setMeta("site_name", cleaned);
  return cleaned;
}

/** Доп. дублирующее название (например, латиницей) — показывается рядом с основным русским, тем же размером/цветом */
export function getSecondaryName(): string {
  return getMeta("site_name_secondary")?.trim() || "";
}

export function setSecondaryName(name: string) {
  const cleaned = String(name ?? "").trim().slice(0, 80);
  setMeta("site_name_secondary", cleaned);
  return cleaned;
}

export function getSocials(): SocialLinks {
  const raw = getMeta("socials");
  if (!raw) return DEFAULT_SOCIALS;
  try {
    const parsed = JSON.parse(raw) as Partial<SocialLinks>;
    return { ...DEFAULT_SOCIALS, ...parsed };
  } catch {
    return DEFAULT_SOCIALS;
  }
}

export function setSocials(input: Partial<Record<keyof SocialLinks, unknown>>): SocialLinks {
  const current = getSocials();
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);

  const phone = str(input.phone ?? current.phone, 32);
  if (phone && !isValidPhone(phone)) {
    throw new Error("Укажите корректный номер телефона");
  }

  const merged: SocialLinks = {
    phone,
    telegramUrl: str(input.telegramUrl ?? current.telegramUrl, 300),
    telegramLabel: str(input.telegramLabel ?? current.telegramLabel, 60),
    vkUrl: str(input.vkUrl ?? current.vkUrl, 300),
    instagramUrl: str(input.instagramUrl ?? current.instagramUrl, 300),
    maxUrl: str(input.maxUrl ?? current.maxUrl, 300),
  };

  for (const [key, url] of Object.entries(merged)) {
    if (key === "telegramLabel" || key === "phone") continue;
    if (!isSafeSocialUrl(url)) {
      throw new Error(`Ссылка «${key}»: разрешены только https:// или пусто`);
    }
  }

  setMeta("socials", JSON.stringify(merged));
  return merged;
}

export function getFooterInfo(): FooterInfo {
  const raw = getMeta("footer_info");
  if (!raw) return DEFAULT_FOOTER_INFO;
  try {
    const parsed = JSON.parse(raw) as Partial<FooterInfo>;
    return { ...DEFAULT_FOOTER_INFO, ...parsed };
  } catch {
    return DEFAULT_FOOTER_INFO;
  }
}

export function setFooterInfo(input: Partial<Record<keyof FooterInfo, unknown>>): FooterInfo {
  const current = getFooterInfo();
  const merged: FooterInfo = {
    city: String(input.city ?? current.city).trim().slice(0, 120),
    tagline: String(input.tagline ?? current.tagline).trim().slice(0, 160),
  };
  setMeta("footer_info", JSON.stringify(merged));
  return merged;
}

const DEFAULT_REPORT_EMAIL = "ugarinko@gmail.com";

/** Куда ежемесячно отправляется xlsx-отчёт по заказам */
export function getReportEmail(): string {
  return getMeta("report_email")?.trim() || DEFAULT_REPORT_EMAIL;
}

export function setReportEmail(email: string) {
  const cleaned = String(email ?? "").trim().slice(0, 160);
  if (!cleaned) throw new Error("Укажите email для отчётов");
  if (!isValidEmail(cleaned)) throw new Error("Некорректный email");
  setMeta("report_email", cleaned);
  return cleaned;
}

/** Пароль админки, изменённый из панели, хранится тут как соль:хеш (scrypt). Если не менялся — используется ADMIN_PASSWORD из .env */
export function getAdminPasswordHash(): string | undefined {
  return getMeta("admin_password_hash");
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPasswordHash(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const hashBuf = Buffer.from(hash, "hex");
  const candidateBuf = crypto.scryptSync(password, salt, 64);
  if (hashBuf.length !== candidateBuf.length) return false;
  return crypto.timingSafeEqual(hashBuf, candidateBuf);
}

export function setAdminPassword(newPassword: string) {
  const cleaned = String(newPassword ?? "");
  if (cleaned.length < 8) throw new Error("Пароль должен быть не короче 8 символов");
  if (cleaned.length > 200) throw new Error("Слишком длинный пароль");
  setMeta("admin_password_hash", hashPassword(cleaned));
}

export function getAboutBlocks(): AboutBlock[] {
  const raw = getMeta("about_blocks");
  if (!raw) return DEFAULT_ABOUT_BLOCKS;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ABOUT_BLOCKS;
    return parsed as AboutBlock[];
  } catch {
    return DEFAULT_ABOUT_BLOCKS;
  }
}

export function setAboutBlocks(blocks: unknown): AboutBlock[] {
  if (!Array.isArray(blocks)) throw new Error("Некорректный формат блоков");
  if (blocks.length > 12) throw new Error("Слишком много блоков (максимум 12)");

  const cleaned: AboutBlock[] = blocks.map((raw) => {
    const b = raw as Record<string, unknown>;
    const title = String(b?.title ?? "").trim().slice(0, 80);
    if (!title) throw new Error("У каждого блока должен быть заголовок");
    const itemsRaw = b?.items;
    if (!Array.isArray(itemsRaw)) throw new Error("Некорректные пункты блока");
    const items = itemsRaw
      .map((i) => String(i ?? "").trim().slice(0, 300))
      .filter(Boolean)
      .slice(0, 30);
    return { title, items };
  });

  setMeta("about_blocks", JSON.stringify(cleaned));
  return cleaned;
}

export {
  DEFAULT_SITE_NAME,
  DEFAULT_SOCIALS,
  DEFAULT_ABOUT_BLOCKS,
  DEFAULT_FOOTER_INFO,
  DEFAULT_REPORT_EMAIL,
};
