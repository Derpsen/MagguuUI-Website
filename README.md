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
- `server/api/`
  - public API routes
  - admin API routes under `server/api/v1/admin/`
- `server/database/`
  - schema, DB bootstrap, seed logic
- `server/plugins/`
  - startup sync, cleanup jobs, security header hooks
- `public/`
  - static assets such as `logo.svg`, `manifest.json`, `robots.txt`, `sitemap.xml`

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

Build and runtime files:

- `Dockerfile`
- `rebuild.sh`

Update package archive:

- fixed filename: `nuxt-update.zip`

Excluded from the update zip:

- `.nuxt`
- `node_modules`
- `.output`
- `data`
- `uploads`
- `.git`
- `.env`
- `.claude`
- `*.zip`

Deploy command on the server:

```bash
cd /mnt/user/appdata/nuxt && unzip -o nuxt-update.zip && bash rebuild.sh && rm nuxt-update.zip
```

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

- add a lockfile and switch to `npm ci`
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
- `main` branch initialized
- website source imported
- Docker rebuild flow in place
- FAQ and installation guide synced from code into DB on startup
