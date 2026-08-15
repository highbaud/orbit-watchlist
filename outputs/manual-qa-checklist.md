# Orbit Watchlist manual QA checklist

Use the unpacked build in `dist` and a test Chrome profile. A real CoinGecko Demo, CoinGecko Pro, or CoinMarketCap Pro key is required for provider checks.

## Setup and key safety

- Load `dist` at `chrome://extensions` with Developer mode enabled.
- Open the popup and confirm the first-run key disclosure appears before the key field can be used.
- Enter an invalid key and confirm the provider rejects it without completing setup.
- Enter a valid key, keep Remember this key off, close and reopen the popup, and confirm the key is locked.
- Enter a valid key with Remember this key on, unlock with the passphrase, then test a wrong passphrase.
- Reset the vault and confirm the key no longer unlocks.

## Watchlists

- Create two lists with different providers and confirm each list keeps its provider.
- Rename, switch, delete, and reorder lists.
- Add a coin by name, symbol, and provider ID.
- Use an ambiguous symbol and confirm Orbit asks for a choice.
- Bulk paste duplicates, invalid inputs, and two inputs that resolve to the same asset ID.
- Sort by saved order, name, price, market cap, and 24-hour change.

## Refresh and failure states

- Open the popup and side panel and confirm both share list changes.
- Refresh once, click Refresh again inside 60 seconds, and confirm the provider is not called twice.
- Close both UI surfaces and confirm no new provider request occurs.
- Test offline, permission denied, invalid key, rate limit, and stale quote states.
- Confirm each quote exposes the exact provider update time on hover or through assistive text.
- Watch the network panel on a CoinMarketCap list. Both `/v1/cryptocurrency/map` and
  `/v3/cryptocurrency/quotes/latest` must answer 200. A 400 with `"aux" contains invalid value`
  means a request parameter is outside the endpoint's own allowed list.
- Read the message text on a real provider failure. Orbit maps every 4xx that is not 401, 403,
  or 429 to "No matching asset found", so a malformed request looks like a missing coin.

## Backup and release checks

- Export JSON and confirm it contains no API key, vault ciphertext, or quote snapshot.
- Import the JSON and confirm it creates new lists without changing provider keys.
- Open the local privacy page from the key disclosure.
- Replace the support placeholder in the privacy page before publishing.
- Check the manifest permissions against the listing and privacy policy.
