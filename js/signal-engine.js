export function evaluateSignal({ candles, levels, rsi, volumeAverage }) {
  const current = candles.at(-1);
  const previous = candles.at(-2);
  const nearSupport = current.close <= levels.support.high + 350;
  const greenCandleConfirmation = current.close > current.open && current.close > previous.high;
  const volumeConfirmed = current.volume > volumeAverage;
  const momentumImproving = rsi > 50 && rsi < 70;
  const resistanceDistance = (levels.resistance.value - current.close) / current.close;
  const resistanceClose = resistanceDistance < .018;
  const notExtremelyCloseToResistance = resistanceDistance > .001;
  const elevatedVolatility = (current.high - current.low) / current.close > .006;
  const momentumExtended = rsi >= 65;
  const fomoScore =
    (resistanceClose ? 3 : 0) +
    (elevatedVolatility ? 2 : 0) +
    (volumeConfirmed ? 1 : 0) +
    (momentumExtended ? 2 : 0);
  const conditions = [
    { met: nearSupport, label: "Support nearby" },
    { met: greenCandleConfirmation, label: "Green-candle confirmation" },
    { met: volumeConfirmed, label: "Volume increased" },
    { met: momentumImproving, label: "Momentum improving" },
    { met: notExtremelyCloseToResistance, label: "Room before resistance" }
  ];
  const score = Math.round(conditions.filter(condition => condition.met).length / conditions.length * 10);
  const watchZone = conditions.every(condition => condition.met);

  return {
    title: watchZone ? "Watch Zone Detected" : "Monitoring Setup",
    score,
    status: watchZone ? "Watch zone" : "Monitoring",
    conditions,
    reasons: conditions.filter(condition => condition.met).map(condition => condition.label),
    risks: [
      resistanceClose && "Resistance is relatively close",
      elevatedVolatility && "Volatility is elevated"
    ].filter(Boolean),
    marketRisk: {
      volatilityPercent: +((current.high - current.low) / current.close * 100).toFixed(2),
      supportDistancePercent: +((current.close - levels.support.value) / current.close * 100).toFixed(2),
      resistanceDistancePercent: +(resistanceDistance * 100).toFixed(2),
      recentMovePercent: +((current.close - previous.close) / previous.close * 100).toFixed(2),
      extreme: elevatedVolatility
    },
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
