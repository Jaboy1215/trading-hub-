// A thin cache in front of the provider's getHistoricalData, backed by
// the price_bars table. Twelve Data's free tier is 800 req/day / 8
// req/min -- reloading the dashboard or re-running a backtest against
// the same range shouldn't cost a fresh API call every time.
//
// Simplification (documented, not hidden): this checks for *full*
// coverage of the requested range and re-fetches the whole range on any
// gap, rather than fetching only the missing edges. Partial-range
// gap-filling is real complexity (timeframe-aware boundary math, DST,
// weekends/market-closed days) that isn't worth the bug surface for a
// research tool -- a cache miss just costs one extra API call.
import { and, asc, eq, gte, lte } from "drizzle-orm";

import { getDb } from "../db/client";
import { priceBars } from "../db/schema";
import type { MarketDataProvider, Bar, HistoricalDataRequest } from "./types";

export async function getHistoricalDataCached(
  provider: MarketDataProvider,
  request: HistoricalDataRequest,
): Promise<Bar[]> {
  const db = getDb();
  const fromMs = request.from.getTime();
  const toMs = request.to.getTime();

  const cached = await db
    .select()
    .from(priceBars)
    .where(
      and(
        eq(priceBars.symbol, request.symbol.toUpperCase()),
        eq(priceBars.assetClass, request.assetClass),
        eq(priceBars.timeframe, request.timeframe),
        gte(priceBars.time, fromMs),
        lte(priceBars.time, toMs),
      ),
    )
    .orderBy(asc(priceBars.time));

  const coversRange =
    cached.length > 0 &&
    cached[0]!.time - fromMs < expectedGapMs(request.timeframe) &&
    toMs - cached[cached.length - 1]!.time < expectedGapMs(request.timeframe);

  if (coversRange) {
    return cached.map((row) => ({
      time: row.time,
      open: row.open,
      high: row.high,
      low: row.low,
      close: row.close,
      volume: row.volume,
    }));
  }

  const fresh = await provider.getHistoricalData(request);

  if (fresh.length > 0) {
    const rows = fresh.map((bar) => ({
      symbol: request.symbol.toUpperCase(),
      assetClass: request.assetClass,
      timeframe: request.timeframe,
      time: bar.time,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
    for (const row of rows) {
      db.insert(priceBars)
        .values(row)
        .onConflictDoUpdate({
          target: [priceBars.symbol, priceBars.assetClass, priceBars.timeframe, priceBars.time],
          set: { open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume },
        })
        .run();
    }
  }

  return fresh;
}

// One bar's worth of slack -- "covers the range" means the first cached
// bar isn't more than one interval late and the last isn't more than one
// interval early, since exact boundary alignment depends on market hours.
function expectedGapMs(timeframe: HistoricalDataRequest["timeframe"]): number {
  const MINUTE = 60_000;
  const table: Record<HistoricalDataRequest["timeframe"], number> = {
    "1min": MINUTE,
    "5min": 5 * MINUTE,
    "15min": 15 * MINUTE,
    "1h": 60 * MINUTE,
    "4h": 4 * 60 * MINUTE,
    "1day": 3 * 24 * 60 * MINUTE, // weekends/holidays
    "1week": 10 * 24 * 60 * MINUTE,
  };
  return table[timeframe];
}
