# Orbit Watchlist handoff

State verified 2026-10-27. Short on purpose: read it in full, it takes a minute.

Rules live in `AGENTS.md`. The spec lives in `outputs/orbit-watchlist-roadmap.md`.
This file is only what you cannot get from those two or from the code.

## Where things are

| | |
|---|---|
| Repository | <https://github.com/highbaud/orbit-watchlist>, public |
| Website and policy | <https://highbaud.github.io/orbit-watchlist/>, served from `docs/` |
| Support contact | info@empyrus.net |
| Build output | `dist/`, git-ignored, rebuilt by `npm run build` |

## Status

Release 1 is built and green. It has **never run against a real provider key**.

CoinMarketCap was broken for every call until 2026-08-15 and no test caught it, because the
test fixture returned 200 whatever parameters it was sent. That is the most useful thing to
know about this codebase.

Release 2 is specified in roadmap sections 14 to 20 and **not started**. Three defects below
are open, and two of them block it.

## Commands

```bash
npm install
npm run typecheck
npm test
npm run build
```

Build generates the PNG icons, runs TypeScript, then writes the extension to `dist`. Load
that folder unpacked at `chrome://extensions`, then work through
`outputs/manual-qa-checklist.md`.

Claude never handles a provider key. The owner runs live QA.

## Three open defects, all still real on 2026-10-27

Re-checked today by grep, not by trusting this file. Each is Phase 9 in the roadmap.

1. **The light theme can never activate.** `src/styles.css` holds a full light palette behind
   `:root[data-theme="light"]`. Nothing in `src/` ever sets that attribute. Zero matches for
   `setAttribute`, `documentElement`, or `classList`. The `theme` setting is stored, exported,
   and does nothing.
2. **No schema migration.** `normalizeState` in `src/lib/storage.ts` hard-returns
   `schemaVersion: 1` and never reads the stored value. Harmless while one shape has existed.
   Adding holdings breaks every existing install. Build this first.
3. **No retry or backoff.** Zero matches for either in `src/lib/`. One 429 becomes a hard
   error, and free tiers rate-limit exactly when markets move.

## Open items and who owns them

| Item | Owner | Note |
|---|---|---|
| Chrome Web Store account | Owner | Does not exist. Needs payment details, so never Claude to do. Verification is slow, start early |
| Store screenshots and artwork | Either | Blocked on nothing but time |
| Live provider QA | Owner | One pass after release 2, with the owner own key |
| DAG wording and placement | Owner | Unfinished on purpose. DAG is in prose on the site and absent from its structured data until naming settles |
| Compliance sign-off | Owner | Claude runs `ria-compliance-review` first and hands over a report plus a safe draft |
| Chrome UI and end-to-end tests | Claude | 17 unit tests, no browser tests |

Settled questions are in roadmap section 19. Do not re-ask them.

## Gotchas that already cost time

- **CoinMarketCap rejects any `aux` value outside its own per-endpoint list, with HTTP 400.**
  Then `classifyResponse` maps 400 to `asset-not-found`, so a malformed request reaches the
  user as "No matching asset found" and reads like missing data. That is how it shipped
  broken. `coinmarketcap.test.ts` now pins the allowed values from the vendor reference.
  Check vendor docs when adding a parameter, never the mocked fixture.
- **A green `tsc` under `C:\Users\WORK` can be borrowing types it never declared.**
  TypeScript walks up for `node_modules/@types`, and `C:\Users\WORK\node_modules\@types\node`
  exists. `@types/node` was undeclared here and typecheck passed anyway until the project
  moved to `F:`. Different bug from the `tsc -b` warm-cache trap; clearing
  `node_modules/.tmp` did not reproduce it.
- **Chrome policy since 2026-08-01:** collected user data must be strictly necessary to the
  disclosed single purpose, and all collection prominently disclosed. Holdings are user data,
  so the listing has to be rewritten before that feature ships. This is also what rules out
  in-extension lead capture and click tracking, whatever the SEC rules would allow.
- **CoinGecko answers 200 with no API key**, on price, chart, and sparkline endpoints. Tested
  2026-08-16. Gating first run behind key setup is an unforced loss.
- **The Chrome Web Store is a JavaScript app.** Fetching a listing returns a shell. Use a real
  browser to read install counts, ratings, or permissions.
- **Only one `fetch` exists**, in `src/lib/providers/types.ts`. Keep it that way. It is what
  makes "holdings never leave the machine" provable rather than claimed.

## Next step

Phase 9, the three defects. All small, two block holdings, none needs a key or any owner
input. Then Phase 10, zero-key first run, which is the highest-value single change available.
