import { afterEach, describe, expect, it, vi } from "vitest";
import { coinmarketcapAdapter } from "@/lib/providers/coinmarketcap";

afterEach(() => vi.unstubAllGlobals());

// Taken from the CoinMarketCap endpoint reference, not from the adapter. The API
// answers HTTP 400 (`"aux" contains invalid value "..."`) for anything outside these,
// so an unlisted value silently breaks the endpoint against a real key.
const ALLOWED_AUX: Record<string, string[]> = {
  "/v1/cryptocurrency/map": ["platform", "first_historical_data", "last_historical_data", "is_active", "status"],
  "/v3/cryptocurrency/quotes/latest": ["price", "volume", "market_cap", "circulating_supply", "total_supply", "quote_timestamp", "is_active", "is_fiat", "search_interval"],
};

function assertAuxIsAccepted(url: string): void {
  const parsed = new URL(url);
  const endpoint = Object.keys(ALLOWED_AUX).find((path) => parsed.pathname.endsWith(path));
  expect(endpoint, `unexpected endpoint ${parsed.pathname}`).toBeDefined();
  const aux = parsed.searchParams.get("aux");
  if (aux === null) return;
  for (const value of aux.split(",")) expect(ALLOWED_AUX[endpoint!]).toContain(value);
}

describe("CoinMarketCap adapter", () => {
  it("normalizes simple price data", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ data: [{ id: 1, name: "Bitcoin", symbol: "BTC", quote: { USD: { price: 65000, market_cap: 1200000, percent_change_24h: 2.5, last_updated: "2026-01-01T00:00:00.000Z" } } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const quotes = await coinmarketcapAdapter.getQuotes(["1"], { key: "cmc-key" });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit?]>;
    expect(quotes[0]).toMatchObject({ id: "1", name: "Bitcoin", symbol: "BTC", priceUsd: 65000, marketCapUsd: 1200000, change24h: 2.5 });
    expect(calls[0][0]).toContain("/v3/cryptocurrency/quotes/latest");
    expect(calls[0][1]).toMatchObject({ headers: { "X-CMC_PRO_API_KEY": "cmc-key" } });
  });

  it("resolves a name through its slug without guessing an ambiguous symbol", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ data: [{ id: 1, name: "Bitcoin", symbol: "BTC", slug: "bitcoin", quote: { USD: { price: 65000 } } }] }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await coinmarketcapAdapter.resolveAssets("Bitcoin", { key: "cmc-key" });
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit?]>;
    expect(result.status).toBe("confirmed");
    expect(result.candidates[0]).toMatchObject({ id: "1", name: "Bitcoin", slug: "bitcoin" });
    expect(calls[0][0]).toContain("slug=bitcoin");
  });

  it("sends only aux values CoinMarketCap accepts on every endpoint it calls", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      data: [{ id: 1, name: "Bitcoin", symbol: "BTC", slug: "bitcoin", rank: 1, quote: { USD: { price: 65000 } } }],
    }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const context = { key: "cmc-key" };
    await coinmarketcapAdapter.getQuotes(["1"], context);
    await coinmarketcapAdapter.resolveAssets("bitcoin", context);
    await coinmarketcapAdapter.resolveAssets("BTC", context);
    await coinmarketcapAdapter.resolveAssets("1", context);
    const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit?]>;
    expect(calls.length).toBeGreaterThan(3);
    for (const [url] of calls) assertAuxIsAccepted(url);
  });

  it("reads the map rank that arrives without an aux value", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({
      data: [{ id: 1, name: "Bitcoin", symbol: "BTC", slug: "bitcoin", rank: 1, platform: null }],
    }), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);
    const result = await coinmarketcapAdapter.resolveAssets("BTC", { key: "cmc-key" });
    expect(result.candidates[0]).toMatchObject({ id: "1", symbol: "BTC", rank: 1 });
  });
});
