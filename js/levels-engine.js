export function deriveLevels(candles) {
  const recent = candles.slice(-6);
  const support = Math.min(...recent.map(candle => candle.low));
  const resistance = Math.max(...recent.map(candle => candle.high));
  return {
    support: { low: support - 90, high: support + 330, value: support },
    resistance: { low: resistance - 130, high: resistance + 90, value: resistance }
  };
}
