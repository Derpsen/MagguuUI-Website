import assert from 'node:assert/strict'
import { readdirSync } from 'node:fs'
import { describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { initializeDatabase } from '../../server/database/bootstrap'
import {
  AGGREGATE_DAYS, RAW_DETAIL_DAYS, anonymousKey, coarseIp, createSaltKeeper, isCopyTarget, isoDay, pruneDetail,
  recordCopy, recordView, referrerHost, rollupCompletedDays, runAnalyticsMaintenance, scrubLegacyIdentifiers,
  trafficReport, visitorHash,
} from '../../server/utils/analytics'
import { TRACKED_ROUTES, isBotUserAgent, isOptedOut, normalizeTrackedPath, parseCopyTarget } from '../../utils/trackingRules'

const DAY = 86400
const NOW = 1_800_000_000 + 3600 // 2027-01-15 09:00 UTC
const TODAY = Math.floor(NOW / DAY) * DAY

function freshDb() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}
const view = (path: string, visitor: string, at: number) =>
  ({ path, referrer: null, device: 'desktop', browser: 'Firefox', os: 'Linux', visitor, at })

function addView(sqlite: Database.Database, v: ReturnType<typeof view>) {
  recordView(sqlite, v, v.at)
}

describe('visitor hash and salt rotation', () => {
  const salts = [Buffer.from('a'.repeat(32)), Buffer.from('b'.repeat(32)), Buffer.from('c'.repeat(32))]
  const input = { ip: '203.0.113.77', browser: 'Firefox', os: 'Linux', device: 'desktop' }

  it('coarsens IPv4 to /24 and IPv6 to /48', () => {
    assert.equal(coarseIp('203.0.113.77'), '203.0.113.0')
    assert.equal(coarseIp('::ffff:198.51.100.9'), '198.51.100.0')
    assert.equal(coarseIp('2001:db8:1234:5678:9abc:def0:1234:5678'), '2001:db8:1234::/48')
    assert.equal(coarseIp('2001:db8::1'), '2001:db8:0::/48')
    assert.equal(coarseIp('unknown'), 'unknown')
  })

  it('is stable within a day and for the same /24, different for another browser', () => {
    const s = salts[0]!
    const a = visitorHash(s, input)
    assert.equal(a, visitorHash(s, { ...input, ip: '203.0.113.200' }))
    assert.notEqual(a, visitorHash(s, { ...input, browser: 'Chrome' }))
    assert.notEqual(a, visitorHash(s, { ...input, ip: '203.0.114.1' }))
    assert.match(a, /^[0-9a-f]{16}$/)
    assert.ok(!a.includes('203'))
  })

  it('rotates the in-memory salt every UTC day so hashes cannot be linked across days', () => {
    let n = 0
    const keeper = createSaltKeeper(() => salts[n++ % salts.length]!)
    const day1 = keeper.get(TODAY * 1000 + 1000)
    assert.equal(keeper.get(TODAY * 1000 + 80_000_000), day1) // same UTC day: same salt
    const day2 = keeper.get((TODAY + DAY) * 1000 + 1000)
    assert.notEqual(day2, day1)
    assert.notEqual(visitorHash(day1, input), visitorHash(day2, input))
    assert.notEqual(anonymousKey(day1, '203.0.113.77'), anonymousKey(day2, '203.0.113.77'))
    assert.ok(!anonymousKey(day1, '203.0.113.77').includes('203.0.113'))
  })
})

