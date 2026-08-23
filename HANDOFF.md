# Orbit Watchlist handoff

Last updated: 2026-08-16. This file is the front door. `AGENTS.md` carries the same rules
for non-Claude agents. Read one of them before changing anything.

## Project

Orbit Watchlist is a Manifest V3 Chrome extension for private crypto watchlists. A toolbar
popup for a quick price check, a Chrome side panel for managing lists. React 19, TypeScript,
Vite, Tailwind 4, ReUI.

| | |
|---|---|
| Code | `F:\Claude Code\projects\orbit-watchlist` |
| Build output | `dist/`, git-ignored, rebuilt by `npm run build` |
| Repository | <https://github.com/highbaud/orbit-watchlist>, **public** |
| Website | <https://highbaud.github.io/orbit-watchlist/>, served from `docs/` |
| Privacy policy | <https://highbaud.github.io/orbit-watchlist/privacy.html> |
| Support contact | info@empyrus.net |

## Status in one paragraph

Release 1 is built, green, and has **never been run against a real provider key**. Five
commits on `main`, all pushed, tree clean. CoinMarketCap was completely broken until
2026-08-15 and no test caught it, which is the most useful thing to know about this codebase
history. Release 2 scope is decided and specified but not started. Three known defects are
open, two of which block the release 2 work. The extension is not published, and the only
hard blocker on publishing is that no Chrome Web Store developer account exists yet.

## Commands

Run from the project directory.

```bash
npm install
npm run typecheck
npm test
npm run build
```

`npm run build` generates the PNG icons, runs TypeScript, and writes the extension to `dist`.

## Chrome test flow

1. Open `chrome://extensions`, turn on Developer mode, choose Load unpacked, select `dist`.
2. Open Orbit from the toolbar.
3. Use a real CoinGecko Demo, CoinGecko Pro, or CoinMarketCap Pro key.
4. Work through `outputs/manual-qa-checklist.md`.

**Never put a real key in source, tests, screenshots, commits, or chat.** Claude does not
handle provider keys at all. The owner runs live QA themselves.

## Important files

### App and extension

- `src/app/App.tsx` shared popup and side panel UI
- `src/background.ts` service worker: provider requests, cache, permission checks, messages
- `src/types.ts` shared app, quote, vault, and runtime types
- `public/manifest.json` MV3 permissions and entry points
- `popup.html`, `sidepanel.html` entry points
- `src/styles.css` visual tokens and layout

### Storage and security

- `src/lib/storage.ts` local app state and watchlist storage
- `src/lib/vault.ts` encrypted vault, session keys, lock, unlock, reset
- `src/lib/permissions.ts` optional provider host permissions
- `src/lib/refresh.ts` refresh-window helper

### Providers

- `src/lib/providers/types.ts` adapter contract, safe errors, and the **only `fetch` in the
  codebase**
- `src/lib/providers/coingecko.ts`, `coinmarketcap.ts`, `registry.ts`
- matching `.test.ts` files beside each adapter

### Docs and site

- `outputs/orbit-watchlist-roadmap.md` the full roadmap. Release 1 is sections 1 to 13,
  release 2 is sections 14 to 20
- `outputs/manual-qa-checklist.md`, `privacy-policy.md`, `chrome-web-store-listing.md`
- `public/privacy.html` in-extension policy page, copied into `dist`
- `docs/index.html`, `docs/privacy.html` the public GitHub Pages site
- `scripts/generate-icons.mjs` writes the PNG icons at build time

## Open defects, none fixed

All three are Phase 9 in the roadmap. Two block release 2.

1. **The light theme can never activate.** `src/styles.css` holds a complete light palette
   behind `:root[data-theme="light"]` and `:root[data-theme="system"]`. Nothing in `src/`
   ever sets that attribute: no `setAttribute`, no `documentElement`, no `classList`. The
   `theme` setting is stored and exported and does nothing. Orbit is dark for everyone.
2. **No schema migration path.** `normalizeState` hard-returns `schemaVersion: 1` and never
   reads the stored value. Harmless while only one shape has existed. The moment holdings are
   added, existing installs hold v1 data the new code misreads. Build this first.
3. **No retry or backoff anywhere.** One 429 or dropped connection becomes a hard error, and
   free tiers rate-limit exactly when markets move and everyone refreshes at once.

## Release 2, accepted and specified, not started

Manual portfolio tracking, zero-key first run, and the trust work that makes the privacy
claim checkable. Full spec in roadmap sections 14 to 20, with build phases, exit gates, and
new release gates. The accepted scope:

- manual holdings entry per asset, portfolio value, and per-token breakdown;
- **zero-key first run.** CoinGecko public tier answers 200 with no API key at all, tested
  2026-08-16. The key becomes an optional upgrade for the rate limit, not a gate before the
  first price;
- holdings protection as an **optional setting, off by default**, using the existing vault.
  With it off, holdings sit unencrypted, and the privacy page and store disclosure must say
  so. Turning it on warns first that a vault reset clears holdings to zero;
