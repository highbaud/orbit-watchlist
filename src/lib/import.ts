import type { AssetRef, ResolutionResult, Watchlist } from "@/types";

export function tokenizeImport(value: string): string[] {
  const seen = new Set<string>();
  return value.split(/[\n,]/g).map((item) => item.trim()).filter((item) => {
    const key = item.toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function markDuplicates(results: ResolutionResult[], list: Watchlist): ResolutionResult[] {
  const existing = new Set(list.assets.map((asset) => asset.id));
  return results.map((result) => {
    if (result.status !== "confirmed") return result;
    const candidate = result.candidates[0];
    if (!candidate) return result;
    if (existing.has(candidate.id)) return { ...result, status: "duplicate", message: "This asset is already on the list." };
    existing.add(candidate.id);
    return result;
  });
}

export function assetFromCandidate(candidate: ResolutionResult["candidates"][number]): AssetRef {
  return {
    provider: candidate.provider,
    id: candidate.id,
    name: candidate.name,
    symbol: candidate.symbol,
    slug: candidate.slug,
    addedAt: new Date().toISOString(),
  };
}
