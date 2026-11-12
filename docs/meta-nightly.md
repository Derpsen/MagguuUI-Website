# Meta nightly job

The `blizzard:nightly` task runs at **03:15 UTC**, after `github:nightly` at 02:30 UTC. It is armed by `server/plugins/blizzard-meta-schedule.ts` with UTC date math (no container TZ, no Nitro `scheduledTasks` cron). Default **off** until credentials and `NUXT_META_NIGHTLY` are set. Production still arms the timer when the flag is off so expired snapshots can be deleted (30-day TTL). The job is not armed in development, CI, Playwright, or the link-check prerender.

## Environment

| Variable | Default | Role |
|---|---|---|
| `NUXT_BLIZZARD_CLIENT_ID` / `NUXT_BLIZZARD_CLIENT_SECRET` | empty | OAuth client credentials. Server-only, never logged. The fetch stays off while either is empty. |
| `NUXT_BLIZZARD_REGION` | `eu` | Phase 1 is EU only. Other values warn once and still use `eu`. |
| `NUXT_META_NIGHTLY` | off | `on`/`true`/`1`/`yes` arms the fetch. `off`/`false`/`0`/`no` skips the fetch (cleanup still runs). Unknown values warn once and stay off. |
| `NUXT_META_KUMA_PUSH_URL` | empty | Optional Uptime Kuma push URL (token in the path). Never logged. `up` on `ok`/`skipped`, `down` on `partial`/`error`/`locked`. |
| `NUXT_META_SAMPLE_PER_SPEC` | `200` | Profile sample target per spec (default in the 150–200 range). |
| `NUXT_META_MAX_ATTEMPTS_PER_SPEC` | `400` | Max profile attempts per spec. |
| `NUXT_META_MAX_CONCURRENT_SPECS` | `1` | Max specs sampled in parallel (1–8). Keep at 1 on Unraid. |
| `NUXT_META_HEAP_LIMIT_MB` | (V8 / old-space) | Optional heap-guard cap in MB. The CLI aborts at 70% of its own old-space cap; the in-process website nightly aborts at 85% of the 640 MB cap (544 MB, not 70%/448 MB). Optionally this env tightens the ceiling. |
| `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` | empty | After a successful promote, purge `/meta` and `/meta/**` by prefix (`ui.magguu.xyz/meta`). Missing credentials = no-op. Does not call `purge_everything`. |

## Population (decision 0.07)

EU connected realms, current Mythic+ season, current period plus the two previous season periods, every dungeon leaderboard, no key-level floor. Spec comes from the leaderboard member. A profile is dropped when the character's active spec does not match that assignment. A character who appears as several specs is assigned to the spec with the most runs (tie: higher key).

## Robustness

- OAuth token is refreshed at least five minutes before expiry; a 401 refreshes once and retries once.
- Global rate gate ≤ 40 requests/s (hard cap 50) and concurrency 8. Per-request timeout 20 s. A 429 pauses the whole gate until `Retry-After`; waiters re-check so a stale slot cannot fire during the pause. The current rps halves on each 429 (floor 8 rps) and climbs back toward 40 after 80 clean responses.
- 429/5xx: honour `Retry-After` when present, otherwise exponential backoff with jitter, max 6 attempts, then the item counts as failed.
- 404/403 are not retried (private, renamed, or transferred characters).
- Job deadline: 45 minutes. Lock TTL is that deadline plus a 5-minute grace (50 minutes), or until a later job deadline — `max(now + TTL, job deadline)`. The extra grace stops a second run from overlapping a job that is still winding down at its deadline. Production uses a live clock on every deadline, rate-gate, and 429 wait — tests may pass an advancing `now` function. The lock is always released in `finally`. Failed leaderboards and profiles are skipped. Within a spec, profile GETs run with `caps.concurrency` (still rate-gated ≤ 40 rps) and stop at `NUXT_META_SAMPLE_PER_SPEC` / `NUXT_META_MAX_ATTEMPTS_PER_SPEC`. Progress is logged per spec and every 50 HTTP calls with a rate. After each finished spec the aggregate is staged, but mid-run snapshots are not promoted (one gated promote at the end or at the deadline, one `ok` row, then a Cloudflare `/meta` purge). If the deadline hits after at least one spec has data, the job returns status `partial` (CLI exit 3) and the CLI summary sets `partialOutcome` to `published`, `kept-last-good`, or `not-published`. A deadline with 0 specs stays `error` / exit 1. External abort mid spec or mid icon still does not promote. A `locked` result is pushed to Kuma as `down`.
- Secrets never appear in logs. Names and realms are in-memory lookup keys only.

