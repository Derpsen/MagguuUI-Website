import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { META_SYNC_DEFAULT_MAX_CANDIDATES, MetaCandidateTable } from '../../server/utils/blizzardMetaSync'
import {
  META_SYNC_CLI_DEFAULT_HEAP_MB,
  META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
  META_SYNC_CLI_PEAK_RSS_BUDGET_BYTES,
} from '../../server/utils/metaSyncCliHeap'
import {
  PRE_SPEC_400K_UNIQUE,
  PRE_SPEC_DUNGEON_COUNT,
  PRE_SPEC_PERIOD_COUNT,
  PRE_SPEC_REALM_COUNT,
} from '../fixtures/blizzard-meta/preSpecHeapFixture'

const CHILD = fileURLToPath(new URL('../fixtures/blizzard-meta/runPreSpecHeap.ts', import.meta.url))

type PreSpecMeasure = {
  mode: string
  boardJsonBytes: number
  expectedIncoming: number
  maxCandidates: number
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
  guardLimitBytes: number
}

function runProbe(env: NodeJS.ProcessEnv = {}): PreSpecMeasure {
  const result = spawnSync(
    process.execPath,
    ['--expose-gc', `--max-old-space-size=${META_SYNC_CLI_DEFAULT_HEAP_MB}`, '--import', 'tsx', CHILD],
    { encoding: 'utf8', env: { ...process.env, NODE_ENV: 'test', ...env }, timeout: 170_000 },
  )
  if (result.status !== 0) {
    assert.fail(`pre-spec child exited ${result.status} signal=${result.signal}\nstdout:${result.stdout}\nstderr:${result.stderr}`)
  }
  const line = result.stdout.trim().split('\n').filter(Boolean).at(-1) || ''
  return JSON.parse(line) as PreSpecMeasure
}

function assertBounded(measured: PreSpecMeasure, incoming: number) {
  assert.equal(measured.failed, 0)
  assert.equal(measured.ok, measured.planned)
  assert.ok(incoming > META_SYNC_DEFAULT_MAX_CANDIDATES)
  assert.ok(
    measured.candidates <= META_SYNC_DEFAULT_MAX_CANDIDATES,
    `kept ${measured.candidates} candidates, cap is ${META_SYNC_DEFAULT_MAX_CANDIDATES} (incoming ${incoming})`,
  )
  assert.equal(measured.players, measured.candidates)
  assert.ok(measured.retained <= 40 * 400 && measured.retained > 0)
  assert.ok(
    measured.boardJsonBytes > 600_000 && measured.boardJsonBytes < 2_500_000,
    `500-group board JSON was ${measured.boardJsonBytes} bytes`,
  )
  assert.ok(
    measured.heapAfterGcBytes < META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
    `live heap after GC was ${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB`,
  )
  assert.ok(
    measured.peakHeapBytes < META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES,
    `peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB exceeds the ${META_SYNC_CLI_PEAK_HEAP_BUDGET_BYTES / 1024 / 1024} MB budget`,
  )
  assert.ok(
    measured.peakHeapBytes < measured.guardLimitBytes * 0.70,
    `peak ${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB reached 70% of the ${(measured.guardLimitBytes / 1024 / 1024).toFixed(1)} MB guard ceiling`,
  )
  assert.ok(measured.rssAfterGcBytes < META_SYNC_CLI_PEAK_RSS_BUDGET_BYTES)
  console.log(
    `[meta-heap] pre-spec ${measured.mode} incoming=${incoming} kept=${measured.candidates} retained=${measured.retained} `
    + `beforeGc=${(measured.heapBeforeGcBytes / 1024 / 1024).toFixed(1)} MB `
    + `afterGc=${(measured.heapAfterGcBytes / 1024 / 1024).toFixed(1)} MB `
    + `peak=${(measured.peakHeapBytes / 1024 / 1024).toFixed(1)} MB `
    + `guard=${(measured.guardLimitBytes / 1024 / 1024).toFixed(1)} MB `
    + `rss=${(measured.rssAfterGcBytes / 1024 / 1024).toFixed(1)} MB`,
  )
}

describe('meta pre-spec heap (CLI cap, production guard)', () => {
  it('evicts the lowest-scoring players when the hard cap is exceeded', () => {
    const table = new MetaCandidateTable(4)
    for (let i = 0; i < 20; i++) table.add('realm', `p${i}`, 63, i)
    table.evictTo(4)
    assert.equal(table.size, 4)
    const names = [...table.players()].map(p => p.name).sort()
    assert.deepEqual(names, ['p16', 'p17', 'p18', 'p19'])
  })

  it('keeps an EU-scale fixture bounded under the CLI heap cap', { timeout: 180_000 }, () => {
    const measured = runProbe()
    const jobs = PRE_SPEC_REALM_COUNT * PRE_SPEC_DUNGEON_COUNT * PRE_SPEC_PERIOD_COUNT
    assert.equal(measured.planned, jobs)
    assertBounded(measured, measured.expectedIncoming)
  })

  it('keeps 400k unique characters bounded and does not trip the guard', { timeout: 180_000 }, () => {
    const measured = runProbe({ META_PRE_SPEC_MODE: '400k' })
    assert.equal(measured.mode, '400k')
    assert.equal(measured.expectedIncoming, PRE_SPEC_400K_UNIQUE)
    assertBounded(measured, PRE_SPEC_400K_UNIQUE)
  })
})
