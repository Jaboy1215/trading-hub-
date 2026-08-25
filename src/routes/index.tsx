import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";

import {
  getAssetInfoFn,
  getHistoricalDataFn,
  getQuoteFn,
} from "@/lib/market-data/market-data.functions";
import type { AssetClass, Bar } from "@/lib/market-data/types";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const fallbackBars = [118, 121, 119, 128, 126, 131, 129, 136, 134, 142, 145, 141, 149, 153, 150, 159];

function createChartPath(values: number[]): string {
  if (values.length < 2) return "";

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum || 1;

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * 100;
      const y = 88 - ((value - minimum) / range) * 70;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value < 1 ? 6 : 2,
  }).format(value);
}

function Chart({ bars }: { bars: Bar[] }) {
  const closes = bars.length > 1 ? bars.map((bar) => bar.close) : fallbackBars;
  const path = useMemo(() => createChartPath(closes), [closes]);
  const latest = closes.at(-1) ?? 0;
  const prior = closes.at(-2) ?? latest;
  const trendIsUp = latest >= prior;

  return (
    <div className="market-chart" aria-label="Market price chart">
      <div className="chart-axis chart-axis--top">HIGH SIGNAL</div>
      <div className="chart-grid" />
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img">
        <defs>
          <linearGradient id="chart-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity=".25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L 100 100 L 0 100 Z`} className="chart-area" />
        <path d={path} className={`chart-line ${trendIsUp ? "chart-line--up" : "chart-line--down"}`} />
      </svg>
      <div className="chart-axis chart-axis--bottom">
        <span>-30D</span>
        <span>-20D</span>
        <span>-10D</span>
        <span>NOW</span>
      </div>
    </div>
  );
}

function HomePage() {
  const [symbol, setSymbol] = useState("AAPL");
  const [assetClass, setAssetClass] = useState<AssetClass>("stock");

  const getQuote = useServerFn(getQuoteFn);
  const getHistoricalData = useServerFn(getHistoricalDataFn);
  const getAssetInfo = useServerFn(getAssetInfoFn);

  const lookup = useMutation({
    mutationFn: async () => {
      const to = new Date();
      const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
      const [quote, info, bars] = await Promise.all([
        getQuote({ data: { symbol, assetClass } }),
        getAssetInfo({ data: { symbol, assetClass } }),
        getHistoricalData({
          data: {
            symbol,
            assetClass,
            timeframe: "1day",
            fromIso: from.toISOString(),
            toIso: to.toISOString(),
          },
        }),
      ]);
      return { quote, info, bars };
    },
  });

  const quote = lookup.data?.quote;
  const change = quote?.changePercent;
  const isPositive = (change ?? 0) >= 0;
  const displaySymbol = lookup.data?.info.symbol ?? (symbol || "AAPL");
  const displayName = lookup.data?.info.name ?? "Awaiting market scan";
  const changeLabel =
    change === undefined || change === null
      ? "AWAITING DATA"
      : `${isPositive ? "+" : ""}${change.toFixed(2)}%`;

  return (
    <main className="jarvis-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <aside className="rail" aria-label="Primary navigation">
        <div className="rail-brand">J</div>
        <nav className="rail-nav">
          <button className="rail-button rail-button--active" aria-label="Command center">
            <span />
          </button>
          <button className="rail-button" aria-label="Market scanner">
            <i />
          </button>
          <button className="rail-button" aria-label="Watchlists">
            <b />
          </button>
        </nav>
        <div className="rail-status"><span />SYS</div>
      </aside>

      <section className="command-center">
        <header className="topbar">
          <div>
            <p className="eyebrow">TRADING HUB / COMMAND CENTER</p>
            <h1>JARVIS <span>INTELLIGENCE</span></h1>
          </div>
          <div className="system-readout">
            <div><span className="status-dot" /> ALL SYSTEMS NOMINAL</div>
            <time>{new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} LOCAL</time>
          </div>
        </header>

        <section className="hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">NEURAL MARKET INTERFACE</p>
            <h2>See the signal.<br /><span>Keep your edge.</span></h2>
            <p className="hero-text">
              A research command center for disciplined market observation,
              explainable signals, and paper-trading decisions.
            </p>
            <div className="hero-tags">
              <span>LIVE DATA READY</span>
              <span>RISK-AWARE</span>
              <span>NO EXECUTION</span>
            </div>
          </div>

          <div className="orbital-display" aria-hidden="true">
            <div className="orbital-ring orbital-ring--outer" />
            <div className="orbital-ring orbital-ring--middle" />
            <div className="orbital-ring orbital-ring--inner" />
            <div className="orbital-core">
              <span>JARVIS</span>
              <small>ONLINE</small>
            </div>
            <div className="orbital-label orbital-label--top">MARKET<br />SENTINEL</div>
            <div className="orbital-label orbital-label--bottom">SCAN<br />READY</div>
          </div>
        </section>

        <section className="terminal-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">01 / MARKET RECON</p>
              <h2>Asset scanner</h2>
            </div>
            <div className="panel-code">TD-LIVE // 1D</div>
          </div>

          <div className="scanner-controls">
            <label>
              <span>SYMBOL</span>
              <input
                value={symbol}
                onChange={(event) => setSymbol(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && symbol.trim()) lookup.mutate();
                }}
                placeholder="AAPL, BTC, DOGE"
                maxLength={20}
              />
            </label>
            <label>
              <span>ASSET CLASS</span>
              <select
                value={assetClass}
                onChange={(event) => setAssetClass(event.target.value as AssetClass)}
              >
                <option value="stock">EQUITY</option>
                <option value="crypto">CRYPTO</option>
              </select>
            </label>
            <button
              className="scan-button"
              onClick={() => lookup.mutate()}
              disabled={lookup.isPending || !symbol.trim()}
            >
              <span>{lookup.isPending ? "SCANNING" : "INITIATE SCAN"}</span>
              <i />
            </button>
          </div>

          {lookup.error ? <p className="scan-error">{(lookup.error as Error).message}</p> : null}

          <div className="market-grid">
            <article className="quote-card">
              <div className="quote-label"><span className="pulse-dot" /> LIVE INSTRUMENT</div>
              <div className="quote-symbol">{displaySymbol}</div>
              <p>{displayName}</p>
              <div className="quote-price">
                {quote ? formatPrice(quote.price) : "--"}
                <span className={isPositive ? "positive" : "negative"}>
                  {changeLabel}
                </span>
              </div>
              <dl>
                <div><dt>EXCHANGE</dt><dd>{lookup.data?.info.exchange ?? "--"}</dd></div>
                <div><dt>WINDOW</dt><dd>30 DAYS</dd></div>
              </dl>
            </article>

            <article className="chart-card">
              <div className="chart-card__header">
                <div>
                  <p className="eyebrow">PRICE TELEMETRY</p>
                  <strong>{quote ? formatPrice(quote.price) : "READY FOR SCAN"}</strong>
                </div>
                <span className={isPositive ? "signal signal--up" : "signal signal--down"}>
                  {isPositive ? "UPTREND" : "DOWNTREND"}
                </span>
              </div>
              <Chart bars={lookup.data?.bars ?? []} />
            </article>
          </div>
        </section>

        <section className="telemetry-row">
          <article>
            <span className="telemetry-index">02</span>
            <p className="eyebrow">JARVIS MEMORY</p>
            <strong>Cloud container</strong>
            <small>Persistent research context armed.</small>
          </article>
          <article>
            <span className="telemetry-index">03</span>
            <p className="eyebrow">STRATEGY MODE</p>
            <strong>Observation only</strong>
            <small>Paper-trading safeguards remain active.</small>
          </article>
          <article>
            <span className="telemetry-index">04</span>
            <p className="eyebrow">SIGNAL ENGINE</p>
            <strong>Calibrating</strong>
            <small>Technical analysis arrives in Phase 3.</small>
          </article>
        </section>
      </section>
    </main>
  );
}