describe('request rules', () => {
  it('skips Do-Not-Track and Global Privacy Control', () => {
    assert.equal(isOptedOut({ dnt: '1' }), true)
    assert.equal(isOptedOut({ gpc: '1' }), true)
    assert.equal(isOptedOut({ dnt: '0', gpc: null }), false)
    assert.equal(isOptedOut({}), false)
  })

  it('recognises bots and automation by a simple user-agent check', () => {
    const real = [
      'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    ]
    for (const ua of real) assert.equal(isBotUserAgent(ua), false, ua)
    for (const ua of ['', 'curl/8.5.0', 'Googlebot/2.1', 'Mozilla/5.0 HeadlessChrome/130.0 Safari/537.36', 'Mozilla/5.0 (compatible; Lighthouse)', 'python-requests/2.31', 'UptimeRobot/2.0 monitor']) {
      assert.equal(isBotUserAgent(ua), true, ua)
    }
  })

  it('only counts known public routes, without query, hash or trailing slash', () => {
    assert.equal(normalizeTrackedPath('/strings?x=1#a'), '/strings')
    assert.equal(normalizeTrackedPath('/faq/'), '/faq')
    assert.equal(normalizeTrackedPath('/'), '/')
    for (const bad of ['/admin', '/admin/login', '/api/v1/x', '/nope', 'strings', '', '/strings/extra', `/${'a'.repeat(400)}`, 5, null, undefined]) {
      assert.equal(normalizeTrackedPath(bad), null, String(bad))
    }
  })

  it('keeps the allowlist in step with the public pages', () => {
    const pages = readdirSync(new URL('../../pages', import.meta.url), { withFileTypes: true })
      .filter(e => e.isFile() && e.name.endsWith('.vue'))
      .map(e => e.name === 'index.vue' ? '/' : `/${e.name.replace(/\.vue$/, '')}`)
      .sort()
    assert.deepEqual([...TRACKED_ROUTES].sort(), pages)
  })

  it('validates the copy target payload', () => {
    assert.deepEqual(parseCopyTarget('profile', 5), { type: 'profile', id: 5 })
    for (const [t, i] of [['other', 1], ['profile', 0], ['profile', -1], ['profile', 1.5], ['profile', '1'], ['wowup', Number.NaN], [null, 1], ['layout', 3e9]] as const) {
      assert.equal(parseCopyTarget(t, i), null, `${t}/${i}`)
    }
  })

  it('keeps only a foreign referrer host', () => {
    assert.equal(referrerHost('https://www.google.com/search?q=x', 'ui.magguu.xyz'), 'www.google.com')
    assert.equal(referrerHost('google.com', 'ui.magguu.xyz'), 'google.com')
    assert.equal(referrerHost('https://ui.magguu.xyz/strings', 'ui.magguu.xyz:443'), null)
    assert.equal(referrerHost('http://localhost:3000/', 'x'), null)
    assert.equal(referrerHost('javascript:alert(1)', 'x'), null)
    assert.equal(referrerHost(42, 'x'), null)
  })
})

describe('storage: no identifiers, published copy targets only', () => {
  it('stores views and copies without IP or user agent', () => {
    const sqlite = freshDb()
    recordView(sqlite, { path: '/strings', referrer: 'example.org', device: 'desktop', browser: 'Firefox', os: 'Linux', visitor: 'abc' }, NOW)
    recordCopy(sqlite, 'profile', 1, NOW)
    const v = sqlite.prepare('SELECT * FROM page_views').get() as Record<string, unknown>
    assert.equal(v.ip, null)
    assert.equal(v.user_agent, null)
    assert.equal(v.visitor, 'abc')
    const c = sqlite.prepare('SELECT * FROM copy_events').get() as Record<string, unknown>
    assert.equal(c.ip, null)
    assert.deepEqual(Object.keys(c).sort(), ['created_at', 'id', 'ip', 'string_id', 'string_type'])
  })

  it('accepts only published, existing copy targets', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO profiles (id, addon, profile, string, is_visible) VALUES (1, 'A', 'P', 's', 1), (2, 'B', 'Q', 's', 0)").run()
    sqlite.prepare("INSERT INTO wowup_strings (id, name, string, is_visible) VALUES (3, 'Required', 's', 1)").run()
    assert.equal(isCopyTarget(sqlite, 'profile', 1), true)
    assert.equal(isCopyTarget(sqlite, 'profile', 2), false)
    assert.equal(isCopyTarget(sqlite, 'profile', 99), false)
    assert.equal(isCopyTarget(sqlite, 'wowup', 3), true)
    assert.equal(isCopyTarget(sqlite, 'layout', 3), false)
  })
})

