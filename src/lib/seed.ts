import { getDb } from "./db";

/** Unsplash — свободные фото еды */
const SEED_PRODUCTS = [
  {
    title: "Бокс «Канапе-вечер»",
    description:
      "Мини-канапе с лососем, креветкой и сыром, свежая зелень и ягодный акцент. Элегантный сет на 4–6 человек для тёплого приёма.",
    price: 3900,
    image:
      "https://images.unsplash.com/photo-1547573854-74d2a71d0826?auto=format&fit=crop&w=900&q=80",
    category: "Канапе",
  },
  {
    title: "Бокс «Ролл-пати»",
    description:
      "Свежие роллы с лососем, авокадо и овощами, лёгкие соусы. Яркий фуршетный набор, который красиво смотрится на общем столе.",
    price: 4200,
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=900&q=80",
    category: "Роллы",
  },
  {
    title: "Бокс «Сендвич-бар»",
    description:
      "Мини-сендвичи на воздушной булочке: курица, ветчина, овощи и соус. Сытный и удобный формат для офиса и дня рождения.",
    price: 3600,
    image:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=80",
    category: "Сендвичи",
  },
  {
    title: "Бокс «Фуршетный микс»",
    description:
      "Ассорти закусок на одном подносе: тарталетки, шпажки, сырные и мясные позиции. Универсальный выбор, если гости разные.",
    price: 4800,
    image:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=900&q=80",
    category: "Микс",
  },
];

const SEED_ROULETTE = [
  {
    title: "Канапе",
    image:
      "https://images.unsplash.com/photo-1547573854-74d2a71d0826?auto=format&fit=crop&w=500&q=80",
    sort_order: 1,
  },
  {
    title: "Роллы",
    image:
      "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&w=500&q=80",
    sort_order: 2,
  },
  {
    title: "Сендвичи",
    image:
      "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=500&q=80",
    sort_order: 3,
  },
  {
    title: "Ассорти",
    image:
      "https://images.unsplash.com/photo-1555244162-803834f70033?auto=format&fit=crop&w=500&q=80",
    sort_order: 4,
  },
  {
    title: "Тарталетки",
    image:
      "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?auto=format&fit=crop&w=500&q=80",
    sort_order: 5,
  },
  {
    title: "Брускетты",
    image:
      "https://images.unsplash.com/photo-1539252554453-80ab65ce3586?auto=format&fit=crop&w=500&q=80",
    sort_order: 6,
  },
  {
    title: "Шпажки",
    image:
      "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=500&q=80",
    sort_order: 7,
  },
  {
    title: "Закуски",
    image:
      "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=500&q=80",
    sort_order: 8,
  },
];

const CATALOG_FLAG = "catalog_v3";
const ROULETTE_FLAG = "roulette_v1";

export function ensureSeed() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS roulette_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const flag = db.prepare("SELECT value FROM meta WHERE key = ?").get("catalog") as
    | { value: string }
    | undefined;

  if (flag?.value !== CATALOG_FLAG) {
    db.prepare("DELETE FROM products").run();
    const insert = db.prepare(
      `INSERT INTO products (title, description, price, image, category)
       VALUES (@title, @description, @price, @image, @category)`
    );
    const tx = db.transaction(() => {
      for (const p of SEED_PRODUCTS) insert.run(p);
      db.prepare(
        `INSERT INTO meta (key, value) VALUES ('catalog', ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value`
      ).run(CATALOG_FLAG);
    });
    tx();
  }

  const rouletteFlag = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get("roulette") as { value: string } | undefined;

  if (rouletteFlag?.value !== ROULETTE_FLAG) {
    const count = db.prepare("SELECT COUNT(*) as c FROM roulette_items").get() as {
      c: number;
    };
    if (count.c === 0) {
      const insert = db.prepare(
        `INSERT INTO roulette_items (title, image, sort_order, active)
         VALUES (@title, @image, @sort_order, 1)`
      );
      const tx = db.transaction(() => {
        for (const item of SEED_ROULETTE) insert.run(item);
      });
      tx();
    }
    db.prepare(
      `INSERT INTO meta (key, value) VALUES ('roulette', ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    ).run(ROULETTE_FLAG);
  }

  const owner = process.env.OWNER_USERNAME || "annbereg";
  const existing = db
    .prepare("SELECT id FROM managers WHERE username = ? COLLATE NOCASE")
    .get(owner);
  if (!existing) {
    db.prepare(
      `INSERT INTO managers (username, name, is_owner, active) VALUES (?, ?, 1, 1)`
    ).run(owner, "Владелец");
  }

  const siteName = db
    .prepare("SELECT value FROM meta WHERE key = ?")
    .get("site_name") as { value: string } | undefined;
  if (!siteName) {
    db.prepare(
      `INSERT INTO meta (key, value) VALUES ('site_name', ?)`
    ).run("Фуршетное меню");
  }
}

if (process.argv[1]?.includes("seed")) {
  ensureSeed();
  console.log("Каталог обновлён.");
}
