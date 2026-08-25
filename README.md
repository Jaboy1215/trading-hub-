# Trading Hub

A research and paper-trading system for stocks and crypto (including
volatile meme coins). It detects support/resistance zones and generates
explainable, rules-based trading signals — never a "guaranteed profit"
claim.

**This is a research tool. It does not connect to a brokerage and will
never place a real trade unless that's explicitly built and authorized
later.**

## Status: Phase 3 of 10 (see Development phases below)

## Stack

- **App**: TanStack Start (Vite + file-based routes + server functions)
- **Database**: SQLite via Drizzle ORM (`trading.db`, local file)
- **Market data**: [Twelve Data](https://twelvedata.com) (free tier: 800 requests/day, 8/min; covers both stocks and crypto with one API key)
- **Charting**: `lightweight-charts` (added in Phase 6)
- **Indicators**: `technicalindicators` (RSI/SMA/EMA/ATR — added in Phase 3)
- **Testing**: Vitest

## Setup

```bash
bun install
cp .env.example .env
# then add your Twelve Data API key to .env — get one free at
# https://twelvedata.com/pricing
```

## Run

```bash
bun run dev      # http://127.0.0.1:5175
bun run build
bun run test
```

## Market-data architecture

`src/lib/market-data/types.ts` defines the `MarketDataProvider` interface
(`getQuote`, `getHistoricalData`, `getVolume`, `getAssetInfo`) so the app
isn't hard-coded to one vendor. `TwelveDataProvider` is the current
implementation. Historical data is cached locally in `price_bars`
(SQLite) so reloading the dashboard or re-running a backtest doesn't
re-spend the daily request budget on data already fetched.

API keys are read server-side only (`process.env`, inside a TanStack
Start server function) and never shipped to the browser bundle.

## Technical indicators

The Phase 3 analysis endpoint derives 20-period SMA and EMA, 14-period RSI,
and 14-period ATR from cached daily bars. It reports descriptive trend and
momentum context only; indicators are not trade recommendations or guarantees.

## Jarvis cloud memory

Jarvis can persist research context in a server-only Supabase container. Apply
`supabase/migrations/20260824_create_jarvis_memory.sql` in the Supabase SQL
editor, then set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`.
Optionally set `JARVIS_MEMORY_CONTAINER` to isolate environments. The service
role key is intentionally never exposed to browser code; call
`rememberJarvisMemory` and `recallJarvisMemories` only from trusted
server-side Jarvis code.

## Development phases

This is being built in phases, each verified (tests + a real run) before
moving to the next:

1. ~~Repository audit + architecture~~
2. ~~Market-data integration~~
3. **Technical indicators** ← current
4. Support/resistance engine
5. Signal engine
6. Chart/dashboard
7. Backtesting
8. Paper trading
9. Alerts
10. Testing + documentation + polish

## Limitations

- Signals are not guarantees of any outcome.
- Historical backtests do not guarantee future performance.
- Market data can be incomplete or delayed, especially for smaller-cap
  and meme-coin assets.
- Slippage and liquidity are not modeled until the backtesting/paper
  trading phases, and even then are approximations.
- Strategies can overfit historical data — a backtest that looks good is
  not proof a strategy works going forward.
