import assert from 'node:assert/strict'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import {
  DAILY_KEEP_DAYS, SAMPLE_DETAIL_DAYS, SLOT_SECONDS, SLOW_DB_MS, STALE_CONTENT_DAYS, STATUS_CACHE_MS,
  buildPublicStatus, clearPublicStatusCache, computeUptime, deriveComponents, getPublicStatus, overallState,
  pruneStatus, recordStatusSample, rollupStatusDays, runStatusMaintenance,
} from '../../server/utils/siteStatus'
import { listActiveStatusNotices, registerStatusNoticeSource, resetStatusNoticeSources, toPublicNotice } from '../../server/utils/statusNotices'
import { formatPercent, formatStatusTime, worstState } from '../../utils/publicStatus'

const DAY = 86400
const START = 1_800_000_000 - (1_800_000_000 % DAY) // a UTC midnight
const slots = (from: number, count: number, skip: (i: number) => boolean = () => false) => {
  const out: number[] = []
  for (let i = 0; i < count; i++) if (!skip(i)) out.push(from + i * SLOT_SECONDS)
  return out
}

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}
function addSamples(sqlite: Database.Database, list: number[]) {
  const ins = sqlite.prepare('INSERT OR IGNORE INTO status_samples (slot) VALUES (?)')
  for (const s of list) ins.run(s)
}

afterEach(() => { resetStatusNoticeSources(); clearPublicStatusCache() })

describe('state derivation', () => {
  const base = { dbOk: true, dbMs: 3, latestPublishedAt: START - 10 * DAY, now: START }

  it('is operational when everything answers and content is fresh', () => {
    const c = deriveComponents(base)
    assert.deepEqual(c.map(x => [x.id, x.state]), [['website', 'operational'], ['database', 'operational'], ['content', 'operational']])
    assert.equal(overallState(c), 'operational')
    assert.equal(c[2]!.note, `Latest release note: ${new Date((START - 10 * DAY) * 1000).toISOString().slice(0, 10)}`)
  })

  it('degrades on a slow database and on stale content, and is down without a database', () => {
    assert.equal(deriveComponents({ ...base, dbMs: SLOW_DB_MS + 1 })[1]!.state, 'degraded')
    assert.equal(deriveComponents({ ...base, dbMs: SLOW_DB_MS })[1]!.state, 'operational')
    const stale = deriveComponents({ ...base, latestPublishedAt: START - (STALE_CONTENT_DAYS + 1) * DAY })
    assert.equal(stale[2]!.state, 'degraded')
    assert.equal(overallState(stale), 'degraded')
    const down = deriveComponents({ ...base, dbOk: false })
    assert.deepEqual(down.map(x => x.state), ['operational', 'down', 'down'])
    assert.equal(overallState(down), 'down')
  })

  it('treats "no release note yet" as operational, not as an outage', () => {
    const c = deriveComponents({ ...base, latestPublishedAt: null })
    assert.equal(c[2]!.state, 'operational')
    assert.equal(c[2]!.note, 'No release notes published yet')
  })

  it('picks the worst state', () => {
    assert.equal(worstState([]), 'operational')
    assert.equal(worstState(['operational', 'down', 'degraded']), 'down')
  })
})

describe('sampler, roll-up and retention', () => {
  it('records one row per 5-minute slot', () => {
    const sqlite = freshDb()
    assert.equal(recordStatusSample(sqlite, START + 10), true)
    assert.equal(recordStatusSample(sqlite, START + 290), false)
    assert.equal(recordStatusSample(sqlite, START + 300), true)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM status_samples').get() as { n: number }).n, 2)
  })

  it('rolls finished days up once and never the running day', () => {
    const sqlite = freshDb()
    addSamples(sqlite, [...slots(START - DAY + 600, 100), ...slots(START, 10)])
    assert.equal(rollupStatusDays(sqlite, START + 3600), 1)
    assert.equal(rollupStatusDays(sqlite, START + 3600), 0)
    const row = sqlite.prepare('SELECT * FROM status_daily').get() as { day: string, seen: number, first_slot: number }
    assert.deepEqual(row, { day: new Date((START - DAY) * 1000).toISOString().slice(0, 10), seen: 100, first_slot: START - DAY + 600 })
  })

  it('prunes detail after SAMPLE_DETAIL_DAYS and daily rows after DAILY_KEEP_DAYS, keeping rolled totals', () => {
    const sqlite = freshDb()
    const now = START + 3600
    addSamples(sqlite, [START - (SAMPLE_DETAIL_DAYS + 2) * DAY + 100, START - 2 * DAY + 100, START + 100])
    sqlite.prepare("INSERT INTO status_daily (day, seen, first_slot) VALUES (?, 5, 1)").run(new Date((now - (DAILY_KEEP_DAYS + 3) * DAY) * 1000).toISOString().slice(0, 10))
    const out = runStatusMaintenance(sqlite, now)
    assert.equal(out.rolled, 2) // both finished days rolled before the old one is pruned
    assert.equal(out.samples, 1)
    assert.equal(out.days, 1)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM status_samples').get() as { n: number }).n, 2)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM status_daily').get() as { n: number }).n, 2)
    assert.deepEqual(pruneStatus(sqlite, now), { samples: 0, days: 0 })
  })
})