describe('daily roll-up and report', () => {
  it('the copied list breaks ties by newest numeric id, so a new item is never cut off behind 20 older ones (flaky "copy click is counted")', () => {
    const sqlite = freshDb()
    for (let id = 1; id <= 120; id++) {
      sqlite.prepare("INSERT INTO profiles (id, addon, profile, string) VALUES (?, 'Plater', ?, 's')").run(id, `P${id}`)
      recordCopy(sqlite, 'profile', id, TODAY + 10)
    }
    const r = trafficReport(sqlite, 7, NOW)
    assert.equal(r.copied.length, 20)
    assert.deepEqual(r.copied.slice(0, 3).map(c => c.id), [120, 119, 118]) // string order would have put 100, 101, 102 first
  })
  it('rolls finished days up once, idempotently, and reports routes, copies and uniques', () => {
    const sqlite = freshDb()
    sqlite.prepare("INSERT INTO profiles (id, addon, profile, string) VALUES (7, 'Plater', 'Main', 's')").run()
    const y = TODAY - DAY + 100
    addView(sqlite, view('/strings', 'a', y)); addView(sqlite, view('/strings', 'a', y + 5))
    addView(sqlite, view('/strings', 'b', y + 9)); addView(sqlite, view('/faq', 'a', y + 10))
    addView(sqlite, view('/strings', 'c', TODAY + 50)) // today: counted live, not rolled up yet
    recordCopy(sqlite, 'profile', 7, y); recordCopy(sqlite, 'profile', 7, TODAY + 5); recordCopy(sqlite, 'wowup', 99, TODAY + 6)

    assert.equal(rollupCompletedDays(sqlite, NOW), 2) // one view day + one copy day
    assert.equal(rollupCompletedDays(sqlite, NOW), 0)
    const before = JSON.stringify(sqlite.prepare('SELECT * FROM stats_daily ORDER BY day, kind, key').all())

    const r = trafficReport(sqlite, 7, NOW)
    assert.equal(JSON.stringify(sqlite.prepare('SELECT * FROM stats_daily ORDER BY day, kind, key').all()), before) // today is never persisted early
    assert.equal(r.totals.views, 5)
    assert.equal(r.totals.visitors, 3) // daily uniques summed: yesterday a, b (2) + today c (1)
    assert.equal(r.totals.copies, 3)
    assert.equal(r.perDay.length, 7)
    assert.equal(r.perDay.at(-1)!.day, isoDay(NOW))
    assert.deepEqual(r.routes[0], { path: '/strings', views: 4, visitors: 3 })
    assert.deepEqual(r.routes[1], { path: '/faq', views: 1, visitors: 1 })
    assert.deepEqual(r.copied[0], { type: 'profile', id: 7, name: 'Plater - Main', copies: 2 })
    assert.equal(r.copied[1]!.name, 'wowup #99')
    assert.equal(r.devices[0]!.name, 'desktop')
    assert.equal(r.browsers[0]!.views, 5)

    assert.equal(trafficReport(sqlite, 7, NOW - 3600 * 12).days, 7)
    assert.equal(trafficReport(sqlite, 7, NOW).totals.views, 5) // second call identical
  })

  it('limits the range and keeps empty days in the series', () => {
    const sqlite = freshDb()
    const r = trafficReport(sqlite, 30, NOW)
    assert.equal(r.perDay.length, 30)
    assert.equal(r.totals.views, 0)
    assert.equal(trafficReport(sqlite, 100000, NOW).days, AGGREGATE_DAYS)
  })

  it('lists legacy paths per allowlisted route only (query stripped, admin and unknown paths left out)', () => {
    const sqlite = freshDb()
    const d = TODAY - DAY + 10
    const ins = sqlite.prepare('INSERT INTO page_views (path, ip, created_at) VALUES (?, ?, ?)')
    for (const path of ['/strings?tab=1', '/strings', '/faq/', '/admin/users', '/nope']) ins.run(path, '1.1.1.1', d)
    rollupCompletedDays(sqlite, NOW)
    const r = trafficReport(sqlite, 7, NOW)
    assert.deepEqual(r.routes.map(x => [x.path, x.views]), [['/strings', 2], ['/faq', 1]])
    assert.equal(r.totals.views, 5)
  })

  it('counts legacy rows by distinct IP before scrubbing, then removes the identifiers', () => {
    const sqlite = freshDb()
    const old = sqlite.prepare("INSERT INTO page_views (path, ip, user_agent, created_at) VALUES ('/', ?, 'Mozilla/5.0', ?)")
    const d = TODAY - 2 * DAY + 10
    old.run('1.1.1.1', d); old.run('1.1.1.1', d + 1); old.run('2.2.2.2', d + 2); old.run('unknown', d + 3)
    sqlite.prepare("INSERT INTO copy_events (string_type, string_id, ip, created_at) VALUES ('profile', 1, '9.9.9.9', ?)").run(d)

    const out = runAnalyticsMaintenance(sqlite, NOW)
    assert.ok(out.scrubbed >= 5)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM page_views WHERE ip IS NOT NULL OR user_agent IS NOT NULL').get() as { n: number }).n, 0)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM copy_events WHERE ip IS NOT NULL').get() as { n: number }).n, 0)
    const site = sqlite.prepare("SELECT views, uniques FROM stats_daily WHERE kind = 'site'").get() as { views: number, uniques: number }
    assert.deepEqual(site, { views: 4, uniques: 2 })
    assert.equal(scrubLegacyIdentifiers(sqlite), 0) // idempotent
    assert.equal(runAnalyticsMaintenance(sqlite, NOW).rolled, 0)
    assert.equal((sqlite.prepare("SELECT uniques FROM stats_daily WHERE kind = 'site'").get() as { uniques: number }).uniques, 2)
  })
})

