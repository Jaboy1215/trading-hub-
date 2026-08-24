import { candles } from "./market-data.js";

export function createDemoMarketDataProvider() {
  return {
    async getCandles(symbol) {
      return { symbol: symbol.trim().toUpperCase() || "PEPE / USD", candles, source: "Demo market data" };
    }
  };
}
