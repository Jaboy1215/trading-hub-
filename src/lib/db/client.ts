import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const DB_PATH = process.env["DATABASE_PATH"] ?? "trading.db";

let sqlite: Database.Database | undefined;

export function getDb() {
  if (!sqlite) {
    sqlite = new Database(DB_PATH);
    sqlite.pragma("journal_mode = WAL");
  }
  return drizzle(sqlite, { schema });
}
