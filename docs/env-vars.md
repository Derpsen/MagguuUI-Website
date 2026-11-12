# Environment Variables

Most variables are prefixed `NUXT_` for Nuxt runtime config. `API_BEARER_TOKEN` is the current exception because it is also shared with external workflow/API callers. Set values via `.env` (gitignored) in dev, or via Docker env on Unraid.

## Required (production)

| Var | Purpose |
|---|---|
| `NUXT_JWT_SECRET` | JWT signing key. Generate 64 random chars. The runtime guard intentionally rejects missing/default values in production. |
| `NUXT_ADMIN_PASSWORD` | First admin password. Bcrypt-hashed on first startup by `server/plugins/init.ts`. |
| `NUXT_TRUSTED_PROXIES` | Optional but needed behind a reverse proxy / tunnel on another host or container. IPs/CIDRs whose `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` headers are trusted (socket peer check). **Default (unset): `loopback` only** (127.0.0.0/8, ::1). Set it to the cloudflared address (e.g. `192.168.178.30`). Keywords: `loopback`, `private` (loopback + RFC1918 + ULA/link-local, the pre-2026-10-25 default), `none` (socket IP only). Upgrading from an older image with the variable unset: set `private` (or the exact address) or every visitor is counted as the proxy's address. |

## Optional

| Var | Default | Purpose |
|---|---|---|
| `NUXT_AUTH_COOKIE_NAME` | prod-aware default | HttpOnly session cookie name. Leave empty to use the hardened production default. |
| `API_BEARER_TOKEN` | empty | Shared bearer token for the private `/api/v1/sync/*` workflow API. Without it those routes return `503`; browser-facing read APIs remain public. |
| `NUXT_GITHUB_TOKEN` | empty | GitHub PAT for content sync with read+write access to `NUXT_GITHUB_REPO` |
| `NUXT_GITHUB_REPO` | `Derpsen/MagguuUI` | Owner/repo for sync |
| `NUXT_GITHUB_WEBHOOK_SECRET` | empty | HMAC secret for `/api/v1/webhooks/github` |
| `NUXT_WEBAUTHN_RP_ID` | request hostname | Passkey relying party ID. Required for production passkeys. |
| `NUXT_WEBAUTHN_ORIGIN` | inferred | Passkey origin. Required for production passkeys. |
| `NUXT_VISITOR_LOG` | on | Optional detailed visitor log (cookie banner, consent, consented visitor records, Admin → Analytics → Visitor log). **On by default**; nothing is stored without the visitor's consent. Set `false` or `0` (also `off`, `no`, `disabled`) to switch the whole feature off: no banner, no footer link, no capture. Stored records are kept 13 months and are deleted by the cleanup job even while it is off. |
| `NUXT_FORCE_PASSWORD_RESET` | empty | Set to `true` once to force admin password reset on startup |
| `NUXT_SYNC_SEEDED_CONTENT` | empty | Set to `true` to re-sync default content on startup |
| `NUXT_OG_IMAGE_SECRET` | empty | Signing secret for dynamic `nuxt-og-image` generation URLs |
| `CLOUDFLARE_ZONE_ID` | empty | Cloudflare zone of ui.magguu.xyz. With `CLOUDFLARE_API_TOKEN`, admin/sync/webhook writes purge the edge cache. Empty = logged no-op. |
| `CLOUDFLARE_API_TOKEN` | empty | API token with only *Zone → Cache Purge → Purge* on that zone. Host/container secret only. |
| `GIT_SHA` / `BUILD_TIME` | `dev` | Image commit + build time shown in the admin. Set by `docker.yml` build-args; no manual value needed. |
| `NODE_ENV` | `production` in Docker | Runtime mode |
| `NUXT_BLIZZARD_CLIENT_ID` | empty | OAuth client id for the Blizzard Game Data and Profile APIs (client credentials). Server-only via `runtimeConfig.blizzardClientId`. Never log or expose to the browser. The Meta nightly job stays off while this or the secret is empty. |
| `NUXT_BLIZZARD_CLIENT_SECRET` | empty | Matching OAuth client secret (`runtimeConfig.blizzardClientSecret`). Host/container secret only. |
| `NUXT_BLIZZARD_REGION` | `eu` | Phase 1 is EU only. Any other value warns once and still uses `eu` (`runtimeConfig.blizzardRegion`). |
| `NUXT_META_NIGHTLY` | off | Arms the 03:15 UTC Meta snapshot (`blizzard:nightly`). Default **off** in every environment. Recognised values (case-insensitive): `on`/`true`/`1`/`yes` and `off`/`false`/`0`/`no`. Unknown values warn once per process and stay off. Also off without both Blizzard credentials. Replaces the earlier `NUXT_BLIZZARD_META_NIGHTLY` name. |
| `NUXT_META_KUMA_PUSH_URL` | empty | Optional Uptime Kuma push URL (token in the path). The job pushes `up` on `ok`/`skipped` and `down` on `partial`/`error`/`locked`. Never logged. Empty = no-op. |
| `NUXT_META_SAMPLE_PER_SPEC` | `200` | Profile sample target per spec (default in the 150–200 range). |
| `NUXT_META_MAX_ATTEMPTS_PER_SPEC` | `400` | Max profile attempts per spec before giving up. |
| `NUXT_ADS` | off | Master switch for reserved `AdSlot` markup on `/meta`. Default **off** = no markup. Recognised on-values: `on`/`true`/`1`/`yes`. Resolved at **runtime** (`plugins/nuxt-ads.ts` via `useState`, not by mutating `runtimeConfig`). The client payload is a boolean (`nuxt-ads-enabled`), not the raw env string. Empty or missing `NUXT_ADS` is off. A container env change does not need a rebuild. `NUXT_PUBLIC_ADS` is a fallback if `NUXT_ADS` is unset. AdSense loading is a later PR. |

## Notes

- Edge caching: public pages (`/`, `/guide`, `/faq`, `/changelog`, `/about`, `/addons`, `/strings`, `/imprint`, `/privacy`, `/meta` and `/meta/...`) and `/api/v1/catalog-summary` send `CDN-Cache-Control: public, max-age=120, stale-while-revalidate=600`. Browsers still get `Cache-Control: public, max-age=0, must-revalidate` (ETag → 304), so admin edits show on the next reload. Cloudflare only stores HTML when a Cache Rule marks these URLs *Eligible for cache* (origin cache control respected); without that rule nothing changes at the edge.

- Passkeys require matching `NUXT_WEBAUTHN_RP_ID` and `NUXT_WEBAUTHN_ORIGIN` in production.
- Changing `NUXT_JWT_SECRET` invalidates all existing sessions. Users must log in again.
- The admin password can also be changed via the admin UI after first login.
- Mirror `API_BEARER_TOKEN` as the AddOn repository secret `WEBSITE_API_KEY`. The workflow consumes the coherent `/api/v1/sync/snapshot` contract; its component projections live under the same `/api/v1/sync/*` namespace. The token must never be exposed to browser code.
- Lighthouse and `scripts/verify-ads-runtime.mjs` seed the `/meta` fixture with `npx tsx scripts/seed-meta-fixture.ts` before a production start. In production the script exits unless `NUXT_ALLOW_META_FIXTURE_SEED=true` is set explicitly (`CI=true` / `GITHUB_ACTIONS` are not a bypass). Never run it on Unraid; `NUXT_E2E_SEED` already stays off in production.
- Set `NUXT_OG_IMAGE_SECRET` in production if dynamic OG image generation stays enabled. Generate it outside the repo with `npx nuxt-og-image generate-secret` and store it only as a host/container secret.
