# Continuation prompt — Trading Hub Phase 3

Paste this into GitHub Copilot, a fresh Claude Code session, or any coding agent to pick up Phase 3. Read `README.md` and `docs/PHASE_STATUS.md` first — this prompt assumes both.

---

You're continuing a phased build of a stocks/crypto research and paper-trading system (NOT a real-money trading system — never connect to a brokerage or place real trades unless explicitly asked to later). Read `README.md` and `docs/PHASE_STATUS.md` before writing any code — they document the stack decisions already locked in, what Phase 2 built, and exactly what Phase 3 needs to produce.

Do Phase 3 only (technical indicators) — don't jump ahead to support/resistance or signals, those are separate phases with their own review points.

Build `src/lib/indicators/`:
- RSI, SMA, EMA, ATR wrapping the already-installed `technicalindicators` npm package
- Volume analysis: rolling average + spike detection
- Each function takes `Bar[]` (the type already defined in `src/lib/market-data/types.ts`) and returns an aligned array — `null` for any bar in the indicator's warm-up period, never a silently-dropped bar
- Unit tests with a hand-computed reference series (Vitest, matching the style already in `src/lib/market-data/twelve-data.provider.test.ts`) — don't just assert "returns a number", assert the actual expected value for at least one known series

Before considering this done:
- `bun run test` — all passing, including new indicator tests
- `bunx tsc --noEmit` — clean
- `bun run build` — clean
- Do NOT touch `src/lib/market-data/` (Phase 2, already verified) or start on support/resistance (Phase 4) — stay scoped to indicators only

Report back: what you built, test results, and what's left before Phase 4 can start.
