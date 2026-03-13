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
- `JWT` auth
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
- sticky top toolbar with page context, search trigger, notifications, theme control, and website shortcut
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

Start development server:

```bash
npm run dev
```

Production build:

```bash
npm run build
npm run preview
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
- `NUXT_ADMIN_PASSWORD`
- `NUXT_API_KEY`
- `NUXT_GITHUB_TOKEN`
- `NUXT_GITHUB_REPO`
- `NUXT_GITHUB_WEBHOOK_SECRET`
- `NUXT_WEBAUTHN_RP_ID`
- `NUXT_WEBAUTHN_ORIGIN`

Do not commit `.env`, runtime database files, or uploads.


## Deployment

This project is deployed as a Dockerized Nuxt app on Unraid.

Current deploy flow uses a Git checkout plus a Docker rebuild script that skips rebuilding when the checked-out commit is already packaged in the local image.

Build and runtime files:

- `Dockerfile`
- `rebuild.sh`

Deploy/update on the server:

```bash
cd /mnt/user/appdata/nuxt
git fetch origin main
git reset --hard origin/main
bash rebuild.sh
```

Notes:

- Git access on the server must be configured via PAT or SSH
- `.env`, `data/`, and `uploads/` stay outside Git and should be copied back only when migrating a fresh deploy folder
- `git reset --hard origin/main` is intended only for a clean deploy copy with no local code changes
- `rebuild.sh` now compares the checked-out Git commit against the image label `org.opencontainers.image.revision` and skips the build when nothing changed
- `FORCE_REBUILD=1 bash rebuild.sh` forces a fresh rebuild if you explicitly want one
- the Docker image now carries OCI metadata for commit and build time, and the build no longer does redundant `docker pull` calls outside `docker build --pull`

## Data and Runtime Behavior

Runtime data is intentionally not tracked in Git:

- `data/`
- `uploads/`

The app bootstraps and syncs key defaults on startup, including:

- admin user creation
- FAQ content sync
- installation guide sync

This means repository changes to seeded FAQ/guide content are pushed into the live database on next app start.

## Security Notes

Implemented already:

- admin API protection via server middleware
- JWT session validation
- session tracking and revocation
- rate limiting for sensitive login flows
- CSP and extra security headers
- removal of `X-Powered-By`
- SSR-safe changelog sanitizing

Still worth improving further:

- add a lockfile and switch the Docker build from `npm install` to `npm ci`
- tighten upload limits and validation
- move admin auth from `localStorage` to HttpOnly cookies in the future
- add smoke tests for health/auth/content flows

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
- FAQ and installation guide synced from code into DB on startup
