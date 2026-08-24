// Drizzle schema, SQLite. Only what Phase 2 (market-data integration)
// needs is here -- assets (resolved asset metadata, cached) and
// price_bars (a local cache of fetched OHLCV bars, so re-running a
// backtest or reloading the dashboard doesn't re-spend Twelve Data's
// 800 req/day budget on data we already have). Signals, S/R zones,
// backtests, paper trading, and alerts tables are added in their own
// phases (see spec section 12) rather than speculatively now.
import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const assets = sqliteTable("assets", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class", { enum: ["stock", "crypto"] }).notNull(),
  name: text("name").notNull(),
  exchange: text("exchange"),
  currency: text("currency"),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
}, (table) => [
  uniqueIndex("assets_symbol_class_idx").on(table.symbol, table.assetClass),
]);

/**
 * One row per bar. `time` is unix ms, start-of-bar -- matches Bar.time in
 * market-data/types.ts exactly, so a row round-trips to a Bar with no
 * transformation. Uniqueness on (symbol, assetClass, timeframe, time)
 * means re-fetching an overlapping range is a safe upsert, not a duplicate.
 */
export const priceBars = sqliteTable("price_bars", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class", { enum: ["stock", "crypto"] }).notNull(),
  timeframe: text("timeframe").notNull(),
  time: integer("time").notNull(),
  open: real("open").notNull(),
  high: real("high").notNull(),
  low: real("low").notNull(),
  close: real("close").notNull(),
  volume: real("volume").notNull(),
}, (table) => [
  uniqueIndex("price_bars_unique_idx").on(table.symbol, table.assetClass, table.timeframe, table.time),
  index("price_bars_lookup_idx").on(table.symbol, table.assetClass, table.timeframe),
]);
