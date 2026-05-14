# MagguuUI-Website

Public website, admin panel, and REST API for WoW UI import strings (ElvUI, Plater, BigWigs, Details, etc.). Live site: `https://ui.magguu.xyz`.

## Stack

Nuxt 4.4, Vue 3.5, TypeScript 6, Nuxt UI 4.7, Tailwind CSS 4.3 (CSS-first), Drizzle 0.45, SQLite via `better-sqlite3` 12, Node 24, and `nuxt-og-image` 6 with Satori.

Auth uses JWT, HttpOnly cookies, session tracking, and WebAuthn/passkeys. Validation uses Zod. Linting uses Nuxt ESLint Flat Config without a separate Prettier setup; use `npm run lint`, `npm run typecheck`, build, smoke, and Playwright tests as the project checks.

## Architecture

```text
Public SSR pages -> public API routes with SWR route rules
Admin SPA (ssr:false) -> /api/v1/admin/* guarded by JWT/cookie auth
Server API -> SQLite (WAL mode, busy_timeout=5000)
Docker image -> Unraid / Cloudflare Tunnel -> ui.magguu.xyz
```

## Commands

```bash
npm run dev            # dev server
npm run lint           # Nuxt ESLint check
npm run lint:fix       # auto-fix safe ESLint findings
npm run typecheck      # TypeScript check
npm run build          # production build (.output/)
npm run verify         # clean + build + production smoke test
npm run verify:smoke   # smoke test against existing .output/
npm run audit:prod     # production dependency audit
npm run test           # Playwright public smoke tests
npm run test:ui        # Playwright UI mode
npm run test:install   # install Chromium once before first Playwright run
npm run db:generate    # drizzle-kit: create migration files
npm run db:push        # drizzle-kit: sync schema directly in dev
npm run db:studio      # DB GUI
npm run db:seed        # seed default data
```

## Verification After Changes

1. Run `npm run typecheck`.
2. Run `npm run build`.
3. Run `npm run verify:smoke`.
4. Run `npm test` for public page and color-mode smoke coverage.
5. Run `npm run audit:prod` after dependency changes.

## Critical Rules

**Nuxt UI v4 modals**: `UModal` default slot is the trigger. Modal content must be in `#content`, and state uses `v-model:open`.

**Tailwind v4**: there is no `tailwind.config.ts`. Keep theme configuration in `assets/css/main.css` via `@theme`.

**Admin SSR**: `/admin/**` must stay `ssr:false` in `nuxt.config.ts` to avoid auth-token flash. Public pages remain SSR for SEO.

**Auth**: `requireAuth(event)` accepts legacy bearer tokens and HttpOnly cookie sessions. Client hydration uses `/api/v1/auth/session`, which returns `null` instead of 401 for missing/invalid cookies so public pages stay console-clean.

**Session binding**: session validation is bound to browser + OS family through `server/utils/session.ts`. Keep the softer `/api/v1/auth/session` endpoint aligned with `requireAuth`.

**Rate limiting**: login limits are persisted in SQLite through `server/utils/rateLimit.ts`, not only in memory.

**Database migrations**: this project uses Drizzle push and startup idempotent index creation. Do not hand-write migration files unless the project strategy changes intentionally.

**Environment**: `.env.example` and `docs/env-vars.md` document supported variables. Required in production: `NUXT_JWT_SECRET`, `NUXT_ADMIN_PASSWORD`. Optional integrations include `NUXT_GITHUB_TOKEN`, `NUXT_WEBAUTHN_*`, `API_BEARER_TOKEN`, and `NUXT_OG_IMAGE_SECRET`.

**Runtime data**: never commit `.env`, `data/*.db*`, or `uploads/`.

**OG images**: Satori templates need a `.satori.vue` suffix. The site-wide default is `components/OgImage/MagguuOg.satori.vue`, configured in `nuxt.config.ts`.

**Private API headers**: admin/auth error responses need private no-store headers via `server/plugins/security-headers.ts`. The smoke verifier checks this behavior.

**Addon sync**: `server/api/v1/webhooks/github.post.ts` handles GitHub webhook sync for `CHANGELOG.md`, `MagguuUI.toc`, and Data/*.lua files. Keep these handlers independent so one touched file type does not block another.

**Seeded content**: `NUXT_SYNC_SEEDED_CONTENT=true` makes startup upsert home, guide, and FAQ content from `server/database/defaultContent.ts`. Without it, seed data is only created for empty DBs.

**Color mode**: default follows the OS via `colorMode.preference: 'system'`. Do not hardcode `dark` as the preference.

## References

- Database schema: `server/database/schema.ts`
- API response helpers: `server/utils/response.ts`
- Auth/session/rate-limit flow: `server/utils/auth.ts`, `server/utils/session.ts`, `server/utils/rateLimit.ts`
- Public SEO helpers: `composables/usePublicPageSeo.ts`
- Admin navigation: `composables/useAdminNavigation.ts`
- Shared string CRUD: `composables/useStringManager.ts`
- Rich text rendering: `utils/richText.ts` using `sanitize-html` on server and client

## Do Not

- Do not add a Tailwind config file.
- Do not put modal body content in the default `UModal` slot.
- Do not enable SSR for admin routes.
- Do not commit secrets, runtime databases, uploads, build output, or generated archives.
- Do not perform major dependency upgrades without a separate compatibility pass.
- Do not build directly on Unraid; CI publishes the GHCR image and Unraid pulls it.
