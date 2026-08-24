import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getHistoricalDataCached } from "./historical-data-cache";
import { getMarketDataProvider } from "./provider";
import { MarketDataError } from "./types";

const assetClassSchema = z.enum(["stock", "crypto"]);
const timeframeSchema = z.enum(["1min", "5min", "15min", "1h", "4h", "1day", "1week"]);

/** Server functions never leak MarketDataError's internal `cause` to the client -- message + code only. */
function toPublicError(error: unknown): never {
  if (error instanceof MarketDataError) {
    throw new Error(`[${error.code}] ${error.message}`);
  }
  throw error instanceof Error ? error : new Error("Unknown market-data error.");
}

export const getQuoteFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ symbol: z.string().min(1).max(20), assetClass: assetClassSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      return await getMarketDataProvider().getQuote(data.symbol, data.assetClass);
    } catch (error) {
      toPublicError(error);
    }
  });

export const getHistoricalDataFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        symbol: z.string().min(1).max(20),
        assetClass: assetClassSchema,
        timeframe: timeframeSchema,
        fromIso: z.string(),
        toIso: z.string(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      return await getHistoricalDataCached(getMarketDataProvider(), {
        symbol: data.symbol,
        assetClass: data.assetClass,
        timeframe: data.timeframe,
        from: new Date(data.fromIso),
        to: new Date(data.toIso),
      });
    } catch (error) {
      toPublicError(error);
    }
  });

export const getAssetInfoFn = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ symbol: z.string().min(1).max(20), assetClass: assetClassSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    try {
      return await getMarketDataProvider().getAssetInfo(data.symbol, data.assetClass);
    } catch (error) {
      toPublicError(error);
    }
  });
