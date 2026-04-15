# MagguuUI-Website

Public website + admin panel + REST API for WoW UI import strings (ElvUI, Plater, BigWigs, Details, etc.). Live: https://ui.magguu.xyz

## Stack

Nuxt 4.0 · Vue 3.5 · TypeScript 6 · NuxtUI 4.5 · Tailwind 4 (CSS-first) · Drizzle 0.45 · better-sqlite3 (WAL mode) · Node 24

Auth: JWT + HttpOnly cookie + WebAuthn/Passkeys (SimpleWebAuthn)
Tooling: no ESLint/Prettier/tests. Validation via Zod.

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
npm run db:generate    # drizzle-kit: create migration files
npm run db:push        # drizzle-kit: sync schema directly (dev)
npm run db:studio      # DB GUI
npm run db:seed        # seed default data
```

## Verification after changes

1. `npm run build` — must succeed (no type errors surface here since TS is via Nuxt)
2. Manual smoke: `npm run dev` and hit `/`, `/strings`, `/admin` golden paths
3. For UI work: use `webapp-testing` skill with Playwright

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

## Deploy (Unraid)

`bash rebuild.sh` on Unraid. Smart skip: compares `git rev-parse HEAD` vs Docker image OCI label `org.opencontainers.image.revision` and only rebuilds if changed. Force with `FORCE_REBUILD=1`.

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
- NEVER skip the rebuild.sh commit check — `FORCE_REBUILD=1` only when intentional