describe('uptime', () => {
  it('says nothing until 24 hours have been observed (no fabricated percentages)', () => {
    const sqlite = freshDb()
    assert.deepEqual(computeUptime(sqlite, START + 600), { ready: false, windows: [], note: computeUptime(sqlite, START).note })
    addSamples(sqlite, slots(START, 100)) // ~8 h
    const u = computeUptime(sqlite, START + 100 * SLOT_SECONDS)
    assert.equal(u.ready, false)
    assert.deepEqual(u.windows, [])
  })

  it('reports 24 h after a day of checks and counts missing slots as downtime, rounded down', () => {
    const sqlite = freshDb()
    const now = START + DAY + 30
    addSamples(sqlite, slots(START, 288 + 1, i => i === 40 || i === 41)) // two missed slots
    const u = computeUptime(sqlite, now)
    assert.equal(u.ready, true)
    assert.deepEqual(u.windows.map(w => w.days), [1])
    assert.equal(u.windows[0]!.percent, 99.30) // 286 / 288 = 99.3055 -> 99.30
    assert.equal(formatPercent(u.windows[0]!.percent), '99.30%')
  })

  it('is exactly 100 only without any gap', () => {
    const sqlite = freshDb()
    addSamples(sqlite, slots(START, 289))
    assert.equal(computeUptime(sqlite, START + DAY + 30).windows[0]!.percent, 100)
  })

  it('merges rolled-up days with raw slots and adds longer windows as the history grows', () => {
    const sqlite = freshDb()
    const first = START - 10 * DAY
    // 10 full days with one day entirely missing (day index 3) + today so far.
    addSamples(sqlite, slots(first, 288 * 10, i => Math.floor(i / 288) === 3))
    addSamples(sqlite, slots(START, 12))
    runStatusMaintenance(sqlite, START + 12 * SLOT_SECONDS + 5)
    const now = START + 12 * SLOT_SECONDS + 5
    const u = computeUptime(sqlite, now)
    assert.deepEqual(u.windows.map(w => w.days), [1, 7])
    const week = u.windows.find(w => w.days === 7)!
    // window: 6 full days before today + today's 12 slots; all present except nothing missing inside the last 7 days
    assert.equal(week.percent, 100)
    sqlite.prepare('DELETE FROM status_daily').run()
    sqlite.prepare('DELETE FROM status_samples').run()
    addSamples(sqlite, slots(first, 288 * 10, i => Math.floor(i / 288) === 7)) // missing day is inside the 7-day window
    const gap = computeUptime(sqlite, START + 5).windows.find(w => w.days === 7)!
    assert.ok(gap.percent < 100 && gap.percent > 80, String(gap.percent))
  })

  it('reaches the 30 and 90 day windows only when that much has been observed', () => {
    const sqlite = freshDb()
    const first = START - 40 * DAY
    sqlite.prepare("INSERT INTO status_daily (day, seen, first_slot) VALUES (?, 288, ?)").run(new Date(first * 1000).toISOString().slice(0, 10), first)
    for (let d = 1; d < 40; d++) sqlite.prepare("INSERT INTO status_daily (day, seen, first_slot) VALUES (?, 288, ?)").run(new Date((first + d * DAY) * 1000).toISOString().slice(0, 10), first + d * DAY)
    const u = computeUptime(sqlite, START + 5)
    assert.deepEqual(u.windows.map(w => w.days), [1, 7, 30])
  })
})

