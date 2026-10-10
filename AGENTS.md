# AGENTS.md

## Project Context

MagguuUI-Website is the Nuxt public site + admin + API for MagguuUI import
strings (EllesmereUI, BigWigs, Northern Sky Raid Tools, class layouts). Live:
`https://ui.magguu.xyz`. Production runs as Unraid container **MagguuUI** from
image `ghcr.io/derpsen/magguuui-website` (LAN origin
`http://192.168.178.21:3000` on `br0`). Ops notes: `MEMORY.md`.

**Live ops baseline (2026-10-06):** digest
`sha256:76ef22c97b84cbd6162d9aef44df0d620ab1cea8c1252daf1fadd432c8c3f60d`
(OCI `sha-5c26d99` / tip `5c26d99`) — **kein Re-Pull** wenn live schon darauf.
Wave: #95 (`@simplewebauthn/browser` 14) + #117 (audit overrides/allowlist);
Admin-Smoke 6/6 PASS auf diesem Digest.

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
- Color mode: public default is dark via `colorMode.preference: 'dark'`.
  An explicit light choice stays. Do not follow the OS unless the visitor picks light.
- Database: this project uses Drizzle push and startup idempotent index
  creation. Do not hand-write migration files unless the strategy changes.
- Do not perform major dependency upgrades without a separate compatibility
  pass. `types/nuxt-nitro.d.ts` restores Nitro `headers`, `swr`, and `storage`
  on the Nuxt 4.5 config types. Do not delete it. Node 26, TypeScript 7, h3 2,
  and satori 0.41 stay blocked without an explicit yes.
- MagguuUI public copy (home/guide/FAQ/changelog/addon metadata) must stay
  aligned with the current MagguuUI release. Tell players to download
  EllesmereUI and MagguuUI from CurseForge, Wago, or WoWInterface. Do not tell
  them to copy folders, and do not tell them to turn a feature off.
  EllesmereUI TOC min **9.0.6+** (**live 9.2.9**).
  **Targeted Spell Bars** stays a feature name without an off-switch lecture.
  MagguuUI_EUI keeps **Boiling Point** (no TopBar / Hearth-Picker / MagguuUI
  FPS-MS), AuraBuff count text **CENTER**, Magguu does not join/leave/hide Services, fresh
  install gold **Apply Magguu profiles** then **Magguu Settings**
  (overlay/QoL only) and **Load profiles** (activates existing Magguu profiles;
  does not re-import). Setup buttons are
  BigWigs, Northern Sky, EXBoss, Smart Reminders. HandyNotes MapNotes Magguu
  settings apply with HandyNotes on Apply Magguu profiles / Load profiles.
  Skinning NAMES & COLORS DualRow (unit-frame | party/raid; class
  keybinds). Do not restore EXBoss split names. MagguuUI no longer ships
  KeystoneLoot BiS. Naming: **Magguu / MagguuUI only** in copy/docs — scrub foreign
  person/author credits; keep addon **product** names (EllesmereUI, BigWigs,
  EXBoss, Northern Sky, Auctionator, …). Do not credit Magguu as author of
  foreign addons.
- Public copy never says bake, dump, recapture, or Tools/dev pipeline. Agent
  MEMORY may still use bake for the MagguuUI_Data pipeline. Name 4K only in
  the product description (`Designed for 4K.` / `Für 4K ausgelegt.`). Do not
  put it in titles, badges, or feature headings. Scale stays 0.58. Keep
  foreign adaptation keys such as `Naowh 1440p`.
- Store paste files live in MagguuUI `docs/store-descriptions/` (canonical).
  CurseForge = WYSIWYG from `curseforge-preview.html`. Wago = Markdown
  `wago-en.md` (forgecdn logo). WoWI = BBCode `wowinterface-en.bbcode` with
  GitHub-raw `public/logo-300.png` (300×300). Do not put `ui.magguu.xyz` logos
  in WoWI `[img]` — default CORP `same-origin` hides them. `/logo.png` and
  `/logo-300.png` keep routeRule CORP `cross-origin` for hotlink; pages stay
  `same-origin`.
- Homepage stats/pills: `GET /api/v1/catalog-summary` only. Do not fetch `/api/v1/profiles` (or layouts/wowup/changelogs) on `/` just to count — those blobs belong on `/strings`.
- ECharts stays admin-only (`utils/echartsSetup.ts` + `components/admin/charts`). Do not restore a global `plugins/echarts.client.ts`.
- Gate: `npm run typecheck`, `npm run lint`, `npm run test:unit`, and `npm run build`. Add `npm run verify:smoke` and `npm test` only when a page, component, layout, or public route changed. After dependency changes also run `npm run audit:prod`.
- Lint with `npm run lint` / `npm run lint:fix` (Nuxt ESLint Flat Config; no separate Prettier). `npm run lint` also runs `lint:uselect` (rejects option-shaped `value: ""`).
- Validation uses Zod.

