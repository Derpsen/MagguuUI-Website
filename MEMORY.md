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

- EllesmereUI TOC min **9.0.6+**; **live 9.2.9**; Magguu bake is **dump-based**; notes track **v12.1.8**.
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
- Home copy stays factual about EllesmereUI (native module, `/mui` Apply Magguu profiles, Magguu Settings overlay/QoL, Load profiles activate-only, optional companions, Skinning NAMES & COLORS DualRow for two-tone unit-frame and party/raid names (default + class color) plus class-colored keybinds — no EXBoss split, party/raid item level, Smart Tab, Quick Focus, audio switcher, Boiling Point, Targeted Spell Bars). Magguu does not join, leave, or hide Services. Seed defaults live in `server/database/defaultContent.ts` (EN + DE). Known-stale seed claims need a `LEGACY_*` marker in `server/plugins/init.ts` or `NUXT_SYNC_SEEDED_CONTENT=true`. Public pages prefer Magguu/MagguuUI naming and product addon names — no foreign person/author credits. Never bake/dump/recapture on public pages.

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
- Required production env: `NUXT_JWT_SECRET`, `NUXT_ADMIN_PASSWORD`. Optional: `NUXT_GITHUB_TOKEN`, `NUXT_WEBAUTHN_*`, `API_BEARER_TOKEN`, `NUXT_OG_IMAGE_SECRET`. See `.env.example` and `docs/env-vars.md`.

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
- `/imprint` is now the **Legal notice** page (2026-10-12): "MagguuUI is a free, non-commercial project operated from Switzerland." + `<ContactEmail>`. No §5 TMG, no name, no postal address. Follow-up: `imprint_*` settings + `Germany` default removed from defaults/admin UI/public API; `server/plugins/init.ts` deletes leftover `imprint_*` rows on boot.
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

- MagguuUI addon live **v12.1.8**.
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
- Addon live v12.1.8. "Split names" options are becoming "Two-tone unit-frame names" / "Two-tone party and raid names" (MagguuUI PR #30; `SPLIT_NAMES` keys unchanged): half the name in the default color, half in the class color.
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
- Build info: Dockerfile `GIT_SHA`/`BUILD_TIME` args -> env; admin dashboard
  shows `Live: <sha7> · built <UTC>` (fallback `dev`) via
  `/api/v1/admin/system/build`.
- CI: weekly `lighthouse-live.yml` (Mon 05:17 UTC, artifact + summary);
  `build.yml` has an experimental Node 26 matrix entry (continue-on-error; superseded 2026-10-16: CI is Node 26 only).

## 2026-10-14 Queue A–J ("Website", direct to main)

- A RUM: `plugins/web-vitals.client.ts` (idle import, public only) → `POST
  /api/v1/vitals` (text/plain beacon, 30/min/IP, tracking setting) →
  `web_vitals`; admin p75 table `/admin/system/vitals`.
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


- 2026-10-14: Private-repo link sweep for Derpsen/MagguuUI (mapping CurseForge / /changelog / /about#contact), idempotent DB migration in init.ts, link check treats store 403 as OK.

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
- cf-connecting-ip is trusted only from `NUXT_TRUSTED_PROXIES` (default `private`). The live container is directly reachable on the LAN (checked from the VM: `http://192.168.178.21:3000/api/health` returned 200). No env change is needed for production to keep working; pinning the cloudflared IP is optional hardening.
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
