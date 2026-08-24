// Phase 2 proof-of-life: confirms the market-data layer works end to end.
// This is NOT the dashboard (that's Phase 6) -- just enough to show a
// real quote and historical bars came back from the provider.
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import {
  getAssetInfoFn,
  getHistoricalDataFn,
  getQuoteFn,
} from "@/lib/market-data/market-data.functions";
import type { AssetClass } from "@/lib/market-data/types";

export const Route = createFileRoute("/")({
  component: HomePage,
});

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

  return (
    <main style={{ maxWidth: 640, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui" }}>
      <h1>Trading Hub</h1>
      <p style={{ color: "#666" }}>
        Phase 2 check: market-data provider (Twelve Data) end-to-end. The real dashboard comes in
        Phase 6.
      </p>

      <div style={{ display: "flex", gap: 8, marginTop: "1.5rem" }}>
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="AAPL, BTC, DOGE…"
          style={{ padding: 8, fontSize: 16 }}
        />
        <select
          value={assetClass}
          onChange={(e) => setAssetClass(e.target.value as AssetClass)}
          style={{ padding: 8, fontSize: 16 }}
        >
          <option value="stock">Stock</option>
          <option value="crypto">Crypto</option>
        </select>
        <button
          onClick={() => lookup.mutate()}
          disabled={lookup.isPending}
          style={{ padding: "8px 16px", fontSize: 16 }}
        >
          {lookup.isPending ? "Loading…" : "Look up"}
        </button>
      </div>

      {lookup.error ? (
        <p style={{ color: "#c0392b", marginTop: "1rem" }}>{(lookup.error as Error).message}</p>
      ) : null}

      {lookup.data ? (
        <div style={{ marginTop: "1.5rem" }}>
          <h2>
            {lookup.data.info.name} ({lookup.data.info.symbol})
          </h2>
          <p>
            Price: <strong>{lookup.data.quote.price}</strong>{" "}
            {lookup.data.quote.changePercent !== null
              ? `(${lookup.data.quote.changePercent.toFixed(2)}%)`
              : null}
          </p>
          <p>Exchange: {lookup.data.info.exchange ?? "—"}</p>
          <p>
            Historical bars (30d, daily): <strong>{lookup.data.bars.length}</strong>
            {lookup.data.bars.length > 0 ? (
              <>
                {" "}
                — latest close {lookup.data.bars[lookup.data.bars.length - 1]!.close} on{" "}
                {new Date(lookup.data.bars[lookup.data.bars.length - 1]!.time).toLocaleDateString()}
              </>
            ) : null}
          </p>
        </div>
      ) : null}
    </main>
  );
}
