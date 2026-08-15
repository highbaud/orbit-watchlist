import { describe, expect, it } from "vitest";
import { markDuplicates, tokenizeImport } from "@/lib/import";
import type { ResolutionResult, Watchlist } from "@/types";

const list: Watchlist = {
  id: "list-1",
  name: "Main",
  provider: "coingecko",
  assets: [{ provider: "coingecko", id: "bitcoin", name: "Bitcoin", symbol: "BTC", addedAt: "2026-01-01T00:00:00.000Z" }],
  sort: "saved",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("import helpers", () => {
  it("splits, trims, and removes duplicate inputs", () => {
    expect(tokenizeImport(" BTC\neth,btc\n\nETH ")).toEqual(["BTC", "eth"]);
  });

  it("marks a confirmed asset that is already on the list", () => {
    const result: ResolutionResult[] = [{
      input: "bitcoin",
      status: "confirmed",
      candidates: [{ provider: "coingecko", id: "bitcoin", name: "Bitcoin", symbol: "BTC" }],
    }];
    expect(markDuplicates(result, list)[0].status).toBe("duplicate");
  });

  it("marks duplicate confirmed results that resolve to the same provider ID", () => {
    const result: ResolutionResult[] = [
      { input: "BTC", status: "confirmed", candidates: [{ provider: "coingecko", id: "bitcoin", name: "Bitcoin", symbol: "BTC" }] },
      { input: "bitcoin", status: "confirmed", candidates: [{ provider: "coingecko", id: "bitcoin", name: "Bitcoin", symbol: "BTC" }] },
    ];
    expect(markDuplicates(result, { ...list, assets: [] }).map((item) => item.status)).toEqual(["confirmed", "duplicate"]);
  });
});
