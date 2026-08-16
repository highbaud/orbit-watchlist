# Orbit Watchlist: agent conventions

`HANDOFF.md` at the repo root is the source of truth for project state, file map, commands,
and the standing rules. Read it before making changes.

Short version of the rules that must not be broken:

- Keep provider keys out of logs, runtime responses, exports, sync, screenshots, and error text.
- Keep the manifest limited to `storage`, `sidePanel`, and the selected optional provider origins.
- No content scripts, page injection, browsing history, tabs, analytics, ads, or background polling.
- Keep each watchlist bound to one provider, and never silently choose an ambiguous symbol.
- Preserve the local-only product direction.
- Run `npm run typecheck`, `npm test`, and `npm run build` after code changes.

## Standing refusals

Permanent product rules, decided 2026-08-16 and recorded in roadmap section 15. These are
not backlog items. Do not implement any of them, and do not treat a user request that
implies one as approval to reopen it. Say that it is a standing refusal and ask.

- **No wallet connection**, seed phrase, private key, or transaction signing.
- **No wallet addresses**, including watch-only.
- **No exchange API keys**, including keys marked read-only.
- **No `chrome.storage.sync`**, for anything, ever.
- **No analytics, click tracking, or lead capture**, for DAG or anyone else.
- **No sending holdings anywhere**, including to a provider, to DAG, or to a crash reporter.

The property these protect: Orbit holds nothing that can authorize moving funds, so the
worst case of a full compromise is disclosure of self-entered numbers, never loss of assets.
Any change that weakens that property is the one change this project cannot make.

## Two invariants worth a test, not a comment

- Exactly one `fetch` exists in the codebase, in `fetchJson`. Keep it that way. It is what
  makes "holdings never leave the machine" provable instead of merely claimed.
- Holdings are encrypted at rest under the existing passphrase vault. `chrome.storage.local`
  is not encrypted by the browser.

## Provider request parameters

CoinMarketCap validates `aux` against a per-endpoint allowed list and answers HTTP 400
(`"aux" contains invalid value "..."`) for anything else. Because `classifyResponse` maps a
400 to `asset-not-found`, that failure reaches the user as "No matching asset found" and
looks like a data problem rather than a bad request. `src/lib/providers/coinmarketcap.test.ts`
pins the allowed values taken from the CoinMarketCap endpoint reference. When you add a
parameter, check it against that reference, not against what the mocked test fixture accepts.
