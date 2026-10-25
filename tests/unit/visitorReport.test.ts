/** Admin Visitors report: filters, pagination, summary, CSV safety, handler guards and the export audit. */
import assert from 'node:assert/strict'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { createApp, createError, toNodeListener, createRouter, defineEventHandler } from 'h3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { recordAuditChange, AUDIT_TYPES, listAudit } from '../../server/utils/auditLog'
import { handleVisitorDetail, handleVisitorExport, handleVisitorList, activeFilterNames, type VisitorAdminDeps } from '../../server/utils/visitorAdminRequest'
import {
  VISITOR_CSV_COLUMNS, VISITOR_EXPORT_MAX_ROWS, VISITOR_PAGE_SIZE_MAX, parseVisitorFilters, queryVisitorSessions, visitorCsvChunks, visitorDetail,
  visitorFilterOptions, visitorSummary, EMPTY_FILTERS,
} from '../../server/utils/visitorReport'
import { csvCell, csvLine } from '../../utils/csvSafe'
import { countryFlag, countryName } from '../../utils/countryDisplay'

const NOW = 1_800_000_000
const sid = (n: number) => n.toString(16).padStart(32, '0')

function db() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}

interface Seed { n: number, at?: number, vid?: string | null, country?: string, city?: string | null, ref?: string | null, utm?: string | null, landing?: string, ip?: string, ua?: string }
function seed(sqlite: Database.Database, s: Seed) {
  const at = s.at ?? NOW - 3600
  sqlite.prepare(`INSERT INTO visitor_sessions (id, visitor_id, started_at, last_seen, ip, user_agent, browser, os, device, country, city, referrer_url, referrer_host,
    landing_path, exit_path, hits, screen_w, screen_h, language, timezone, utm_source) VALUES (?, ?, ?, ?, ?, ?, 'Firefox', 'Windows', 'desktop', ?, ?, ?, ?, ?, ?, 2, 1920, 1080, 'en-US', 'Europe/Berlin', ?)`)
    .run(sid(s.n), s.vid ?? null, at, at + 120, s.ip ?? '203.0.113.7', s.ua ?? 'UA/1.0', s.country ?? 'DE', s.city ?? null,
      s.ref ? `https://${s.ref}/x` : null, s.ref ?? null, s.landing ?? '/', '/guide', s.utm ?? null)
  sqlite.prepare('INSERT INTO visitor_hits (session_id, path, created_at, dwell_s, scroll_max) VALUES (?, ?, ?, 30, 50)').run(sid(s.n), s.landing ?? '/', at)
  sqlite.prepare('INSERT INTO visitor_hits (session_id, path, created_at, dwell_s, scroll_max) VALUES (?, ?, ?, 20, 100)').run(sid(s.n), '/guide', at + 40)
  sqlite.prepare("INSERT INTO visitor_events (session_id, path, kind, target, created_at) VALUES (?, '/', 'cta', 'hero-setup', ?)").run(sid(s.n), at + 10)
}