- schema v2 with a real migration, decimal-safe amount math, and a symbol-collision guard;
- a privacy blur, sparklines, and a static byline with a not-advice statement.

## Standing refusals

Permanent, in roadmap section 15 and `AGENTS.md`. Do not implement these, and do not treat a
request that implies one as approval. Say it is a standing refusal and ask.

- No wallet connection, seed phrase, private key, or transaction signing.
- No wallet addresses, including watch-only.
- No exchange API keys, including keys marked read-only.
- No `chrome.storage.sync`, for anything, ever.
- No analytics, click tracking, or lead capture.
- No sending holdings anywhere.

They protect a property, not a preference: Orbit holds nothing that can authorize moving
funds, so the worst case of a full compromise is disclosure of self-entered numbers, never
loss of an asset. Any change that weakens that is the one change this project cannot make.

## Two invariants worth a test rather than a comment

- **Exactly one `fetch` exists**, in `fetchJson`. Keep it that way. It is what makes
  "holdings never leave the machine" provable instead of asserted.
- **Nothing writes to `chrome.storage.sync`.** Assert it.

## Open items and who owns them

| Item | Owner | Note |
|---|---|---|
| Chrome Web Store developer account | Owner | Does not exist. Needs payment details, so never Claude to do. Start early, verification is slow |
| Store screenshots and artwork | Either | Blocked on nothing but time |
| Live provider QA | Owner | Deferred by decision to one pass after release 2, run with the owner own key |
| DAG wording and placement | Owner | Deliberately unfinished. DAG is in prose on the site and intentionally absent from the structured data until naming settles |
| Compliance sign-off | Owner | Claude runs `ria-compliance-review` and hands over a report plus a safe draft. The roadmap gate stays open until a person with authority signs |
| Chrome UI and end-to-end tests | Claude | 17 unit tests exist, no browser tests |

Owner decisions from the 2026-08-16 interview are logged in roadmap section 19 so nobody
re-asks them.

## Rules for the next agent

- Keep provider keys out of logs, runtime responses, exports, sync, screenshots, error text,
  commits, and chat.
- Keep the manifest limited to `storage`, `sidePanel`, and the selected optional provider
  origins. A short permission list is a product feature here, not an accident.
- No content scripts, page injection, history, tabs access, analytics, ads, or background
  polling.
- Keep each watchlist bound to one provider, and never silently resolve an ambiguous symbol.
- Run `npm run typecheck`, `npm test`, and `npm run build` after code changes.
- The pre-push refactor pass in `F:\Claude Code\.claude\docs\refactor-pass.md` is a gate
  before any push. It is hook-enforced.

## Gotchas that already cost time

- **CoinMarketCap validates `aux` per endpoint and answers HTTP 400** for anything outside
  its own list. Worse, `classifyResponse` maps a 400 to `asset-not-found`, so a malformed
  request surfaces to the user as "No matching asset found" and reads like a data problem.
  That is exactly how the adapter shipped broken. `coinmarketcap.test.ts` now pins the
  allowed values, taken from the vendor reference rather than from the adapter. When adding a
  parameter, check the vendor docs, never the mocked fixture, which returns 200 regardless.
- **A green `tsc` under `C:\Users\WORK` can be borrowing types it never declared.**
  TypeScript walks up for `node_modules/@types`, and `C:\Users\WORK\node_modules\@types\node`
  exists. `@types/node` was undeclared here and typecheck passed anyway until the project
  moved to `F:`. Verify on a different drive before trusting a green run. This is a different
  failure from the `tsc -b` warm-cache trap, since clearing `node_modules/.tmp` did not
  reproduce it.
- **Chrome policy, enforced since 2026-08-01:** collected user data must be strictly
  necessary to the extension disclosed single purpose, and all collection must be prominently
  disclosed. Holdings are user data, so the store listing has to be rewritten before that
  feature ships. This is also what rules out in-extension lead capture and click tracking,
  independently of any SEC consideration.
- **The Chrome Web Store is a JavaScript app.** Plain fetching a listing returns a shell.
  Use a real browser to read install counts, ratings, or permissions.
- **The browser pane is one shared surface.** A second session takes it, after which
  screenshots fail while `read_page` and JavaScript still work.

## Useful references

- Chrome Web Store policy updates, 2026: <https://developer.chrome.com/blog/cws-policy-updates-2026>
- Chrome user data FAQ: <https://developer.chrome.com/docs/webstore/program-policies/user-data-faq>
- Chrome extension icon requirements: <https://developer.chrome.com/docs/extensions/reference/manifest/icons>
- CoinGecko simple price: <https://docs.coingecko.com/reference/simple-price>
- CoinMarketCap endpoint reference: <https://coinmarketcap.com/api/documentation/pro-api-reference/cryptocurrency>

## Suggested next step

Phase 9, the three defects above. All are small, two block holdings, and none needs a
provider key or any owner input. After that, Phase 10 zero-key first run, which is the
highest-value single change available and also needs nothing from anyone.
