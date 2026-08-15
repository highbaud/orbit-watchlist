import type { ProviderId } from "@/types";
import type { ProviderAdapter } from "@/lib/providers/types";
import { coingeckoAdapter } from "@/lib/providers/coingecko";
import { coinmarketcapAdapter } from "@/lib/providers/coinmarketcap";

const adapters: Record<ProviderId, ProviderAdapter> = {
  coingecko: coingeckoAdapter,
  coinmarketcap: coinmarketcapAdapter,
};

export function getProviderAdapter(provider: ProviderId): ProviderAdapter {
  return adapters[provider];
}
