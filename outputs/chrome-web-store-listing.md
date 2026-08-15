# Orbit Watchlist Chrome Web Store listing draft

## Name

Orbit Watchlist

## Short description

Private crypto watchlists in Chrome, powered by your CoinGecko or CoinMarketCap key.

## Full description

Orbit Watchlist gives you a fast, focused market view in Chrome.

Create custom crypto lists, check USD prices, compare market cap and 24-hour change, and keep the full manager in Chrome's side panel while you browse.

### Built for quick checks

- Popup for a fast glance.
- Side panel for full list management.
- Manual sorting by saved order, name, price, market cap, or 24-hour change.
- Drag to reorder assets.
- Bulk paste import with a result for every line.
- Safe resolution for ambiguous symbols. Orbit never silently picks the wrong asset.
- Provider name, exact update time, and stale data labels.

### Local by design

- Bring your own CoinGecko or CoinMarketCap API key.
- Keys stay in the extension session.
- Optional encrypted Remember this key mode.
- No account, analytics, ads, page injection, or background polling.
- Requests run only while the popup or side panel is open.

Orbit Watchlist supports USD quotes in the first release. Alerts, charts, portfolios, and news are not included.

## Permissions explanation

Orbit uses storage for local watchlists, settings, quote cache, encrypted key ciphertext, and session-only unlocked keys. It uses sidePanel to open the watchlist manager after a user click. It asks for an optional provider API origin only after the user connects that provider.
