import { atr, ema, rsi, sma } from "technicalindicators";

import type { Bar } from "@/lib/market-data/types";

const SMA_PERIOD = 20;
const EMA_PERIOD = 20;
const RSI_PERIOD = 14;
const ATR_PERIOD = 14;

export interface TechnicalIndicators {
  sampleSize: number;
  sma20: number | null;
  ema20: number | null;
  rsi14: number | null;
  atr14: number | null;
  trend: "bullish" | "bearish" | "neutral" | "unavailable";
}

function latest(values: number[]): number | null {
  return values.at(-1) ?? null;
}

/**
 * Derives descriptive technical measurements from chronological OHLCV bars.
 * These indicators describe past price behavior; they are not trade advice or
 * a prediction of future returns.
 */
export function calculateTechnicalIndicators(bars: Bar[]): TechnicalIndicators {
  const closes = bars.map((bar) => bar.close);
  const sma20 = latest(sma({ period: SMA_PERIOD, values: closes }));
  const ema20 = latest(ema({ period: EMA_PERIOD, values: closes }));
  const rsi14 = latest(rsi({ period: RSI_PERIOD, values: closes }));
  const atr14 = latest(
    atr({
      period: ATR_PERIOD,
      high: bars.map((bar) => bar.high),
      low: bars.map((bar) => bar.low),
      close: closes,
    }),
  );
  const latestClose = closes.at(-1) ?? null;

  const trend =
    latestClose === null || sma20 === null || ema20 === null
      ? "unavailable"
      : latestClose > sma20 && latestClose > ema20
        ? "bullish"
        : latestClose < sma20 && latestClose < ema20
          ? "bearish"
          : "neutral";

  return { sampleSize: bars.length, sma20, ema20, rsi14, atr14, trend };
}
