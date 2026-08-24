import { candles } from "./market-data.js";
import { rsi, sma } from "./indicators.js";
import { deriveLevels } from "./levels-engine.js";
import { evaluateSignal } from "./signal-engine.js";
import { toChartData } from "./chart-data.js";
import { createPaperPortfolio, executeSignal, portfolioSnapshot } from "./trading-simulator.js";

const closes = candles.map(candle => candle.close);
const volumes = candles.map(candle => candle.volume);
const levels = deriveLevels(candles);
const currentRsi = rsi(closes);
const signal = evaluateSignal({ candles, levels, rsi: currentRsi, volumeAverage: sma(volumes, 20).at(-1) });
const data = toChartData({ candles, movingAverageShort: sma(closes, 9), movingAverageLong: sma(closes, 21), rsi: currentRsi, levels, signal });
const money = value => `$${Math.round(value).toLocaleString("en-US")}`;
let portfolio = createPaperPortfolio();

function setText(id, text) { document.getElementById(id).textContent = text; }
function renderSummary() {
  const first = data.candles.at(-2).close, current = data.candles.at(-1);
  setText("current-price", money(current.close));
  setText("price-change", `${((current.close - first) / first * 100).toFixed(2)}% last candle`);
  setText("volume-stat", `${(current.volume / 1000).toFixed(2)}K BTC`);
  setText("rsi-stat", data.rsi);
  setText("rsi-label", data.rsi >= 50 ? "Constructive momentum" : "Momentum weakening");
  setText("score-stat", `${data.signal.score}/10`);
  setText("signal-badge", data.signal.status);
  setText("signal-title", data.signal.title);
  setText("signal-score", `${data.signal.score}/10`);
  document.getElementById("score-meter-fill").style.width = `${data.signal.score * 10}%`;
  ["reasons", "risks"].forEach(key => document.getElementById(`signal-${key}`).replaceChildren(...data.signal[key].map(text => Object.assign(document.createElement("li"), { textContent: text }))));
  setText("fomo-level", data.signal.fomoRisk.level);
  setText("fomo-score", `${data.signal.fomoRisk.score}/8`);
  document.getElementById("fomo-factors").replaceChildren(...data.signal.fomoRisk.factors.map(text => Object.assign(document.createElement("li"), { textContent: text })));
  setText("buy-zone", `${money(data.signal.buyZone.low)}–${money(data.signal.buyZone.high)}`);
  setText("exit-zone", `${money(data.signal.exit.low)}–${money(data.signal.exit.high)}`);
  renderPortfolio();
}

function renderPortfolio() {
  const current = data.candles.at(-1);
  const snapshot = portfolioSnapshot(portfolio, current.close);
  const status = snapshot.openPosition ? "Open BTC position" : "Ready to simulate";
  setText("paper-equity", money(snapshot.equity));
  setText("paper-status", status);
  setText("trade-status", status);
  setText("trade-detail", snapshot.openPosition
    ? `Entry ${money(portfolio.position.entry)} · Unrealized P/L ${snapshot.unrealizedPnl >= 0 ? "+" : ""}${money(snapshot.unrealizedPnl)}`
    : "Uses the current signal and a virtual $10,000 portfolio.");
}

function runPaperTrade() {
  const outcome = executeSignal(portfolio, data.signal, data.candles.at(-1));
  portfolio = outcome.portfolio;
  const button = document.getElementById("run-simulation");
  if (outcome.event) {
    button.textContent = "Position open";
    button.disabled = true;
  }
  renderPortfolio();
}