## Sanity gates (before promote)

The job writes a staging row first, then promotes the active pointer only when every blocking gate passes. Otherwise the previous snapshot stays active (`partial`). Deadline partials follow the same rule (DoD 1.24 / 1.26): they still go through `evaluateMetaRunPolicy` (429 rate ≤ `META_MAX_429_RATE` = 5 %, profile success ≥ 70 %, total `n` ≥ 50 % of last-good, no spec flipping from `n ≥ 50` to `0`; DoD 1.26 is 50, matching `META_SANITY_SPEC_FLIP_N`) plus a per-spec sample floor (`profileCount >= META_MIN_BUILD_SAMPLE` = 50, raised from the UI show floor of 10 after the local sync4 run showed a minimum of 208 profiles per spec across 40 specs). A 40×1 snapshot cannot replace a 39×200 last-good. The complete-catalog check is skipped only on the deadline path so an unfinished run can still publish when there is no last-good; mid-run intermediates are never promoted, and `rollbackMetaSnapshot` re-points at the newest prior `ok` snapshot, walking past an older row only when that row has fewer well-covered specs than the predecessor (thin partial intermediates), not when it merely has a slightly higher per-spec sample.

If there has never been a last-good snapshot, a partial with real specs may go live even when the 429-rate gate fails (for example a 34 % 429 rate like local sync4, before the rate-gate stampede fix): CLI exit 3, `partialOutcome=published`, `/meta` shows the data with a visible "Partial data" note (`freshness.partial`). Each published spec must have `profileCount >= META_MIN_BUILD_SAMPLE` (50); thinner specs are omitted. A first partial with no spec at that floor stays `not-published` and `/meta` stays empty. Once a last-good exists, a partial replaces it only if it passes the quality gate (coverage ≥ last-good, every published spec n ≥ 50, 429 rate ≤ 5 %, profile success ≥ 70 %, 50 % n, no n≥50→0 flip). Deadline publishes are always marked partial.

- Leaderboards ≥ 90 % ok
- All 13 classes and all catalog specs present in the payload (empty specs are filled in)
- Profile call success ≥ 70 %
- 429 rate ≤ 5 %
- No reserved `name` / `realm` / `character` keys (the snapshot parser also rejects them)
- Versus the previous snapshot: total `n` ≥ 50 %, and no spec flipping from `n ≥ 50` to `0`

"Specs below the hide threshold" is reported in run history but is not blocking.

## Unmapped talent picks

Every class tree currently publishes one `CHOICE` node (ids around 99828–99853) whose static payload is `ranks: [{ rank: 1 }]` with no `choice_of_tooltips`. A profile can report a child/entry id that is not in that layout. Those picks are kept with `unmapped: true` and counted in `sampled.unknownTalentNodes`. The loadout is not dropped when the tree hash matches the dominant hash for the class.

## Best build

Builds are grouped by hero tree + core talents (talents picked by at least 80 % of the sample). The group's `share` is the group size. The copied loadout `code` is the most frequent exact code in that group (exact codes alone are too fragmented).

## Rollback

`rollbackMetaSnapshot(sqlite)` re-points the region at the newest unexpired `ok` snapshot before the current one. A slightly lower per-spec sample (for example 198 vs an older 200) stays on that predecessor; only a thinner well-covered-spec count is walked past as a partial intermediate. Raw SQL equivalent:

