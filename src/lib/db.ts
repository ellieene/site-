import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "furshet.db");

const globalForDb = globalThis as unknown as { __furshetDb?: Database.Database };

function createDb() {
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

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

    CREATE TABLE IF NOT EXISTS roulette_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      image TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function getDb() {
  if (!globalForDb.__furshetDb) {
    globalForDb.__furshetDb = createDb();
  }
  return globalForDb.__furshetDb;
}

export type Product = {
  id: number;
  title: string;
  description: string;
  price: number;
  image: string | null;
  category: string;
  active: number;
  created_at: string;
};

export type Order = {
  id: number;
  phone: string;
  email: string | null;
  notes: string | null;
  items_json: string;
  total: number;
  status: string;
  created_at: string;
};

export type Manager = {
  id: number;
  username: string;
  chat_id: string | null;
  name: string | null;
  is_owner: number;
  active: number;
  created_at: string;
};

export type RouletteItem = {
  id: number;
  title: string;
  image: string;
  sort_order: number;
  active: number;
  created_at: string;
};

export type CartItem = {
  productId: number;
  title: string;
  price: number;
  qty: number;
};
