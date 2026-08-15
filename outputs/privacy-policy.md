# Orbit Watchlist privacy policy

Effective date: 2026-08-15

Orbit Watchlist is a Chrome extension for local crypto watchlists. It does not collect, sell, or share personal data.

## Data Orbit handles

Orbit handles the following data only when you choose to provide it:

- CoinGecko or CoinMarketCap API keys;
- watchlist names and provider asset IDs;
- cached market quotes and refresh times;
- your selected display and sorting settings.

Watchlists and quote caches stay in Chrome extension storage. API keys are kept in the browser session. If you enable Remember this key, Orbit encrypts the provider keys with AES-256-GCM using a passphrase-derived key before storing the ciphertext locally.

Orbit does not store the passphrase. If you lose it, the encrypted vault must be reset.

## Network requests

When the popup or side panel is open, Orbit can send requests to the provider you selected:

- CoinGecko Demo or Pro API;
- CoinMarketCap Pro API.

Requests use the API key you supplied. Orbit does not send your key to an Orbit server. Orbit has no Orbit server.

Orbit does not make market-data requests while the popup and side panel are closed. It does not run background polling.

## Permissions

- `storage`: save local settings, watchlists, cached quotes, encrypted vault ciphertext, and session-only unlocked keys.
- `sidePanel`: open the full watchlist manager in Chrome's side panel after your click.
- Optional provider host permissions: allow requests only to the provider API you connect.

Orbit does not use content scripts, browsing history, page content, tabs access, ads, analytics, tracking pixels, or cloud sync.

## Your choices

You can remove watchlists, clear cached quotes, lock keys, or reset the vault from Settings. Uninstalling the extension removes its Chrome extension storage according to Chrome's storage behavior.

## Contact

Publish a support email or project URL here before submitting the extension to the Chrome Web Store.
