import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CheckCircle,
  DownloadSimple,
  DotsSixVertical,
  GearSix,
  Key,
  ListBullets,
  LockKey,
  MagnifyingGlass,
  PencilSimple,
  Plus,
  ShieldCheck,
  SidebarSimple,
  Trash,
  UploadSimple,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/reui/alert";
import { Badge } from "@/components/reui/badge";
import { Autocomplete, AutocompleteContent, AutocompleteEmpty, AutocompleteInput, AutocompleteItem, AutocompleteList } from "@/components/reui/autocomplete";
import { Sortable, SortableItem, SortableItemHandle } from "@/components/reui/sortable";
import type { AppState, AssetRef, AuthStatus, CoinGeckoTier, MarketQuote, ProviderId, QuoteSort, ResolutionCandidate, ResolutionResult, Watchlist } from "@/types";
import { getActiveList, readState, updateState, createWatchlist } from "@/lib/storage";
import { assetFromCandidate, markDuplicates, tokenizeImport } from "@/lib/import";
import { requestQuotes, resolveAsset, openSidePanel, validateProviderKey } from "@/lib/chrome-runtime";
import { getAuthStatus, lockVault, removeProviderKey, resetVault, saveProviderKey, unlockVault } from "@/lib/vault";
import { hasProviderPermission, requestProviderPermission } from "@/lib/permissions";
import { sortQuotes } from "@/lib/sorting";

type ViewMode = "popup" | "sidepanel";

export function OrbitApp({ mode }: { mode: ViewMode }) {
  const [state, setState] = useState<AppState | null>(null);
  const [auth, setAuth] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    const [nextState, nextAuth] = await Promise.all([readState(), getAuthStatus()]);
    setState(nextState);
    setAuth(nextAuth);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const listener = () => { void load(); };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [load]);

  if (loading || !state || !auth) return <LoadingScreen mode={mode} />;
  if (!state.settings.onboardingComplete || state.lists.length === 0) {
    return <SetupScreen state={state} auth={auth} onComplete={load} />;
  }
  if (auth.hasRememberedVault && auth.unlockedProviders.length === 0) {
    return <UnlockScreen onUnlocked={load} onReset={async () => { await resetVault(); await load(); }} />;
  }
  if (showSettings) {
    return <SettingsScreen state={state} auth={auth} onClose={() => setShowSettings(false)} onSaved={load} />;
  }
  return <WatchlistScreen mode={mode} state={state} auth={auth} onSettings={() => setShowSettings(true)} onReload={load} />;
}

function LoadingScreen({ mode }: { mode: ViewMode }) {
  return <div className={`orbit-shell orbit-${mode}`}><div className="orbit-container space-y-4"><div className="orbit-skeleton h-5 w-28" /><div className="orbit-skeleton h-20 w-full" /><div className="orbit-skeleton h-14 w-full" /><div className="orbit-skeleton h-14 w-full" /></div></div>;
}

function SetupScreen({ state, auth, onComplete }: { state: AppState; auth: AuthStatus; onComplete: () => Promise<void> }) {
  return (
    <div className="orbit-shell orbit-panel">
      <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col justify-center px-5 py-8">
        <BrandLockup eyebrow="Private crypto watchlists" title="Your market view, one clean glance." description="Orbit keeps your lists local, refreshes only while open, and lets you bring your own CoinGecko or CoinMarketCap key." />
        <div className="mt-6 orbit-card-raised p-4"><SetupForm state={state} auth={auth} onComplete={onComplete} /></div>
        <p className="mt-4 text-center text-xs orbit-dim">No accounts. No page access. No background polling.</p>
      </div>
    </div>
  );
}

function UnlockScreen({ onUnlocked, onReset }: { onUnlocked: () => Promise<void>; onReset: () => Promise<void> }) {
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  return (
    <div className="orbit-shell orbit-panel"><div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-8">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--orbit-line)] bg-[var(--orbit-panel-raised)] text-[var(--orbit-accent)]"><LockKey size={24} weight="duotone" /></div>
      <p className="orbit-eyebrow">Vault locked</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Unlock your provider keys.</h1>
      <p className="mt-3 text-sm leading-6 orbit-muted">Your remembered keys are encrypted. Enter the passphrase you chose when you saved them.</p>
      {error && <div className="mt-4"><InlineError message={error} /></div>}
      <form className="mt-6 space-y-3" onSubmit={async (event) => { event.preventDefault(); setWorking(true); setError(""); try { await unlockVault(passphrase); await onUnlocked(); } catch { setError("That passphrase did not unlock the vault."); } finally { setWorking(false); } }}>
        <label className="orbit-label" htmlFor="unlock-passphrase">Passphrase</label>
        <input id="unlock-passphrase" className="orbit-input" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="current-password" />
        <button className="orbit-primary-button h-11 w-full" disabled={working || !passphrase}>{working ? "Unlocking..." : "Unlock vault"}</button>
      </form>
      <button className="mt-4 text-sm text-[var(--orbit-negative)] underline-offset-4 hover:underline" onClick={() => setResetOpen(true)}>Reset vault</button>
      {resetOpen && <ConfirmDialog title="Reset the vault?" description="This deletes all remembered and session provider keys. You cannot undo this." confirmLabel="Reset vault" onCancel={() => setResetOpen(false)} onConfirm={async () => { setResetOpen(false); await onReset(); }} destructive />}
    </div></div>
  );
}

function BrandLockup({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><div className="flex items-center gap-2"><div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--orbit-accent)] text-[#102116]"><ListBullets size={18} weight="bold" /></div><span className="font-semibold tracking-tight">Orbit</span></div><p className="mt-8 orbit-eyebrow">{eyebrow}</p><h1 className="mt-2 max-w-md text-4xl font-semibold leading-[1.05] tracking-[-0.04em]">{title}</h1><p className="mt-4 max-w-md text-sm leading-6 orbit-muted">{description}</p></div>;
}

