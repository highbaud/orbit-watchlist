# Orbit Watchlist implementation notes

Date: 2026-08-15

## Current state

- Workspace was empty before this task.
- The extension is now a working React, TypeScript, Vite, Tailwind, and ReUI MV3 build.
- CoinGecko Demo or Pro and current CoinMarketCap V3 quote adapters are present.
- Popup and side panel screens are present.
- Local watchlists, encrypted remember mode, session unlock, bulk import, sorting, stale states, permissions, and runtime quote fetching are present.

## Files created

- `package.json`
- `tsconfig.json`
- `tsconfig.app.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `components.json`
- `popup.html`
- `sidepanel.html`
- `public/manifest.json`
- `src/lib/utils.ts`
- `src/styles.css`

## Design decisions already applied

- Manifest V3.
- Popup plus persistent side panel.
- Minimum Chrome version 116.
- Required permissions: `storage`, `sidePanel`.
- Optional API host permissions for CoinGecko and CoinMarketCap.
- Dark graphite theme with mint accent and semantic positive or negative colors.
- No content scripts, browsing history, tabs access, ads, analytics, or page injection.

## ReUI decisions

Validated free ReUI items and install commands:

- `npx shadcn@latest add @reui/autocomplete`
- `npx shadcn@latest add @reui/sortable`
- `npx shadcn@latest add @reui/badge`
- `npx shadcn@latest add @reui/alert`

## Earlier blocker, now resolved

- `npm` and `pnpm` initially failed before producing output with Windows exit code `-1073741502`.
- The system Node command was repaired by using `C:\Program Files\nodejs\npm.cmd` directly.
- Dependencies installed successfully and `package-lock.json` is now present.

## Verification

- `npm run typecheck` passes.
- `npm test` passes with 13 tests across vault, import, sorting, refresh, and provider behavior.
- `npm run build` passes and writes the unpacked MV3 extension to `dist`.
- `npm run generate:icons` creates PNG icons in the sizes Chrome expects.
- The final manifest contains only `storage` and `sidePanel` required permissions plus optional provider origins and PNG icons.
- The service worker has no timer or background polling. Refresh timers live only in mounted popup or side panel UI.

## User-facing handoff

- Unpacked build: `dist`
- Privacy policy draft: `outputs/privacy-policy.md`
- Local privacy page: `dist/privacy.html`
- Chrome Web Store listing draft: `outputs/chrome-web-store-listing.md`
- Manual QA checklist: `outputs/manual-qa-checklist.md`

## Previous research note

- `agy.exe` exists at `C:\Users\WORK\AppData\Local\agy\bin\agy.exe`.
- Its research run could not complete because Antigravity authentication was missing and the backend was network-blocked.
- Direct web research was used instead. No `agy` output was used as evidence.
