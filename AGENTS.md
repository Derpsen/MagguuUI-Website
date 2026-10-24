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
  - Search: `/api/v1/search-index` is public data only; `PublicSearch.vue`
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
2. These five routes must be **200** (from #102):
   - `/admin/system/activity`
   - `/admin/strings/profiles`
   - `/admin/strings/layouts`
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
- **Client IP:** `getClientIp` trusts `cf-connecting-ip` / `x-real-ip` / `x-forwarded-for` only when the socket peer is in `NUXT_TRUSTED_PROXIES` (`server/utils/trustedProxy.ts`). Otherwise it uses the socket IP.
  - The setting takes IPs or CIDRs, or the keywords `private` (the default when unset: loopback + RFC1918 + ULA/link-local) or `none`.
  - The container on br0 (`192.168.178.21:3000`) **is reachable directly from the LAN**. With the default, only LAN hosts can still spoof the header.
  - To close that, set `NUXT_TRUSTED_PROXIES` to the cloudflared address. After a deploy, `docker logs MagguuUI | grep trusted-proxy` prints it once.

## Changelog feeds, filter and ?since= (2026-10-24)

- **Feeds:** `/changelog/feed.xml` (RSS 2.0) and `/changelog/atom.xml` (Atom 1.0), Nitro routes in `server/routes/changelog/`, built by `server/utils/changelogFeed.ts` (pure, no DB) and served by `changelogFeedResponse.ts`. Rows: `isPublished`, version `v%`, never `Unreleased`/`auto`, newest 20 by `publishedAt`, `contentEn || content` rendered with `renderMarkdownToSafeHtml`. XML is escaped (`escapeXml` drops illegal control chars and lone surrogates; HTML body is escaped once more as text). Item/entry URL is `https://ui.magguu.xyz/changelog#release-<slug>`.
- **Caching:** `Cache-Control: public, max-age=600, stale-while-revalidate=3600` plus a content ETag (304 on `If-None-Match`). Do **not** pass h3 `maxAge` (adds `s-maxage`) or `modifiedTime`: `server/plugins/public-cache-invalidate.ts` rewrites any `s-maxage` Cache-Control to browser revalidate and drops Last-Modified.
- **Page:** `pages/changelog.vue` has a plain GET form (works without JS, server-rendered from `route.query`): `?since=` (exclusive), `?from=` / `?to=` (inclusive), `?q=` (text match). `<link rel="alternate">` for both feeds is in `useHead`, plus visible "Subscribe: RSS · Atom" links. While filtering, Unreleased is hidden, the h1 is the label, and collapse is off.
- **Data-model limits:** there is one addon (MagguuUI) and no addon field, so the "addon" filter is `q`, a case-insensitive match on the release text (for example BigWigs). The only hide flag is `isPublished`. The page API returns the newest 24 releases, so filters cannot reach older ones.
- **Semver rule** (`utils/changelogVersion.ts`, shared by page and tests): optional `v`, numeric parts compared numerically and padded with 0, a pre-release suffix such as `-Dev-16` sorts **before** its release (12.1.6-Dev-16 < 12.1.6). Unparseable input is ignored and reported in an inline `role=alert`.
- **Tests:** `tests/unit/changelogVersion.test.ts`, `changelogFeed.test.ts`, `tests/changelog-filter.spec.ts`. The E2E rows v0.9.1 to v0.9.3 (0.9.1 and 0.9.3 contain "Zebrafish") come from `server/plugins/e2e-seed.ts` (only with `NUXT_E2E_SEED=true`, never in production). Specs bound with `to=0.9.9` because real rows exist in a dev DB.

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
