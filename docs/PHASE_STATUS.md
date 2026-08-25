# Trading Hub — phase status

Currently **Phase 2 of 10 complete** (see the phase list in the root `README.md`). This doc has the detail a phase-by-phase writeup needs that the README doesn't: exact decisions made, why, and precisely what each remaining phase needs to produce.

## Decisions already locked in (Phase 1)

- **Stack**: TanStack Start (Vite + file-based routes + server functions), TypeScript strict mode, SQLite via Drizzle ORM (local file `trading.db`), Vitest.
- **Market data provider**: Twelve Data (free tier: 800 req/day, 8/min), chosen because it covers both stocks and crypto under one API key. `MarketDataProvider` interface exists specifically so a second provider (e.g. CoinGecko for deeper meme-coin coverage) can be added later without touching call sites.
- **Charting**: `lightweight-charts` is installed but not yet used (Phase 6).
- **Indicators**: `technicalindicators` npm package is installed but not yet used (Phase 3) — chosen over hand-rolling RSI/MA/ATR math to avoid subtle bugs in well-known formulas; the genuinely custom logic (support/resistance, signal scoring) will still be hand-written.

## Phase 2 — done

- `MarketDataProvider` interface: `getQuote` / `getHistoricalData` / `getVolume` / `getAssetInfo` (`src/lib/market-data/types.ts`)
- `TwelveDataProvider` implementation, all errors translated to typed `MarketDataError` (`invalid_symbol` / `rate_limited` / `provider_unavailable` / `insufficient_data` / `unknown`)
- Local SQLite cache (`price_bars` table) in front of historical-data fetches — see the documented simplification in `src/lib/market-data/historical-data-cache.ts` (full-range cache hit/miss, not partial gap-filling — that tradeoff is deliberate, not an oversight)
- 12 passing unit tests (mocked fetch, no live key needed) — `src/lib/market-data/twelve-data.provider.test.ts`
- API key confirmed server-only (build output shows it's excluded from the client bundle)
- Proof-of-life route at `/` (NOT the real dashboard — that's Phase 6)

**Known gap**: nobody has tested this against a real Twelve Data API key yet (this session never had one). Get one free at twelvedata.com/pricing, add to `.env`, and manually verify a real symbol lookup works before trusting Phase 2 fully — the mocked tests prove the parsing logic is correct, not that the live API contract matches what the code assumes.

## Phase 3 — Technical indicators (next)

Build on `technicalindicators` (already installed). Needs:
- A thin wrapper module (`src/lib/indicators/`) around RSI, SMA, EMA, ATR (volatility) — take `Bar[]` in, return the same array length with `null` for the warm-up period where an indicator has insufficient history (never silently drop bars — the caller needs to know an early bar has no RSI yet).
- Volume analysis: rolling average volume, volume-spike detection (current bar vs N-bar average).
- Unit tests against a known reference dataset (e.g. compute RSI by hand for a small fixed series and assert the function matches — don't just assert "it returns numbers").

## Phase 4 — Support/resistance engine

The core differentiator. Per the original spec: represent as **zones**, not exact prices. Consider swing highs/lows, local extrema, price clustering, volume-confirmed rejection zones. Must not use future bars when computing a zone "as of" a historical point (this matters enormously for Phase 7's backtester — read that phase's look-ahead-bias requirement now, before writing this, so the API shape supports it from the start).

## Phase 5 — Signal engine

Rules-based scoring (not ML) combining: proximity to support/resistance zones, RSI condition, trend, moving-average position, volume confirmation, momentum. Every signal needs a human-readable explanation (list of reasons), and the score must never be presented as a probability of profit unless it's been statistically calibrated against real backtest results (it won't be, initially — say so in the UI).

## Phase 6 — Chart/dashboard

First real use of `lightweight-charts`. This is where the actual product UI happens — price chart, support/resistance zone overlays, signal markers, indicator panels.

## Phase 7 — Backtesting

The look-ahead-bias constraint is the hardest part: the signal engine must be called with only `bars[0..i]` visible, identically whether running live or replaying history. Don't build a second signal-computation path for backtesting — reuse Phase 5's engine directly.

## Phase 8 — Paper trading

Simulated portfolio, positions, P/L tracking. No real orders, ever, without explicit later authorization.

## Phase 9 — Alerts

Setup-detection notifications, user-configurable.

## Phase 10 — Testing, docs, polish

Final pass matching the "Definition of Done" checklist from the original spec.
