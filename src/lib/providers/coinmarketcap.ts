import type { MarketQuote, ResolutionCandidate, ResolutionResult } from "@/types";
import type { ProviderAdapter, ProviderContext } from "@/lib/providers/types";
import { fetchJson } from "@/lib/providers/types";

const ORIGIN = "https://pro-api.coinmarketcap.com";
const MAX_CANDIDATES = 8;

type MapItem = { id: number; name: string; symbol: string; slug?: string; rank?: number };
type MapResponse = { data?: MapItem[] };
type QuoteItem = { id: number; name: string; symbol: string; slug?: string; quote?: { USD?: { price?: number; market_cap?: number; percent_change_24h?: number; last_updated?: string } } };
type QuoteResponse = { data?: QuoteItem[] };

export const coinmarketcapAdapter: ProviderAdapter = {
  id: "coinmarketcap",
  getOrigin: () => ORIGIN,
  getRefreshWindow: () => 60000,
  async resolveAssets(input, context): Promise<ResolutionResult> {
    const query = input.trim();
    if (!query) return { input, status: "not-found", candidates: [], message: "Enter a coin name, symbol, slug, or CMC ID." };
    if (looksLikeNameOrSlug(query)) {
      const slugResult = await resolveSlug(query, context);
      if (slugResult.candidates.length > 0) return slugResult;
    }
    // `aux` on /v1/cryptocurrency/map accepts only platform, first_historical_data,
    // last_historical_data, is_active and status. Any other value returns HTTP 400.
    // `rank` is part of the default map payload, so it needs no aux value.
    const params = new URLSearchParams({ aux: "platform" });
    if (/^\d+$/.test(query)) params.set("id", query);
    else params.set("symbol", query.toUpperCase());
    const response = await fetchJson<MapResponse>(`${ORIGIN}/v1/cryptocurrency/map?${params.toString()}`, {
      headers: { "X-CMC_PRO_API_KEY": context.key },
    });
    const candidates = toCandidates(response.data);
    if (candidates.length === 0) return { input, status: "not-found", candidates: [], message: "No matching asset found. Use a CMC name, slug, symbol, or ID." };
    if (candidates.length === 1) return { input, status: "confirmed", candidates };
    return { input, status: "ambiguous", candidates, message: "This symbol maps to more than one asset. Choose one." };
  },
  async getQuotes(ids, context): Promise<MarketQuote[]> {
    if (ids.length === 0) return [];
    // No `aux` here on purpose. The endpoint rejects any value outside its own list
    // (price, volume, market_cap, circulating_supply, total_supply, quote_timestamp,
    // is_active, is_fiat), and the default set already carries every field read below:
    // price and market_cap from aux defaults, percent_change_24h and last_updated
    // from the quote object itself.
    const params = new URLSearchParams({ id: ids.join(","), convert: "USD" });
    const response = await fetchJson<QuoteResponse>(`${ORIGIN}/v3/cryptocurrency/quotes/latest?${params.toString()}`, {
      headers: { "X-CMC_PRO_API_KEY": context.key },
    });
    return (response.data ?? []).flatMap((coin) => {
      const quote = coin.quote?.USD;
      if (!quote || typeof quote.price !== "number") return [];
      return [{
        provider: "coinmarketcap" as const,
        id: String(coin.id),
        name: coin.name,
        symbol: coin.symbol,
        priceUsd: quote.price,
        marketCapUsd: quote.market_cap,
        change24h: quote.percent_change_24h,
        updatedAt: quote.last_updated ?? new Date().toISOString(),
        isStale: false,
      }];
    });
  },
  async validateKey(context) {
    await coinmarketcapAdapter.getQuotes(["1"], context);
  },
};

function looksLikeNameOrSlug(value: string): boolean {
  return value.includes(" ") || value.includes("-") || (/[a-z]/.test(value) && value.length > 4);
}

// Both CoinMarketCap endpoints return the same identifying fields, so both build a
// candidate the same way. Quote items carry no rank, which leaves `rank` undefined
// exactly as it was before.
function toCandidates(items: Array<MapItem | QuoteItem> | undefined): ResolutionCandidate[] {
  return (items ?? []).slice(0, MAX_CANDIDATES).map((coin) => ({
    provider: "coinmarketcap" as const,
    id: String(coin.id),
    name: coin.name,
    symbol: coin.symbol,
    slug: coin.slug,
    rank: "rank" in coin ? coin.rank : undefined,
  }));
}

async function resolveSlug(input: string, context: ProviderContext): Promise<ResolutionResult> {
  const slug = input.trim().toLowerCase().replace(/\s+/g, "-");
  const params = new URLSearchParams({ slug, convert: "USD" });
  const response = await fetchJson<QuoteResponse>(`${ORIGIN}/v3/cryptocurrency/quotes/latest?${params.toString()}`, {
    headers: { "X-CMC_PRO_API_KEY": context.key },
  });
  const candidates = toCandidates(response.data);
  if (candidates.length === 0) return { input, status: "not-found", candidates: [], message: "No matching asset found." };
  return candidates.length === 1
    ? { input, status: "confirmed", candidates }
    : { input, status: "ambiguous", candidates, message: "Choose the exact asset before adding it." };
}
