import { describe, expect, it } from "vitest";
import { sortQuotes } from "@/lib/sorting";
import type { MarketQuote, Watchlist } from "@/types";

const list: Watchlist = {
  id: "list-1",
  name: "Main",
  provider: "coingecko",
  assets: [
    { provider: "coingecko", id: "first", name: "First", symbol: "ONE", addedAt: "2026-01-01" },
    { provider: "coingecko", id: "second", name: "Second", symbol: "TWO", addedAt: "2026-01-01" },
    { provider: "coingecko", id: "third", name: "Third", symbol: "THREE", addedAt: "2026-01-01" },
  ],
  sort: "change24h",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const quote = (id: string, change24h?: number): MarketQuote => ({ provider: "coingecko", id, name: id, symbol: id, priceUsd: 1, change24h, updatedAt: "2026-01-01", isStale: false });

describe("quote sorting", () => {
  it("sorts metrics descending and keeps missing values last", () => {
    const sorted = sortQuotes(list, { first: quote("first", undefined), second: quote("second", 2), third: quote("third", 8) });
    expect(sorted.map((item) => item.id)).toEqual(["third", "second", "first"]);
  });

  it("uses saved order when metric values tie", () => {
    const savedList = { ...list, sort: "price" as const };
    const sorted = sortQuotes(savedList, { first: quote("first"), second: quote("second"), third: quote("third") });
    expect(sorted.map((item) => item.id)).toEqual(["first", "second", "third"]);
  });
});
