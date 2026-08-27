# Repository Memory

## Overview

- Project: `MagguuUI-Website`
- Stack: Nuxt 4 (caret ^4.4.8; lock may resolve 4.5.x), Vue 3.5, TypeScript 6, Nuxt UI 4.10, Tailwind CSS 4.3 (CSS-first), Drizzle 0.45, SQLite via `better-sqlite3` 12 (WAL, busy_timeout=5000), Node 24, nuxt-og-image 6 with Satori. Validation: Zod. Lint: Nuxt ESLint Flat Config (no separate Prettier).
- Deployment: Docker on Unraid — image built by `.github/workflows/docker.yml` and published to GHCR; Unraid pulls via *Check for Updates* → *Apply Update*
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


## Design

- Marco's direction for the public home: clean and clear — primary CTA **Install & Setup** (`/guide`), secondary **Import Strings** (`/strings`). Little glass/motion; no hero fade-in or bounce scroll cue.
- Brand palette (public): Ellesmere teal `#0CD29D` is **primary** via `--color-brand-*` (hover/pressed `#0AA882` / `#088F6F`). `--color-ellesmere` aliases brand-400. Backgrounds are charcoal/near-black — not navy-blue brand dominance. Old Magguu blue is demoted; admin keeps its own accent tokens (light touch only if shared tokens force it). Admin brand marks use `/logo.png` (same as public).
- Home copy stays factual about EllesmereUI (native module, `/mui` 4K setup, optional BigWigs / Northern Sky, Smart Tab, Quick Focus, audio switcher). Seed defaults live in `server/database/defaultContent.ts` (EN + DE).

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
- OG default: `components/OgImage/MagguuOg.satori.vue`

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
- OG images: Satori templates need a `.satori.vue` suffix. Site-wide default is `components/OgImage/MagguuOg.satori.vue` (`nuxt.config.ts`).
- GitHub webhook `server/api/v1/webhooks/github.post.ts` accepts signed events only from the configured repository, imports main pushes from the immutable after SHA, and handles `CHANGELOG.md`, `MagguuUI.toc`, and `Data/*.lua` independently. Manual pulls resolve main once and fetch the complete Data directory at that SHA.
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
- Imprint page no longer shows raw placeholder tokens like `[Your Name]`; it falls back to a controlled contact notice until full details are configured.
- Shared seeded content now lives in `server/database/defaultContent.ts`, which reduces drift between startup init and manual seed flows.
- Standalone `db:seed` now bootstraps schema/tables via `server/database/bootstrap.ts` before inserts, which aligns fresh seeding with normal app startup.
- About, FAQ, Privacy, Guide, Strings, and Changelog pages now use safer shared public title helpers and settings-driven fallbacks for branding/contact metadata.
- Public page SEO canonical/meta handling is now shared through `composables/usePublicPageSeo.ts` for About, FAQ, Privacy, and Imprint.
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