# Environment Variables

All variables are prefixed `NUXT_` for Nuxt runtime config. Set them via `.env` (gitignored) in dev, or via Docker env on Unraid.

## Required (production)

| Var | Purpose |
|---|---|
| `NUXT_JWT_SECRET` | JWT signing key. Generate 64 random chars. Default `change-me-in-production` is intentionally broken. |
| `NUXT_ADMIN_PASSWORD` | First admin password. Bcrypt-hashed on first startup by `server/plugins/init.ts`. |

## Optional

| Var | Default | Purpose |
|---|---|---|
| `NUXT_AUTH_COOKIE_NAME` | `magguuui_session` | HttpOnly session cookie name |
| `NUXT_API_KEY` | — | External API access for GitHub Actions / webhooks |
| `NUXT_GITHUB_TOKEN` | — | GitHub PAT for content sync (read+write on `NUXT_GITHUB_REPO`) |
| `NUXT_GITHUB_REPO` | `Derpsen/MagguuUI` | Owner/Repo for sync |
| `NUXT_GITHUB_WEBHOOK_SECRET` | — | HMAC secret for `/api/v1/webhooks/github` |
| `NUXT_WEBAUTHN_RP_ID` | hostname | Passkey relying party ID. REQUIRED for prod passkeys. |
| `NUXT_WEBAUTHN_ORIGIN` | inferred | Passkey origin. REQUIRED for prod passkeys. |
| `NUXT_FORCE_PASSWORD_RESET` | — | Set to `true` to force admin password reset on startup |
| `NUXT_SYNC_SEEDED_CONTENT` | — | Set to `true` to re-sync default content on startup |
| `NODE_ENV` | `production` | Set by Dockerfile |

## Notes

- Passkeys fail silently if `RP_ID` / `ORIGIN` are unset in production — always configure them before enabling WebAuthn.
- `JWT_SECRET` changes invalidate all existing sessions. Users must re-login.
- Admin password can also be changed via admin UI after first login.
