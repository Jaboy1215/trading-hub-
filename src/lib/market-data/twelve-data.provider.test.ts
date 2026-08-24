import { afterEach, describe, expect, it, vi } from "vitest";

import { TwelveDataProvider } from "./twelve-data.provider";
import { MarketDataError } from "./types";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: async () => body,
    }),
  );
}

describe("TwelveDataProvider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires an API key", () => {
    expect(() => new TwelveDataProvider("")).toThrow();
  });

  describe("getQuote", () => {
    it("parses a valid stock quote", async () => {
      mockFetchOnce({
        symbol: "AAPL",
        close: "227.52",
        percent_change: "1.23",
        high: "229.10",
        low: "225.00",
        previous_close: "224.75",
        timestamp: 1_700_000_000,
      });

      const provider = new TwelveDataProvider("test-key");
      const quote = await provider.getQuote("AAPL", "stock");

      expect(quote.symbol).toBe("AAPL");
      expect(quote.price).toBe(227.52);
      expect(quote.changePercent).toBe(1.23);
      expect(quote.timestamp).toBe(1_700_000_000_000);
    });

    it("appends /USD for a bare crypto symbol", async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ symbol: "BTC/USD", close: "60000", percent_change: null, high: null, low: null, previous_close: null, timestamp: 1_700_000_000 }),
      });
      vi.stubGlobal("fetch", fetchSpy);

      const provider = new TwelveDataProvider("test-key");
      await provider.getQuote("btc", "crypto");

      const calledUrl = new URL(fetchSpy.mock.calls[0]![0] as string);
      expect(calledUrl.searchParams.get("symbol")).toBe("BTC/USD");
    });

    it("throws insufficient_data when price is missing", async () => {
      mockFetchOnce({
        symbol: "ZZZZ",
        close: null,
        percent_change: null,
        high: null,
        low: null,
        previous_close: null,
        timestamp: 0,
      });

      const provider = new TwelveDataProvider("test-key");
      await expect(provider.getQuote("ZZZZ", "stock")).rejects.toMatchObject({
        code: "insufficient_data",
      });
    });

    it("translates a rate-limit error response", async () => {
      mockFetchOnce({ status: "error", code: 429, message: "You have run out of API credits." });

      const provider = new TwelveDataProvider("test-key");
      await expect(provider.getQuote("AAPL", "stock")).rejects.toMatchObject({
        code: "rate_limited",
      });
    });

    it("translates an invalid-symbol error response", async () => {
      mockFetchOnce({ status: "error", code: 400, message: "Symbol not found." });

      const provider = new TwelveDataProvider("test-key");
      await expect(provider.getQuote("NOTREAL", "stock")).rejects.toBeInstanceOf(MarketDataError);
      await expect(provider.getQuote("NOTREAL", "stock")).rejects.toMatchObject({
        code: "invalid_symbol",
      });
    });

    it("wraps a network failure as provider_unavailable", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("network down")),
      );

      const provider = new TwelveDataProvider("test-key");
      await expect(provider.getQuote("AAPL", "stock")).rejects.toMatchObject({
        code: "provider_unavailable",
      });
    });
  });

  describe("getHistoricalData", () => {
    it("maps time-series values to Bar[] in ascending order", async () => {
      mockFetchOnce({
        values: [
          { datetime: "2026-01-01", open: "100", high: "105", low: "99", close: "104", volume: "1000" },
          { datetime: "2026-01-02", open: "104", high: "108", low: "103", close: "107", volume: "1200" },
        ],
      });

      const provider = new TwelveDataProvider("test-key");
      const bars = await provider.getHistoricalData({
        symbol: "AAPL",
        assetClass: "stock",
        timeframe: "1day",
        from: new Date("2026-01-01"),
        to: new Date("2026-01-02"),
      });

      expect(bars).toHaveLength(2);
      expect(bars[0]).toMatchObject({ open: 100, close: 104, volume: 1000 });
      expect(bars[1]!.time).toBeGreaterThan(bars[0]!.time);
    });

    it("throws insufficient_data when no values are returned", async () => {
      mockFetchOnce({ values: [] });

      const provider = new TwelveDataProvider("test-key");
      await expect(
        provider.getHistoricalData({
          symbol: "AAPL",
          assetClass: "stock",
          timeframe: "1day",
          from: new Date("2026-01-01"),
          to: new Date("2026-01-02"),
        }),
      ).rejects.toMatchObject({ code: "insufficient_data" });
    });

    it("defaults volume to 0 when the provider omits it", async () => {
      mockFetchOnce({
        values: [{ datetime: "2026-01-01", open: "1", high: "1", low: "1", close: "1" }],
      });

      const provider = new TwelveDataProvider("test-key");
      const bars = await provider.getHistoricalData({
        symbol: "BTC",
        assetClass: "crypto",
        timeframe: "1day",
        from: new Date("2026-01-01"),
        to: new Date("2026-01-01"),
      });

      expect(bars[0]!.volume).toBe(0);
    });
  });

  describe("getAssetInfo", () => {
    it("returns the first symbol-search match", async () => {
      mockFetchOnce({
        data: [{ symbol: "AAPL", instrument_name: "Apple Inc.", exchange: "NASDAQ", currency: "USD" }],
      });

      const provider = new TwelveDataProvider("test-key");
      const info = await provider.getAssetInfo("AAPL", "stock");

      expect(info.name).toBe("Apple Inc.");
      expect(info.exchange).toBe("NASDAQ");
    });

    it("throws invalid_symbol when there are no matches", async () => {
      mockFetchOnce({ data: [] });

      const provider = new TwelveDataProvider("test-key");
      await expect(provider.getAssetInfo("ZZZZZZ", "stock")).rejects.toMatchObject({
        code: "invalid_symbol",
      });
    });
  });
});