describe('csvCell / csvLine', () => {
  it('prefixes formula starters with a quote', () => {
    for (const c of ['=1+1', '+1', '-1', '@SUM(A1)', '\tx', '\rx']) assert.ok(csvCell(c).replace(/^"/, '').startsWith("'"), c)
    assert.equal(csvCell('=HYPERLINK("http://x")'), '"\'=HYPERLINK(""http://x"")"')
  })
  it('quotes commas, quotes and line breaks, and leaves plain text alone', () => {
    assert.equal(csvCell('a,b'), '"a,b"')
    assert.equal(csvCell('say "hi"'), '"say ""hi"""')
    assert.equal(csvCell('a\nb'), '"a\nb"')
    assert.equal(csvCell('plain'), 'plain')
    assert.equal(csvCell(null), '')
    assert.equal(csvCell(undefined), '')
  })
  it('keeps real numbers numeric and ends lines with CRLF', () => {
    assert.equal(csvCell(-5), '-5')
    assert.equal(csvCell(42), '42')
    assert.equal(csvLine(['a', 1, null]), 'a,1,\r\n')
  })
})

describe('country display', () => {
  it('maps codes to flag and name, unknown to a neutral value', () => {
    assert.equal(countryFlag('DE'), '\u{1F1E9}\u{1F1EA}')
    assert.equal(countryFlag('de'), '\u{1F1E9}\u{1F1EA}')
    assert.equal(countryName('DE'), 'Germany')
    assert.equal(countryName('unknown'), 'Unknown')
    assert.equal(countryName('XX'), 'Unknown')
    assert.equal(countryName('T1'), 'Tor network')
    assert.equal(countryFlag('unknown'), '\u{1F3F3}\uFE0F')
  })
})

describe('parseVisitorFilters', () => {
  it('validates every field and never throws', () => {
    const f = parseVisitorFilters({ country: 'de', days: '7', path: '/guide', referrer: ' Google.COM ', utm: 'news', visitor: 'returning' })
    assert.deepEqual(f, { country: 'DE', days: 7, page: '/guide', referrer: 'google.com', utm: 'news', visitor: 'returning' })
    assert.deepEqual(parseVisitorFilters({}), EMPTY_FILTERS)
    const bad = parseVisitorFilters({ country: 'Germany', days: '9999', path: 'guide', visitor: 'x', referrer: 'a'.repeat(500) })
    assert.equal(bad.country, ''); assert.equal(bad.days, EMPTY_FILTERS.days); assert.equal(bad.page, ''); assert.equal(bad.visitor, '')
    assert.equal(bad.referrer.length, 100)
    assert.equal(parseVisitorFilters({ days: '0' }).days, 0)
    assert.equal(parseVisitorFilters({ country: 'unknown' }).country, 'unknown')
    assert.doesNotThrow(() => parseVisitorFilters({ country: ['a'], days: {}, path: 5 } as never))
  })
})

describe('queryVisitorSessions', () => {
  it('lists newest first with derived fields', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, at: NOW - 7200, country: 'DE', city: 'Berlin' })
    seed(sqlite, { n: 2, at: NOW - 3600, country: 'US', utm: 'newsletter' })
    const r = queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, 1, 25, NOW)
    assert.equal(r.total, 2)
    assert.deepEqual(r.rows.map(x => x.id), [sid(2), sid(1)])
    const first = r.rows[1]!
    assert.equal(first.city, 'Berlin')
    assert.equal(first.screen, '1920×1080')
    assert.equal(first.durationS, 120 + 20) // last_seen - started_at + dwell of the last page
    assert.equal(r.rows[0]!.utm, 'newsletter')
  })
  it('filters by country, period, page, referrer and utm', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, country: 'DE', ref: 'news.example.org' })
    seed(sqlite, { n: 2, country: 'US', ref: 'www.google.com', utm: 'spring' })
    seed(sqlite, { n: 3, country: 'DE', at: NOW - 40 * 86400, landing: '/strings' })
    const q = (f: Partial<typeof EMPTY_FILTERS>) => queryVisitorSessions(sqlite, { ...EMPTY_FILTERS, days: 0, ...f }, 1, 25, NOW).rows.map(r => r.id).sort()
    assert.deepEqual(q({}), [sid(1), sid(2), sid(3)])
    assert.deepEqual(q({ country: 'DE' }), [sid(1), sid(3)])
    assert.deepEqual(q({ days: 7 }), [sid(1), sid(2)])
    assert.deepEqual(q({ page: '/strings' }), [sid(3)])
    assert.deepEqual(q({ referrer: 'google' }), [sid(2)])
    assert.deepEqual(q({ utm: 'SPRING' }), [sid(2)])
    assert.deepEqual(q({ country: 'DE', days: 7 }), [sid(1)])
  })
  it('treats % and _ in text filters literally', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, ref: 'a.example' })
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS, days: 0, referrer: '%' }, 1, 25, NOW).total, 0)
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS, days: 0, referrer: '_' }, 1, 25, NOW).total, 0)
  })
  it('separates new from returning visitors via the visitor id', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, at: NOW - 5 * 86400, vid: 'v'.repeat(32) })
    seed(sqlite, { n: 2, at: NOW - 3600, vid: 'v'.repeat(32) })
    seed(sqlite, { n: 3, at: NOW - 1800, vid: 'w'.repeat(32) })
    seed(sqlite, { n: 4, at: NOW - 900, vid: null })
    const q = (visitor: 'new' | 'returning') => queryVisitorSessions(sqlite, { ...EMPTY_FILTERS, days: 0, visitor }, 1, 25, NOW).rows.map(r => r.id).sort()
    assert.deepEqual(q('returning'), [sid(2)])
    assert.deepEqual(q('new'), [sid(1), sid(3), sid(4)])
  })
  it('paginates with a hard page-size cap and clamps the page', () => {
    const sqlite = db()
    for (let i = 1; i <= 30; i++) seed(sqlite, { n: i, at: NOW - i * 60 })
    const p1 = queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, 1, 10, NOW)
    assert.equal(p1.rows.length, 10); assert.equal(p1.pages, 3); assert.equal(p1.total, 30)
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, 3, 10, NOW).rows.length, 10)
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, 99, 10, NOW).page, 3)
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, 1, 100_000, NOW).pageSize, VISITOR_PAGE_SIZE_MAX)
    assert.equal(queryVisitorSessions(sqlite, { ...EMPTY_FILTERS }, -4, 10, NOW).page, 1)
  })
  it('an empty table gives an empty page', () => {
    const r = queryVisitorSessions(db(), { ...EMPTY_FILTERS }, 1, 25, NOW)
    assert.deepEqual([r.total, r.pages, r.rows.length], [0, 1, 0])
  })
})

