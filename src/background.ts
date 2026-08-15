import type { AppState, MarketQuote, ProviderId, QuoteSnapshot, RefreshError, RuntimeRequest, RuntimeResponse, Watchlist } from "@/types";
import { readState, updateState } from "@/lib/storage";
import { getCoinGeckoTier, getProviderKeyForRuntime } from "@/lib/vault";
import { getProviderAdapter } from "@/lib/providers/registry";
import { ProviderError } from "@/lib/providers/types";
import { hasProviderPermission } from "@/lib/permissions";
import { isWithinRefreshWindow } from "@/lib/refresh";

const activeRequests = new Map<string, Promise<QuoteSnapshot>>();

chrome.runtime.onMessage.addListener((request: RuntimeRequest, sender, sendResponse: (response: RuntimeResponse) => void) => {
  void handleRequest(request, sender).then(sendResponse).catch((error: unknown) => {
    sendResponse({ ok: false, error: { kind: "provider-error", message: error instanceof Error ? error.message : "The request failed." } });
  });
  return true;
});

async function handleRequest(request: RuntimeRequest, sender: chrome.runtime.MessageSender): Promise<RuntimeResponse> {
  if (request.type === "quotes:get") {
    try {
      return { ok: true, snapshot: await getQuotes(request.listId, request.provider, request.assetIds) };
    } catch (error) {
      return { ok: false, error: toRefreshError(error) };
    }
  }
  if (request.type === "assets:resolve") {
    try {
      const key = await getProviderKeyForRuntime(request.provider);
      if (!key) return { ok: false, error: { kind: "locked-key", message: "Connect or unlock this provider first." } };
      const tier = await getCoinGeckoTier();
      const adapter = getProviderAdapter(request.provider);
      const allowed = await hasProviderPermission(request.provider, tier);
      if (!allowed) return { ok: false, error: { kind: "permission-denied", message: "Allow the provider connection in Settings first." } };
      return { ok: true, result: await adapter.resolveAssets(request.input, { key, coingeckoTier: tier }) };
    } catch (error) {
      return { ok: false, error: toRefreshError(error) };
    }
  }
  if (request.type === "provider:validate") {
    try {
      const key = await getProviderKeyForRuntime(request.provider);
      if (!key) return { ok: false, error: { kind: "locked-key", message: "Connect or unlock this provider first." } };
      const tier = await getCoinGeckoTier();
      if (!(await hasProviderPermission(request.provider, tier))) return { ok: false, error: { kind: "permission-denied", message: "Allow the provider connection in Settings first." } };
      const adapter = getProviderAdapter(request.provider);
      await adapter.validateKey({ key, coingeckoTier: tier });
      return { ok: true };
    } catch (error) {
      return { ok: false, error: toRefreshError(error) };
    }
  }
  if (request.type === "sidepanel:open") {
    const windowId = request.windowId ?? sender.tab?.windowId;
    if (windowId) await chrome.sidePanel.open({ windowId });
    return { ok: true };
  }
  return { ok: false, error: { kind: "provider-error", message: "Unknown request." } };
}

async function getQuotes(listId: string, provider: ProviderId, assetIds: string[]): Promise<QuoteSnapshot> {
  const key = `${listId}:${provider}`;
  const existingRequest = activeRequests.get(key);
  if (existingRequest) return existingRequest;
  const request = fetchQuotes(listId, provider, assetIds).finally(() => activeRequests.delete(key));
  activeRequests.set(key, request);
  return request;
}

async function fetchQuotes(listId: string, provider: ProviderId, assetIds: string[]): Promise<QuoteSnapshot> {
  const state = await readState();
  const list = state.lists.find((item) => item.id === listId);
  if (!list || list.provider !== provider) throw new Error("This watchlist is no longer available.");
  const previous = state.snapshots[listId];
  const tier = await getCoinGeckoTier();
  const adapter = getProviderAdapter(provider);
  const windowMs = adapter.getRefreshWindow({ key: "", coingeckoTier: tier });
  if (isWithinRefreshWindow(previous?.lastSuccessfulRefreshAt, Date.now(), windowMs)) return previous;
  const key = await getProviderKeyForRuntime(provider);
  if (!key) {
    const error: RefreshError = { kind: previous ? "locked-key" : "missing-key", message: previous ? "Unlock this provider to refresh prices." : "Connect this provider to load prices." };
    return saveErrorSnapshot(state, list, previous, error);
  }
  if (!(await hasProviderPermission(provider, tier))) {
    return saveErrorSnapshot(state, list, previous, { kind: "permission-denied", message: "Allow this provider in Settings to load prices." });
  }
  try {
    const quotes = await adapter.getQuotes(assetIds, { key, coingeckoTier: tier });
    const normalized = normalizeQuotes(list, quotes, previous);
    const now = new Date().toISOString();
    const snapshot: QuoteSnapshot = { provider, listId, quotes: normalized, fetchedAt: now, lastSuccessfulRefreshAt: now };
    await updateState((current) => ({ ...current, snapshots: { ...current.snapshots, [listId]: snapshot } }));
    return snapshot;
  } catch (error) {
    return saveErrorSnapshot(state, list, previous, toRefreshError(error));
  }
}

function normalizeQuotes(list: Watchlist, quotes: MarketQuote[], previous?: QuoteSnapshot): Record<string, MarketQuote> {
  const fresh = new Map(quotes.map((quote) => [quote.id, quote]));
  return Object.fromEntries(list.assets.map((asset) => {
    const quote = fresh.get(asset.id);
    if (quote) return [asset.id, { ...quote, name: asset.name, symbol: asset.symbol, isStale: false }];
    const old = previous?.quotes[asset.id];
    return [asset.id, old ? { ...old, name: asset.name, symbol: asset.symbol, isStale: true } : { provider: list.provider, id: asset.id, name: asset.name, symbol: asset.symbol, priceUsd: Number.NaN, updatedAt: new Date().toISOString(), isStale: true }];
  }));
}

async function saveErrorSnapshot(state: AppState, list: Watchlist, previous: QuoteSnapshot | undefined, error: RefreshError): Promise<QuoteSnapshot> {
  const quotes = Object.fromEntries(Object.entries(previous?.quotes ?? {}).map(([id, quote]) => [id, { ...quote, isStale: true }]));
  const snapshot: QuoteSnapshot = { provider: list.provider, listId: list.id, quotes, fetchedAt: new Date().toISOString(), lastSuccessfulRefreshAt: previous?.lastSuccessfulRefreshAt, error };
  await updateState((current) => ({ ...current, snapshots: { ...current.snapshots, [list.id]: snapshot } }));
  return snapshot;
}

function toRefreshError(error: unknown): RefreshError {
  if (error instanceof ProviderError) {
    const message = error.kind === "invalid-key"
      ? "The provider rejected this API key."
      : error.kind === "rate-limited"
        ? "The provider is rate limiting requests. Try again after the refresh window."
        : error.kind === "offline"
          ? "The provider could not be reached."
          : error.message;
    return { kind: error.kind, message };
  }
  return { kind: "provider-error", message: error instanceof Error ? error.message : "The provider request failed." };
}
