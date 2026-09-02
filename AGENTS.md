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
- MagguuUI public copy (home/guide/FAQ/changelog/addon metadata) must stay
  aligned with the current MagguuUI release: four sibling folders, EllesmereUI
  9.0.6+ (live 9.0.8), Magguu Settings / Load profiles activate-only except
  class layouts and KeystoneLoot BiS, Skinning NAMES & COLORS DualRow
  (unit-frame | party/raid; EXBoss | keybinds), EXBoss split independent of
  EXBoss class-color, Archon BiS one item per slot with two rings and two
  trinkets. Do not restore Ashvane or MagguuKSL.
- After behavior changes run `npm run typecheck`, `npm run build`, `npm run verify:smoke`, and `npm test`.
- After dependency changes also run `npm run audit:prod`.
- Lint with `npm run lint` / `npm run lint:fix` (Nuxt ESLint Flat Config; no separate Prettier).
- Validation uses Zod.

## WowUp packs (2026-09-01)

- **Starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore.
- **Optional:** BugGrabber, BugSack, HandyNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, WIM, Ellesmere WIM Skin, Waypoint UI, GTFO, Premade Groups Filter, KeystoneLoot, Auctionator.
- No WindTools. KeystoneLoot = Archon-BiS, all specs; never MagguuKSL; never name Devourer as a special include.

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

## Git / publish (Buddy hub)

- **Grok Bot helpers (Stack Fixer, etc.) under Buddy:** Standing autonomy. For clear in-scope Website work (bugs, redesign, copy, logos, deps), commit, push, and merge to main **without asking Marco** and without waiting for a go-ahead. Never force-push. Never publish unrelated dirty WIP. Report only to Buddy (short German + links). Marco only reads Buddy — do not ask him for permission in this chat.
- Tags and releases still need an explicit release ask via Buddy.
- Manual human Cursor sessions (Marco himself): do not commit/push/tag unless he asks.

## Grok Bot / Buddy

Marco uses Grok Bot "Buddy" as the single front door. Helpers report back to
Buddy.
