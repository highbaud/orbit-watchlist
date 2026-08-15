import type { MarketQuote, QuoteSort, Watchlist } from "@/types";

export function sortQuotes(list: Watchlist, quotes: Record<string, MarketQuote>): MarketQuote[] {
  const saved = new Map(list.assets.map((asset, index) => [asset.id, index]));
  return list.assets
    .map((asset) => quotes[asset.id] ?? {
      provider: list.provider,
      id: asset.id,
      name: asset.name,
      symbol: asset.symbol,
      priceUsd: Number.NaN,
      updatedAt: "",
      isStale: true,
    })
    .sort((left, right) => {
      const result = compareBy(list.sort, left, right);
      return result || (saved.get(left.id) ?? 0) - (saved.get(right.id) ?? 0);
    });
}

function compareBy(sort: QuoteSort, left: MarketQuote, right: MarketQuote): number {
  if (sort === "saved") return 0;
  if (sort === "name") return left.name.localeCompare(right.name);
  if (sort === "price") return descending(left.priceUsd, right.priceUsd);
  if (sort === "marketCap") return descending(left.marketCapUsd, right.marketCapUsd);
  return descending(left.change24h, right.change24h);
}

function descending(left: number | undefined, right: number | undefined): number {
  const leftMissing = left === undefined || Number.isNaN(left);
  const rightMissing = right === undefined || Number.isNaN(right);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing) return 1;
  if (rightMissing) return -1;
  return (right as number) - (left as number);
}
