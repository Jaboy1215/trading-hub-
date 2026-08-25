export function toChartData({ candles, movingAverageShort, movingAverageLong, rsi, levels, signal, symbol, source }) {
  return { candles, movingAverageShort, movingAverageLong, rsi, levels, signal, symbol, source };
}
