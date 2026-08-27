# AGENTS.md

## Project Context

MagguuUI-Website is the Nuxt public site + admin + API for MagguuUI import
strings (EllesmereUI, BigWigs, Northern Sky Raid Tools, class layouts). Live:
`https://ui.magguu.xyz`. Production runs as Unraid container **MagguuUI** from
image `ghcr.io/derpsen/magguuui-website` (LAN origin
`http://192.168.178.21:3000` on `br0`). Ops notes: `MEMORY.md`.

## Safe Working Rules

- Read `MEMORY.md` and the touched module before changing behavior.
- Do not commit `.env`, `data/*.db*`, `uploads/`, or build output.
- Do not build directly on Unraid; CI publishes GHCR, Unraid pulls/updates.
- Transient HTTP 500 right after a container update can occur while the new
  process binds — recheck before treating it as a lasting regression.
- `error.vue` Home must navigate to `/`, never `/home` (clearError redirect
  can strand SPA/admin clients on a 404 `/home`). Prefer `clearError()` then
  `window.location.assign('/')` (or `navigateTo('/', { external: true })`).
- Admin routeRules: `/admin/**` stays `ssr:false` (auth flash). Exception:
  `/admin/login` is `ssr:true`. Depth: `MEMORY.md`.
- CodeQL: `github/codeql-action/init` and `analyze` must use the **same**
  commit pin in `.github/workflows/codeql.yml`.
- Nuxt UI v4 modals: `UModal` default slot is the trigger. Modal content must
  be in `#content`; state uses `v-model:open`. Do not put modal body in the
  default slot.
- Tailwind v4: there is no `tailwind.config.ts`. Keep theme configuration in
  `assets/css/main.css` via `@theme`. Do not add a Tailwind config file.
- Color mode: default follows the OS via `colorMode.preference: 'system'`.
  Do not hardcode `dark` as the preference.
- Database: this project uses Drizzle push and startup idempotent index
  creation. Do not hand-write migration files unless the strategy changes.
- Do not perform major dependency upgrades without a separate compatibility
  pass.
- After behavior changes run `npm run typecheck`, `npm run build`, `npm run verify:smoke`, and `npm test`.
- After dependency changes also run `npm run audit:prod`.
- Lint with `npm run lint` / `npm run lint:fix` (Nuxt ESLint Flat Config; no separate Prettier).
- Validation uses Zod.

## Git / publish (Buddy hub)

- **Grok Bot helpers (Stack Fixer, etc.) under Buddy:** Standing autonomy. For clear in-scope Website work (bugs, redesign, copy, logos, deps), commit, push, and merge to main **without asking Marco** and without waiting for a go-ahead. Never force-push. Never publish unrelated dirty WIP. Report only to Buddy (short German + links). Marco only reads Buddy — do not ask him for permission in this chat.
- Tags and releases still need an explicit release ask via Buddy.
- Manual human Cursor sessions (Marco himself): do not commit/push/tag unless he asks.

## Grok Bot / Buddy

Marco uses Grok Bot "Buddy" as the single front door. Helpers report back to
Buddy.
