/**
 * Consent cookie, consent-gated visitor log, retention and the two request flows.
 * Real h3 app on a loopback port, in-memory database (same approach as requestDefences.test.ts).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import http, { IncomingMessage, ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { Socket } from 'node:net'
import { afterEach, describe, it } from 'node:test'
import Database from 'better-sqlite3'
import { createApp, createEvent, defineEventHandler, toNodeListener, type H3Event } from 'h3'
import { initializeDatabase } from '../../server/database/bootstrap'
import { anonymousRateKey, createSaltKeeper } from '../../server/utils/analytics'
import { runBeaconGate } from '../../server/utils/beaconGateCore'
import { getClientCity, getClientCountry, requestIsHttps } from '../../server/utils/clientIp'
import { handleConsentChange, handleVisitorEvent, handleVisitorHit, type VisitorEventDeps, type VisitorHitDeps } from '../../server/utils/consentRequest'
import {
  VISITOR_DELETE_DAYS, VISITOR_EVENTS_PER_SESSION, VISITOR_HITS_PER_DAY, VISITOR_HITS_PER_IP_DAY, VISITOR_HITS_PER_SESSION, VISITOR_SESSIONS_PER_DAY, VISITOR_SESSIONS_PER_IP_DAY,
  deleteVisitorRecords, deleteVisitorSession, listVisitorSessions, pruneVisitorRecords, recordVisitorEvent, recordVisitorHit, sessionEvents, sessionHits,
  type VisitorHitInput,
} from '../../server/utils/visitorLog'
import {
  CTA_IDS, DOWNLOAD_EXTENSIONS, classifyClick, cleanDwell, cleanEnv, cleanText, pickUtm, scrollMilestone, validClick,
} from '../../utils/visitorSignals'
import {
  CONSENT_COOKIE, CONSENT_MAX_AGE_MS, SESSION_COOKIE, VISITOR_COOKIE, VISITOR_MAX_AGE_S, cleanReferrerUrl, consentFromCookieHeader, consentValue, isValidSessionId, parseConsent, visitorLogEnabled,
} from '../../utils/consent'

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
const NOW = 1_800_000_000 // seconds
const DAY = 86400

function db() {
  const sqlite = new Database(':memory:')
  initializeDatabase(sqlite)
  return sqlite
}
function hit(over: Partial<VisitorHitInput> = {}): VisitorHitInput {
  return {
    sid: null, vid: null, ip: '203.0.113.77', userAgent: UA, browser: 'Chrome', os: 'Windows', device: 'desktop', country: 'DE', city: null,
    env: { screenW: null, screenH: null, language: null, timezone: null }, utm: {},
    referrerUrl: 'https://example.org/post?id=1', referrerHost: 'example.org', path: '/', ...over,
  }
}
const count = (sqlite: Database.Database, table: string) => (sqlite.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n

// ─── cookie ────────────────────────────────────────────────────────────

describe('consent cookie', () => {
  const now = 1_800_000_000_000
  it('round-trips exactly what we write, URL-encoded or not', () => {
    const v = consentValue(true, now)
    assert.deepEqual(parseConsent(v, now), { v: 1, stats: true, ts: now })
    assert.deepEqual(parseConsent(encodeURIComponent(v), now), { v: 1, stats: true, ts: now })
    assert.deepEqual(parseConsent(consentValue(false, now), now), { v: 1, stats: false, ts: now })
  })
  it('holds only v, stats and ts (no identifier)', () => {
    assert.deepEqual(Object.keys(JSON.parse(consentValue(true, now))).sort(), ['stats', 'ts', 'v'])
  })
  it('rejects everything else', () => {
    const bad = [
      undefined, null, 42, '', 'x'.repeat(201), 'not json', '[]', '{}', 'null',
      JSON.stringify({ v: 2, stats: true, ts: now }),
      JSON.stringify({ v: 1, stats: 'true', ts: now }),
      JSON.stringify({ v: 1, stats: 1, ts: now }),
      JSON.stringify({ v: 1, stats: true, ts: 'now' }),
      JSON.stringify({ v: 1, stats: true }),
      JSON.stringify({ v: 1, stats: true, ts: now, id: 'abc' }),
      JSON.stringify({ v: 1, stats: true, ts: now + 2 * 86_400_000 }),
      JSON.stringify({ v: 1, stats: true, ts: now - CONSENT_MAX_AGE_MS - 1 }),
      '%7Bbroken',
    ]
    for (const raw of bad) assert.equal(parseConsent(raw, now), null, String(raw))
  })
  it('the lifetime is six months with a few days of slack, not more', () => {
    assert.ok(parseConsent(consentValue(true, now - 183 * 86_400_000), now))
    assert.equal(parseConsent(consentValue(true, now - 200 * 86_400_000), now), null)
  })
  it('is read out of a document.cookie string', () => {
    const header = `a=1; ${CONSENT_COOKIE}=${encodeURIComponent(consentValue(true, now))}; b=2`
    assert.equal(consentFromCookieHeader(header, now)?.stats, true)
    assert.equal(consentFromCookieHeader('a=1; b=2', now), null)
    assert.equal(consentFromCookieHeader(`x${CONSENT_COOKIE}=1`, now), null)
    assert.equal(consentFromCookieHeader(null, now), null)
  })
  it('session ids are 32 lowercase hex characters', () => {
    assert.ok(isValidSessionId('0123456789abcdef0123456789abcdef'))
    for (const v of ['', 'ABCDEF0123456789ABCDEF0123456789', '0123456789abcdef', '0123456789abcdef0123456789abcdeg', null, 5]) assert.equal(isValidSessionId(v), false)
  })
  it('the flag is off unless set to 1 or true', () => {
    assert.equal(visitorLogEnabled(undefined), false)
    assert.equal(visitorLogEnabled(''), false)
    assert.equal(visitorLogEnabled('0'), false)
    assert.equal(visitorLogEnabled('false'), false)
    assert.equal(visitorLogEnabled('1'), true)
    assert.equal(visitorLogEnabled('true'), true)
  })
  it('referrer URLs: http(s) only, no fragment, capped, host extracted', () => {
    assert.deepEqual(cleanReferrerUrl('https://Example.org/a?b=1#frag'), { url: 'https://example.org/a?b=1', host: 'example.org' })
    assert.equal(cleanReferrerUrl('javascript:alert(1)'), null)
    assert.equal(cleanReferrerUrl('ftp://example.org/'), null)
    assert.equal(cleanReferrerUrl('nonsense'), null)
    assert.equal(cleanReferrerUrl(''), null)
    assert.equal(cleanReferrerUrl(`https://example.org/${'a'.repeat(3000)}`), null)
    assert.equal(cleanReferrerUrl(`https://example.org/${'a'.repeat(900)}`)?.url.length, 500)
  })
})

// ─── storage, caps, retention ──────────────────────────────────────────

describe('visitor log storage', () => {
  it('tables are created idempotently, also on top of an existing database', () => {
    const sqlite = db()
    initializeDatabase(sqlite)
    initializeDatabase(sqlite)
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
    // A database from before this feature has neither table; the bootstrap only adds them.
    const old = new Database(':memory:')
    old.exec('CREATE TABLE page_views (id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, referrer TEXT, device TEXT, browser TEXT, os TEXT, ip TEXT, user_agent TEXT, created_at INTEGER NOT NULL DEFAULT (unixepoch()))')
    old.prepare("INSERT INTO page_views (path) VALUES ('/')").run()
    initializeDatabase(old)
    assert.equal(count(old, 'visitor_hits'), 0)
    assert.equal(count(old, 'page_views'), 1)
  })

  it('a first hit creates a session with the full record; the next one joins it', () => {
    const sqlite = db()
    const first = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(first.recorded && first.created)
    assert.ok(isValidSessionId(first.sid))
    const second = recordVisitorHit(sqlite, hit({ sid: first.sid, path: '/strings', referrerUrl: null }), NOW + 60)
    assert.ok(second.recorded && !second.created)
    assert.equal(second.sid, first.sid)
    const [s] = listVisitorSessions(sqlite)
    assert.equal(s?.ip, '203.0.113.77')
    assert.equal(s?.userAgent, UA)
    assert.equal(s?.browser, 'Chrome')
    assert.equal(s?.os, 'Windows')
    assert.equal(s?.device, 'desktop')
    assert.equal(s?.country, 'DE')
    assert.equal(s?.referrerUrl, 'https://example.org/post?id=1')
    assert.equal(s?.referrerHost, 'example.org')
    assert.equal(s?.landingPath, '/')
    assert.equal(s?.hits, 2)
    assert.deepEqual(sessionHits(sqlite, first.sid).map(h => h.path), ['/', '/strings'])
  })

  it('a client-chosen or unknown session id never creates a row under that id', () => {
    const sqlite = db()
    const forged = 'ab'.repeat(16)
    const r = recordVisitorHit(sqlite, hit({ sid: forged }), NOW)
    assert.ok(r.recorded && r.created)
    assert.notEqual(r.sid, forged)
    assert.equal((sqlite.prepare('SELECT COUNT(*) AS n FROM visitor_sessions WHERE id = ?').get(forged) as { n: number }).n, 0)
  })

  it('a session idle for more than 30 minutes starts a new one', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const b = recordVisitorHit(sqlite, hit({ sid: a.sid }), NOW + 30 * 60)
    assert.ok(b.recorded && !b.created)
    const c = recordVisitorHit(sqlite, hit({ sid: a.sid }), NOW + 30 * 60 + 30 * 60 + 1)
    assert.ok(c.recorded && c.created && c.sid !== a.sid)
  })

  it('bad country codes become unknown; long strings are capped', () => {
    const sqlite = db()
    recordVisitorHit(sqlite, hit({ country: 'de', userAgent: 'u'.repeat(900), referrerUrl: `https://a.example/${'x'.repeat(900)}` }), NOW)
    const [s] = listVisitorSessions(sqlite)
    assert.equal(s?.country, 'unknown')
    assert.equal(s?.userAgent?.length, 400)
    assert.equal(s?.referrerUrl?.length, 500)
  })

  it('caps: hits per session, sessions per day, hits per day', () => {
    const sqlite = db()
    const first = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(first.recorded)
    sqlite.prepare('UPDATE visitor_sessions SET hits = ? WHERE id = ?').run(VISITOR_HITS_PER_SESSION, first.sid)
    const capped = recordVisitorHit(sqlite, hit({ sid: first.sid }), NOW + 1)
    assert.deepEqual(capped, { recorded: false, sid: first.sid, reason: 'session_cap' })

    const sessions = db()
    const ins = sessions.prepare('INSERT INTO visitor_sessions (id, started_at, last_seen, landing_path) VALUES (?, ?, ?, ?)')
    sessions.transaction(() => { for (let i = 0; i < VISITOR_SESSIONS_PER_DAY; i++) ins.run(i.toString(16).padStart(32, '0'), NOW, NOW, '/') })()
    assert.deepEqual(recordVisitorHit(sessions, hit(), NOW + 5), { recorded: false, sid: null, reason: 'day_cap' })
    assert.ok(recordVisitorHit(sessions, hit(), NOW + DAY + 5).recorded) // the next UTC day starts empty

    const hits = db()
    const insHit = hits.prepare('INSERT INTO visitor_hits (session_id, path, created_at) VALUES (?, ?, ?)')
    hits.transaction(() => { for (let i = 0; i < VISITOR_HITS_PER_DAY; i++) insHit.run('x', '/', NOW) })()
    assert.deepEqual(recordVisitorHit(hits, hit(), NOW + 5), { recorded: false, sid: null, reason: 'day_cap' })
  })

  it('deleting a session removes its rows only; malformed ids delete nothing', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    const b = recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW)
    assert.ok(a.recorded && b.recorded)
    assert.equal(deleteVisitorSession(sqlite, "x' OR 1=1 --"), 0)
    assert.equal(deleteVisitorSession(sqlite, a.sid), 1)
    assert.equal(count(sqlite, 'visitor_sessions'), 1)
    assert.deepEqual(sessionHits(sqlite, a.sid), [])
    assert.equal(sessionHits(sqlite, b.sid).length, 1)
  })
})

describe('visitor log retention: kept in full for 13 months, then deleted', () => {
  it('there is no anonymization: after 30 days and after 12 months IP and user agent are still complete', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit({ ip: '2001:db8:abcd:12::5' }), NOW)
    assert.ok(a.recorded)
    for (const days of [31, 100, VISITOR_DELETE_DAYS - 1]) {
      const r = pruneVisitorRecords(sqlite, NOW + days * DAY)
      assert.deepEqual(r, { sessions: 0, hits: 0, events: 0 })
      const row = listVisitorSessions(sqlite)[0]
      assert.equal(row?.ip, '2001:db8:abcd:12::5')
      assert.equal(row?.userAgent, UA)
    }
  })

  it('13 months is 395 days', () => assert.equal(VISITOR_DELETE_DAYS, 395))

  it('at 13 months sessions, hits and events are deleted, orphans too, younger rows stay', () => {
    const sqlite = db()
    const old = recordVisitorHit(sqlite, hit(), NOW)
    const young = recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW + 100 * DAY)
    assert.ok(old.recorded && young.recorded)
    assert.ok(recordVisitorEvent(sqlite, old.sid, { type: 'click', path: '/', kind: 'external', target: 'github.com' }, NOW))
    assert.ok(recordVisitorEvent(sqlite, young.sid, { type: 'click', path: '/', kind: 'external', target: 'github.com' }, NOW + 100 * DAY))
    sqlite.prepare("INSERT INTO visitor_hits (session_id, path, created_at) VALUES ('orphan', '/', ?)").run(NOW + 100 * DAY)
    sqlite.prepare("INSERT INTO visitor_events (session_id, path, kind, target, created_at) VALUES ('orphan', '/', 'cta', 'hero-setup', ?)").run(NOW + 100 * DAY)
    const r = pruneVisitorRecords(sqlite, NOW + VISITOR_DELETE_DAYS * DAY + 10)
    assert.equal(r.sessions, 1)
    assert.equal(r.hits, 2) // the old session's hit and the orphan
    assert.equal(r.events, 2)
    assert.deepEqual(listVisitorSessions(sqlite).map(s => s.id), [young.sid])
    assert.equal(sessionHits(sqlite, young.sid).length, 1)
    assert.equal(sessionEvents(sqlite, young.sid).length, 1)
    assert.equal(count(sqlite, 'visitor_events'), 1)
  })

  it('a session in use is kept: the age counts from the last visit', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    recordVisitorHit(sqlite, hit({ sid: a.sid }), NOW + 10 * 60)
    assert.equal(pruneVisitorRecords(sqlite, NOW + VISITOR_DELETE_DAYS * DAY + 5 * 60).sessions, 0)
    assert.equal(pruneVisitorRecords(sqlite, NOW + VISITOR_DELETE_DAYS * DAY + 11 * 60).sessions, 1)
  })

  it('exactly at the limit nothing is deleted yet', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    assert.equal(pruneVisitorRecords(sqlite, NOW + VISITOR_DELETE_DAYS * DAY).sessions, 0)
  })
})

// ─── trusted proxy: country, https ─────────────────────────────────────

function fakeEvent(headers: Record<string, string> = {}, remote = '127.0.0.1'): H3Event {
  const socket = new Socket()
  Object.defineProperty(socket, 'remoteAddress', { value: remote })
  const req = new IncomingMessage(socket)
  req.headers = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return createEvent(req, new ServerResponse(req))
}

describe('country and https come only from a trusted proxy', () => {
  const withProxies = (value: string | undefined, fn: () => void) => {
    const before = process.env.NUXT_TRUSTED_PROXIES
    if (value === undefined) delete process.env.NUXT_TRUSTED_PROXIES; else process.env.NUXT_TRUSTED_PROXIES = value
    try { fn() } finally { if (before === undefined) delete process.env.NUXT_TRUSTED_PROXIES; else process.env.NUXT_TRUSTED_PROXIES = before }
  }
  it('trusted peer: two-letter code, upper-cased', () => withProxies(undefined, () => {
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'DE' }, '192.168.178.30')), 'DE')
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'us' }, '10.0.0.5')), 'US')
  }))
  it('untrusted peer: header ignored', () => withProxies(undefined, () => {
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'DE' }, '203.0.113.9')), 'unknown')
  }))
  it('trusted list "none": header ignored even from a private peer', () => withProxies('none', () => {
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'DE' }, '192.168.178.30')), 'unknown')
  }))
  it('explicit list: only that peer is believed', () => withProxies('192.168.178.30/32', () => {
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'FR' }, '192.168.178.30')), 'FR')
    assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': 'FR' }, '192.168.178.31')), 'unknown')
  }))
  it('junk, XX and T1 are not countries', () => withProxies(undefined, () => {
    for (const v of ['', 'XX', 'T1', 'DEU', 'D', '1A', '<script>', 'de-DE']) assert.equal(getClientCountry(fakeEvent({ 'cf-ipcountry': v }, '10.0.0.5')), 'unknown', v)
    assert.equal(getClientCountry(fakeEvent({}, '10.0.0.5')), 'unknown')
  }))
  it('https: x-forwarded-proto only from a trusted peer', () => withProxies(undefined, () => {
    assert.equal(requestIsHttps(fakeEvent({ 'x-forwarded-proto': 'https' }, '10.0.0.5')), true)
    assert.equal(requestIsHttps(fakeEvent({ 'x-forwarded-proto': 'https, http' }, '10.0.0.5')), true)
    assert.equal(requestIsHttps(fakeEvent({ 'x-forwarded-proto': 'http' }, '10.0.0.5')), false)
    assert.equal(requestIsHttps(fakeEvent({ 'x-forwarded-proto': 'https' }, '203.0.113.9')), false)
    assert.equal(requestIsHttps(fakeEvent({}, '10.0.0.5')), false)
  }))
})

// ─── request flows ─────────────────────────────────────────────────────

const servers: http.Server[] = []
afterEach(() => { for (const s of servers.splice(0)) s.close() })

async function serve(handler: (event: H3Event) => unknown) {
  const app = createApp()
  app.use('/x', defineEventHandler(handler))
  const server = http.createServer(toNodeListener(app))
  servers.push(server)
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  return (server.address() as AddressInfo).port
}

interface Reply { status: number, headers: http.IncomingHttpHeaders, setCookie: string[] }
function post(port: number, body: unknown, headers: Record<string, string> = {}): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const payload = typeof body === 'string' ? body : JSON.stringify(body)
    const req = http.request({ host: '127.0.0.1', port, path: '/x', method: 'POST', headers: { 'content-type': 'text/plain', 'user-agent': UA, ...headers } }, (res) => {
      res.resume()
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, setCookie: res.headers['set-cookie'] ?? [] }))
    })
    req.on('error', reject)
    req.end(payload)
  })
}

const salt = createSaltKeeper(() => Buffer.alloc(32, 7))
const cookieHeader = (stats: boolean, extra = '') => `${CONSENT_COOKIE}=${encodeURIComponent(consentValue(stats))}${extra}`

function hitDeps(sqlite: Database.Database, over: Partial<VisitorHitDeps> = {}): VisitorHitDeps {
  return {
    enabled: () => true,
    gate: event => runBeaconGate(event, 'visitor-hit', 120, {
      hasLoginSession: () => false, clientIp: () => '203.0.113.77', salt: () => salt.get(), visitorKey: anonymousRateKey, allow: () => true,
    }),
    parseUa: () => ({ browser: 'Chrome', os: 'Windows', device: 'desktop' }),
    country: () => 'DE',
    city: () => null,
    record: input => recordVisitorHit(sqlite, input),
    ...over,
  }
}

describe('POST visitor-hit: consent is checked on the server', () => {
  const rows = (sqlite: Database.Database) => count(sqlite, 'visitor_hits')

  it('no consent cookie: nothing stored, no Set-Cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/' })
    assert.equal(r.status, 204)
    assert.deepEqual(r.setCookie, [])
    assert.equal(rows(sqlite), 0)
  })

  it('"necessary only": nothing stored, no session cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/' }, { cookie: cookieHeader(false) })
    assert.deepEqual(r.setCookie, [])
    assert.equal(rows(sqlite), 0)
  })

  it('a forged or malformed consent cookie counts as no consent', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    for (const c of [`${CONSENT_COOKIE}=1`, `${CONSENT_COOKIE}=true`, `${CONSENT_COOKIE}=${encodeURIComponent('{"stats":true}')}`, `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify({ v: 1, stats: true, ts: 1 }))}`]) {
      const r = await post(port, { path: '/' }, { cookie: c })
      assert.deepEqual(r.setCookie, [], c)
    }
    assert.equal(rows(sqlite), 0)
  })

  it('consent: stores the visit and sets a random, HttpOnly, Lax, 30-minute session cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/strings', referrerUrl: 'https://example.org/p?q=1#x' }, { cookie: cookieHeader(true) })
    assert.equal(r.status, 204)
    assert.equal(r.headers['cache-control'], 'no-store')
    assert.equal(r.setCookie.length, 2) // the visit and the returning-visitor id
    const c = r.setCookie.find(x => x.startsWith(`${SESSION_COOKIE}=`)) ?? ''
    const m = c.match(new RegExp(`^${SESSION_COOKIE}=([0-9a-f]{32});`))
    const vc = r.setCookie.find(x => x.startsWith(`${VISITOR_COOKIE}=`)) ?? ''
    assert.match(vc, new RegExp(`^${VISITOR_COOKIE}=[0-9a-f]{32};`))
    assert.match(vc, /HttpOnly/i)
    assert.match(vc, /SameSite=Lax/i)
    assert.match(vc, new RegExp(`Max-Age=${VISITOR_MAX_AGE_S}`))
    assert.equal(VISITOR_MAX_AGE_S, 395 * 86400)
    assert.ok(m, c)
    assert.match(c, /HttpOnly/i)
    assert.match(c, /SameSite=Lax/i)
    assert.match(c, /Path=\//)
    assert.match(c, /Max-Age=1800/)
    assert.doesNotMatch(c, /Secure/i) // plain http here
    const [s] = listVisitorSessions(sqlite)
    assert.equal(s?.id, m?.[1])
    assert.equal(s?.ip, '203.0.113.77')
    assert.equal(s?.country, 'DE')
    assert.equal(s?.referrerUrl, 'https://example.org/p?q=1')
    assert.equal(s?.landingPath, '/strings')
    assert.equal(rows(sqlite), 1)
  })

  it('the session id is not derived from the address: same visitor twice gives two ids', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const a = (await post(port, { path: '/' }, { cookie: cookieHeader(true) })).setCookie[0]
    const b = (await post(port, { path: '/' }, { cookie: cookieHeader(true) })).setCookie[0]
    assert.notEqual(a?.split(';')[0], b?.split(';')[0])
  })

  it('Secure is set behind an https proxy', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/' }, { cookie: cookieHeader(true), 'x-forwarded-proto': 'https' })
    assert.match(r.setCookie[0] ?? '', /Secure/i)
  })

  it('the second request continues the session through the cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const first = await post(port, { path: '/' }, { cookie: cookieHeader(true) })
    const sid = (first.setCookie[0] ?? '').split(';')[0] ?? ''
    await post(port, { path: '/guide' }, { cookie: `${cookieHeader(true)}; ${sid}` })
    assert.equal(count(sqlite, 'visitor_sessions'), 1)
    assert.equal(rows(sqlite), 2)
  })

  it('unknown routes and junk bodies store nothing', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    for (const body of [{ path: '/admin' }, { path: '/api/v1/x' }, { path: 5 }, {}, '[]', 'nope', '']) {
      const r = await post(port, body, { cookie: cookieHeader(true) })
      assert.deepEqual(r.setCookie, [])
    }
    assert.equal(rows(sqlite), 0)
  })

  it('the referrer must be an external http(s) URL; the own host is dropped', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    await post(port, { path: '/', referrerUrl: `http://127.0.0.1:${port}/guide` }, { cookie: cookieHeader(true), host: `127.0.0.1:${port}` })
    await post(port, { path: '/', referrerUrl: 'javascript:alert(1)' }, { cookie: cookieHeader(true) })
    const all = listVisitorSessions(sqlite)
    assert.equal(all.length, 2)
    assert.ok(all.every(s => s.referrerUrl === null && s.referrerHost === null))
  })

  it('Global Privacy Control and Do Not Track: nothing stored, even with consent; a stale session cookie is removed', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    for (const h of [{ 'sec-gpc': '1' }, { dnt: '1' }] as Array<Record<string, string>>) {
      const r = await post(port, { path: '/' }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${'a'.repeat(32)}; ${VISITOR_COOKIE}=${'c'.repeat(32)}`, ...h })
      assert.equal(r.status, 204)
      assert.equal(r.setCookie.length, 3) // session, visitor and the stored choice, only because the browser sent all three
      assert.match(r.setCookie[0] ?? '', new RegExp(`^${SESSION_COOKIE}=;`))
      assert.match(r.setCookie[1] ?? '', new RegExp(`^${VISITOR_COOKIE}=;`))
      assert.match(r.setCookie[2] ?? '', new RegExp(`^${CONSENT_COOKIE}=;`))
      for (const c of r.setCookie) assert.match(c, /Max-Age=0|Expires=Thu, 01 Jan 1970/)
    }
    assert.equal(rows(sqlite), 0)
    // the opposite values are no signal
    const ok = await post(port, { path: '/' }, { cookie: cookieHeader(true), 'sec-gpc': '0', dnt: '0' })
    assert.equal(ok.setCookie.length, 2)
    assert.equal(rows(sqlite), 1)
  })

  it('bots and admin sessions are skipped', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const bot = await post(port, { path: '/' }, { cookie: cookieHeader(true), 'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)' })
    assert.deepEqual(bot.setCookie, [])
    const admin = await serve(e => handleVisitorHit(e, hitDeps(sqlite, {
      gate: ev => runBeaconGate(ev, 'visitor-hit', 120, { hasLoginSession: () => true, clientIp: () => '203.0.113.77', salt: () => salt.get(), visitorKey: anonymousRateKey, allow: () => true }),
    })))
    assert.deepEqual((await post(admin, { path: '/' }, { cookie: cookieHeader(true) })).setCookie, [])
    assert.equal(rows(sqlite), 0)
  })

  it('rate limited visitors are skipped', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite, {
      gate: ev => runBeaconGate(ev, 'visitor-hit', 120, { hasLoginSession: () => false, clientIp: () => '203.0.113.77', salt: () => salt.get(), visitorKey: anonymousRateKey, allow: () => false }),
    })))
    assert.deepEqual((await post(port, { path: '/' }, { cookie: cookieHeader(true) })).setCookie, [])
  })

  it('switched off by the flag: nothing stored, no cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite, { enabled: () => false })))
    const r = await post(port, { path: '/' }, { cookie: cookieHeader(true) })
    assert.deepEqual(r.setCookie, [])
    assert.equal(rows(sqlite), 0)
  })

  it('a cross-site POST is refused', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/' }, { cookie: cookieHeader(true), origin: 'https://evil.example' })
    assert.equal(r.status, 403)
    assert.equal(rows(sqlite), 0)
  })

  it('an oversized body is not read into a record', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, JSON.stringify({ path: '/', referrerUrl: `https://example.org/${'a'.repeat(5000)}` }), { cookie: cookieHeader(true) })
    assert.deepEqual(r.setCookie, [])
    assert.equal(rows(sqlite), 0)
  })

  it('consent withdrawn (stats:false cookie) with a leftover session cookie: removed, nothing stored', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const r = await post(port, { path: '/' }, { cookie: `${cookieHeader(false)}; ${SESSION_COOKIE}=${'b'.repeat(32)}` })
    assert.equal(r.setCookie.length, 1)
    assert.match(r.setCookie[0] ?? '', new RegExp(`^${SESSION_COOKIE}=;`))
    assert.equal(rows(sqlite), 0)
  })
})

describe('POST consent', () => {
  function consentDeps(sqlite: Database.Database, over: Partial<Parameters<typeof handleConsentChange>[1]> = {}) {
    return { enabled: () => true, allow: () => true, deleteRecords: (ids: { sid?: string, vid?: string }) => deleteVisitorRecords(sqlite, ids), ...over }
  }
  const consentCookieOf = (r: Reply) => r.setCookie.find(c => c.startsWith(`${CONSENT_COOKIE}=`)) ?? ''

  it('"accept": sets only the consent cookie, Lax, 6 months, readable by the page, no identifier', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const r = await post(port, { stats: true })
    assert.equal(r.status, 204)
    assert.equal(r.setCookie.length, 1)
    const c = consentCookieOf(r)
    assert.match(c, /Max-Age=15552000/)
    assert.match(c, /SameSite=Lax/i)
    assert.match(c, /Path=\//)
    assert.doesNotMatch(c, /HttpOnly/i)
    assert.doesNotMatch(c, /Secure/i)
    const value = decodeURIComponent((c.split(';')[0] ?? '').slice(CONSENT_COOKIE.length + 1))
    const parsed = parseConsent(value)
    assert.equal(parsed?.stats, true)
    assert.deepEqual(Object.keys(JSON.parse(value)).sort(), ['stats', 'ts', 'v'])
  })

  it('"necessary only": the consent cookie says false and no session cookie appears', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const r = await post(port, { stats: false })
    assert.equal(r.setCookie.length, 1)
    assert.equal(parseConsent(decodeURIComponent((consentCookieOf(r).split(';')[0] ?? '').slice(CONSENT_COOKIE.length + 1)))?.stats, false)
  })

  it('Secure on https', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const r = await post(port, { stats: true }, { 'x-forwarded-proto': 'https' })
    assert.match(consentCookieOf(r), /Secure/i)
  })

  it('revoking removes the session cookie and that visit\'s records', async () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    const other = recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW)
    assert.ok(a.recorded && other.recorded)
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const r = await post(port, { stats: false }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${a.sid}` })
    const cleared = r.setCookie.find(c => c.startsWith(`${SESSION_COOKIE}=`)) ?? ''
    assert.match(cleared, new RegExp(`^${SESSION_COOKIE}=;`))
    assert.match(cleared, /Max-Age=0|Expires=Thu, 01 Jan 1970/)
    assert.deepEqual(listVisitorSessions(sqlite).map(s => s.id), [other.sid])
    assert.equal(sessionHits(sqlite, a.sid).length, 0)
  })

  it('accepting again keeps an existing session', async () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const r = await post(port, { stats: true }, { cookie: `${SESSION_COOKIE}=${a.sid}` })
    assert.equal(r.setCookie.some(c => c.startsWith(`${SESSION_COOKIE}=`)), false)
    assert.equal(count(sqlite, 'visitor_sessions'), 1)
  })

  it('Global Privacy Control / Do Not Track win over a click: no consent cookie, session removed', async () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    for (const h of [{ 'sec-gpc': '1' }, { dnt: '1' }] as Array<Record<string, string>>) {
      const r = await post(port, { stats: true }, { cookie: `${SESSION_COOKIE}=${a.sid}`, ...h })
      assert.equal(consentCookieOf(r), '')
    }
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
  })

  it('invalid bodies are 400 and set nothing', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    for (const body of [{}, { stats: 'yes' }, { stats: 1 }, 'nope', '[]', '', JSON.stringify({ stats: true, pad: 'x'.repeat(400) })]) {
      const r = await post(port, body)
      assert.equal(r.status, 400, JSON.stringify(body).slice(0, 40))
      assert.deepEqual(r.setCookie, [])
    }
  })

  it('cross-site, rate limited and switched-off requests set nothing', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, consentDeps(sqlite)))
    const cross = await post(port, { stats: true }, { origin: 'https://evil.example' })
    assert.equal(cross.status, 403)
    assert.deepEqual(cross.setCookie, [])
    const limited = await serve(e => handleConsentChange(e, consentDeps(sqlite, { allow: () => false })))
    const l = await post(limited, { stats: true })
    assert.equal(l.status, 429)
    assert.deepEqual(l.setCookie, [])
    const off = await serve(e => handleConsentChange(e, consentDeps(sqlite, { enabled: () => false })))
    const o = await post(off, { stats: true })
    assert.equal(o.status, 204)
    assert.deepEqual(o.setCookie, [])
  })
})

// ─── extended signals ──────────────────────────────────────────────────

describe('visitor signals (shared validators)', () => {
  it('UTM: only the five keys, control characters removed, capped at 100', () => {
    const u = pickUtm('?utm_source=news&utm_medium=mail%0d%0a&utm_campaign=' + 'x'.repeat(300) + '&utm_term=&utm_content=a%E2%80%AEb&other=1&utm_id=7')
    assert.deepEqual(Object.keys(u).sort(), ['utm_campaign', 'utm_content', 'utm_medium', 'utm_source'])
    assert.equal(u.utm_medium, 'mail')
    assert.equal(u.utm_campaign?.length, 100)
    assert.equal(u.utm_content, 'ab')
    assert.deepEqual(pickUtm({ utm_source: 5, utm_medium: ['a'] }), {})
    assert.deepEqual(pickUtm(null), {})
    assert.deepEqual(pickUtm([]), {})
    assert.equal(cleanText('   '), null)
  })

  it('environment: screen, language and time zone by shape', () => {
    assert.deepEqual(cleanEnv({ sw: 1920, sh: 1080, lang: 'de-DE', tz: 'Europe/Berlin' }), { screenW: 1920, screenH: 1080, language: 'de-DE', timezone: 'Europe/Berlin' })
    assert.deepEqual(cleanEnv({ sw: 0, sh: 20001, lang: 'x', tz: 'a b' }), { screenW: null, screenH: null, language: null, timezone: null })
    assert.deepEqual(cleanEnv({ sw: 1.5, sh: '10', lang: '<script>', tz: 'UTC' }), { screenW: null, screenH: null, language: null, timezone: 'UTC' })
    assert.equal(cleanEnv({ tz: 'America/Argentina/Buenos_Aires' }).timezone, 'America/Argentina/Buenos_Aires')
    assert.deepEqual(cleanEnv('nope'), { screenW: null, screenH: null, language: null, timezone: null })
  })

  it('scroll milestones and dwell', () => {
    assert.deepEqual([0, 24.9, 25, 49, 50, 74, 75, 97, 98, 140, NaN].map(scrollMilestone), [0, 0, 25, 25, 50, 50, 75, 75, 100, 100, 0])
    assert.equal(cleanDwell(12.4), 12)
    assert.equal(cleanDwell(99999), 3600)
    assert.equal(cleanDwell(-1), null)
    assert.equal(cleanDwell('5'), null)
    assert.equal(cleanDwell(NaN), null)
  })

  const origin = 'https://ui.magguu.xyz'
  it('click classification: marked CTA (known ids only), download, external; nothing else', () => {
    assert.deepEqual(classifyClick({ cta: 'hero-setup', href: '/guide' }, origin), { kind: 'cta', target: 'hero-setup' })
    for (const id of CTA_IDS) assert.equal(classifyClick({ cta: id }, origin)?.kind, 'cta')
    assert.equal(classifyClick({ cta: 'made-up', href: 'https://x.example/' }, origin), null) // unknown id: not recorded, not reclassified
    assert.deepEqual(classifyClick({ href: 'https://github.com/Derpsen/MagguuUI' }, origin), { kind: 'external', target: 'github.com' })
    assert.deepEqual(classifyClick({ href: '/files/MagguuUI-1.2.zip' }, origin), { kind: 'download', target: 'MagguuUI-1.2.zip' })
    assert.deepEqual(classifyClick({ href: '/x/profile', download: true }, origin), { kind: 'download', target: 'profile' })
    assert.deepEqual(classifyClick({ href: 'https://cdn.example/a.PDF?token=secret' }, origin), { kind: 'download', target: 'a.PDF' }) // the query is never kept
    assert.equal(classifyClick({ href: '/guide' }, origin), null)
    assert.equal(classifyClick({ href: 'mailto:a@b.example' }, origin), null)
    assert.equal(classifyClick({ href: 'javascript:alert(1)' }, origin), null)
    assert.equal(classifyClick({ href: 'https://github.com/a b/c d.zip' }, origin)?.kind, 'external') // odd file name is not stored
    assert.equal(classifyClick({}, origin), null)
    assert.ok(DOWNLOAD_EXTENSIONS.includes('zip'))
  })

  it('server side click validation matches what the client can produce', () => {
    assert.deepEqual(validClick('cta', 'header-setup'), { kind: 'cta', target: 'header-setup' })
    assert.equal(validClick('cta', 'free text'), null)
    assert.deepEqual(validClick('external', 'github.com'), { kind: 'external', target: 'github.com' })
    for (const bad of ['GitHub.com', 'a b.com', 'nodot', 'a'.repeat(101) + '.com', '<x>.com', 'a.com/path']) assert.equal(validClick('external', bad), null, bad)
    assert.equal(validClick('download', 'a.zip')?.kind, 'download')
    assert.equal(validClick('download', '../a.zip'), null)
    assert.equal(validClick('download', ''), null)
    assert.equal(validClick('evil', 'a.zip'), null)
    assert.equal(validClick('cta', 5), null)
  })
})

describe('extended storage: visitor id, utm, environment, sequence, dwell, scroll, clicks', () => {
  const env = { screenW: 1920, screenH: 1080, language: 'de-DE', timezone: 'Europe/Berlin' }

  it('a first hit stores utm, environment, city and entry page; the visitor id is server-issued', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit({ env, city: 'Berlin', utm: { utm_source: 'news', utm_campaign: 'c' }, path: '/strings' }), NOW)
    assert.ok(a.recorded && a.newVisitor && isValidSessionId(a.vid))
    const s = listVisitorSessions(sqlite)[0]
    assert.equal(s?.visitorId, a.vid)
    assert.equal(s?.screenW, 1920)
    assert.equal(s?.screenH, 1080)
    assert.equal(s?.language, 'de-DE')
    assert.equal(s?.timezone, 'Europe/Berlin')
    assert.equal(s?.city, 'Berlin')
    assert.equal(s?.utmSource, 'news')
    assert.equal(s?.utmCampaign, 'c')
    assert.equal(s?.utmMedium, null)
    assert.equal(s?.landingPath, '/strings')
    assert.equal(s?.exitPath, '/strings')
  })

  it('the page sequence: each hit is a row, the exit page follows the last one', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit({ path: '/' }), NOW)
    assert.ok(a.recorded)
    recordVisitorHit(sqlite, hit({ sid: a.sid, path: '/guide' }), NOW + 20)
    recordVisitorHit(sqlite, hit({ sid: a.sid, path: '/strings' }), NOW + 50)
    assert.deepEqual(sessionHits(sqlite, a.sid).map(h => h.path), ['/', '/guide', '/strings'])
    const s = listVisitorSessions(sqlite)[0]
    assert.equal(s?.landingPath, '/')
    assert.equal(s?.exitPath, '/strings')
    assert.equal(s?.hits, 3)
  })

  it('a returning visitor keeps the id; a forged or unknown id is replaced', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const back = recordVisitorHit(sqlite, hit({ vid: a.vid }), NOW + 5 * DAY)
    assert.ok(back.recorded && back.created && !back.newVisitor)
    assert.equal(back.vid, a.vid)
    assert.notEqual(back.sid, a.sid)
    const forged = recordVisitorHit(sqlite, hit({ vid: 'f'.repeat(32) }), NOW + 6 * DAY)
    assert.ok(forged.recorded && forged.newVisitor)
    assert.notEqual(forged.vid, 'f'.repeat(32))
    const junk = recordVisitorHit(sqlite, hit({ vid: "x' OR 1=1 --" }), NOW + 7 * DAY)
    assert.ok(junk.recorded && junk.newVisitor)
  })

  it('leave reports add dwell time and raise the scroll milestone of the newest hit of that page', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit({ path: '/' }), NOW)
    assert.ok(a.recorded)
    recordVisitorHit(sqlite, hit({ sid: a.sid, path: '/guide' }), NOW + 20)
    assert.ok(recordVisitorEvent(sqlite, a.sid, { type: 'leave', path: '/', dwellS: 20, scroll: 50 }, NOW + 20))
    assert.ok(recordVisitorEvent(sqlite, a.sid, { type: 'leave', path: '/', dwellS: 5, scroll: 25 }, NOW + 25)) // lower milestone never lowers
    const h = sessionHits(sqlite, a.sid)
    assert.equal(h[0]?.dwellS, 25)
    assert.equal(h[0]?.scrollMax, 50)
    assert.equal(h[1]?.dwellS, null)
    assert.equal(recordVisitorEvent(sqlite, a.sid, { type: 'leave', path: '/never', dwellS: 5, scroll: 0 }), false)
    assert.ok(recordVisitorEvent(sqlite, a.sid, { type: 'leave', path: '/', dwellS: 99999, scroll: 33 }))
    assert.equal(sessionHits(sqlite, a.sid)[0]?.dwellS, 3600) // capped
    assert.equal(sessionHits(sqlite, a.sid)[0]?.scrollMax, 50) // 33 is no milestone
  })

  it('events need an existing session and never create one', () => {
    const sqlite = db()
    assert.equal(recordVisitorEvent(sqlite, 'a'.repeat(32), { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }), false)
    assert.equal(recordVisitorEvent(sqlite, undefined, { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }), false)
    assert.equal(recordVisitorEvent(sqlite, "x' OR 1=1 --", { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }), false)
    assert.equal(count(sqlite, 'visitor_events'), 0)
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
  })

  it('clicks are stored with kind and target, capped per session', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    assert.ok(recordVisitorEvent(sqlite, a.sid, { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }, NOW + 1))
    assert.deepEqual(sessionEvents(sqlite, a.sid).map(e => [e.kind, e.target, e.path]), [['cta', 'hero-setup', '/']])
    for (let i = 1; i < VISITOR_EVENTS_PER_SESSION; i++) recordVisitorEvent(sqlite, a.sid, { type: 'click', path: '/', kind: 'external', target: 'github.com' }, NOW + 2)
    assert.equal(count(sqlite, 'visitor_events'), VISITOR_EVENTS_PER_SESSION)
    assert.equal(recordVisitorEvent(sqlite, a.sid, { type: 'click', path: '/', kind: 'external', target: 'github.com' }, NOW + 3), false)
  })

  it('withdrawing consent deletes the visit and every earlier visit of the same visitor id, nobody else', () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const b = recordVisitorHit(sqlite, hit({ vid: a.vid }), NOW + 3 * DAY)
    const other = recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW)
    assert.ok(b.recorded && other.recorded)
    recordVisitorEvent(sqlite, b.sid, { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }, NOW + 3 * DAY)
    assert.equal(deleteVisitorRecords(sqlite, { sid: b.sid, vid: a.vid }), 2)
    assert.deepEqual(listVisitorSessions(sqlite).map(s => s.id), [other.sid])
    assert.equal(count(sqlite, 'visitor_hits'), 1)
    assert.equal(count(sqlite, 'visitor_events'), 0)
    assert.equal(deleteVisitorRecords(sqlite, { sid: 'bad', vid: "x' --" }), 0)
  })

  it('a database that already has the first shape of the tables gets the new columns', () => {
    const old = new Database(':memory:')
    old.exec(`CREATE TABLE visitor_sessions (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, ip TEXT, user_agent TEXT, browser TEXT NOT NULL DEFAULT 'Other', os TEXT NOT NULL DEFAULT 'Other', device TEXT NOT NULL DEFAULT 'desktop', country TEXT NOT NULL DEFAULT 'unknown', referrer_url TEXT, referrer_host TEXT, landing_path TEXT NOT NULL, hits INTEGER NOT NULL DEFAULT 0, anonymized_at INTEGER);
      CREATE TABLE visitor_hits (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, path TEXT NOT NULL, created_at INTEGER NOT NULL);`)
    initializeDatabase(old)
    initializeDatabase(old)
    assert.ok(recordVisitorHit(old, hit({ env, utm: { utm_source: 'a' } }), NOW).recorded)
    assert.equal(listVisitorSessions(old)[0]?.utmSource, 'a')
  })
})

describe('city from a Cloudflare header, trusted proxies only', () => {
  it('cf-ipcity is used from a trusted socket, never from anyone else', () => {
    assert.equal(getClientCity(fakeEvent({ 'cf-ipcity': 'Berlin' })), 'Berlin')
    assert.equal(getClientCity(fakeEvent({ 'cf-ipcity': 'M%C3%BCnchen' })), 'München')
    assert.equal(getClientCity(fakeEvent({ 'cf-ipcity': "Val-d'Or" })), "Val-d'Or")
    assert.equal(getClientCity(fakeEvent({ 'cf-ipcity': 'Berlin' }, '203.0.113.9')), null)
    assert.equal(getClientCity(fakeEvent({})), null)
    for (const bad of ['<script>', 'Ber1in', '', 'x'.repeat(61), '%E0%A4%A', '../etc']) assert.equal(getClientCity(fakeEvent({ 'cf-ipcity': bad })), null, bad)
  })
})

describe('POST visitor-hit / visitor-event: the extended signals', () => {
  const sidOf = (r: Reply) => r.setCookie.find(c => c.startsWith(`${SESSION_COOKIE}=`))?.match(/=([0-9a-f]{32});/)?.[1] ?? ''
  const eventDeps = (sqlite: Database.Database, over: Partial<VisitorEventDeps> = {}): VisitorEventDeps => ({
    enabled: () => true,
    gate: event => runBeaconGate(event, 'visitor-event', 240, {
      hasLoginSession: () => false, clientIp: () => '203.0.113.77', salt: () => salt.get(), visitorKey: anonymousRateKey, allow: () => true,
    }),
    record: (sid, ev) => recordVisitorEvent(sqlite, sid, ev),
    ...over,
  })

  it('hit: utm, environment and city are stored, junk is dropped, a returning visitor gets no new visitor cookie', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite, { city: () => 'Berlin' })))
    const r = await post(port, {
      path: '/', utm: { utm_source: 'news', utm_x: 'no', utm_medium: 'm'.repeat(500) }, env: { sw: 1366, sh: 768, lang: 'en-US', tz: 'Europe/Berlin' },
    }, { cookie: cookieHeader(true) })
    const s = listVisitorSessions(sqlite)[0]
    assert.equal(s?.utmSource, 'news')
    assert.equal(s?.utmMedium?.length, 100)
    assert.equal(s?.screenW, 1366)
    assert.equal(s?.language, 'en-US')
    assert.equal(s?.city, 'Berlin')
    const vid = r.setCookie.find(c => c.startsWith(`${VISITOR_COOKIE}=`))?.match(/=([0-9a-f]{32});/)?.[1] ?? ''
    assert.equal(s?.visitorId, vid)
    const again = await post(port, { path: '/guide' }, { cookie: `${cookieHeader(true)}; ${VISITOR_COOKIE}=${vid}` })
    assert.equal(again.setCookie.some(c => c.startsWith(`${VISITOR_COOKIE}=`)), false)
    assert.equal(count(sqlite, 'visitor_sessions'), 2)
    assert.equal(listVisitorSessions(sqlite)[0]?.visitorId, vid)
  })

  it('hit: without consent the visitor cookie is not set and a stale one is removed', async () => {
    const sqlite = db()
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const none = await post(port, { path: '/' })
    assert.deepEqual(none.setCookie, [])
    const stale = await post(port, { path: '/' }, { cookie: `${cookieHeader(false)}; ${VISITOR_COOKIE}=${'d'.repeat(32)}` })
    assert.equal(stale.setCookie.length, 1)
    assert.match(stale.setCookie[0] ?? '', new RegExp(`^${VISITOR_COOKIE}=;`))
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
  })

  it('event: needs consent, the session cookie and an existing visit; sets no cookie', async () => {
    const sqlite = db()
    const hitPort = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const hr = await post(hitPort, { path: '/guide' }, { cookie: cookieHeader(true) })
    const sid = sidOf(hr)
    assert.ok(sid)
    const port = await serve(e => handleVisitorEvent(e, eventDeps(sqlite)))
    const dwellOf = () => sessionHits(sqlite, sid)[0]
    // no consent cookie / refused / no session cookie: nothing
    for (const cookie of [`${SESSION_COOKIE}=${sid}`, `${cookieHeader(false)}; ${SESSION_COOKIE}=${sid}`, cookieHeader(true)]) {
      const r = await post(port, { type: 'leave', path: '/guide', dwell: 9, scroll: 50 }, { cookie })
      assert.equal(r.status, 204)
      assert.deepEqual(r.setCookie, [])
      assert.equal(dwellOf()?.dwellS, null)
    }
    const ok = await post(port, { type: 'leave', path: '/guide', dwell: 9, scroll: 50 }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}` })
    assert.deepEqual(ok.setCookie, [])
    assert.equal(dwellOf()?.dwellS, 9)
    assert.equal(dwellOf()?.scrollMax, 50)
    await post(port, { type: 'click', path: '/guide', kind: 'external', target: 'github.com' }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}` })
    assert.deepEqual(sessionEvents(sqlite, sid).map(e => [e.kind, e.target]), [['external', 'github.com']])
  })

  it('event: forged or malformed reports store nothing', async () => {
    const sqlite = db()
    const hitPort = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const sid = sidOf(await post(hitPort, { path: '/' }, { cookie: cookieHeader(true) }))
    const port = await serve(e => handleVisitorEvent(e, eventDeps(sqlite)))
    const cookie = `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}`
    const bad: unknown[] = [
      { type: 'click', path: '/', kind: 'cta', target: 'free text typed by someone' },
      { type: 'click', path: '/', kind: 'external', target: 'Not A Host' },
      { type: 'click', path: '/admin', kind: 'cta', target: 'hero-setup' },
      { type: 'click', path: '/nowhere', kind: 'cta', target: 'hero-setup' },
      { type: 'click', path: '/', kind: 'keystroke', target: 'a' },
      { type: 'leave', path: '/', dwell: 'lots', scroll: 10 },
      { type: 'leave', path: '/admin', dwell: 5, scroll: 10 },
      { type: 'other', path: '/' }, {}, 'nope', JSON.stringify({ type: 'click', path: '/', kind: 'cta', target: 'hero-setup', pad: 'x'.repeat(600) }),
    ]
    for (const b of bad) {
      const r = await post(port, b, { cookie })
      assert.equal(r.status, 204)
    }
    assert.equal(count(sqlite, 'visitor_events'), 0)
    assert.equal(sessionHits(sqlite, sid)[0]?.dwellS, null)
  })

  it('event: Global Privacy Control, bots, switched off, cross-site: nothing', async () => {
    const sqlite = db()
    const hitPort = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const sid = sidOf(await post(hitPort, { path: '/' }, { cookie: cookieHeader(true) }))
    const cookie = `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}`
    const body = { type: 'click', path: '/', kind: 'cta', target: 'hero-setup' }
    const port = await serve(e => handleVisitorEvent(e, eventDeps(sqlite)))
    await post(port, body, { cookie, 'sec-gpc': '1' })
    await post(port, body, { cookie, dnt: '1' })
    await post(port, body, { cookie, 'user-agent': 'Googlebot/2.1' })
    assert.equal((await post(port, body, { cookie, origin: 'https://evil.example' })).status, 403)
    const off = await serve(e => handleVisitorEvent(e, eventDeps(sqlite, { enabled: () => false })))
    await post(off, body, { cookie })
    const limited = await serve(e => handleVisitorEvent(e, eventDeps(sqlite, { gate: ev => runBeaconGate(ev, 'visitor-event', 240, { hasLoginSession: () => false, clientIp: () => '203.0.113.77', salt: () => salt.get(), visitorKey: anonymousRateKey, allow: () => false }) })))
    await post(limited, body, { cookie })
    assert.equal(count(sqlite, 'visitor_events'), 0)
  })

  it('revoking removes both cookies and all records of that browser', async () => {
    const sqlite = db()
    const hitPort = await serve(e => handleVisitorHit(e, hitDeps(sqlite)))
    const first = await post(hitPort, { path: '/' }, { cookie: cookieHeader(true) })
    const sid = sidOf(first)
    const vid = first.setCookie.find(c => c.startsWith(`${VISITOR_COOKIE}=`))?.match(/=([0-9a-f]{32});/)?.[1] ?? ''
    assert.ok(sid && vid)
    const port = await serve(e => handleConsentChange(e, {
      enabled: () => true, allow: () => true, deleteRecords: ids => deleteVisitorRecords(sqlite, ids),
    }))
    const r = await post(port, { stats: false }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}; ${VISITOR_COOKIE}=${vid}` })
    assert.ok(r.setCookie.some(c => c.startsWith(`${SESSION_COOKIE}=;`)))
    assert.ok(r.setCookie.some(c => c.startsWith(`${VISITOR_COOKIE}=;`)))
    assert.ok(r.setCookie.some(c => c.startsWith(`${CONSENT_COOKIE}=`)))
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
    assert.equal(count(sqlite, 'visitor_hits'), 0)
  })
})

describe('F5: a refusal signal withdraws an earlier "yes"', () => {
  const sidOf = (r: Reply) => r.setCookie.find(c => c.startsWith(`${SESSION_COOKIE}=`))?.match(/=([0-9a-f]{32});/)?.[1] ?? ''
  const gone = (c: string) => /Max-Age=0|Expires=Thu, 01 Jan 1970/.test(c)

  it('visitor-hit with GPC deletes the stored records of that browser and all three cookies', async () => {
    const sqlite = db()
    const calls: Array<{ sid?: string, vid?: string }> = []
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite, { deleteRecords: ids => { calls.push(ids); return deleteVisitorRecords(sqlite, ids) } })))
    const first = await post(port, { path: '/' }, { cookie: cookieHeader(true) })
    const sid = sidOf(first)
    const vid = first.setCookie.find(c => c.startsWith(`${VISITOR_COOKIE}=`))?.match(/=([0-9a-f]{32});/)?.[1] ?? ''
    assert.equal(count(sqlite, 'visitor_sessions'), 1)
    const r = await post(port, { path: '/guide' }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${sid}; ${VISITOR_COOKIE}=${vid}`, 'sec-gpc': '1' })
    assert.equal(r.setCookie.length, 3)
    assert.ok(r.setCookie.every(gone))
    assert.deepEqual(calls, [{ sid, vid }])
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
    assert.equal(count(sqlite, 'visitor_hits'), 0)
    // The signal is switched off again: the old "yes" is gone from the browser, so nothing starts again by itself.
    const later = await post(port, { path: '/' })
    assert.deepEqual(later.setCookie, [])
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
  })

  it('visitor-hit with GPC and no cookies of the visitor does not touch the database', async () => {
    const sqlite = db()
    const calls: unknown[] = []
    const port = await serve(e => handleVisitorHit(e, hitDeps(sqlite, { deleteRecords: ids => { calls.push(ids); return 0 } })))
    const r = await post(port, { path: '/' }, { 'sec-gpc': '1' })
    assert.deepEqual(r.setCookie, [])
    assert.deepEqual(calls, [])
  })

  it('consent POST with GPC and an old "yes": records deleted, mg_consent, mg_sid and mg_vid cleared, no new choice stored', async () => {
    const sqlite = db()
    const a = recordVisitorHit(sqlite, hit(), NOW)
    assert.ok(a.recorded)
    const port = await serve(e => handleConsentChange(e, { enabled: () => true, allow: () => true, deleteRecords: ids => deleteVisitorRecords(sqlite, ids) }))
    for (const h of [{ 'sec-gpc': '1' }, { dnt: '1' }] as Array<Record<string, string>>) {
      const r = await post(port, { stats: false }, { cookie: `${cookieHeader(true)}; ${SESSION_COOKIE}=${a.sid}; ${VISITOR_COOKIE}=${a.vid}`, ...h })
      assert.equal(r.status, 204)
      assert.equal(r.setCookie.length, 3)
      assert.ok(r.setCookie.every(gone))
      assert.ok(r.setCookie.some(c => c.startsWith(`${CONSENT_COOKIE}=;`)))
    }
    assert.equal(count(sqlite, 'visitor_sessions'), 0)
  })

  it('without a signal a "no" still stores the choice, and a "yes" still works', async () => {
    const sqlite = db()
    const port = await serve(e => handleConsentChange(e, { enabled: () => true, allow: () => true, deleteRecords: ids => deleteVisitorRecords(sqlite, ids) }))
    for (const stats of [true, false]) {
      const r = await post(port, { stats }, { cookie: cookieHeader(!stats) })
      const c = r.setCookie.find(x => x.startsWith(`${CONSENT_COOKIE}=`)) ?? ''
      assert.ok(c && !gone(c))
      assert.equal(parseConsent(decodeURIComponent((c.split(';')[0] ?? '').slice(CONSENT_COOKIE.length + 1)))?.stats, stats)
    }
  })

  it('the client asks the server to withdraw only when a stored choice exists and a signal is present', () => {
    const c = readFileSync(new URL('../../composables/useConsent.ts', import.meta.url), 'utf8')
    assert.match(c, /if \(optedOut\.value\) withdrawForSignal\(\)/)
    assert.match(c, /startsWith\('mg_consent='\)/)
  })
})

describe('F7: one network cannot fill the daily limits (the consent cookie is forgeable)', () => {
  it('sessions per network and day: the limit is per IPv4 address, other visitors are unaffected, the next day starts empty', () => {
    const sqlite = db()
    for (let i = 0; i < VISITOR_SESSIONS_PER_IP_DAY; i++) assert.ok(recordVisitorHit(sqlite, hit(), NOW + i).recorded, String(i))
    assert.deepEqual(recordVisitorHit(sqlite, hit(), NOW + 500), { recorded: false, sid: null, reason: 'ip_cap' })
    assert.ok(recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW + 501).recorded, 'a real visitor on another address still gets recorded')
    assert.ok(recordVisitorHit(sqlite, hit(), NOW + DAY + 5).recorded)
    assert.equal(count(sqlite, 'visitor_sessions'), VISITOR_SESSIONS_PER_IP_DAY + 2)
    // The global limits were barely touched by the flood.
    assert.ok(VISITOR_SESSIONS_PER_IP_DAY * 20 <= VISITOR_SESSIONS_PER_DAY)
  })

  it('IPv6: every address of one /64 shares the bucket', () => {
    const sqlite = db()
    for (let i = 0; i < VISITOR_SESSIONS_PER_IP_DAY; i++) assert.ok(recordVisitorHit(sqlite, hit({ ip: `2001:db8:1:2:${i.toString(16)}::1` }), NOW + i).recorded)
    assert.equal(recordVisitorHit(sqlite, hit({ ip: '2001:db8:1:2:ffff:ffff:ffff:ffff' }), NOW + 500).recorded, false)
    assert.ok(recordVisitorHit(sqlite, hit({ ip: '2001:db8:1:3::1' }), NOW + 501).recorded, 'the next /64 is another network')
  })

  it('hits per network and day: also when an existing session keeps posting, and other networks still record', () => {
    const sqlite = db()
    let sid: string | null = null
    for (let i = 0; i < VISITOR_HITS_PER_IP_DAY; i++) {
      if (i % VISITOR_HITS_PER_SESSION === 0) sid = null // a new session each time the per-session cap is reached
      const r = recordVisitorHit(sqlite, hit({ sid }), NOW + (i % 1000))
      assert.ok(r.recorded, String(i))
      if (r.recorded) sid = r.sid
    }
    const blocked = recordVisitorHit(sqlite, hit({ sid }), NOW + 1001)
    assert.equal(blocked.recorded, false)
    assert.ok(!blocked.recorded && blocked.reason === 'ip_cap')
    assert.ok(recordVisitorHit(sqlite, hit({ ip: '198.51.100.9' }), NOW + 1002).recorded)
    assert.ok(VISITOR_HITS_PER_IP_DAY * 10 <= VISITOR_HITS_PER_DAY)
  })

  it('the bucket is stored with the session and the column exists on an older database', () => {
    const sqlite = db()
    const r = recordVisitorHit(sqlite, hit({ ip: '2001:db8:1:2:3:4:5:6' }), NOW)
    assert.ok(r.recorded)
    assert.equal((sqlite.prepare('SELECT ip_bucket AS b FROM visitor_sessions WHERE id = ?').get(r.sid) as { b: string }).b, '2001:db8:1:2::/64')
    const old = new Database(':memory:')
    old.exec('CREATE TABLE visitor_sessions (id TEXT PRIMARY KEY, started_at INTEGER NOT NULL, last_seen INTEGER NOT NULL, landing_path TEXT NOT NULL)')
    initializeDatabase(old)
    assert.ok((old.prepare("SELECT name FROM pragma_table_info('visitor_sessions') WHERE name = 'ip_bucket'").get()))
  })
})
