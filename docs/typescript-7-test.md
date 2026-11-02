# TypeScript 7 test (branch test/typescript-7, 2026-11-02, not for merge)

Setup: `npm install -D typescript@7.0.2` on top of main 2ef0e61 (no legacy-peer-deps). npm resolves without ERESOLVE by nesting typescript 6.0.3 under @typescript-eslint/* (peer `>=4.8.4 <6.1.0`, latest typescript-eslint 8.72.1). h3 1.15.11 / Nitro 2 and satori 0.47.1 untouched.

| Step | Result |
|---|---|
| `npm run typecheck` (`tsc --noEmit`, TS 7.0.2) | **pass**, 0 errors (needs `.nuxt` from `nuxt prepare`/build first; on a fresh clone without `.nuxt` it reports missing `~/...` modules and auto-imports, same as TS 6) |
| `vue-tsc` / `nuxi typecheck` | not run: vue-tsc is not a dependency of this repo (no new deps) |
| `npm run lint` (ESLint 10.13.0) | **fails**: `TypeError: Cannot read properties of undefined (reading 'Intrinsic')` at `ts-api-utils@2.5.0/lib/index.cjs:787`, loaded from `@typescript-eslint/typescript-estree` 8.72.1. The hoisted ts-api-utils resolves TS 7, whose `require('typescript')` exposes no JS API (2 exports, `TypeFlags` undefined). |
| `npm run test:unit` | **pass**, 539/539 |
| `npm run build` | **pass** |

Verdict: TS 7 itself checks this codebase cleanly, but lint breaks until typescript-eslint/ts-api-utils support TS 7 (or the TS 6 JS API is pinned for them side by side). The lock `typescript <7` stays on main.
