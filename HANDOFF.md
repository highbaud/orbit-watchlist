# Orbit Watchlist handoff for Claude

Date: 2026-08-15

## Project

Orbit Watchlist is a Manifest V3 Chrome extension for private crypto watchlists. It has a popup for quick checks and a side panel for list management.

The project lives at:

`F:\Claude Code\projects\orbit-watchlist`

The unpacked build is in:

`F:\Claude Code\projects\orbit-watchlist\dist`

Moved here on 2026-08-15 from `C:\Users\WORK\Documents\Codex\2026-08-15\i-w`, which was
deleted. This folder is the only copy.

## Current state

The MVP is built and passes the current checks.

- React, TypeScript, Vite, Tailwind, ReUI, and Manifest V3 are set up.
- CoinGecko Demo and Pro are supported.
- CoinMarketCap uses the current V3 quotes endpoint.
- USD quotes include price, market cap, 24-hour change, update time, and stale state.
- Watchlists are tied to one provider.
- Users can create, rename, delete, switch, sort, and reorder lists.
- Users can add assets by name, symbol, slug, or provider ID.
- Ambiguous symbols require a user choice.
- Bulk paste reports each input and removes duplicate resolved IDs.
- Popup and side panel share state through `chrome.storage.local`.
- Requests run only while the popup or side panel is open.
- Manual refresh respects the provider refresh window.
- API keys require a disclosure and consent check before entry.
- Keys are validated with the selected provider before setup completes.
- Remember mode uses AES-256-GCM with PBKDF2-HMAC-SHA-256 and 600,000 iterations.
- Decrypted keys stay in `chrome.storage.session`.
- Watchlists can be exported and imported as JSON without keys or quote snapshots.
- The extension has a local privacy page and PNG icons in the Chrome-required sizes.

## Important files

### App and extension

- `src/app/App.tsx`: shared popup and side panel UI.
- `src/background.ts`: service worker, provider requests, cache, permission checks, and runtime messages.
- `src/types.ts`: shared app, quote, vault, and runtime types.
- `public/manifest.json`: Manifest V3 permissions and entry points.
- `popup.html`: popup entry.
- `sidepanel.html`: side panel entry.
- `src/styles.css`: Orbit visual tokens and layout styles.

### Storage and security

- `src/lib/storage.ts`: local app state and watchlist storage.
- `src/lib/vault.ts`: encrypted vault, session keys, lock, unlock, reset, and failed-key cleanup.
- `src/lib/permissions.ts`: optional provider host permissions.
- `src/lib/refresh.ts`: refresh-window decision helper.

### Providers

- `src/lib/providers/types.ts`: adapter contract and safe provider errors.
- `src/lib/providers/coingecko.ts`: CoinGecko search and simple price adapter.
- `src/lib/providers/coinmarketcap.ts`: CoinMarketCap map, slug resolution, and V3 quote adapter.
- `src/lib/providers/registry.ts`: provider lookup.
- `src/lib/providers/coingecko.test.ts`: CoinGecko fixtures.
- `src/lib/providers/coinmarketcap.test.ts`: CoinMarketCap fixtures.

### Product docs

- `outputs/orbit-watchlist-roadmap.md`: detailed product and technical roadmap.
- `outputs/privacy-policy.md`: privacy policy draft.
- `outputs/chrome-web-store-listing.md`: store listing draft.
- `outputs/manual-qa-checklist.md`: Chrome test checklist.
- `public/privacy.html`: local privacy page copied into `dist`.
- `scripts/generate-icons.mjs`: creates `public/icon-16.png`, `icon-32.png`, `icon-48.png`, and `icon-128.png`.

## Commands

Run from the project directory.

```powershell
npm install
npm run typecheck
npm test
npm run build
```

`npm run build` generates the PNG icons, runs TypeScript, and writes the production extension to `dist`.

## Chrome test flow

