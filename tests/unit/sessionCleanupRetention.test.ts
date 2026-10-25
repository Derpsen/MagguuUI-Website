/**
 * The scheduled cleanup (server/plugins/session-cleanup.ts) as a whole, against a real schema: the 13-month visitor log
 * deletion, the 23-hour sign-in identifiers and the vitals cutoff all run, in the plugin's order, even when a later
 * housekeeping step blows up, and a failing step never stops the others.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { retentionSteps, runRetentionCleanup, walCheckpointStep } from '../../server/utils/retentionCleanup'
import { VISITOR_DELETE_DAYS } from '../../server/utils/visitorLog'

const DAY = 86400
const now = () => Math.floor(Date.now() / 1000)

function seeded() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  const t = now()
  const session = (id: string, lastSeen: number) => {
    sqlite.prepare("INSERT INTO visitor_sessions (id, started_at, last_seen, ip, user_agent, landing_path) VALUES (?, ?, ?, '203.0.113.7', 'UA', '/')").run(id, lastSeen, lastSeen)
    sqlite.prepare("INSERT INTO visitor_hits (session_id, path, created_at) VALUES (?, '/', ?)").run(id, lastSeen)
  }
  session('a'.repeat(32), t - (VISITOR_DELETE_DAYS + 1) * DAY) // 13 months and a day: goes
  session('b'.repeat(32), t - (VISITOR_DELETE_DAYS - 1) * DAY) // just under 13 months: stays, in full
  sqlite.prepare("INSERT INTO login_attempts (username, ip_address, user_agent, success, created_at) VALUES ('admin', '198.51.100.9', 'UA', 0, ?)").run(t - 25 * 3600)
  sqlite.prepare("INSERT INTO login_attempts (username, ip_address, user_agent, success, created_at) VALUES ('admin', '198.51.100.9', 'UA', 0, ?)").run(t - 3600)
  sqlite.prepare("INSERT INTO web_vitals (path, metric, value, created_at) VALUES ('/', 'LCP', 1, ?)").run(t - 100 * DAY)
  sqlite.prepare("INSERT INTO web_vitals (path, metric, value, created_at) VALUES ('/', 'LCP', 1, ?)").run(t - 10 * DAY)
  return sqlite
}

describe('the scheduled retention run', () => {
  it('step order is fixed: aggregates, visitor log (13 months), sign-in identifiers, vitals, revisions, then the WAL', () => {
    const sqlite = new Database(':memory:')
    assert.deepEqual(retentionSteps(sqlite, 0).map(s => s.name), [
      'analytics maintenance', 'visitor log retention', 'login attempt identifiers', 'web vitals retention', 'content revisions',
    ])
    assert.equal(walCheckpointStep(sqlite).name, 'wal checkpoint')
  })

  it('deletes the visitor log after 13 months, scrubs sign-in identifiers after 23 h and honours the vitals cutoff', () => {
    const sqlite = seeded()
    const cutoff = now() - 90 * DAY
    const failed = runRetentionCleanup(sqlite, cutoff, undefined, [...retentionSteps(sqlite, cutoff)])
    assert.deepEqual(failed, [])
    assert.deepEqual(sqlite.prepare('SELECT id FROM visitor_sessions').all().map(r => (r as { id: string }).id[0]), ['b'])
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_hits').get() as { n: number }).n, 1)
    assert.equal((sqlite.prepare("SELECT ip, user_agent FROM visitor_sessions").get() as { ip: string }).ip, '203.0.113.7', 'no earlier shortening')
    const attempts = sqlite.prepare('SELECT ip_address AS ip, user_agent AS ua FROM login_attempts ORDER BY id').all()
    assert.deepEqual(attempts, [{ ip: null, ua: null }, { ip: '198.51.100.9', ua: 'UA' }])
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM web_vitals').get() as { n: number }).n, 1)
  })

  it('a failing housekeeping step, placed after the retention steps like in the plugin, does not undo or skip them; each step is isolated', () => {
    const sqlite = seeded()
    const cutoff = now() - 90 * DAY
    const ran: string[] = []
    const failed = runRetentionCleanup(sqlite, cutoff, () => {}, [
      ...retentionSteps(sqlite, cutoff).map(s => ({ name: s.name, run: () => { ran.push(s.name); return s.run() } })),
      { name: 'expired sessions', run: () => { throw new Error('boom') } },
      { name: 'rate limits', run: () => { ran.push('rate limits') } },
      walCheckpointStep(sqlite),
    ])
    assert.deepEqual(failed, ['expired sessions'])
    assert.ok(ran.indexOf('visitor log retention') < ran.indexOf('rate limits'))
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_sessions').get() as { n: number }).n, 1)
  })

  it('one broken retention step (here: no table) does not keep the visitor log from being pruned', () => {
    const sqlite = seeded()
    sqlite.exec('DROP TABLE web_vitals')
    const cutoff = now() - 90 * DAY
    const failed = runRetentionCleanup(sqlite, cutoff, () => {}, [...retentionSteps(sqlite, cutoff)])
    assert.deepEqual(failed, ['web vitals retention'])
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_sessions').get() as { n: number }).n, 1)
    assert.equal((sqlite.prepare('SELECT ip_address FROM login_attempts WHERE created_at < ?').get(now() - 24 * 3600) as { ip_address: string | null }).ip_address, null)
  })

  it('the plugin keeps the same wiring: retention first, 30-minute interval, a thrown error for failed steps', () => {
    const src = readFileSync(new URL('../../server/plugins/session-cleanup.ts', import.meta.url), 'utf8')
    assert.match(src, /30 \* 60 \* 1000/)
    assert.match(src, /throw new Error\(`retention steps failed/)
    assert.ok(src.indexOf('...retentionSteps(sqlite, cutoff)') < src.indexOf("name: 'old login attempts'"))
  })
})

describe('login thresholds (backoff, not lockout)', () => {
  it('are pinned: IP 5 free failures, account 10; 30 s doubling to 15 min; reset after one quiet hour', async () => {
    const { LOGIN_ACCOUNT_BACKOFF, LOGIN_IP_BACKOFF } = await import('../../server/utils/loginBackoff')
    assert.deepEqual(LOGIN_IP_BACKOFF, { freeFailures: 5, baseMs: 30_000, maxMs: 900_000, resetAfterMs: 3_600_000 })
    assert.deepEqual(LOGIN_ACCOUNT_BACKOFF, { freeFailures: 10, baseMs: 30_000, maxMs: 900_000, resetAfterMs: 3_600_000 })
  })
  it('the setting defaults and the login route use them', async () => {
    const { SITE_SETTINGS_DEFAULTS } = await import('../../utils/siteSettingsDefaults')
    assert.equal(SITE_SETTINGS_DEFAULTS.max_login_attempts, '10')
    assert.equal(SITE_SETTINGS_DEFAULTS.lockout_duration_minutes, '30')
    const route = readFileSync(new URL('../../server/api/v1/auth/login.post.ts', import.meta.url), 'utf8')
    assert.match(route, /recordLoginFailure\(ipThrottleKey, LOGIN_IP_BACKOFF\)/)
    assert.match(route, /\.\.\.LOGIN_ACCOUNT_BACKOFF,\s*freeFailures: getMaxLoginAttempts\(\)/)
  })
})

describe('consent routes are wired to withdrawVisitorRecords', () => {
  for (const route of ['consent.post.ts', 'visitor-hit.post.ts']) {
    it(route, () => {
      const src = readFileSync(new URL(`../../server/api/v1/${route}`, import.meta.url), 'utf8')
      assert.match(src, /import \{[^}]*withdrawVisitorRecords[^}]*\} from '~\/server\/utils\/visitorLog'/)
      assert.match(src, /deleteRecords: ids => withdrawVisitorRecords\(sqlite, ids\)/)
      assert.doesNotMatch(src, /deleteRecords: ids => deleteVisitorRecords/)
    })
  }
})