function renderChart() {
  const svg = document.getElementById("price-chart"), { candles, levels } = data;
  const W = 900, L = 54, R = 58, top = 20, priceH = 290, volTop = 325, volH = 52, rsiTop = 413, rsiH = 52;
  const allPrices = candles.flatMap(c => [c.high, c.low, levels.support.low, levels.resistance.high]);
  const min = Math.min(...allPrices) - 60, max = Math.max(...allPrices) + 60, y = value => top + (max - value) / (max - min) * priceH;
  const x = index => L + index * ((W - L - R) / candles.length) + 8;
  const elements = [];
  for (let i = 0; i < 5; i++) { const value = max - (max - min) * i / 4, yy = y(value); elements.push(`<line class="grid" x1="${L}" x2="${W-R}" y1="${yy}" y2="${yy}"/><text class="axis" x="${W-R+8}" y="${yy+4}">${(value / 1000).toFixed(1)}k</text>`); }
  [[levels.resistance, "#fb7185", "RESISTANCE / POTENTIAL EXIT"], [levels.support, "#43d19e", "BUY ZONE / SUPPORT"]].forEach(([zone, color, label]) => {
    const zoneTop = y(zone.high), zoneBottom = y(zone.low);
    elements.push(`<rect x="${L}" y="${zoneTop}" width="${W-L-R}" height="${zoneBottom-zoneTop}" fill="${color}" opacity=".12"/><line x1="${L}" x2="${W-R}" y1="${y(zone.value)}" y2="${y(zone.value)}" stroke="${color}" stroke-width="1.2" stroke-dasharray="5 4"/><text class="zone-label" x="${L+8}" y="${zoneTop+14}" fill="${color}">${label}</text>`);
  });
  candles.forEach((c, i) => { const color = c.close >= c.open ? "#43d19e" : "#fb7185", xx = x(i), width = 13, bodyY = y(Math.max(c.open, c.close)), bodyH = Math.max(2, Math.abs(y(c.open)-y(c.close))); elements.push(`<line x1="${xx}" x2="${xx}" y1="${y(c.high)}" y2="${y(c.low)}" stroke="${color}"/><rect x="${xx-width/2}" y="${bodyY}" width="${width}" height="${bodyH}" fill="${color}" rx="1"/>`); });
  [[data.movingAverageShort, "#65d6ff"], [data.movingAverageLong, "#c896ff"]].forEach(([values, color]) => { const path = values.map((v, i) => v ? `${i ? "L" : "M"}${x(i)},${y(v)}` : "").filter(Boolean).join(" "); elements.push(`<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5" opacity=".9"/>`); });
  const last = candles.at(-1), lastY = y(last.close); elements.push(`<line x1="${x(candles.length-1)}" x2="${W-R}" y1="${lastY}" y2="${lastY}" stroke="#edf4ff" stroke-width="1" stroke-dasharray="2 3"/><rect x="${W-R+2}" y="${lastY-10}" width="51" height="19" fill="#edf4ff" rx="3"/><text class="chart-tag" x="${W-R+6}" y="${lastY+3}" fill="#142033">${(last.close/1000).toFixed(2)}k</text>`);
  const buyX = x(candles.length - 3), buyY = y(candles.at(-3).low); elements.push(`<path d="M${buyX},${buyY+18} l-8,-12 h16 z" fill="#43d19e"/><text class="chart-tag" x="${buyX+11}" y="${buyY+15}" fill="#43d19e">SETUP</text>`);
  candles.forEach((c, i) => { const h = c.volume / Math.max(...volumes) * volH, color = c.close >= c.open ? "#43d19e" : "#fb7185"; elements.push(`<rect x="${x(i)-5}" y="${volTop+volH-h}" width="10" height="${h}" fill="${color}" opacity=".52"/>`); });
  const rsiY = rsiTop + rsiH * (1 - data.rsi / 100);
  elements.push(`<text class="axis" x="${L}" y="${volTop-5}">VOLUME</text><line class="grid" x1="${L}" x2="${W-R}" y1="${rsiTop}" y2="${rsiTop}"/><line class="grid" x1="${L}" x2="${W-R}" y1="${rsiTop+rsiH}" y2="${rsiTop+rsiH}"/><text class="axis" x="${L}" y="${rsiTop-6}">RSI (14)</text><line x1="${L}" x2="${W-R}" y1="${rsiY}" y2="${rsiY}" stroke="#f5b84b" stroke-width="2"/><text class="axis" x="${W-R+7}" y="${rsiY+4}">${data.rsi}</text>`);
  svg.innerHTML = elements.join("");
}
document.getElementById("run-simulation").addEventListener("click", runPaperTrade);
renderSummary(); renderChart();
