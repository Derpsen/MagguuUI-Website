import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { META_JOB_TIMEOUT_MS } from '../../utils/metaTypes'
import {
  BLIZZARD_META_LOCK_TTL_MS,
  isBlizzardMetaLockHeld,
  releaseBlizzardMetaLock,
  resetBlizzardMetaLock,
  tryAcquireBlizzardMetaLock,
  withBlizzardMetaLock,
} from '../../server/utils/blizzardMetaLock'

const acquireChild = join(dirname(fileURLToPath(import.meta.url)), 'helpers', 'metaSyncLockAcquireChild.ts')

function acquireInProcess(dbPath: string, startAt: number) {
  return new Promise<{ ok: boolean, status: number | null, stdout: string, stderr: string }>((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', acquireChild, dbPath, String(startAt)], {
      cwd: join(dirname(fileURLToPath(import.meta.url)), '..', '..'),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout += chunk })
    child.stderr.on('data', (chunk: string) => { stderr += chunk })
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      reject(new Error(`acquire child timed out\nstdout=${stdout}\nstderr=${stderr}`))
    }, 10_000)
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (status) => {
      clearTimeout(timer)
      let ok = false
      try {
        const line = stdout.trim().split('\n').at(-1) || ''
        ok = JSON.parse(line).ok === true
      } catch {
        // keep ok = false when the child printed no JSON
      }
      resolve({ ok, status, stdout, stderr })
    })
  })
}

const dirs: string[] = []

function openPair() {
  const dir = mkdtempSync(join(tmpdir(), 'meta-sync-lock-'))
  dirs.push(dir)
  const file = join(dir, 'lock.db')
  const a = new Database(file)
  const b = new Database(file)
  for (const db of [a, b]) {
    db.pragma('journal_mode = WAL')
    db.pragma('busy_timeout = 5000')
  }
  initializeDatabase(a)
  return { a, b, file }
}

afterEach(() => {
  while (dirs.length) {
    const dir = dirs.pop()
    if (dir) rmSync(dir, { recursive: true, force: true })
  }
})

describe('blizzard meta lock (SQLite, two connections)', () => {
  it('lets one acquirer in and blocks the second until release', async () => {
    const { a, b } = openPair()
    const first = tryAcquireBlizzardMetaLock(a, 1000)
    assert.equal(first.ok, true)
    assert.equal(isBlizzardMetaLockHeld(b, 1000), true)
    assert.equal(tryAcquireBlizzardMetaLock(b, 1000).ok, false)
    if (!first.ok) return
    releaseBlizzardMetaLock(a, first.ownerToken)
    const second = tryAcquireBlizzardMetaLock(b, 1000)
    assert.equal(second.ok, true)
    if (!second.ok) return
    const again = await withBlizzardMetaLock(a, async () => 'nope', 1000)
    assert.deepEqual(again, { ok: false, reason: 'locked' })
    releaseBlizzardMetaLock(b, second.ownerToken)
    const ok = await withBlizzardMetaLock(a, async () => 7, 1000)
    assert.deepEqual(ok, { ok: true, value: 7 })
    a.close()
    b.close()
  })

  it('expires a stuck hold after the TTL so the other connection can acquire', () => {
    const { a, b } = openPair()
    assert.equal(tryAcquireBlizzardMetaLock(a, 1000).ok, true)
    assert.equal(tryAcquireBlizzardMetaLock(b, 1000 + BLIZZARD_META_LOCK_TTL_MS - 1).ok, false)
    assert.equal(tryAcquireBlizzardMetaLock(b, 1000 + BLIZZARD_META_LOCK_TTL_MS).ok, true)
    a.close()
    b.close()
  })

  it('holds until the job deadline so a later clock still cannot overlap a running job', async () => {
    const { a, b } = openPair()
    const start = 5_000
    const deadline = start + BLIZZARD_META_LOCK_TTL_MS + 60_000
    let t = start
    const first = await withBlizzardMetaLock(a, async () => {
      t = deadline - 1
      const nested = await withBlizzardMetaLock(b, async () => 'overlap', () => t, deadline)
      assert.deepEqual(nested, { ok: false, reason: 'locked' })
      return 'ok'
    }, () => t, deadline)
    assert.deepEqual(first, { ok: true, value: 'ok' })
    a.close()
    b.close()
  })

  it('releases the lock in finally after success and after a throw', async () => {
    const { a, b } = openPair()
    const first = await withBlizzardMetaLock(a, async () => 'ok', 1000)
    assert.deepEqual(first, { ok: true, value: 'ok' })
    await assert.rejects(
      () => withBlizzardMetaLock(a, async () => { throw new Error('boom') }, 1000),
      /boom/,
    )
    const again = await withBlizzardMetaLock(b, async () => 2, 1000)
    assert.deepEqual(again, { ok: true, value: 2 })
    a.close()
    b.close()
  })

  it('does not release when the owner token does not match', () => {
    const { a, b } = openPair()
    const first = tryAcquireBlizzardMetaLock(a, 1000)
    assert.equal(first.ok, true)
    releaseBlizzardMetaLock(b, 'not-the-owner')
    assert.equal(isBlizzardMetaLockHeld(b, 1000), true)
    assert.equal(tryAcquireBlizzardMetaLock(b, 1000).ok, false)
    if (first.ok) releaseBlizzardMetaLock(a, first.ownerToken)
    assert.equal(isBlizzardMetaLockHeld(b, 1000), false)
    a.close()
    b.close()
  })

  it('reset drops a held row so a later acquirer can enter', () => {
    const { a, b } = openPair()
    assert.equal(tryAcquireBlizzardMetaLock(a, 1000).ok, true)
    resetBlizzardMetaLock(a)
    assert.equal(tryAcquireBlizzardMetaLock(b, 1000).ok, true)
    a.close()
    b.close()
  })

  it('keeps the lock after the job deadline until the longer TTL', () => {
    assert.ok(BLIZZARD_META_LOCK_TTL_MS > META_JOB_TIMEOUT_MS)
    const { a, b } = openPair()
    const start = 1_000
    const deadline = start + META_JOB_TIMEOUT_MS
    assert.equal(tryAcquireBlizzardMetaLock(a, start, deadline).ok, true)
    assert.equal(tryAcquireBlizzardMetaLock(b, deadline).ok, false)
    assert.equal(tryAcquireBlizzardMetaLock(b, start + BLIZZARD_META_LOCK_TTL_MS - 1).ok, false)
    assert.equal(tryAcquireBlizzardMetaLock(b, start + BLIZZARD_META_LOCK_TTL_MS).ok, true)
    a.close()
    b.close()
  })

  it('lets exactly one of two processes acquire across many races', { timeout: 30_000 }, async () => {
    const { a, file } = openPair()
    a.close()
    const rounds = 20
    for (let i = 0; i < rounds; i++) {
      const reset = new Database(file)
      reset.pragma('journal_mode = WAL')
      reset.pragma('busy_timeout = 5000')
      initializeDatabase(reset)
      resetBlizzardMetaLock(reset)
      reset.close()
      const startAt = Date.now() + 40
      const [left, right] = await Promise.all([
        acquireInProcess(file, startAt),
        acquireInProcess(file, startAt),
      ])
      const wins = Number(left.ok) + Number(right.ok)
      assert.equal(
        wins,
        1,
        `round ${i}: expected exactly one acquirer, got ${wins}\nleft=${left.stdout}${left.stderr}\nright=${right.stdout}${right.stderr}`,
      )
    }
  })
})