function SetupForm({ state, auth, onComplete }: { state: AppState; auth: AuthStatus; onComplete: () => Promise<void> }) {
  const [provider, setProvider] = useState<ProviderId>("coingecko");
  const [tier, setTier] = useState<CoinGeckoTier>(state.settings.coingeckoTier);
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [consent, setConsent] = useState(false);
  const connected = auth.unlockedProviders.includes(provider);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true); setError("");
    try {
      if (key.trim()) {
        if (!consent) throw new Error("Confirm the key handling disclosure before entering a provider key.");
        const allowed = await requestProviderPermission(provider, tier);
        if (!allowed) throw new Error("Allow the provider connection to continue.");
        await saveProviderKey({ provider, key, remember, passphrase, coingeckoTier: tier });
        try {
          await validateProviderKey(provider);
        } catch (validationError) {
          await removeProviderKey(provider, remember, passphrase);
          throw validationError;
        }
      } else if (!connected) {
        throw new Error("Enter an API key to connect this provider.");
      }
      const next = await updateState((current) => {
        const list = current.lists[0] ?? createWatchlist("My first list", provider);
        return { ...current, lists: current.lists.length ? current.lists : [list], settings: { ...current.settings, activeListId: current.settings.activeListId ?? list.id, onboardingComplete: true, rememberKeys: remember, coingeckoTier: tier } };
      });
      void next;
      setKey(""); setPassphrase(""); await onComplete();
    } catch (caught) { setKey(""); setPassphrase(""); setError(caught instanceof Error ? caught.message : "Could not connect the provider."); } finally { setWorking(false); }
  };
  return <form className="space-y-4" onSubmit={submit}>
    <div><label className="orbit-label" htmlFor="setup-provider">Provider</label><select id="setup-provider" className="orbit-input" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)}><option value="coingecko">CoinGecko</option><option value="coinmarketcap">CoinMarketCap</option></select></div>
    {provider === "coingecko" && <div><label className="orbit-label" htmlFor="setup-tier">CoinGecko plan</label><select id="setup-tier" className="orbit-input" value={tier} onChange={(event) => setTier(event.target.value as CoinGeckoTier)}><option value="demo">Demo API</option><option value="pro">Pro API</option></select></div>}
    <KeyDisclosure id="setup-consent" checked={consent} onChange={setConsent} />
    <div><label className="orbit-label" htmlFor="setup-key">API key</label><input id="setup-key" className="orbit-input" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder={connected ? "Connected. Enter a new key to replace it." : "Paste your provider key"} autoComplete="off" disabled={!consent} aria-describedby="setup-consent" /></div>
    <label className="flex items-start gap-3 rounded-xl border border-[var(--orbit-line)] bg-[var(--orbit-panel)] p-3 text-sm"><input className="mt-0.5 accent-[var(--orbit-accent-strong)]" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><span className="block font-medium">Remember this key</span><span className="mt-1 block text-xs leading-5 orbit-muted">Off keeps the key for this browser session only. On encrypts it with a passphrase.</span></span></label>
    {remember && <div><label className="orbit-label" htmlFor="setup-passphrase">Vault passphrase</label><input id="setup-passphrase" className="orbit-input" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" placeholder="Use a passphrase you can remember" /></div>}
    {error && <InlineError message={error} />}
    <div className="flex items-center gap-2 text-xs orbit-muted"><ShieldCheck size={16} className="text-[var(--orbit-accent)]" /> The key is checked with {providerName(provider)} before it is saved.</div>
    <button className="orbit-primary-button h-11 w-full" disabled={working || (Boolean(key.trim()) && !consent)}>{working ? "Connecting..." : connected && !key ? "Use connected provider" : "Connect provider"}</button>
  </form>;
}

