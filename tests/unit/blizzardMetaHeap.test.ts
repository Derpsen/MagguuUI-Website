import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  assertMetaHeapSafe,
  defaultMetaHeapFraction,
  defaultMetaHeapMonitor,
  META_HEAP_FRACTION,
  META_HEAP_FRACTION_SERVER,
  readProcessMetaMemory,
} from '../../server/utils/blizzardMetaHeap'

describe('meta heap guard is process-local', () => {
  it('reads this process heapUsed, not container cgroup usage', () => {
    const memory = readProcessMetaMemory()
    const usage = process.memoryUsage()
    const used = defaultMetaHeapMonitor().used()
    assert.ok(Math.abs(memory.rss - usage.rss) < 1024 * 1024)
    assert.ok(Math.abs(memory.heapUsed - usage.heapUsed) < 1024 * 1024)
    assert.ok(Math.abs(used - usage.heapUsed) < 1024 * 1024)
    const cgroup = '/sys/fs/cgroup/memory.current'
    if (existsSync(cgroup)) {
      const current = Number(readFileSync(cgroup, 'utf8'))
      if (Number.isFinite(current) && current > usage.heapUsed + 5 * 1024 * 1024) {
        assert.notEqual(used, current)
        assert.ok(used < current, `process heapUsed ${used} must not be container memory.current ${current}`)
      }
    }
    assert.doesNotThrow(() => assertMetaHeapSafe())
  })
})

describe('meta heap fraction is tighter on the CLI than in the website process', () => {
  it('uses 70% for a CLI-sized old-space and 85% for the website 640 MB cap', () => {
    assert.equal(META_HEAP_FRACTION, 0.70)
    assert.equal(META_HEAP_FRACTION_SERVER, 0.85)
    assert.equal(defaultMetaHeapFraction(['--max-old-space-size=256'], ''), 0.70)
    assert.equal(defaultMetaHeapFraction(['--max-old-space-size=192'], ''), 0.70)
    assert.equal(defaultMetaHeapFraction(['--max-old-space-size=512'], ''), 0.70)
    assert.equal(defaultMetaHeapFraction(['--max-old-space-size=640'], ''), 0.85)
    assert.equal(defaultMetaHeapFraction([], '--max-old-space-size=640'), 0.85)
    const limit = 256 * 1024 * 1024
    const justOverCli = Math.floor(limit * 0.71)
    assert.throws(() => assertMetaHeapSafe({
      used: () => justOverCli,
      limit: () => limit,
      fraction: defaultMetaHeapFraction(['--max-old-space-size=256'], ''),
    }))
    assert.doesNotThrow(() => assertMetaHeapSafe({
      used: () => justOverCli,
      limit: () => limit,
      fraction: defaultMetaHeapFraction(['--max-old-space-size=640'], ''),
    }))
  })
})
