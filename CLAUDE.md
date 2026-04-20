# MagguuUI-Website

Public website + admin panel + REST API for WoW UI import strings (ElvUI, Plater, BigWigs, Details, etc.). Live: https://ui.magguu.xyz

## Stack

Nuxt 4.0 · Vue 3.5 · TypeScript 6 · NuxtUI 4.5 · Tailwind 4 (CSS-first) · Drizzle 0.45 · better-sqlite3 (WAL mode) · Node 24 · nuxt-og-image 6 (Satori renderer)

Auth: JWT + HttpOnly cookie + WebAuthn/Passkeys (SimpleWebAuthn)
Tooling: no ESLint/Prettier. Validation via Zod. Smoke tests via Playwright (`tests/public-pages.spec.ts`, chromium-only).

## Architecture flow

```
Public SSR pages → public API (18 endpoints, SWR-cached via routeRules)
Admin SPA (ssr:false) → /api/v1/admin/* (67 endpoints, JWT+cookie guarded)
                     → SQLite (20 tables, WAL mode, busy_timeout=5000)
Docker → Cloudflare Tunnel → ui.magguu.xyz
```

## Commands

```bash
npm run dev            # dev server
npm run build          # production build (.output/)
npm run verify         # clean + build + smoke test
npm run verify:smoke   # smoke test against an already-built .output/
npm run db:generate    # drizzle-kit: create migration files
npm run db:push        # drizzle-kit: sync schema directly (dev)
npm run db:studio      # DB GUI
npm run db:seed        # seed default data
npm run test           # Playwright smoke tests
npm run test:ui        # Playwright UI mode
npm run test:install   # Install chromium once (required before first test)
```

## Verification after changes

1. `npm run build` — must succeed (no type errors surface here since TS is via Nuxt)
2. `npm run verify:smoke` — builds server, boots it on a free port, hits all public + admin endpoints, exercises the login/session/passkey/revoke/logout flow
3. `npm test` — Playwright chromium smokes on the full public route list + color-mode toggle
4. For UI work: use `webapp-testing` skill with Playwright for interactive debugging

## Critical gotchas

**NuxtUI v4 UModal** — default slot is the *trigger* (inline). Modal content MUST go in `#content` slot or renders at page bottom as a broken inline block. v-model uses `v-model:open="state"` not `v-model="state"`. 22 modals across 9 admin pages all use correct pattern — keep it that way.

**Tailwind v4** — no `tailwind.config.ts` exists. All config via `@theme` in `assets/css/main.css`. Colors: `brand-50..950`, `silver-100..900`.

**SSR config** — `/admin/**` is `ssr:false` (routeRules) to prevent auth-token flash. Never add SSR dependencies to admin pages. Public pages stay SSR for SEO.

**Dual auth** — Bearer token (localStorage, legacy) AND HttpOnly cookie both work. `useAuth()` centralizes hydration. Server-side: `requireAuth(event)` accepts either.

**Rate limiting** — login is 5 attempts / 15min per IP, persisted in SQLite `rateLimits` table. Not just in-memory.

**Drizzle push, no versioned migrations** — `db:push` syncs schema directly. Indexes are idempotently ensured by `server/plugins/init.ts` on startup. Don't hand-write migration files.

**Passkey RP ID/Origin** — required for production passkey feature. If `NUXT_WEBAUTHN_RP_ID` / `NUXT_WEBAUTHN_ORIGIN` are unset, registration will fail silently.

**.env.example does NOT exist** — env vars documented in `docs/env-vars.md` only. Required: `NUXT_JWT_SECRET`, `NUXT_ADMIN_PASSWORD`. Optional: `NUXT_GITHUB_TOKEN`, `NUXT_WEBAUTHN_*`.

**Runtime data is not in git** — `.env`, `data/*.db*`, `uploads/` are gitignored. Deploy preserves them across `git reset --hard`.

**OG image templates need a `.satori.vue` suffix** — nuxt-og-image v6 requires the renderer suffix on component filenames. `components/OgImage/MagguuOg.satori.vue` is the site-wide default (set via `ogImage.defaults.component` in nuxt.config). Template uses flexbox with `display: flex` on every element — Satori requires it. Per-route customisation via `useOgImage()` / `defineOgImageComponent()` if needed.

**Private-API headers for error responses** — admin/auth 401/403/5xx responses re-apply `Cache-Control: private, no-store, ...` via the `error` hook in `server/plugins/security-headers.ts`. h3's `sendError` otherwise defaults to `Cache-Control: no-cache`, which the verify-smoke script rejects. Don't remove the error hook.

**Addon CHANGELOG autosync** — `server/api/v1/webhooks/github.post.ts` detects pushes to `Derpsen/MagguuUI` that touch `CHANGELOG.md`, fetches the file via raw GitHub, and upserts each `## v<semver> (<date>)` block into the `changelogs` table. Parser lives in `server/utils/parseAddonChangelog.ts`. Needs `NUXT_GITHUB_WEBHOOK_SECRET` env for signature verification.

**Home content auto-seed on deploy** — `NUXT_SYNC_SEEDED_CONTENT=true` in the runtime env makes `server/plugins/init.ts` upsert `home`, `guide` and FAQ sections against `server/database/defaultContent.ts` on every startup. Without the env var, the seed only fires once on an empty DB.

**Color mode default follows OS** — `nuxt.config.ts` has `colorMode.preference: 'system'` (fallback `dark`). Don't hardcode `'dark'` again; users complained about the flash.

## Deploy (Unraid via GHCR)

CI-driven. Pushes to `main` trigger `.github/workflows/docker.yml`, which builds and publishes `ghcr.io/derpsen/magguuui-website:latest` (+ sha tag, + semver on `v*` tags). Unraid pulls the image via the community template at `unraid/magguuui-website.xml`. Update the running container with Unraid's *Check for Updates* → *Apply Update* — no SSH, no local docker build. The old `rebuild.sh` was removed.

Volumes the template mounts (and that must persist across updates):
- `/app/data` — SQLite DB + WAL
- `/app/uploads` — admin-uploaded assets

## References

- Database schema: see `server/database/schema.ts` (20 tables)
- Server API structure: see `server/api/v1/` (public) and `server/api/v1/admin/` (JWT-guarded)
- Admin navigation source of truth: `composables/useAdminNavigation.ts`
- String CRUD composable: `composables/useStringManager.ts` (reused by profiles/wowup/layouts pages)
- For auth flows: `server/utils/auth.ts`, `server/utils/session.ts`, `server/utils/rateLimit.ts`
- For public SEO: `composables/usePublicPageSeo.ts`

## Conventions

- API responses: `apiSuccess(data, meta?)` or `throw apiError(code, message, status)` from `server/utils/response.ts`
- Activity logging: call `logActivity({ action, entityType, entityId, entityName, userId })` after every admin CRUD
- Rich text: render via `utils/richText.ts` (handles both client DOMPurify and server sanitize-html)
- Admin components under `components/admin/` — reuse `Panel`, `CrudModal`, `PageHeader`, `StickyBar`, `EmptyState`, `MetricCard` before creating new ones

## What NOT to do

- NEVER add Tailwind config file — use `@theme` in main.css
- NEVER put modal content in default slot of UModal — use `#content`
- NEVER enable SSR on admin pages — token flash will leak
- NEVER commit `.env`, `data/`, or `uploads/`
- NEVER hand-build the image on Unraid — `docker.yml` in CI is the single source of truth. Fix the image at source, push, use Unraid's *Apply Update*.
