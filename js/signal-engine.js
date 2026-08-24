export function evaluateSignal({ candles, levels, rsi, volumeAverage }) {
  const current = candles.at(-1);
  const nearSupport = current.close <= levels.support.high + 350;
  const volumeConfirmed = current.volume > volumeAverage;
  const momentumImproving = rsi > 50 && rsi < 70;
  const resistanceClose = (levels.resistance.value - current.close) / current.close < .018;
  const elevatedVolatility = (current.high - current.low) / current.close > .006;
  const momentumExtended = rsi >= 65;
  const fomoScore =
    (resistanceClose ? 3 : 0) +
    (elevatedVolatility ? 2 : 0) +
    (volumeConfirmed ? 1 : 0) +
    (momentumExtended ? 2 : 0);
  const score = [nearSupport, volumeConfirmed, momentumImproving].filter(Boolean).length + 4;

  return {
    title: score >= 7 ? "Potential Buy Setup" : "Monitoring Setup",
    score,
    status: score >= 7 ? "Active setup" : "Monitoring",
    reasons: [
      nearSupport && "Price is near support",
      volumeConfirmed && "Volume confirmation detected",
      momentumImproving && "Momentum improving"
    ].filter(Boolean),
    risks: [
      resistanceClose && "Resistance is relatively close",
      elevatedVolatility && "Volatility is elevated"
    ].filter(Boolean),
    fomoRisk: {
      score: fomoScore,
      level: fomoScore >= 6 ? "Elevated" : fomoScore >= 3 ? "Moderate" : "Low",
      factors: [
        resistanceClose && "Price is approaching the potential exit zone",
        elevatedVolatility && "Large intraperiod range increases chase risk",
        volumeConfirmed && "Strong volume can encourage late entries",
        momentumExtended && "Momentum is becoming extended"
      ].filter(Boolean)
    },
    buyZone: levels.support,
    exit: levels.resistance
  };
}
