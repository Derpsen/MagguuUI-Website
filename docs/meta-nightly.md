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
| `CLOUDFLARE_ZONE_ID` / `CLOUDFLARE_API_TOKEN` | empty | After a successful promote, purge `/meta` and `/meta/**` by prefix (`ui.magguu.xyz/meta`). Missing credentials = no-op. Does not call `purge_everything`. |

## Population (decision 0.07)

EU connected realms, current Mythic+ season, current period plus the two previous season periods, every dungeon leaderboard, no key-level floor. Spec comes from the leaderboard member. A profile is dropped when the character's active spec does not match that assignment. A character who appears as several specs is assigned to the spec with the most runs (tie: higher key).

## Robustness

- OAuth token is refreshed at least five minutes before expiry; a 401 refreshes once and retries once.
- Global rate gate ≤ 40 requests/s (hard cap 50) and concurrency 16. Per-request timeout 20 s.
- 429/5xx: honour `Retry-After` when present, otherwise exponential backoff with jitter, max 6 attempts, then the item counts as failed.
- 404/403 are not retried (private, renamed, or transferred characters).
- Job / lock deadline: 45 minutes. Failed leaderboards and profiles are skipped; promote is decided by the sanity gates.
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
