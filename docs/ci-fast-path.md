# CI fast path for small text and design fixes (proposal)

Status: the low-risk gaps are implemented (see the table); nothing here changes auth, signing or the deploy trigger. Measured on 2026-10-26.

## The path today

1. Small fix on `main` (local `npm run lint`, `typecheck`, `test:unit`, the affected Playwright spec; the pre-push hook repeats lint/typecheck/unit).
2. Push triggers `Build` (required checks `build (26, false)`, `Analyze (javascript-typescript)`) and `docker` in parallel.
3. `docker`: `verify` (~7 min) then `build-and-push` (~2.5 min, signing, attestation) = ~9.5 min.
4. Unraid auto-update pulls the new image (no action needed). The smoke run starts when `docker` ends and waits for the matching `/api/health` sha (observed: 40 s to ~10 min).
5. `Post-deploy smoke` checks `/`, `/admin/login`, `/api/health`; red only if the site is down.
6. Review afterwards (Buddy); rollback = revert commit, or the pull script's rollback on a failed health check.

Typical push-to-live time for a text fix: about 10 minutes of CI plus the Unraid pull (measured 40 s to 13 min).

## Gaps: implemented vs deliberately not (2026-10-26)

Measured with `gh run list/view`. Before = last 8 pushes with 2 Playwright workers; after = runs with 3 workers.

| # | Gap | Status |
|---|---|---|
| 1 | `docker.yml` path filter let tests/tooling-only pushes build an image (b371ebb: 572 s of docker for no change). | **Done** (cddc7d0): `tests/**`, `unraid/**`, `playwright.config.ts`, `scripts/mutation/**`, `scripts/run-limited.sh`, `osv-scanner.toml`, `renovate.json` added to the filter; each is in `.dockerignore` or unused by `nuxt build`. `docker.yml`, Dockerfile, app code and `package*.json` still build. Build and CodeQL (required checks) have no path filter and run on every push. |
| 2 | Playwright is 75 % of Build and 60 % of docker verify (377-378 s, 2 workers). | **Done** (769372e): 3 workers on CI (4 vCPU), 2 locally; same 211 tests and retries. Local 288 s -> 227 s / 176 s. CI: Build 451 s median (8 runs) -> 430 s median (4 runs: 393, 480, 467, 374 s); Playwright step 378 s -> 281 / 354 / 342 / 252 s; docker 591 s median -> 571 s (1 run). Runner noise is +-60 s, so the gain is real but modest. Watch: 2 of 5 runs had one retried flaky test (admin API 401 in `admin-content-live`, a visitors/community-presets timing case) vs about 1 in 8 before; retries absorb it. Revert = `workers: 2`. |
| 3 | Pull latency was invisible. | **Done** (cddc7d0): the smoke step summary now prints "live sha seen N s after the docker run finished" and polls every 15 s (60 tries, same ~15 min window). First measurement (769372e): **787 s** between docker end and the live sha, the longest single segment of the chain. It is the Unraid auto-update schedule, owned by "Unraid & Server"; not changed here. Earlier runs saw 40 s and ~10 min. |
| 4 | Docker layers/npm cache. | Nothing to do: buildx GHA cache (`mode=max`) and the BuildKit npm cache mount already hit (`Build and push` 42-98 s). `verify` has no npm cache on purpose (zizmor cache-poisoning in the publishing workflow). |
| 5 | Unit step 24 s is one test file (`mutationRunner.test.ts`, 19 s of timeouts that must elapse). | Not worth it: parallelising inside the file saves ~6 s and adds flake risk. |
| 6 | `verify` repeats Build's lint/unit/typecheck/Playwright for the same sha. | **Not done, reported**: shortening `verify` shortens a check on the publishing path. Needs Marco's decision. |
| 7 | Build runs the full suite on docs-only pushes. | **Not done**: `build (26, false)` is a required check and must run for every push. |
| 8 | Public pages use `swr: 120`, so a text fix can look old for up to 2 minutes after the sha matches. | Not changed (cache behaviour is delivered behaviour): verify with a cache-busting query or wait 2 minutes. |
| 9 | `concurrency: cancel-in-progress` on docker skips images for intermediate commits. | Fine for the fast path; batch two quick fixes into one push. |

Not touched on purpose: CodeQL, signing/attestation, smoke thresholds, auth/admin paths, auto-update trigger, branch protection (required names stay `build (26, false)` and `Analyze (javascript-typescript)`).

## Fast-path rules for small text and design fixes

- Allowed: copy, labels, spacing, colours, static content in `components/`, `pages/`, `utils/pageCopyDefaults.ts`, `assets/`; no auth, passkey, lockout, database or server changes.
- Local gate: lint, typecheck, unit and only the Playwright specs of the touched page (full suite only when layout or shared components change).
- Push to `main` directly; watch `Build` and `docker`; do not re-push while `docker` runs unless needed (a newer push cancels the older image).
- After the smoke: open the page once with a cache-busting query and compare the text, in Dark and Light.
- Review afterwards by Buddy; a bad fix is reverted by a new small commit.

## Update 2026-10-26 (night): Playwright sharded

Playwright ran twice (Build and docker verify). Both workflows now run it as two shards (`--shard=1/2`, `2/2`, same 211 tests) next to the other checks, plus a Playwright browser cache in build.yml. `build (26, false)` stays the required check as an aggregator; docker `build-and-push` needs `verify` and both shards, so no image without green tests. Measured with `gh run view`: Build 451 s median -> 284 s (4cbc1b8) and 240 s (b81fcdc); docker 591 s -> 377 s. The shard split first broke the Quality alarm-conditions check (build alarm `needs` did not cover `checks`/`e2e`); fixed in da7e505. Not done: shortening `verify`, paths-ignore on Build (a required check must always run), npm cache in docker.yml (cache poisoning on the publishing path).
