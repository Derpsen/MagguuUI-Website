# Repository Memory

## Overview

- Project: `MagguuUI-Website`
- Stack: Nuxt 4 (lock 4.6.2 since 2026-10-16), Vue 3.5, TypeScript 6, Nuxt UI 4.12, Tailwind CSS 4.3 (CSS-first), Drizzle 0.45, SQLite via `better-sqlite3` 13 (WAL, busy_timeout=5000), Node 26 (since 2026-10-16), nuxt-og-image 7 with Takumi (`@takumi-rs/core`, native glibc/musl binaries). Validation: Zod. Lint: Nuxt ESLint Flat Config (no separate Prettier).
- Deployment: Docker on Unraid — image built by `.github/workflows/docker.yml` and published to GHCR; Unraid `update_container MagguuUI`. Live 2026-09-11: homepage catalog-summary + admin-only ECharts. GitHub sync reads MagguuUI_Data/AddOns + Classes.
- Repo contains the public website, admin panel, and Nitro/API backend in one app

## Agent / Buddy ops

- Entrypoint: `AGENTS.md` → this file (ops history).
- Buddy is the single front door; helpers report to Buddy. Clear in-scope fixes
  may push/merge to main under the hub standing order; no force-push; tags need
  an explicit release ask.
- Production: Unraid container `MagguuUI` / image `ghcr.io/derpsen/magguuui-website`;
  `ui.magguu.xyz` → `http://192.168.178.21:3000` (`br0`). Transient 500 after
  deploy is possible — recheck.
- `error.vue` Home → `/` only (never `/home`).
- CodeQL `init` and `analyze` must share one commit pin.

## 2026-11-12 Meta deadline partial (follow-up to live fire 2)

- Live fire 2 after #197 (digest `447a6177`, health SHA `5f0cd16`) hit the 45 min job deadline with heap fine (~77 MB / 256) and `specsWithData=0`. After the ingest warning (~1.5 min, kept 30 313), ~43 min of 2–8 % CPU (serial profile GETs, not a hang) and no logs. Assemble/promote ran only after every spec, so a deadline left `/meta` empty and the CLI exited 1.
- Fix (branch `fix/meta-deadline-partial`): intra-spec concurrency under the ≤ 40 rps gate, stop at `samplePerSpec` / `maxAttemptsPerSpec`, progress logs per spec and every 50 calls, incremental promote of a growing snapshot only when last-good is empty, and a deadline with at least one finished spec returns `partial` (exit 3) unless last-good covers more. A deadline with 0 specs stays `error`. External abort mid spec/icon still does not promote.
- Mutation count will be recorded from a full `python3 scripts/mutation/check.py` SCORE after this review (previous full local run on 25c20e1 was 131/131 killed by assertion/timeout, with 5 NOT-APPLIED stale anchors and 3 not run due to the 1200s total deadline; do not claim "all killed" from a partial slice). First-partial without last-good may publish (marked `freshness.partial`) even when the 429-rate gate fails, if each published spec is n≥50; once last-good exists, quality gates still apply. Also covered: deadline policy, tripAbort reason, in-flight 429 debounce, recovery at 79, predecessor rollback, store share clamp.
- A full local real-EU-API sync on 12 Nov 2026 (17:07–17:21 Europe/Berlin, `data/magguuui.db`, no Unraid) finished all 40 specs in 810 s, 31 800 calls, 0× 429, ~39 rps, ~127 MB heap / 512 MB cap, then failed to promote: `Meta snapshot payload failed validation`. Combined ring/trinket/embellishment counts can exceed the profile total (two slots), so `share` was > 1 and `parseMetaSnapshotPayload` rejected the whole snapshot. Last-good stayed the local fixture. Fix: clamp gear `share` to 1 in `toGear`.
- A second full local run after that clamp (17:23–17:54 Europe/Berlin, 1 845 s, ~40 300 calls, 0× 429, all 40 specs, slower ~22 rps) still failed the same opaque validation error, so the reason was not only unclamped share. Follow-up: `explainMetaSnapshotRejection` is included in the store error; `selectMetaPeriods` always includes the current period; `buildClassSummaries` drops leaderboard specs that are not in the catalog.
- A third full local run (18:00–18:43 Europe/Berlin, 2 557 s, ~45 700 calls, 0× 429, all 40 specs, ~18 rps, ~136 MB heap / 512) failed promote with `classes.paladin/retribution.heroSplit[0].share is 1.414`. Two active loadouts on the same hero tree were counted twice. Fix: count each hero id once per profile, clamp `shareOf` to [0, 1], and clamp every share field just before parse.
- A fourth full local EU run (18:47:49–19:32:58 Europe/Berlin, 2 702 711 ms, last progress 45 814 calls, `meta_runs` 45 819 / 15 434 HTTP 429s, all 40 specs, 8 562 profiles, ~154 MB heap / 512 MB local `NODE_OPTIONS` — not the prod CLI 256 MB cap) hit the 45 min deadline after every spec was sampled and published a **partial** snapshot (exit 3, snapshot_id 2, season 18 period 1089). The 15k 429s were a stampede: a waiter that had already reserved a rate-gate slot could still fire during a `Retry-After` pause. Fix: re-check `nextSlot` after every sleep, default concurrency 16→8, and adapt rps (halve on 429, floor 8, recover after 80 clean calls). Do not spend another full 45 min real-API run on this; a quiet pull at 30–40 rps should finish in ~15–20 min (run 1 was 13.5 min / 31.8k calls / 0× 429).
- Code-review #200: deadline partials now go through `evaluateMetaRunPolicy` plus a per-spec sample floor (39×200 last-good beats 40×1). Mid-run promotes are gone (one gated `ok` row + purge at end/deadline, `partialOutcome` distinguishes published vs kept last-good). Rollback skips thinner intermediates. 429 waves debounce `noteThrottle`, sleeps are deadline-aware, `tripAbort` forwards the reason.
- Bounded real-EU-API repro (`tools/meta-profile-repro.ts`, source `buddy-secrets/blizzard.env` into the env, never print/log/commit; default 2 specs / 15 samples / 2 realms / 1 period) confirmed **too slow, not hung**: 2 specs finished in 12.6 s, 360 calls, 0× 429, ~28 rps overall and ~33–34 rps in the profile phase (rate-gated ≤ 40). Live fire 2's ~43 min of 2–8 % CPU after ingest matches serial 3 GETs/attempt at roughly one request at a time, not a freeze. At the measured concurrent rate, 40 specs × 200 samples (~24k requests) would be around 12–15 min of profiling, inside the 45 min deadline. Tests: `tests/unit/blizzardMetaSync.deadline-partial.test.ts`.

## 2026-11-12 Meta nightly heap

- Live `blizzard:nightly` at **04:15 Europe/Berlin** on 12 Nov 2026 ran the process out of heap (~377 MB of a 384 MB limit). The container auto-restarted. No new snapshot was written (0× HTTP 429). Last-good (or empty) data stayed as it was only because the process died before promote.
- Code fix: sample spec by spec, drop raw profile/talent/gear bodies after absorb, stage per-spec count maps in SQLite, assemble then gates + promote. Heap guard aborts at 85% of V8 `heap_size_limit` (optional `NUXT_META_HEAP_LIMIT_MB`), releases the lock, keeps last-good. `NUXT_META_MAX_CONCURRENT_SPECS` default 1.
- Host buffer (Unraid / Server): `NODE_OPTIONS=--max-old-space-size=640` in a 1 GB container (was 768 MB until 12.11.2026). That is additional headroom, not a substitute for the lean path.
- At the time of #191 there was no protected admin/manual trigger (only `blizzard:nightly`; Nitro `/_nitro/tasks` is a dev-server route). The manual CLI later shipped in the 2026-11-12 manual Meta CLI note at the end of this file. Do not fire it against live until that image has been pulled.
- Tests: `tests/unit/blizzardMetaSync.heap.test.ts` (40 specs × 200 padded samples, growth budget 96 MB; simulated breach keeps last-good; legacy retain-all path is expected to exceed the budget). Isolated measurement with `--expose-gc`: lean growth 62.0 MB (peak 77.4 MB) vs legacy retain-all growth 154.0 MB (peak 170.8 MB). A later full-suite run was still under budget (lean growth 80.8 MB).
- Public H1 contrast without JavaScript in light theme shipped separately as #192. Remaining no-JS contrast work is in the 2026-11-12 follow-up note at the end of this file.

## 2026-09-10 payload / bundle

- `pages/index.vue` uses `GET /api/v1/catalog-summary` (addon names + counts, no import-string blobs). `/strings` still uses fat `/api/v1/profiles`, `/layouts`, `/wowup`.
- No public `GET /api/v1/layouts/grouped`. Canonical grouped layouts stay `/api/v1/sync/layouts/grouped` (bearer).
- ECharts: `utils/echartsSetup.ts` imported only by `components/admin/charts/*`. Do not restore `plugins/echarts.client.ts`.
- `AdBanner.vue` shares `usePublicSiteSettings()` (`public-site-settings`).
- `pages/guide.vue` uses `LazyTipTapEditor`.
- Indexes `(is_visible, sort_order)` on profiles, wowup_strings, character_layouts, faqs (schema + bootstrap + `init.ts`).
- Direct deps `nostics` and `nitropack` removed (Nuxt still brings nitropack).
- Playwright `testMatch` is `*.spec.ts` so `tests/unit` is node:test only.


## WowUp packs (2026-10-01)

- **Starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore.
- **Optional:** BugGrabber, BugSack, HandyNotes, HandyNotes MapNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, Whisper Messenger, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders.
- WIM is retired. Do not seed slug `wim`, upsert addon `WIM`, or ship `WIM.lua`. Whisper Messenger is the whisper addon and stays in the WowUp optional pack. Ellesmere WIM Skin is retired.
- No WindTools. HandyNotes MapNotes is on WowUp Optional; Magguu settings apply with HandyNotes via Apply Magguu profiles / Load profiles.
- Public copy (home/guide/FAQ/changelog seed) never says bake, dump, or recapture. Player language: Apply Magguu profiles / Magguu Settings / Load profiles.

## MagguuUI product facts (2026-09-07)

- EllesmereUI TOC min **9.0.6+**; **live / fixture 9.8.2**; Magguu bake is **dump-based**; notes track **v12.1.9**.
- Four siblings: MagguuUI / MagguuUI_Data / MagguuUI_EUI / MagguuUI_Media.
- Posted Magguu export = **full bake** (2026-09-11: Ellesmere type=full, BigWigs, NSRT, EXBoss, WIM, Waypoint UI, HandyNotes, TTT, GTFO, BugSack, PGF, Smart Reminders). Magguu Settings overlay still does not reimport the bake.
- **Targeted Spell Bars** is a public feature name. Public pages do not tell players to turn EXBoss MythicCast off.
- MagguuUI_EUI: **Boiling Point** stays; TopBar, Hearth-Picker, MagguuUI FPS/MS removed.
- AuraBuff count text **CENTER**. Magguu does not join, leave, or hide Services.
- Fresh install: **Apply Magguu profiles** imports Magguu profiles + Magguu Settings + companions (HandyNotes, TTT, GTFO, BugSack, PGF, Smart Reminders, …).
- **Magguu Settings** = overlay/QoL only (no Ellesmere re-import).
- **Load profiles** activates Magguu profiles (including HandyNotes/TTT/GTFO/BugSack/PGF); does not re-import except a missing companion once. Setup buttons are native share-strings only (BigWigs, Northern Sky, EXBoss, Smart Reminders).
- Public copy naming: **Magguu / MagguuUI only** — scrub foreign person/author credits; keep product addon names. Do not credit Magguu as author of foreign addons.
- Store paste (canonical MagguuUI `docs/store-descriptions/`): CurseForge WYSIWYG from preview HTML; Wago Markdown + forgecdn 300×300 logo; WoWI BBCode + GitHub raw `https://raw.githubusercontent.com/Derpsen/MagguuUI-Website/main/public/logo-300.png`. Never `ui.magguu.xyz` in WoWI `[img]`. `/logo.png` and `/logo-300.png` send CORP `cross-origin`; Cloudflare can cache the old `same-origin` header for hours.
- Store/Website public changelog = **latest version only**.
- GitHub addon/class sync paths: `MagguuUI_Data/AddOns/*.lua` and `MagguuUI_Data/Classes/*.lua` (not the retired nested `Data/` folder).
- Design: clean, clear, Ellesmere teal; little gimmick.

## Design

- Public home: clean and clear — primary CTA **Install & Setup** (`/guide`), secondary **Import Strings** (`/strings`). Little glass/motion; no hero fade-in or bounce scroll cue.
- Brand palette (public): Ellesmere teal `#0CD29D` is **primary** via `--color-brand-*` (hover/pressed `#0AA882` / `#088F6F`). `--color-ellesmere` aliases brand-400. Backgrounds are charcoal/near-black — not navy-blue brand dominance. Old Magguu blue is demoted; admin keeps its own accent tokens (light touch only if shared tokens force it). Admin brand marks use `/logo.png` (same as public).
- Home copy stays factual about EllesmereUI (native module, `/mui` Apply Magguu profiles, Magguu Settings overlay/QoL, Load profiles activate-only, optional companions, Skinning NAMES & COLORS DualRow for two-tone unit-frame and party/raid names (default + class color) plus class-colored keybinds — no EXBoss split, party/raid item level, Smart Tab, Quick Focus, audio switcher, Boiling Point, Targeted Spell Bars). Magguu does not join, leave, or hide Services. Seed defaults live in `server/database/defaultContent.ts` (EN + DE). Known-stale seed claims need a `LEGACY_*` marker in `server/utils/bootContentMarkers.ts` or `NUXT_SYNC_SEEDED_CONTENT=true`. Public pages prefer Magguu/MagguuUI naming and product addon names — no foreign person/author credits. Never bake/dump/recapture on public pages.

## Important Paths

