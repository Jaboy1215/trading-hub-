// The provider-agnostic contract every market-data source implements.
// Nothing outside this file (or a provider's own implementation) should
// know which vendor is actually serving the data -- that's the point of
// the abstraction (see README "Data architecture" / spec section 11).

export type AssetClass = "stock" | "crypto";

export type Timeframe = "1min" | "5min" | "15min" | "1h" | "4h" | "1day" | "1week";

export interface Quote {
  symbol: string;
  assetClass: AssetClass;
  price: number;
  /** Unix ms of the quote itself, not of the fetch. */
  timestamp: number;
  changePercent: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  previousClose: number | null;
}

export interface Bar {
  /** Unix ms, start of the bar. */
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AssetInfo {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  exchange: string | null;
  currency: string | null;
}

export interface HistoricalDataRequest {
  symbol: string;
  assetClass: AssetClass;
  timeframe: Timeframe;
  /** Inclusive. */
  from: Date;
  /** Inclusive. */
  to: Date;
}

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "invalid_symbol"
      | "rate_limited"
      | "provider_unavailable"
      | "insufficient_data"
      | "unknown",
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = "MarketDataError";
  }
}

/**
 * A market-data source. Implementations must never throw a raw fetch/parse
 * error -- always translate to MarketDataError with the right `code` so
 * callers (the dashboard, the backtester) can react appropriately (e.g.
 * "insufficient_data" should render a message, not a signal computed on
 * three bars).
 */
export interface MarketDataProvider {
  readonly name: string;

  getQuote(symbol: string, assetClass: AssetClass): Promise<Quote>;

  getHistoricalData(request: HistoricalDataRequest): Promise<Bar[]>;

  /** Convenience: sum of the last N bars' volume, at the given timeframe. */
  getVolume(symbol: string, assetClass: AssetClass, timeframe: Timeframe, bars: number): Promise<number>;

  getAssetInfo(symbol: string, assetClass: AssetClass): Promise<AssetInfo>;
}
