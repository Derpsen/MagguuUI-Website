# Environment Variables

Most variables are prefixed `NUXT_` for Nuxt runtime config. `API_BEARER_TOKEN` is the current exception because it is also shared with external workflow/API callers. Set values via `.env` (gitignored) in dev, or via Docker env on Unraid.

## Required (production)

| Var | Purpose |
|---|---|
| `NUXT_JWT_SECRET` | JWT signing key. Generate 64 random chars. The runtime guard intentionally rejects missing/default values in production. |
| `NUXT_ADMIN_PASSWORD` | First admin password. Bcrypt-hashed on first startup by `server/plugins/init.ts`. |
| `NUXT_TRUSTED_PROXIES` | Optional. IPs/CIDRs whose `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` headers are trusted (socket peer check). Default `private` (loopback + RFC1918 + ULA). Set to the cloudflared address to stop LAN spoofing; `none` = socket IP only. |

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
| `NUXT_FORCE_PASSWORD_RESET` | empty | Set to `true` once to force admin password reset on startup |
| `NUXT_SYNC_SEEDED_CONTENT` | empty | Set to `true` to re-sync default content on startup |
| `NUXT_OG_IMAGE_SECRET` | empty | Signing secret for dynamic `nuxt-og-image` generation URLs |
| `CLOUDFLARE_ZONE_ID` | empty | Cloudflare zone of ui.magguu.xyz. With `CLOUDFLARE_API_TOKEN`, admin/sync/webhook writes purge the edge cache. Empty = logged no-op. |
| `CLOUDFLARE_API_TOKEN` | empty | API token with only *Zone → Cache Purge → Purge* on that zone. Host/container secret only. |
| `GIT_SHA` / `BUILD_TIME` | `dev` | Image commit + build time shown in the admin. Set by `docker.yml` build-args; no manual value needed. |
| `NODE_ENV` | `production` in Docker | Runtime mode |

## Notes

- Edge caching: public pages (`/`, `/guide`, `/faq`, `/changelog`, `/about`, `/addons`, `/imprint`, `/privacy`) and `/api/v1/catalog-summary` send `CDN-Cache-Control: public, max-age=120, stale-while-revalidate=600`. Browsers still get `Cache-Control: public, max-age=0, must-revalidate` (ETag → 304), so admin edits show on the next reload. Cloudflare only stores HTML when a Cache Rule marks these URLs *Eligible for cache* (origin cache control respected); without that rule nothing changes at the edge.

- Passkeys require matching `NUXT_WEBAUTHN_RP_ID` and `NUXT_WEBAUTHN_ORIGIN` in production.
- Changing `NUXT_JWT_SECRET` invalidates all existing sessions. Users must log in again.
- The admin password can also be changed via the admin UI after first login.
- Mirror `API_BEARER_TOKEN` as the AddOn repository secret `WEBSITE_API_KEY`. The workflow consumes the coherent `/api/v1/sync/snapshot` contract; its component projections live under the same `/api/v1/sync/*` namespace. The token must never be exposed to browser code.
- Set `NUXT_OG_IMAGE_SECRET` in production if dynamic OG image generation stays enabled. Generate it outside the repo with `npx nuxt-og-image generate-secret` and store it only as a host/container secret.