## WowUp packs (2026-09-15)

- **Starter:** EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore.
- **Optional:** BugGrabber, BugSack, HandyNotes, HandyNotes MapNotes, MDT, Raider.IO, Simulationcraft, Talent Tree Tweaks, Whisper Messenger, Waypoint UI, GTFO, Premade Groups Filter, Auctionator, Smart Reminders.
- **Whisper Messenger** is the whisper addon (Optional + Discord embeds). WIM is retired: no catalog card, no profile row, no WowUp pack. Ellesmere WIM Skin stays retired. No WindTools. HandyNotes MapNotes is on WowUp Optional; Magguu settings apply with HandyNotes via Apply Magguu profiles / Load profiles.

## Audit allowlist / overrides (#117, review-by **2026-11-30**)

`scripts/audit-prod.mjs` ALLOWLIST (build/dev only where noted):
- `simple-git` + `@simple-git/argv-parser` (4.x bricht `@nuxt/devtools`)
- bestehend: `braces`, `node-forge` (from #114)

`package.json` overrides (#117): `vue` / `@vue/server-renderer` **3.5.43**,
`seroval` **1.6.8**, `shell-quote` **1.12.0**, `source-map-js` **1.2.2**,
`js-yaml` **4.3.2** (stay on 4.x; 5 is a major), `postcss-selector-parser` **7.1.6**.
Routine „Magguu Audit Allowlist Review“ ~2. Nov; re-check before review-by.

## Passkey / WebAuthn

- Live: Marco Proton Pass = **PASS**.
- Box-Desktop kann keine Proton-Passkeys -> **kein FAIL** (nicht als Regression werten).
- `#95`: `@simplewebauthn/browser` **14**.

## Admin-Smoke checklist

After Unraid app-image pull / when Buddy asks (Homelab owns container pull):

1. Login `/admin/login`
2. These five routes must be **200** (from #102):
   - `/admin/system/activity`
   - `/admin/strings/profiles`
   - `/admin/strings/layouts`
   - `/admin/data/addons`
   - `/admin/content` (redirects to `/admin/content/home` — treat redirect-to-home as OK)
3. Report to Buddy **only on FAIL** (or short OK if asked).
4. Nach App-Image-Wellen: Prefer **Done-Wave Capture** skill (Buddy/PM) — kein Extra-Ping Homelab wenn Digest schon live.

## Merge reports: Actions-only vs App-Image

Merge reports to Buddy must say which path applies:

- **Actions-only / pin-only Dependabot** → no Homelab pull.
- **App-Image** (Dockerfile / app code that publishes the docker image) → Homelab via Container-nach-CI after green docker publish; Stack does not double-ping Homelab. Skip recreate if live already on handoff digest.

## Product-facts Diff checklist

For PRs / copy / pack deltas:

- Four siblings: MagguuUI / MagguuUI_Data / MagguuUI_EUI / MagguuUI_Media
- EllesmereUI TOC min **9.0.6+**; live **9.2.9**; Magguu bake is **dump-based**; notes track **v12.1.6**
- WowUp Starter: EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore
- Optional includes Whisper Messenger (WhisperMessenger), Auctionator, Smart Reminders, HandyNotes MapNotes; **no WIM / Ellesmere WIM Skin**; **no WindTools**; **no KeystoneLoot / MagguuKSL**
- No EXBoss name-split
- Never MagguuUI git-tag/release without Marco's explicit yes
- Never remove/replace third-party author names

When WowUp/copy product facts change, update Website + MagguuBot + **Magguu-Dashboard** `AGENTS.md` (+ `MEMORY.md` where present) the same round.

## USelect / Reka

Never `value: ""` on select / option items — use a sentinel (e.g. `"all"`). Enforced by `npm run lint` / `npm run lint:uselect` (`scripts/check-uselect-empty-value.mjs`). Content-store rows without `label:` (e.g. guide.vue `value: ""`) are not select options and are ignored by the check.

## Commands

```bash
npm run dev            # dev server
npm run lint           # ESLint + USelect empty-value check
npm run lint:fix       # auto-fix safe ESLint findings
npm run lint:uselect    # reject option-shaped value: "" on select items
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
