# CI fast path for small text and design fixes (proposal)

Status: proposal, nothing here changes auth, deploy behaviour or the workflows. Measured on 2026-10-26.

## The path today

1. Small fix on `main` (local `npm run lint`, `typecheck`, `test:unit`, the affected Playwright spec; the pre-push hook repeats lint/typecheck/unit).
2. Push triggers `Build` (required checks `build (26, false)`, `Analyze (javascript-typescript)`) and `docker` in parallel.
3. `docker`: `verify` (~7 min) then `build-and-push` (~2.5 min, signing, attestation) = ~9.5 min.
4. Unraid auto-update pulls the new image (no action needed). The smoke run starts when `docker` ends and waits for the matching `/api/health` sha (observed: 40 s to ~10 min).
5. `Post-deploy smoke` checks `/`, `/admin/login`, `/api/health`; red only if the site is down.
6. Review afterwards (Buddy); rollback = revert commit, or the pull script's rollback on a failed health check.

Typical push-to-live time for a text fix: about 10 to 20 minutes.

## What makes the chain longer today

| # | Gap (evidence) | Proposal | Risk |
|---|---|---|---|
| 1 | `docker.yml` path filter lets `tests/**`, `unraid/**`, `playwright*.ts`, `scripts/mutation/**`, `scripts/run-limited.sh`, `osv-scanner.toml`, `renovate.json` through, although `.dockerignore` keeps most of them out of the image. A tests+docs commit (b371ebb) still ran docker for 9.5 min. | Add `'!tests/**'`, `'!unraid/**'`, `'!playwright*.ts'`, `'!scripts/mutation/**'`, `'!scripts/run-limited.sh'`, `'!osv-scanner.toml'`, `'!renovate.json'` to the filter. | None for the image; those files are not in it. Keep `docker.yml` itself in the filter. |
| 2 | `verify` repeats what `Build` already ran for the same sha: lint, unit, typecheck, build and the full Playwright suite (310 s of 420 s). | On push to `main` reduce `verify` to `audit:prod` + `npm run verify` (build + smoke, ~1.5 min) and let `Build` stay the full gate; keep the full verify for tags and `workflow_dispatch`. Publish time drops from ~9.5 to ~4.5 min. | An image can be published while `Build` is still running or later red. Covered by the failure alarm, the post-deploy smoke and the pull script's rollback. Needs Marco's yes (deploy chain). |
| 3 | `Build` runs the full suite on docs-only pushes too (6 min). | `paths-ignore` for `**/*.md`, `docs/**` on the `push` trigger only. Keep `pull_request` unfiltered so the required check always reports. | None on main; PR checks stay as they are. |
| 4 | Pull latency is invisible (40 s to ~10 min between docker end and live sha). | Write "docker finished at / sha live at / latency" to the smoke step summary. Check the Unraid auto-update interval (not visible from this repo) and shorten it if it is the long pole. | None; only reporting. |
| 5 | Public pages (`/`, `/guide`, `/faq`, `/about`, `/addons`) use `swr: 120`, so right after the sha matches a text fix can still look old for up to 2 minutes. | Verify a text fix with a cache-busting query (`?v=<time>`) or wait 2 minutes after the sha match. Leave the 120 s window as it is. | None. |
| 6 | `concurrency: cancel-in-progress` on `docker` skips images for intermediate commits. | Fine for the fast path; batch two quick fixes into one push. | None. |
| 7 | Smoke polls every 30 s for up to 15 min. | Fine; no change. | None. |

Expected effect with 1 to 3: docs, test and tooling commits skip the image; a text fix is live ~5 to 6 minutes after the push plus the pull latency.

## Fast-path rules for small text and design fixes

- Allowed: copy, labels, spacing, colours, static content in `components/`, `pages/`, `utils/pageCopyDefaults.ts`, `assets/`; no auth, passkey, lockout, database or server changes.
- Local gate: lint, typecheck, unit and only the Playwright specs of the touched page (full suite only when layout or shared components change).
- Push to `main` directly; watch `Build` and `docker`; do not re-push while `docker` runs unless needed (a newer push cancels the older image).
- After the smoke: open the page once with a cache-busting query and compare the text, in Dark and Light.
- Review afterwards by Buddy; a bad fix is reverted by a new small commit.
