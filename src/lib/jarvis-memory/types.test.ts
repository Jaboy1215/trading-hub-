import { describe, expect, it } from "vitest";

import { jarvisMemoryInputSchema } from "./types";

describe("jarvisMemoryInputSchema", () => {
  it("supplies safe defaults for a durable memory", () => {
    expect(jarvisMemoryInputSchema.parse({ content: "Watch BTC liquidity before entering." })).toEqual({
      content: "Watch BTC liquidity before entering.",
      category: "fact",
      importance: 3,
      metadata: {},
    });
  });

  it("rejects an invalid memory category and importance", () => {
    expect(() =>
      jarvisMemoryInputSchema.parse({
        content: "Speculative trade idea",
        category: "guaranteed-profit",
        importance: 6,
      }),
    ).toThrow();
  });
});