```sql
-- inspect
SELECT snapshot_id, fetched_at, status FROM meta_snapshots WHERE region = 'eu' AND status = 'ok' ORDER BY fetched_at DESC;

-- re-point (example)
INSERT INTO meta_snapshot_active (region, snapshot_id)
VALUES ('eu', :previous_id)
ON CONFLICT(region) DO UPDATE SET snapshot_id = excluded.snapshot_id;
```

Run history lives in `meta_runs` (same 30-day cleanup window). `/api/health` exposes `meta.status`, `meta.snapshotAgeHours`, and `meta.lastRunStatus` with no secrets.

## Memory

The 2026-11-12 04:15 Europe/Berlin nightly ran out of process heap (~377 MB of a 384 MB limit), the container auto-restarted, and no new snapshot was written (0× HTTP 429). The job now samples **spec by spec**, absorbs each profile into count maps, and writes those intermediate aggregates to SQLite staging (`meta_sync_spec_staging`). Raw profile, talent and gear responses are not kept in RAM. After all specs have been staged, the snapshot is assembled from staging, then the existing gates and promote path run. Isolated 40×200 fixture measurement: lean growth 62.0 MB (peak 77.4 MB) vs a retain-all path at 154.0 MB growth (peak 170.8 MB), against a 96 MB growth budget.

A heap guard checks `process.memoryUsage().heapUsed` only (not RSS or `external`) against the effective ceiling (`--max-old-space-size` when set, else V8 `heap_size_limit`, or `NUXT_META_HEAP_LIMIT_MB` when smaller). The trip fraction is 70% on a CLI-sized old-space (≤ 512 MB) and 85% in the website process (544 MB of 640), so the in-process nightly is not tripped at ~448 MB. It also runs every 32 leading groups inside a board, not only between boards. On a breach the run ends as `error`, the SQLite lock is released, leftover staging older than the lock TTL is cleared, and the last-good snapshot stays active. The guard is what stops a second OOM from taking down the website process.

The Unraid template (`unraid/magguuui-website.xml`) sets ExtraParams `--memory=1g --memory-swap=-1` (matching the live container; MemorySwap -1 is intentional) and `NODE_OPTIONS=--enable-source-maps --max-old-space-size=640`. Applying the template does not change an already-running container. That does not replace the lean path or the guard.

A protected manual trigger is the CLI packed into the production image as `.output/server/meta-sync-cli.mjs`. Unraid & Server runs it with:

```sh
docker exec -it MagguuUI node .output/server/meta-sync-cli.mjs
```

Use `-it` so Ctrl-C reaches the CLI. A `docker stop` of the container does not SIGTERM an exec process, so the lock can stay held for up to 50 minutes.