describe('public payload', () => {
  it('builds the whitelisted shape from the database', () => {
    const sqlite = freshDb()
    const status = buildPublicStatus(sqlite, START)
    assert.deepEqual(Object.keys(status).sort(), ['checkedAt', 'components', 'notices', 'status', 'uptime'])
    assert.equal(status.status, 'operational')
    assert.equal(status.checkedAt, new Date(START * 1000).toISOString())
    assert.deepEqual(status.uptime.windows, [])
    assert.equal(formatStatusTime(status.checkedAt), `${status.checkedAt.slice(0, 10)} ${status.checkedAt.slice(11, 16)} UTC`)
  })

  it('reads the newest published release note only', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO changelogs (version, content, is_published, published_at) VALUES ('1.0', 'secret draft text', 0, ?), ('0.9', 'old', 1, ?), ('0.9.5', 'new', 1, ?)").run(START - DAY, START - 30 * DAY, START - 2 * DAY)
    const c = buildPublicStatus(sqlite, START).components.find(x => x.id === 'content')!
    assert.equal(c.note, `Latest release note: ${new Date((START - 2 * DAY) * 1000).toISOString().slice(0, 10)}`)
  })

  it('reports a broken database as down without throwing', () => {
    const sqlite = freshDb()
    const broken = { prepare: (sql: string) => sql.startsWith('SELECT 1') ? { get: () => { throw new Error('boom') } } : sqlite.prepare(sql) }
    const status = buildPublicStatus(broken as unknown as Database.Database, START)
    assert.equal(status.status, 'down')
    assert.equal(status.components.find(c => c.id === 'database')!.state, 'down')
  })

  it('leaks nothing outside the whitelist: no versions, hosts, ports, SHAs, internals', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO changelogs (version, content, is_published, published_at) VALUES ('9.9.9-internal', 'body with 10.0.0.5 and unraid:8080', 1, ?)").run(START - DAY)
    addSamples(sqlite, slots(START - 3 * DAY, 288 * 3 + 1))
    const status = buildPublicStatus(sqlite, START + 30)
    const allowed = {
      top: ['checkedAt', 'components', 'notices', 'status', 'uptime'],
      component: ['id', 'name', 'note', 'state'],
      uptime: ['note', 'ready', 'windows'],
      window: ['days', 'percent'],
    }
    assert.deepEqual(Object.keys(status).sort(), allowed.top)
    for (const c of status.components) assert.deepEqual(Object.keys(c).sort(), allowed.component)
    assert.deepEqual(Object.keys(status.uptime).sort(), allowed.uptime)
    for (const w of status.uptime.windows) assert.deepEqual(Object.keys(w).sort(), allowed.window)
    const json = JSON.stringify(status)
    for (const bad of [/9\.9\.9/, /10\.0\.0\.5/, /unraid/i, /8080/, /sha/i, /docker|container|plex|discord|bot\b/i, /localhost|127\.0\.0\.1|https?:\/\//i, /\b[0-9a-f]{7,40}\b/, /uptimeSeconds|startedAt|build|version|dashboard/i]) {
      assert.doesNotMatch(json, bad, String(bad))
    }
  })

  it('caches for STATUS_CACHE_MS so the database is not hit on every request', () => {
    const sqlite = freshDb()
    let prepares = 0
    const counting = { prepare: (sql: string) => { prepares++; return sqlite.prepare(sql) } } as unknown as Database.Database
    const t = START * 1000
    const a = getPublicStatus(counting, t)
    const used = prepares
    assert.ok(used > 0)
    assert.equal(getPublicStatus(counting, t + STATUS_CACHE_MS - 1), a)
    assert.equal(prepares, used)
    const b = getPublicStatus(counting, t + STATUS_CACHE_MS + 1)
    assert.notEqual(b, a)
    assert.ok(prepares > used)
    clearPublicStatusCache()
    assert.notEqual(getPublicStatus(counting, t + STATUS_CACHE_MS + 2), b)
  })
})

describe('notice extension point (item B)', () => {
  it('shows nothing until a source is registered', () => {
    assert.deepEqual(buildPublicStatus(freshDb(), START).notices, [])
  })

  it('keeps only whitelisted, valid notice fields, newest first, capped', () => {
    registerStatusNoticeSource(() => [
      { id: 'a', kind: 'maintenance', title: 'Planned work', message: 'Short break', startsAt: '2026-10-26T08:00:00Z', endsAt: '2026-10-26T09:00:00Z', adminNote: 'secret', createdBy: 7 },
      { id: 'b', kind: 'incident', title: 'Slow responses', message: 'x'.repeat(2000), startsAt: START },
      { id: 'c', kind: 'weird', title: 'bad kind', startsAt: START },
      { id: 'd', kind: 'incident', title: '', startsAt: START },
      null,
      'nope',
    ])
    registerStatusNoticeSource(() => { throw new Error('broken source') })
    const list = listActiveStatusNotices(START)
    assert.deepEqual(list.map(n => n.id), ['b', 'a'])
    assert.deepEqual(Object.keys(list[1]!).sort(), ['endsAt', 'id', 'kind', 'message', 'startsAt', 'title'])
    assert.equal(list[0]!.message.length, 600)
    assert.equal(list[0]!.endsAt, null)
    assert.equal(buildPublicStatus(freshDb(), START).notices.length, 2)
  })

  it('normalises control characters and rejects malformed input', () => {
    assert.equal(toPublicNotice({ id: 'x', kind: 'incident', title: 'a\nb\u0000c', startsAt: START })!.title, 'a b c')
    assert.equal(toPublicNotice({ id: 'x', kind: 'incident', title: 't', startsAt: 'not a date' }), null)
    assert.equal(toPublicNotice(undefined), null)
  })
})
