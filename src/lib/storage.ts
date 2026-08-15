import type { AppSettings, AppState, QuoteSnapshot, Watchlist } from "@/types";
import { STORAGE_KEYS } from "@/types";

const defaultSettings: AppSettings = {
  schemaVersion: 1,
  activeListId: null,
  theme: "system",
  onboardingComplete: false,
  rememberKeys: false,
  coingeckoTier: "demo",
};

export function createDefaultState(): AppState {
  return { schemaVersion: 1, settings: { ...defaultSettings }, lists: [], snapshots: {} };
}

function getLocalStorage(): chrome.storage.StorageArea {
  return chrome.storage.local;
}

function normalizeState(value: unknown): AppState {
  if (!value || typeof value !== "object") return createDefaultState();
  const source = value as Partial<AppState>;
  const settings = { ...defaultSettings, ...(source.settings ?? {}) } as AppSettings;
  const lists = Array.isArray(source.lists) ? (source.lists as Watchlist[]) : [];
  const snapshots = source.snapshots && typeof source.snapshots === "object"
    ? (source.snapshots as Record<string, QuoteSnapshot>)
    : {};
  const activeListId = lists.some((list) => list.id === settings.activeListId)
    ? settings.activeListId
    : lists[0]?.id ?? null;
  return { schemaVersion: 1, settings: { ...settings, activeListId }, lists, snapshots };
}

export async function readState(): Promise<AppState> {
  const stored = await getLocalStorage().get(STORAGE_KEYS.state);
  return normalizeState(stored[STORAGE_KEYS.state]);
}

export async function writeState(state: AppState): Promise<void> {
  await getLocalStorage().set({ [STORAGE_KEYS.state]: state });
}

export async function updateState(update: (state: AppState) => AppState): Promise<AppState> {
  const next = update(await readState());
  await writeState(next);
  return next;
}

export function createWatchlist(name: string, provider: Watchlist["provider"]): Watchlist {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "My watchlist",
    provider,
    assets: [],
    sort: "saved",
    createdAt: now,
    updatedAt: now,
  };
}

export function getActiveList(state: AppState): Watchlist | null {
  return state.lists.find((list) => list.id === state.settings.activeListId) ?? state.lists[0] ?? null;
}

export async function ensureInitialList(provider: Watchlist["provider"] = "coingecko"): Promise<AppState> {
  return updateState((state) => {
    if (state.lists.length > 0) return state;
    const list = createWatchlist("My first list", provider);
    return { ...state, lists: [list], settings: { ...state.settings, activeListId: list.id } };
  });
}
