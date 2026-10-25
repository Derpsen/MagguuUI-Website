# AGENTS.md

## Project Context

MagguuUI-Website is the Nuxt public site + admin + API for MagguuUI import
strings (EllesmereUI, BigWigs, Northern Sky Raid Tools, class layouts). Live:
`https://ui.magguu.xyz`. Production runs as Unraid container **MagguuUI** from
image `ghcr.io/derpsen/magguuui-website` (LAN origin
`http://192.168.178.21:3000` on `br0`). Ops notes: `MEMORY.md`.

**Live build:** auto-deployed (`magguu-pull` after every green Docker publish). The
current image SHA and build time are at https://ui.magguu.xyz/api/health
(`build.sha`, `build.time`). Do not write a live `sha-…` tag or digest here; deploy
history lives in `MEMORY.md`.

## Grok Bot helpers (renamed 2026-10-16)

Helpers were renamed again 2026-10-16; their IDs did not change. "Website" owns **MagguuUI-Website only**. "Bot & Dashboard" owns MagguuBot + Magguu-Dashboard. "Addon (Lua)" owns the MagguuUI addon Lua. "Code-Review" reviews on request. "Release" does releases (Tag-Gate). "Unraid & Server" does Unraid. Buddy is the front door. Former names: Webcraft, Botsmith, Luaforge, Sentinel, Launchpad, Homebase (before that Stack Fixer, Bot Fixer, Addon Fixer, Reviewer, Release Helfer, Homelab Helfer). Captain (Projects Manager) and all group chats/rooms were deleted 2026-10-16.
**Direct-change rule:** Buddy makes small Website design/text changes directly. Bigger work goes to "Website". Since 2026-10-12 helpers and Buddy push directly to `main` (no PRs, no pre-review); Buddy reviews commits afterwards; after a green Docker publish the no-AI Unraid pull/test script (`magguu-pull`, rollback on failure) pulls the new image.
Style: Marco dislikes "AI slop" (cards, icon boxes, flashy buttons). Use plain structured text with small green mini-label headings.

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
- Perf wave 2026-10-14 (keep these invariants):
  - Homepage screenshots: edit the source JPG in `public/screenshots/`, then
    `node scripts/generate-screenshots.mjs` (sharp, devDep) and commit the
    `-800/-1280/-2000` AVIF/WebP/JPG variants. No runtime image service.
  - Edge cache: only `CDN_CACHEABLE_PATHS` (`server/utils/publicCache.ts`)
    get `CDN-Cache-Control`; browsers always get `max-age=0, must-revalidate`.
    Never add admin/auth/sync/query URLs. Writes purge Cloudflare only with
    `CLOUDFLARE_ZONE_ID` + `CLOUDFLARE_API_TOKEN`.
  - Admin-only CSS lives in `assets/css/admin.css` (imported by the admin
    layout + login), not `main.css`. `ADMIN_ONLY_CHUNK` in `nuxt.config.ts`
    keeps admin chunks out of public prefetch/modulepreload.
  - `/strings` lists use `view=meta`; full strings load per id on copy/edit.
  - Admin dashboard `Live:` line reads `GIT_SHA`/`BUILD_TIME` (docker.yml).