function SettingsScreen({ state, auth, onClose, onSaved }: { state: AppState; auth: AuthStatus; onClose: () => void; onSaved: () => Promise<void> }) {
  const [provider, setProvider] = useState<ProviderId>(getActiveList(state)?.provider ?? "coingecko");
  const [tier, setTier] = useState<CoinGeckoTier>(state.settings.coingeckoTier);
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(state.settings.rememberKeys);
  const [passphrase, setPassphrase] = useState("");
  const [unlockPhrase, setUnlockPhrase] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const [consent, setConsent] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const connected = auth.unlockedProviders.includes(provider);
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setWorking(true); setError(""); setNotice("");
    try {
      if (key.trim()) {
        if (!consent) throw new Error("Confirm the key handling disclosure before entering a provider key.");
        const allowed = await requestProviderPermission(provider, tier);
        if (!allowed) throw new Error("Allow the provider connection to continue.");
        await saveProviderKey({ provider, key, remember, passphrase, coingeckoTier: tier });
        try {
          await validateProviderKey(provider);
        } catch (validationError) {
          await removeProviderKey(provider, remember, passphrase);
          throw validationError;
        }
      } else if (!connected) {
        throw new Error("Enter an API key to connect this provider.");
      }
      await updateState((current) => ({ ...current, settings: { ...current.settings, rememberKeys: remember, coingeckoTier: tier } }));
      setKey(""); setPassphrase(""); setNotice("Provider key saved."); await onSaved();
    } catch (caught) { setKey(""); setPassphrase(""); setError(caught instanceof Error ? caught.message : "Could not save the provider key."); } finally { setWorking(false); }
  };
  return <div className="orbit-shell orbit-panel"><div className="mx-auto max-w-2xl px-5 py-5"><div className="flex items-center justify-between"><div><p className="orbit-eyebrow">Settings</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Connection and privacy</h1></div><button className="orbit-icon-button h-9 w-9" aria-label="Close settings" onClick={onClose}><X size={20} /></button></div>
    <div className="mt-6 space-y-4">
      <section className="orbit-card-raised p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--orbit-panel-soft)] text-[var(--orbit-accent)]"><Key size={18} weight="duotone" /></div><div><h2 className="font-semibold">Provider key</h2><p className="mt-1 text-xs leading-5 orbit-muted">Orbit sends requests only to the provider you connect.</p></div></div><form className="mt-4 space-y-3" onSubmit={save}><div><label className="orbit-label" htmlFor="settings-provider">Provider</label><select id="settings-provider" className="orbit-input" value={provider} onChange={(event) => setProvider(event.target.value as ProviderId)}><option value="coingecko">CoinGecko</option><option value="coinmarketcap">CoinMarketCap</option></select></div>{provider === "coingecko" && <div><label className="orbit-label" htmlFor="settings-tier">CoinGecko plan</label><select id="settings-tier" className="orbit-input" value={tier} onChange={(event) => setTier(event.target.value as CoinGeckoTier)}><option value="demo">Demo API</option><option value="pro">Pro API</option></select></div>}<p className="text-xs orbit-muted">Need a key? <a className="text-[var(--orbit-accent)] underline-offset-4 hover:underline" href={provider === "coingecko" ? "https://docs.coingecko.com/docs/setting-up-your-api-key" : "https://pro.coinmarketcap.com/api/documentation/guides/quick-start.md"} target="_blank" rel="noreferrer">Open {providerName(provider)} setup</a>.</p><KeyDisclosure id="settings-consent" checked={consent} onChange={setConsent} /><div><label className="orbit-label" htmlFor="settings-key">New API key</label><input id="settings-key" className="orbit-input" type="password" value={key} onChange={(event) => setKey(event.target.value)} placeholder={connected ? "Connected. Paste a new key to replace it." : "Paste your provider key"} autoComplete="off" disabled={!consent} aria-describedby="settings-consent" /></div><label className="flex items-start gap-3 rounded-xl border border-[var(--orbit-line)] bg-[var(--orbit-panel)] p-3 text-sm"><input className="mt-0.5 accent-[var(--orbit-accent-strong)]" type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span><span className="block font-medium">Remember this key</span><span className="mt-1 block text-xs orbit-muted">Encrypted with your passphrase before local storage.</span></span></label>{remember && <div><label className="orbit-label" htmlFor="settings-passphrase">Vault passphrase</label><input id="settings-passphrase" className="orbit-input" type="password" value={passphrase} onChange={(event) => setPassphrase(event.target.value)} autoComplete="new-password" /></div>}{error && <InlineError message={error} />}{notice && <InlineNotice message={notice} />}<button className="orbit-primary-button h-10 w-full" disabled={working || (!key && !connected) || (Boolean(key.trim()) && !consent)}>{working ? "Saving..." : "Save provider key"}</button></form></section>
      {auth.hasRememberedVault && auth.unlockedProviders.length === 0 && <section className="orbit-card-raised p-4"><h2 className="font-semibold">Unlock remembered keys</h2><p className="mt-1 text-xs orbit-muted">The encrypted vault is present for this browser profile.</p><div className="mt-3 flex gap-2"><input className="orbit-input" type="password" value={unlockPhrase} onChange={(event) => setUnlockPhrase(event.target.value)} placeholder="Vault passphrase" /><button className="orbit-secondary-button px-3" onClick={async () => { try { await unlockVault(unlockPhrase); setUnlockPhrase(""); await onSaved(); } catch { setError("That passphrase did not unlock the vault."); } }}>Unlock</button></div></section>}
      <section className="orbit-card-raised p-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Lock for now</h2><p className="mt-1 text-xs orbit-muted">Clear decrypted keys from the current browser session.</p></div><button className="orbit-secondary-button px-3 py-2" onClick={async () => { await lockVault(); await onSaved(); }}>Lock keys</button></div></section>
      <BackupTools state={state} onSaved={onSaved} />
      <section className="orbit-card-raised p-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold text-[var(--orbit-negative)]">Reset vault</h2><p className="mt-1 text-xs orbit-muted">Delete remembered and session provider keys.</p></div><button className="inline-flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--orbit-negative)_35%,transparent)] px-3 py-2 text-sm text-[var(--orbit-negative)]" onClick={() => setResetOpen(true)}><Trash size={16} /> Reset</button></div></section>
      {resetOpen && <ConfirmDialog title="Reset the vault?" description="This deletes all remembered and session provider keys. You cannot undo this." confirmLabel="Reset vault" onCancel={() => setResetOpen(false)} onConfirm={async () => { setResetOpen(false); await resetVault(); await onSaved(); }} destructive />}
      <p className="text-xs leading-5 orbit-dim">Orbit does not read page content, browsing history, tabs, or account data. It has no analytics or advertising.</p>
    </div>
  </div></div>;
}

