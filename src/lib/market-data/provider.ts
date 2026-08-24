import { TwelveDataProvider } from "./twelve-data.provider";
import type { MarketDataProvider } from "./types";

let cached: MarketDataProvider | undefined;

/** Server-only: reads TWELVE_DATA_API_KEY from the environment, never from a client request. */
export function getMarketDataProvider(): MarketDataProvider {
  if (cached) return cached;

  const apiKey = process.env["TWELVE_DATA_API_KEY"];
  if (!apiKey) {
    throw new Error(
      "TWELVE_DATA_API_KEY is not set. Get a free key at https://twelvedata.com/pricing and add it to .env.",
    );
  }

  cached = new TwelveDataProvider(apiKey);
  return cached;
}