describe('visitorDetail / options / summary', () => {
  it('returns the page sequence with dwell and scroll plus clicks, and null for unknown or malformed ids', () => {
    const sqlite = db()
    seed(sqlite, { n: 1 })
    const d = visitorDetail(sqlite, sid(1))!
    assert.deepEqual(d.hits.map(h => [h.path, h.dwellS, h.scrollMax]), [['/', 30, 50], ['/guide', 20, 100]])
    assert.deepEqual(d.events.map(e => [e.kind, e.target]), [['cta', 'hero-setup']])
    assert.equal(visitorDetail(sqlite, sid(2)), null)
    assert.equal(visitorDetail(sqlite, "x' OR 1=1 --"), null)
  })
  it('filter options list stored countries and pages', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, country: 'DE' }); seed(sqlite, { n: 2, country: 'DE' }); seed(sqlite, { n: 3, country: 'US' })
    const o = visitorFilterOptions(sqlite)
    assert.deepEqual(o.countries, [{ code: 'DE', sessions: 2 }, { code: 'US', sessions: 1 }])
    assert.ok(o.pages.includes('/guide'))
  })
  it('summary counts consented sessions in the period: top countries and referrer hosts, direct visits left out', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, country: 'DE', ref: 'a.example' }); seed(sqlite, { n: 2, country: 'DE', ref: 'a.example' })
    seed(sqlite, { n: 3, country: 'US', ref: 'b.example' }); seed(sqlite, { n: 4, country: 'FR' })
    seed(sqlite, { n: 5, country: 'JP', at: NOW - 90 * 86400, ref: 'old.example' })
    const s = visitorSummary(sqlite, 30, 5, NOW)
    assert.equal(s.sessions, 4)
    assert.deepEqual(s.countries[0], { code: 'DE', sessions: 2 })
    assert.ok(!s.countries.some(c => c.code === 'JP'))
    assert.deepEqual(s.referrers, [{ name: 'a.example', sessions: 2 }, { name: 'b.example', sessions: 1 }])
  })
})

