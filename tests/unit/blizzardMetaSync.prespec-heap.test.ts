import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  PRE_SPEC_DUNGEON_COUNT,
  PRE_SPEC_LEADERBOARD_CAP,
  PRE_SPEC_PERIOD_COUNT,
  PRE_SPEC_REALM_COUNT,
  expectedUniqueCandidates,
} from '../fixtures/blizzard-meta/preSpecHeapFixture'

const CHILD = fileURLToPath(new URL('../fixtures/blizzard-meta/runPreSpecHeap.ts', import.meta.url))
const LIVE_BUDGET_BYTES = 180 * 1024 * 1024
const GUARD_FRACTION = 0.85

describe('meta pre-spec heap (EU-scale fixture, 256 MB cap)', () => {
  it('keeps live data after GC under budget and does not trip the 256 MB guard', { timeout: 180_000 }, () => {
    const result = spawnSync(
      process.execPath,
      ['--expose-gc', '--max-old-space-size=256', '--import', 'tsx', CHILD],
      { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test' }, timeout: 170_000 },
    )
    if (result.status !== 0) {
      assert.fail(`pre-spec child exited ${result.status} signal=${result.signal}\nstdout:${result.stdout}\nstderr:${result.stderr}`)
    }
    const line = result.stdout.trim().split('\n').filter(Boolean).at(-1) || ''
    const measured = JSON.parse(line) as {
      boardJsonBytes: number
      expectedCandidates: number
      planned: number
      ok: number
      failed: number
      candidates: number
      retained: number
      players: number
      baselineBytes: number
      heapBeforeGcBytes: number
      heapAfterGcBytes: number
      peakHeapBytes: number
      rssAfterGcBytes: number
      heapLimitBytes: number
    }

    const jobs = PRE_SPEC_REALM_COUNT * PRE_SPEC_DUNGEON_COUNT * PRE_SPEC_PERIOD_COUNT
    assert.equal(measured.planned, jobs)
    assert.equal(measured.ok, jobs)
    assert.equal(measured.failed, 0)
    assert.equal(measured.candidates, expectedUniqueCandidates(PRE_SPEC_REALM_COUNT))
    assert.equal(measured.players, measured.candidates)
    assert.ok(
      measured.retained <= 40 * 400 && measured.retained > 0,
      `retained ${measured.retained} should be at most 40 specs × 400 attempts`,
    )
    assert.ok(
      measured.boardJsonBytes > 600_000 && measured.boardJsonBytes < 2_500_000,
      `500-group board JSON was ${measured.boardJsonBytes} bytes; expected ~0.8–2 MB (Blizzard cap ${PRE_SPEC_LEADERBOARD_CAP})`,
    )
    assert.ok(
      measured.heapAfterGcBytes < LIVE_BUDGET_BYTES,
      `live heap after GC was ${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB, budget is 180 MB (before GC ${(measured.heapBeforeGcBytes / 1024 / 1024).toFixed(1)} MB, peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB)`,
    )
    const guardLine = measured.heapLimitBytes * GUARD_FRACTION
    assert.ok(
      measured.peakHeapBytes < guardLine,
      `peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB reached 85% of the ${(measured.heapLimitBytes / 1024 / 1024).toFixed(1)} MB 256-cap limit`,
    )
    console.log(
      `[meta-heap] pre-spec EU ${PRE_SPEC_REALM_COUNT}×${PRE_SPEC_DUNGEON_COUNT}×${PRE_SPEC_PERIOD_COUNT} `
      + `boardJson=${(measured.boardJsonBytes / 1024 / 1024).toFixed(2)} MB `
      + `candidates=${measured.candidates} retained=${measured.retained} `
      + `beforeGc=${(measured.heapBeforeGcBytes / 1024 / 1024).toFixed(1)} MB `
      + `afterGc=${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB `
      + `peak=${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB `
      + `limit=${(measured.heapLimitBytes / 1024 / 1024).toFixed(1)} MB `
      + `rss=${(measured.rssAfterGcBytes / 1024 / 1024).toFixed(1)} MB`,
    )
  })
})
