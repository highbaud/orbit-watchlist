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

## Provider request parameters

CoinMarketCap validates `aux` against a per-endpoint allowed list and answers HTTP 400
(`"aux" contains invalid value "..."`) for anything else. Because `classifyResponse` maps a
400 to `asset-not-found`, that failure reaches the user as "No matching asset found" and
looks like a data problem rather than a bad request. `src/lib/providers/coinmarketcap.test.ts`
pins the allowed values taken from the CoinMarketCap endpoint reference. When you add a
parameter, check it against that reference, not against what the mocked test fixture accepts.
