import assert from 'node:assert/strict'
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { LOGIN_ATTEMPT_IDENTIFIER_HOURS, detectSuspiciousLogin, scrubLoginAttemptIdentifiers } from '../../server/utils/loginAttempts'
import { retentionSteps, runRetentionCleanup } from '../../server/utils/retentionCleanup'
import { VISITOR_DELETE_DAYS, recordVisitorHit, withdrawVisitorRecords } from '../../server/utils/visitorLog'
import { checkpointWal } from '../../server/utils/walCheckpoint'

const NOW = 1_800_000_000
const H = 3600
function db() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}
function attempt(sqlite: Database.Database, over: Partial<{ username: string, ip: string, ua: string, browser: string, os: string, success: number, at: number }> = {}) {
  const o = { username: 'admin', ip: '203.0.113.5', ua: 'Mozilla/5.0 test', browser: 'Chrome', os: 'Windows', success: 1, at: NOW, ...over }
  sqlite.prepare('INSERT INTO login_attempts (username, ip_address, user_agent, browser, os, success, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(o.username, o.ip, o.ua, o.browser, o.os, o.success, o.at)
}
const rows = (sqlite: Database.Database) => sqlite.prepare('SELECT username, ip_address AS ip, user_agent AS ua, browser, os, success, created_at AS at FROM login_attempts ORDER BY id').all() as Array<{ username: string, ip: string | null, ua: string | null, browser: string, os: string, success: number, at: number }>

describe('sign-in attempts: address and user agent do not outlive 24 hours (Privacy s9)', () => {
  it('the limit is under 24 hours, because the cleanup runs every 30 minutes', () => {
    assert.ok(LOGIN_ATTEMPT_IDENTIFIER_HOURS + 0.5 <= 24)
  })

  it('older attempts lose IP and user agent; the rest of the row stays; younger rows are untouched', () => {
    const sqlite = db()
    attempt(sqlite, { at: NOW - 30 * H })
    attempt(sqlite, { at: NOW - 22 * H })
    attempt(sqlite, { at: NOW - 24 * H, success: 0 })
    assert.equal(scrubLoginAttemptIdentifiers(sqlite, NOW), 2)
    const [old, young, failed] = rows(sqlite)
    assert.deepEqual([old!.ip, old!.ua], [null, null])
    assert.deepEqual([old!.username, old!.browser, old!.os, old!.success], ['admin', 'Chrome', 'Windows', 1])
    assert.deepEqual([young!.ip, young!.ua], ['203.0.113.5', 'Mozilla/5.0 test'])
    assert.equal(failed!.ip, null)
    assert.equal(scrubLoginAttemptIdentifiers(sqlite, NOW), 0, 'idempotent')
  })

  it('it is part of the retention run, which reports no failure', () => {
    const sqlite = db()
    attempt(sqlite, { at: NOW - 48 * H })
    assert.ok(retentionSteps(sqlite, 0).some(s => s.name === 'login attempt identifiers'))
    // the step uses the real clock: an attempt from 1970 is long past the limit
    attempt(sqlite, { at: 1000 })
    assert.deepEqual(runRetentionCleanup(sqlite, 0, () => {}), [])
    assert.ok(rows(sqlite).filter(r => r.at === 1000).every(r => r.ip === null && r.ua === null))
  })

  it('brute-force protection still works on the retained window: 3 failures from one address in 30 minutes are flagged', () => {
    const sqlite = db()
    for (let i = 0; i < 3; i++) attempt(sqlite, { success: 0, at: NOW - 60 * i })
    assert.deepEqual(detectSuspiciousLogin(sqlite, { username: 'admin', ip: '203.0.113.5', browser: 'Chrome', os: 'Windows' }, NOW), { flagged: true, reason: 'brute_force' })
    assert.equal(detectSuspiciousLogin(sqlite, { username: 'admin', ip: '198.51.100.1', browser: 'Chrome', os: 'Windows' }, NOW).reason !== 'brute_force', true)
  })

  it('new address is flagged against the retained window; after the scrub the device check carries on', () => {
    const sqlite = db()
    attempt(sqlite, { at: NOW - 2 * H })
    const other = { username: 'admin', ip: '198.51.100.1', browser: 'Chrome', os: 'Windows' }
    assert.equal(detectSuspiciousLogin(sqlite, other, NOW).reason, 'new_ip')
    assert.deepEqual(detectSuspiciousLogin(sqlite, { ...other, ip: '203.0.113.5' }, NOW), { flagged: false, reason: null })
    // a day later the address of that sign-in is gone: no address history means no new_ip flag, a known device is quiet
    scrubLoginAttemptIdentifiers(sqlite, NOW + 30 * H)
    assert.deepEqual(detectSuspiciousLogin(sqlite, other, NOW + 30 * H), { flagged: false, reason: null })
    // an unknown device is still flagged
    assert.equal(detectSuspiciousLogin(sqlite, { ...other, browser: 'Firefox', os: 'Linux' }, NOW + 30 * H).reason, 'new_device')
    // unknown account: flagged as before
    assert.equal(detectSuspiciousLogin(sqlite, { ...other, username: 'nobody' }, NOW).reason, 'new_device')
  })

  it('the account lock and the throttles do not read login_attempts (no auth behaviour depends on the scrubbed columns)', async () => {
    const { readFileSync } = await import('node:fs')
    for (const f of ['server/utils/loginThrottle.ts', 'server/utils/loginBackoff.ts']) {
      assert.doesNotMatch(readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8'), /login_attempts|loginAttempts/, f)
    }
    const session = readFileSync(new URL('../../server/utils/session.ts', import.meta.url), 'utf8')
    const lockout = session.slice(session.indexOf('export function checkAccountLockout'), session.indexOf('export function unlockAccount'))
    assert.doesNotMatch(lockout, /login_attempts|loginAttempts/)
  })
})

describe('WAL checkpoint after deletions', () => {
  function walDb() {
    const dir = mkdtempSync(join(tmpdir(), 'wal-'))
    const file = join(dir, 't.db')
    const sqlite = new Database(file)
    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('wal_autocheckpoint = 0') // keep the log growing, like a busy server between checkpoints
    initializeDatabase(sqlite)
    return { sqlite, wal: `${file}-wal`, dir }
  }

  it('withdrawing consent truncates the WAL, so the deleted rows are not left in the log file', () => {
    const { sqlite, wal, dir } = walDb()
    try {
      const r = recordVisitorHit(sqlite, { sid: null, vid: null, ip: '203.0.113.77', userAgent: 'UA-MARKER-xyz', browser: 'Chrome', os: 'Windows', device: 'desktop', country: 'DE', city: null, env: { screenW: null, screenH: null, language: null, timezone: null }, utm: {}, referrerUrl: null, referrerHost: null, path: '/' }, NOW)
      assert.ok(r.recorded)
      assert.ok(existsSync(wal) && statSync(wal).size > 0, 'the insert is in the WAL')
      assert.equal(withdrawVisitorRecords(sqlite, { sid: r.sid }), 1)
      assert.equal(statSync(wal).size, 0, 'the WAL file is truncated')
    } finally { sqlite.close(); rmSync(dir, { recursive: true, force: true }) }
  })

  it('nothing deleted, no checkpoint needed; retention ends with a checkpoint step', () => {
    const { sqlite, wal, dir } = walDb()
    try {
      assert.equal(withdrawVisitorRecords(sqlite, { sid: 'a'.repeat(32) }), 0)
      assert.ok(statSync(wal).size > 0)
      assert.deepEqual(runRetentionCleanup(sqlite, 0, () => {}), [])
      assert.equal(statSync(wal).size, 0)
      assert.equal(VISITOR_DELETE_DAYS, 395)
    } finally { sqlite.close(); rmSync(dir, { recursive: true, force: true }) }
  })

  it('a failing checkpoint is logged, not thrown', () => {
    const logged: unknown[] = []
    assert.equal(checkpointWal({ pragma: () => { throw new Error('busy') } } as never, (_m, e) => logged.push(e)), false)
    assert.equal(logged.length, 1)
  })
})
