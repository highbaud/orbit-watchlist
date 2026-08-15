import type { CoinGeckoTier, ProviderId } from "@/types";

export function providerOrigin(provider: ProviderId, tier: CoinGeckoTier = "demo"): string {
  if (provider === "coinmarketcap") return "https://pro-api.coinmarketcap.com/*";
  return tier === "pro" ? "https://pro-api.coingecko.com/*" : "https://api.coingecko.com/*";
}

export async function hasProviderPermission(provider: ProviderId, tier: CoinGeckoTier = "demo"): Promise<boolean> {
  return chrome.permissions.contains({ origins: [providerOrigin(provider, tier)] });
}

export async function requestProviderPermission(provider: ProviderId, tier: CoinGeckoTier = "demo"): Promise<boolean> {
  return chrome.permissions.request({ origins: [providerOrigin(provider, tier)] });
}