describe('CSV export', () => {
  const csv = (sqlite: Database.Database, f = { ...EMPTY_FILTERS, days: 0 }) => [...visitorCsvChunks(sqlite, f, NOW)].join('')
  it('starts with the header and has one line per session', () => {
    const sqlite = db()
    seed(sqlite, { n: 1 }); seed(sqlite, { n: 2 })
    const lines = csv(sqlite).trimEnd().split('\r\n')
    assert.equal(lines[0], VISITOR_CSV_COLUMNS.join(','))
    assert.equal(lines.length, 3)
  })
  it('neutralises formula injection in every attacker-controlled cell', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, ua: '=cmd|\' /C calc\'!A0', ref: 'evil.example', city: '+SUM(1)', utm: '@x', landing: '/-1' })
    sqlite.prepare('UPDATE visitor_sessions SET language = ?, referrer_url = ? WHERE id = ?').run('\tlang', '=HYPERLINK("http://e.example")', sid(1))
    const out = csv(sqlite)
    const row = out.split('\r\n')[1]!
    assert.ok(row.includes("'=cmd|"), row)
    assert.ok(row.includes("'+SUM(1)"))
    assert.ok(row.includes("'@x"))
    assert.ok(row.includes("'\tlang"))
    assert.ok(row.includes('"\'=HYPERLINK(""http://e.example"")"'))
    // No cell starts with a bare formula character: split respecting quotes.
    const cells = row.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)!.map(c => c.replace(/,$/, '').replace(/^"/, ''))
    for (const c of cells) assert.ok(!/^[=+\-@\t\r]/.test(c) || /^-?\d+$/.test(c), `unsafe cell: ${c}`)
  })
  it('respects the filters', () => {
    const sqlite = db()
    seed(sqlite, { n: 1, country: 'DE' }); seed(sqlite, { n: 2, country: 'US' })
    assert.equal(csv(sqlite, { ...EMPTY_FILTERS, days: 0, country: 'US' }).trimEnd().split('\r\n').length, 2)
  })
  it(`is capped at ${VISITOR_EXPORT_MAX_ROWS} rows`, () => {
    const sqlite = db()
    const ins = sqlite.prepare("INSERT INTO visitor_sessions (id, started_at, last_seen, landing_path) VALUES (?, ?, ?, '/')")
    sqlite.transaction(() => { for (let i = 0; i < VISITOR_EXPORT_MAX_ROWS + 120; i++) ins.run(sid(i + 1), NOW - 100, NOW - 100) })()
    let rows = -1
    const out = [...visitorCsvChunks(sqlite, { ...EMPTY_FILTERS, days: 0 }, NOW, n => { rows = n })].join('')
    assert.equal(rows, VISITOR_EXPORT_MAX_ROWS)
    assert.equal(out.trimEnd().split('\r\n').length, VISITOR_EXPORT_MAX_ROWS + 1)
  })
})

describe('export audit', () => {
  it('accepts the exported action and visitor_export type without any visitor data', () => {
    assert.ok((AUDIT_TYPES as readonly string[]).includes('visitor_export'))
    const sqlite = db()
    recordAuditChange(sqlite, { action: 'exported', entityType: 'visitor_export', entityName: 'Visitor CSV, 3 rows', before: null, after: { rows: 3, filters: ['country', 'days=30'] }, userId: null })
    const list = listAudit(sqlite, { type: 'visitor_export' })
    assert.equal(list.total, 1)
    assert.equal(list.items[0]!.action, 'exported')
    assert.deepEqual(list.items[0]!.after, { rows: 3, filters: ['country', 'days=30'] })
  })
  it('activeFilterNames lists names only, never values', () => {
    assert.deepEqual(activeFilterNames({ ...EMPTY_FILTERS, country: 'DE', referrer: 'secret.example' }), ['country', 'referrer', 'days=30'])
    assert.ok(!JSON.stringify(activeFilterNames({ ...EMPTY_FILTERS, utm: 'topsecret' })).includes('topsecret'))
  })
})

