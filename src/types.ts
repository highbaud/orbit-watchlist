export type ProviderId = "coingecko" | "coinmarketcap";
export type CoinGeckoTier = "demo" | "pro";
export type QuoteSort = "saved" | "name" | "price" | "marketCap" | "change24h";
export type ThemeMode = "system" | "dark" | "light";

export type AssetRef = {
  provider: ProviderId;
  id: string;
  name: string;
  symbol: string;
  slug?: string;
  addedAt: string;
};

export type Watchlist = {
  id: string;
  name: string;
  provider: ProviderId;
  assets: AssetRef[];
  sort: QuoteSort;
  createdAt: string;
  updatedAt: string;
};

export type MarketQuote = {
  provider: ProviderId;
  id: string;
  name: string;
  symbol: string;
  priceUsd: number;
  marketCapUsd?: number;
  change24h?: number;
  updatedAt: string;
  isStale: boolean;
};

export type RefreshErrorKind =
  | "missing-key"
  | "locked-key"
  | "permission-denied"
  | "invalid-key"
  | "rate-limited"
  | "offline"
  | "provider-error"
  | "asset-not-found";

export type RefreshError = {
  kind: RefreshErrorKind;
  message: string;
  retryAt?: string;
};

export type QuoteSnapshot = {
  provider: ProviderId;
  listId: string;
  quotes: Record<string, MarketQuote>;
  fetchedAt?: string;
  lastSuccessfulRefreshAt?: string;
  error?: RefreshError;
};

export type AppSettings = {
  schemaVersion: 1;
  activeListId: string | null;
  theme: ThemeMode;
  onboardingComplete: boolean;
  rememberKeys: boolean;
  coingeckoTier: CoinGeckoTier;
};

export type AppState = {
  schemaVersion: 1;
  settings: AppSettings;
  lists: Watchlist[];
  snapshots: Record<string, QuoteSnapshot>;
};

export type ResolutionCandidate = {
  provider: ProviderId;
  id: string;
  name: string;
  symbol: string;
  slug?: string;
  rank?: number;
};

export type ResolutionStatus = "confirmed" | "ambiguous" | "not-found" | "duplicate" | "error";

export type ResolutionResult = {
  input: string;
  status: ResolutionStatus;
  candidates: ResolutionCandidate[];
  message?: string;
};

export type AuthStatus = {
  hasRememberedVault: boolean;
  unlockedProviders: ProviderId[];
  coingeckoTier: CoinGeckoTier;
};

export type RuntimeRequest =
  | { type: "quotes:get"; listId: string; provider: ProviderId; assetIds: string[] }
  | { type: "assets:resolve"; provider: ProviderId; input: string }
  | { type: "provider:validate"; provider: ProviderId }
  | { type: "sidepanel:open"; windowId?: number };

export type RuntimeResponse =
  | { ok: true; snapshot: QuoteSnapshot }
  | { ok: true; result: ResolutionResult }
  | { ok: true }
  | { ok: false; error: RefreshError };

export const STORAGE_KEYS = {
  state: "orbit.state",
  vault: "orbit.vault",
  sessionKeys: "orbit.session.keys",
  sessionConfig: "orbit.session.config",
} as const;

export type VaultEnvelope = {
  version: 1;
  algorithm: "AES-GCM-256";
  kdf: "PBKDF2-HMAC-SHA-256";
  iterations: 600000;
  salt: string;
  iv: string;
  ciphertext: string;
};

export type VaultPayload = {
  keys: Partial<Record<ProviderId, string>>;
  coingeckoTier: CoinGeckoTier;
};

export type ProviderKeyInput = {
  provider: ProviderId;
  key: string;
  remember: boolean;
  passphrase?: string;
  coingeckoTier?: CoinGeckoTier;
};
