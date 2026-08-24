// Twelve Data (https://twelvedata.com/docs) -- covers both stocks and
// crypto under one API key. Free tier: 800 requests/day, 8 requests/minute.
// Required env var: TWELVE_DATA_API_KEY (server-side only, never sent to
// the client -- see market-data.functions.ts).
import type {
  AssetClass,
  AssetInfo,
  Bar,
  HistoricalDataRequest,
  MarketDataProvider,
  Quote,
  Timeframe,
} from "./types";
import { MarketDataError } from "./types";

const BASE_URL = "https://api.twelvedata.com";

// Twelve Data's interval strings differ slightly from ours.
const INTERVAL_MAP: Record<Timeframe, string> = {
  "1min": "1min",
  "5min": "5min",
  "15min": "15min",
  "1h": "1h",
  "4h": "4h",
  "1day": "1day",
  "1week": "1week",
};

/** Crypto symbols on Twelve Data are pairs like "BTC/USD", not bare "BTC". */
function toProviderSymbol(symbol: string, assetClass: AssetClass): string {
  if (assetClass === "crypto" && !symbol.includes("/")) {
    return `${symbol.toUpperCase()}/USD`;
  }
  return symbol.toUpperCase();
}

interface TwelveDataErrorBody {
  status: "error";
  code: number;
  message: string;
}

function isErrorBody(body: unknown): body is TwelveDataErrorBody {
  return typeof body === "object" && body !== null && (body as { status?: unknown }).status === "error";
}

function errorFromBody(body: TwelveDataErrorBody): MarketDataError {
  if (body.code === 429) {
    return new MarketDataError("Twelve Data rate limit hit.", "rate_limited", body);
  }
  if (body.code === 400 || body.code === 404) {
    return new MarketDataError(`Symbol not recognized: ${body.message}`, "invalid_symbol", body);
  }
  return new MarketDataError(body.message, "unknown", body);
}

export class TwelveDataProvider implements MarketDataProvider {
  readonly name = "twelve-data";

  constructor(private readonly apiKey: string) {
    if (!apiKey) {
      throw new Error("TwelveDataProvider requires an API key.");
    }
  }

  private async request<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    url.searchParams.set("apikey", this.apiKey);

    let response: Response;
    try {
      response = await fetch(url.toString());
    } catch (error) {
      throw new MarketDataError("Could not reach Twelve Data.", "provider_unavailable", error);
    }

    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw new MarketDataError("Twelve Data returned an unparseable response.", "unknown", error);
    }

    if (isErrorBody(body)) throw errorFromBody(body);
    if (!response.ok) {
      throw new MarketDataError(`Twelve Data HTTP ${response.status}`, "unknown", body);
    }
    return body as T;
  }

  async getQuote(symbol: string, assetClass: AssetClass): Promise<Quote> {
    interface QuoteResponse {
      symbol: string;
      close: string;
      percent_change: string | null;
      high: string | null;
      low: string | null;
      previous_close: string | null;
      timestamp: number;
    }

    const providerSymbol = toProviderSymbol(symbol, assetClass);
    const data = await this.request<QuoteResponse>("/quote", { symbol: providerSymbol });

    // Number(null) is 0, not NaN -- check for null/missing explicitly, not just finiteness.
    if (data.close === null || data.close === undefined) {
      throw new MarketDataError(`No price data for ${symbol}.`, "insufficient_data");
    }
    const price = Number(data.close);
    if (!Number.isFinite(price)) {
      throw new MarketDataError(`No price data for ${symbol}.`, "insufficient_data");
    }

    return {
      symbol: symbol.toUpperCase(),
      assetClass,
      price,
      timestamp: data.timestamp ? data.timestamp * 1000 : Date.now(),
      changePercent: data.percent_change !== null ? Number(data.percent_change) : null,
      dayHigh: data.high !== null ? Number(data.high) : null,
      dayLow: data.low !== null ? Number(data.low) : null,
      previousClose: data.previous_close !== null ? Number(data.previous_close) : null,
    };
  }

  async getHistoricalData(request: HistoricalDataRequest): Promise<Bar[]> {
    interface TimeSeriesResponse {
      values?: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
        volume?: string;
      }>;
    }

    const providerSymbol = toProviderSymbol(request.symbol, request.assetClass);
    const data = await this.request<TimeSeriesResponse>("/time_series", {
      symbol: providerSymbol,
      interval: INTERVAL_MAP[request.timeframe],
      start_date: request.from.toISOString().slice(0, 10),
      end_date: request.to.toISOString().slice(0, 10),
      order: "ASC",
    });

    if (!data.values || data.values.length === 0) {
      throw new MarketDataError(
        `No historical data for ${request.symbol} in the requested range.`,
        "insufficient_data",
      );
    }

    return data.values.map((v) => ({
      time: new Date(v.datetime).getTime(),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
      volume: v.volume ? Number(v.volume) : 0,
    }));
  }

  async getVolume(
    symbol: string,
    assetClass: AssetClass,
    timeframe: Timeframe,
    bars: number,
  ): Promise<number> {
    const to = new Date();
    const from = new Date(to.getTime() - barsToMillis(timeframe, bars));
    const data = await this.getHistoricalData({ symbol, assetClass, timeframe, from, to });
    return data.reduce((sum, bar) => sum + bar.volume, 0);
  }

  async getAssetInfo(symbol: string, assetClass: AssetClass): Promise<AssetInfo> {
    interface SymbolSearchResponse {
      data?: Array<{
        symbol: string;
        instrument_name: string;
        exchange: string | null;
        currency: string | null;
      }>;
    }

    const providerSymbol = toProviderSymbol(symbol, assetClass);
    const data = await this.request<SymbolSearchResponse>("/symbol_search", {
      symbol: providerSymbol,
    });

    const match = data.data?.[0];
    if (!match) {
      throw new MarketDataError(`Could not find asset info for ${symbol}.`, "invalid_symbol");
    }

    return {
      symbol: symbol.toUpperCase(),
      name: match.instrument_name,
      assetClass,
      exchange: match.exchange,
      currency: match.currency,
    };
  }
}

const MINUTE = 60_000;
const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1min": MINUTE,
  "5min": 5 * MINUTE,
  "15min": 15 * MINUTE,
  "1h": 60 * MINUTE,
  "4h": 4 * 60 * MINUTE,
  "1day": 24 * 60 * MINUTE,
  "1week": 7 * 24 * 60 * MINUTE,
};

function barsToMillis(timeframe: Timeframe, bars: number): number {
  return TIMEFRAME_MS[timeframe] * bars;
}