The CLI is a second Node process next to the website and must not inherit the website `NODE_OPTIONS` `--max-old-space-size=640` (on 12.11.2026, in the previous 768 MB cgroup, that pair hit the cgroup max and the heap guard aborted at 565 MB `heapUsed` / 664 MB V8 limit mid leaderboard ingest). The container Memory is now 1 GB. The image wrapper prefers `process.execve` with `--max-old-space-size=256` on execArgv (`NUXT_META_CLI_HEAP_MB`, clamped 64–512; 192 was too tight: 70% of 192 MB is 134 MB, and an EU-scale pre-spec mid-run peak is 129–135 MB) and strips both `--max-old-space-size` and `--max_old_space_size` from `NODE_OPTIONS`, so no wrapper process stays resident. An inherited `META_SYNC_CLI_HEAP_APPLIED` env is ignored; the wrapper uses an argv marker plus a real execArgv cap. If execve is unavailable it spawns instead, forwards SIGTERM/SIGINT/SIGHUP, waits for the child (lock and staging released), and mirrors the child status (`128+n` if the child dies from a signal). The child also exits if the wrapper is SIGKILL'd (IPC disconnect or a ppid change). The guard and the JSON `peakRssBytes` / `peakHeapUsedBytes` / `heapLimitBytes` / `dropped` fields are process-local. Pre-spec ingest keeps a per-spec top-N by `best` (default 800, at least `maxAttemptsPerSpec`), counts population and key levels before any trim, reports dropped ingest/trim/total, and loads playable-specialization sequentially. A production-shaped 500-group board is 0.84 MB of JSON (Blizzard cap 500 `leading_groups`). Measured with the production 70% guard: EU-scale fixture (166 400 incoming players) peak 129.5 MB heap / 24.2 MB live after GC / 239.4 MB RSS; 403 200 unique players peak 111.6 MB heap / 22.4 MB live / 203.3 MB RSS; both stay inside the per-spec top-N (default 800) and report the pre-trim unique count as `players`. A 192 MB cap trips at 134 MB and can abort mid-board under the same load, so the default stays 256 MB (trip at 179 MB). CI image smoke fails if start RSS is above 150 MB or start heap above 50 MB (no credentials, `skipped`), and a mock EU-scale pre-spec peak must stay under 180 MB heap / 300 MB RSS. Typical website RSS is 150–200 MB plus this CLI (200–240 MB measured) and fits in 1 GB with room. Worst case, a website process already at its 640 MB cap (RSS often 700–800 MB once native addons are counted) plus the CLI is about 0.90–1.04 GB — tight against the 1 GB cgroup; do not fire the manual CLI when the website is already near the cap. There is no wrapper RSS when execve succeeds.

An in-process admin trigger was considered and rejected for this fix: it would share the website heap and could OOM the server. The CLI stays, with its own heap cap and no auth changes.

CI smokes that binary in the PR image build (`.github/workflows/docker-scan.yml`, after `docker build` + `load`) and again in the main `docker.yml` image smoke: `docker run` / `docker exec` of `node .output/server/meta-sync-cli.mjs` with no Blizzard credentials, expecting exit `4` and JSON `status: "skipped"`.

The process starts in `/app` (the container `WORKDIR`), opens the same SQLite database as the website, and shares the cross-process lock (`meta_sync_lock`, owner token + 45-minute job deadline plus a 5-minute grace, or until a later job deadline). If the nightly (or another CLI) already holds the lock, the command exits 2 and prints a JSON summary whose `status` is `locked` and whose `reason` is `A Meta update is already running` (Kuma maps `locked` to `down`). Staging rows older than the lock TTL are dropped at the start of a run; a still-fresh token is left alone. SIGINT and SIGTERM abort the in-flight sync so the lock is released in `finally`, and the process exits non-zero.

The CLI calls `runScheduledBlizzardMetaSync` (lean sampling, heap guard, deadline, fail-closed promote, last-good snapshot kept). It can run even when `NUXT_META_NIGHTLY` is off, but still needs `NUXT_BLIZZARD_CLIENT_ID` and `NUXT_BLIZZARD_CLIENT_SECRET` from the container environment (same as the app; secrets are never printed). It prints one JSON object to stdout: `status`, `durationMs`, `peakRssBytes`, `peakHeapUsedBytes`, `specsWithData`, `http429`, and `reason` when present. Exit codes: `0` ok, `1` error, `2` locked, `3` partial, `4` skipped.

The CLI is a **separate Node process next to the website**. It does not keep the website `--max-old-space-size=640`: the entry strips that flag from `NODE_OPTIONS` and replaces itself (`process.execve`) with `--max-old-space-size=256`. Peak memory during a manual run is still the website process plus the CLI, not a replacement for the server heap. `--memory-swap=-1` on the Unraid template is intentional (matches live). Do not fire this command until the image that contains the CLI has been pulled by autoupdate.

Nitro's `/_nitro/tasks` HTTP surface exists in the dev server, not in the production image, and is not the manual trigger.

