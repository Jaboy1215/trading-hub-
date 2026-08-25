import { describe, expect, it } from "vitest";

import type { Bar } from "@/lib/market-data/types";

import { calculateTechnicalIndicators } from "./technical-indicators";

function makeBars(closes: number[]): Bar[] {
  return closes.map((close, index) => ({
    time: index * 86_400_000,
    open: close,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000,
  }));
}

describe("calculateTechnicalIndicators", () => {
  it("returns unavailable values until each indicator has enough bars", () => {
    expect(calculateTechnicalIndicators(makeBars([100, 101, 102]))).toEqual({
      sampleSize: 3,
      sma20: null,
      ema20: null,
      rsi14: null,
      atr14: null,
      trend: "unavailable",
    });
  });

  it("calculates 20-period trend indicators and 14-period momentum metrics", () => {
    const indicators = calculateTechnicalIndicators(makeBars(Array.from({ length: 30 }, (_, index) => 100 + index)));

    expect(indicators.sampleSize).toBe(30);
    expect(indicators.sma20).toBe(119.5);
    expect(indicators.ema20).toBe(119.5);
    expect(indicators.rsi14).toBe(100);
    expect(indicators.atr14).toBe(2);
    expect(indicators.trend).toBe("bullish");
  });
});
