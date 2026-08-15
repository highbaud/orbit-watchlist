import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAuthStatus, lockVault, removeProviderKey, resetVault, saveProviderKey, unlockVault } from "@/lib/vault";
import { STORAGE_KEYS } from "@/types";

function createArea() {
  const data = new Map<string, unknown>();
  return {
    async get(keys: string | string[]) {
      const names = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(names.filter((key) => data.has(key)).map((key) => [key, data.get(key)]));
    },
    async set(values: Record<string, unknown>) { Object.entries(values).forEach(([key, value]) => data.set(key, value)); },
    async remove(keys: string | string[]) { (Array.isArray(keys) ? keys : [keys]).forEach((key) => data.delete(key)); },
    snapshot: () => Object.fromEntries(data.entries()),
  };
}

const local = createArea();
const session = createArea();

beforeEach(() => {
  vi.stubGlobal("chrome", { storage: { local, session } });
  void local.remove(Object.keys(local.snapshot()));
  void session.remove(Object.keys(session.snapshot()));
});

describe("encrypted vault", () => {
  it("stores ciphertext and unlocks with the correct passphrase", async () => {
    await saveProviderKey({ provider: "coingecko", key: "secret-key", remember: true, passphrase: "correct horse" });
    const stored = local.snapshot()[STORAGE_KEYS.vault] as Record<string, string>;
    expect(JSON.stringify(stored)).not.toContain("secret-key");
    expect((await getAuthStatus()).unlockedProviders).toEqual(["coingecko"]);
    await lockVault();
    expect((await getAuthStatus()).unlockedProviders).toEqual([]);
    await expect(unlockVault("wrong phrase")).rejects.toThrow();
    expect((await getAuthStatus()).unlockedProviders).toEqual([]);
    await unlockVault("correct horse");
    expect((await getAuthStatus()).unlockedProviders).toEqual(["coingecko"]);
  });

  it("resets local and session keys", async () => {
    await saveProviderKey({ provider: "coinmarketcap", key: "another-secret", remember: true, passphrase: "pass" });
    await resetVault();
    expect(local.snapshot()[STORAGE_KEYS.vault]).toBeUndefined();
    expect(session.snapshot()[STORAGE_KEYS.sessionKeys]).toBeUndefined();
    expect((await getAuthStatus()).hasRememberedVault).toBe(false);
  });

  it("removes a failed provider key without removing another remembered provider", async () => {
    await saveProviderKey({ provider: "coingecko", key: "first-secret", remember: true, passphrase: "pass" });
    await saveProviderKey({ provider: "coinmarketcap", key: "second-secret", remember: true, passphrase: "pass" });
    await removeProviderKey("coinmarketcap", true, "pass");
    expect((await getAuthStatus()).unlockedProviders).toEqual(["coingecko"]);
    await lockVault();
    await unlockVault("pass");
    expect((await getAuthStatus()).unlockedProviders).toEqual(["coingecko"]);
  });
});
