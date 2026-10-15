export function sma(values, period) {
  return values.map((_, index) => index < period - 1 ? null : values.slice(index - period + 1, index + 1).reduce((sum, value) => sum + value, 0) / period);
}

export function rsi(values, period = 14) {
  const changes = values.slice(1).map((value, index) => value - values[index]);
  if (changes.length < period) return 50;
  const recent = changes.slice(-period);
  const gains = recent.filter(change => change > 0).reduce((sum, change) => sum + change, 0) / period;
  const losses = Math.abs(recent.filter(change => change < 0).reduce((sum, change) => sum + change, 0)) / period;
  return +(100 - 100 / (1 + gains / (losses || 0.001))).toFixed(1);
}
