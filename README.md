# MagguuUI Website

Website, admin panel, and API backend for `MagguuUI`.

Live site: `https://ui.magguu.xyz`

This repository contains the public website for MagguuUI, the internal admin area for managing content and import strings, and the Nuxt server/API layer that powers both.

## What This Repo Does

- Public website for MagguuUI
- Admin panel for managing:
  - addon profiles
  - WowUp strings
  - character layouts
  - changelogs
  - FAQ
  - installation guide
  - site settings
- REST API for website content and admin operations
- SQLite-backed storage for content, analytics, sessions, and activity logs

## Stack

- `Nuxt 4`
- `Vue 3`
- `TypeScript`
- `Nuxt UI v4`
- `Tailwind CSS v4`
- `SQLite` via `better-sqlite3`
- `Drizzle ORM`
- `JWT` auth with HttpOnly cookie-backed admin sessions
- `WebAuthn / Passkeys`
- `Docker`

## Main Areas

- `pages/`
  - public pages such as `index`, `strings`, `guide`, `faq`, `changelog`
  - admin pages under `pages/admin/`
- `components/admin/` and `composables/useAdminNavigation.ts`
  - shared admin primitives for headers, panels, metrics, empty states, sticky save bars, and navigation context
- `server/api/`
  - public API routes
  - admin API routes under `server/api/v1/admin/`
- `server/database/`
  - schema, DB bootstrap, seed logic
- `server/plugins/`
  - startup sync, cleanup jobs, security header hooks
- `assets/css/main.css`
  - public styling plus the scoped admin design system
- `public/`
  - static assets such as `logo.svg`, `manifest.json`, `robots.txt`, `sitemap.xml`

## Admin UI

The admin panel was rebuilt around a shared, modern SaaS-style shell while keeping the existing data flows and APIs intact.

- collapsible sidebar with grouped navigation, cleaner active-state handling, and mobile slide-over behavior
- sticky top toolbar with integrated page title/context, search trigger, notifications, and theme control
- command palette and mobile dock powered by the shared navigation data in `useAdminNavigation.ts`
- reusable admin primitives under `components/admin/` for page headers, panels, metric cards, empty states, and sticky save bars
- modernized dashboard plus the core content, string, and system screens with consistent spacing, cards, tables, and responsive behavior

## Local Development

Requirements:

- `Node.js 24`
- `npm`

Install dependencies:

```bash
npm install
```

This repository now includes `package-lock.json`, so prefer:

```bash
npm ci
```

Start development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

Smoke-check the production build locally:

```bash
npm run verify
```

Database helpers:

```bash
npm run db:generate
npm run db:migrate
npm run db:push
npm run db:studio
npm run db:seed
```

## Environment

Copy `.env.example` to `.env` and configure the required values.

Important values include:

- `NUXT_JWT_SECRET`
- `NUXT_AUTH_COOKIE_NAME`
- `NUXT_ADMIN_PASSWORD`
- `NUXT_API_KEY`
- `NUXT_GITHUB_TOKEN`
- `NUXT_GITHUB_REPO`
- `NUXT_GITHUB_WEBHOOK_SECRET`
- `NUXT_SYNC_SEEDED_CONTENT`
- `NUXT_WEBAUTHN_RP_ID`
- `NUXT_WEBAUTHN_ORIGIN`

Do not commit `.env`, runtime database files, or uploads.


## Deployment (Unraid via GHCR)

Images are built by GitHub Actions (`.github/workflows/docker.yml`) and published to GitHub Container Registry as `ghcr.io/derpsen/magguuui-website:latest` on every push to `main`. Semver tags (`v1.2.3`) are also published automatically.

**Install on Unraid (first time):**

1. Docker tab → *Add Container* → paste the template URL into the *Template:* field:
   ```
   https://raw.githubusercontent.com/Derpsen/MagguuUI-Website/main/unraid/magguuui-website.xml
   ```
   If your Unraid version does not accept a URL in that field, copy `unraid/magguuui-website.xml` to `/boot/config/plugins/dockerMan/templates-user/` via SMB or a Unraid terminal:
   ```bash
   curl -fsSL -o /boot/config/plugins/dockerMan/templates-user/magguuui-website.xml \
     https://raw.githubusercontent.com/Derpsen/MagguuUI-Website/main/unraid/magguuui-website.xml
   ```
2. Fill in the required env vars (`NUXT_JWT_SECRET`, `NUXT_ADMIN_PASSWORD`). See `docs/env-vars.md` for the full list — anything optional can stay empty until you need it.
3. Point the reverse-proxy / Cloudflare Tunnel at the container's port 3000.
4. *Apply*. The image pulls from GHCR and starts.

**Update:**

Docker tab → *Check for Updates* at the top → when `magguuui-website` shows **update ready**, click *Apply Update*. Unraid pulls the new image and recreates the container with the same config in ~20 seconds. No SSH, no local rebuild, no `git reset`.

**Volumes that must persist** (configured by the template):
- `/app/data` — SQLite DB + WAL files
- `/app/uploads` — admin-uploaded assets

**Migrating from the old `rebuild.sh` flow:** stop the old container, rename/move `/mnt/user/appdata/nuxt/data` → `/mnt/user/appdata/magguuui-website/data` (same for `uploads`), delete the old container and image, then install via the template above. The old `rebuild.sh` is removed — all builds happen in CI now.

## Data and Runtime Behavior

Runtime data is intentionally not tracked in Git:

- `data/`
- `uploads/`

The app bootstraps key defaults on startup, including:

- admin user creation
- initial FAQ seed
- initial installation guide seed

Repository-driven FAQ/guide re-sync is now opt-in via `NUXT_SYNC_SEEDED_CONTENT=true`.

## Security Notes

Implemented already:

- admin API protection via server middleware
- JWT session validation
- cookie-first admin auth via HttpOnly same-origin sessions
- production fail-fast for insecure JWT/admin bootstrap defaults
- session tracking and revocation
- persistent rate limiting for sensitive login flows
- CSP and extra security headers
- no-store/no-index headers for private admin/auth routes
- removal of `X-Powered-By`
- shared rich-text sanitizing across public FAQ/home/guide/changelog flows
- upload hardening via file-signature and size validation
- SWR caching for public read APIs
- committed lockfile plus Docker-aware `npm ci` fallback
- local production smoke test via `npm run verify`

Still worth improving further:

- tighten upload limits and validation
- add broader smoke coverage for auth/admin flows

## Git Notes

This repository is now intended to be the source of truth for the website code.

Ignored on purpose:

- build output
- runtime data
- secrets
- generated zip files

Line endings are normalized through `.gitattributes` to avoid Windows/Linux deploy issues.

## Related Repositories

- Addon repo: `https://github.com/Derpsen/MagguuUI`
- Website repo: `https://github.com/Derpsen/MagguuUI-Website`

## Current Status

- private GitHub repository connected
- git-based Docker deploy flow in place on Unraid
- admin panel rebuilt with a shared navigation and layout system
- reusable admin UI primitives added for headers, panels, metrics, empty states, and sticky save bars
- dashboard plus key content, data, and system screens moved onto the new design system
- FAQ and installation guide seed data kept available, with forced code-sync now opt-in
- backend hardened with persistent rate limiting, upload validation, HttpOnly session-cookie support, and SWR caching for public read APIs