describe('retention', () => {
  it('prunes detail rows after RAW_DETAIL_DAYS whole days, keeps the aggregates, drops very old aggregates', () => {
    const sqlite = freshDb()
    const oldDay = TODAY - (RAW_DETAIL_DAYS + 3) * DAY + 100
    const edgeDay = TODAY - RAW_DETAIL_DAYS * DAY + 100 // still kept (cutoff is the start of that day)
    const recent = TODAY - 2 * DAY + 100
    for (const at of [oldDay, edgeDay, recent, TODAY + 10]) addView(sqlite, view('/guide', 'v', at))
    recordCopy(sqlite, 'wowup', 1, oldDay); recordCopy(sqlite, 'wowup', 1, recent)
    sqlite.prepare("INSERT INTO stats_daily (day, kind, key, views, uniques) VALUES (?, 'site', '', 1, 1)").run(isoDay(TODAY - (AGGREGATE_DAYS + 5) * DAY))

    const gone = pruneDetail(sqlite, NOW)
    assert.equal(gone.views, 1)
    assert.equal(gone.copies, 1)
    assert.equal(gone.aggregates, 1)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM page_views').get() as { n: number }).n, 3)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM copy_events').get() as { n: number }).n, 1)
    // The pruned day was rolled up first, so its totals survive.
    const kept = sqlite.prepare("SELECT views FROM stats_daily WHERE kind = 'site' AND day = ?").get(isoDay(oldDay)) as { views: number } | undefined
    assert.equal(kept?.views, 1)
    assert.equal(trafficReport(sqlite, 90, NOW).totals.views, 4)
  })
})