- Docs: `README.md`, `AGENTS.md`, `MEMORY.md`
- Frontend: `pages/`, `components/`, `layouts/`, `assets/css/main.css`, `composables/`
- Backend: `server/api/`, `server/utils/`, `server/plugins/`, `server/middleware/`
- Database: `server/database/index.ts`, `server/database/schema.ts`, `drizzle.config.ts`
- Deployment: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`, `unraid/magguuui-website.xml`
- Verification: `scripts/verify-build.mjs`
- Env: `.env.example`, `docs/env-vars.md`
- Auth/session: `server/utils/auth.ts`, `server/utils/session.ts`, `server/utils/rateLimit.ts`
- API helpers: `server/utils/response.ts`
- String CRUD: `composables/useStringManager.ts`
- Admin navigation: `composables/useAdminNavigation.ts`
- OG default: `components/OgImage/MagguuOg.takumi.vue` (per-page via `usePublicPageSeo`; admin-pinned `og_image_url` wins)

## Collaboration Notes

- The user explicitly allows and encourages parallel work with subagents when helpful.
- It is safe to delegate bounded analysis or implementation subtasks to subagents without re-asking each time.
- Keep using subagents for parallel repo analysis, validation, and isolated implementation work when it speeds up progress.

## Architecture Notes

- Admin routes mostly run with `ssr: false` in `nuxt.config.ts`; `/admin/login` is SSR-on (more-specific rule before `/admin/**`).
- Auth is hybrid-compatible: login still returns a JWT in the response body, but the admin client restores primarily from HttpOnly cookie + session restore.
- Session tracking and persistent rate limits are stored in SQLite.
- Startup seeds admin, guide, and FAQ data; forced guide/FAQ code re-sync is opt-in via `NUXT_SYNC_SEEDED_CONTENT=true`. Known inaccurate legacy seed claims may be repaired by exact marker during startup; arbitrary admin-authored content remains untouched.
- DB structure is still defined in both manual SQL bootstrap logic and the Drizzle schema.

## Implementation notes

- Public SSR pages feed public API routes with SWR route rules; admin SPA (`ssr:false`) talks to `/api/v1/admin/*` (JWT/cookie). Server API uses SQLite WAL mode with `busy_timeout=5000`. Docker image goes Unraid / Cloudflare Tunnel to `ui.magguu.xyz`.
- `requireAuth(event)` accepts legacy bearer tokens and HttpOnly cookie sessions. Session validation is bound to browser + OS family (`server/utils/session.ts`). Keep the softer `/api/v1/auth/session` endpoint aligned with `requireAuth`.
- OG images: templates need a renderer suffix; we use `.takumi.vue` (`components/OgImage/MagguuOg.takumi.vue`). `satori` ^0.47.1 (nuxt-og-image 7 peer; no active `.satori.vue`); >=0.48 blocked.
- GitHub webhook `server/api/v1/webhooks/github.post.ts` accepts signed events only from the configured repository, imports main pushes from the immutable after SHA, and handles `CHANGELOG.md`, `MagguuUI.toc`, and `MagguuUI_Data/AddOns|Classes/*.lua` independently. Manual pulls resolve main once and fetch the MagguuUI_Data snapshot at that SHA.
- Required production env: `NUXT_JWT_SECRET`, `NUXT_ADMIN_PASSWORD`. Optional: `NUXT_GITHUB_TOKEN`, `NUXT_WEBAUTHN_*`, `API_BEARER_TOKEN`, `NUXT_OG_IMAGE_SECRET`, `NUXT_BLIZZARD_CLIENT_ID`, `NUXT_BLIZZARD_CLIENT_SECRET`, `NUXT_BLIZZARD_REGION`, `NUXT_META_NIGHTLY`, `NUXT_META_KUMA_PUSH_URL`. See `.env.example` and `docs/env-vars.md`.

## Current Hardening State

- Shared rich-text sanitizing is centralized in `utils/richText.ts`.
- Runtime startup is hardened in `server/plugins/runtime-guard.ts`.
- First-admin creation in production is blocked unless a real `NUXT_ADMIN_PASSWORD` is set.
- Docker prefers `npm ci` when `package-lock.json` is present.
- A repo-local production smoke test exists at `npm run verify`.
- Expensive admin routes now have additional rate limits for upload, JSON import, and DB backup flows.
- Public page SEO now has a shared helper in `composables/usePublicPageSeo.ts`.
- Seeded home/guide/FAQ defaults are shared from `server/database/defaultContent.ts`.
- SQLite bootstrap now matches Drizzle on `site_content.locale = 'en'` and includes extra session/login indexes.
- `npm run verify` now starts from a clean state via `scripts/clean-build-artifacts.mjs`.
- Private API response headers are now centralized in `server/utils/privateApiHeaders.ts` and applied early enough that unauthenticated admin 401 responses are also non-cacheable.
- The build-clean script now resets `.output` plus the repo-local `.nuxt` directory and recreates the required `.nuxt/types` and `.nuxt/dist/...` folders so clean `nuxt prepare` + build runs stay stable on Windows.
- Password login and WebAuthn login now share the same post-auth success finalization in `server/utils/loginSuccess.ts`.
- The raw SQLite bootstrap SQL and migration list now live in `server/database/bootstrap.ts`, which keeps `server/database/index.ts` focused on connection setup.
- `server/database/seed.ts` now calls the same `initializeDatabase()` bootstrap helper as app startup, so standalone seeding works against an empty DB instead of assuming tables already exist.
- Private API header values are now shared from `server/utils/privateApiHeaders.ts` so middleware and the Nitro render hook cannot drift.
- Nuxt now builds from the repo-local `.nuxt` directory instead of `node_modules/.cache/nuxt`, which avoids the Windows-specific stale chunk resolution flake seen during repeated production builds.
- Content locale defaults and fallback order are now centralized in `server/utils/contentLocales.ts`, and public content reads merge requested locale -> `en` -> legacy `de`.
- Production runtime guard now also validates WebAuthn env completeness, so `NUXT_WEBAUTHN_RP_ID` and `NUXT_WEBAUTHN_ORIGIN` cannot be half-configured in production.
- Plus Jakarta Sans and JetBrains Mono are now sourced from local npm font packages instead of remote font fetching, and the privacy text reflects that fonts are self-hosted.
- Public auth hydration now uses `/api/v1/auth/session`, which returns `null` for missing/invalid cookies instead of expected 401s while preserving session revocation and browser/OS binding for real sessions.
- Public color-mode class rendering now keeps the SSR fallback stable until mount, avoiding hydration class mismatches when `preference: system` resolves to a light client theme.
- Nuxt ESLint Flat Config is now available through `npm run lint` / `npm run lint:fix`, with noisy Vue style rules disabled and `v-html` warnings left visible.
- CI now runs production dependency audit, lint, typecheck, production build/smoke, installs Chromium, and runs Playwright public smoke tests.
- Dependabot now covers npm, GitHub Actions, and Docker; CodeQL now scans JavaScript/TypeScript on push, PR, and weekly schedule.
- `NUXT_OG_IMAGE_SECRET` is documented for production, and CI/Playwright use dummy non-secret values to avoid unsigned dynamic OG-image warnings in test logs.
- Public profile/WowUp/layout projections remain unauthenticated and visibility-filtered; repository automation uses the token-only `/api/v1/sync/*` namespace.
- `/api/v1/sync/snapshot` returns profiles, WowUp, and class layouts from one SQLite transaction with a revision hash, including hidden synchronization state.
- Manual GitHub pulls and signed `main`-push webhooks fetch complete, size-bounded Lua snapshots at one immutable commit SHA and apply validated profile/class writes transactionally.
- Auth authorization resolves the current user and role from SQLite on every request, so deletion, lock, or demotion invalidates existing JWT claims immediately.


## SPA admin + color-mode hydration trap (2026-08-23; resolved 2026-08-25)

- Was: hard reload of SPA `/admin/**` (`ssr: false`) client-500 with `hooks.hookOnce is not a function` while HTTP stayed 200.
- Cause: `@nuxt/ui` 4.9 colors plugin FOUC cleanup called Unhead `hookOnce`; Nuxt 4.5.x Unhead v3 `HookableCore` lacked it.
- Resolved by `@nuxt/ui` 4.10 (nuxt/ui#6658). Local Unhead polyfill (`modules/fix-nuxt-ui-colors-hookonce.ts` + `plugins/unhead-hookonce-compat.client.ts`) removed.
- `/admin/login` remains `ssr: true` (more-specific routeRule before `/admin/**` SPA catch-all). Keep that exception.
- Lock currently resolves `nuxt@4.5.2` from caret `^4.4.8`; avoid assuming 4.4.x at build time. Not OG-secret / CSP related.

## Visible Risks

- DB schema ownership is still split across raw SQL bootstrap logic and Drizzle schema definitions.
- The admin client is closer to cookie-first auth, but still keeps some JWT compatibility logic in memory.

## Operational Notes

- Runtime data lives outside Git in `data/` and `uploads/`.
- Image tags are built and published by GitHub Actions on push to `main` and on `v*` tags; Unraid template pulls the published image.
- Container intentionally runs as root because of the current Unraid volume setup.

## Latest Verification

- On 2026-07-11 the cross-repository sync, webhook, auth, CI supply-chain, dependency, and smoke-test paths were audited and hardened together with MagguuUI and MagguuBot.
- Parser/HMAC unit tests passed 12/12; authenticated production verification covered the coherent snapshot API and deleted-user session invalidation; Playwright passed 10/10 public/browser tests.
- `npm run lint` (0 errors), `npm run typecheck`, `npm run verify`, full `npm audit`, and production `npm audit` succeeded; both audits report 0 vulnerabilities.
- Compatible patch/minor dependencies are current. `npm outdated` only offers the intentionally deferred H3 2 release candidate and TypeScript 7 major upgrade.
- Build still emits non-fatal Tailwind/Vite sourcemap warnings, chunk-size warnings, Node DEP0155 dependency warnings, and Satori CSS-variable warnings from global admin CSS being seen by `nuxt-og-image`.
- On 2026-03-29 the repo was reviewed across frontend, backend, security, Docker, and modernization potential.
- Local environment now has Node `v24.14.1` and npm `11.11.0`.
- `npm install` succeeded.
- `npm run build` succeeded.
- Public smoke checks for `/`, `/api/health`, and `/api/v1/faqs` succeeded.
- `package-lock.json` now exists in the repo.
- Seed script now prefers `NUXT_ADMIN_PASSWORD` while keeping `ADMIN_PASSWORD` as a backward-compatible fallback.
- `npm run verify` now succeeds repeatedly after the latest changes.
- `npm run verify` now covers `/`, `/api/health`, `/api/v1/faqs`, admin login, current session lookup, `/api/v1/admin/system/info`, logout, and revoked-session rejection.
- `npm run verify` now also covers `/api/v1/settings`, public WebAuthn login options, unauthenticated admin 401s, invalid login rejection, session listing, passkey listing, login-attempt stats, second-session creation, revoke-others, and secondary-session invalidation.
- `npm run verify` now also covers read-only admin settings, user listing, activity stats, and paginated activity log access.
- `npm run verify` now also covers admin notifications, aggregate stats, API-key listing, GitHub status, content/home payloads, FAQ listing, field definitions, and changelog listing.
- `npm run verify` now also covers the core public content feeds (`/api/v1/profiles`, `/api/v1/layouts`, `/api/v1/wowup`) plus their authenticated admin readbacks.
- `npm run verify` now also covers `/api/v1/content/home` and verifies that `/api/v1/content/home?locale=de` falls back successfully when only default `en` content exists.
- `npm run verify:smoke` now fails fast with a clear prerequisite message when `.output/server/index.mjs` is missing, instead of surfacing a raw Node module-resolution stack trace.
- `scripts/verify-build.mjs` now auto-selects a free localhost port when the default smoke-test port is already occupied, avoiding false-green runs against the wrong process.
- `npm run verify` now resets `.nuxt`, precreates the required subdirectories, runs `nuxt prepare`, then builds and smoke-tests successfully.
- Admin content grouping now falls back to locale `en` when records are missing a locale, aligning the admin content API with the current schema/seed defaults.
- Admin content import/read paths now treat missing `site_content.locale` values as `en`, matching the current schema/bootstrap default instead of defaulting those rows to `de`.
- Password login and passkey login now both flow through `server/utils/loginSuccess.ts`, which centralizes last-login unlock, session creation, auth cookie issuance, token-hash update, and successful login logging.
- Public settings now return merged defaults from `utils/siteSettingsDefaults.ts`, so empty databases still expose stable SEO/contact defaults.
- Homepage SEO/JSON-LD now uses centralized public settings instead of a half-static/half-dynamic split.
- Public layout branding now reads `site_name` from settings in key visible spots.
- `/imprint` is now the **Legal notice** page (2026-10-12): "MagguuUI is a free, non-commercial project operated from Switzerland." + `<ContactEmail>`. No §5 TMG, no name, no postal address. Follow-up: `imprint_*` settings + `Germany` default removed from defaults/admin UI/public API; `server/utils/bootMigrations.ts` deletes leftover `imprint_*` rows on boot.
- Shared seeded content now lives in `server/database/defaultContent.ts`, which reduces drift between startup init and manual seed flows.
- Standalone `db:seed` now bootstraps schema/tables via `server/database/bootstrap.ts` before inserts, which aligns fresh seeding with normal app startup.
- About, FAQ, Privacy, Guide, Strings, and Changelog pages now use safer shared public title helpers and settings-driven fallbacks for branding/contact metadata.
- Public page SEO canonical/meta handling is now shared through `composables/usePublicPageSeo.ts` for About, FAQ, Privacy, and Legal notice.
- Public page SEO/title duplication has been reduced further: Changelog, Guide, and Strings now rely on `usePublicPageSeo.ts` without extra page-local title/meta overrides.
- Static public site origin is now centralized via `utils/siteSettingsDefaults.ts` and reused by both `nuxt.config.ts` and `utils/publicSite.ts`.
- `server/database/index.ts` now adds safer low-risk indexes for `sessions` and `login_attempts`, and aligns `site_content.locale` bootstrap defaults with Drizzle.
- `nuxt.config.ts` now reads root-level app branding/SEO defaults from `utils/siteSettingsDefaults.ts` instead of keeping a separate hardcoded copy.
- Drizzle schema parity improved with matching non-unique indexes for `sessions`, `login_attempts`, and `rate_limits`.
- Raw SQLite bootstrap now also matches Drizzle for `profiles.custom_fields`, `wowup_strings.sort_order`, `wowup_strings.custom_fields`, `users.is_locked`, `users.locked_until`, and the fresh-DB `site_content(page, section, key, locale)` unique index.
- A real middleware-order bug was found and fixed: admin auth failures now still receive private/no-store headers because `server/middleware/admin-api.ts` applies shared private headers before calling `requireAuth`.

## Admin login client 500 (2026-08-23; resolved 2026-08-25)

- Hard reload of `/admin/login` (then ssr:false SPA shell) crashed client init with `NUXT_E1005` / `injectHead().hooks.hookOnce is not a function`.
- Cause: `@nuxt/ui@4.9` colors plugin SPA FOUC path vs Unhead v3 `HookableCore` (Nuxt 4.5).
- Interim fix was a local Unhead polyfill; superseded by `@nuxt/ui` 4.10 (nuxt/ui#6658). Polyfill files removed. `/admin/login` stays `ssr: true`.

## 2026-09-27 autonomy

- Admin-Smoke checklist documented in `AGENTS.md` (login + five #102 routes; report FAIL-only to Buddy; "Unraid & Server" owns pull).
- Merge reports must say **Actions-only** vs **App-Image** (Dependabot pin-only = no "Unraid & Server"; app/Dockerfile publish = the no-AI Unraid pull/test script after green docker).
- USelect/Reka: never option-shaped `value: ""`; sentinel e.g. `"all"`. Enforced by `npm run lint` / `lint:uselect` (`scripts/check-uselect-empty-value.mjs`). `pages/admin/system/github.vue` syncFilters All → `"all"`.
- Pack/copy product-fact deltas: update Website + MagguuBot + **Magguu-Dashboard** AGENTS (+ MEMORY where present) the same round.

## 2026-10-06 Ops sync (Buddy Inventur)

- (superseded, see 2026-10-14) Live Website digest `sha256:76ef22c97b84cbd6162d9aef44df0d620ab1cea8c1252daf1fadd432c8c3f60d` (OCI `sha-5c26d99` / tip `5c26d99`) — kein Re-Pull wenn live schon darauf.
- Wave: #95 (`@simplewebauthn/browser` 14) + #117 (audit overrides/allowlist); "Unraid & Server" App-Image + Admin-Smoke **6/6 PASS** auf diesem Digest.
- Passkey: Marco live Proton Pass = PASS; Box-Desktop != Proton-Passkey -> kein FAIL.
- Audit-Allowlist review-by **2026-11-30**: `simple-git` + `@simple-git/argv-parser` (+ `braces` / `node-forge` from #114). Overrides #117: `vue`/`@vue/server-renderer` 3.5.43, `seroval` 1.6.8, `shell-quote` 1.12.0, `source-map-js` 1.2.2.
- Optional pack / Discord embeds = **Whisper Messenger**, nicht WIM / Ellesmere WIM Skin.
- Prefer Done-Wave Capture skill nach App-Image-Wellen; keine neuen Specialist-Bots.

## 2026-10-12 Facts refresh

- MagguuUI addon live **v12.1.9** (was v12.1.8 until 2026-11-08).
- Container runs as **uid 99** (Unraid `nobody`). Images are signed with **Cosign keyless** (GitHub OIDC).
- Website defaults to **Dark** mode (`colorMode.preference: 'dark'`); light only when the visitor picks it.
- **WIM is removed** everywhere. Whisper Messenger is the whisper chat. Player button: **Apply Magguu profiles** (4K only in descriptions).
- Node: (superseded 2026-10-16) `engines.node >=24.17`, Node 24 locked. Now Node 26 live, `engines.node >=26.12.0` (Marco's yes 2026-10-16).
- satori (superseded 2026-10-16, now ^0.47.1 with nuxt-og-image 7; #140 closed): locked at `^0.34.1` (nuxt-og-image 6 peer `>=0.33.5`). 0.x minors are breaking for Satori layout/CSS, so 0.41+ is a locked major like Node 26, TS 7, h3 2. Dependabot **#130** (0.34.1 → 0.44.3) was closed 2026-10-12, superseded by **#140** (0.34.1 → 0.47.1); #140 stays open and untouched: no merge, no close, until a separate OG-image compatibility pass.
- CSP: HTML policy comes from `server/plugins/csp-nonce.ts` (render:html + beforeResponse, rebuilt from the cached nonce on SWR hits). routeRules no longer set a CSP. `experimental.payloadExtraction: false` keeps SWR HTML and payload from the same render. Init clears `nitro:routes` cache on boot.
- Contact email renders client-side (`components/ContactEmail.vue`, footer mailto after mount) so Cloudflare Email Obfuscation has nothing to rewrite.

## 2026-10-12 Docs/Bots-Sync

- Helpers (renamed again 2026-10-16, IDs unchanged): "Website" = MagguuUI-Website only; "Bot & Dashboard" = MagguuBot + Magguu-Dashboard; "Addon (Lua)" = addon Lua; "Code-Review" = review on request; "Release" = releases/Tag-Gate; "Unraid & Server" = Unraid; Buddy = front door. Former names: Webcraft, Botsmith, Luaforge, Sentinel, Launchpad, Homebase. Captain and all group chats/rooms were deleted 2026-10-16; Buddy contacts helpers directly; Notion holds only rules and the daily Docs-Abgleich log.
- Buddy makes small design/text changes directly; bigger work goes to "Website". Since 2026-10-12 helpers and Buddy push directly to `main` (no PRs, no pre-review); Buddy reviews commits afterwards; after a green Docker publish the no-AI Unraid pull/test script (`magguu-pull`, rollback on failure) pulls the new image.
- (superseded, see 2026-10-15) Live 2026-10-14: `sha-d8e734a` (digest `sha256:516f6c21…`): admin restyle, admin save clears cache, `/admin/content` shows a page list. Before: `sha-1febf58` (#144, #146, #147). #148 is test-only (no pull). #149 two-tone wording merged to main and is waiting for the next pull. `useIsDark` stays dark until mount (light-mode hydration fix).
- Legal notice: "free, non-commercial project operated from Switzerland" + `contact@magguu.xyz`; no name, no address. Plain structured text with small green mini-label headings; no cards, icon boxes or flashy buttons.
- Addon live **v12.1.9** (was v12.1.8). "Split names" options are becoming "Two-tone unit-frame names" / "Two-tone party and raid names" (MagguuUI PR #30; `SPLIT_NAMES` keys unchanged): half the name in the default color, half in the class color.
- Unchanged: WIM is removed and Whisper Messenger is used; "Apply Magguu profiles"; Node 26 live since 2026-10-16; locked TS 7, h3 2, js-yaml 5, satori >=0.48; uid 99 + Cosign; `engines.node >=26.12.0`; no tags without Marco's yes; never remove third-party author names.

## 2026-10-14 Perf wave ("Website", direct to main)

- Screenshots: pre-generated AVIF/WebP/JPG at 800/1280/2000w via
  `scripts/generate-screenshots.mjs`; `ScreenshotFrame` uses `<picture>` +
  srcset, lightbox uses the 2000w variant. Originals stay as sources.
- Cache: public pages + `/api/v1/catalog-summary` send
  `CDN-Cache-Control`/`Cloudflare-CDN-Cache-Control: public, max-age=120,
  stale-while-revalidate=600`. Cloudflare only uses it with a Cache Rule
  (Eligible for cache) on those URLs. Writes clear Nitro + (if envs set)
  purge the Cloudflare zone, debounced 1.5s (`server/utils/cloudflarePurge.ts`).
- Headers: origin sends HSTS `max-age=31536000; includeSubDomains`; live
  `max-age=0` comes from Cloudflare's edge HSTS setting (dashboard, not code).
  `x-powered-by` is dropped in `server/plugins/security-headers.ts`.
- Bundle: admin CSS split to `assets/css/admin.css`; admin-only chunks not
  prefetched; client codeSplitting vendor/app groups for the entry graph.
  Local prod build `/`: modulepreload 30 -> 25, prefetch 8 -> 3, no admin CSS.
- WowUp list: `/api/v1/wowup?view=meta` (length, preview, addonNames) and
  `/api/v1/wowup/:id`; the plain list endpoint stays fat for old clients.
- Nightly GitHub sync: Nitro task `github:nightly` at 02:30 UTC
  (`server/plugins/github-nightly-schedule.ts`, UTC date math; no TZ on the
  image or Unraid). Admin last/next run is shown in Europe/Berlin. Kill switch
  `NUXT_GITHUB_NIGHTLY` / `runtimeConfig.githubNightly`, read at run time
  (default on in prod, off in dev; off/false/0/no = off, on/true/1/yes = on;
  unknown values warn once per process and use the default; off → `skipped`
  in admin). Catalogue sync still
  runs if the release check fails (`partial` / `error` with both results).
  Shared lock with Check/Resync; rate-limit skip on remaining=0 / 429 /
  rate-limit 403.
- Meta prototype (`/meta`): EU Mythic+ routes, snapshot schema
  (`utils/metaTypes.ts`, `docs/meta-snapshot.md`, fixture
  `tests/fixtures/blizzard-meta/snapshot.json`). English centralized copy
  (`utils/metaCopy.ts`). No "World of Warcraft"/"WoW" in our titles or URLs.
  Empty pages show "Collecting data." Expired snapshots (over 30 days) show "Data unavailable." /meta changes go through a PR, Code-Review Ship, and green CI (docs-only may still go direct). Privacy s13
  (server-side retrieval, no visitor data passed on). The nightly Blizzard
  job is `blizzard:nightly` at 03:15 UTC, default off
  (`NUXT_META_NIGHTLY`), also off without `NUXT_BLIZZARD_CLIENT_ID` /
  `NUXT_BLIZZARD_CLIENT_SECRET` (runtimeConfig `blizzardClientId` /
  `blizzardClientSecret`, never logged). Optional `NUXT_BLIZZARD_REGION=eu`,
  `NUXT_META_KUMA_PUSH_URL`, sample caps. Creds are not on Unraid until they
  are added there; the job stays off until then. The full spec layout follows
  in a later PR.
- Build info: Dockerfile `GIT_SHA`/`BUILD_TIME` args -> env; admin dashboard
  shows `Live: <sha7> · built <UTC>` (fallback `dev`) via
  `/api/v1/admin/system/build`.
- Settings (`/admin/system/settings`) shows `App {version} · sha-{short}` from
  `/api/v1/admin/system/info` (same `GIT_SHA`). Tab bar fade/arrows:
  `tests/admin-tab-bar.spec.ts`. Activity/addons metrics use a skeleton instead
  of a false 0 on first load. First-load ~4s on those lists is the admin SPA
  (`ssr: false`) plus onMounted fetch; list endpoints still return full strings.
  Tab bar: Arrow/Home/End keyboard navigation; instant scroll when
  prefers-reduced-motion is reduce. Admin vitals `total` excludes 404 samples.
- CI: weekly `lighthouse-live.yml` (Mon 05:17 UTC, artifact + summary);
  `build.yml` has an experimental Node 26 matrix entry (continue-on-error; superseded 2026-10-16: CI is Node 26 only).

## 2026-10-14 Queue A–J ("Website", direct to main)

- A RUM: `plugins/web-vitals.client.ts` (idle import, public only) → `POST
  /api/v1/vitals` (text/plain beacon, 30/min/IP, tracking setting) →
  `web_vitals`; admin p75 table `/admin/system/vitals`.
  Unknown/404 paths are dropped on ingest and in the admin aggregate (`TRACKED_ROUTES` only).
- B `scripts/check-links.mjs` + weekly `linkcheck.yml`. CurseForge/Wago/WoWI
  answer 403 to bots → "unverified", not failures. First run found 404s on
  every `github.com/Derpsen/MagguuUI` link (repo not public).
- C Ctrl/Cmd+K `components/PublicSearch.vue` (UCommandPalette in UModal),
  index from the DB at `/api/v1/search-index` (SWR 120s, cleared on writes);
  not build-time on purpose, so admin edits are searchable at once.
- D `AdminChangePreview` (before/after per field) on Home + Pages editors.
- E `/api/health`: status, checks.database, build.sha/shortSha/time,
  startedAt, uptimeSeconds; no-store; 503 when the DB check fails.
- F/I were already on main (#141): `experimental.viewTransition` + reduced
  motion CSS; per-page `defineOgImage('MagguuOg')` (Takumi). Covered by tests.
- G Speculation Rules (moderate prefetch, public only) in the default layout.
- H `public/sw.js` + `plugins/pwa.client.ts`: offline `/strings` + `/guide`
  and their read APIs, cache-first only for hashed `/_nuxt`.
- J `content_revisions` written by `content/bulk`; History panel + restore.
- Perf (local prod build, Lighthouse mobile median of 3): `/` perf 84 → 85,
  `/strings` 92 → 92, a11y 100, CLS 0. `/` initial JS+CSS gzip 295.3 → 298.4 kB,
  modulepreload 25 → 26, prefetch 3 → 4. axe: 0 violations on all public pages
  and the search dialog.


- 2026-10-14: Private-repo link sweep for Derpsen/MagguuUI (mapping CurseForge / /changelog / /about#contact), idempotent DB migration in bootContentMarkers.ts, link check treats store 403 as OK.

## 2026-10-15 Live state + Arbeitscomputer

- Live since 2026-10-14 late evening: `sha-5db94ed` (digest `sha256:abfe0d1db9157bfb9be5b2f09b678a537c1b7994447db111f403d361c2f339c4`; v12.1.8 changelog notes; build id `93cfa63c`). Superseded: `sha-72ed68e`, `sha-d8e734a`, `sha-1febf58`. (Superseded 2026-10-17: live `sha-6dc9870`, build id `da0941f8`; #140 closed 2026-10-16, no open PRs.)
- Helfer-Arbeitscomputer ist die Unraid-VM `Ubuntu` (machineId `3ff4cee8-7e7c-4cc9-a262-ebf10016d570`), Repos unter `~/Projekte` nach dem Umzug auf die VM. Marcos PC (`f01cf815-a384-40fb-ac18-c8450b4d5889`) nur noch für WoW-AddOns-Deploy, darf aus sein.
- "Website" schreibt Marco nie im 1:1; Status/Done nur an Buddy.

## 2026-10-16 CSP ERR_HTTP_HEADERS_SENT

- `server/plugins/csp-nonce.ts` beforeResponse/render:html now skip when `res.headersSent || res.writableEnded` (`canWriteHeaders` in `server/utils/htmlCsp.ts`, unit-tested). Repro: prod build + aborted curl (`-m 0.02`) on `/` and `/admin/login` → 6x ERR_HTTP_HEADERS_SENT before, 0 after.

## 2026-10-16 Dependabot grouping + pre-push hook

- Dependabot patch/minor grouped (npm + actions); majors separate; satori >=0.41 / js-yaml 5 / h3 2 / TS 7 / Node 26 ignored (later 2026-10-16: Node 26 and satori ignores lifted, satori now >=0.48 ignored). Automerge workflow renamed to `dependabot-automerge.yml` (pull_request_target + Build fallback). Repo: allow_auto_merge=false, main unprotected (no required checks), so the `--auto` path is skipped for now.
- `.githooks/pre-push` (lint, typecheck, unit, actionlint); `npm run hooks:install`. Enabled on the Ubuntu VM checkout.

## 2026-10-16 Docker path filter + post-deploy smoke

- `docker.yml` no longer builds on docs/.github-only pushes (paths with negations; docker.yml itself still builds). New `post-deploy-smoke.yml` (workflow_run after docker, daily, dispatch); fails only when the site is down.

## 2026-10-16 Node 26

- engines `>=26.12.0`, Dockerfile `node:26-bookworm-slim@sha256:2989926…8913`, CI on Node 26 only (check `build (26, false)`), Dependabot node ignore removed. Local docker run: entrypoint drops to uid 99, /api/health 200.

## 2026-10-16 nuxt-og-image 7 + satori 0.47.1

- nuxt-og-image ^7.0.6 (7.0.7), satori ^0.47.1 (v7 peer); satori hold removed (closes #155/#156). `ogImage.fonts` removed (v7 reads @nuxt/fonts; @nuxt/ui still pins @nuxt/fonts 0.14, so OG text uses bundled Inter until ui moves to fonts 1). Signing: set `NUXT_APP_SECRET` (>=32 chars) in prod; v7 still falls back to NUXT_OG_IMAGE_SECRET with a warning. Renders checked for /, /guide, /faq, /changelog.

## 2026-10-16 Repo settings

- allow_auto_merge=true; main protection: required checks `build (26, false)`, `Analyze (javascript-typescript)`, enforce_admins=false, no reviews, no force-push. #155/#156 closed (6159d96), #158 (satori 0.56) closed as incompatible with og-image 7 peer.

## 2026-10-17 Security/quality wave

- 2456016 Playwright warm-up fix; 6465a7e Scorecard; ef7ebdc dependency-review; secret scanning + push protection on; 25b6ce1/84c746b/1bdd5ba Quality workflow + zizmor hardening; Dependabot cooldown.

## 2026-10-17 SW CSP hotfix

- Live bug: /sw.js got the non-HTML baseline CSP (default-src none), which also governs the worker's fetch(). After the SW installed, navigations to /guide and /strings and all /_nuxt assets failed (net::ERR_FAILED). Fix: explicit CSP on /sw.js with connect-src self. Verified with a prod build: SW-served /guide and /strings 200, 0 console errors.

## 2026-10-17 Step 4 result

- Lockfile refreshed (0379847); web-vitals 6 already in (#157). TS 7.0.2 tried: tsc ok but typescript-eslint peer `<6.1.0` breaks lint, so skipped. h3 2 skipped (nitropack 2 depends on h3 ^1). View Transitions already on (experimental.viewTransition + reduced-motion CSS). Lighthouse local before/after: ~/Projekte/lh-before.txt / lh-after.txt (no real change; changelog mobile LCP ~8.4s simulated, render-blocking entry CSS ~750 ms est. is the main lever). Light/dark screenshots in ~/Projekte/shots look right.

## 2026-10-17 Unreleased changelog

- Website changelog rows live in the DB; the newest CHANGELOG.md heading of the private MagguuUI repo is upserted by the GitHub webhook/pull. Live had a `v12.1.9` row (synced 2026-10-17) shown as Current release. Now: any heading newer than CURRENT_ADDON_CHANGELOG (or `-Dev`) is stored as `Unreleased` (init renames existing rows; sync maps new ones and drops the row once the newest heading is a release). `/api/v1/changelogs` keeps releases in `data` (data[0] = v12.1.8) and returns `meta.unreleased`; /changelog shows it above v12.1.8 without "Current release". Content stays whatever the addon repo CHANGELOG says.

## 2026-10-22 Docs drift check

- Weekly AI docs review replaced by `tools/docs-drift.sh` + `.github/docs-drift-rules.txt` + `docs-drift.yml` (issue "Docs-Drift"). Baseline fixes: AGENTS live line now `sha-d7b13eb`, @types/node 26 added to locked list. Docker `paths` now also skip `tools/**`.

## 2026-10-22 Live-build pointer

- AGENTS.md no longer states a live sha/digest (auto-deploy); it points to /api/health. docs-drift flags `sha-…`/`sha256:` in AGENTS.md and checks /api/health = 200. Removed AGENTS block, kept here as history:

  > **Live ops baseline (2026-10-14 late evening, checked 2026-10-15):** live image OCI
  > `sha-5db94ed` (digest
  > `sha256:abfe0d1db9157bfb9be5b2f09b678a537c1b7994447db111f403d361c2f339c4`):
  > v12.1.8 changelog notes; live build id `93cfa63c` (`/_nuxt/builds/latest.json`). **Superseded 2026-10-17:** was `sha-6dc9870` (PWA `/sw.js` connect-src fix, Node 26, nuxt-og-image 7 + satori 0.47.1), build id `da0941f8` (built 2026-10-17 01:40 Berlin). **Checked 2026-10-22:** live is now `sha-00171ef` (`/api/health`; docs-drift commit, app code as `cdbd4d9` Unreleased changelog + #161). `tools/docs-drift.sh` checks this line weekly.
  > Superseded: `sha-72ed68e`; `sha-d8e734a` (digest `sha256:516f6c21…`: admin restyle,
  > admin save clears the cache, `/admin/content` shows a page list). Previous baseline 2026-10-12: `sha-1febf58` (#144 clean
  > module section + legal notice, #146 nowrap, #147 green mini-label headings).
  > #148 (color-mode reload test) is test-only, so no pull. #149 (two-tone names
  > wording) merged to main 2026-10-12 21:18 Berlin (live now, included in `sha-5db94ed`). Light-mode hydration fix: `useIsDark` stays dark until mount. The older
  > 2026-10-06 baseline (`sha-5c26d99`) is superseded.

## 2026-10-23 Knowledge refresh

- Node 26.12.1 (2026-10-21) is still Current, with Active LTS expected late Oct 2026. Docker base `node:26-bookworm-slim` index moved from `sha256:2989926…8913` to `sha256:2814715…16fe` (= 26.12.1). `engines >=26.12.0` unchanged.
- Bumped: codeql-action v4.38.3 → v4.39.1 (pin 9b32540) and @takumi-rs/core 2.16.3 → 2.17.1 (lockfile only). All other actions are already on their latest release (checkout v7.0.1, setup-node v7.1.0, build-push v7.4.0, cosign-installer v4.1.2, scorecard v2.5.0, trivy v0.36.0…).
- Nuxt 4.6.2, @nuxt/ui 4.12.0 and nuxt-og-image 7.0.7 are all at latest.
- Enabled private vulnerability reporting (free).
- Left off for Marco: Dependabot security updates (would open security PRs outside the grouping/cooldown flow); `actions/attest-build-provenance` v4.2.2 for GitHub artifact attestations (needs `attestations: write`; buildx provenance + Cosign already cover it); immutable releases (only matter once there are tags/releases).

## 2026-10-23 Security updates + artifact attestations

- Turned on Dependabot security updates (`PUT /automated-security-fixes`). dependabot-automerge.yml is unchanged apart from a comment: security patch/minor PRs auto-merge after CI, security majors are left for a human.
- docker.yml `build-and-push` now also runs `actions/attest-build-provenance` v4.2.2 (pin 4d10147), with subject = ghcr image + build digest and push-to-registry. Added `attestations: write` to that job only.

## 2026-10-23 zizmor advisory workflow

- Added `.github/workflows/zizmor.yml` (zizmor-action v0.8.0 pin 53290ba, advisory, no SARIF; see AGENTS.md for why). Docs/.github-only change, so the docker build is skipped by the paths filter.
- Reporting rule from Buddy: one Done message per task (~800 chars + path/commit); interim updates only for tasks over 30 min.

## 2026-10-23 Security fix (audit run-20261023)

- CRITICAL `/api/v1/%61dmin/...` middleware bypass fixed: the gate now uses the canonical path, and every admin handler calls `requireAdminAccess`/`requireAdmin`.
- MEDIUM: the global account lockout that killed all sessions is replaced by per-IP + per-account exponential backoff. The `max_login_attempts` / `lockout_duration_minutes` settings now mean "free failures" and "max delay".
- cf-connecting-ip is trusted only from `NUXT_TRUSTED_PROXIES`. (Superseded 2026-10-25: the default is now `loopback` only; literal IPs/CIDRs or the explicit keyword `private` widen it. Live runs `NUXT_TRUSTED_PROXIES=192.168.178.19`, confirmed by the `[trusted-proxy] cf-connecting-ip accepted from socket` log line, so production is pinned to cloudflared and unaffected. The container is still directly reachable on the LAN, `http://192.168.178.21:3000/api/health` returned 200, so the pin is what stops header spoofing.)
- Hardening notes from the audit left open: `latest-change` entityName leak, webhook invalid-signature syncHistory rows, WebAuthn rpId fallback, passkey `e.message`.

## 2026-10-23 zizmor green + cooldown 7d

- zizmor job made green (step continue-on-error + summary step); Dependabot cooldown raised to 7 days (fixes the 3 medium dependabot-cooldown findings). Left: 1 informational template-injection in dependabot-automerge.yml:128.

## 2026-10-24 Wave 1: changelog feeds + filter + ?since=

- Added RSS/Atom (`/changelog/feed.xml`, `/changelog/atom.xml`), the `?since=` / `from` / `to` / `q` filter on `/changelog` (SSR GET form) and `utils/changelogVersion.ts` (semver-like compare, dev builds sort before their release). Details and limits (no addon field, `isPublished` is the only hide flag, page shows newest 24) are in AGENTS.md.
- Gotcha: h3 `handleCacheHeaders({maxAge})` adds `s-maxage`, which `public-cache-invalidate.ts` turns into `max-age=0, must-revalidate`. The feed sets `max-age=600` via `cacheControls` instead.
- Gotcha: `server/plugins/e2e-seed.ts` used an early `return` when the WowUp pack existed, which would have skipped later seeds. Seeds are now separate functions.
- Dark and Light checked via screenshots in ~/Projekte/shots (cl-dark.png, cl-light.png).

## 2026-10-24 Quality plan (Website part)

- Hotfix first: undici override 8.11.2 -> 8.12.2 (GHSA-xjj6-f33q-929c high, plus two moderate) because `audit:prod` blocked Build + docker verify on 877f2bf. Fix 738ce95 went live via auto-deploy.
- `tools/drift-check.sh` replaced by `tools/magguu-drift.py` + new-format `tools/drift-allow.txt`; runs in `drift.yml` without paths-ignore. osv-scanner advisory workflow + `osv-scanner.toml` (3 reasoned ignores). `${{ }}` in dependabot-automerge `run:` moved to env. Details in AGENTS.md.

## 2026-10-24 Task A: CI failure alarm

- Added `failure-alarm.yml` (copy of the MagguuUI template + `commit_sha` input + same-commit dedupe lookup), alarm jobs in 6 workflows, `.github/zizmor.yml`, `tools/failure-alarm.test.sh` (runs in quality.yml). One real webhook test was done from the throwaway branch `tmp/escalation-test` (deleted afterwards): HTTP 200, no repeat runs.
- Follow-ups: feed memo in `changelogFeedResponse.ts`; E2E seed has Unreleased + draft rows; osv-scanner step uses `set -o pipefail`; `/changelog` lost its page swr rule (query variants were cached per URL); undici override 8.12.3.

## 2026-10-24 Task B: SEO modules

- Added @nuxtjs/sitemap, @nuxtjs/robots, nuxt-link-checker (no umbrella, no nuxt-schema-org: existing JSON-LD is enough). Sitemap source `server/api/__sitemap__/urls.ts`, robots via `robots` config; removed `server/routes/sitemap.xml.ts` and `public/robots.txt`. Filtered `/changelog?...` views are noindex. Link check is CI-only (`LINK_CHECK=1`, `link-check.yml`, warning only).
- Client bundle unchanged (4.8 MB, 271 files in `_nuxt` before and after). See AGENTS.md "SEO modules".

## 2026-10-24 Wave 3: Strings copy, stamps, single-module guide

- The big gradient "Copy String" buttons became a small plain `StringCopyButton` with an aria-live status; `doCopy` used to return true even when `execCommand` failed, now it reports failure. Per-string version/date stamps come from `updatedAt` + published releases (`/api/v1/release-stamps`); no per-string version exists, so the version is an inference (gap reported). Guide got a static "Apply only one module" section verified against the addon source. See AGENTS.md.

## 2026-10-24 Wave 4: full-text search

- Nuxt Content rejected (second content store + build-time index vs. DB-edited content). Extended the lazy Ctrl+K index with Changelog entries and full plain-text bodies and replaced Fuse with `utils/searchMatch.ts` (AND of words, ranked, snippets). No new dependency; no typo tolerance anymore. See AGENTS.md "Full-text search".

## 2026-10-24 Wave 5: Lighthouse budgets (advisory)

- Replaced the old PR-only home-page `lighthouse.yml` (no assertions, public temp storage, `pull-requests: write`) with an advisory budget workflow: 3 pages x mobile/desktop, median of 3, budgets in `.github/lighthouse-budgets.json`, checker `tools/lighthouse-budget.mjs` with unit tests. Job-level `continue-on-error`, no alarm job, not on push. Workflow-only change, so no docker image build.
- Local baseline (VM, prod build): home mobile 83 / desktop 99, changelog 86 / 94, guide 81 / 98; LCP ~4.1 s mobile, ~234 KB transferred JS per page. On the CI runner: mobile home 81 / changelog 64 (LCP 8.4 s, reproducible in 2 of 3 runs, worth a look) / guide 78; desktop 99 / 94 / 98. Budgets calibrated to that. See AGENTS.md "Lighthouse budgets".

## 2026-10-24 Follow-ups: changelog LCP, lighthouse-live, search typos

- Root cause of /changelog mobile LCP 8.3 s: reproduced locally with the LHCI mobile config and a fresh DB (same 47 KB HTML as CI). Observed LCP was ~0.3 s; Lantern's simulation waited for the 880 KB `logo.png` (manifest icon fetched by Chrome). New `icon-192/512.png` in `manifest.json`: 8.26 s -> 4.03 s (perf 70 -> 82), home 4.1 s and guide 4.4-4.6 s unchanged. Real users were not affected much, but the icon was needlessly big.
- `lighthouse-live.yml`: the `manifest` output does exist in the action source (just not in action.yml), so the table was not broken; it now reads `.lighthouseci/manifest.json`, adds `/changelog`, prints the table to the log and is job-level advisory. Kept (live-only value).
- Search typo fallback implemented in `utils/searchMatch.ts` (see AGENTS.md).
- Verified on CI after the fix (run 40116422033): /changelog mobile LCP 4.2 s / perf 78 (was 8.4 s / 64), TBT 203 ms; budgets for it tightened to perf >= 74, LCP <= 4.6 s. Live snapshot (run 40116424160): home 75, guide 77, changelog 76 (LCP 4.7 s), strings 80 — the live site never showed the 8 s value, it was a local/CI simulation artifact of the big manifest icon.

## 2026-10-24 Wave 3 (Marco's larger wave): What's new banner

- Added `WhatsNewBanner` + `utils/whatsNew.ts` (see AGENTS.md). Decisions: banner is fixed bottom-left (no layout shift), hides on /changelog and counts that as seen; Dismiss/link/Esc record the newest version; first visitors only get the value stored. Admin layout does not show it.
- Gotcha: the local dev DB used by Playwright already holds the real releases (v12.1.x), so tests read the newest version from `/api/v1/release-stamps` instead of assuming v0.9.3.

## 2026-10-24 Wave 9 (admin Ctrl/Cmd+K palette)

- Upgraded the existing `CommandPalette.vue` instead of adding a second one (no new dependency). Decisions: kept the custom list in UModal (full combobox ARIA added), search is multi-word AND with label-first ranking, tab pages are searchable, Log out is offered as an action but needs Enter on that option (nothing runs on open). Styling made plain (mono mini-label groups, no icon boxes, no hover lift).
- Gotcha: dialogs teleport out of `.admin-shell`, so `--admin-*` vars were undefined there (no highlight on the active option) -> tokens defined on `.admin-command`. Playwright screenshots of animated dialogs need `animations: 'disabled'`.

## 2026-10-25 Code-review follow-up (alarm redaction, robots headers)

- F1 redaction ported (fail-closed), F2 solved by the ported scrub (keeps text before a match), F3 dedupe restricted to main non-PR runs, F4 conditions test added (all six `if:` fired correctly; real bug found: callers needed `contents: read` once the redaction checkout was added), F5 noarchive via `robotsDisabledValue`, F6 `/api/**` header + 4xx/5xx noindex plugin. Verify robots headers live with GET after deploy.

## 2026-10-25 Item 7: admin drafts, live preview, Publish

- New `content_drafts` table (bootstrap SQL, idempotent) + `/api/v1/admin/content/drafts` and `/publish`; Home, Guide and Pages editors now "Save draft" → Publish/Discard in `AdminDraftBar`. Decisions: separate table (public reads untouched), drafts global per page, only changed cells stored, real-component preview only on Pages (About/Imprint/Privacy extracted to `components/PageView/*`), changelog/FAQ keep their visibility toggles.
- Gotcha: `stamp()` in Playwright can return the same value twice within one millisecond, so a "second edit" was a no-op and the Save bar never appeared (looked like a hang). Editors reload after Publish; wait for the fresh form.

## 2026-10-25 Item 6: admin audit log with diff + undo

- New `audit_changes` table (bootstrap SQL, idempotent), `/admin/system/audit`, `GET /api/v1/admin/audit` + `POST .../:id/undo`. Decisions: separate table instead of altering `activity_log`; central `auditRedact.ts` (key-name + value-shape + size caps, on write and read); undo only for content/changelog/FAQ with a strict conflict check (current must equal stored after-state); settings/profiles/WowUp/layouts audited only; retention 5000 rows / 90 days on every insert; audit writes are best effort.
- Limits: FAQ reorder is unaudited so an older FAQ undo then conflicts (safe); snapshots with redacted/truncated fields are not undoable.

## 2026-10-25 Item 8: admin dashboard overview (site data only)

- Rewrote `/admin` in place as plain sections (Marco dislikes cards/icon boxes) on top of ONE new endpoint `GET /api/v1/admin/overview` (10 s cache, `?fresh=1` bypass). Decisions: dropped the GitHub release/alerts cards and the Chart widgets (external/bot-adjacent data); latest changelog uses `version LIKE 'v%'` like the feeds (dev DB holds leftover entries like `auto`); last publish comes from audit rows named `... published`; recent changes never include snapshots.
- Limits: traffic counters are the site's own `page_views`/`copy_events` (no bots filtered beyond what is collected); cache means numbers can be up to 10 s old.

## 2026-10-25 Item 1: public profile preview page

- New `/profiles` + `GET /api/v1/profile-previews` (addons catalogue + visible profiles, no new tables). Image slots read `public/previews/<addon-slug>.<ext>` at request time; missing file → clearly marked placeholder. Decisions: slug = addon catalogue slug; fixed 16:10 frame (no CLS, crops other ratios); webp > avif > png > jpg; class layouts get no slot; no swr on the page so a dev drop-in shows immediately (CDN header still caches the bare URL); header nav breakpoint md → lg.
- Gotcha: Nitro serves `public/` from a manifest built at build time, so a file copied into `.output/public` afterwards 404s (the folder listing would show it, the static handler would not). Real flow: commit → build → deploy. Verified with a real prod build run from a different cwd.
- Limits: profile-less addons and class layouts have no slot; needed images listed in `docs/preview-images.md` (12 at time of writing).

## 2026-10-25 Item 2: public profile configurator

- New `/configurator` + `GET /api/v1/configurator`; selection in the query (`addons`, `exclude`), output = matching WowUp Starter/Optional collection strings, a plain addon list, per-addon profile strings (copied lazily), and honest in-game notes. Decisions: indexable + sitemap (11 locs); no swr (query variants); EllesmereUI always included; pack membership derived from pack contents; no subset WowUp string (format unverified); no tracking/cookies/storage.
- Gotchas: `selectionToQuery` must NOT `encodeURIComponent` tokens, vue-router already encodes query values, so the URL became `%253A`. Accessible name of a checkbox wrapped in a label included the hint text, use `aria-labelledby` + `aria-describedby`. A button with `aria-label` keeps that name after "Copied", so test its text, not its role name. Playwright needs `networkidle` after reload before pressing keys.
- Limits: addons without Magguu profiles are install-only; single-import map is static (re-check against the addon's Setup page); matching to collections depends on names inside the collections.

## 2026-10-25 Item 5: cookieless anonymous counting

- Found: page_views/copy_events + page-view/copy-event endpoints already existed but stored raw IP and full UA, query strings and any path, with retention by setting only. Extended in place: additive `visitor` column + `stats_daily` table, hashed daily uniques, DNT/GPC, bot/admin skip, allowlists, 14-day detail retention, roll-ups, admin Routes tab + `/admin/stats/traffic`, privacy section `s7`, corrected `s4` cookie sentence.
- Decisions: privacy text as a new key `s7` (existing DBs and Marco's edits untouched; new default `s4` only applies where he has not edited it). Legacy IP/UA are scrubbed to NULL by the maintenance job after the roll-up counted their distinct IPs. Visitors = sum of daily uniques (not linkable across days). Detail charts (hourly) cover only 14 days.
- Gotchas: (1) the 5 s dedup only deleted entries every 60 s, so it must compare timestamps; (2) legacy rolled-up rows need query/admin paths filtered at roll-up time (a first run on the dev DB stored them, rows had to be deleted); (3) admin sessions are bound to browser+OS, so a second context with another UA revokes the session: reuse `page` for the admin-skip check; (4) other specs hit the same site from 127.0.0.1, so count checks use a unique referrer host; (5) `stats_daily` markers `site`/`copy-site` make the roll-up idempotent.
- Limits: /24 sharing with the same browser under-counts uniques, a restart mid-day or crossing UTC midnight over-counts; today's legacy rows lose uniques at the scrub; UTC day boundaries.

## 2026-10-25 Item 4: public website status page

- New `/status` + `GET /api/v1/status` (45 s in-memory cache), sampler plugin, tables `status_samples` (slot) and `status_daily` (day, seen, first_slot), both idempotent in bootstrap. Components: Website, Database (reuses the `SELECT 1` idea of /api/health, separate payload), Data freshness (newest published changelog date only). No SHA, version, host, port or other-service data; whitelist unit test guards it.
- Decisions: noindex + not in sitemap (stated in page code); uptime from in-process sampling only, no external probes, so a database outage cannot be stored and shows as a gap (counts as downtime, which is the honest reading); percentages floor to two decimals; windows appear only after enough history, otherwise "Collecting data". Notices extension point for item B in `server/utils/statusNotices.ts` (tested, nothing registered).
- Gotchas: deploy restarts create small gaps (at most a slot or two per deploy); `formatStatusTime` is deterministic UTC to avoid SSR/hydration mismatch; Playwright mocks `/api/v1/status` via `page.route`, which only affects client-side navigation (SSR fetch is server-side), so those tests navigate from /privacy via the footer link.
- Limits: freshness only looks at the changelog; sampler checks the DB, not the HTTP layer; first 24 h after a fresh DB show no percentage.

## 2026-10-25 Item B: admin-managed status notices and history

- `/admin/system/status` (create/edit/resolve/delete, timeline entries append-only), tables `status_notices` + `status_notice_updates` (idempotent, tested on a prod-like schema), public `/status` shows active/scheduled notices on top and resolved ones (90 days) as History with timeline. Every write: `requireAdminAccess` in the handler, audit entry (`status_notice`, redacted), `clearPublicStatusCache()`.
- Decisions: limited Markdown (no raw HTML, no images/headings) sanitized on the admin preview and again on every public read; forward-only status moves; edit cannot change status (timeline entries do); no auto-start of scheduled notices, no feed, no undo; retention 365 days for resolved.
- Gotchas: a paragraph starting with a tag is an HTML block for marked (shown whole as text), so tests that also want neighbouring links parsed keep them in other paragraphs; the audit redactor only catches URL-shaped secrets (`?token=`), not free text like `token=...`, and notices are public text anyway, so never paste secrets; `node --test` needs `--import tsx`.
- Limits: admin times local vs public UTC; notices do not alter derived component states.

## 2026-10-25 Item A: community presets (moderated visitor submissions)

- Form on its own page `/submit-preset` (linked from a community section at the end of `/strings`), because `strings.vue` is a large tab page and the form should stay independent of its state. Admin queue `/admin/strings/community`; table `community_presets` (idempotent, no IP/UA/contact data); privacy default `s8` plus an extended s7 default (saved edits untouched, merged by key). Full description in AGENTS.md "Community presets".
- Decisions: the form token is fetched by the browser after render, so its age is a real time-trap and no-JS bots never get one; it is consumed only after validation passes (a visitor can fix a typo without waiting); honeypot hits and duplicates answer like a success so the queue contents do not leak; links are refused in short fields (spam/phishing); the preset string is rejected, not cleaned, when it has hidden characters (editing it would corrupt it); the string is not editable by admins; audit snapshots omit the string; copy events reuse the allowlist with type `community` (approved only).
- Gotchas: a raw email address in the HTML is rewritten by Cloudflare obfuscation and then blocked by the CSP, so the s8 default splits it with a `<span>` (sanitize-html keeps only `class` on span); the in-memory limiters reset on restart, which is acceptable because the DB caps (200 pending, 40/day) still hold; Playwright relaxes the per-visitor limits only with `NUXT_E2E_SEED` outside production; `TRACKED_ROUTES` must list every top-level page (a unit test scans `pages/`), so `/submit-preset` is counted.
- Limits: moderation is manual (nothing is scanned inside the string; the disclaimer carries the risk statement); no notification when a submission arrives (the admin checks the queue); a deleted or pruned item can be submitted again; list capped at 100 public items.

## 2026-10-25 Review follow-up (e89e1b1..3031be6)

- A-M1: all visitor limiters keyed by the salted /64 (`anonymousRateKey`); preset form got per-/48 and per-day limits so one network cannot exhaust `DAILY_CAP`; limiter map evicts instead of refusing; beacon `rate_limits` rows pruned every minute and capped. B-M1: `secure_delete=ON` + one-time guarded VACUUM; privacy text `s9` (new key) tells that older backups may hold old IP/UA values. A-L2: `readBodyCapped` stops reading at the cap (preset form, beacons, vitals). B-L3: 100 referrer hosts/day then `(other)`, dedup key without referrer.
- Lows done: token bound to boot id (no replay across restart), honeypot answers 201, hashed rate-limit keys described in `s9`. Skipped: preset-string format check (would reject valid profiles).
- Gotchas: handler logic had to leave the Nitro-only files (auto-imports and `~` do not resolve under `node --test`); pure modules import h3 explicitly. Mutation spot check: GPC, trusted proxy, honeypot, time-trap, origin, body cap mutants are all killed. VACUUM runs once on the first maintenance after deploy (about 5 s after start); check `settings.privacy_vacuum_v1`.

## 2026-10-25 Secret-scanning alert #1 (test fixture)

- `tools/redact-log.test.sh` held literal AKIA/ASIA example ids; they are now assembled from two parts at runtime (test semantics unchanged). Repo tree has no other AKIA/ASIA-shaped literals (the regexes in `redact-log.sh`/`auditRedact.ts` are patterns, not keys). Rule in AGENTS.md. History still contains the old literal, hence the alert is closed as `used_in_tests`, not rewritten. `docker.yml` ignores `tools/**`, so this commit builds no image.


## 2026-10-25 Consent + visitor log, part 1 (flag `NUXT_VISITOR_LOG`, default off)

- Built per order: consent banner (three equal buttons, Settings toggle off by default, footer "Cookie settings" to revoke, GPC/DNT = refusal, none on /admin), `mg_consent` (6 months), consent-bound `mg_sid` (30 min) and `mg_vid` (13 months), server-side consent check per beacon, tables `visitor_sessions/hits/events`, 13-month full retention then delete (amended: NO 30-day anonymization), extended signals (utm, screen, language, time zone, entry/exit, dwell, scroll, clicks, country, city from CF headers via trusted proxies). Details in AGENTS.md "Consent and visitor log".
- Privacy gap handled with the env flag (safer than a minimal s10): production collects nothing until `NUXT_VISITOR_LOG=true` is set, to be done after part 2 (Privacy text, admin tab, CSV, live walkthrough).
- Gotchas: Playwright's `use.storageState` also feeds `browser.newContext()`, so the global "necessary only" cookie keeps other specs banner-free; `nuxt dev` has no trusted socket, so CF-header country/city is unit-only; killing a Playwright run leaves the dev server running, kill it before restarting.

## 2026-10-25 Consent + visitor log, part 2 (admin page, CSV, privacy s10-s12)

- Shipped: `/admin/system/visitors` (list, filters, expandable path, capped formula-safe audited CSV, admin-only, no viewer), dashboard Top countries/Top referrers, Privacy s10-s12 (+ s4/s7 aligned), flaky copy-click fix. Details in AGENTS.md "part 2". Marco then asked for it to go live: the flag `NUXT_VISITOR_LOG` is ON by default in code (set `false` to disable); no container change needed.
- Gotchas: `returning` is a reserved SQLite word (alias `isReturning`); h3 `send()` rejects streams, use `sendStream`; `fetch().text()` strips a BOM; the admin layout remounts content on every `route.fullPath` change, so URL sync must use `history.replaceState`; `.admin-dash__muted` has opacity 0.8, which fails AA on the light theme in tables (overridden on the visitors page); the e2e DB accumulates `unknown`-country sessions from other specs, so visitor specs filter by country; the copied list is capped at 20 (tie-break by newest numeric id).
- CI lesson (red docker `verify` at 86f0f3c): tests that read cookies right after a click raced the browser processing `Set-Cookie` (the server wrote the row first). Poll with `expect.poll(() => names(context))`; never assert cookies immediately. Docker runs are cancelled by a newer push on main (concurrency), so only the last SHA of a series gets a finished docker run.
- CI lesson 2 (red docker `verify` at 6bfeb72, four unrelated-looking e2e failures; default-on itself changed nothing, the e2e server already ran with the flag on): a cold `nuxt dev` discovered the admin editor and chart dependencies (`@tiptap/extension-link|underline|text-align`, `echarts/*`, `vue-echarts`) only when the other Playwright worker first opened an admin page; Vite then re-optimized and force-reloaded every open page, which lost key presses, beacons and axe contexts ("Execution context was destroyed"). Fix: `vite.$client.optimizeDeps.include` in nuxt.config.ts (dev only) so the warm-up leaves nothing to discover, plus waits on real state: `tests/support/hydrated.ts` (Nuxt `isHydrating === false` + networkidle), `waitForResponse` for the list/beacon, `expect.poll` for each stored row. Check after changing dependencies: compare `node_modules/.cache/vite/client/deps/_metadata.json` after the warm-up alone with the one after a full run; they must list the same packages. Verify with `rm -rf node_modules/.cache/vite .nuxt; CI=1 npx playwright test` (zero retries expected).
- Review follow-ups F1 to F9 (GPC in web-vitals, AdBanner consent gate, retention logging, GPC withdraws old yes, per-network caps, iconify prefetch removed): see AGENTS.md "Review follow-ups". Before AdSense is ever enabled add an "advertising" purpose to banner + Privacy.
- Open for the owner: Cloudflare DPA/AVV, Legal notice provider identification, stored edits of Privacy s4/s7 in Admin → Content → Pages.
- Hardening add-on (Oct 25): `scripts/mutation/` (dependency-free mutation check, 74/74 mutants killed, no survivors), `tests/unit/draftIsolation.test.ts` and `verifyDraftsNotPublic` in verify-build (drafts never in public code, public content query or the public pages' initial scripts). Admin chunks contain the draft endpoints by design; they are lazy `/admin` routes.
- CI lesson 3 (Build@70b80f5): after Accept all the session row is written BEFORE the browser processes Set-Cookie. A test must wait for the mg_sid cookie before clearCookies or a click that sends a visitor-event (event needs the cookie), and for hydration before any banner click.
- Live walkthrough lesson: `:global(...)` + `:deep()` in scoped CSS silently produced `html.light{...}` on /guide (found only on live, where the content has inline code).
- Dev-DB lesson: the server folds referrer hosts beyond 100 distinct per day into "(other)", so on a reused dev DB the counting spec failed deterministically after enough runs in one day (101 hosts). tests/support/warmup.ts now clears the dev referrer history before the specs run (CI always starts fresh).
- Visual audit (Oct 25): footer Contact `<a>` had no href in the server HTML (the mailto is set after mount); it now falls back to `/imprint`. The CurseForge icon link already had `aria-label`; a test now guards all icon-only links/buttons. Theme-switch flicker fixed with a transition-off class for the switch frames, measured per frame with Playwright (min contrast 2.94 before, >= 3 after).
- Dev-DB lesson 2: the visitor log caps sessions at 100 per network and day and every Playwright visitor shares one address, so a reused dev DB stopped recording (consent "extended signals" spec found no row). `tests/support/warmup.ts` now also clears the dev visitor tables (`resetVisitorLog`).
- Review round 3 (Oct 25): sign-in attempt addresses are scrubbed after 23 h (s9 stays true), retention before housekeeping and WAL truncate after deletions, withdrawal works with the visitor log switched off. `secure_delete = ON` was already set; the WAL was the remaining place old rows could live.
- Review round 3 (Oct 25): the visitor log is readable by role `admin` only (L9: it was "no viewer", i.e. editors too; editors are "content only"); e2e `visitors-admin.spec` proves viewer and editor get 403 on list, detail and CSV (L2; the users API creates admin/viewer only, the editor row is set in the dev DB). The CSV export writes its audit entry BEFORE any header or data and answers 500 if it cannot (L8, `recordAuditChange` throws, `recordAuditSafe` is no longer used there).
- Review round 3 (Oct 25): L5 the /guide page no longer emits dns-prefetch to curseforge/wago/wowinterface (those hosts were contacted before any click); a unit test scans pages/components/layouts/plugins/composables for dns-prefetch/preconnect/prefetch hints.
- Review round 3 (Oct 25): L7 NUXT_TRUSTED_PROXIES default is now `loopback` only (it was `private`, which believed any LAN host or container). Accepted values: literal IPs/CIDRs, `loopback`, `private` (explicit opt-in to the old behaviour), `none`. Live has `NUXT_TRUSTED_PROXIES=192.168.178.19` set (the log shows `accepted from socket`), so nothing changes there; any other deployment that relied on the old default must set it. With it unset in production one `[trusted-proxy] cf-connecting-ip from socket X ignored` warning (a public peer address is never logged) names the fix. BigInt literals in trustedProxy.ts became BigInt() calls (esbuild es2019 warning gone).
- Review round 3 (Oct 25): L10 e2e for the client-side GPC (navigator.globalPrivacyControl only, no Sec-GPC header): no banner, no cookie, no counting request (consent, visitor-hit/-event, page-view, vitals, copy-event), nothing recorded; after an earlier Accept the flag alone leaves a "no" consent cookie (the server sees an ordinary click), flag + header removes every cookie.
- Review round 3 (Oct 25): L3 Privacy s7 states `{{retention_days}}`; `fillCopyTokens` (utils/pageCopyDefaults.ts) fills it in components/PageView/Privacy.vue from the now public setting `data_retention_days`, which is exactly what deletes web_vitals (30/60/90/180). Junk values fall back to 90. In Admin → Content → Pages the editor shows the raw token; a section saved there keeps its stored text. L4 s4 now says "IP address (the full address; it is not shortened or anonymized)" and points to sections 10–12 and Cloudflare; only the code default changed, mergePageCopy lets any stored edit win, so Marco's saved text is untouched. If s4/s7 were ever saved in the admin editor, the old wording stays until he edits it there.
- Mutation check re-run (Oct 25): 75/75 killed. Six mutants no longer applied after the review changes and were re-anchored (flag check / same-origin in consentRequest.ts, untrusted peer in clientIp.ts, proxy default now 'loopback': one mutant brings back 'private', one trusts nobody).
- F1 (Oct 25, Marco): the cookieless anonymous counter stays as is (no cookie, no IP, nothing with GPC/DNT), openly described in Privacy s7. Text check: banner now says 'at most a daily-changing code that cannot be traced back to you' instead of 'no identifier' (page views keep a daily visitor hash); s7 says aggregates are kept 'up to 400 days (about 13 months)' = AGGREGATE_DAYS; 14 days and the retention token are unit-tested against the code.
- Re-review follow-up (Oct 25): NUXT_TRUSTED_PROXIES notes made consistent (live = 192.168.178.19, default loopback), login throttles documented as `rate_limits` rows (they were wrongly called in-memory). New `tests/unit/sessionCleanupRetention.test.ts`: real-schema run of the retention steps (13-month visitor log, 23 h sign-in identifiers, vitals cutoff), fixed step order, one failing step never blocks another, login thresholds pinned (IP 5, account 10, 30 s doubling to 15 min, reset 1 h), consent.post.ts/visitor-hit.post.ts wired to `withdrawVisitorRecords`. Mutation check now 82/82 (7 new: retention days, identifier hours, both thresholds, both routes, cleanup order). Privacy s9 got its own "Sign-in protection" block (counters with address + typed user name ~24 h after the last attempt; attempts log with user name/browser/OS for `{{retention_days}}` days; IP and user agent gone after 23 h); default text only, stored edits win. Skipped: client-side withdrawal entry with NUXT_VISITOR_LOG=false (needs a new disabled-state banner/footer link and a decision whether turning the flag off should auto-delete; the server already honours a withdrawal/GPC POST and the data is deleted at 13 months anyway; the flag is on by default).
- Hard time limits (Oct 25, Marco rule): all test/mutation/build runs go through process-group runners (`scripts/mutation/limited.py`, `scripts/run-limited.sh`, gate.sh steps) with SIGKILL of the group on timeout, nice 19, leftover check. Reason: a looping mutant ran 7 h because only the `timeout` wrapper was killed. Timeout-killed mutants count as killed but are shown as `KILLED (timeout)`. Self-tests in `tests/unit/mutationRunner.test.ts` (python selftest, sh helper, end-to-end looping mutant). Lesson: a nested `node --test` inside a node test inherits NODE_TEST_CONTEXT and silently runs nothing, so check.py strips it. Old orphaned node --test processes from /tmp/mutrepo (3.8 h, idle) were killed by hand.
- 2026-10-26 (Marco yes for the locked majors): js-yaml 5.5.0 released (package.json override 4.3.2 -> 5.5.0; only consumer @apidevtools/json-schema-ref-parser via eslint-typegen, JSON_SCHEMA parsing verified, gate green). @types/node 26.6.5 was already in the lockfile; its lock rule dropped from tools/magguu-drift.py. dependabot.yml: js-yaml ignore removed.
- 2026-10-26 majors: TypeScript 7.0.2 tried and reverted (`tsc` fine, but typescript-eslint throws on TS 7 so lint breaks; latest 8.72 peer still <6.1). h3 2.0.8 not possible (nitropack 2.13.5 / @nuxt/nitro-server need h3 ^1.15.11; Nitro 3 is beta). satori >=0.48 not possible without breaking nuxt-og-image 7.0.7's peer ^0.47.1. All three stay ignored in dependabot.yml with the reasons; js-yaml 5.5.0 shipped (c0e9747). Docs-drift template added under docs/templates/docs-drift/ (3 modes, tested). Lesson: the gate.sh leftover killer matched "node" inside the commit message of ship.sh and killed ship.sh; it now matches the executable name only.
- 2026-10-26 (Marco yes via Buddy): `DOCS_DRIFT_MODE=warn` set as repo variable; docs-drift.yml now the 3-mode template. Renovate: config staged as `renovate.json` (from MagguuBot's, plus locks typescript <7 / h3 <2 / satori <0.48 with reasons, overrides never automerge, constraintsFiltering strict, 7-day age), Dockerfile got the `# renovate: image=` annotation. App not installed for this repo (checked: no Renovate PRs/branches/issues; `gh api .../installation` needs app auth, 401) -> dependabot.yml untouched until Marco adds the repo to the Renovate app. Fast-path proposal in docs/ci-fast-path.md.
- 2026-10-26 (Renovate active, Dashboard #163, no config warning): dependabot.yml now `open-pull-requests-limit: 0` (security updates stay, ignore rules mirror the locks); dependabot-automerge.yml only sees security PRs; added renovate rule "overrides never jump a major" (devalue 6 deferred); removed the stale osv ignore for serialize-javascript (7.1.4 installed). Dependabot PRs #153-#162 were already merged/closed before Renovate (closed ones: satori 0.40/0.56, nuxt-og-image mix = locks), nothing to migrate. CI fast path implemented: docker path filter extended, Playwright 3 workers on CI, smoke reports pull latency (787 s measured, Unraid schedule is the long pole); see docs/ci-fast-path.md.
- 2026-10-26 (night): Playwright is sharded (2026-10-26): build.yml has `checks` (audit, lint, unit, typecheck, build, smoke) in parallel with `e2e (1/2)` and `e2e (2/2)` (`--shard=N/2`, 107 + 104 = the same 211 tests, Playwright browser cache `~/.cache/ms-playwright` keyed on package-lock). The required check `build (26, false)` is an aggregator job (`needs: [checks, e2e]`, `if: !cancelled()`, fails unless every need is `success`, so a skipped part can never pass). Its `alarm` job must list `needs: [checks, e2e, build]` (`tools/alarm-conditions.test.py`, also in pre-push and gate). docker.yml: `verify` (no Playwright) + `e2e` shards (no npm cache, publishing workflow) -> `build-and-push` needs both, the image gate stays; alarm needs `[verify, e2e, build-and-push]`. Measured: Build median 451 s -> 284 s / 240 s; docker 591 s -> 377 s. The dead `matrix.node == 24` artifact step is gone. SECURITY.md added (GitHub Private Vulnerability Reporting is enabled; contact@magguu.xyz as alternative; supported = main / latest image). CodeQL test-code alerts fixed in code (no paths-ignore): renovateConfig/statusNotices/walkthrough.live regexes. Lesson: the Quality step `tools/alarm-conditions.test.py` requires each caller's `needs` to cover every job of its workflow; after the shard split it failed on 4cbc1b8 until da7e505 set `needs: [checks, e2e, build]` (pre-push hook b81fcdc and gate now run it).
- 2026-10-27: dependabot-automerge.yml slimmed (2026-10-27, Marco yes): top-level `permissions: {}`; the fallback `merge` job and the `workflow_run` trigger are gone (it merged on Build success alone, without CodeQL, and was dead while auto-merge + required checks are on). Merge path is only `gh pr merge --auto` (GitHub waits for both required checks). Remaining job-level writes are the minimum: `enable` contents+pull-requests+issues (enablePullRequestAutoMerge needs contents:write), `post-merge-dispatch` actions (a GITHUB_TOKEN merge starts no push workflows). After 126127e the Scorecard run closed all TokenPermissions alerts (#35-#39) by itself; only #40 (Pinned-Dependencies, Dockerfile npm command) stays open. docker-scan.yml: security-events write moved from top level to the job (top level now contents: read). Guard: `tools/dependabot-automerge.test.py` (Quality step, pre-push, gate). Alerts dismissed via API: node-forge Dependabot #1 (not_used, until 2026-11-30 like osv-scanner.toml/audit-prod.mjs) and the Scorecard meta findings CIIBestPractices/CodeReview/Fuzzing/License (won't fix, solo project).
- 2026-11-02: audit:prod was red on main (5 new node-forge 1.4.0 highs via listhen, blocked the image build). Fix: override `node-forge: 1.4.2`; audit:prod 0 blocking / 0 allowlisted, so ALLOWLIST emptied (REVIEW_BY null) and the osv-scanner.toml node-forge ignore removed.
- 2026-11-02 (Marco yes): `legacy-peer-deps=true` removed from .npmrc (file stays, Dockerfile copies it). Real peer check: no ERESOLVE, no override needed. The lockfile now also holds npm's auto-installed peers yjs/lib0/y-protocols/isomorphic.js/@tiptap/y-tiptap (peers of @tiptap/extension-collaboration via @nuxt/ui; not in .output) and dedupes lightningcss (1.33 top, 1.32 nested for @tailwindcss/node) and @nuxt/fonts' fontaine/fontless/unifont. typescript 6.0.3, h3 1.15.11, satori 0.47.1 unchanged. Repo setting 'Require actions to be pinned to a full-length commit SHA' is on (sha_pinning_required=true; all remote uses: are 40-char SHAs, the only unpinned refs are local ./.github/workflows/failure-alarm.yml, which the rule exempts).
- docker.yml publish order (2026-11-02, after the Unraid gate saw an unsigned :latest for ~1 min): build-push pushes only the immutable `sha-<short>` tag (`meta-sha`), then cosign sign (keyless) + provenance attestation on the digest, then "Publish floating tags" sets latest/semver via `docker buildx imagetools create` on `@digest` and fails unless every tag resolves to that digest, then `cosign verify :latest` (identity = this repo's docker.yml, GitHub OIDC issuer). SBOM/provenance attestations from build-push stay attached to the digest.

## 2026-11-02 version bell fix
- Symptom: /admin/system/github showed local v12.1.6 vs GitHub v12.1.8 after Check; bell stuck. Cause: local came from the `addon_version` setting, seeded once by `resolveLocalAddonVersion({ persistMissing: true })` and never written by Check, the release webhook or pull (they only wrote `github_latest_version`). Fix: `recordLatestRelease` moves local to the newest tag in all three paths. After the image update one Check (or the next release webhook) clears the bell. No auth/lockout change.

## 2026-11-02 release-draft bell
- Bell said "88 unpublished changelog(s)" because Buddy keeps 88 generated rows (auto / Sync YYYY-MM-DD) unpublished on purpose. Bell and dashboard now skip them via the `version` column (`changelogKind.ts`). Live: bell gone unless a real release draft exists. Mutation check 90.

## 2026-11-02 package (Buddy, Marco "Alles machen")
- P1: nuxt 4.6.3; overrides devalue ^6.0.3, vue/@vue/server-renderer ^3.5.44, seroval ^1.7.2 (1.7.6), esbuild ^0.28.2. Renovate PR #170 (seroval 1.6.11) superseded.
- P2: Dependabot security updates off, alerts on; dependabot.yml, dependabot-automerge.yml and its test deleted (Quality, pre-push, gate.sh); renovate vulnerabilityAlerts enabled. Alerts glob #12 / minimatch #13 / deepmerge #4 dismissed not_used (build-time only via nitropack/@vercel/nft/archiver/@rollup/plugin-node-resolve and eslint, not in .output).
- P5: all 48 action pins now `uses: owner/repo@<sha> # vX.Y.Z` on one line, versions verified tag->sha via `git/matching-refs/tags` (annotated tags dereferenced). zizmor auditor ref-version-mismatch 48 -> 0; sha_pinning_required unchanged.
- P3: satori, @resvg/resvg-js and the fflate override removed (OG renders with Takumi; satori/resvg are optional peers of nuxt-og-image 7.0.7), satori lock dropped from renovate.json + test. Local prod check: og:image from the home head -> 200 image/png 1200x630 98849 B (/tmp/og-check.png). Gotcha: a local prod run needs NUXT_JWT_SECRET and NUXT_APP_SECRET >= 32 chars (NUXT_OG_IMAGE_SECRET is deprecated), else OG returns 500.
- P4: Dockerfile base node:26-bookworm-slim -> node:26-trixie-slim@sha256:e4db4c91…2c39 (26.13.0, Debian 13), renovate annotation + test follow. docker.yml build-and-push got 'Smoke image' between push of sha-tag and cosign: require bcrypt + better-sqlite3(':memory:') as --user 99:100, then a run with dummy secrets must reach Health=healthy (docker top shows uid). No docker on the VM, so the check lives in CI.
- P6: .github/workflows/issue-route.yml from MagguuBot, plus enhancement/question keywords and 404/500/lua error for bug. Secrets ESCALATION_WEBHOOK_URL/ESCALATION_BEARER present (names only). zizmor default 0; auditor shows only secrets-outside-env like the other alarm workflows.
- P7: rulesets created (none existed): main 26365194 (deletion, non_fast_forward, required checks build (26, false) + Analyze (javascript-typescript), integration 15368), tags v* 26365195 (creation/update/deletion). Bypass RepositoryRole 5 always; current_user_can_bypass=always; direct push after creation tested OK. Classic protection kept (duplicate, harmless).
- P8: AGENTS devalue (Renovate bullet), Dependabot groups/dispatch leftovers, satori lines updated.
- QA 2026-11-02: /profiles removed (301 -> /addons, preview API/utils/docs deleted; profiles API/admin kept for /strings, /configurator, sync), /contact 301 -> /imprint, error.vue in layout, mobile header above overlay, plain Light toggle, Starter group from WOWUP_STARTER_SLUGS on home + /addons, guide tags + step_1 wording + hero Download clause via exact-text init markers. Drift: avoid a literal `starter:` key in addonChipMeta.ts.
- CopyBadge: no transition-colors (off-screen in content-visibility:auto feature cards the SSR-dark -> light colour transition froze at white; axe contrast fail on / light).
- 2026-11-03: osv-scanner.toml ignores glob/minimatch/deepmerge (build-time only, fixes are majors or missing; review 2026-11-30); satori dropped from magguu-drift LOCKED, osv header and docs-drift hint texts. docker e2e (1/2) on cf7c31e: admin-content-live 401 (session lost mid-serial-run) while build.yml e2e of the same commit was green -> one rerun --failed.
- 2026-11-04: /forever area for MagguuUI x Forever (WoW Forever, EllesmereUI base): Retail | Forever nav switch (utils/productNav.ts), /forever + guide/download/strings, Coming soon until a release exists; GET /api/v1/forever/release (10 min cache, null on 404). Repo Derpsen/MagguuUI-Forever was private and empty, so no README/TOC facts yet. Strings: WowUp string read at runtime from Derpsen/MagguuUI-Forever `MagguuUI_Forever/Data/WowUp.lua` (private repo, needs the GitHub token; null → Coming soon), 11-addon list and WowUp 2.24.1+ Forever-install hint always shown.

- 2026-11-04 B: admin-content-live hardened (own API jar for the login, fresh browser context per test); cause: auth cookie lost in the shared page/API jar. A = 19db708 green, digest sha256:718bbdfa…
- 2026-11-04 hard-refactor (base dc12604): a5ffd05 audit diff -> auditLineDiff/AuditDiffLine, shadowed adminHelpers.formatBytes dropped (3 "Duplicated imports" warnings gone); 930af8d dead trendPercent + pendingCloudflarePurge (and the write-only `pending`) removed; d566cf7 unit guard tests/unit/autoImportCollisions.test.ts (utils+composables, server/utils). Baseline: gate 229/229, smoke 0, mutation 97/97. Inventory: ~/Projekte/.grok/reports/inventory-website-2026-11-04.md.

## Hard-refactor ROI backlog
Base (POINT 1 in review; see `refactor/init-split`). 2026-11-11.
1. ~~server/plugins/init.ts split~~ merged 2026-11-11 as `73a3d9d` (#174): characterization in `tests/unit/websiteBoot.test.ts`; modules `bootSeed.ts`, `bootMigrations.ts`, `bootContentMarkers.ts`, orchestrator `websiteBoot.ts`. Admin / force-reset / passkey / lockout left in `init.ts` unchanged.
2. ~~pages/strings.vue extract class/spec picker + string card~~ (this PR, `refactor/strings-components`): `StringsClassSpecPicker` + `StringsStringCard`; characterization in `tests/strings-copy.spec.ts`. Forever `/forever/strings` untouched. Next review: Code-Review, no merge from this helper.
3. Drop file-local `export` only when touching the file. ROI low.

Shipped 2026-11-09: addon chip thumbs (22ac182), configurator API swr (4474533), configurator hydration shell (03a8eaa), LazyAdBanner (d0f0b1b), LazyCommunityPresets (4ff3a8b). Bundle client JS ~2478→2479 kB (+4 chunks from code-split); /addons icons now thumb webp.

- 2026-11-04 23:5x Berlin: Polish pushed (4ba57e1..695e871): hero/download row/lightbox/nav segment/strings+community fixes/forever width. Gate green (PW 233, axe). CI cc7d420 all green, docker signed+verified, digest sha256:f8dc6bf05001daf5bb432ccd38b1fb01ce6b509a02663bb2c13aec1f7c88094e. Pull: Buddy.

- 2026-11-07 Berlin Renovate: #171 merged 999b4ea (Node 5adad64), #172 f07ccaf (login-action 4.7.0), #173 45da414 (npm non-major). All PR checks green. main docker 42419010532 green, sign+verify PASS: sha256:0496a1f7de352d8d00668544fb3590e41fbae4f3771bf720642964bb8cc77d8e. Lockfile maintenance triggered; Renovate keeps it in Other Branches without branch/PR (not changed manually). Unraid still old cc7d420/f8dc6bf at first check; no manual pull. Public GET smoke /, /admin/login, /api/v1/catalog-summary, /api/v1/status 200; authenticated 6-route smoke not performed (login required). No code fixes, no locked major changes.

- Post-push e27cdc1: Unraid auto-pull confirmed, revision 45da414 healthy; live RepoDigest sha256:0496a1f7de352d8d00668544fb3590e41fbae4f3771bf720642964bb8cc77d8e. Post-pull public GET smoke 4/4 HTTP200. Full authenticated admin smoke remains untested. Lockfile maintenance no PR after Renovate request.

## 2026-11-08 MagguuUI release

- MagguuUI addon live **v12.1.9** (tagged 2026-11-08): Retail and WoW Forever in one package with one shared changelog. CURRENT_ADDON_CHANGELOG is v12.1.9; v12.1.8 moved to PREVIOUS_ADDON_CHANGELOGS.
- Website live 2026-11-09 Berlin: `sha-917b07b` (Forever one-package `c6320e1` + QoL docs). Digest live `sha256:49572a16…` (matches `:latest` / `:sha-917b07b`). Prior `c6320e1` docker failed (incomplete e2e); `917b07b` docker green + auto-pull. Public /forever* shows Smart Tab QoL, no Coming soon, no Zygor/RXP.
- Forever product truth: MagguuUI one-package + Camelot WowUp (5+8). Website `c6320e1` reads Camelot WowUp.lua from MagguuUI. Forever Magguu Settings (Smart Tab, keybinds, Boost, BigWigsStyle, MapNotes) documented 2026-11-09 from MagguuUI main portable EUI; Zygor/RXP internal only.

- 2026-11-09 Berlin: A) Dependabot #14 minimatch: override 11.0.1 breaks eslint-plugin-import-x (no makeRe); left osv ignore GHSA-g3hv-75wg-m249, no parent major. B) `c6320e1` Forever one-package + Camelot WowUp (5+8); Gate 0, mutation 97 killed. CI: Build/CodeQL/Quality green; docker #42672840649 FAIL (only verify+e2e 2/2, no build-and-push/digest — left alone). Docs-drift FAIL unclear. Live still 5c6faa4 / digest 2ab45ef… Forever QoL public copy (Smart Tab, keybinds, Boost, BigWigs styles, MapNotes) + AGENTS/MEMORY + product-facts skill; Zygor/RXP public-tree free; forever.spec 9/9.

## 2026-11-11 News scaffold

- Public `/news` + `/news/[slug]` (SSR), RSS `/news/feed.xml`, sitemap + Takumi OG + NewsArticle JSON-LD. Admin `/admin/content/news`. Schema and seed rules: `docs/news.md`. Author is always Magguu. Pouch-of-violet-dust seed stays unpublished until someone publishes it after the 2026-11-13 01:30 Europe/Berlin drop cutoff.

## 2026-11-11 Meta UI (PR C)

- Public /meta UI on top of the A/B snapshot APIs. Docs: `docs/meta-ui.md`. NUXT_ADS default off (no AdSlot markup). Author of news stays Magguu; this PR does not touch /news.

## 2026-11-12 Meta UI #185 shipped — Code-Review LOWs for later

- Squash-merged #185 as `f82b659` (`feat(meta): add public /meta UI (#185)`). Live after autoupdate: shortSha `f82b659`, digest `sha256:a2665088cecbe233c3cb13ec96fdd4c97a3ff22dc34ee67e5da81532dbc3cba6`, cosign PASS. Empty snapshot: `/meta` and `/meta/mage/fire` show “Collecting data.” No AdSlot markup live (`NUXT_ADS` off). `/meta` stays out of the sitemap. Do not start C2 yet.
- Code-Review LOWs to pick up later (not in this commit):
  - Add a CI job that runs `tests/meta-ads.spec.ts` with `NUXT_ADS=on` (sidebar slot at xl, ≥150 px from the copy control). Default CI still leaves ads off.
  - `scripts/verify-ads-runtime.mjs` must be able to start production standalone, so it needs `NUXT_ADMIN_PASSWORD` (and the other required prod secrets) when it is not invoked after `verify-build.mjs`.
  - The raw `NUXT_ADS` string must not ship in the client payload; expose only a boolean (`nuxtAdsEnabled` / `useNuxtAdsEnabled`).
  - The ads runtime/verify script should also check that slot markup is present when the flag is on and absent when it is off or empty.
  - Google CSP entries in `server/utils/htmlCsp.ts:37-38` belong to PR D (AdSense), not C.

## 2026-11-12 Meta C2 started

- Branch/PR C2: own `/meta` tooltips (DoD 3.08), Lighthouse budgets for `/meta` and `/meta/mage/fire` against the fixture (DoD 6.01 / 14.07). `/meta` stays out of nav, sitemap and footer until that budget is green in CI. Do not start AdSense/PR D.
- Cheap Code-Review LOWs from the #185 note, included here: client payload is a boolean (`nuxt-ads-enabled`), not the raw `NUXT_ADS` string; `scripts/verify-ads-runtime.mjs` supplies a dummy `NUXT_ADMIN_PASSWORD` when unset, seeds the fixture, and checks AdSlot markup on / off; `e2e-ads (NUXT_ADS=on)` job in `build.yml` runs `tests/meta-ads.spec.ts` (not part of the required aggregator; listed in the failure-alarm `needs`).
- Still later / not C2: Google CSP entries in `server/utils/htmlCsp.ts:37-38` belong to PR D.

## 2026-11-12 Meta C2 TBT cut (no budget loosen)

- `/meta/mage/fire` mobile TBT was 381 ms vs the 320 budget. Real work, not a looser budget: the spec page SSR-renders heatmap, gear and tooltips, then hydrates that below-fold island only when visible (`LazyMetaSpecBelowFold` + `hydrate-on-visible`).
- `useMetaTone` class tokens (and below-fold inline colours) now include light + `dark:` / CSS-variable pairs so an unhydrated island stays contrast-safe once `<html>` is light. Tooltip e2e scrolls `#talents` and waits for `[data-meta-below-fold][data-hydrated=true]`.
- `/meta` still stays out of nav/sitemap/footer until this budget is green in CI on #190. Budget numbers unchanged.

## 2026-11-12 Meta C2 nav after green budget

- After the TBT cut, CI Lighthouse on #190 (`27e1408`) had no budget warnings on `/meta` or `/meta/mage/fire` (fire mobile TBT ~126 ms vs 320). Pre-existing advisory misses remain on `/` mobile LCP and `/changelog` desktop CLS. `/meta` is now in the Retail header, footer and sitemap (index only). Budget file unchanged. Do not merge until asked.

## 2026-11-12 Meta C2 Code-Review follow-ups (#190)

- Gear tooltips: `truncate` moved off the `MetaTooltip` root onto an inner label span so the panel and focus ring are not clipped. e2e covers a secondary gear trigger at 390 and 1280 px, plus Escape on a hover-opened panel (WCAG 1.4.13).
- `/meta` Lighthouse budgets now match DoD 6.01 and are a hard gate (`tools/lighthouse-budget.mjs` exits 1 on a /meta miss). `/meta` desktop CLS 0.033 was a wrap in the index hero/class picker, not a looser budget. Baseline: `docs/meta-lighthouse-baseline.md`.
- Cheap LOWs: seed script refuses to run in production outside CI; `e2e-ads` is in the required `build (26, false)` aggregator.
- Pre-existing, not this PR: with JavaScript off, the H1 can be white-on-white on a light page (and under `prefers-color-scheme` / system) on `/guide`, `/faq` and `/news` — `MetaShell` / `useIsDark` still SSR the dark text classes until mount. Follow up separately; do not fold it into C2.

## 2026-11-12 Meta C2 Code-Review pass 2 (#190)

- `MetaHomeHero` "Last update" used `truncate whitespace-nowrap` in a 2-col cell, which clipped the timestamp below ~500 px. The Updated stat is now `col-span-2` with a `title`, and e2e at 390 px asserts the full string is unclipped. Desktop `/meta` CLS must stay under the 0.03 DoD cap (do not bring back the 4-col wrap).
- Cheap LOWs: baseline numbers taken from Lighthouse run 43148115810 (median of 3; `/meta` mobile TBT 178 ms, 22 ms under the 200 ms cap). Seed guard runs before any `server/database` import and requires `NUXT_ALLOW_META_FIXTURE_SEED=true` in production (`CI=true` is not a bypass). Web-vitals flush listeners register immediately; only the library import is deferred. Gear tooltip e2e walks every `#gear` trigger, not `.first()`.
- Keep the `/meta` script gate. Do not add the Lighthouse workflow to GitHub branch protection. A gear tooltip near the viewport bottom may flip; left as-is, not changed in this pass.

## 2026-11-12 no-JS H1 contrast

- With JavaScript off (or before `useIsDark` mounts), public page H1s still got `text-white` while `html.light` or a classless document used a light background. CSS now colors `.public-shell h1` as `#0f172a` unless `html.dark` is present. Covered by `tests/nojs-h1-contrast.spec.ts` (site scripts blocked at the network, `html.light` forced, axe color-contrast on `/guide`, `/faq`, `/news`).

## 2026-11-12 Code-Review follow-ups after #193 / #190 / #192 ship

- Real no-JS state is still whole-page white-on-white (axe `/faq` 20 nodes to `/` 113 nodes). #192 only keeps public H1s readable under `html.light`; the rest of the unhydrated light page remains a later follow-up.
- #190 LOWs still open: document a minimum run count for the Lighthouse median, refresh baseline doc numbers, and extend the unclipped timestamp e2e beyond only 390 px.
- #192: dark markdown H1 is slightly brighter than before (`html.dark .public-shell h1 { color: #fff }`). Follow up if markdown heading contrast looks off.

## 2026-11-12 #191 Code-Review pass (heap abort tests)

- Concurrent abort test now trips the heap guard only once, then returns to a normal (safe) reading, so later workers have to honour abort checks and `Promise.allSettled`. It also counts fetcher calls after abort (must be 0) and re-reads both staging tables after 1.5 s (must stay empty). An external `abortController.abort()` mid spec-phase throws before assemble so a partial snapshot cannot be promoted as `ok`.
- Left for later (reviewer LOWs, not this pass): a cross-process clear-all of leftover staging; convert the playable-specialization `Promise.all` to the same abort-aware pool; add a mutation that is equivalent to dropping the lock-start clear-all.

## 2026-11-12 #191 shipped — leftover follow-ups

- Icon-phase abort (`server/utils/blizzardMetaSync.ts` after the item/spell icon pools, ~:672-685): an external abort mid icon fetch can still apply a partial icon map and promote the snapshot as `ok`. Add the same cheap throw as after the spec pool (`if (syncAborted(abort)) throw`) after both icon pools, plus a unit test.
- Lighthouse `/meta` (and `/meta/mage/fire`) mobile TBT baseline is about 146-185 ms against a hard budget of 200 ms, so there is little margin on slow runners. #191 CI failed three times on that flake (TBT 238-283 ms). Follow up: retry the LH job or add margin for slow runners — do not loosen the budget casually.

## 2026-11-12 Redesign PR 1: design system + shell

- Marco (via Buddy, 09:22): the public site is too inconspicuous; wants a modern, premium, clearly visible redesign (light + dark, AA, Lighthouse budgets kept, mobile first, English copy, brand and content stay). Five PRs: (1) design system + shell, (2) Home, (3) Guide/Strings/Addons, (4) Meta/News, (5) Admin. Screenshots before/after per step live on the box under `/workspace/web-redesign/pr1-before` (live site), `pr1-before-local` (main build with the fixture DB; use this for diffs) and `pr1-after`.
- No recent "top sites" inspiration list could be found (repo, VM, box workspace), so the references are Linear / Vercel / Raycast-class product sites: dark-first, tight heavy display type, hairlines instead of boxes, one accent bloom, no icon-box cards. Design docs: AGENTS.md "Design system (public site, redesign PR 1 of 5)".
- Built: `assets/css/tokens.css` (public-shell tokens, light + dark, AA-tested by `tests/unit/designTokens.test.ts`), `assets/css/ui.css` (shell surface, `.mg-*` base components), new header (xl breakpoint, wordmark, segmented Retail | Forever, pill nav with `aria-current`, 44 px CTA), mobile menu sheet, four-column footer (same links, grouped), static teal/sky bloom + masked hairline grid behind the first screen, fluid type scale (`.mg-display`, `.mg-h1`, `.mg-h2`) applied to every page H1 and `.home-h2`. Page column widened from 64rem to 72rem inside the shell (`--container-5xl` remap). Removed dead public CSS (grid overlay, quick card, footer-link-stack, header backdrop, progress bar, brand mark, nav shell, status chip, feature card, heading glow).
- Gotchas: the header nav moved from lg to xl (the Retail | Forever switch and seven links do not fit 1024 px); `.public-shell::before/::after` are now the atmosphere (they were `content: none`); a `loading="lazy"` image below the fold made `tests/meta.spec.ts` `waitForImages` hang (footer logo is eager now; keep new footer/shell images eager); `META_TEXT_BG_*` constants still describe the old page colours (only gain contrast, re-point in PR 4); ConsentBanner/WhatsNewBanner still use `#0b1118`.
- Shared checkout: another workstream used `~/Projekte/MagguuUI-Website` (branch `feat/meta-manual-cli`) while this PR was built, so the redesign work runs in the git worktree `~/Projekte/MagguuUI-Website-redesign` (node_modules hard-linked, `git worktree remove` when the PR is done). Never switch branches in the main checkout while another branch has uncommitted work.
- Local e2e inside `guarded-run` needs `--ro ~/.cache/ms-playwright --env PLAYWRIGHT_BROWSERS_PATH=/home/Magguu/.cache/ms-playwright` (the sandbox has no network and hides `$HOME`); the build and the unit tests need only `--heavy`.

## 2026-11-12 Redesign PR 2: bold Home + shell follow-ups

- PR 1 (#195) merged as `d6c5178`; live check after the Docker publish: autoupdate pulled it (`magguu-pull website --dry-run`: live digest = remote digest `bd3697e9a79d`, cosign PASS for it and the rollback target), `/api/health` build.sha `d6c5178`, GET smoke 200 on `/`, `/admin/login`, `/api/health`, `/guide`, `/news`, `/meta`, `/meta/mage/fire`. Live screenshots: `/workspace/web-redesign/pr1-live/`.
- The empty "In game" boxes in the PR 1 "after" screenshots were a capture artefact (full-page shot before the lazy images below the fold loaded), not a regression: the live page loads all three screenshots (`imgcheck.mjs`). `shots.mjs` now scrolls and waits for images; `pr1-after/` and `pr2-before/` were retaken with it.
- Marco wants the Home to be clearly bolder than PR 1 ("looks almost the same"): see AGENTS.md "Home (PR 2): the bold version". Lighthouse on `/` mobile: the LCP element is the consent banner text (Render Delay after hydration, the hero image is not the LCP), so the `/` mobile LCP (about 4.85 s, advisory budget 4.8 s) is unchanged by the redesign; do not add anything above the fold.
- Axe flags nothing for the gradient-filled H1 (both gradient ends are AA text colours); keep that in mind before adding more `background-clip: text` headings.
- Code-Review LOWs of #195 fixed in this PR: ad-region margin only with a rendered ad, no-JS `<details>` menu 1024-1279 px, hamburger `aria-expanded`/`aria-controls`/scroll lock/focus return, skip-link contrast, flat shell for the admin preview frame, header exactly 56 px.

- Code-Review on #196 (`0758b3e`, Changes): MEDIUM 1 fixed (`.home-split`/`.home-addons` `minmax(0, 1fr)` + `min-width: 0`; e2e now checks the bounding rect of every element at 320/360/390 because `overflow-x: clip` hides overflow from `scrollWidth`). MEDIUM 2 fixed by self-managing the fonts (`assets/css/fonts.css`, `font-display: optional`, preload plugin, metric-matched fallbacks): throttled 320 px CLS 0.1756 (once 0.3760) -> 0.0000 over 8 runs; Lighthouse unchanged within noise (`/meta` mobile 83, `/` mobile 75 / TBT 111). Finding: the old `@nuxt/fonts` npm provider only ever emitted weight 400, so all bold text site-wide was synthetic bold; the real 600/700/800 faces now render (slightly different glyph widths, e2e and screenshots re-checked). LOW fixed: the menu closes when the viewport reaches 1280 px. New unit tests and 7 mutants (reduced-motion guard, gradient end colour, scroll lock, focus return, breakpoint close, unmount release).

- #196 merged as `0e356dc` (Code-Review Ship at `64a24fa`). Follow-ups for PR 3 (Code-Review LOWs): (1) all five font preloads (`plugins/font-preload.ts`) go out on every page (`/` 95.8 KB of fonts vs 34.5 before, three unused on `/admin/login`): make the preload per route. (2) `@nuxt/fonts` is still a transitive dependency of `@nuxt/ui` and is only neutralised for our two families by `provider: 'none'` (`nuxt.config.ts:190-196`); the comment at `nuxt.config.ts:19` is stale, fix it. (3) Real weights replace the synthetic ones: 500 renders as 400 and 650 as 700, which changes the look slightly (check against the design intent). (4) The `local()` metric-matched fallback faces do not apply on Android (no Arial/Segoe/Helvetica there), so the CLS guard relies on `optional` + preload there.


## 2026-11-12 manual Meta CLI (this PR)

- Protected manual trigger is a CLI in the image (`.output/server/meta-sync-cli.mjs`), not an admin API and not `/_nitro/tasks`. Unraid & Server: `docker exec -it MagguuUI node .output/server/meta-sync-cli.mjs` (`-it` so Ctrl-C reaches the CLI). A `docker stop` of the container does not SIGTERM an exec process, so the lock can stay held for up to 50 minutes. Do not fire until this PR is merged and autoupdate has pulled the image. CI smokes the binary in the PR image build (`docker-scan.yml`, `docker run --rm scan-target:latest node .output/server/meta-sync-cli.mjs`) and in the main `docker.yml` smoke (`docker exec smoke …`), with no Blizzard credentials, expecting exit 4 and `status: "skipped"`.
- The nightly lock is now a SQLite row (`meta_sync_lock`, owner token + TTL / deadline, atomic `BEGIN IMMEDIATE` acquire, release in `finally`). TTL is the 45-minute job deadline plus a 5-minute grace so a winding-down run cannot be overlapped at the deadline. Nightly and CLI share it; a second process exits 2 with "A Meta update is already running". `kumaStatusForMetaRun('locked')` is `down`. Staging clear at run start only drops tokens older than the lock TTL (and orphan spec rows); this is the earlier Code-Review cross-process clear-all LOW.
- CLI reuses `runScheduledBlizzardMetaSync` (force=true so it can run when `NUXT_META_NIGHTLY` is off; credentials still required). JSON summary + exit codes 0/1/2/3/4. SIGINT/SIGTERM abort the in-flight sync, release the lock in `finally`, and exit non-zero. Separate process next to the server; strips inherited `NODE_OPTIONS` 640 and re-execs at 256 MB; peak memory is server plus CLI.
- Cheap LOW taken here: throw `Meta nightly aborted` after the item/spell icon pools so an external abort mid icon-phase cannot promote a partial snapshot (`tests/unit/blizzardMetaSync.heap.test.ts`).
- Left for later: convert the playable-specialization `Promise.all` to the same abort-aware pool.
- Left for later (Code-Review after Ship): SIGTERM during a token fetch takes about 13.3 s because `blizzardHttp.ts:142` and the retry sleeps do not take an `AbortSignal`. Kuma should treat `locked` as pending / no push rather than `down`; `kumaStatusForMetaRun` also has a redundant return at `metaKuma.ts:45-48`.

## 2026-11-12 CLI heap / process-local guard

- Live fire of `1228b66` / digest `89450d5d` (12.11.2026 10:31 UTC): CLI exit 1 after 15.6 s, `specsWithData=0`, `http429=0`, `peakRss≈653 MB`, `peakHeap≈550 MB`, guard "565.4 MB of 85 % of the 664.0 MB limit" before any spec. Container 768 MB, `NODE_OPTIONS=--enable-source-maps --max-old-space-size=640`. CI skip-smoke on the same image was ~72 MB RSS / ~10 MB heap at start. Report: `/mnt/user/NAS/Backup/homelab/20261112-meta-sync/REPORT.md`.
- Evidence: `memory.peak=805675008` (at the 768 MB cap) with `memory.events max=1330` and no OOM kill; docker stats at t+2 s was only 310 MiB / 768 MiB (later growth). Live DB is 1.7 MB, so this was not "load the snapshot". The bundle already used `process.memoryUsage().heapUsed` vs V8 `heap_size_limit` (~664 MB with a 640 cap). Root cause: the CLI inherited the website 640 MB heap as a second process in a 768 MB cgroup, so the two processes could not both fit; the guard then tripped at 85 % of that inherited 664 MB limit. Expected peak for a lean sync is ~100–150 MB heap / under ~250 MB RSS, which is why start-of-run CI figures looked "implausible" next to the 550 MB abort.
- Fix: wrapper re-execs with `--max-old-space-size=256` (`NUXT_META_CLI_HEAP_MB`); job entry lazy-imports the DB/sync modules; `readProcessMetaMemory()` is process-local only (mutant: cgroup `memory.current`); JSON peaks include `heapLimitBytes`; CI smoke (and main docker smoke in a 1 GB container that still has `NODE_OPTIONS=640`) fails if start RSS ≥ 150 MB or start heap ≥ 50 MB.
- In-process admin trigger: not used. It would share the website heap and could OOM the server; the CLI stays, no auth/passkey changes.
- Code-Review on #197 (after 12b3b93): wrapper forwards SIGTERM/SIGINT and waits (exit 128+n on child signal; spawn errors exit 1); heap guard is 70% of min(old-space, V8 limit) and also runs every 32 groups inside a board; candidates are hard-capped at 32 000 (batch evict by runs/key). CLI default heap stays 256 MB (`NUXT_META_CLI_HEAP_MB` clamped 64–512, not a fallback): 70% of 192 MB (134 MB) is too close to the EU pre-spec mid-run peak (129–135 MB). The Unraid container Memory is 1 GB (template ExtraParams `--memory=1g --memory-swap=-1` matching live (unlimited swap cap is intentional), plus `NODE_OPTIONS` 640). The CLI prefers process.execve (no wrapper RSS). Typical website RSS 150–200 MB + CLI 200–240 MB fits easily. Worst case, a website already at its 640 MB cap (RSS often 700–800 MB with native addons) + CLI 200–240 MB is about 0.90–1.04 GB, tight against 1 GB; do not fire the CLI then. The in-process website nightly keeps the 85% trip (544 MB of 640); only the CLI uses 70%. Candidates are per-spec top-N by best (default 800), with pre-trim population/key-level counters and a `dropped` summary field.

- Allocator of the 15.6 s / 565 MB abort (read-only report + code + fixture, no live fire): sync.log has no phase marker, only the guard message and `specsWithData=0`. The first `runGuards` is at the start of each leaderboard job, so an abort after ~15 s at 40 rps / 16 concurrency is mid leaderboard ingest (token + 5 tiny index calls, then `/mythic-leaderboard/{dungeon}/period/{period}`), before playable-specialization and before any profile. Indexes are tiny (season/period/board index; connected-realm index is tens of KB for ~267 EU hrefs). Each CR/dungeon/period board is capped at 500 `leading_groups` (Blizzard 2018 / Raider.IO); a production-shaped 500-group JSON is 0.84 MB. 16 in-flight boards are ~20 MB parsed. The live retain was the per-player `Map` of objects built during ingest (and unused `runsSeen` / `specRuns.levels` on the pre-fix path): an EU-scale fixture (267 realms × 8 dungeons × 3 periods, mixed 500/150/40 groups, 166 400 unique players) held ~440 MB after forced GC for that Map (JSON of the same data is 16.7 MB). A compact parallel-array table keeps the same 166 400 players at ~68 MB live / 126 MB peak under `--max-old-space-size=256`. After trim to `maxAttemptsPerSpec` (16 000 rows) and drop of the table, live heap falls to ~13 MB. playable-specialization is sequential (~40 small static docs); not the 565 MB allocator. Item/spell media is after the spec phase. `Math.min(...allKeyLevels)` on ~166k entries would stack-overflow and is now a loop.
- Left for later (unchanged): SIGTERM during a token fetch is still slow (no `AbortSignal` in `blizzardHttp.ts:142` / retry sleeps). Kuma `locked` → pending/no push and the redundant return in `metaKuma.ts:45-48`. Playable-specialization `Promise.all`.

- Code-Review on #197 (after 0280884): killed the remaining mutants (remove Meta ingest dropped warning, remove summary.dropped, Unraid NODE_OPTIONS Default=768). docs/meta-nightly.md no longer says the CLI inherits 640; AGENTS.md states the 70% CLI / 85% website trip and that the wrapper strips 640 and re-execs at 256. evictSpecTo is gone (swap-pop invalidated row ids). SpecCutoffHeap is a lazy min-heap keyed by realm/name (nodes only on insert, not every score update). mergeMetaSyncCaps does not overwrite a legacy maxCandidates with the per-spec cap. Dropped the duplicate readMaxOldSpaceSizeMb re-export and the leftover void META_SYNC_CLI_HEAP_APPLIED. --memory-swap=-1 stays and is documented as intentional. Mutation total deadline default is now 1200 s so all 118 mutants finish (840 s stopped after 105).
- Merged origin/main (`0e356dc` / `ba72229`, redesign PR 2) into `fix/meta-cli-heap-process` (merge, not rebase). Kept both sides of AGENTS.md and MEMORY.md. `scripts/mutation/mutants.json` now has 125 unique mutants (118 from this branch plus the 7 home/menu mutants from #196).
- Code-Review on #197 (after 35a2cb6): added a unit test that improves the current heap-top player and then fills the spec past the cap, and asserts survivors against an uncapped brute-force top-N (kills the `if (false)` stale-refresh mutant in `peekLiveWorst`). `caps.maxCandidates` was never read by ingest, so the unused global field is removed from `MetaSyncCaps` / `mergeMetaSyncCaps` (eviction stays per-spec; `META_SYNC_DEFAULT_MAX_CANDIDATES` remains a 40 × 800 alias). `evictTo` has an iteration bound so a no-op evict cannot hang. Equivalent mutants, no action: `worse()` tie by runs (`SpecCutoffHeap.worse`, formerly :380-382), `>=` in `beatsCutoff` (formerly :498), `pop` on a dead key in `peekLiveWorst` (formerly :474), and `evictWorst` without `pop`. Mutant count is 126.

- #197 squash-merged as `5f0cd1681c93ce123d3f4aaad16a64a49c08e112` (Code-Review Ship at `a42e419`). Image `ghcr.io/derpsen/magguuui-website@sha256:447a617772d37eb8a24032192b338f70fb0269f9314035bf300fa343d398f144` (cosign PASS, autoupdate). Do not fire the manual CLI until Unraid & Server runs it on this image.
- Code-Review LOWs left as follow-ups (not in #197): (1) `evictTo` iteration bound is untested — mutants that halve the bound or never throw would survive. (2) `META_SYNC_DEFAULT_MAX_CANDIDATES` is a dead alias (40 × 800) used only in `tests/fixtures/blizzard-meta/runPreSpecHeap.ts:100` and `tests/unit/blizzardMetaSync.prespec-heap.test.ts:34` (the measure type / probe JSON), not by ingest.
