import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  assertMetaHeapSafe,
  defaultMetaHeapMonitor,
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
