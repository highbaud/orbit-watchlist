import type { ResolutionResult, RuntimeRequest, RuntimeResponse, QuoteSnapshot, ProviderId } from "@/types";

function send<T>(request: RuntimeRequest): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(request, (response: T | undefined) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error(error.message));
        return;
      }
      if (!response) {
        reject(new Error("The extension did not return a response."));
        return;
      }
      resolve(response);
    });
  });
}

export async function requestQuotes(listId: string, provider: ProviderId, assetIds: string[]): Promise<QuoteSnapshot> {
  const response = await send<{ ok: true; snapshot: QuoteSnapshot } | { ok: false; error: { message: string } }>({ type: "quotes:get", listId, provider, assetIds });
  if (!response.ok) throw new Error(response.error.message);
  return response.snapshot;
}

export async function validateProviderKey(provider: ProviderId): Promise<void> {
  const response = await send<{ ok: true } | { ok: false; error: { message: string } }>({ type: "provider:validate", provider });
  if (!response.ok) throw new Error(response.error.message);
}

export async function resolveAsset(provider: ProviderId, input: string): Promise<ResolutionResult> {
  const response = await send<{ ok: true; result: ResolutionResult } | { ok: false; error: { message: string } }>({ type: "assets:resolve", provider, input });
  if (!response.ok) throw new Error(response.error.message);
  return response.result;
}

export async function openSidePanel(): Promise<void> {
  const window = await chrome.windows.getCurrent();
  if (!window.id) throw new Error("Could not find the current window.");
  await chrome.sidePanel.open({ windowId: window.id });
}
