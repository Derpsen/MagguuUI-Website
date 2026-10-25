import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { runRetentionCleanup, retentionSteps } from '../../server/utils/retentionCleanup'

describe('retention cleanup', () => {
  it('runs every step on a healthy database and reports no failure', () => {
    const sqlite = new Database(':memory:')
    initializeDatabase(sqlite)
    const logged: string[] = []
    const failed = runRetentionCleanup(sqlite, 0, m => logged.push(m))
    assert.deepEqual(failed, [])
    assert.deepEqual(logged, [])
  })

  it('logs a failing step instead of swallowing it, and still runs the later steps', () => {
    const sqlite = new Database(':memory:') // no tables at all: every step that touches one fails
    const logged: Array<{ m: string, e: unknown }> = []
    const failed = runRetentionCleanup(sqlite, 0, (m, e) => logged.push({ m, e }))
    assert.ok(failed.includes('visitor log retention'), 'the visitor log prune failure is reported')
    assert.ok(failed.includes('web vitals retention'), 'steps after the failing one still run')
    assert.equal(logged.length, failed.length)
    assert.match(logged[0]!.m, /Retention step ".+" failed/)
    assert.ok(logged[0]!.e instanceof Error)
  })

  it('isolates a throwing step', () => {
    const calls: string[] = []
    const failed = runRetentionCleanup(new Database(':memory:'), 0, () => calls.push('log'), [
      { name: 'a', run: () => { throw new Error('boom') } },
      { name: 'b', run: () => calls.push('b') },
    ])
    assert.deepEqual(failed, ['a'])
    assert.deepEqual(calls, ['log', 'b'])
  })

  it('the plugin uses it and has no silent catch around the retention work', async () => {
    const { readFileSync } = await import('node:fs')
    const src = readFileSync(new URL('../../server/plugins/session-cleanup.ts', import.meta.url), 'utf8')
    assert.match(src, /runRetentionCleanup\(sqlite, cutoff, undefined, \[/)
    assert.ok(src.indexOf('...retentionSteps(sqlite, cutoff)') < src.indexOf("name: 'expired sessions'"), 'personal-data retention runs before the housekeeping')
    assert.ok(src.indexOf("name: 'expired sessions'") < src.indexOf('walCheckpointStep(sqlite)'), 'the WAL checkpoint is the last step')
    assert.doesNotMatch(src, /catch \{ \/\*/)
    assert.equal(retentionSteps(new Database(':memory:'), 0).length, 5)
  })
})
