import type {
  AuthStatus,
  CoinGeckoTier,
  ProviderId,
  ProviderKeyInput,
  VaultEnvelope,
  VaultPayload,
} from "@/types";
import { STORAGE_KEYS } from "@/types";

const ITERATIONS = 600000;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function storage(area: "local" | "session"): chrome.storage.StorageArea {
  return area === "local" ? chrome.storage.local : chrome.storage.session;
}

function toBase64(input: Uint8Array): string {
  let binary = "";
  for (let index = 0; index < input.length; index += 1) binary += String.fromCharCode(input[index]);
  return btoa(binary);
}

function fromBase64(input: string): Uint8Array {
  const binary = atob(input);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptPayload(payload: VaultPayload, passphrase: string): Promise<VaultEnvelope> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    encoder.encode(JSON.stringify(payload)),
  );
  return {
    version: 1,
    algorithm: "AES-GCM-256",
    kdf: "PBKDF2-HMAC-SHA-256",
    iterations: ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
}

async function decryptEnvelope(envelope: VaultEnvelope, passphrase: string): Promise<VaultPayload> {
  const key = await deriveKey(passphrase, fromBase64(envelope.salt));
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64(envelope.iv) as unknown as BufferSource },
    key,
    fromBase64(envelope.ciphertext) as unknown as BufferSource,
  );
  const payload = JSON.parse(decoder.decode(plaintext)) as VaultPayload;
  if (!payload || typeof payload !== "object" || !payload.keys) throw new Error("Invalid vault");
  return payload;
}

async function readSessionPayload(): Promise<VaultPayload> {
  const stored = await storage("session").get([STORAGE_KEYS.sessionKeys, STORAGE_KEYS.sessionConfig]);
  return {
    keys: (stored[STORAGE_KEYS.sessionKeys] as Partial<Record<ProviderId, string>> | undefined) ?? {},
    coingeckoTier: (stored[STORAGE_KEYS.sessionConfig] as CoinGeckoTier | undefined) ?? "demo",
  };
}

async function writeSessionPayload(payload: VaultPayload): Promise<void> {
  await storage("session").set({
    [STORAGE_KEYS.sessionKeys]: payload.keys,
    [STORAGE_KEYS.sessionConfig]: payload.coingeckoTier,
  });
}

export async function saveProviderKey(input: ProviderKeyInput): Promise<void> {
  const key = input.key.trim();
  if (!key) throw new Error("Enter an API key.");
  const current = await readSessionPayload();
  const payload: VaultPayload = {
    keys: { ...current.keys, [input.provider]: key },
    coingeckoTier: input.coingeckoTier ?? current.coingeckoTier,
  };
  await writeSessionPayload(payload);

  if (!input.remember) {
    await storage("local").remove(STORAGE_KEYS.vault);
    return;
  }
  if (!input.passphrase?.trim()) throw new Error("Enter a passphrase to remember this key.");
  const envelope = await encryptPayload(payload, input.passphrase.trim());
  await storage("local").set({ [STORAGE_KEYS.vault]: envelope });
}

export async function removeProviderKey(provider: ProviderId, remember: boolean, passphrase?: string): Promise<void> {
  const current = await readSessionPayload();
  const keys = { ...current.keys };
  delete keys[provider];
  const payload: VaultPayload = { keys, coingeckoTier: current.coingeckoTier };
  await writeSessionPayload(payload);
  if (!remember) return;
  if (!passphrase?.trim()) {
    await storage("local").remove(STORAGE_KEYS.vault);
    return;
  }
  await storage("local").set({ [STORAGE_KEYS.vault]: await encryptPayload(payload, passphrase.trim()) });
}

export async function unlockVault(passphrase: string): Promise<AuthStatus> {
  const stored = await storage("local").get(STORAGE_KEYS.vault);
  const envelope = stored[STORAGE_KEYS.vault] as VaultEnvelope | undefined;
  if (!envelope) throw new Error("No remembered vault exists.");
  const payload = await decryptEnvelope(envelope, passphrase);
  await writeSessionPayload(payload);
  return getAuthStatus();
}

export async function lockVault(): Promise<void> {
  await storage("session").remove([STORAGE_KEYS.sessionKeys, STORAGE_KEYS.sessionConfig]);
}

export async function resetVault(): Promise<void> {
  await Promise.all([
    storage("local").remove(STORAGE_KEYS.vault),
    lockVault(),
  ]);
}

export async function getAuthStatus(): Promise<AuthStatus> {
  const [local, session] = await Promise.all([
    storage("local").get(STORAGE_KEYS.vault),
    readSessionPayload(),
  ]);
  const keys = session.keys;
  return {
    hasRememberedVault: Boolean(local[STORAGE_KEYS.vault]),
    unlockedProviders: (["coingecko", "coinmarketcap"] as ProviderId[]).filter((provider) => Boolean(keys[provider])),
    coingeckoTier: session.coingeckoTier,
  };
}

export async function getProviderKeyForRuntime(provider: ProviderId): Promise<string | null> {
  const payload = await readSessionPayload();
  return payload.keys[provider] ?? null;
}

export async function getCoinGeckoTier(): Promise<CoinGeckoTier> {
  return (await readSessionPayload()).coingeckoTier;
}