- Queue A–J 2026-10-14 (keep these invariants):
  - RUM: `/api/v1/vitals` stores path + metric + value only (no IP/UA/cookie);
    never add identifiers. Admin view: `/admin/system/vitals` (p75).
  - Search: `/api/v1/search-index` is public data only (full-text since 2026-10-24, see "Full-text search"); `PublicSearch.vue`
    and `web-vitals` stay out of public prefetch (`ADMIN_ONLY_CHUNK`).
  - Speculation Rules (`utils/speculationRules.ts`) must keep excluding
    `/admin*` and `/api/*`.
  - `public/sw.js` is network-first and never caches admin/auth/sync/webhook
    or non-GET. Bump `VERSION` when changing cache layout.
  - Content saves write `content_revisions`; restore goes through
    `/api/v1/admin/content/revisions/:id/restore` (undoable).
  - `NUXT_E2E_SEED=true` (Playwright only, never prod) seeds `E2E Test Pack`.
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
  on the Nuxt 4.5 config types. Do not delete it. TypeScript 7 (typescript-eslint peer <6.1), h3 2 (Nitro 2 / Nuxt 4 pin h3 1),
  js-yaml 5, and @types/node 26 stay blocked without an explicit yes. satori moved to
  ^0.47.1 with nuxt-og-image 7 on 2026-10-16 (hold dropped, #140/#155/#156 closed); satori >=0.48 stays blocked
  (og-image 7 peer ^0.47.1).
- As of 2026-10-14: addon live **v12.1.8**; container runs as **uid 99**;
  images are **Cosign keyless** signed; site defaults to **Dark**; **WIM is
  removed** (Whisper Messenger is the whisper chat); `engines.node >=26.12.0`,
  Node 26 since 2026-10-16 (Marco's yes); Docker base 26.12.1 since 2026-10-23 (still Current, Active LTS expected late Oct 2026).
- CSP lives in `server/plugins/csp-nonce.ts` + `server/utils/htmlCsp.ts`, not
  in routeRules (SWR HTML got the JSON baseline and lost all CSS/JS).
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
- Motion: page View Transitions via `experimental.viewTransition` (Nuxt skips them under reduced motion). Scroll reveal is CSS-only `.reveal` (`animation-timeline: view()`), transform-only (opacity fails contrast audits), never on the LCP section, and off under `prefers-reduced-motion`. No JS animation libs.
- `/imprint` is the **Legal notice** page (labels/title say Legal notice, not Impressum/Imprint): operated from **Switzerland**, contact via `<ContactEmail>` only. No §5 TMG, no name, no postal address. `imprint_*` settings are removed (init deletes old rows); no Germany location anywhere.

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

After Unraid app-image pull / when Buddy asks ("Unraid & Server" owns container pull):

1. Login `/admin/login`
2. These ten routes must be **200** (from #102):
   - `/admin` (dashboard overview, shows "Needs attention" and the Content/Publishing/Traffic/Health sections)
   - `/admin/system/activity`
   - `/admin/system/audit`
   - `/admin/system/visitors` (consented visitor log: Status, Filters, Sessions table with expandable path; read-only look, do NOT press "Export CSV" on live, every export is audited)
   - `/admin/system/status` (status notices: list, Add update / Resolve / Edit / Delete; read-only look, do not create live notices)
   - `/admin/strings/profiles`
   - `/admin/strings/layouts`
   - `/admin/strings/community` (community preset queue: Approve / Reject / View string / Edit label / Delete; read-only look, never approve or delete live submissions)
   - `/admin/data/addons`
   - `/admin/content` (shows the content page list; no redirect anymore)
3. Report to Buddy **only on FAIL** (or short OK if asked).
4. Nach App-Image-Wellen: Prefer **Done-Wave Capture** skill (Buddy) — kein Extra-Ping "Unraid & Server" wenn Digest schon live.

## Merge reports: Actions-only vs App-Image

Merge reports to Buddy must say which path applies:

- **Actions-only / pin-only Dependabot** → no "Unraid & Server" pull.
- **App-Image** (Dockerfile / app code that publishes the docker image) → the no-AI Unraid pull/test script (`magguu-pull`, rollback on failure) after green docker publish; "Website"/Buddy do not double-ping "Unraid & Server". Skip recreate if live already on handoff digest.

## Product-facts Diff checklist

For PRs / copy / pack deltas:

- Four siblings: MagguuUI / MagguuUI_Data / MagguuUI_EUI / MagguuUI_Media
- EllesmereUI TOC min **9.0.6+**; live **9.2.9**; Magguu bake is **dump-based**; notes track **v12.1.8**
- WowUp Starter: EllesmereUI, MagguuUI, BigWigs, LittleWigs, Northern Sky, EXBoss, EXCore
- Optional includes Whisper Messenger (WhisperMessenger), Auctionator, Smart Reminders, HandyNotes MapNotes; **no WIM / Ellesmere WIM Skin**; **no WindTools**; **no KeystoneLoot / MagguuKSL**
- No EXBoss name-split
- Never MagguuUI git-tag/release without Marco's explicit yes
- Never remove/replace third-party author names

When WowUp/copy product facts change, update Website + MagguuBot + **Magguu-Dashboard** `AGENTS.md` (+ `MEMORY.md` where present) the same round.

## USelect / Reka

Never `value: ""` on select / option items — use a sentinel (e.g. `"all"`). Enforced by `npm run lint` / `npm run lint:uselect` (`scripts/check-uselect-empty-value.mjs`). Content-store rows without `label:` (e.g. guide.vue `value: ""`) are not select options and are ignored by the check.

## Dependabot + pre-push (2026-10-16)

- `.github/dependabot.yml`: npm and github-actions patch+minor come as grouped PRs; majors stay separate. Ignored: h3 2.x, TypeScript majors, js-yaml >=5, satori >=0.48 (nuxt-og-image 7 peer ^0.47.1).
- `.github/workflows/dependabot-automerge.yml` (pull_request_target): labels patch/minor PRs (never majors); `gh pr merge --auto --squash`. Since 2026-10-16 allow_auto_merge=true and main requires `build (26, false)` + `Analyze (javascript-typescript)` (enforce_admins=false, no reviews), so direct pushes by Derpsen still work. If the matrix/job names change, update branch protection. **Dependabot security updates are on (2026-10-23).** Security PRs skip grouping/cooldown on purpose and take the same path: fetch-metadata still reports `version-update:semver-*`, so a security patch/minor auto-merges after CI and a security major waits for a human.
- Run `npm run hooks:install` (`git config core.hooksPath .githooks`) once per clone. `.githooks/pre-push` runs lint, typecheck, test:unit, and actionlint (skipped if not installed).

- `docker.yml` push uses a `paths` filter: `*.md`, `docs/`, `.github/`, `.githooks/` changes do not build (except `docker.yml` itself); workflow_dispatch stays for the Dependabot dispatch.
- `post-deploy-smoke.yml`: after a successful docker run on main (polls up to ~15 min for the Unraid pull and the matching `/api/health` build sha), daily 05:23 UTC, and manual. Checks `/`, `/admin/login`, `/api/health` = 200. Red only when the site is down; a sha mismatch alone is just a warning.

## Security / quality CI (2026-10-17)

- `scorecard.yml` (OpenSSF, weekly + .github pushes, SARIF to code scanning), `dependency-review.yml` (PRs, fails on high), `quality.yml` (actionlint 1.7.12 sha256-pinned + zizmor 1.31.1, medium+), `drift.yml` (see below), `osv-scanner.yml` (advisory).
- zizmor: checkouts use `persist-credentials: false`; docker.yml has no npm cache; the `pull_request_target`/`workflow_run` triggers are ignored inline (no PR code runs).
- Secret scanning + push protection enabled (public repo, free).
- Dependabot `cooldown` (since 2026-10-23, zizmor dependabot-cooldown): 7 days everywhere. npm sets `default-days` + `semver-major|minor|patch-days: 7`; actions + docker only `default-days: 7` (semver-*-days is npm-only). Security updates are not subject to cooldown.
- Playwright: `tests/support/warmup.ts` warms the dev server; readiness probe is `/api/health`.

## Docs drift (2026-10-22)

- `tools/docs-drift.sh` (generic, copy 1:1 to other Magguu repos) reads `.github/docs-drift-rules.txt` (`regex<TAB>reason[<TAB>allow[<TAB>file-scope]]`, `@files`, `@allow`, `@health-url`) and prints `file:line: reason`; exit 1 on hits. AGENTS.md must not name a live `sha-…`/digest (rule scoped to AGENTS.md; MEMORY.md history is fine), and `@health-url` checks that `/api/health` answers 200.
- `.github/workflows/docs-drift.yml` (Mon 05:17 UTC + dispatch) opens/updates one issue "Docs-Drift" assigned to Derpsen, and closes it when clean.

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

- **Grok Bot helpers ("Website" etc.) under Buddy:** Standing autonomy. For clear in-scope Website work (bugs, redesign, copy, logos, deps), commit, push, and merge to main **without asking Marco** and without waiting for a go-ahead. Never force-push. Never publish unrelated dirty WIP. Report only to Buddy (short German + links). Marco only reads Buddy — do not ask him for permission in this chat.
- Tags and releases still need an explicit release ask via Buddy.
- Manual human Cursor sessions (Marco himself): do not commit/push/tag unless he asks.

## Grok Bot / Buddy

Marco uses Grok Bot "Buddy" as the single front door. Helpers report back to
Buddy.

## Private addon repo (2026-10)
- `Derpsen/MagguuUI` is private: never link it publicly. Downloads → CurseForge, changelog → `/changelog`, issues → `/about#contact`.
- `utils/privateRepoLinks.ts` (`isPrivateRepoUrl`, `rewritePrivateRepoLinks`); `server/plugins/init.ts` rewrites DB content/FAQs/changelogs and clears a private `github_url` idempotently on boot.
- `NUXT_GITHUB_REPO` sync config (server-side, authenticated) stays as is.
- Link check: CurseForge/Wago/WoWI 403/429 = pass; real 404s fail. `tests/private-repo-links.spec.ts` guards the public pages.

## Work computer

Helper work computer is the Unraid VM `Ubuntu` (machineId `3ff4cee8-7e7c-4cc9-a262-ebf10016d570`), repos under `~/Projekte`. Marco's PC (`f01cf815-a384-40fb-ac18-c8450b4d5889`) is only for the WoW AddOns deploy.

## Blocked majors: why (checked 2026-10-23)

- **TypeScript 7** (7.0.2): typescript-eslint 8.72 peer is `>=4.8.4 <6.1.0`. Stay on TS 6.0.x until typescript-eslint supports 7.
- **h3 2** (2.0.8): Nitro 2 (nitropack 2.13.5) needs h3 1. Nitro 3 is still beta (`3.0.260903-beta`), and Nuxt 4 is on Nitro 2.
- **satori ≥0.48** (0.63.2): nuxt-og-image 7.0.7 peer is `satori ^0.47.1`.
- **js-yaml 5** (5.5.0): major; the override stays at 4.3.2 until Marco says yes.
- Security: private vulnerability reporting is on (2026-10-23). CodeQL runs as the advanced workflow, so default setup stays off (the two conflict). Docker publish (`build-and-push`, the only job with `attestations: write` + `id-token: write`) ships buildx provenance + SBOM, a keyless Cosign signature, and a GitHub artifact attestation (`actions/attest-build-provenance` v4.2.2, pushed to GHCR). Verify with `gh attestation verify oci://ghcr.io/derpsen/magguuui-website:latest --owner Derpsen`. Immutable Releases: untouched (no releases).

## zizmor advisory workflow + reporting rule (2026-10-23)

- `.github/workflows/zizmor.yml` runs zizmorcore/zizmor-action v0.8.0 (SHA-pinned, zizmor 1.31.1, `min-severity: informational`) on push to main, PRs and dispatch. It is advisory only and ends green: step-level + job-level `continue-on-error: true`, findings in the log and `$GITHUB_STEP_SUMMARY`, not a required check, `contents: read` only. There is no SARIF upload (`advanced-security: false`), so no `security-events: write` and no duplicate code-scanning alerts. The blocking gate remains zizmor medium+ in `quality.yml`. Findings are read from the job log; do not fix them without a task.
- Reporting to Buddy: exactly **one** Done message per task, about 800 characters max, plus a path/commit for details. Interim updates only for tasks longer than 30 minutes.


## Security fixes 2026-10-23 (audit run-20261023)

- **Admin gate:** `server/middleware/admin-api.ts` checks the prefix on `canonicalRequestPath(event.path)` (`server/utils/requestPath.ts`). That function decodes repeatedly until stable, turns `\` into `/`, collapses `//`, resolves `.`/`..` and lowercases. A malformed path or one still changing after 5 decode rounds gets 400. Every `server/api/v1/admin/**` handler also calls `requireAdminAccess(event)` (`server/utils/adminAccess.ts`: JWT + viewer read-only, cached on `event.context.adminAuth`) or `requireAdmin`. **A new admin handler must start with one of these.** E2E: `tests/admin-path-bypass.spec.ts`.
- **Login throttle:** password login uses exponential backoff, not account lockout (`server/utils/loginBackoff.ts` + `loginThrottle.ts`, keys `login-fail:ip:*` / `login-fail:user:*` in `rate_limits`).
  - Per IP: 5 free failures, then 30 s doubling up to 15 min.
  - Per account: `max_login_attempts` free failures, then doubling up to `lockout_duration_minutes`.
  - Per-IP burst cap: 20/min.
  - Nothing sets `isLocked` automatically any more. `getCurrentAuthUser` no longer rejects sessions because of `isLocked` (it only blocks new logins). Revoke sessions explicitly.
  - Passkey login is unchanged.
- **Client IP:** `getClientIp` trusts `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` only when the socket peer is in `NUXT_TRUSTED_PROXIES` (`server/utils/trustedProxy.ts`). Otherwise it uses the socket IP. `getClientIp`, `rateLimitIpKey` (/64) and `rateLimitGroupKey` (/48, IPv4 /24) live in `server/utils/clientIp.ts` (pure, no DB).
  - The setting takes IPs or CIDRs, or the keywords `private` (the default when unset: loopback + RFC1918 + ULA/link-local) or `none`.
  - The container on br0 (`192.168.178.21:3000`) **is reachable directly from the LAN**. With the default, only LAN hosts can still spoof the header.
  - To close that, set `NUXT_TRUSTED_PROXIES` to the cloudflared address. After a deploy, `docker logs MagguuUI | grep trusted-proxy` prints it once.

## Changelog feeds, filter and ?since= (2026-10-24)

- **Feeds:** `/changelog/feed.xml` (RSS 2.0) and `/changelog/atom.xml` (Atom 1.0), Nitro routes in `server/routes/changelog/`, built by `server/utils/changelogFeed.ts` (pure, no DB) and served by `changelogFeedResponse.ts`. Rows: `isPublished`, version `v%`, never `Unreleased`/`auto`, newest 20 by `publishedAt`, `contentEn || content` rendered with `renderMarkdownToSafeHtml`. XML is escaped (`escapeXml` drops illegal control chars and lone surrogates; HTML body is escaped once more as text). Item/entry URL is `https://ui.magguu.xyz/changelog#release-<slug>`.
- **Caching:** `Cache-Control: public, max-age=600, stale-while-revalidate=3600` plus a content ETag (304 on `If-None-Match`). Do **not** pass h3 `maxAge` (adds `s-maxage`) or `modifiedTime`: `server/plugins/public-cache-invalidate.ts` rewrites any `s-maxage` Cache-Control to browser revalidate and drops Last-Modified.
- **Page:** `pages/changelog.vue` has a plain GET form (works without JS, server-rendered from `route.query`): `?since=` (exclusive), `?from=` / `?to=` (inclusive), `?q=` (text match). `<link rel="alternate">` for both feeds is in `useHead`, plus visible "Subscribe: RSS · Atom" links. While filtering, Unreleased is hidden, the h1 is the label, and collapse is off.
- **Data-model limits:** there is one addon (MagguuUI) and no addon field, so the "addon" filter is `q`, a case-insensitive match on the release text (for example BigWigs). The only hide flag is `isPublished`. The page API returns the newest 24 releases, so filters cannot reach older ones.
- **Semver rule** (`utils/changelogVersion.ts`, shared by page and tests): optional `v`, numeric parts compared numerically and padded with 0, a pre-release suffix such as `-Dev-16` sorts **before** its release (12.1.6-Dev-16 < 12.1.6). Unparseable input is ignored and reported in an inline `role=alert`.
- **Tests:** `tests/unit/changelogVersion.test.ts`, `changelogFeed.test.ts`, `tests/changelog-filter.spec.ts`. The E2E rows v0.9.1 to v0.9.3 (0.9.1 and 0.9.3 contain "Zebrafish") come from `server/plugins/e2e-seed.ts` (only with `NUXT_E2E_SEED=true`, never in production). Specs bound with `to=0.9.9` because real rows exist in a dev DB. The seed also holds an `Unreleased` row and an unpublished `v0.9.4` so the feed specs prove neither is listed.
- **Caching:** feeds keep a bounded in-process memo (one rendered body per kind, keyed by a hash of the entry data, so edits show up without invalidation). `/changelog` has deliberately NO page-level `swr` route rule: Nitro keys the route cache on the full URL, so `?since=` variants would each get an entry. The page reads the bare, swr-cached `/api/v1/changelogs`; the bare URL is still edge-cached through `CDN-Cache-Control`, query variants never are.

## Drift guard + osv-scanner (2026-10-24)

- **Drift:** `tools/magguu-drift.py` (stdlib, read-only, no network; shared with MagguuUI and MagguuBot) replaced `tools/drift-check.sh`. Run `python3 tools/magguu-drift.py --repo website --allow tools/drift-allow.txt -v`. Checks: banned addon names (public files strict, internal docs only in negation/history context), WowUp starter/optional packs in docs, button label, `engines.node >=26.12` + Dockerfile Node, EllesmereUI min, locked majors (ERROR in package.json, WARN for transitives in the lockfile; the nested h3 2 and @types/node 26 warnings are expected), uid 99 + keyless cosign. Exit 1 only on ERROR. Skipped: CHANGELOG*, MEMORY.md, tests/**, tools/**.
- **Allow list:** `tools/drift-allow.txt` is now `<glob>[TAB<line-regex>]`. A bare glob allows the whole file; a regex allows only matching lines. Keep entries narrow and give a reason in a comment.
- **CI:** the guard runs in its own workflow `.github/workflows/drift.yml` **without paths-ignore**, so docs-only changes are checked (quality.yml still skips `**/*.md`). `docs-drift.sh` (weekly, live health URL) is unchanged.
- **osv-scanner:** `.github/workflows/osv-scanner.yml` (v2.7.0, sha256-verified, push/PR on `package-lock.json`/`osv-scanner.toml`, weekly Monday) is **advisory and ends green** (step + job `continue-on-error`, output in the job summary). The blocking dependency gate stays `npm run audit:prod`. Ignores live in `osv-scanner.toml`, each with a reason and `ignoreUntil` (2026-11-30): nuxt GHSA-vjh5-4x84-xrqp (false positive, 4.6.2 is the fix), node-forge GHSA-86w9-cpqp-85rv (no fix, dev server only), serialize-javascript GHSA-m5mm-p8h7-m29v (low, build-time; fix is a normal Dependabot bump). The nested h3 2 / @types/node 26 have no advisory today; if one appears, ignore it with a reason, never bump the locked major.
- **Workflow rule:** never put `${{ }}` inside a `run:` script; pass values through `env:` (dependabot-automerge.yml:128 was fixed this way).

## CI failure alarm (2026-10-24)

- `.github/workflows/failure-alarm.yml` is a reusable workflow (`workflow_call`, same template as MagguuUI `failure-alarm.yml` and MagguuBot `ci-alarm.yml`). An `alarm` job at the end of `build.yml`, `docker.yml`, `codeql.yml` (push + schedule), `quality.yml`, `drift.yml` and `post-deploy-smoke.yml` calls it with `if: failure()` on `refs/heads/main` only (the smoke passes `commit_sha: workflow_run.head_sha`). Not wired into the advisory `zizmor.yml` / `osv-scanner.yml`. Fork PRs never get repo secrets, so they would skip silently anyway.
- Secrets `ESCALATION_WEBHOOK_URL` and `ESCALATION_BEARER` (the bearer is the bare token; the workflow builds `Authorization: Bearer <token>`) are repo secrets, passed explicitly (never `secrets: inherit`), only through `env:`. URL and bearer reach curl through a `-K -` config on stdin (never argv), `set +x`, curl stderr and the response body are dropped, only the HTTP status is logged. Never print, echo or commit them.
- Payload: repo, workflow, run URL, commit SHA, branch, event, `dedupe_key = workflow@sha`, and up to ~20 masked log lines of up to 3 failed jobs (ANSI/timestamps stripped, `ghp_`/`github_pat_` tokens, `Bearer/Basic/Token x`, `Authorization:` lines and both secret values masked).
- **Dedupe:** one alarm per run (`run_attempt > 1` sends nothing), no alarm when an earlier run of the same workflow on the same commit already failed (Actions API lookup, needs `actions: read`), plus `dedupe_key` for the receiver. Empty secrets = silent exit 0. The step and the job are `continue-on-error`; the script always exits 0.
- **Test:** `tools/failure-alarm.test.sh` extracts the script from the workflow and runs it against a fake `gh` and a local HTTP server (no real webhook); it runs in `quality.yml`. Keep the script the last step and the whole `run:` block. `.github/zizmor.yml` ignores `self-repository` for the callers because actionlint 1.7.x rejects `uses: $/...`; `quality.yml` passes `--config .github/zizmor.yml`.

## SEO modules (2026-10-24)

- **Modules:** `@nuxtjs/sitemap` 9.1, `@nuxtjs/robots` 7.0, `nuxt-link-checker` 6.0 (the individual packages, NOT the `@nuxtjs/seo` umbrella, which would also pull nuxt-ai-ready, nuxt-skew-protection and nuxt-seo-utils). All need Nuxt ^4.6 and Node ^22.22 / ^24.15 / >=26 and share `nuxt-site-config` and `nuxtseo-shared` with nuxt-og-image 7.0.7; satori stays 0.47.1. `nuxt-schema-org` was evaluated but not added: the home page (WebApplication + WebSite) and FAQ (FAQPage) already carry factual hand-written JSON-LD and a module would only duplicate it.
- **Sitemap:** `server/api/__sitemap__/urls.ts` is the single source (`excludeAppSources: true`): the nine public pages with changefreq/priority, `lastmod` from the newest published changelog for `/` and `/changelog`. Never admin, API, feeds or `?since=` variants. `credits: false`, `xsl: false`. The old `server/routes/sitemap.xml.ts` and `public/robots.txt` are gone (a static public file would shadow the module).
- **Robots:** one group `* Allow: /`, `Disallow: /admin/`, `Disallow: /api/` (identical to the old file) plus the `Sitemap:` line. The module also adds `X-Robots-Tag` and a robots meta to public pages; admin keeps its route-rule `noindex`. `/changelog?since|from|to|q` is `noindex, follow` via `useRobotsRule` in `pages/changelog.vue` (canonical already points at `/changelog`). Dev answers `Disallow: /` unless `?mockProductionEnv` is added (the E2E uses it).
- **Languages:** the site is English only; there is no per-language sitemap or hreflang. When i18n lands, add alternates in the sitemap source.
- **OG images:** unchanged and already per page via `usePublicPageSeo` (Takumi `components/OgImage/MagguuOg.takumi.vue`, `/_og/...png`), including Guide and Changelog.
- **Link checker:** `linkChecker.enabled` only with `LINK_CHECK=1`; then the build prerenders the public pages (`nitro.prerender`) and writes `.output/link-checker-report.{md,json}`. CI: `.github/workflows/link-check.yml` (PR on pages/components, manual) is warning-only (continue-on-error, summary + annotations); the weekly live check stays `linkcheck.yml`. Never set `LINK_CHECK` for the image build. Excluded as known false positives: curseforge.com (403 for bots) and the `no-uppercase-chars` inspection (addon names). Remaining warnings: a few `<a>` without href (`no-missing-href`).
- **Tests:** `tests/seo.spec.ts`.

## Strings page: copy button, stamps, single-module guide (2026-10-24)

- **Copy button:** `components/StringCopyButton.vue` (plain bordered button "Copy string" / "Copied", `.string-copy-btn` in main.css) plus an always-present `role="status" aria-live="polite"` span ("Copied to clipboard"). The logic is `utils/clipboard.ts` `copyTextToClipboard`: Clipboard API, then hidden-textarea `execCommand('copy')`; it returns false when both fail and the page then shows an error toast and never flips to "Copied". No inline style attributes (CSP safe).
- **Stamp:** `utils/stringStamp.ts` builds "Version X.Y.Z, updated YYYY-MM-DD". Date = the row's `updatedAt` (UTC day). Version = newest published `vX.Y.Z` changelog release whose UTC publish day is on or before that day (from `GET /api/v1/release-stamps`, swr 120, published rows only, never Unreleased). There is NO per-string version column, so this is a best-effort inference; with no matching release only "Updated YYYY-MM-DD" shows. Profile, layout and WowUp rows all carry `updatedAt`; admin PUT/PATCH bumps it.
- **Guide section "Apply only one module"** (`#apply-one-module` in `pages/guide.vue`, static, not in the editable steps) was verified against the addon source: `MUE:InstallAll` (MagguuUI_Data/Profiles/Setup.lua) has no per-module selection, only the "Include Magguu Settings" toggle. Single imports live in Setup under Required/Optional (`MUE:BuildIndividualProfileOptions`, MagguuUI_EUI/Tools.lua): EllesmereUI profile, class layouts, BigWigs, Northern Sky, EXBoss, Smart Reminders, Whisper Messenger (optional ones only while the addon is installed). WaypointUI, HandyNotes, Talent Tree Tweaks, GTFO, BugSack and PGF have no single-import button. Re-check this list when the addon's Setup page changes.
- Tests: `tests/unit/stringStamp.test.ts`, `tests/unit/clipboard.test.ts`, `tests/strings-copy.spec.ts`.

## Full-text search (2026-10-24)

- No Nuxt Content, no new dependency: Nuxt Content would add its own SQLite store, a second content source next to `site_content`/`changelogs` (both are DB-edited in the admin), and a build-time index, which does not fit this stack. Instead the existing Ctrl+K palette (`components/PublicSearch.vue`, lazy) got full-text matching.
- `server/utils/searchIndex.ts` now also emits Changelog entries (published `vX.Y.Z` only, newest 24, `contentEn || content`, never Unreleased/drafts) and a plain-text `body` (capped at `SEARCH_BODY_MAX`) for Guide steps, FAQ and Changelog. Strings stay label-only. `STATIC_GUIDE_SECTIONS` lists guide sections that are static in `pages/guide.vue` (currently `#apply-one-module`); update it when that copy changes.
- `utils/searchMatch.ts` does the matching in the browser: every word must occur (case-insensitive substring) in label, preview or body; label > preview > body; body-only hits show a snippet. Groups are passed with `ignoreFilter: true`, so the palette's Fuse filter is off. Trade-off: no typo tolerance any more.
- Tests: `tests/unit/searchMatch.test.ts`, `tests/unit/searchIndex.test.ts`, `tests/queue.spec.ts` ("full-text search"), plus the axe test for the search dialog.

## Lighthouse budgets (advisory, 2026-10-24)

- `.github/workflows/lighthouse.yml` builds the app, serves `.output/server/index.mjs` and runs Lighthouse CI (pinned `treosh/lighthouse-ci-action`, 3 runs, median) on `/`, `/changelog`, `/guide`, mobile + desktop (`.github/lighthouse/{mobile,desktop}.json`, performance category only).
- Triggers: `pull_request` (app-code path filter), weekly schedule, `workflow_dispatch`. Not on push. Permissions `contents: read`, no secrets, no public upload (the old `temporaryPublicStorage` upload is gone).
- Budgets live in `.github/lighthouse-budgets.json` (min performance score, max LCP/TBT in ms, max CLS, max transferred JS in KB), calibrated on the first GitHub-runner run and set slightly below it (mobile `/changelog`: ~82 / LCP ~4.0 s after the icon fix, was 70 / 8.3 s). `tools/lighthouse-budget.mjs` (unit-tested) writes the table to `$GITHUB_STEP_SUMMARY` and one `::warning::` per exceeded budget, and always exits 0.
- The job has `continue-on-error: true`, is not a required check and has no failure-alarm job. Do not add one. Shared runners are noisy: treat a single warning as a hint, re-run before acting. Re-calibrate the budgets after intentional app changes.
- `lighthouse-live.yml` (weekly snapshot of the production site: `/`, `/guide`, `/changelog`, `/strings`, all four categories) is kept for what only live shows. It reads `.lighthouseci/manifest.json`, is advisory (`continue-on-error`, no alarm job).
- Gotcha: Lighthouse's simulated (Lantern) LCP waited for the 880 KB `logo.png` that Chrome fetches as the PWA manifest icon, which put mobile `/changelog` LCP at 8.3 s while the real observed LCP was ~0.3 s. The manifest now points at small `icon-192.png` / `icon-512.png` (256-colour, 7 KB / 25 KB). Keep manifest icons small; `logo.png` stays for hotlinks/OG.

## Search typo fallback (2026-10-24)

- `utils/searchMatch.ts`: only when the strict pass finds nothing, tokens of 4+ characters also match words one edit (insert/delete/replace) away from a word or from its first token-length (+-1) letters. Every token must still match. No dependency, about +0.3 KB gzip.

## What's new banner (2026-10-24)

- `components/WhatsNewBanner.vue` (mounted client-only in `layouts/default.vue`, public pages only) compares the newest published release (`/api/v1/release-stamps`, never Unreleased/drafts) with localStorage `lastSeenVersion`. Logic and tests: `utils/whatsNew.ts`, `tests/unit/whatsNew.test.ts`, `tests/whats-new.spec.ts`.
- First visit: just records the value, shows nothing. Newer release: small `position: fixed` region ("New release") linking to `/changelog?since=<previous>`, with Dismiss and Esc. Dismiss, following the link or opening /changelog records the newest version. Rollbacks and unreadable values re-record silently.
- No cookies, not in the server HTML, fixed positioning (no CLS), fade-in only under `prefers-reduced-motion: no-preference`. The release fetch runs on idle after mount. Playwright tests must not assume the E2E seed is the only data: read the newest version from the API.

## Admin command palette (2026-10-24)

- `components/CommandPalette.vue` is mounted only by `layouts/admin.vue` (admin routes are client-only and the guard restores the session first), so Ctrl/Cmd+K there never collides with the public search in the default layout. Pure logic (filter, grouping, wrap-around keys, theme/logout actions) lives in `utils/adminCommands.ts` with unit tests.
- Items: every sidebar page plus its tab/sub-pages (`Settings › Security`, derived from `useAdminNavigation`), the `New ...` shortcuts, "Open public website", "Switch to light/dark mode" and "Log out" (the same `useAuth().logout` as the sidebar button). Adding an admin route to `useAdminNavigation` makes it appear here automatically.
- A11y: input is `role=combobox` with `aria-controls`/`aria-activedescendant`, the list is a `listbox` of `option`s in labelled groups, a polite live region announces the result count, Esc closes, UModal traps focus and returns it to the trigger.
- The palette is teleported outside `.admin-shell`, so `.admin-command` defines its own `--admin-*` tokens from the Nuxt UI ones. Playwright admin tests share the single login in `tests/admin-content-live.spec.ts` (login is rate-limited): add new authenticated specs there.

## Failure alarm hardening + robots headers (2026-10-25)

- Log text in the alarm goes through `tools/redact-log.sh` (ported from Derpsen/MagguuUI, commits 7544478/47b2633; tests in `tools/redact-log.test.sh`, run in `quality.yml`). The workflow sparse-checks-out that one file and is fail-closed: missing script, failing script, or output that still contains the webhook URL/bearer sends a fixed `[log omitted: ...]` line instead of log text. Because of the checkout, the six callers must grant `contents: read` next to `actions: read` (a reusable workflow cannot exceed its caller's permissions).
- **Fixture rule:** never commit a full key-shaped literal in tests (AWS `AKIA`/`ASIA` ids, `ghp_`, JWTs...): GitHub secret scanning flags them even when fake. Build them at runtime (prefix and rest as separate parts, e.g. `AWS_AKIA="AK""IA${REST}"` in `tools/redact-log.test.sh`). Alert #1 was such a fixture and was closed as `used_in_tests`.
- Dedupe lookup only counts failed runs of the same workflow on the same SHA with `head_branch == main` and event push/workflow_run/schedule/workflow_dispatch, never PR runs. `tools/alarm-conditions.test.py` (quality.yml) evaluates every caller's `if:`, checks `needs` covers all jobs of the workflow, permissions and explicit secrets. Known and intended: a failed tag build (`docker.yml` on `v*.*.*`) does not alarm (main only).
- Robots: `robots.robotsDisabledValue` is `noindex, nofollow, noarchive` (the module overrides route-rule headers for Disallow paths, so `/admin/**` only had noarchive in the route rule, not on the wire). The module skips `/api/*`, so `/api/**` gets `X-Robots-Tag` via a route rule, and `server/plugins/robots-errors.ts` forces noindex on every 4xx/5xx (404 pages used to say `index, follow`). It must hook Nitro's `error` event: in a production build the Nitro error handler sends rendered error pages directly, so `beforeResponse` never fires for them (dev mode does fire it, so a dev-only test can pass while prod is wrong). Check with `npm run build` + `node .output/server/index.mjs` (needs a throwaway `NUXT_JWT_SECRET`) and `curl -D-`.

## Admin drafts + live preview + Publish (2026-10-25)

- Editors with drafts: **Home, Guide, Pages** (site content). Draft state lives in its own table `content_drafts` (page/section/key/locale unique, value, type, user_id, updated_at), created by `CREATE TABLE IF NOT EXISTS` in `server/database/bootstrap.ts` (additive, idempotent, no destructive migration). `site_content` stays the only thing the public site reads, so public pages, feeds, search index and sitemap cannot show drafts.
- API (all `requireAdminAccess`): `GET/POST/DELETE /api/v1/admin/content/drafts?pages=a,b` and `POST /api/v1/admin/content/publish`. Logic is in `server/utils/contentDrafts.ts` (takes a `sqlite` handle, unit-tested in memory); `bulk.post.ts` stays the direct-publish path for API clients and shares `applyContentItems`. Publish writes `content_revisions` like a normal save, so history/restore still works, and the public-cache plugin clears the cache because publish is a non-GET under `/api/v1/admin/`.
- Client: `useContentDraft(pages)` + `AdminDraftBar` (mono mini-label "Unpublished changes", Publish, Discard draft with a two-step confirm). Editors send only cells that differ from the published values (`utils/contentDrafts.ts`), so the draft count is the number of really changed fields. The editor button is "Save draft" (test ids `*-save` unchanged); Publish also saves unsaved edits first.
- Live preview: only the Pages editor renders the real public markup (`components/PageView/{About,Imprint,Privacy}.vue`, also used by `pages/about|imprint|privacy.vue`; HTML goes through `SafeHtml`). The Home/Guide previews remain the older approximations. Changelog (`isPublished`/Unreleased) and FAQ (`isVisible`) keep their own per-entry toggles, no content drafts.
- Drafts are global per page (shared by admins). Tests: `tests/unit/contentDrafts.test.ts`, `tests/content-drafts-public.spec.ts` (unauth 401), and the draft → preview → publish → public flow in `tests/admin-content-live.spec.ts` (gotcha: the editor reloads after Publish/Discard, wait for the form before typing).

## Admin audit log with diff + undo (2026-10-25)

- Table `audit_changes` (id, action, entity_type, entity_id, entity_key, entity_name, before_json, after_json, user_id, actor_name, undo_of, undone_by, created_at), created by `CREATE TABLE IF NOT EXISTS` in `server/database/bootstrap.ts` (additive, idempotent). It is separate from `activity_log` (that stays the plain event feed on `/admin/system/activity`) and from `content_revisions` (still the per-cell history).
- Code: `server/utils/auditRedact.ts` (central redaction), `server/utils/auditLog.ts` (record, list, prune, undo; takes a `sqlite` handle, unit-tested in memory), `utils/auditDiff.ts` (line diff for the UI), `pages/admin/system/audit.vue`. API (both `requireAdminAccess`): `GET /api/v1/admin/audit` (filters type/action/actor/search/dateFrom/dateTo/page) and `POST /api/v1/admin/audit/:id/undo`.
- Audited: content cells (bulk save, publish, revision restore), changelog, FAQ, settings (key level), profiles, WowUp strings, layouts. Not audited on purpose: users, API keys, custom fields, addons, FAQ reorder, bulk deletes. A new audited write path should call `recordAuditSafe` (best effort, never fails the admin action).
- Redaction: key names (password, hash, token, secret, api key, passkey/webauthn, session, cookie, webhook, ...) become `[redacted]`, string values are scrubbed by shape (webhook URLs, Bearer/JWT, private keys, bcrypt/argon2, GitHub/Slack/AWS tokens, URL credentials, long hex), oversize snapshots are truncated. Applied on write and again on read. Entries whose before-state contains a marker/truncation are not undoable. Content cells use neutral key names (`redactKeys=false`) so copy such as "cookies" is not mangled, values are still scrubbed. Never put raw rows or request bodies into an audit snapshot without going through this helper.
- Undo is only for content, changelog and FAQ. It runs in one transaction, refuses if the current state differs from the stored after-state (409 `conflict`), refuses repeat undo and undo of an undo (422), re-inserts deleted changelog/FAQ rows under their old id, and writes a new audit row (`undo_of`) while the original gets `undone_by`. The page asks for a second confirm ("Restore before-state").
- Retention: newest 5000 rows and 90 days (`AUDIT_MAX_ROWS`, `AUDIT_MAX_AGE_DAYS`), pruned on every insert.
- Tests: `tests/unit/auditLog.test.ts`, unauth 401 in `tests/content-drafts-public.spec.ts`, full flow (diff, undo, conflict, secret never stored) in `tests/admin-content-live.spec.ts`.

## Admin dashboard overview (2026-10-25)

- `/admin` (`pages/admin/index.vue`) was rewritten in place (no second dashboard) as plain sections with mono mini-label headings and simple stat rows, no cards or icon boxes: Needs attention (drafts, unpublished changelog entries, stale strings, DB failure), Content counts, Publishing (latest `vX.Y.Z` changelog, last content publish and last change from the audit log, last change per type), Traffic from the site's own counters (7 days, trend vs previous week, most copied 30 days), Health of this site (DB check, DB size, uptime, audit/activity row counts, build SHA line) and Recent changes (last 8 audit entries).
- SITE DATA ONLY: no bot, Plex, Unraid, Discord or GitHub data and no external calls. The old GitHub release/alerts cards were dropped from the dashboard (GitHub Sync keeps its own page). Never add secrets or audit snapshots to the overview; recent changes carry id/action/type/name/actor/time only.
- One endpoint: `GET /api/v1/admin/overview[?fresh=1]` (`requireAdminAccess`, read-only). Aggregation lives in `server/utils/adminOverview.ts` (`buildOverview(sqlite, env)`, takes a handle, unit-tested in memory), a 10 s in-memory cache (`getOverview`, the Refresh button sends `fresh=1`), view helpers in `utils/overviewView.ts`. `/api/v1/admin/stats` stays for the Analytics page.
- "Last content publish" is the newest audit row of type content whose name ends in `published`, so keep that naming in `publish.post.ts`. Tests: `tests/unit/adminOverview.test.ts`, unauth 401 in `tests/content-drafts-public.spec.ts`, the admin view in `tests/admin-content-live.spec.ts`.

## Profile previews `/profiles` (2026-10-25)

- Public page `/profiles` ("Profile previews", header nav + footer + sitemap + `CDN_CACHEABLE_PATHS`). Data: `GET /api/v1/profile-previews` = visible+available addons that have at least one VISIBLE profile (names from the DB, via `readGroupedProfileIndex`); no import strings, nothing unpublished. No new tables.
- Images: `public/previews/<addon-slug>.<webp|avif|png|jpg|jpeg>` (webp first), 1600x1000 (16:10, fixed frame, `object-fit: cover`). The server lists the folder at runtime (`server/utils/previewFiles.ts`, 10 s cache in prod, none in dev); no file → neutral "Preview image to be added" placeholder, never a fake screenshot. Pure resolution lives in `utils/previewImages.ts`. In production images are part of the build (Nitro's asset manifest is fixed at build time), so a new file needs a deploy.
- Image list + naming: `docs/preview-images.md` (a unit test fails when a slug in `PROFILE_KEY_BY_SLUG` is missing there). First image eager/high priority, the rest lazy; width/height always set.
- `/profiles` has NO swr route rule (the folder is read live); the E2E in `admin-content-live.spec.ts` creates a profile, drops a temp `public/previews/ellesmereui.webp` (only if none is committed) and removes it again.
- Header nav switched from `md` to `lg` (7 links no longer fit at 768 px); below that the hamburger menu is used.

## Profile configurator `/configurator` (2026-10-25)

- Public, indexable page (sitemap, footer, `PublicSetupNav`, `CDN_CACHEABLE_PATHS`; canonical is the bare path). Data: `GET /api/v1/configurator` = visible+available addons, VISIBLE profile ids/names, the two published WowUp collections ("Required" = Starter, "Optional") with their addon names; no import strings (strings are fetched one at a time on click via `/api/v1/profiles/:id`).
- State lives only in the URL: `?addons=<slug,slug>` (EllesmereUI is always included) and `?exclude=<slug:Profile name,...>` (profiles unticked; default is all profiles of a selected addon). Tokens only escape `,` and `%` (the router encodes the rest; pre-encoding double-encodes). Parsing is lenient: unknown slugs/profiles, duplicates, bad escapes and >2000 chars are dropped. No cookies, no storage, no `trackCopy`.
- Logic is in `utils/configurator.ts` (unit tests `tests/unit/configurator.test.ts`); server shaping in `server/utils/configuratorData.ts`. Pack membership comes from the real pack contents (normalized name match), not a hard-coded list.
- Honesty rules: `MUE:InstallAll` applies everything, so the page says there is no per-module apply. WowUp collections install everything inside; no custom/subset WowUp string is generated (format unverified), a plain addon list is offered instead. `SINGLE_IMPORT_SLUGS` (ellesmereui, bigwigs, northern-sky-raid-tools, exboss, smart-reminders, whisper-messenger) mirrors the addon's Setup page (verified 2026-10-24); re-check it whenever the addon's Setup page changes. Class layouts are not part of the configurator (link to Import Strings).
- E2E lives in `tests/admin-content-live.spec.ts` (block "profile configurator"), because it needs admin-created profiles; needs `waitForLoadState('networkidle')` before keyboard actions (hydration).

## Anonymous counting (2026-10-25)

- Extends the existing mechanism (no second one): `POST /api/v1/page-view` + `/api/v1/copy-event`, tables `page_views`/`copy_events` (+ additive `visitor` column) and `stats_daily` (day, kind, key, views, uniques). Client: `utils/beacon.ts` (`sendBeacon`, text/plain, no deps) used by `composables/usePageTracking.ts`, `pages/strings.vue`, `pages/configurator.vue`.
- Guarantees: no cookies, no localStorage identifier, no raw IP, no user agent stored. Uniques = per-day HMAC of coarse IP (/24, /48) + browser/OS/device family, random in-memory salt rotated per UTC day (never persisted, not in git, restart mid-day only over-counts). Rate-limit and dedup keys use the same salted hash, so `rate_limits` holds no raw IP for beacons.
- Skipped server-side in `server/utils/beaconRequest.ts` (order: DNT/Sec-GPC, bot UA regex, login session, rate limit) and client-side (DNT/GPC). Path allowlist and copy-type allowlist live in `utils/trackingRules.ts`; a new public page must be added to `TRACKED_ROUTES` (a unit test compares it with `pages/*.vue`). Copy targets must exist and be published.
- Retention (`server/utils/analytics.ts`, run by `server/plugins/session-cleanup.ts`): finished UTC days are rolled up into `stats_daily` (INSERT OR IGNORE), legacy `ip`/`user_agent` values are set to NULL after their distinct IPs were counted, detail rows older than 14 days are deleted, aggregates older than 400 days are deleted. The `data_retention_days` setting no longer governs these two tables.
- Admin: `GET /api/v1/admin/stats/traffic?days=7|30|90` and the "Routes" tab on `/admin/system/stats`; the overview and legacy stats use `trafficReport`. "Visitors" are summed daily uniques (labelled so). Reports write idempotent roll-ups.
- Privacy page: default text is `PRIVACY_DEFAULTS` (`utils/pageCopyDefaults.ts`); the counting text is a new section key `s7`, so existing DBs get it without touching stored edits (an edited `s4` keeps the editor's wording). Imprint has no data-processing text and is unchanged.
- E2E: default Playwright Desktop Chrome UA is a normal UA and is counted; tell checks apart by a unique referrer host.

## Public status page `/status` (2026-10-25)

- Page `pages/status.vue` (SSR, light refresh every 60 s while visible) reads `GET /api/v1/status`. `/api/health` is unchanged and separate (it carries SHA/build/uptime, the public payload never does).
- Payload (whole public surface, type in `utils/publicStatus.ts`): `status`, `checkedAt`, `components[] {id, name, state, note}` (Website, Database, Data freshness), `uptime {ready, windows[] {days, percent }, note}`, `notices[]` (scheduled / ongoing), `history[]` (resolved, last 90 days). `tests/unit/siteStatus.test.ts` has a whitelist test; adding a field means updating type, test and this list on purpose.
- States: Website is Operational whenever the request is answered; Database is Degraded above 500 ms and Down when `SELECT 1` fails; Data freshness is Degraded when the newest published release note is older than 180 days (none yet = Operational). Overall = worst. Always HTTP 200.
- Cache: `getPublicStatus` keeps the payload 45 s in memory (+ `Cache-Control: public, max-age=30`), so the DB is touched at most once per window. `clearPublicStatusCache()` for writers.
- Sampler (`server/plugins/status-sampler.ts`, `server/utils/siteStatus.ts`): one row per 5-minute slot in `status_samples` while the DB answers; finished UTC days roll up into `status_daily` (INSERT OR IGNORE); detail kept 3 days, daily rows 100 days. Availability = answered slots / expected slots since the first sample; a missing slot (restart, outage) counts as downtime; percentages round down; a window (24 h, 7/30/90 days) appears only after that much history, nothing before 24 h ("Collecting data").
- Notices (item B): see the next section. The registry in `server/utils/statusNotices.ts` (`registerStatusNoticeSource(fn)`, `fn(nowSeconds)` returns raw rows) is fed by `server/plugins/status-notices.ts` from the DB; `toPublicNotice` is the whitelist.
- SEO: `noindex, follow`, not in the sitemap (a "Down" snapshot has no lasting search value), linked in the footer, counted as a public route in `TRACKED_ROUTES`, not edge-cached.

## Community presets (visitor submissions, moderated)

- Form: `/submit-preset` (page `pages/submit-preset.vue`, `noindex, follow` in meta and `routeRules`, not in the sitemap, counted in `TRACKED_ROUTES`). Linked from the community section on `/strings` (`components/CommunityPresets.vue`, client-side fetch so an approval shows at once). Fields: name (3-60), addon (select of visible + available addons), preset string (20-16000 chars, max 400 lines), optional note (200), optional "tested with" version (pattern `[A-Za-z0-9][A-Za-z0-9 .,+_()/#:-]{0,39}`). The form says: no account, no cookies, no personal data, no IP stored.
- Storage: table `community_presets` (CREATE IF NOT EXISTS in bootstrap, mirrored in drizzle): name, addon, preset_string, note, tested_version, status (pending | approved | rejected), content_hash (unique), created_at, reviewed_at, reviewed_by. **No IP, no user agent, no contact data**; a unit test fails if such a column appears.
- Code: `server/utils/communityPresets.ts` (pure, takes a better-sqlite3 handle, relative imports only), `server/utils/communityPresetRuntime.ts` (process-wide limiters, replay guard, secret). Public handlers `server/api/v1/community-presets/` (`index.get` approved list, `[id].get` string of an approved id, `form-token.get`, `index.post`); admin handlers `server/api/v1/admin/community-presets/` (`index.get`, `[id].get/patch/delete`) all start with `requireAdminAccess(event)` (unit test scans the sources).
- Defences on POST, cheapest first: same-origin (when Origin is sent), body size (48 KB, 413), per-visitor attempt limit (15/h), honeypot field `website` (answers like a success, stores nothing), signed cookie-less form token (HMAC of issue time + nonce with the JWT secret; fetched by the browser after the page rendered; min 5 s, max 2 h, single use via in-memory replay guard), strict zod validation, per-visitor acceptance limit (3/h), known-addon check, duplicate hash (answers like a success), pending queue cap (200) and global daily cap (40). Limiters are in memory and keyed by a daily-salted hash of the IP (`dailySalt` / `anonymousKey`); nothing about the visitor is stored or logged. Under `NUXT_E2E_SEED` (never in production) the per-visitor limits are x1000 so Playwright can submit repeatedly.
- Text handling: plain text only. Short fields: control and format characters stripped, whitespace collapsed, links and addresses refused. The preset string is rejected (not edited) if it contains control, invisible or unassigned characters. Everything is rendered with Vue interpolation (escaped); there is no Markdown or HTML path for these fields (tests feed `<script>`, `<img onerror>`, Markdown links and `{{ }}`).
- Moderation: admin page `/admin/strings/community` (sidebar Data -> Community, palette "Review community presets"): filter pending/approved/rejected/all, Approve, Reject (or Unpublish and reject), View string, Edit label (name, note, tested version; the string is never editable), Delete. Every change is audited (`community_preset`, snapshot has size and hash, never the string; no undo). Only `approved` rows are public; the public list is a whitelist (id, name, addon, testedVersion, note, stringLength).
- Public display: label "Community-submitted, not verified or endorsed by MagguuUI; import at your own risk", never shown as an official Magguu profile. Copy uses `StringCopyButton` and counts as copy type `community` through the existing allowlist (`isCopyTarget` only accepts approved rows).
- Retention: `prunePresets` runs in the status sampler maintenance tick: pending items are deleted 30 days after submission, rejected ones 30 days after the review; approved ones stay until an admin deletes them.
- Privacy text: new default section `s8` ("8. Community Preset Submissions") in `utils/pageCopyDefaults.ts`, listed in `sectionIds` of `components/PageView/Privacy.vue`; the s7 default also mentions approved community presets. Defaults are merged by key (`mergePageCopy`), so edits an admin already saved for s1-s7 stay untouched and a saved s7 keeps its text (only the default changed). The address in the s8 default is split with a `<span>` so Cloudflare email obfuscation does not rewrite it. The Imprint is unchanged (no operator data is processed beyond what the privacy page says).
- E2E: `tests/community-presets.spec.ts` (defences through the API, submit through the form, pending hidden, approve, copy, axe Dark/Light, audit, reject, delete; cleans up after itself) and `tests/unit/communityPresets.test.ts`. Seed: `server/plugins/e2e-seed.ts` adds the addon "E2E Test Addon" (Playwright only). Never submit presets on the live site to test.

## Request hardening (review follow-up, 2026-10-25)

- **Keys:** every visitor-keyed limiter uses `anonymousRateKey(salt, ip)` (`analytics.ts`): IPv6 reduced to its /64, then salted per day. Never key a limiter by the full IPv6 address. Beacons (`beaconRequest.ts`), vitals and the preset form all do.
- **Preset limits** (`server/utils/presetLimits.ts`, scaled x1000 only under `NUXT_E2E_SEED`): attempts 15/h per /64 and 60/h per /48; accepted 3/h and 5/day per /64, 10/day per /48. Together with `DAILY_CAP` 40 at least four networks are needed to use a day up. `createWindowLimiter` is size-capped (10 000 keys): expired windows go first, then the oldest tenth is evicted (never "refuse everybody").
- **Form token** is signed with `<jwtSecret or random>|<bootId>`, so tokens issued before a restart stop verifying (the in-memory replay guard is gone then).
- **Handler logic is testable:** `presetSubmission.ts` (preset POST flow with injected limiters/db), `beaconGateCore.ts` (opt-out, bot, session, limiter), `bodyCap.ts` (`readBodyCapped`: hard byte cap while reading, Content-Length is only a fast path; chunked bodies are cut off), `clientIp.ts`. Route files and `beaconRequest.ts` only wire the runtime. Tests: `tests/unit/requestDefences.test.ts` (real h3 app on a loopback port, in-memory DB). Honeypot answers 201 exactly like a success.
- **Referrers:** at most `REFERRER_DAILY_MAX` (100) distinct hosts per UTC day are stored, further ones become `(other)` (`createReferrerLimiter`, seeded from `page_views` after a restart); the roll-up caps the same way (`capReferrerRows`). The 5 s page-view dedup key is visitor + path (no referrer), and the dedup map is size-capped.
- **Beacon `rate_limits` rows** (`page-view:`, `copy-event:`, `vitals:`) are pruned every minute by the status sampler (`pruneBeaconRateLimits`: older than 10 minutes go, ceiling 20 000 rows, oldest first). Login limiter rows are untouched (24 h `cleanupRateLimits`).
- **Old IP/UA data:** the DB connection sets `PRAGMA secure_delete = ON` (`server/database/index.ts`). After `scrubLegacyIdentifiers`, `vacuumAfterScrub` runs ONE `VACUUM` + `wal_checkpoint(TRUNCATE)`, guarded by the marker row `settings.privacy_vacuum_v1` (set only after success; failure retries on the next maintenance run). It blocks the event loop and takes the write lock for the duration (small DB: well under a second) and needs about the DB size in free disk. Backups made earlier still contain the old values: disclosed in the new privacy section `s9`.
- **Privacy s9** ("9. Temporary Technical Records and Backups"): new key, so stored edits of s7/s8 never hide it (s7 default text itself is unchanged). Covers the hashed beacon limiter rows and the backup note.
- Skipped on purpose: a "format check" for preset strings (real profile strings range from base64 blobs to Lua text, any heuristic would reject valid ones; the moderator and the escaped plain-text rendering are the defence).

## Status notices (maintenance / incidents, admin-maintained)

- Admin page `/admin/system/status` (sidebar System, palette "New status notice" = `?action=create`). Endpoints `server/api/v1/admin/status-notices/` (`index.get/post`, `[id].put/delete`, `[id]/updates.post`); every handler starts with `requireAdminAccess(event)` (a unit test scans the sources for that, for audit and for `clearPublicStatusCache()`). Adding a handler there means updating that test.
- Tables `status_notices` and `status_notice_updates` (CREATE IF NOT EXISTS in bootstrap, mirrored in drizzle). Store, validation (zod) and transitions: `server/utils/statusNoticeStore.ts`; transitions are shared with the UI via `utils/publicStatus.ts` (`canTransition`).
- Fields: kind (maintenance | incident), status (scheduled, in_progress, monitoring, resolved), title (120), Markdown body (2000), component (website | database | content | none), start, optional end, timeline entries (1000 each, max 50, append-only: no edit or delete path, a source scan guards it). Status moves are forward only; an incident cannot be scheduled; resolving sets `resolved_at`. Edit changes fields, never the status (that is a timeline entry).
- Markdown: `utils/noticeMarkdown.ts` (marked + sanitize-html): only p, br, strong, em, del, code, pre, ul, ol, li, blockquote and links (http, https, mailto; rel/target forced). Raw HTML is shown as escaped text, images are text, headings become paragraphs. `toPublicNotice` re-renders on every public read, so a bad source cannot bypass it; display goes through `SafeHtml`. A paragraph that starts with a tag is an HTML block for marked and is shown whole as text (put links in other paragraphs).
- Public `/status`: notices on top (ongoing incident, ongoing maintenance, scheduled soonest first, max 10), History below (resolved within 90 days, newest first, max 25, `<details>` with the timeline). Whitelist: id, kind, status, title, bodyHtml, component, startsAt, endsAt, resolvedAt, updates[{at, status, bodyHtml}]; no author, no user ids. `siteStatus.test.ts` and `statusNotices.test.ts` guard it.
- Audit: each write calls `recordAuditSafe` with entity type `status_notice` (snapshot includes the timeline, redacted by the common rules; no undo for this type). Retention: resolved notices are deleted after 365 days by the sampler maintenance tick; max 500 rows.
- Limits: a scheduled notice is not started automatically (the admin moves it to in progress); admin times are entered in local time, the public page shows UTC; notices do not change the derived component states; no feed.
- E2E: `tests/status-notices.spec.ts` creates, updates, resolves and deletes a notice through the admin UI and cleans up after itself. Never create notices on the live site to test.

## Consent and visitor log (part 1 of 2, 2026-10-25)

Deliberately supersedes the privacy-minimal stance for CONSENTED visitors only. Without consent only the cookieless anonymous counter runs (see "Anonymous counting"), unchanged. **ON by default since the default-on commit (2026-10-25); everything below is gated by the env flag `NUXT_VISITOR_LOG` (`visitorLogEnabled` in `utils/consent.ts`): unset/empty/anything else = on, `0`/`false`/`off`/`no`/`disabled` = off.** With the flag off there is no banner, no footer link and the endpoints answer 204 without a cookie. Nothing is stored without the visitor's consent either way. To switch the feature off set `NUXT_VISITOR_LOG=false` on the container and recreate it.
- **Banner** (`components/ConsentBanner.vue`, `composables/useConsent.ts`): client only (inside the layout's `ClientOnly`), fixed bottom bar (no CLS), `role=region`, not a modal. Three equal buttons "Accept all", "Necessary only", "Settings"; Settings = one native checkbox "Visitor statistics", OFF by default, with Save/Back. The first-visit bar cannot be closed by Escape; a reopened one can. Footer button "Cookie settings" (`data-testid=cookie-settings`) reopens it and is the revocation path. GPC/DNT = refusal: no banner, no consent cookie, nothing captured; the bar then only explains this. `/admin` has no banner/consent logic.
- **Cookies**: nothing is set before a click (tested). `mg_consent` = `{v:1,stats:boolean,ts}` only, 6 months, Lax, Path=/, Secure on https, set by the server (`POST /api/v1/consent`), readable by the page. After "yes" only: `mg_sid` (random 128-bit, HttpOnly, 30 min rolling) and `mg_vid` (random 128-bit returning-visitor id, HttpOnly, 395 days from issue, not extended). Refusal/revocation clears both and DELETES that browser's rows (the visit and all visits with the same `mg_vid`). The server re-verifies the consent cookie on every beacon; ids are issued by the server only (a client-chosen sid/vid is never adopted).
- **Endpoints** (pure handlers in `server/utils/consentRequest.ts`, testable under tsx; route files only wire in db/limiter): `POST /api/v1/consent`, `POST /api/v1/visitor-hit` (page sequence, referrer, UTM, screen/language/time zone), `POST /api/v1/visitor-event` (`leave` = dwell + scroll milestone, `click`). Same defences as the counter: GPC/DNT, bot UA skip, admin sessions skipped, salted /64 rate limit, capped bodies, same-origin, allowlisted routes (`normalizeTrackedPath`), per-day and per-session row caps.
- **Stored with consent** (`server/utils/visitorLog.ts`; tables `visitor_sessions`, `visitor_hits`, `visitor_events`, additive in `bootstrap.ts` + ALTERs for dev DBs): full IP, full user agent, parsed browser/OS/device, country (`CF-IPCountry`) and city (`cf-ipcity`, only if Cloudflare sends it) from TRUSTED proxies only (`getClientCountry`/`getClientCity`, else unknown/null; no GeoIP, no dependency), referrer URL (500 cap) + host, UTM (5 keys, 100 cap), screen size, language, time zone, entry/exit page, page sequence with dwell seconds and scroll milestone (0/25/50/75/100, sent when the page is left), clicks (`utils/visitorSignals.ts`: CTA ids from the fixed list in `CTA_IDS` set via `data-cta`, downloads = file name, external = host only; never free text, never a query string).
- **Retention**: NO anonymization. Everything (IP, UA, all signals) is kept in full for 13 months (395 days, from the last activity of a session) and then DELETED, incl. orphan hits/events (`pruneVisitorRecords` in `session-cleanup.ts`, every 30 min, also while the flag is off). Name this exactly in the Privacy text (part 2).
- **Hooks for part 2** (admin Visitors tab, filters, CSV, Privacy): `listVisitorSessions`, `sessionHits`, `sessionEvents` in `visitorLog.ts`. CSV needs formula-injection-safe cells (UTM/referrer/UA are visitor-controlled text); render with Vue escaping only.
- **Tests**: `tests/unit/visitorConsent.test.ts` (cookie parse, gating, retention, trusted-proxy country/city, GPC/DNT, caps, events, revoke) and `tests/consent.spec.ts`. `playwright.config.ts` gives every OTHER spec a stored "necessary only" consent cookie (`use.storageState`, also applies to `browser.newContext()`), so no banner overlays them; `consent.spec.ts` starts clean. The e2e server does NOT set `NUXT_VISITOR_LOG` (it runs against the default-on behaviour; a unit test guards that). Country/city cannot be e2e-tested through `nuxt dev` (no trusted socket); unit-tested.
- **Open legal points (not legal advice)**: the Legal notice has no name/address by the owner's decision (provider identification, German DDG s.5); Cloudflare as processor / DPA mention; legal basis Art. 6(1)(a) GDPR and the Privacy text are part 2; full IP + UA for 13 months and a 13-month visitor cookie are the owner's explicit choice.

## Consent and visitor log, part 2 (admin, privacy, 2026-10-25)

- **Visitor log page** `/admin/system/visitors` (`pages/admin/system/visitors.vue`, sidebar Analytics "Visitor log", palette finds it). Plain tables, small green mini-labels, Dark + Light. Columns: start time, flag + country name (+ city), IP, browser/OS/device, referrer, UTM, entry → exit page, page count, duration, new/returning (via `mg_vid`). Row toggle expands the path: page, dwell, scroll depth, plus clicks. Filters: period (24 h to everything stored), country, visited page, referrer contains, UTM value, new/returning. Pager capped (25 per page, max 100, max offset 10,000). The URL is synced with `history.replaceState` (NOT `router.replace`: the admin layout keys its content by `route.fullPath` and would remount the page and drop typed input). Empty state: "No consented visits yet" + whether `NUXT_VISITOR_LOG` is on.
- **API** (`server/api/v1/admin/visitors/index|[id]|export.get.ts`, logic in `server/utils/visitorAdminRequest.ts` + `visitorReport.ts`, shared limits/types in `utils/visitorView.ts` so the client never imports node:crypto). Every handler calls `requireAdmin` (role "admin" only: editors and viewers get 403 because the data holds full IPs; the CSV export is audited BEFORE any data leaves and fails closed if the audit entry cannot be written). `Cache-Control: no-store`.
- **CSV export** `GET /api/v1/admin/visitors/export` (same filters): admin only, no-store, attachment `visitors-YYYY-MM-DD.csv`, UTF-8 BOM, streamed in batches of 500, capped at 50,000 rows. Cells go through `utils/csvSafe.ts`: a leading `= + - @ TAB CR` gets a `'` prefix, quotes/commas/newlines are escaped. Each export writes an audit entry (`action exported`, type `visitor_export`) with only the row count and the filter NAMES, never IPs or values. Do not run an export on live to "test" it.
- **Dashboard** `/admin`: plain sections "Top countries" (flag + name + count, consented visits, 30 days) and "Top referrers" with two labelled sub-lists, "Consented visits (visitor log)" and "Anonymous counter (all visitors, no cookies)". No cards.
- **Privacy** default sections `s10` (consent, withdrawal via footer "Cookie settings", purpose, legal basis Art. 6(1)(a) GDPR + s.25 TDDDG, no third parties), `s11` (exactly what is stored, cookies `mg_consent`/`mg_sid`/`mg_vid`), `s12` (13-month retention then deletion, backups, Cloudflare, rights, contact@magguu.xyz). Added to `PRIVACY_DEFAULTS` and `sectionIds`, so they appear without overwriting stored edits of s1 to s9; s4 (cookie sentence) and s7 (new closing paragraph) were aligned. **Check once in Admin → Content → Pages → Privacy**: if the owner stored edits of s4 or s7 earlier, those stored texts still win and keep the old wording ("sets no cookies"); update them by hand or reset the section.
- **Flaky e2e "a copy click is counted for a published item only"**: cause was the tie-break of the copied list (`topCopied` in `server/utils/analytics.ts`). It capped at 20 items and sorted equal counts by plain string key, so `profile:105` sorted before `profile:37` and a new profile with one copy fell out of the top 20 once the dev DB held more than 20 one-copy items. Now ties go by type, then numeric id, newest first (unit test in `analytics.test.ts`).
- **Enabling and disabling the visitor log**: it is ON by default (no container change needed after the image with the default-on commit is pulled). Check `/api/health`, that the banner shows on a fresh browser profile, that "Cookie settings" is in the footer, and that `/admin/system/visitors` shows "Visitor log (NUXT_VISITOR_LOG) on". To switch it off: set the container env var `NUXT_VISITOR_LOG=false` (or `0`) and recreate: banner, footer link and endpoints go away, stored rows stay until the 13-month cleanup (which runs while it is off).
- **Open legal points (docs only, not shown in the UI; not legal advice)**: (1) TODO owner: confirm a data processing agreement (DPA / AVV) with Cloudflare; the Privacy text (s12) already says the site is reached through a Cloudflare Tunnel, that Cloudflare acts as processor and transport and adds the country/city headers, and that it is the only external service; the DPA itself is not confirmed. (2) The Legal notice stays without name and address by the owner's decision (provider identification under German DDG s.5 is an open point). (3) Full IP and user agent for 13 months and a 13-month visitor cookie are the owner's explicit choice. (4) Backups older than the cutoff may still contain deleted rows.
- **Live walkthrough**: `LIVE_URL=https://ui.magguu.xyz npx playwright test -c playwright.live.config.ts` (spec `live/walkthrough.live.ts`, never part of the normal run). Every non-GET request is aborted, there is no admin login. The only POSTs allowed are the consent calls of the two isolated tests: "Necessary only" sets just `mg_consent`; "Accept all" runs only with `LIVE_ACCEPT=1`, creates exactly one live visitor row and withdraws it again in the same test. Admin pages are tested by Unraid & Server, the privacy review is Code-Review's.
- **Review follow-ups (F1 to F9, 2026-10-25)**: F9 `tests/consent.spec.ts` polls for the session cookies (the row is written before the browser processes Set-Cookie; this was the red docker verify at 86f0f3c). F1/F6 the web-vitals plugin checks GPC/DNT in the browser, Privacy s4 names `mg_consent` and the two localStorage keys (`nuxt-color-mode`, `lastSeenVersion`), s7 names the page load measurement (path + LCP/INP/CLS/TTFB, no id, deleted after 90 days), s11 names every cookie lifetime, the banner text states what happens without and with a click. F2 `AdBanner.vue` needs flag + consent "yes" + no GPC/DNT before it renders or loads anything (live `adsense_enabled` is `false`); **before AdSense is ever switched on, add a separate "advertising" purpose to the banner and Privacy**. F4 `server/utils/retentionCleanup.ts`: each retention step is isolated, failures are logged, not swallowed. F5 a GPC/DNT signal deletes the records and all three cookies (also the stored "yes"); the client asks the server once when a stored choice meets a signal. F7 per-network daily caps (`VISITOR_SESSIONS_PER_IP_DAY` 100, `VISITOR_HITS_PER_IP_DAY` 3000, column `visitor_sessions.ip_bucket` = IPv4 or IPv6 /64) so a hand-set `mg_consent` cannot fill the global limits. F8 the iconify `dns-prefetch` link is gone (consent proof columns are NOT stored: skipped on purpose, the cookie already carries time + version). The flag check and plugin wiring are covered by `tests/unit/consentWiring.test.ts`.
- **Mutation check and drafts guard**: `python3 scripts/mutation/check.py [start [end]]` applies 74 hand-made mutants (flag checks, GPC/DNT, same-origin, body caps, trusted-proxy and CF headers, honeypot, time-trap token, route and plugin wiring) to a copy of the repo and runs the unit tests; all 74 are killed, a survivor means a missing test (add one, then add the mutant). `tests/unit/draftIsolation.test.ts` keeps draft code in admin files only and the public content query on published rows; `scripts/verify-build.mjs` (`verifyDraftsNotPublic`) checks the built public pages and their initial scripts for draft markers.
- **Live walkthrough** (not part of `npm test`): `LIVE_URL=https://ui.magguu.xyz npx playwright test -c playwright.live.config.ts` runs `live/walkthrough.live.ts` against production (public pages x mobile 390 / desktop 1280 x dark / light, axe, console and network checks, banner and cookie flow). All writes are aborted; the only calls let through are the consent calls of the isolated "Necessary only" test and, with `LIVE_ACCEPT=1`, "Accept all" (creates one visitor row, withdrawn in the same test). No admin login. First live run findings (fixed): `:global(html.light) .x :deep(y)` in a scoped style compiles to a bare `html.light{...}` rule (restyles the whole page; use `html.light .x :deep(y)`, `verifyNoBareThemeRules` in verify-build guards it), light-theme contrast of prose text and inline code, and the scrollable string preview needs `tabindex="0"` (axe `scrollable-region-focusable`, mobile only). Cloudflare injects its own `/cdn-cgi/challenge-platform` detection beacon on the live site; the spec ignores it.

- **Visual audit (2026-10-25)**: the footer contact link renders `href="/imprint"` in the server HTML and becomes `mailto:` after mount (Cloudflare Email Obfuscation, see `ContactEmail`), so it always has a real href (`tests/layout-links.spec.ts`, which also asserts every header/footer/mobile-menu link and button has an accessible name). Theme switch: `setTheme` in `layouts/default.vue` sets `html.theme-switching` (transitions off, `assets/css/main.css`) for the frames of the switch; before, text classes flipped instantly while the shell background faded 300 ms (contrast dipped to 2.94 in a frame). `tests/theme-switch.spec.ts` samples every animation frame and requires contrast >= 3. `tests/visual-audit.spec.ts` = console + axe for /, /guide, /strings, light and dark, 1280x800.
- **First-visit banner check (2026-10-25)**: a fresh context with empty storage shows the banner on `/` at 1280x800 and 390 px, on live (read-only, no click, 0.5 to 0.8 s, no cookie before a choice) and locally (`tests/consent.spec.ts`, "first visit on /"). Nothing was missing: the default Playwright config pre-seeds `mg_consent` for localhost, so any spec that is not in `consent.spec.ts` (empty storageState) never sees the banner. `/imprint` is deliberately short (operator line, contact email, disclaimer); `/legal` is not linked anywhere (404 by design).
- **Review round 3 (N1-N3, L1)**: `server/utils/loginAttempts.ts` (pure): `scrubLoginAttemptIdentifiers` sets `ip_address`/`user_agent` of `login_attempts` to NULL after 23 hours (cleanup runs every 30 min, Privacy s9 says up to 24 hours; username/browser/OS/outcome stay for `data_retention_days`). `detectSuspiciousLogin` moved there: `new_ip` only compares against the retained window (no address history = no new_ip flag, the device check still applies). Throttles are in memory and the account lock is on `users`, so no auth behaviour changed (guarded by a test). `session-cleanup.ts` runs the personal-data retention steps FIRST, then housekeeping (expired sessions, old attempts, challenges, rate limits), then one `PRAGMA wal_checkpoint(TRUNCATE)` (`server/utils/walCheckpoint.ts`); each step isolated via `runRetentionCleanup`. Consent withdrawal / GPC delete via `withdrawVisitorRecords` (delete + WAL truncate). `handleConsentChange` with `NUXT_VISITOR_LOG=false` still honours a withdrawal or refusal signal (deletes records and cookies, stores no choice); `handleVisitorHit` clears consent-bound cookies when off.