1. Open `chrome://extensions`.
2. Turn on Developer mode.
3. Choose Load unpacked.
4. Select the `dist` folder.
5. Open Orbit from the toolbar.
6. Use a real CoinGecko Demo, CoinGecko Pro, or CoinMarketCap Pro key.
7. Run `outputs/manual-qa-checklist.md`.

Do not put real keys in source files, tests, screenshots, commits, or chat messages.

## Changes after the first handoff

Made on 2026-08-15, after the move into `F:\Claude Code\projects\orbit-watchlist`.

1. **CoinMarketCap was broken for every call.** Both CMC endpoints sent `aux` values the API
   does not accept. `/v1/cryptocurrency/map` sent `cmc_rank`, which answers HTTP 400
   (`"aux" contains invalid value "cmc_rank"`), confirmed against the live API.
   `/v3/cryptocurrency/quotes/latest` sent `percent_change_24h` and `last_updated`, which are
   also outside its allowed list. `classifyResponse` turns a 400 into `asset-not-found`, so
   the failure reached the user as "No matching asset found" and looked like a data problem.
   Map now sends `aux=platform`. Quotes and slug lookup send no `aux`, because the default
   response already carries every field the adapter reads.
2. **A regression test now pins the allowed `aux` values** per endpoint, taken from the
   CoinMarketCap reference rather than from the adapter. It fails against the old parameters.
3. **`@types/node` was missing from `devDependencies`.** `vite.config.ts` imports `node:path`
   and `node:url`, and `sortable.tsx` reads `process`. Typecheck passed at the old location
   only because `C:\Users\WORK\node_modules\@types\node` sat in a parent folder and TypeScript
   included it automatically. A clean install anywhere else failed. It is now a real
   dependency, pinned to `^24` to match the Node 24 runtime.
4. **`AGENTS.md` was created.** The first handoff told the next agent to read it, but no such
   file existed.
5. An empty stray `@/components/ui` folder from a bad path alias was deleted.

Still open and unchanged: everything under Known limits below.

## Current verification

- `npm run typecheck` passes from a cold cache on a clean `node_modules`.
- `npm test` passes with 16 tests.
- `npm run build` passes.
- The only `aux` value left in the built service worker is `aux:"platform"`.
- The final manifest has only `storage` and `sidePanel` required permissions plus optional provider origins.
- Static scans found no `console` logging, browser prompts, content scripts, history access, tabs access, alarms, or service-worker polling.

## Known limits before release

- Live provider calls and full Chrome manual QA still need a real provider key.
- The privacy page still has a support placeholder. Replace it with a real support email or project URL.
- The privacy policy needs a public URL before Chrome Web Store submission.
- Store screenshots and final store artwork still need to be created.
- There are unit and adapter tests, but no automated Chrome UI or end-to-end test suite yet.
- The extension has not been published to the Chrome Web Store.

## Rules for the next agent

- Keep provider keys out of logs, runtime responses, exports, sync, screenshots, and error text.
- Keep the manifest limited to `storage`, `sidePanel`, and the selected optional provider origins.
- Do not add content scripts, page injection, browsing history, tabs, analytics, ads, or background polling.
- Keep each watchlist bound to one provider.
- Do not silently choose an ambiguous symbol.
- Preserve the local-only product direction.
- Run `npm run typecheck`, `npm test`, and `npm run build` after code changes.
- Read `AGENTS.md` before making changes.

## Recommended next work

1. Load `dist` in Chrome and complete the manual QA checklist.
2. Test both providers with valid, invalid, offline, permission-denied, and rate-limited
   responses. CoinMarketCap has never run against a real key, so give it the closer look.
3. Replace the support placeholder and publish the privacy policy.
4. Add Chrome UI tests for setup, vault unlock, list management, bulk import, and stale states.
5. Prepare store screenshots and submit only after the privacy and permission review is complete.

## Useful official references

- [Chrome user data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- [Chrome extension icon requirements](https://developer.chrome.com/docs/extensions/reference/manifest/icons)
- [CoinGecko simple price API](https://docs.coingecko.com/reference/simple-price)
- [CoinMarketCap API documentation](https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency)