function WatchlistScreen({ mode, state, auth, onSettings, onReload }: { mode: ViewMode; state: AppState; auth: AuthStatus; onSettings: () => void; onReload: () => Promise<void> }) {
  const active = getActiveList(state);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [showImport, setShowImport] = useState(false);
  const activeId = active?.id;
  const activeProvider = active?.provider;
  const assetIdKey = active?.assets.map((asset) => asset.id).join(",") ?? "";

  const refresh = useCallback(async () => {
    if (!activeId || !activeProvider || !assetIdKey) return;
    setRefreshing(true); setError("");
    try { await requestQuotes(activeId, activeProvider, assetIdKey.split(",")); await onReload(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not refresh prices."); await onReload(); }
    finally { setRefreshing(false); }
  }, [activeId, activeProvider, assetIdKey, onReload]);

  useEffect(() => {
    if (!activeId || !assetIdKey) return;
    void refresh();
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 60000);
    return () => window.clearInterval(timer);
  }, [activeId, assetIdKey, refresh]);

  if (!active) return null;
  const snapshot = state.snapshots[active.id];
  const quotes = sortQuotes(active, snapshot?.quotes ?? {});
  const displayed = mode === "popup" ? quotes.slice(0, 7) : quotes;
  const providerConnected = auth.unlockedProviders.includes(active.provider);
  return <div className={`orbit-shell orbit-${mode}`}><header className="orbit-container pb-2"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[var(--orbit-accent)] text-[#102116]"><ListBullets size={17} weight="bold" /></div><div className="min-w-0"><p className="orbit-eyebrow">Orbit watchlist</p><div className="mt-0.5 flex items-center gap-1"><select aria-label="Active watchlist" className="max-w-[190px] truncate bg-transparent text-sm font-semibold outline-none" value={active.id} onChange={async (event) => { await updateState((current) => ({ ...current, settings: { ...current.settings, activeListId: event.target.value } })); await onReload(); }}><option className="bg-[#151b18]" value={active.id}>{active.name}</option>{state.lists.filter((list) => list.id !== active.id).map((list) => <option className="bg-[#151b18]" key={list.id} value={list.id}>{list.name}</option>)}</select><CaretDown size={13} className="orbit-dim" /></div></div></div><div className="flex items-center gap-1"><button className="orbit-icon-button h-9 w-9" aria-label="Refresh prices. Provider refresh limits apply." disabled={refreshing || !providerConnected || active.assets.length === 0} onClick={() => void refresh()}><ArrowClockwise size={18} className={refreshing ? "animate-spin" : ""} /></button><button className="orbit-icon-button h-9 w-9" aria-label="Open settings" onClick={onSettings}><GearSix size={18} /></button></div></div></header>
    <main className="orbit-container pt-2"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><ProviderBadge provider={active.provider} /><span className="text-xs orbit-muted">{active.assets.length} {active.assets.length === 1 ? "asset" : "assets"}</span></div><span className="text-[11px] orbit-dim">{snapshot?.lastSuccessfulRefreshAt ? `Updated ${formatRelative(snapshot.lastSuccessfulRefreshAt)}` : "Not refreshed"}</span></div>
      {!providerConnected && <Alert aria-live="polite" variant="warning" className="mb-3 border-[color-mix(in_srgb,var(--orbit-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--orbit-warning)_8%,transparent)] text-[var(--orbit-warning)]"><WarningCircle size={18} /><AlertTitle>Provider locked</AlertTitle><AlertDescription className="text-[var(--orbit-muted)]">Open Settings to connect or unlock {providerName(active.provider)}.</AlertDescription></Alert>}
      {snapshot?.error && <Alert aria-live="polite" variant="warning" className="mb-3 border-[color-mix(in_srgb,var(--orbit-warning)_35%,transparent)] bg-[color-mix(in_srgb,var(--orbit-warning)_8%,transparent)] text-[var(--orbit-warning)]"><WarningCircle size={18} /><AlertTitle>{snapshot.error.message}</AlertTitle><AlertDescription className="text-[var(--orbit-muted)]">{snapshot.lastSuccessfulRefreshAt ? `Showing the last successful refresh from ${formatRelative(snapshot.lastSuccessfulRefreshAt)}.` : "No successful refresh is available yet."}</AlertDescription></Alert>}
      {error && <div className="mb-3"><InlineError message={error} /></div>}
      {active.assets.length === 0 ? <EmptyList onAdd={() => setShowImport(true)} /> : <div className="orbit-card overflow-hidden"><div className="flex items-center justify-between border-b border-[var(--orbit-line)] px-3 py-2"><div className="flex items-center gap-2"><span className="text-xs font-semibold">Market view</span><Badge className="border-[var(--orbit-line)] bg-[var(--orbit-panel-soft)] text-[var(--orbit-muted)]" radius="full">USD</Badge></div><SortSelect list={active} onSaved={onReload} /></div><div className="divide-y divide-[var(--orbit-line)]">{displayed.map((quote) => <QuoteRow key={quote.id} quote={quote} />)}</div>{mode === "popup" && quotes.length > displayed.length && <div className="border-t border-[var(--orbit-line)] px-3 py-2 text-center text-xs orbit-muted">Open the side panel to see all {quotes.length} assets.</div>}</div>}
      {mode === "sidepanel" && <Management active={active} state={state} onReload={onReload} onImport={() => setShowImport(true)} />}
      {mode === "popup" && <button className="orbit-primary-button mt-3 h-10 w-full" onClick={() => void openSidePanel()}><SidebarSimple size={17} /> Open side panel</button>}
      {mode === "sidepanel" && <div className="mt-5 flex items-center justify-between border-t border-[var(--orbit-line)] pt-3 text-[11px] orbit-dim"><span>Refreshes only while this panel is open.</span><span>{snapshot?.lastSuccessfulRefreshAt ? `Last success ${formatExact(snapshot.lastSuccessfulRefreshAt)}` : ""}</span></div>}
    </main>{showImport && <BulkImportDialog list={active} onClose={() => setShowImport(false)} onImported={async () => { setShowImport(false); await onReload(); }} />}</div>;
}

function Management({ active, state, onReload, onImport }: { active: Watchlist; state: AppState; onReload: () => Promise<void>; onImport: () => void }) {
  const [newListName, setNewListName] = useState("");
  const [newListProvider, setNewListProvider] = useState<ProviderId>(active.provider);
  const [creating, setCreating] = useState(false);
  const [renameTarget, setRenameTarget] = useState<Watchlist | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Watchlist | null>(null);
  const addList = async () => {
    const list = createWatchlist(newListName || "New list", newListProvider);
    await updateState((current) => ({ ...current, lists: [...current.lists, list], settings: { ...current.settings, activeListId: list.id } }));
    setNewListName(""); setCreating(false); await onReload();
  };
  const rename = async (name: string) => {
    if (!renameTarget || !name.trim()) return;
    await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === renameTarget.id ? { ...item, name: name.trim(), updatedAt: new Date().toISOString() } : item) }));
    setRenameTarget(null); await onReload();
  };
  const remove = async () => {
    if (!deleteTarget) return;
    await updateState((current) => {
      const lists = current.lists.filter((item) => item.id !== deleteTarget.id);
      const nextActive = current.settings.activeListId === deleteTarget.id ? lists[0]?.id ?? null : current.settings.activeListId;
      return { ...current, lists, snapshots: Object.fromEntries(Object.entries(current.snapshots).filter(([id]) => id !== deleteTarget.id)), settings: { ...current.settings, activeListId: nextActive, onboardingComplete: lists.length > 0 } };
    });
    setDeleteTarget(null); await onReload();
  };
  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div><p className="orbit-eyebrow">Manage list</p><p className="mt-1 text-xs orbit-muted">Add assets, sort the view, or drag to set saved order.</p></div>
        <button className="orbit-secondary-button px-3 py-2 text-xs" onClick={onImport}><Plus size={15} /> Bulk paste</button>
      </div>
      <div className="orbit-card-raised p-3">
        <AddAssetBox list={active} onAdded={onReload} />
        <AssetAutocomplete list={active} onAdded={onReload} />
        <AssetOrderEditor list={active} onSaved={onReload} />
        <div className="mt-4 orbit-divider pt-3">
          <p className="orbit-label">Watchlists</p>
          <div className="space-y-1">
            {state.lists.map((list) => (
              <div className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 ${list.id === active.id ? "bg-[var(--orbit-panel-soft)]" : ""}`} key={list.id}>
                <button className="min-w-0 flex-1 truncate text-left text-sm" onClick={async () => { await updateState((current) => ({ ...current, settings: { ...current.settings, activeListId: list.id } })); await onReload(); }}>
                  {list.name}<span className="ml-2 text-[10px] uppercase tracking-[0.12em] orbit-dim">{list.provider === "coingecko" ? "CG" : "CMC"}</span>
                </button>
                <button className="orbit-icon-button h-7 w-7" aria-label={`Rename ${list.name}`} onClick={() => setRenameTarget(list)}><PencilSimple size={14} /></button>
                <button className="orbit-icon-button h-7 w-7 text-[var(--orbit-negative)]" aria-label={`Delete ${list.name}`} onClick={() => setDeleteTarget(list)}><Trash size={14} /></button>
              </div>
            ))}
          </div>
          {creating ? <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto]"><input className="orbit-input h-9" value={newListName} onChange={(event) => setNewListName(event.target.value)} placeholder="List name" autoFocus /><select className="orbit-input h-9" aria-label="New list provider" value={newListProvider} onChange={(event) => setNewListProvider(event.target.value as ProviderId)}><option value="coingecko">CoinGecko</option><option value="coinmarketcap">CoinMarketCap</option></select><div className="flex gap-2 sm:col-span-2"><button className="orbit-primary-button px-3 text-xs" onClick={() => void addList()}>Create</button><button className="orbit-secondary-button px-3 text-xs" onClick={() => setCreating(false)}>Cancel</button></div></div> : <button className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-[var(--orbit-accent)]" onClick={() => { setNewListProvider(active.provider); setCreating(true); }}><Plus size={14} /> New list</button>}
        </div>
      </div>
      {renameTarget && <TextDialog title="Rename watchlist" description="Choose a short name for this list." initialValue={renameTarget.name} confirmLabel="Save name" onCancel={() => setRenameTarget(null)} onConfirm={rename} />}
      {deleteTarget && <ConfirmDialog title={`Delete ${deleteTarget.name}?`} description="This removes the list and its saved price snapshot. You cannot undo this." confirmLabel="Delete list" onCancel={() => setDeleteTarget(null)} onConfirm={remove} destructive />}
    </div>
  );
}

function AddAssetBox({ list, onAdded }: { list: Watchlist; onAdded: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ResolutionResult | null>(null);
  const [working, setWorking] = useState(false);
  const add = async (candidate: ResolutionCandidate) => { await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === list.id && !item.assets.some((asset) => asset.id === candidate.id) ? { ...item, assets: [...item.assets, assetFromCandidate(candidate)], updatedAt: new Date().toISOString() } : item) })); setInput(""); setResult(null); await onAdded(); };
  const search = async (event: React.FormEvent) => { event.preventDefault(); if (!input.trim()) return; setWorking(true); setResult(null); try { setResult(await resolveAsset(list.provider, input)); } catch (caught) { setResult({ input, status: "error", candidates: [], message: caught instanceof Error ? caught.message : "Could not resolve this asset." }); } finally { setWorking(false); } };
  return <div><div className="flex items-center justify-between"><p className="orbit-label mb-0">Add an asset</p><span className="text-[10px] orbit-dim">ID, name, or symbol</span></div><form className="mt-2 flex gap-2" onSubmit={search}><div className="relative flex-1"><MagnifyingGlass size={16} className="absolute left-3 top-1/2 -translate-y-1/2 orbit-dim" /><input className="orbit-input pl-9" value={input} onChange={(event) => setInput(event.target.value)} placeholder={list.provider === "coingecko" ? "bitcoin or BTC" : "BTC or 1"} /></div><button className="orbit-secondary-button px-3" disabled={working || !input.trim()}>{working ? "..." : "Find"}</button></form>{result && <div className="mt-3 space-y-2">{result.message && <p className="text-xs orbit-muted">{result.message}</p>}{result.candidates.map((candidate) => <button key={candidate.id} className="flex w-full items-center justify-between rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-panel)] px-3 py-2 text-left hover:bg-[var(--orbit-panel-soft)]" onClick={() => void add(candidate)}><span><span className="block text-sm font-semibold">{candidate.name}</span><span className="block text-xs orbit-muted">{candidate.symbol} · {candidate.provider === "coingecko" ? candidate.id : `CMC ${candidate.id}`}</span></span>{result.status === "confirmed" && <CheckCircle size={17} className="text-[var(--orbit-accent)]" />}</button>)}</div>}</div>;
}

function AssetAutocomplete({ list, onAdded }: { list: Watchlist; onAdded: () => Promise<void> }) {
  const [input, setInput] = useState("");
  const [candidates, setCandidates] = useState<ResolutionCandidate[]>([]);
  const [working, setWorking] = useState(false);
  const search = async () => {
    if (!input.trim()) return;
    setWorking(true);
    try {
      const result = await resolveAsset(list.provider, input);
      setCandidates(result.candidates);
    } finally {
      setWorking(false);
    }
  };
  const add = async (candidate: ResolutionCandidate) => {
    if (list.assets.some((asset) => asset.id === candidate.id)) return;
    await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === list.id ? { ...item, assets: [...item.assets, assetFromCandidate(candidate)], updatedAt: new Date().toISOString() } : item) }));
    setInput(""); setCandidates([]); await onAdded();
  };
  return <div className="mt-4 border-t border-[var(--orbit-line)] pt-3"><div className="flex items-center justify-between"><p className="orbit-label mb-0">Search suggestions</p><span className="text-[10px] orbit-dim">Type, then press Enter</span></div><Autocomplete items={candidates.map((candidate) => candidate.id)} itemToStringValue={(candidateId) => { const candidate = candidates.find((item) => item.id === candidateId); return candidate ? `${candidate.name} ${candidate.symbol}` : candidateId; }} onValueChange={(candidateId) => { const candidate = candidates.find((item) => item.id === candidateId); if (candidate) void add(candidate); }}><div className="relative mt-2"><MagnifyingGlass size={16} className="absolute left-3 top-1/2 z-10 -translate-y-1/2 orbit-dim" /><AutocompleteInput className="orbit-input pl-9" value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} placeholder="Autocomplete a coin" showClear /></div><AutocompleteContent><AutocompleteEmpty>No matching assets.</AutocompleteEmpty><AutocompleteList>{candidates.map((candidate) => <AutocompleteItem key={candidate.id} value={candidate.id}>{candidate.name} <span className="orbit-muted">({candidate.symbol})</span></AutocompleteItem>)}</AutocompleteList></AutocompleteContent></Autocomplete>{working && <p className="mt-2 text-xs orbit-muted">Searching {list.provider === "coingecko" ? "CoinGecko" : "CoinMarketCap"}...</p>}</div>;
}

function AssetOrderEditor({ list, onSaved }: { list: Watchlist; onSaved: () => Promise<void> }) {
  const reorder = async (assets: AssetRef[]) => {
    await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === list.id ? { ...item, assets, updatedAt: new Date().toISOString() } : item) }));
    await onSaved();
  };
  const remove = async (id: string) => {
    await reorder(list.assets.filter((asset) => asset.id !== id));
  };
  if (list.assets.length === 0) return null;
  return <div className="mt-4 border-t border-[var(--orbit-line)] pt-3"><div className="flex items-center justify-between"><p className="orbit-label mb-0">Saved order</p><span className="text-[10px] orbit-dim">Drag or use keyboard</span></div><Sortable value={list.assets} onValueChange={(assets) => void reorder(assets)} getItemValue={(asset) => asset.id} className="mt-2 space-y-1"><>{list.assets.map((asset) => <SortableItem key={asset.id} value={asset.id} className="flex items-center gap-2 rounded-lg border border-[var(--orbit-line)] bg-[var(--orbit-panel)] px-2 py-2"><SortableItemHandle className="text-[var(--orbit-dim)]"><DotsSixVertical size={17} /></SortableItemHandle><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{asset.name}</p><p className="text-[10px] uppercase tracking-[0.1em] orbit-dim">{asset.symbol}</p></div><button className="orbit-icon-button h-7 w-7 text-[var(--orbit-negative)]" aria-label={`Remove ${asset.name}`} onClick={() => void remove(asset.id)}><Trash size={14} /></button></SortableItem>)}</></Sortable></div>;
}

function BulkImportDialog({ list, onClose, onImported }: { list: Watchlist; onClose: () => void; onImported: () => Promise<void> }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState<ResolutionResult[]>([]);
  const [working, setWorking] = useState(false);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
  const run = async () => { const inputs = tokenizeImport(text); if (!inputs.length) return; setWorking(true); const next = await Promise.all(inputs.map(async (input) => { try { return await resolveAsset(list.provider, input); } catch (caught) { return { input, status: "error" as const, candidates: [], message: caught instanceof Error ? caught.message : "Could not resolve this asset." }; } })); setResults(markDuplicates(next, list)); setWorking(false); };
  const choose = (input: string, candidate: ResolutionCandidate) => setResults((current) => { const duplicate = list.assets.some((asset) => asset.id === candidate.id) || current.some((result) => result.input !== input && result.status === "confirmed" && result.candidates[0]?.id === candidate.id); return current.map((result) => result.input === input ? { ...result, status: duplicate ? "duplicate" : "confirmed", candidates: [candidate], message: duplicate ? "This asset is already selected in this import or list." : undefined } : result); });
  const commit = async () => { const seen = new Set(list.assets.map((asset) => asset.id)); const assets = results.filter((result) => result.status === "confirmed").map((result) => assetFromCandidate(result.candidates[0])).filter((asset) => { if (seen.has(asset.id)) return false; seen.add(asset.id); return true; }); if (!assets.length) return; await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === list.id ? { ...item, assets: [...item.assets, ...assets], updatedAt: new Date().toISOString() } : item) })); await onImported(); };
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-3 sm:items-center"><div className="orbit-card-raised max-h-[85dvh] w-full max-w-xl overflow-y-auto p-4 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="bulk-import-title"><div className="flex items-start justify-between"><div><p className="orbit-eyebrow">Bulk import</p><h2 id="bulk-import-title" className="mt-1 text-xl font-semibold">Paste a list of assets.</h2><p className="mt-1 text-xs orbit-muted">Use one symbol, name, or ID per line. Ambiguous matches need your choice.</p></div><button className="orbit-icon-button h-8 w-8" aria-label="Close import" onClick={onClose}><X size={18} /></button></div><textarea className="orbit-input mt-4 min-h-28 resize-y" value={text} onChange={(event) => setText(event.target.value)} placeholder="BTC\nETH\nsolana" /><div className="mt-3 flex gap-2"><button className="orbit-primary-button h-9 px-3 text-xs" disabled={working || !text.trim()} onClick={() => void run()}>{working ? "Checking..." : "Check assets"}</button>{results.length > 0 && <button className="orbit-secondary-button h-9 px-3 text-xs" onClick={() => void commit()}>Import confirmed</button>}</div>{results.length > 0 && <div className="mt-4 space-y-2">{results.map((result) => <div className="rounded-xl border border-[var(--orbit-line)] bg-[var(--orbit-panel)] p-3" key={result.input}><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><StatusDot status={result.status} /><span className="text-sm font-semibold">{result.input}</span></div><span className="text-[10px] uppercase tracking-[0.12em] orbit-dim">{result.status}</span></div>{result.message && <p className="mt-1 text-xs orbit-muted">{result.message}</p>}{result.status === "ambiguous" && <div className="mt-2 grid gap-1">{result.candidates.map((candidate) => <button key={candidate.id} className="rounded-lg border border-[var(--orbit-line)] px-2 py-1.5 text-left text-xs hover:bg-[var(--orbit-panel-soft)]" onClick={() => choose(result.input, candidate)}>{candidate.name} <span className="orbit-muted">({candidate.symbol})</span></button>)}</div>}{result.status === "confirmed" && result.candidates[0] && <p className="mt-1 text-xs text-[var(--orbit-accent)]">{result.candidates[0].name} ({result.candidates[0].symbol})</p>}</div>)}</div>}</div></div>;
}

function SortSelect({ list, onSaved }: { list: Watchlist; onSaved: () => Promise<void> }) {
  return <select aria-label="Sort watchlist" className="bg-transparent text-[11px] orbit-muted outline-none" value={list.sort} onChange={async (event) => { await updateState((current) => ({ ...current, lists: current.lists.map((item) => item.id === list.id ? { ...item, sort: event.target.value as QuoteSort, updatedAt: new Date().toISOString() } : item) })); await onSaved(); }}><option className="bg-[#151b18]" value="saved">Saved order</option><option className="bg-[#151b18]" value="name">Name</option><option className="bg-[#151b18]" value="price">Price</option><option className="bg-[#151b18]" value="marketCap">Market cap</option><option className="bg-[#151b18]" value="change24h">24h change</option></select>;
}

function QuoteRow({ quote }: { quote: MarketQuote }) {
  const missing = Number.isNaN(quote.priceUsd);
  return <div className={`flex items-center gap-3 px-3 py-3 ${quote.isStale ? "opacity-75" : ""}`} title={`Last updated ${formatExact(quote.updatedAt)}`} aria-label={`${quote.name} ${missing ? "price unavailable" : formatPrice(quote.priceUsd)}. Last updated ${formatExact(quote.updatedAt)}.`}><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--orbit-panel-soft)] text-xs font-bold text-[var(--orbit-accent)]">{quote.symbol.slice(0, 3)}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate text-sm font-semibold">{quote.name}</span>{quote.isStale && <Badge className="border-[color-mix(in_srgb,var(--orbit-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--orbit-warning)_8%,transparent)] text-[var(--orbit-warning)]" radius="full">Stale</Badge>}</div><span className="text-xs uppercase tracking-[0.08em] orbit-muted">{quote.symbol}</span></div><div className="text-right"><div className="orbit-number text-sm font-semibold">{missing ? "--" : formatPrice(quote.priceUsd)}</div><div className={`orbit-number text-xs font-medium ${quote.change24h === undefined ? "orbit-dim" : quote.change24h >= 0 ? "text-[var(--orbit-positive)]" : "text-[var(--orbit-negative)]"}`}>{quote.change24h === undefined ? "No 24h data" : `${quote.change24h >= 0 ? "+" : ""}${quote.change24h.toFixed(2)}%`}</div></div></div>;
}

function EmptyList({ onAdd }: { onAdd: () => void }) { return <div className="orbit-empty px-5 py-9 text-center"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--orbit-panel-soft)] text-[var(--orbit-accent)]"><MagnifyingGlass size={21} /></div><h2 className="mt-4 text-lg font-semibold">Start with a few assets.</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-5 orbit-muted">Add coins by name, symbol, or provider ID. Orbit will ask you to choose when a symbol is not unique.</p><button className="orbit-primary-button mt-5 h-10 px-4" onClick={onAdd}><Plus size={17} /> Add assets</button></div>; }

function ProviderBadge({ provider }: { provider: ProviderId }) { return <Badge className="border-[var(--orbit-line)] bg-[var(--orbit-panel-soft)] text-[var(--orbit-muted)]" radius="full">{provider === "coingecko" ? "CoinGecko" : "CoinMarketCap"}</Badge>; }
function ProviderName({ provider }: { provider: ProviderId }) { return <>{provider === "coingecko" ? "CoinGecko" : "CoinMarketCap"}</>; }
function providerName(provider: ProviderId) { return provider === "coingecko" ? "CoinGecko" : "CoinMarketCap"; }
function StatusDot({ status }: { status: ResolutionResult["status"] }) { return status === "confirmed" ? <CheckCircle size={15} className="text-[var(--orbit-accent)]" /> : status === "ambiguous" ? <WarningCircle size={15} className="text-[var(--orbit-warning)]" /> : <WarningCircle size={15} className="text-[var(--orbit-negative)]" />; }
function InlineError({ message }: { message: string }) { return <Alert aria-live="polite" variant="destructive" className="border-[color-mix(in_srgb,var(--orbit-negative)_35%,transparent)] bg-[color-mix(in_srgb,var(--orbit-negative)_8%,transparent)] text-[var(--orbit-negative)]"><WarningCircle size={17} /><AlertDescription className="text-[var(--orbit-muted)]">{message}</AlertDescription></Alert>; }
function InlineNotice({ message }: { message: string }) { return <Alert aria-live="polite" variant="success" className="border-[color-mix(in_srgb,var(--orbit-positive)_35%,transparent)] bg-[color-mix(in_srgb,var(--orbit-positive)_8%,transparent)] text-[var(--orbit-positive)]"><CheckCircle size={17} /><AlertDescription className="text-[var(--orbit-muted)]">{message}</AlertDescription></Alert>; }

function KeyDisclosure({ id, checked, onChange }: { id: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <fieldset id={id} className="rounded-xl border border-[color-mix(in_srgb,var(--orbit-accent)_35%,transparent)] bg-[color-mix(in_srgb,var(--orbit-accent)_7%,transparent)] p-3"><legend className="px-1 text-xs font-semibold text-[var(--orbit-accent)]">Before you add a key</legend><p className="text-xs leading-5 orbit-muted">Orbit sends your key only to the provider you choose to validate and load prices. The key is kept in Chrome storage, never shown in the list, and is not sent to Orbit servers. <a className="text-[var(--orbit-accent)] underline-offset-4 hover:underline" href={chrome.runtime.getURL("privacy.html")} target="_blank" rel="noreferrer">Read the privacy policy</a>.</p><label className="mt-3 flex items-start gap-2 text-xs"><input className="mt-0.5 accent-[var(--orbit-accent-strong)]" type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /><span>I understand how Orbit handles this provider key.</span></label></fieldset>;
}

function ModalFrame({ title, description, onCancel, children }: { title: string; description: string; onCancel?: () => void; children: React.ReactNode }) {
  const titleId = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-title`;
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCancel?.(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);
  return <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}><div className="orbit-card-raised w-full max-w-md p-4 shadow-2xl"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-5 orbit-muted">{description}</p>{children}</div></div>;
}

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm, destructive = false }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => Promise<void>; destructive?: boolean }) {
  const [working, setWorking] = useState(false);
  return <ModalFrame title={title} description={description} onCancel={onCancel}><div className="mt-5 flex justify-end gap-2"><button className="orbit-secondary-button px-3 py-2 text-sm" onClick={onCancel} disabled={working}>Cancel</button><button className={destructive ? "inline-flex items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--orbit-negative)_35%,transparent)] px-3 py-2 text-sm font-semibold text-[var(--orbit-negative)]" : "orbit-primary-button px-3 py-2 text-sm"} onClick={async () => { setWorking(true); try { await onConfirm(); } finally { setWorking(false); } }} disabled={working} autoFocus>{working ? "Working..." : confirmLabel}</button></div></ModalFrame>;
}

