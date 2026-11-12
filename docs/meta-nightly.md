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
| `NUXT_META_HEAP_LIMIT_MB` | (V8 limit) | Optional heap-guard cap in MB. The job aborts at 85% of the effective limit, releases the lock, and keeps the last-good snapshot. |
| `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` | empty | After a successful promote, purge `/meta` and `/meta/**` by prefix (`ui.magguu.xyz/meta`). Missing credentials = no-op. Does not call `purge_everything`. |

## Population (decision 0.07)

EU connected realms, current Mythic+ season, current period plus the two previous season periods, every dungeon leaderboard, no key-level floor. Spec comes from the leaderboard member. A profile is dropped when the character's active spec does not match that assignment. A character who appears as several specs is assigned to the spec with the most runs (tie: higher key).

## Robustness

- OAuth token is refreshed at least five minutes before expiry; a 401 refreshes once and retries once.
- Global rate gate ≤ 40 requests/s (hard cap 50) and concurrency 16. Per-request timeout 20 s.
- 429/5xx: honour `Retry-After` when present, otherwise exponential backoff with jitter, max 6 attempts, then the item counts as failed.
- 404/403 are not retried (private, renamed, or transferred characters).
- Job / lock deadline: 45 minutes (same as the lock TTL). Production uses a live clock on every deadline, rate-gate, and 429 wait — tests may pass an advancing `now` function. The lock is held until `max(now + TTL, job deadline)` and always released in `finally`, so a second run cannot overlap while the first still holds. Failed leaderboards and profiles are skipped; promote is decided by the sanity gates.
- Secrets never appear in logs. Names and realms are in-memory lookup keys only.

## Sanity gates (before promote)

The job writes a staging row first, then promotes the active pointer only when every blocking gate passes. Otherwise the previous snapshot stays active (`partial`).

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

`rollbackMetaSnapshot(sqlite)` re-points the region at the previous unexpired `ok` snapshot. Raw SQL equivalent:

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

A heap guard checks `process.memoryUsage().heapUsed` only (not RSS or `external`) against 85% of V8 `heap_size_limit` (or `NUXT_META_HEAP_LIMIT_MB` when set, whichever is smaller) between batches. On a breach the run ends as `error`, the SQLite lock is released, leftover staging older than the lock TTL is cleared, and the last-good snapshot stays active. The guard is what stops a second OOM from taking down the website process.

The Unraid container may also raise `NODE_OPTIONS=--max-old-space-size=640` (limit 768 MB) as a host-side buffer. That does not replace the lean path or the guard.

A protected manual trigger is the CLI packed into the production image as `.output/server/meta-sync-cli.mjs`. Unraid & Server runs it with:

```sh
docker exec MagguuUI node .output/server/meta-sync-cli.mjs
```

The process starts in `/app` (the container `WORKDIR`), opens the same SQLite database as the website, and shares the cross-process lock (`meta_sync_lock`, owner token + 45-minute TTL, or until the job deadline). If the nightly (or another CLI) already holds the lock, the command exits 2 and prints a JSON summary whose `status` is `locked` and whose `reason` is `A Meta update is already running`. Staging rows older than the lock TTL are dropped at the start of a run; a still-fresh token is left alone.

The CLI calls `runScheduledBlizzardMetaSync` (lean sampling, heap guard, deadline, fail-closed promote, last-good snapshot kept). It can run even when `NUXT_META_NIGHTLY` is off, but still needs `NUXT_BLIZZARD_CLIENT_ID` and `NUXT_BLIZZARD_CLIENT_SECRET` from the container environment (same as the app; secrets are never printed). It prints one JSON object to stdout: `status`, `durationMs`, `peakRssBytes`, `peakHeapUsedBytes`, `specsWithData`, `http429`, and `reason` when present. Exit codes: `0` ok, `1` error, `2` locked, `3` partial, `4` skipped.

The CLI is a **separate Node process next to the website**. It inherits the container `NODE_OPTIONS` (including `--max-old-space-size=640` when that is set). Peak memory during a manual run is the website process plus the CLI, not a replacement for the server heap. Do not fire this command until the image that contains the CLI has been pulled by autoupdate.

Nitro's `/_nitro/tasks` HTTP surface exists in the dev server, not in the production image, and is not the manual trigger.

