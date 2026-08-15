import type { MarketQuote, ResolutionResult } from "@/types";
import type { ProviderAdapter, ProviderContext } from "@/lib/providers/types";
import { fetchJson } from "@/lib/providers/types";

type SearchResponse = { coins?: Array<{ id: string; name: string; symbol: string; market_cap_rank?: number; thumb?: string }> };
type PriceResponse = Record<string, { usd?: number; usd_market_cap?: number; usd_24h_change?: number; last_updated_at?: number }>;

export const coingeckoAdapter: ProviderAdapter = {
  id: "coingecko",
  getOrigin: (context) => context.coingeckoTier === "pro" ? "https://pro-api.coingecko.com" : "https://api.coingecko.com",
  getRefreshWindow: (context) => context.coingeckoTier === "pro" ? 60000 : 60000,
  async validateKey(context) {
    await coingeckoAdapter.getQuotes(["bitcoin"], context);
  },
  async resolveAssets(input, context): Promise<ResolutionResult> {
    const query = input.trim();
    if (!query) return { input, status: "not-found", candidates: [], message: "Enter a coin name or symbol." };
    const base = context.coingeckoTier === "pro" ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
    const response = await fetchJson<SearchResponse>(`${base}/search?query=${encodeURIComponent(query)}`, {
      headers: context.coingeckoTier === "pro" ? { "x-cg-pro-api-key": context.key } : { "x-cg-demo-api-key": context.key },
    });
    const candidates = (response.coins ?? []).slice(0, 8).map((coin) => ({
      provider: "coingecko" as const,
      id: coin.id,
      name: coin.name,
      symbol: coin.symbol.toUpperCase(),
      rank: coin.market_cap_rank,
    }));
    if (candidates.length === 0) return { input, status: "not-found", candidates: [], message: "No matching assets found." };
    const normalized = query.toLowerCase();
    const exact = candidates.filter((candidate) => candidate.id.toLowerCase() === normalized || candidate.symbol.toLowerCase() === normalized || candidate.name.toLowerCase() === normalized);
    if (exact.length === 1) return { input, status: "confirmed", candidates: exact };
    return { input, status: "ambiguous", candidates, message: "Choose the exact asset before adding it." };
  },
  async getQuotes(ids, context): Promise<MarketQuote[]> {
    if (ids.length === 0) return [];
    const base = context.coingeckoTier === "pro" ? "https://pro-api.coingecko.com/api/v3" : "https://api.coingecko.com/api/v3";
    const params = new URLSearchParams({
      ids: ids.join(","),
      vs_currencies: "usd",
      include_market_cap: "true",
      include_24hr_change: "true",
      include_last_updated_at: "true",
    });
    const response = await fetchJson<PriceResponse>(`${base}/simple/price?${params.toString()}`, {
      headers: context.coingeckoTier === "pro" ? { "x-cg-pro-api-key": context.key } : { "x-cg-demo-api-key": context.key },
    });
    return Object.entries(response).flatMap(([id, price]) => {
      if (typeof price.usd !== "number") return [];
      return [{
        provider: "coingecko" as const,
        id,
        name: id,
        symbol: id,
        priceUsd: price.usd,
        marketCapUsd: price.usd_market_cap,
        change24h: price.usd_24h_change,
        updatedAt: new Date((price.last_updated_at ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
        isStale: false,
      }];
    });
  },
};