function TextDialog({ title, description, initialValue, confirmLabel, onCancel, onConfirm }: { title: string; description: string; initialValue: string; confirmLabel: string; onCancel: () => void; onConfirm: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(initialValue);
  const [working, setWorking] = useState(false);
  return <ModalFrame title={title} description={description} onCancel={onCancel}><label className="orbit-label mt-4" htmlFor="orbit-text-dialog-input">Name</label><input id="orbit-text-dialog-input" className="orbit-input" value={value} onChange={(event) => setValue(event.target.value)} autoFocus /><div className="mt-5 flex justify-end gap-2"><button className="orbit-secondary-button px-3 py-2 text-sm" onClick={onCancel} disabled={working}>Cancel</button><button className="orbit-primary-button px-3 py-2 text-sm" onClick={async () => { setWorking(true); try { await onConfirm(value); } finally { setWorking(false); } }} disabled={working || !value.trim()}>{working ? "Saving..." : confirmLabel}</button></div></ModalFrame>;
}

function BackupTools({ state, onSaved }: { state: AppState; onSaved: () => Promise<void> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const exportLists = () => {
    const payload = { version: 1, exportedAt: new Date().toISOString(), settings: { theme: state.settings.theme, coingeckoTier: state.settings.coingeckoTier }, lists: state.lists };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `orbit-watchlists-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setError(""); setNotice("Watchlists exported. Provider keys were not included.");
  };
  const importLists = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      if (!parsed || typeof parsed !== "object") throw new Error("The backup file is not valid JSON.");
      const source = parsed as { lists?: unknown };
      const sourceLists = Array.isArray(source.lists) ? source.lists.filter(isBackupWatchlist) : [];
      if (sourceLists.length === 0) throw new Error("No valid watchlists were found in this file.");
      const now = new Date().toISOString();
      const imported = sourceLists.map((list) => ({ ...list, id: crypto.randomUUID(), name: `${list.name} (imported)`, createdAt: now, updatedAt: now, assets: list.assets.map((asset) => ({ ...asset, addedAt: now })) }));
      await updateState((current) => ({ ...current, lists: [...current.lists, ...imported], settings: { ...current.settings, activeListId: imported[0].id } }));
      setError(""); setNotice(`Imported ${imported.length} watchlist${imported.length === 1 ? "" : "s"}. Provider keys were not changed.`);
      await onSaved();
    } catch (caught) {
      setNotice(""); setError(caught instanceof Error ? caught.message : "Could not import this backup.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };
  return <section className="orbit-card-raised p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--orbit-panel-soft)] text-[var(--orbit-accent)]"><DownloadSimple size={18} weight="duotone" /></div><div><h2 className="font-semibold">Backup watchlists</h2><p className="mt-1 text-xs leading-5 orbit-muted">Export or import list names, providers, and saved assets. Keys and price snapshots stay out of the file.</p></div></div><div className="mt-4 flex flex-wrap gap-2"><button className="orbit-secondary-button px-3 py-2 text-sm" onClick={exportLists}><DownloadSimple size={16} /> Export JSON</button><button className="orbit-secondary-button px-3 py-2 text-sm" onClick={() => fileInput.current?.click()}><UploadSimple size={16} /> Import JSON</button><input ref={fileInput} className="hidden" type="file" accept="application/json,.json" onChange={(event) => void importLists(event.target.files?.[0])} /></div>{error && <div className="mt-3"><InlineError message={error} /></div>}{notice && <div className="mt-3"><InlineNotice message={notice} /></div>}</section>;
}

function isBackupWatchlist(value: unknown): value is Watchlist {
  if (!value || typeof value !== "object") return false;
  const list = value as Partial<Watchlist>;
  const provider = list.provider;
  return typeof list.name === "string" && isProviderId(provider) && isQuoteSort(list.sort) && Array.isArray(list.assets) && list.assets.every((asset) => isBackupAsset(asset, provider));
}

function isBackupAsset(value: unknown, provider: ProviderId): value is AssetRef {
  if (!value || typeof value !== "object") return false;
  const asset = value as Partial<AssetRef>;
  return asset.provider === provider && typeof asset.id === "string" && typeof asset.name === "string" && typeof asset.symbol === "string";
}

function isProviderId(value: unknown): value is ProviderId { return value === "coingecko" || value === "coinmarketcap"; }
function isQuoteSort(value: unknown): value is QuoteSort { return value === "saved" || value === "name" || value === "price" || value === "marketCap" || value === "change24h"; }
function formatPrice(value: number): string { return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: value >= 1 ? 2 : 8 }).format(value); }
function formatRelative(value: string): string { const seconds = Math.max(0, Math.round((Date.now() - Date.parse(value)) / 1000)); if (seconds < 60) return "just now"; const minutes = Math.round(seconds / 60); if (minutes < 60) return `${minutes}m ago`; const hours = Math.round(minutes / 60); return `${hours}h ago`; }
function formatExact(value: string): string { return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
