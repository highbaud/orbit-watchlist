import type { CoinGeckoTier, MarketQuote, ProviderId, ResolutionResult } from "@/types";

export type ProviderContext = {
  key: string;
  coingeckoTier?: CoinGeckoTier;
};

export type ProviderErrorKind = "invalid-key" | "rate-limited" | "offline" | "provider-error" | "asset-not-found";

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;

  constructor(kind: ProviderErrorKind, message: string, status?: number) {
    super(message);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
  }
}

export interface ProviderAdapter {
  id: ProviderId;
  resolveAssets(input: string, context: ProviderContext): Promise<ResolutionResult>;
  getQuotes(ids: string[], context: ProviderContext): Promise<MarketQuote[]>;
  validateKey(context: ProviderContext): Promise<void>;
  getRefreshWindow(context: ProviderContext): number;
  getOrigin(context: ProviderContext): string;
}

export function classifyResponse(status: number): ProviderErrorKind {
  if (status === 401 || status === 403) return "invalid-key";
  if (status === 429) return "rate-limited";
  if (status >= 400 && status < 500) return "asset-not-found";
  return "provider-error";
}

export async function fetchJson<T>(url: string, init: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch {
    throw new ProviderError("offline", "The provider could not be reached.");
  }
  if (!response.ok) throw new ProviderError(classifyResponse(response.status), "The provider rejected the request.", response.status);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ProviderError("provider-error", "The provider returned an unreadable response.");
  }
}
