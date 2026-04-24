# Repository Memory

## Overview

- Project: `MagguuUI-Website`
- Stack: Nuxt 4, Vue 3, TypeScript, Nuxt UI v4, Tailwind v4, SQLite (`better-sqlite3`), Drizzle ORM
- Deployment: Docker on Unraid — image built by `.github/workflows/docker.yml` and published to GHCR; Unraid pulls via *Check for Updates* → *Apply Update*
- Repo contains the public website, admin panel, and Nitro/API backend in one app

## Important Paths

- Docs: `README.md`, `CLAUDE.md`, `MEMORY.md`
- Frontend: `pages/`, `components/`, `layouts/`, `assets/css/main.css`, `composables/`
- Backend: `server/api/`, `server/utils/`, `server/plugins/`, `server/middleware/`
- Database: `server/database/index.ts`, `server/database/schema.ts`, `drizzle.config.ts`
- Deployment: `Dockerfile`, `.dockerignore`, `.github/workflows/docker.yml`, `unraid/magguuui-website.xml`
- Verification: `scripts/verify-build.mjs`

## Collaboration Notes

- The user explicitly allows and encourages parallel work with subagents when helpful.
- It is safe to delegate bounded analysis or implementation subtasks to subagents without re-asking each time.
- Keep using subagents for parallel repo analysis, validation, and isolated implementation work when it speeds up progress.

## Architecture Notes

- Admin routes run with `ssr: false` in `nuxt.config.ts`.
- Auth is hybrid-compatible: login still returns a JWT in the response body, but the admin client restores primarily from HttpOnly cookie + session restore.
- Session tracking and persistent rate limits are stored in SQLite.
- Startup seeds admin, guide, and FAQ data; forced guide/FAQ code re-sync is opt-in via `NUXT_SYNC_SEEDED_CONTENT=true`.
- DB structure is still defined in both manual SQL bootstrap logic and the Drizzle schema.

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

## Visible Risks

- DB schema ownership is still split across raw SQL bootstrap logic and Drizzle schema definitions.
- The admin client is closer to cookie-first auth, but still keeps some JWT compatibility logic in memory.

## Operational Notes

- Runtime data lives outside Git in `data/` and `uploads/`.
- Image tags are built and published by GitHub Actions on push to `main` and on `v*` tags; Unraid template pulls the published image.
- Container intentionally runs as root because of the current Unraid volume setup.

## Latest Verification

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
