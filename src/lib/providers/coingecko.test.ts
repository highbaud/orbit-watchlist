import { afterEach, describe, expect, it, vi } from "vitest";
import { coingeckoAdapter } from "@/lib/providers/coingecko";

afterEach(() => vi.unstubAllGlobals());

describe("CoinGecko adapter", () => {
  it("normalizes simple price data and sends the selected tier header", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ bitcoin: { usd: 65000, usd_market_cap: 1200000, usd_24h_change: 2.5, last_updated_at: 1760000000 } }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const quotes = await coingeckoAdapter.getQuotes(["bitcoin"], { key: "demo-key", coingeckoTier: "demo" });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit?]>;
    expect(quotes[0]).toMatchObject({ id: "bitcoin", priceUsd: 65000, marketCapUsd: 1200000, change24h: 2.5, isStale: false });
    expect(calls[0][0]).toContain("include_last_updated_at=true");
    expect(calls[0][1]).toMatchObject({ headers: { "x-cg-demo-api-key": "demo-key" } });
  });

  it("turns an unauthorized response into an invalid-key error", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("{}", { status: 401 }))));
    await expect(coingeckoAdapter.validateKey({ key: "bad-key", coingeckoTier: "demo" })).rejects.toMatchObject({ kind: "invalid-key" });
  });
});