describe('handlers', () => {
  let server: http.Server | null = null
  afterEach(() => { server?.close(); server = null })

  async function start(sqlite: Database.Database, opts: { admin?: boolean, enabled?: boolean } = {}) {
    const audits: Array<{ userId: number | null, rows: number, filters: string[] }> = []
    const deps: VisitorAdminDeps = {
      requireAdmin: () => {
        if (opts.admin === false) throw createError({ statusCode: 401, message: 'Unauthorized' })
        return { userId: 7 }
      },
      sqlite,
      enabled: () => opts.enabled ?? true,
      audit: e => audits.push(e),
      now: () => NOW,
    }
    const app = createApp()
    const router = createRouter()
    router.get('/api/v1/admin/visitors/export', defineEventHandler(e => handleVisitorExport(e, deps)))
    router.get('/api/v1/admin/visitors/:id', defineEventHandler(e => handleVisitorDetail(e, deps)))
    router.get('/api/v1/admin/visitors', defineEventHandler(e => handleVisitorList(e, deps)))
    app.use(router)
    server = http.createServer(toNodeListener(app))
    await new Promise<void>(r => server!.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`
    return { base, audits }
  }

  it('list: no-store, filters, flag status and empty state data', async () => {
    const sqlite = db()
    const { base } = await start(sqlite, { enabled: false })
    let res = await fetch(`${base}/api/v1/admin/visitors`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('cache-control'), 'no-store')
    let body = await res.json() as { data: { total: number, enabled: boolean, storedSessions: number } }
    assert.deepEqual([body.data.total, body.data.enabled, body.data.storedSessions], [0, false, 0])
    seed(sqlite, { n: 1, country: 'DE' }); seed(sqlite, { n: 2, country: 'US' })
    res = await fetch(`${base}/api/v1/admin/visitors?country=US&days=30`)
    body = await res.json() as typeof body
    assert.equal(body.data.total, 1)
    assert.equal(body.data.storedSessions, 2)
  })

  it('every handler refuses without admin access, before touching data', async () => {
    const sqlite = db()
    seed(sqlite, { n: 1 })
    const { base, audits } = await start(sqlite, { admin: false })
    for (const path of ['/api/v1/admin/visitors', `/api/v1/admin/visitors/${sid(1)}`, '/api/v1/admin/visitors/export']) {
      const res = await fetch(base + path)
      assert.equal(res.status, 401, path)
      assert.ok(!(await res.text()).includes('203.0.113.7'), path)
    }
    assert.equal(audits.length, 0)
  })

  it('detail: 404 for an unknown session, no-store', async () => {
    const sqlite = db()
    seed(sqlite, { n: 1 })
    const { base } = await start(sqlite)
    const ok = await fetch(`${base}/api/v1/admin/visitors/${sid(1)}`)
    assert.equal(ok.status, 200); assert.equal(ok.headers.get('cache-control'), 'no-store')
    assert.equal((await fetch(`${base}/api/v1/admin/visitors/${sid(9)}`)).status, 404)
    assert.equal((await fetch(`${base}/api/v1/admin/visitors/..%2f..%2fetc`)).status, 404)
  })

  it('export: CSV headers, no-store, audit entry with counts and filter names only', async () => {
    const sqlite = db()
    seed(sqlite, { n: 1, country: 'DE' }); seed(sqlite, { n: 2, country: 'US', ua: '=evil()' })
    const { base, audits } = await start(sqlite)
    const res = await fetch(`${base}/api/v1/admin/visitors/export?country=US&days=30`)
    assert.equal(res.status, 200)
    assert.equal(res.headers.get('cache-control'), 'no-store')
    assert.match(res.headers.get('content-type') || '', /^text\/csv/)
    assert.match(res.headers.get('content-disposition') || '', /^attachment; filename="visitors-\d{4}-\d{2}-\d{2}\.csv"$/)
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff')
    const bytes = new Uint8Array(await res.arrayBuffer())
    assert.deepEqual([...bytes.slice(0, 3)], [0xEF, 0xBB, 0xBF]) // UTF-8 BOM for Excel
    const body = new TextDecoder().decode(bytes)
    assert.ok(body.startsWith(VISITOR_CSV_COLUMNS.join(',')))
    assert.ok(body.includes("'=evil()"))
    assert.equal(body.trimEnd().split('\r\n').length, 2)
    assert.deepEqual(audits, [{ userId: 7, rows: 1, filters: ['country', 'days=30'] }])
  })
})
