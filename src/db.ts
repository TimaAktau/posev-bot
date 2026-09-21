import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = process.env.DATA_DIR || join(root, "data");
mkdirSync(dataDir, { recursive: true });

export const db = new Database(join(dataDir, "posev.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  niche TEXT,
  contact TEXT,
  cpl_limit REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS placements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  channel TEXT NOT NULL,
  price REAL NOT NULL,
  date TEXT NOT NULL,
  url TEXT,
  reach INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL REFERENCES clients(id),
  placement_id INTEGER REFERENCES placements(id),
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'новый',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

export type Client = {
  id: number;
  name: string;
  niche: string | null;
  contact: string | null;
  cpl_limit: number | null;
  created_at: string;
};

export type Placement = {
  id: number;
  client_id: number;
  channel: string;
  price: number;
  date: string;
  url: string | null;
  reach: number | null;
};

export type Lead = {
  id: number;
  client_id: number;
  placement_id: number | null;
  payload: string;
  status: string;
  created_at: string;
};

export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as
    | { value: string }
    | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  ).run(key, value);
}

export function getAdminId(): number | null {
  const v = getSetting("admin_telegram_id");
  return v ? Number(v) : null;
}

export function claimAdmin(id: number): number {
  const existing = getAdminId();
  if (existing) return existing;
  setSetting("admin_telegram_id", String(id));
  return id;
}

export function defaultCplLimit(): number {
  const v = getSetting("default_cpl_limit");
  return v ? Number(v) : 0;
}

export function insertClient(input: {
  name: string;
  niche: string | null;
  contact: string | null;
}) {
  const r = db
    .prepare("INSERT INTO clients (name, niche, contact) VALUES (?, ?, ?)")
    .run(input.name, input.niche, input.contact);
  return Number(r.lastInsertRowid);
}

export function listClients(): Client[] {
  return db.prepare("SELECT * FROM clients ORDER BY id").all() as Client[];
}

export function getClient(id: number): Client | undefined {
  return db.prepare("SELECT * FROM clients WHERE id = ?").get(id) as Client | undefined;
}

export function findClientsByName(q: string): Client[] {
  return db
    .prepare("SELECT * FROM clients WHERE name LIKE ? COLLATE NOCASE ORDER BY id")
    .all(`%${q}%`) as Client[];
}

export function setClientCplLimit(id: number, limit: number) {
  db.prepare("UPDATE clients SET cpl_limit = ? WHERE id = ?").run(limit, id);
}

export function insertPlacement(input: {
  client_id: number;
  channel: string;
  price: number;
  date: string;
  url: string | null;
  reach: number | null;
}) {
  const r = db
    .prepare(
      `INSERT INTO placements (client_id, channel, price, date, url, reach)
       VALUES (@client_id, @channel, @price, @date, @url, @reach)`,
    )
    .run(input);
  return Number(r.lastInsertRowid);
}

export function insertLead(input: {
  client_id: number;
  placement_id: number | null;
  payload: string;
  status: string;
}) {
  const r = db
    .prepare(
      `INSERT INTO leads (client_id, placement_id, payload, status)
       VALUES (@client_id, @placement_id, @payload, @status)`,
    )
    .run(input);
  return Number(r.lastInsertRowid);
}

export function listPlacementsByClient(clientId: number): Placement[] {
  return db
    .prepare("SELECT * FROM placements WHERE client_id = ? ORDER BY date DESC, id DESC")
    .all(clientId) as Placement[];
}

export type SpendLeadRow = { spent: number; leads: number };

export function statsForClient(clientId: number, fromIso: string | null): SpendLeadRow {
  const spentRow = db
    .prepare(
      `SELECT COALESCE(SUM(price), 0) AS spent FROM placements
       WHERE client_id = ? AND (? IS NULL OR date >= ?)`,
    )
    .get(clientId, fromIso, fromIso) as { spent: number };
  const leadsRow = db
    .prepare(
      `SELECT COUNT(*) AS leads FROM leads
       WHERE client_id = ? AND (? IS NULL OR date(created_at) >= ?)`,
    )
    .get(clientId, fromIso, fromIso) as { leads: number };
  return { spent: Number(spentRow.spent), leads: Number(leadsRow.leads) };
}

export function allTimeStats(clientId: number): SpendLeadRow {
  return statsForClient(clientId, null);
}
